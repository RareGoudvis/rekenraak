// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, screen, within, fireEvent } from '@testing-library/react';
import { skinById } from '../oefenen/spelen/skins/registry';
import type { SkinPhase, SkinProps } from '../oefenen/spelen/skins/types';
import { NUMBER_CONTENT, PICTURE_CONTENT, skinAccepts } from '../oefenen/spelen/accepts';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import { createSpelEvents, type SpelEventName } from '../oefenen/spelen/events';
import { soundFor } from '../oefenen/spelen/sound';
import { klokQuestion } from '../oefenen/spelen/content/klok/klokPack';
import { formatDigitalTime, formatTimeText } from '../services/clock/clockTypes';
import Zeehond from '../oefenen/spelen/skins/zeehond/Zeehond';
import { fishLeft, flightOf, ZEEHOND_ROUND } from '../oefenen/spelen/skins/zeehond/feed';
import { DRIFT_MAX_SPEED, DRIFT_STILL_STEP, driftOffsets, fedAfter, girthOf, GROW_STEPS, levelOf, pickPod, SEAL_LOOKS, sealShape, type SpotBox } from '../oefenen/spelen/skins/zeehond/pod';
import { choicesOf } from '../oefenen/spelen/skins/options';
import { resetKiosk } from './helpers/oefenKiosk';

// Zeehondjes voeren: the registry entry and what it plays, the skin on the real session (right / wrong / help,
// keys 1–4, the bucket), the reduced-motion path and clock faces on the signs; the seals of a game (looks, growth per
// fish, signs that swap while the seals stay) and Moeilijk's drifting floes (pod.ts).

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();
const log: { name: SpelEventName; payload: unknown }[] = [];
const offs: (() => void)[] = [];

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
    log.length = 0;
    for (const name of ['correct', 'wrong', 'help', 'end'] as SpelEventName[]) offs.push(sp().events.on(name, p => log.push({ name, payload: p })));
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { offs.splice(0).forEach(off => off()); cleanup(); vi.restoreAllMocks(); });

const start = (now?: number) => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: skinById('zeehond')!.meta, now }));

function Wired({ reducedMotion = false, niveau }: { reducedMotion?: boolean; niveau?: string }) {
    const st = useSpelStore();
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Zeehond question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={st.question.choices}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={() => { }} progress={progress} options={niveau ? { niveau } : {}} events={st.events} reducedMotion={reducedMotion} />
    );
}
const seals = () => within(screen.getByRole('group', { name: 'Kies het antwoord' })).getAllByRole('button') as HTMLButtonElement[];
const tapValue = (value: string) => fireEvent.click(seals().find(b => b.getAttribute('aria-label') === value)!);
const wrongOf = () => sp().question!.choices.find(c => c !== sp().question!.answer)!;
const names = () => log.map(l => l.name);
const bucket = (c: HTMLElement) => c.querySelector('.zh-bucket')!.getAttribute('aria-label');

describe('Zeehondjes voeren', () => {
    test('registry: a calm untimed choice skin, 15 sums, picture content, answers up to 5 characters, its own sounds', () => {
        const entry = skinById('zeehond')!;
        expect(entry.Component).toBeDefined();
        expect(entry.meta).toMatchObject({ label: 'Zeehondjes voeren', input: 'choice', timed: false, round: { questions: ZEEHOND_ROUND } });
        expect(entry.meta.season).toBeUndefined();
        expect(entry.meta.canFail).toBeUndefined();
        expect(entry.meta.accepts).toEqual({ kinds: ['number', 'choice'], pictures: true, maxAnswerChars: 5 });
        expect(entry.Ending).toBeDefined();
        expect(skinAccepts(entry.meta.accepts, NUMBER_CONTENT)).toBe(true);
        expect(skinAccepts(entry.meta.accepts, PICTURE_CONTENT)).toBe(true);
        expect(skinAccepts(entry.meta.accepts, { kind: 'choice', answerChars: 5 })).toBe(true);
        expect(skinAccepts(entry.meta.accepts, { kind: 'choice', answerChars: 6 })).toBe(false);
        expect(skinAccepts(entry.meta.accepts, { kind: 'pair' })).toBe(false);
        expect(soundFor(entry.meta.sounds, 'correct', { given: '1', streak: 1 })).toBe('ork');
        expect(soundFor(entry.meta.sounds, 'wrong', { given: '2', expected: '1' })).toBe('plons');
    });

    test('the bucket holds one fish per sum; a fish leaves only when a seal eats it; the throw arcs above both ends', () => {
        expect(fishLeft({ total: 15, right: 0 })).toBe(15);
        expect(fishLeft({ total: 15, right: 4 })).toBe(11);
        expect(fishLeft({ total: 15, right: 20 })).toBe(0);
        expect(fishLeft({ total: null, right: 2 })).toBe(13);
        const box = { left: 10, top: 20, width: 1000, height: 700 };
        const f = flightOf('k', box, { left: 500, top: 600, width: 10, height: 10 }, { left: 100, top: 300, width: 10, height: 10 });
        expect(f).toMatchObject({ key: 'k', x: 495, y: 585, dx: -400, dy: -300 });
        expect(f.arc).toBeLessThan(f.dy);
    });

    test('a round: right feeds the seal (correct), wrong turns it away (wrong) and the right seal waves; 15 sums end it', () => {
        start();
        const { container } = render(<Wired />);
        expect(seals()).toHaveLength(4);
        expect(bucket(container)).toBe('Nog 15 vissen in de emmer');
        tapValue(sp().question!.answer);
        expect(names()).toEqual(['correct']);
        expect(container.querySelector('.zh-spot.is-fed')).not.toBeNull();
        expect(container.querySelector('.zh-fly')).not.toBeNull();
        expect(container.querySelector('.zh-fed-fish')).toBeNull();
        expect(bucket(container)).toBe('Nog 14 vissen in de emmer');
        // Every seal waits during the flash.
        expect(seals().every(b => b.disabled)).toBe(true);
        act(() => sp().next());
        expect(container.querySelector('.zh-fly')).toBeNull();

        const wrong = wrongOf();
        tapValue(wrong);
        expect(names()).toEqual(['correct', 'wrong']);
        expect(log[1].payload).toMatchObject({ given: wrong });
        expect(container.querySelector('.zh-spot.is-nope .zh-board')!.textContent).toBe(wrong);
        expect(container.querySelector('.zh-spot.is-answer .zh-board')!.textContent).toBe(sp().question!.answer);
        expect(container.querySelector('.zh-sign-answer')!.textContent).toBe(sp().question!.answer);
        expect(container.querySelector('.zh-fly')).toBeNull();
        expect(bucket(container)).toBe('Nog 14 vissen in de emmer');
        act(() => sp().next());

        // Help pauses the round: no seal takes a tap.
        act(() => sp().openHelp());
        expect(names()).toEqual(['correct', 'wrong', 'help']);
        expect(container.querySelector('.zh-root.is-paused')).not.toBeNull();
        expect(seals().every(b => b.disabled)).toBe(true);
        act(() => sp().closeHelp());
        tapValue(sp().question!.answer);
        act(() => sp().next());
        for (let i = 3; i < ZEEHOND_ROUND; i++) {
            tapValue(sp().question!.answer);
            act(() => sp().next());
        }
        expect(sp().phase).toBe('end');
        expect(names().filter(n => n === 'correct')).toHaveLength(14);
        expect(names().at(-1)).toBe('end');
    });

    test('keys 1–4 pick a seal; other keys do nothing', () => {
        start();
        render(<Wired />);
        fireEvent.keyDown(window, { key: '5' });
        fireEvent.keyDown(window, { key: 'a' });
        expect(names()).toEqual([]);
        const q = sp().question!;
        fireEvent.keyDown(window, { key: String(q.choices.indexOf(q.answer) + 1) });
        expect(names()).toEqual(['correct']);
        act(() => sp().next());
        const q2 = sp().question!;
        const w = q2.choices.findIndex(c => c !== q2.answer);
        fireEvent.keyDown(window, { key: String(w + 1) });
        expect(names()).toEqual(['correct', 'wrong']);
    });

    test('reduced motion: no flying fish, the fish is simply at the seal', () => {
        start();
        const { container } = render(<Wired reducedMotion />);
        expect(container.querySelector('.zh-root.is-still')).not.toBeNull();
        tapValue(sp().question!.answer);
        expect(names()).toEqual(['correct']);
        expect(container.querySelector('.zh-fly')).toBeNull();
        expect(container.querySelector('.zh-bubbles')).toBeNull();
        expect(container.querySelector('.zh-spot.is-fed .zh-fed-fish')).not.toBeNull();
    });

    test('klok content: clock faces on the signs, named by their view; a tap hands back the value', () => {
        const exercise = { id: 'x', hours: 8, minutes: 15, timeText: formatTimeText(8, 15, false), digitalText: formatDigitalTime(8, 15), isManuallyEdited: false, clockType: 'analoog' as const, exerciseMode: 'tekenen' as const };
        const q = klokQuestion(exercise, { clockType: 'analoog', exerciseMode: 'tekenen', timeTypes: ['uren', 'halve_uren', 'kwartier_over', 'kwartier_voor'] }, 'q1', 4)!;
        const onAnswer = vi.fn();
        const props: SkinProps = {
            question: { key: 'q1', text: q.text, index: 0, visual: q.visual }, choices: q.choices, views: q.views,
            phase: 'play', feedback: null, onAnswer, onHelp: vi.fn(), onMiss: vi.fn(), onFail: vi.fn(), sound: vi.fn(),
            progress: { answered: 0, total: 15, score: 0, streak: 0, bestStreak: 0, msLeft: null, goal: null, right: 0, mistakes: 0, misses: 0, msTotal: null },
            options: {}, events: createSpelEvents(), reducedMotion: false,
        };
        const { container } = render(<Zeehond {...props} />);
        expect(container.querySelector('.zh-root.has-pictures')).not.toBeNull();
        expect(container.querySelector('.zh-sign.spel-sign-has-pic')).not.toBeNull();
        expect(container.querySelectorAll('.zh-board.is-picture .spel-klok')).toHaveLength(4);
        const i = q.choices.indexOf(q.answer);
        fireEvent.click(screen.getByRole('button', { name: q.views[i].label }));
        expect(onAnswer).toHaveBeenCalledWith(q.answer);
    });

    test('mode: Normaal by default, Moeilijk as the pre-start choice', () => {
        const meta = skinById('zeehond')!.meta;
        expect(meta.options?.map(o => [o.id, o.default, o.choices.map(c => c.value)])).toEqual([['niveau', 'normaal', ['normaal', 'moeilijk']]]);
        expect(levelOf(choicesOf(meta))).toBe('normaal');
        expect(levelOf(choicesOf(meta, { niveau: 'moeilijk' }))).toBe('moeilijk');
        expect(levelOf({ niveau: 'wild' })).toBe('normaal');
    });

    test('a game takes four different seals, varied in fur and dress, and another game often others', () => {
        expect(SEAL_LOOKS.length).toBeGreaterThanOrEqual(6);
        expect(SEAL_LOOKS.length).toBeLessThanOrEqual(8);
        const sets = new Set<string>();
        for (let seed = 1; seed <= 200; seed++) {
            const pod = pickPod(seed);
            expect(new Set(pod.map(l => l.id)).size).toBe(4);
            expect(new Set(pod.map(l => l.fur)).size).toBeGreaterThanOrEqual(3);
            const wear = pod.map(l => l.wear).filter(w => w !== 'none');
            expect(new Set(wear).size).toBe(wear.length);
            expect(pod.filter(l => l.pup).length).toBeLessThanOrEqual(1);
            sets.add(pod.map(l => l.id).sort().join());
        }
        expect(sets.size).toBeGreaterThan(10);
        expect(pickPod(7)).toEqual(pickPod(7));
    });

    test('each seal grows one step per fish it ate, capped, and stays inside its box', () => {
        expect(fedAfter([0, 0, 0, 0], 2)).toEqual([0, 0, 1, 0]);
        expect(fedAfter(fedAfter([0, 0, 0, 0], 2), 2)).toEqual([0, 0, 2, 0]);
        expect(fedAfter([], 1)).toEqual([0, 1, 0, 0]);
        expect([0, 1, 2, 3, 4, 9].map(girthOf)).toEqual([0, 1, 2, 3, GROW_STEPS, GROW_STEPS]);
        const widths = [0, 1, 2, 3, 4].map(s => sealShape(s).hw);
        widths.slice(1).forEach((w, k) => expect(w).toBeGreaterThan(widths[k]));
        expect(sealShape(9)).toEqual(sealShape(GROW_STEPS));
        for (let s = 0; s <= GROW_STEPS; s++) {
            const xs = [...sealShape(s).body.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map(m => Number(m[1]));
            expect(Math.min(...xs)).toBeGreaterThanOrEqual(-2);
            expect(Math.max(...xs)).toBeLessThanOrEqual(122);
        }
    });

    test('Moeilijk: drifting floes never overlap, never leave the sea and never go fast', () => {
        const cases: { spots: SpotBox[]; width: number; height: number }[] = [
            // 1280 × 800: one row of four, room to wander.
            { spots: [0, 1, 2, 3].map(k => ({ x: 40 + k * 316, y: 60, w: 210, h: 330 })), width: 1264, height: 450 },
            // 1024 × 768: tighter.
            { spots: [0, 1, 2, 3].map(k => ({ x: 36 + k * 252, y: 40, w: 190, h: 300 })), width: 1008, height: 380 },
            // 390 × 844 upright: two rows of two.
            { spots: [0, 1, 2, 3].map(k => ({ x: 30 + (k % 2) * 187, y: 20 + Math.floor(k / 2) * 280, w: 128, h: 240 })), width: 374, height: 560 },
        ];
        for (const { spots, width, height } of cases) {
            for (const seed of [1, 99, 12345]) {
                const spec = { width, height, gap: 10, seed };
                let prev = driftOffsets(0, spots, spec);
                let moved = 0;
                for (let t = 0.05; t < 240; t += 0.05) {
                    const off = driftOffsets(t, spots, spec);
                    const at = spots.map((s, i) => ({ ...s, x: s.x + off[i].dx, y: s.y + off[i].dy }));
                    for (const a of at) {
                        expect(a.x).toBeGreaterThanOrEqual(-0.01);
                        expect(a.x + a.w).toBeLessThanOrEqual(width + 0.01);
                        expect(a.y).toBeGreaterThanOrEqual(-0.01);
                        expect(a.y + a.h).toBeLessThanOrEqual(height + 0.01);
                    }
                    for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
                        const [a, b] = [at[i], at[j]];
                        const apart = a.x + a.w + 9.99 <= b.x || b.x + b.w + 9.99 <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
                        expect(apart).toBe(true);
                    }
                    off.forEach((o, i) => {
                        const v = Math.hypot(o.dx - prev[i].dx, o.dy - prev[i].dy) / 0.05;
                        expect(v).toBeLessThanOrEqual(DRIFT_MAX_SPEED * 1.5);
                        moved = Math.max(moved, Math.abs(o.dx));
                    });
                    prev = off;
                }
                // It really drifts: some floe wanders a good way from its spot.
                expect(moved).toBeGreaterThan(30);
            }
        }
        // Reduced motion: each question puts the seals somewhere else.
        const { spots, width, height } = cases[0];
        const at = (q: number) => driftOffsets(q * DRIFT_STILL_STEP + 3, spots, { width, height, gap: 10, seed: 5 }).map(o => Math.round(o.dx));
        expect(at(1)).not.toEqual(at(2));
        expect(at(2)).not.toEqual(at(3));
    });

    test('a new question swaps the signs, not the seals; the fed seal grows; no key badges', () => {
        // A fixed session seed: the same sums every run (the seals' looks stay random).
        start(20261115);
        const { container } = render(<Wired reducedMotion />);
        expect(container.querySelector('.zh-key')).toBeNull();
        const before = seals();
        const spotsNow = () => [...container.querySelectorAll('.zh-spot')];
        const looks = spotsNow().map(s => s.getAttribute('data-look'));
        expect(new Set(looks).size).toBe(4);
        const signs = () => [...container.querySelectorAll('.zh-board')].map(b => b.textContent);
        const girths = () => spotsNow().map(s => Number(s.getAttribute('data-girth')));
        expect(girths()).toEqual([0, 0, 0, 0]);
        const firstSigns = signs();
        const fedSeal = sp().question!.choices.indexOf(sp().question!.answer);
        tapValue(sp().question!.answer);
        expect(girths()[fedSeal]).toBe(1);
        expect(girths().reduce((a, b) => a + b)).toBe(1);
        act(() => sp().next());
        // The same buttons (no remount), the same looks, new signs.
        seals().forEach((b, i) => expect(b).toBe(before[i]));
        expect(spotsNow().map(s => s.getAttribute('data-look'))).toEqual(looks);
        expect(signs()).toEqual(sp().question!.choices);
        expect(signs()).not.toEqual(firstSigns);
        // A wrong pick feeds nobody.
        tapValue(wrongOf());
        expect(girths().reduce((a, b) => a + b)).toBe(1);
        act(() => sp().next());
        // Each fish goes to the seal holding the answer; a seal stops growing at GROW_STEPS (one seal can get five
        // of seven fish), so the expected girths come from the fish per seal, not from a plain sum.
        const fish = [0, 0, 0, 0];
        fish[fedSeal] = 1;
        for (let k = 0; k < 6; k++) {
            fish[sp().question!.choices.indexOf(sp().question!.answer)]++;
            tapValue(sp().question!.answer);
            act(() => sp().next());
        }
        expect(girths()).toEqual(fish.map(girthOf));
        expect(Math.max(...girths())).toBeLessThanOrEqual(GROW_STEPS);
    });

    test('with motion the seal grows when its fish lands; Moeilijk marks the drifting sea', () => {
        vi.useFakeTimers();
        try {
            start();
            const { container } = render(<Wired niveau="moeilijk" />);
            expect(container.querySelector('.zh-root.is-drifting')).not.toBeNull();
            const fedSeal = sp().question!.choices.indexOf(sp().question!.answer);
            tapValue(sp().question!.answer);
            const girth = () => Number(container.querySelectorAll('.zh-spot')[fedSeal].getAttribute('data-girth'));
            expect(girth()).toBe(0);
            act(() => { vi.advanceTimersByTime(500); });
            expect(girth()).toBe(1);
            expect(container.querySelector('.zh-spot.has-eaten')).not.toBeNull();
        } finally { vi.useRealTimers(); }
        cleanup();
        start();
        const { container } = render(<Wired />);
        expect(container.querySelector('.zh-root.is-drifting')).toBeNull();
    });
});
