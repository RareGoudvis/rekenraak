// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useOefenStore, cellPlanOf, currentInput, sanitizeAnswer, FLASH_MS } from '../oefenen/useOefenStore';
import { loadRuns } from '../services/oefenen/stats';
import { nextExercise } from '../services/oefenen/scheduler';
import { kioskFor, kioskInputOf } from '../services/oefenen/kiosk';
import { EMPTY_INTERACTION } from '../components/viewer/ViewerInteractionContext';
import type { CijferExercise } from '../services/math/types';
import type { OefenType } from '../services/oefenen/types';
import { flattenLeaves } from '../config/appstructure';
import { makeDraftBlock } from '../components/curriculum/draftBlock';
import { fillAnswer, hashOf, onScreen, resetKiosk, starterSessie, STARTER_TYPES } from './helpers/oefenKiosk';

// The pupil kiosk's store: phase transitions, testmode / statsLocked, the timer lock, and
// resuming a run after a reload (the run lives in localStorage, the store is rebuilt).

const st = () => useOefenStore.getState();

beforeEach(resetKiosk);
afterEach(() => { vi.useRealTimers(); });

describe('a run', () => {
    test('start → answer right → feedback → next → answer wrong', () => {
        st().load(hashOf(starterSessie()));
        expect(st().phase).toBe('start');
        st().start();
        expect(st().phase).toBe('exercise');
        expect(st().shown).not.toBeNull();
        expect(loadRuns('kiosktest')).toHaveLength(1);

        fillAnswer(true);
        st().answer();
        expect(st().phase).toBe('feedback');
        expect(st().lastCorrect).toBe(true);
        expect(st().run!.stats.history).toHaveLength(1);

        st().next();
        expect(st().phase).toBe('exercise');
        fillAnswer(false);
        st().answer();
        expect(st().lastCorrect).toBe(false);
        const saved = loadRuns('kiosktest')[0];
        expect(saved.stats.history.map(h => h.correct)).toEqual([true, false]);
        const slot = saved.stats.history[1].slot;
        expect(saved.stats.perType[slot].errors).toHaveLength(1);
    });

    test('Controleer needs every field filled', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        st().answer();
        expect(st().phase).toBe('exercise');
        expect(st().run!.stats.history).toHaveLength(0);
    });

    test('the run ends on the locked stats screen after the last exercise', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        for (let i = 0; i < 8; i++) { fillAnswer(true); st().answer(); st().next(); }
        expect(st().phase).toBe('locked');
        expect(st().run!.done).toBe(true);
        expect(st().run!.stats.history.every(h => h.correct)).toBe(true);
        expect(loadRuns('kiosktest')[0].done).toBe(true);
    });

    test('testmode skips the feedback', () => {
        st().load(hashOf(starterSessie({ testMode: true })));
        st().start();
        const first = st().shown!.exerciseKey;
        fillAnswer(false);
        st().answer();
        expect(st().phase).toBe('exercise');
        expect(st().shown!.exerciseKey).not.toBe(first);
        expect(st().run!.stats.history).toHaveLength(1);
    });

    test('statsLocked keeps the stats closed until the run ends', () => {
        st().load(hashOf(starterSessie({ statsLocked: true })));
        st().start();
        st().openStats();
        expect(st().phase).toBe('exercise');

        resetKiosk();
        st().load(hashOf(starterSessie()));
        st().start();
        st().openStats();
        expect(st().phase).toBe('stats');
        st().closeStats();
        expect(st().phase).toBe('exercise');
    });

    test('testmode keeps the stats closed until the run ends, also with statsLocked off', () => {
        st().load(hashOf(starterSessie({ testMode: true, statsLocked: false })));
        st().start();
        fillAnswer(false);
        st().answer();
        st().openStats();
        expect(st().phase).toBe('exercise');
    });

    test('the timer locks the run at 0', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-08T09:00:00'));
        st().load(hashOf(starterSessie({ timerMin: 1 })));
        st().start();
        expect(st().run!.timerEndsAt).toBe(Date.now() + 60_000);
        st().tick(Date.now() + 59_000);
        expect(st().phase).toBe('exercise');
        vi.setSystemTime(Date.now() + 61_000);
        st().tick();
        expect(st().phase).toBe('locked');
        expect(loadRuns('kiosktest')[0].done).toBe(true);
    });

    test('an answer after the deadline (before the next tick) is not counted and ends the run', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-08T09:00:00'));
        st().load(hashOf(starterSessie({ timerMin: 1 })));
        st().start();
        fillAnswer(true);
        vi.setSystemTime(st().run!.timerEndsAt! + 100);
        st().answer();
        expect(st().phase).toBe('locked');
        expect(st().run!.done).toBe(true);
        expect(st().run!.stats.history).toHaveLength(0);
        expect(loadRuns('kiosktest')[0].stats.history).toHaveLength(0);
    });

    test('storage that refuses the run sets storageFailed; a load starts clean', () => {
        st().load(hashOf(starterSessie()));
        expect(st().storageFailed).toBe(false);
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
        try {
            st().start();
            expect(st().storageFailed).toBe(true);
        } finally { spy.mockRestore(); }
        st().load(hashOf(starterSessie()));
        expect(st().storageFailed).toBe(false);
    });

    // Opnieuw / Wissen live on the end screen: a one-exercise run gets there.
    const finished = () => {
        st().load(hashOf(starterSessie({ types: [{ ...STARTER_TYPES[0], limit: 1 }] })));
        st().start();
        fillAnswer(true); st().answer(); st().next();
        expect(st().phase).toBe('locked');
    };

    test('Wissen clears this device and returns to the start screen', () => {
        finished();
        st().clear();
        expect(st().phase).toBe('start');
        expect(loadRuns('kiosktest')).toEqual([]);
    });

    test('Opnieuw starts a new run and keeps the old one', () => {
        finished();
        st().restart();
        expect(st().run!.index).toBe(1);
        expect(st().run!.stats.history).toHaveLength(0);
        expect(loadRuns('kiosktest').map(r => r.index)).toEqual([0, 1]);
    });

    // Owner call 15: the mid-run Resultaten peek is Verder oefenen only, in the store too, so no
    // path (a stale button, a script) lets a pupil escape a timed test by starting over.
    test('a timed run cannot be restarted or wiped from the mid-run peek', () => {
        st().load(hashOf(starterSessie({ timerMin: 5 })));
        st().start();
        const { index, timerEndsAt } = st().run!;
        fillAnswer(true); st().answer();
        st().openStats();
        expect(st().phase).toBe('stats');
        st().restart();
        st().clear();
        expect(st().phase).toBe('stats');
        expect(st().run).toMatchObject({ index, timerEndsAt });
        expect(st().run!.stats.history).toHaveLength(1);
        expect(loadRuns('kiosktest').map(r => r.index)).toEqual([index]);
        st().closeStats();
        expect(st().phase).toBe('exercise');
        // Mid-exercise as well.
        st().restart(); st().clear();
        expect(st().run).toMatchObject({ index, timerEndsAt });
    });
});

describe('the juist / fout flash moves on by itself', () => {
    beforeEach(() => { vi.useFakeTimers(); });

    test('juist flashes FLASH_MS.juist, fout FLASH_MS.fout, then the next exercise follows', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        const first = st().shown!.exerciseKey;
        fillAnswer(true); st().answer();
        expect(st().phase).toBe('feedback');
        vi.advanceTimersByTime(FLASH_MS.juist - 1);
        expect(st().phase).toBe('feedback');
        vi.advanceTimersByTime(1);
        expect(st().phase).toBe('exercise');
        expect(st().shown!.exerciseKey).not.toBe(first);

        fillAnswer(false); st().answer();
        vi.advanceTimersByTime(FLASH_MS.fout - 1);
        expect(st().phase).toBe('feedback');
        vi.advanceTimersByTime(1);
        expect(st().phase).toBe('exercise');
        expect(st().run!.stats.history.map(h => h.correct)).toEqual([true, false]);
        expect(FLASH_MS.juist).toBeLessThan(FLASH_MS.fout);
    });

    test('no double submit during the flash; skipping it moves on once', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        fillAnswer(true); st().answer();
        const input = [...st().input];
        st().answer(); st().answer();
        fillAnswer(false);
        expect(st().input).toEqual(input);
        expect(st().run!.stats.history).toHaveLength(1);
        st().skipFlash();
        expect(st().phase).toBe('exercise');
        const second = st().shown!.exerciseKey;
        // The skipped flash's timer must not advance past the exercise that just came up.
        vi.advanceTimersByTime(FLASH_MS.fout * 2);
        expect(st().shown!.exerciseKey).toBe(second);
        expect(st().phase).toBe('exercise');
    });

    test('testmode: no flash, no timer, straight to the next exercise', () => {
        st().load(hashOf(starterSessie({ testMode: true, attempts: 2 })));
        st().start();
        fillAnswer(false); st().answer();
        expect(st().phase).toBe('exercise');
        const key = st().shown!.exerciseKey;
        vi.advanceTimersByTime(FLASH_MS.fout * 2);
        expect(st().shown!.exerciseKey).toBe(key);
        // Testmodus forces one try: the wrong answer is final.
        expect(st().run!.stats.history).toHaveLength(1);
    });

    test('Stats during a flash pause it; Verder oefenen ends it', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        const first = st().shown!.exerciseKey;
        fillAnswer(true); st().answer();
        st().openStats();
        vi.advanceTimersByTime(FLASH_MS.fout * 2);
        expect(st().phase).toBe('stats');
        st().closeStats();
        expect(st().phase).toBe('exercise');
        expect(st().shown!.exerciseKey).not.toBe(first);
    });

    test('the timer running out during a flash locks the run; the flash does not reopen it', () => {
        vi.setSystemTime(new Date('2026-10-08T09:00:00'));
        st().load(hashOf(starterSessie({ timerMin: 1 })));
        st().start();
        fillAnswer(true); st().answer();
        vi.setSystemTime(Date.now() + 61_000);
        st().tick();
        expect(st().phase).toBe('locked');
        vi.advanceTimersByTime(FLASH_MS.fout);
        expect(st().phase).toBe('locked');
    });
});

describe('2 kansen', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    const two = () => hashOf(starterSessie({ attempts: 2 }));

    test('wrong, then right: a retry flash, the same exercise cleared, juist na 2e kans', () => {
        st().load(two());
        st().start();
        const key = st().shown!.exerciseKey;
        fillAnswer(false); st().answer();
        expect(st().phase).toBe('retry');
        expect(st().lastCorrect).toBe(false);
        // Nothing counted yet, and a double tap during the retry flash does nothing.
        st().answer();
        expect(st().run!.stats.history).toHaveLength(0);
        vi.advanceTimersByTime(FLASH_MS.retry - 1);
        expect(st().phase).toBe('retry');
        vi.advanceTimersByTime(1);
        expect(st().phase).toBe('exercise');
        expect(st().shown!.exerciseKey).toBe(key);
        expect(st().input.every(v => v === '')).toBe(true);
        expect(st().shown!.wrongFirst).toBeDefined();

        fillAnswer(true); st().answer();
        expect(st().phase).toBe('feedback');
        expect(st().lastCorrect).toBe(true);
        const h = st().run!.stats.history;
        expect(h.map(x => [x.correct, x.secondTry])).toEqual([[true, true]]);
        const t = st().run!.stats.perType[h[0].slot];
        expect(t).toMatchObject({ made: 1, correct: 1, wrong: 0, secondTry: 1 });
        expect(t.errors).toHaveLength(1);
        expect(t.errors[0].secondTry).toBe(true);
    });

    test('wrong twice is final: fout, both answers kept, no third try', () => {
        st().load(two());
        st().start();
        fillAnswer(false); st().answer();
        st().skipFlash();
        expect(st().phase).toBe('exercise');
        fillAnswer(false); st().answer();
        expect(st().phase).toBe('feedback');
        expect(st().lastCorrect).toBe(false);
        const h = st().run!.stats.history;
        expect(h.map(x => [x.correct, x.secondTry])).toEqual([[false, true]]);
        const e = st().run!.stats.perType[h[0].slot].errors[0];
        expect(e.secondTry).toBe(false);
        expect(e.second).toBeDefined();
    });

    test('right at once: juist without a retry or an error row', () => {
        st().load(two());
        st().start();
        fillAnswer(true); st().answer();
        expect(st().phase).toBe('feedback');
        const h = st().run!.stats.history;
        expect(h[0].secondTry).toBeUndefined();
        expect(st().run!.stats.perType[h[0].slot].errors).toEqual([]);
    });

    test('a reload during the retry comes back on the second try of the same exercise', () => {
        const hash = two();
        st().load(hash);
        st().start();
        const key = st().shown!.exerciseKey;
        fillAnswer(false); st().answer();
        resetKioskKeepStorage();
        st().load(hash);
        expect(st().phase).toBe('exercise');
        expect(st().shown!.exerciseKey).toBe(key);
        fillAnswer(false); st().answer();
        expect(st().phase).toBe('feedback');
        expect(st().run!.stats.history).toHaveLength(1);
    });

    test('cijferen grid: the retry clears every cell and the keypad starts in the first cell again', () => {
        const cijfer = { typeId: 'cijferen-optellen-nat', leafId: 'cijferen-optellen-nat', label: 'Cijferen', constraints: { numberType: 'natural' }, limit: 2, weight: 1 };
        st().load(hashOf(starterSessie({ types: [cijfer], attempts: 2 })));
        st().start();
        const plan = cellPlanOf(st().sessie, st().shown)!;
        const first = st().activeCell;
        expect(first).toBe(plan.flow[0] ?? plan.keys[0]);
        fillAnswer(false);
        st().focusCell(plan.keys.at(-1)!);
        st().answer();
        expect(st().phase).toBe('retry');
        // Typing during the flash goes nowhere.
        st().typeCell(plan.keys[0], '7');
        st().skipFlash();
        expect(st().phase).toBe('exercise');
        expect(st().interaction.cells).toEqual({});
        expect(st().activeCell).toBe(first);
        fillAnswer(true); st().answer();
        expect(st().lastCorrect).toBe(true);
        expect(st().run!.stats.history.map(h => [h.correct, h.secondTry])).toEqual([[true, true]]);
    });

    test('Stats during the retry flash: Verder oefenen goes to the second try', () => {
        st().load(two());
        st().start();
        const key = st().shown!.exerciseKey;
        fillAnswer(false); st().answer();
        st().openStats();
        expect(st().phase).toBe('stats');
        st().closeStats();
        expect(st().phase).toBe('exercise');
        expect(st().shown!.exerciseKey).toBe(key);
        expect(st().shown!.wrongFirst).toBeDefined();
    });
});

describe('reload', () => {
    test('mid-exercise: the same exercise comes back', () => {
        const hash = hashOf(starterSessie({ timerMin: 15 }));
        st().load(hash);
        st().start();
        const key = st().shown!.exerciseKey;
        const ends = st().run!.timerEndsAt;
        resetKioskKeepStorage();
        st().load(hash);
        expect(st().phase).toBe('exercise');
        expect(st().shown!.exerciseKey).toBe(key);
        expect(st().run!.timerEndsAt).toBe(ends);
    });

    test('after an answer: it is counted once and a new exercise follows', () => {
        const hash = hashOf(starterSessie());
        st().load(hash);
        st().start();
        fillAnswer(true); st().answer();
        resetKioskKeepStorage();
        st().load(hash);
        expect(st().phase).toBe('exercise');
        expect(st().run!.stats.history).toHaveLength(1);
    });

    test('a finished run reopens on its end screen; an expired timer locks on load', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-08T09:00:00'));
        const hash = hashOf(starterSessie({ timerMin: 5 }));
        st().load(hash);
        st().start();
        vi.setSystemTime(Date.now() + 6 * 60_000);
        resetKioskKeepStorage();
        st().load(hash);
        expect(st().phase).toBe('locked');
        resetKioskKeepStorage();
        st().load(hash);
        expect(st().phase).toBe('locked');
    });
});

describe('links', () => {
    test('a broken link sets a Dutch error; no link is no error', () => {
        st().load('#oefen=kapot');
        expect(st().error).toMatch(/oefenlink/);
        st().load('');
        expect(st().error).toBeNull();
        expect(st().sessie).toBeNull();
    });
});

describe('input', () => {
    test('typing keeps digits and the type\'s extra keys; "." becomes ","', () => {
        expect(sanitizeAnswer('12a.5', [','])).toBe('12,5');
        expect(sanitizeAnswer('1 3/4', ['/', ' '])).toBe('1 3/4');
        expect(sanitizeAnswer('-7', [])).toBe('7');
    });

    test('a time gets uur + min; two typed digits of uur move on to min', () => {
        const s = starterSessie({ types: [{ typeId: 'klok-kloklezen', leafId: 'klok-analoog-omzetten', label: 'Klok', constraints: { clockType: 'analoog', exerciseMode: 'omzetten' }, weight: 1 }] });
        st().load(hashOf(s));
        st().start();
        expect(currentInput(st().sessie, st().shown)?.kind).toBe('time');
        expect(st().input).toEqual(['', '']);
        st().press('1'); st().press('5');
        expect(st().field).toBe(1);
        st().press('3'); st().press('0');
        expect(st().input).toEqual(['15', '30']);
    });

    test('a getallenrij gets one field per blank, a word a text field', () => {
        const rij = starterSessie({ types: [{ typeId: 'getallenrijen', leafId: 'getalbegrip-getallenrijen-nat', label: 'Rij', constraints: { numberType: 'natural' }, weight: 1 }] });
        st().load(hashOf(rij));
        st().start();
        // Phase C2: the blanks are cells on the card, one per blank.
        expect(currentInput(st().sessie, st().shown)?.kind).toBe('interactive');
        expect(cellPlanOf(st().sessie, st().shown)!.keys).toHaveLength((st().shown!.exercise as { blankMask: boolean[] }).blankMask.filter(Boolean).length);
        resetKiosk();
        const romeins = starterSessie({ id: 'kiosktest2', types: [{ typeId: 'romeinse-cijfers', leafId: 'romeinse-schrijven', label: 'Romeins', constraints: { subType: 'schrijven' }, weight: 1 }] });
        st().load(hashOf(romeins));
        st().start();
        expect(currentInput(st().sessie, st().shown)?.kind).toBe('text');
        st().setField(0, 'xiv!');
        expect(st().input).toEqual(['xiv']);
    });

    test('a run over every new input kind: right is juist, wrong is fout, errors are readable', () => {
        const types = [
            { typeId: 'klok-kloklezen', leafId: 'klok-analoog-lezen', label: 'Klok', constraints: { clockType: 'analoog', exerciseMode: 'lezen' }, limit: 2, weight: 1 },
            { typeId: 'getalpatronen', leafId: 'patronen-nat', label: 'Patronen', constraints: { numberType: 'natural' }, limit: 2, weight: 1 },
            { typeId: 'romeinse-cijfers', leafId: 'romeinse-schrijven', label: 'Romeins', constraints: { subType: 'schrijven' }, limit: 2, weight: 1 },
            { typeId: 'vergelijken', leafId: 'vergelijken-kiezen', label: 'Kiezen', constraints: { subType: 'kiezen' }, limit: 2, weight: 1 },
        ];
        st().load(hashOf(starterSessie({ types })));
        st().start();
        const results: boolean[] = [];
        for (let i = 0; i < 8; i++) {
            const right = i % 2 === 0;
            fillAnswer(right);
            st().answer();
            results.push(st().lastCorrect!);
            st().next();
        }
        expect(results).toEqual([true, false, true, false, true, false, true, false]);
        const errors = Object.values(loadRuns('kiosktest')[0].stats.perType).flatMap(t => t.errors);
        expect(errors).toHaveLength(4);
        for (const e of errors) {
            expect(e.exercise).toContain('?');
            expect(e.expected).not.toBe('');
            expect(e.given).not.toBe(e.expected);
        }
    });

    test('the quotiënt / rest exercise gets two fields', () => {
        const s = starterSessie({ types: [{ typeId: 'hr-std-delen', leafId: 'hr-std-delen-nat', label: 'Delen', constraints: { numberType: 'natural', multiplicationMode: 'met_rest' }, weight: 1 }] });
        st().load(hashOf(s));
        st().start();
        expect(currentInput(st().sessie, st().shown)?.kind).toBe('number+rest');
        expect(st().input).toEqual(['', '']);
        const [q, r] = onScreen().answer;
        st().press(q[0]); st().focusField(1); st().press(r);
        expect(st().input).toEqual([q[0], r]);
    });

    // A pupil can only type what the keypad offers: every accepted answer of every starter
    // type (and the rational / decimal hr leaves) must survive the keypad's filter.
    test('every accepted answer is typeable with the offered keys', () => {
        const types = [...STARTER_TYPES,
            { ...STARTER_TYPES[0], leafId: 'hr-std-optellen-rat', constraints: { numberType: 'rational' } },
            { ...STARTER_TYPES[0], typeId: 'hr-std-vermenigvuldigen', leafId: 'hr-std-vermenigvuldigen-dec', constraints: { numberType: 'decimal' } },
            { ...STARTER_TYPES[1], leafId: 'procenten-welk', constraints: { subType: 'welk-percent' } },
            { ...STARTER_TYPES[2], leafId: 'afronden-dec-simpel', constraints: { subType: 'simpel', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['E', 't'] } },
        ];
        const s = starterSessie({ types });
        const untypeable: string[] = [];
        for (const type of types) {
            const d = kioskFor(type.typeId)!;
            for (let i = 0; i < 60; i++) {
                const made = nextExercise(s, type, new Set())!;
                const kind = kioskInputOf(d, made.exercise, made.constraints);
                if (kind === 'choice') continue;
                const keys = d.keys?.(made.constraints) ?? [];
                const accepted = d.answerOf(made.exercise, made.constraints);
                const fields = kind === 'number+rest' ? accepted : [accepted[0]];
                for (const a of fields) if (sanitizeAnswer(a, keys) !== a) untypeable.push(`${type.leafId}: ${a} (keys ${JSON.stringify(keys)})`);
            }
        }
        expect([...new Set(untypeable)]).toEqual([]);
    });
});

// A page reload: the store is rebuilt from scratch, localStorage survives.
function resetKioskKeepStorage() {
    useOefenStore.setState({ sessie: null, error: null, phase: 'start', run: null, shown: null, input: [''], field: 0, lastCorrect: null, statsFrom: 'exercise' });
}

// Cijferen aftrekken: the Lenen key performs the active column's exchange in the scratch cells.
describe('Lenen (cijferen aftrekken)', () => {
    const aftrekken = (numberType: 'natural' | 'decimal') => {
        const id = `cijferen-aftrekken-${numberType === 'natural' ? 'nat' : 'dec'}`;
        return { typeId: id, leafId: id, label: 'Aftrekken', constraints: { operator: '-', numberType }, limit: 3, weight: 1 };
    };
    // Puts a known subtraction on the card, the keypad in `cell`.
    const pin = (a: number, b: number, cell: string, dp = 0) => {
        resetKiosk();
        st().load(hashOf(starterSessie({ types: [aftrekken(dp ? 'decimal' : 'natural')] })));
        st().start();
        const answer = Number((a - b).toFixed(dp));
        const exercise: CijferExercise = { id: 'x', operands: [a, b], operator: '-', answer, remainder: 0, decimalPlaces: dp, isManuallyEdited: false };
        useOefenStore.setState({ shown: { ...st().shown!, exercise }, interaction: EMPTY_INTERACTION, activeCell: cell });
    };
    const cells = () => st().interaction.cells;
    const typeDigits = (...ds: string[]) => ds.forEach(d => st().press(d));

    test('the key is on every subtraction, without a hint, and nowhere else', () => {
        pin(52, 17, 'a1');
        const info = currentInput(st().sessie, st().shown)!;
        expect(info.extraKeys.map(k => [k.id, k.label])).toEqual([['lenen', 'Lenen']]);
        expect(info.extraKeys[0].hint).toBeUndefined();
        resetKiosk();
        st().load(hashOf(starterSessie({ types: [{ ...aftrekken('natural'), typeId: 'cijferen-optellen-nat', leafId: 'cijferen-optellen-nat', constraints: { operator: '+' } }] })));
        st().start();
        expect(currentInput(st().sessie, st().shown)!.extraKeys).toEqual([]);
        resetKiosk();
        st().load(hashOf(starterSessie()));
        st().start();
        expect(currentInput(st().sessie, st().shown)!.extraKeys).toEqual([]);
    });

    test('52 − 17: 4 above the 5, 12 above the 2; the units stay active; 5 and 3 are juist', () => {
        pin(52, 17, 'a1');
        st().pressExtra('lenen');
        expect(cells()).toEqual({ b0: '4', b1: '12' });
        expect(st().interaction.marks).toEqual({ b0: 'lent', b1: 'got' });
        expect(st().activeCell).toBe('a1');
        typeDigits('5', '3');
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('pressing it again on the same column changes nothing', () => {
        pin(52, 17, 'a1');
        st().pressExtra('lenen');
        const once = st().interaction;
        st().pressExtra('lenen');
        expect(st().interaction).toBe(once);
        // From the column's exchange cell too.
        st().focusCell('b1');
        st().pressExtra('lenen');
        expect(st().interaction).toBe(once);
    });

    test('302 − 17: a 0 on the way lends on (2, 9, 12)', () => {
        pin(302, 17, 'a2');
        st().pressExtra('lenen');
        expect(cells()).toEqual({ b0: '2', b1: '9', b2: '12' });
        expect(Object.keys(st().interaction.marks!).sort()).toEqual(['b0', 'b1', 'b2']);
        typeDigits('5', '8', '2');
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('5,2 − 1,7: the tenths borrow from the units across the comma', () => {
        pin(5.2, 1.7, 'a1', 1);
        st().pressExtra('lenen');
        expect(cells()).toEqual({ b0: '4', b1: '12' });
        typeDigits('5', '3');
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('a column that lent can borrow in its turn (432 − 157)', () => {
        pin(432, 157, 'a2');
        st().pressExtra('lenen');
        expect(cells()).toEqual({ b1: '2', b2: '12' });
        st().press('5');
        expect(st().activeCell).toBe('a1');
        st().pressExtra('lenen');
        expect(cells()).toEqual({ a2: '5', b0: '3', b1: '12', b2: '12' });
        expect(st().interaction.marks).toEqual({ b0: 'lent', b1: 'got', b2: 'got' });
        typeDigits('7', '2');
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('a column that needs no exchange still gets one, and the check judges what is written', () => {
        // 58 − 17: the units need nothing; Lenen exchanges anyway (the key never tells).
        pin(58, 17, 'a1');
        st().pressExtra('lenen');
        expect(cells()).toEqual({ b0: '4', b1: '18' });
        // Right answer digits under a wrong exchange: the exchange cells count, so fout.
        typeDigits('1', '4');
        st().answer();
        expect(st().lastCorrect).toBe(false);
        // The pupil who undoes the exchange by hand is juist.
        pin(58, 17, 'a1');
        st().pressExtra('lenen');
        st().typeCell('b0', '');
        st().typeCell('b1', '');
        st().focusCell('a1');
        typeDigits('1', '4');
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('nothing happens without a column to lend from, or outside the exercise phase', () => {
        pin(52, 17, 'a0');
        st().pressExtra('lenen');
        expect(cells()).toEqual({});
        pin(52, 17, 'a1');
        useOefenStore.setState({ phase: 'feedback' });
        st().pressExtra('lenen');
        expect(cells()).toEqual({});
    });
});

describe("the row's exactForm reaches the check", () => {
    // An unreduced spelling of the value on screen: '3 1/4' → '26/8', '3' → '6/2'.
    const unreduced = (answer: string) => {
        const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(answer.trim());
        if (!m) return `${2 * Number(answer)}/2`;
        const d = Number(m[3]);
        return `${2 * (Number(m[1] ?? 0) * d + Number(m[2]))}/${2 * d}`;
    };
    const leaf = flattenLeaves().find(l => l.id === 'hr-std-optellen-rat')!;
    const row = (exactForm: boolean): OefenType => ({
        typeId: leaf.typeId, leafId: leaf.id, label: 'Breuken', exactForm, weight: 1,
        constraints: makeDraftBlock(leaf.typeId, leaf.defaultConstraints ?? {}).constraints as Record<string, unknown>,
    });

    test('exactForm true rejects an unreduced breuk, false accepts it', () => {
        for (const exact of [true, false]) {
            resetKiosk();
            st().load(hashOf(starterSessie({ types: [row(exact)] })));
            // Set on the decoded session: this pins the store → check wiring, whatever the link carries.
            useOefenStore.setState({ sessie: starterSessie({ types: [row(exact)] }) });
            st().start();
            const given = unreduced(onScreen().answer[0].split('|')[0]);
            useOefenStore.setState({ input: [given] });
            st().answer();
            expect(st().lastCorrect, `exactForm ${exact}: ${given}`).toBe(!exact);
        }
    });
});
