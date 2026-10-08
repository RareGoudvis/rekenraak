// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useOefenStore, cellPlanOf, currentInput, sanitizeAnswer } from '../oefenen/useOefenStore';
import { loadRuns } from '../services/oefenen/stats';
import { nextExercise } from '../services/oefenen/scheduler';
import { kioskFor, kioskInputOf } from '../services/oefenen/kiosk';
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

    test('Wissen clears this device and returns to the start screen', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        st().clear();
        expect(st().phase).toBe('start');
        expect(loadRuns('kiosktest')).toEqual([]);
    });

    test('Opnieuw starts a new run and keeps the old one', () => {
        st().load(hashOf(starterSessie()));
        st().start();
        fillAnswer(true); st().answer();
        st().restart();
        expect(st().run!.index).toBe(1);
        expect(st().run!.stats.history).toHaveLength(0);
        expect(loadRuns('kiosktest').map(r => r.index)).toEqual([0, 1]);
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
