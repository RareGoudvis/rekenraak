// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase } from '../oefenen/spelen/skins/types';
import { NUMBER_CONTENT, PICTURE_CONTENT, skinAccepts } from '../oefenen/spelen/accepts';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import type { SpelEventName } from '../oefenen/spelen/events';
import { gameGroupOf } from '../oefenen/zelf/topicGames';
import { GAME_BLURB } from '../oefenen/zelf/gameBlurbs';
import Grijpmachine, { GrijpEnding } from '../oefenen/spelen/skins/grijp/Grijpmachine';
import { GRIJP, autoSlotOf, bounce, coinsLeft, idlePose, nearMissOf, poseAt, revealAt, timeline, tripMs, type ClawGeom, type Job } from '../oefenen/spelen/skins/grijp/claw';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { Level } from '../oefenen/spelen/levels/levels';
import { HEAP, MACHINES, MACHINE_IDS, backPile, machineById, prizeBag } from '../oefenen/spelen/skins/grijp/machines';
import { GRIJP_KEY, forcedMachine, lastMachine, pickMachine, rememberMachine } from '../oefenen/spelen/skins/grijp/pick';
import { ARCADES } from '../oefenen/spelen/skins/grijp/arcades';
import { GRIJP_SOUNDS, playGrijp } from '../oefenen/spelen/skins/grijp/sounds';
import { resetKiosk } from './helpers/oefenKiosk';

// Grijpmachine (Spelen round 6): the claw's trip (claw.ts), the five machines and their prizes (machines.ts), the
// machine pick (pick.ts), the registry row, and the skin on the real session: the answer counts only when the claw
// has shut on the prize; right = onto the shelf, wrong = it slips back (a logged mistake); 15 coins end the round.

const GEOM: ClawGeom = {
    w: 800, homeX: 76, restY: 6,
    slots: [240, 404, 568, 720].map(x => ({ x, grabY: 230, cx: x, cy: 360, h: 140 })),
    chuteY: 640,
};
const job = (over: Partial<Job> = {}): Job => ({ slot: 2, result: null, nearMiss: false, ...over });

describe('Grijpmachine: the claw', () => {
    test('a trip: over, down, shut, a hush; then the result decides the way back', () => {
        expect(timeline(job(), GEOM).map(s => s.stage)).toEqual(['go', 'drop', 'grab', 'hold']);
        expect(timeline(job({ result: 'right' }), GEOM).map(s => s.stage)).toEqual(['go', 'drop', 'grab', 'hold', 'lift', 'carry', 'carry', 'release', 'chute']);
        expect(timeline(job({ result: 'right', nearMiss: true }), GEOM).map(s => s.stage)).toEqual(['go', 'drop', 'grab', 'hold', 'lift', 'carry', 'wobble', 'carry', 'release', 'chute']);
        expect(timeline(job({ result: 'wrong' }), GEOM).map(s => s.stage)).toEqual(['go', 'drop', 'grab', 'hold', 'lift', 'back']);
        // A farther prize takes longer to reach; a near one never feels instant.
        expect(revealAt(job({ slot: 3 }), GEOM)).toBeGreaterThan(revealAt(job({ slot: 0 }), GEOM));
        expect(timeline(job({ slot: 0 }), { ...GEOM, slots: GEOM.slots.map(s => ({ ...s, x: GEOM.homeX + 1 })) })[0].ms).toBe(GRIJP.minMoveMs);
        expect(tripMs(job(), GEOM)).toBe(Infinity);
        expect(tripMs(job({ result: 'right', nearMiss: true }), GEOM)).toBe(tripMs(job({ result: 'right' }), GEOM) + GRIJP.nearMissMs);
    });

    test('the pose: home and open at the start, shut on the prize at the reveal, the prize in the claw on the way up', () => {
        const s = GEOM.slots[2];
        const at0 = poseAt(job(), 0, GEOM, 0);
        expect(at0).toMatchObject({ stage: 'go', x: GEOM.homeX, y: GEOM.restY, prize: null, done: false });
        const r = revealAt(job(), GEOM);
        const shut = poseAt(job(), r - 1, GEOM, 0);
        expect(shut).toMatchObject({ stage: 'hold', x: s.x, y: s.grabY, open: 0, prize: null });
        const right = job({ result: 'right' });
        const up = poseAt(right, r + GRIJP.liftMs, GEOM, 0);
        expect(up.prize).not.toBeNull();
        expect(up.prize!.y).toBeLessThan(s.cy);
        const end = poseAt(right, tripMs(right, GEOM), GEOM, 0);
        expect(end).toMatchObject({ done: true, prize: null, x: GEOM.homeX });
    });

    test('a wrong prize slips at the top and bounces back to its own place; a near miss sags but holds', () => {
        const s = GEOM.slots[2];
        const wrong = job({ result: 'wrong' });
        const r = revealAt(wrong, GEOM);
        const before = poseAt(wrong, r + GRIJP.liftMs * GRIJP.slipAt - 5, GEOM, 0);
        expect(before.slipped).toBe(false);
        const slipping = poseAt(wrong, r + GRIJP.liftMs * GRIJP.slipAt + 20, GEOM, 0);
        expect(slipping.slipped).toBe(true);
        expect(slipping.prize).not.toBeNull();
        const back = poseAt(wrong, r + GRIJP.liftMs * GRIJP.slipAt + GRIJP.fallMs + 1, GEOM, 0);
        expect(back.prize).toBeNull();
        expect(poseAt(wrong, tripMs(wrong, GEOM), GEOM, 0)).toMatchObject({ done: true, x: GEOM.homeX });
        // The bounce lands, rebounds a little and settles.
        expect(bounce(0)).toBe(0);
        expect(bounce(1)).toBe(1);
        expect(bounce(0.56)).toBeCloseTo(1, 5);
        expect(bounce(0.69)).toBeLessThan(1);
        void s;
        const near = job({ result: 'right', nearMiss: true });
        const w = timeline(near, GEOM).find(p => p.stage === 'wobble')!;
        const plain = poseAt(near, w.at - 1, GEOM, 0).prize!;
        const sag = poseAt(near, w.at + w.ms * 0.5, GEOM, 0).prize!;
        expect(sag.y).toBeGreaterThan(plain.y);
        expect(poseAt(near, tripMs(near, GEOM), GEOM, 0).done).toBe(true);
    });

    test('time up: the claw picks one of the places still on the heap', () => {
        expect(autoSlotOf(0, [0, 1, 2, 3])).toBe(0);
        expect(autoSlotOf(0.99, [0, 1, 2, 3])).toBe(3);
        expect(autoSlotOf(1, [0, 2])).toBe(2);
        expect(autoSlotOf(0.5, [])).toBeNull();
    });

    test('near misses never come twice in a row; the coins count down as the claw sets off', () => {
        expect(nearMissOf(0, false)).toBe(true);
        expect(nearMissOf(0, true)).toBe(false);
        expect(nearMissOf(GRIJP.nearMissChance + 0.01, false)).toBe(false);
        expect(coinsLeft({ total: 15, answered: 0 }, false)).toBe(15);
        expect(coinsLeft({ total: 15, answered: 3 }, true)).toBe(11);
        expect(coinsLeft({ total: null, answered: 15 }, true)).toBe(0);
        expect(idlePose(GEOM, 0)).toMatchObject({ stage: 'idle', x: GEOM.homeX, done: true, prize: null });
        expect(Math.abs(idlePose(GEOM, GRIJP.swayMs / 4).rot)).toBeCloseTo(GRIJP.swayDeg, 5);
    });
});

describe('Grijpmachine: machines and prizes', () => {
    test('five machines, each with its own prizes (at least five kinds), drawn by its own arcade file', () => {
        expect(MACHINES.map(m => m.id)).toEqual([...MACHINE_IDS]);
        expect(new Set(MACHINES.flatMap(m => m.prizes)).size).toBe(MACHINES.reduce((n, m) => n + m.prizes.length, 0));
        for (const m of MACHINES) {
            expect(m.prizes.length).toBeGreaterThanOrEqual(5);
            expect(ARCADES[m.id]).toBeDefined();
        }
        expect(machineById('nope').id).toBe('neon');
    });

    test('the heap: four different prizes; a won one is replaced by a kind not on the heap; seeded', () => {
        for (const m of MACHINES) {
            for (let seed = 1; seed < 40; seed++) {
                const bag = prizeBag(m, seed);
                expect(bag.heap).toHaveLength(HEAP);
                expect(new Set(bag.heap.map(p => p.kind)).size).toBe(HEAP);
                const next = bag.refill(bag.heap, 1);
                expect(bag.heap.map(p => p.kind)).not.toContain(next.kind);
                expect(m.prizes).toContain(next.kind);
            }
        }
        expect(prizeBag(MACHINES[0], 9).heap).toEqual(prizeBag(MACHINES[0], 9).heap);
        expect(backPile(MACHINES[1], 3, 11)).toHaveLength(11);
    });

    test('every prize of every machine draws, in each look, with a part that waves', () => {
        for (const m of MACHINES) {
            const { Prize } = ARCADES[m.id];
            for (const kind of m.prizes) {
                for (let look = 0; look < 3; look++) {
                    const { container, unmount } = render(<svg><Prize prize={{ kind, look }} /></svg>);
                    expect(container.querySelector('.gm-wave'), `${m.id} ${kind}`).not.toBeNull();
                    unmount();
                }
            }
        }
    });

    test('a machine per round, random, never the one played last on this device; ?grijp= pins one', () => {
        localStorage.removeItem(GRIJP_KEY);
        expect(lastMachine()).toBeNull();
        for (let k = 0; k < 50; k++) {
            const last = MACHINE_IDS[k % MACHINE_IDS.length];
            expect(pickMachine(last, () => (k % 10) / 10)).not.toBe(last);
        }
        expect(new Set(Array.from({ length: 40 }, (_, k) => pickMachine(null, () => k / 40))).size).toBe(MACHINE_IDS.length);
        rememberMachine('spook');
        expect(lastMachine()).toBe('spook');
        localStorage.setItem(GRIJP_KEY, 'weg');
        expect(lastMachine()).toBeNull();
        expect(forcedMachine('?grijp=ruimte')).toBe('ruimte');
        expect(forcedMachine('?grijp=x')).toBeNull();
    });

    test('its own sounds all play without a running audio context', () => {
        expect(GRIJP_SOUNDS.length).toBeGreaterThanOrEqual(10);
        for (const s of GRIJP_SOUNDS) expect(() => playGrijp(s)).not.toThrow();
    });
});

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const log: { name: SpelEventName; payload: unknown }[] = [];
const offs: (() => void)[] = [];

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});

function Wired() {
    const st = useSpelStore();
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Grijpmachine question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={st.question.choices}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={() => { }} progress={progress} options={st.meta.chosen ?? {}} events={st.events} />
    );
}

describe('Grijpmachine: a round on the session', () => {
    beforeEach(() => {
        resetKiosk();
        useOefenStore.setState({ fixed: null });
        sp().otherGame();
        sp().takePickerAt();
        log.length = 0;
        for (const name of ['correct', 'wrong', 'help', 'end'] as SpelEventName[]) offs.push(sp().events.on(name, p => log.push({ name, payload: p })));
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });
    });
    afterEach(() => { offs.splice(0).forEach(off => off()); cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

    const start = (niveau?: Level) => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: resolveMeta(skinById('grijp')!.meta, niveau ? { niveau } : {}) }));
    const prizes = () => within(screen.getByRole('group', { name: 'Kies het antwoord' })).getAllByRole('button') as HTMLButtonElement[];
    const tapValue = (value: string) => fireEvent.click(prizes().find(b => b.getAttribute('aria-label') === value)!);
    const wrongOf = () => sp().question!.choices.find(c => c !== sp().question!.answer)!;
    const names = () => log.map(l => l.name);
    const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
    const won = (c: HTMLElement) => c.querySelectorAll('.gm-place.is-won').length;
    const coins = () => screen.getByRole('status', { name: /^Nog \d+ muntje/ }).getAttribute('aria-label');

    test('the answer counts when the claw shuts on the prize; right = a prize on the shelf', () => {
        start();
        const { container } = render(<Wired />);
        expect(prizes()).toHaveLength(4);
        expect(container.querySelectorAll('.gm-place')).toHaveLength(GRIJP.questions);
        expect(coins()).toBe('Nog 15 muntjes');
        tapValue(sp().question!.answer);
        // The claw is on its way: nothing counted yet, but the coin is in.
        expect(names()).toEqual([]);
        expect(coins()).toBe('Nog 14 muntjes');
        wait(4000);
        expect(names()).toEqual(['correct']);
        wait(4000);
        expect(won(container)).toBe(1);
        expect(sp().phase).toBe('play');
    });

    test('wrong: the prize slips back (no prize), the mistake is logged and the right tag glows', () => {
        start();
        const { container } = render(<Wired />);
        const wrong = wrongOf();
        tapValue(wrong);
        for (let i = 0; i < 60 && !names().length; i++) wait(100);
        expect(names()).toEqual(['wrong']);
        expect(log[0].payload).toMatchObject({ given: wrong });
        expect(sp().mistakes).toHaveLength(1);
        expect(container.querySelector('.gm-slot.is-answer .gm-tag')!.textContent).toBe(sp().question!.answer);
        expect(container.querySelector('.gm-sign-answer')!.textContent).toBe(sp().question!.answer);
        wait(4000);
        expect(won(container)).toBe(0);
    });

    test('a tap while the claw is busy waits its turn; the same question never takes two taps', () => {
        start();
        render(<Wired />);
        const q1 = sp().question!;
        tapValue(q1.answer);
        tapValue(q1.choices.find(c => c !== q1.answer)!);
        wait(3000);
        expect(names()).toEqual(['correct']);
        // The next sum is up while the prize is still on its way to the chute: that tap is queued.
        wait(900);
        const q2 = sp().question!;
        expect(q2.key).not.toBe(q1.key);
        tapValue(q2.answer);
        wait(8000);
        expect(names()).toEqual(['correct', 'correct']);
    });

    test('help freezes the claw; keys 1–4 tap; fifteen coins end the round', () => {
        start();
        render(<Wired />);
        const q = sp().question!;
        fireEvent.keyDown(window, { key: '7' });
        fireEvent.keyDown(window, { key: String(q.choices.indexOf(q.answer) + 1) });
        wait(200);
        act(() => sp().openHelp());
        wait(10_000);
        expect(names()).toEqual(['help']);
        act(() => sp().closeHelp());
        wait(4000);
        expect(names()).toEqual(['help', 'correct']);
        for (let i = 1; i < GRIJP.questions && sp().phase !== 'end'; i++) {
            wait(6000);
            tapValue(sp().question!.answer);
        }
        wait(8000);
        expect(sp().phase).toBe('end');
        expect(names().at(-1)).toBe('end');
    });

    test('Normaal: a clock ring per sum; time up = a mistake, the claw hurries down on a prize that is not the answer and it slips away', () => {
        start('normaal');
        const { container } = render(<Wired />);
        expect(screen.getByRole('timer', { name: 'De tijd voor deze som' })).toBeTruthy();
        const answer = sp().question!.answer;
        // 12 s per sum the first minute: nothing yet just before it.
        for (let t = 0; t < 11_800; t += 100) wait(100);
        expect(names()).toEqual([]);
        expect(container.querySelector('.gm-timer.is-low')).not.toBeNull();
        for (let i = 0; i < 10 && !names().length; i++) wait(100);
        expect(names()).toEqual(['wrong']);
        expect(log[0].payload).toMatchObject({ given: '' });
        expect(sp().mistakes).toHaveLength(1);
        // The claw is on its way by itself, for a prize that is not the answer.
        wait(700);
        expect(container.querySelector('.gm-say')!.textContent).toBe('Te laat!');
        expect(container.querySelector('.gm-carried .gm-tag')!.textContent).not.toBe(answer);
        wait(4000);
        expect(won(container)).toBe(0);
        expect(sp().phase).toBe('play');
    });

    test('a tap stops the clock: the claw on its way never times out', () => {
        start('onmogelijk');
        render(<Wired />);
        // Tap at 9 s of the 12 s clock: the claw's trip runs past 12 s (11 s left no margin under a loaded gate).
        for (let t = 0; t < 9_000; t += 100) wait(100);
        tapValue(sp().question!.answer);
        wait(4000);
        expect(names()).toEqual(['correct']);
    });

    test('Makkelijk: no clock ring, the claw waits as long as it takes', () => {
        start('makkelijk');
        const { container } = render(<Wired />);
        expect(container.querySelector('.gm-timer')).toBeNull();
        for (let t = 0; t < 60_000; t += 500) wait(500);
        expect(names()).toEqual([]);
        tapValue(sp().question!.answer);
        wait(4000);
        expect(names()).toEqual(['correct']);
    });

    test('the end picture: the round\'s prizes on the shelf, waving, under the jackpot', () => {
        start();
        render(<Wired />);
        tapValue(sp().question!.answer);
        wait(9000);
        cleanup();
        const { container } = render(<GrijpEnding outcome="done" progress={progressOf(sp())} options={{}} />);
        expect(container.querySelectorAll('.gm-ending-prize')).toHaveLength(1);
        expect(container.querySelector('.gm-ending-title')!.textContent).toBe('JACKPOT!');
        wait(2500);
        expect(container.querySelector('.gm-ending .spel-burst, .gm-ending [class*="burst"]')).not.toBeNull();
    });
});

describe('Grijpmachine: registry', () => {
    test('a calm untimed tap game of 15 sums that takes pictures; music gek; Rustig spelen; its own blurb and sounds', () => {
        const entry = skinById('grijp')!;
        expect(entry.Component).toBeDefined();
        expect(entry.Ending).toBeDefined();
        expect(entry.meta).toMatchObject({ label: 'Grijpmachine', input: 'choice', timed: false, music: 'gek', round: { questions: 15 } });
        expect(entry.meta.canFail).toBeUndefined();
        expect(entry.meta.accepts).toEqual({ kinds: ['number', 'choice'], maxAnswerChars: 5, pictures: true });
        expect(skinAccepts(entry.meta.accepts, NUMBER_CONTENT)).toBe(true);
        expect(skinAccepts(entry.meta.accepts, PICTURE_CONTENT)).toBe(true);
        expect(skinAccepts(entry.meta.accepts, { kind: 'choice', answerChars: 6 })).toBe(false);
        expect(gameGroupOf(entry.meta)).toBe('rustig');
        expect(GAME_BLURB.grijp).toBeTruthy();
        expect(entry.meta.sounds).toMatchObject({ correct: null, wrong: null });
    });
});
