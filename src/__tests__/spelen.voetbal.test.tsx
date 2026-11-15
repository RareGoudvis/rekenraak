// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, fireEvent } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { skinById } from '../oefenen/spelen/skins/registry';
import { resolveMeta } from '../oefenen/spelen/skins/options';
import type { SkinChoices, SkinPhase } from '../oefenen/spelen/skins/types';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { choicesFor, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { useOefenStore } from '../oefenen/useOefenStore';
import { progressOf, useSpelStore } from '../oefenen/spelen/useSpelStore';
import { NUMBER_CONTENT, skinAccepts } from '../oefenen/spelen/accepts';
import Voetbal, { VoetbalEnding } from '../oefenen/spelen/skins/voetbal/Voetbal';
import {
    HOLDER, KICKOFF, PRESSER, VOETBAL, VOETBAL_BEST_KEY, beatsOf, figPoint, goalsLine, halfTimeDue, isShot, loadBest, newMatch, passArc, playOf,
    saveBest, sceneOf, type Beat, type Match, type Scene,
} from '../oefenen/spelen/skins/voetbal/match';
import { GOAL_V, PITCH, VIEW, goalArt, pitchLines, project } from '../oefenen/spelen/skins/voetbal/pitch';
import { resetKiosk } from './helpers/oefenKiosk';

// Voetbal: passes on right answers, a black bear nipping in on a wrong one (the ball rolls back one bear), the shot
// on its own clock after four passes, a match clock in two halves with a held "Rust!", the end lines the skin
// reports, and the scene: a 5 v 5 pitch where every bear has its own spot and the ball travels bear to bear.

let choice: ZelfChoice;
const sp = () => useSpelStore.getState();

beforeAll(async () => {
    const data = await loadEenvoudigData();
    choice = choicesFor(data, 2, 'Hoofdrekenen · Optellen').find(c => c.label === 'Met brug')!;
});
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    sp().otherGame();
    sp().takePickerAt();
    try { localStorage.removeItem(VOETBAL_BEST_KEY); } catch { /* none */ }
    vi.spyOn(console, 'error').mockImplementation(() => { });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

const start = (picked: SkinChoices = {}) => act(() => sp().start({ choice, grade: 2, topicId: 'Hoofdrekenen · Optellen', meta: resolveMeta(skinById('voetbal')!.meta, picked) }));
const typeAnswer = (v: string) => { for (const d of v) fireEvent.keyDown(window, { key: d }); fireEvent.keyDown(window, { key: 'Enter' }); };
const rightKey = () => typeAnswer(sp().question!.answer);
const wrongKey = () => typeAnswer(String(Number(sp().question!.answer) + 1));

// The skin on the real session, as SpelScreen wires it, with the shell's 250 ms clock (tick + a fresh render).
function Wired({ reducedMotion = false }: { reducedMotion?: boolean }) {
    const st = useSpelStore();
    const [, setNow] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => { setNow(Date.now()); useSpelStore.getState().tick(); }, 250);
        return () => window.clearInterval(id);
    }, []);
    if (!st.question || !st.meta) return null;
    const progress = progressOf(st);
    return (
        <Voetbal question={{ key: st.question.key, text: st.question.text, index: progress.answered }} choices={null}
            phase={st.phase as SkinPhase} feedback={st.feedback} onAnswer={st.answer} onHelp={() => st.openHelp()} onMiss={() => st.miss()}
            onFail={() => st.fail()} sound={() => { }} progress={progress} options={st.meta.chosen ?? {}} events={st.events} reducedMotion={reducedMotion}
            runKey="voetbal:test" onFinish={st.finish} onReport={st.report} onHold={on => st.hold(on)} />
    );
}

describe('Voetbal: the registry and the match logic', () => {
    test('keypad, timed, 3 or 5 minutes (default 3), a hidden cap, numbers only', () => {
        const meta = skinById('voetbal')!.meta;
        expect(meta).toMatchObject({ input: 'keypad', timed: true, round: { seconds: 180, cap: VOETBAL.cap } });
        expect(meta.accepts).toEqual({ kinds: ['number'] });
        expect(skinAccepts(meta.accepts, NUMBER_CONTENT)).toBe(true);
        expect(meta.options![0]).toMatchObject({ id: 'tijd', default: '3' });
        expect(resolveMeta(meta, { tijd: '5' }).round.seconds).toBe(300);
        expect(resolveMeta(meta).round.seconds).toBe(180);
        expect(skinById('voetbal')!.Component).toBeDefined();
        expect(skinById('voetbal')!.Ending).toBeDefined();
    });

    test('passes advance on right answers, a wrong one rolls the ball back one bear (never a goal against); the fifth sum is the shot', () => {
        let m = newMatch();
        expect(playOf(m, false)).toMatchObject({ passes: 0, last: 'tap', goals: 0 });
        m = playOf(m, true);
        m = playOf(m, true);
        expect(m).toMatchObject({ passes: 2, last: 'pass' });
        m = playOf(m, false);
        expect(m).toMatchObject({ passes: 1, last: 'tap', goals: 0 });
        for (let i = 0; i < 3; i++) m = playOf(m, true);
        expect(isShot(m)).toBe(true);
        const goal = playOf(m, true);
        expect(goal).toMatchObject({ passes: 0, goals: 1, last: 'goal' });
        const save = playOf(m, false);
        expect(save).toMatchObject({ passes: 0, goals: 0, saves: 1, last: 'save' });
        expect(goalsLine(1)).toBe('IJsberen 1 doelpunt');
        expect(goalsLine(4)).toBe('IJsberen 4 doelpunten');
    });

    test('half time is due once, after half the match clock', () => {
        const m = newMatch();
        expect(halfTimeDue(m, 100_000, 180_000)).toBe(false);
        expect(halfTimeDue(m, 90_000, 180_000)).toBe(true);
        expect(halfTimeDue({ ...m, half: 2 }, 60_000, 180_000)).toBe(false);
        expect(halfTimeDue(m, null, null)).toBe(false);
    });

    test('the best match per key; blocked storage is fine', () => {
        expect(loadBest('k')).toBe(0);
        saveBest('k', 3);
        saveBest('k', 2);
        expect(loadBest('k')).toBe(3);
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        expect(loadBest('k')).toBe(0);
        expect(() => saveBest('k', 9)).not.toThrow();
    });
});

describe('Voetbal: the pitch and where the bears stand', () => {
    const fig = (s: Scene, id: string) => s.figs.find(f => f.id === id)!;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
    const after = (m: Match, ...answers: boolean[]) => answers.reduce(playOf, m);
    // Every beat of every play from every pass count.
    const allBeats = (): { beat: Beat; pair?: [string, string] }[] => {
        const out: { beat: Beat; pair?: [string, string] }[] = [{ beat: KICKOFF }];
        for (let p = 0; p <= VOETBAL.passes; p++) {
            const m = { ...newMatch(), passes: p, n: p };
            for (const correct of [true, false]) {
                for (const { beat } of beatsOf(m, playOf(m, correct))) {
                    const pair: [string, string] | undefined = beat.kind === 'steal' ? [`ijs${HOLDER[p]}`, `zwart${PRESSER[p]}`]
                        : beat.kind === 'five' ? [`ijs${HOLDER[VOETBAL.passes]}`, 'zwart0'] : undefined;
                    out.push({ beat, pair });
                }
            }
        }
        return out;
    };

    test('the pitch lines stay on the pitch and the goals inside the scene', () => {
        const { lines, stripes } = pitchLines();
        for (const d of [...lines, ...stripes]) {
            const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
            for (let i = 0; i < nums.length; i += 2) {
                const [x, y] = [nums[i], nums[i + 1]];
                const v = (y - PITCH.far) / (PITCH.near - PITCH.far);
                expect(v).toBeGreaterThanOrEqual(-0.001);
                expect(v).toBeLessThanOrEqual(1.001);
                expect(x).toBeGreaterThanOrEqual(project(0, v).x - 0.5);
                expect(x).toBeLessThanOrEqual(project(1, v).x + 0.5);
            }
        }
        for (const side of [0, 1] as const) {
            const nums = Object.values(goalArt(side)).join(' ').match(/-?\d+(\.\d+)?/g)!.map(Number);
            for (let i = 0; i < nums.length; i += 2) {
                expect(nums[i]).toBeGreaterThanOrEqual(0);
                expect(nums[i]).toBeLessThanOrEqual(VIEW.w);
                expect(nums[i + 1]).toBeGreaterThan(PITCH.far);
            }
        }
        // The far side is drawn smaller: perspective.
        expect(project(0.5, 0).s).toBeLessThan(project(0.5, 1).s);
    });

    test('kick-off: 5 against 5 (keeper, 2 defenders, 2 forwards) mirrored over the halfway line, the polar keeper has the ball', () => {
        const s = sceneOf(KICKOFF);
        expect(s.figs.filter(f => f.team === 'ijs')).toHaveLength(5);
        expect(s.figs.filter(f => f.team === 'zwart')).toHaveLength(5);
        for (let i = 0; i < 5; i++) {
            const a = fig(s, `ijs${i}`), b = fig(s, `zwart${i}`);
            expect(a.y).toBeCloseTo(b.y, 5);
            expect(a.x + b.x).toBeCloseTo(2 * project(0.5, (a.y - PITCH.far) / (PITCH.near - PITCH.far)).x, 1);
        }
        const keeper = fig(s, 'ijs0');
        expect(keeper.x).toBeLessThan(project(0.1, 0.5).x);
        expect(fig(s, 'zwart0').x).toBeGreaterThan(project(0.9, 0.5).x);
        expect(s.figs.filter(f => f.gloves).map(f => f.id).sort()).toEqual(['ijs0', 'zwart0']);
        expect(dist(s.ball, keeper)).toBeLessThan(20);
    });

    test('no clumps: in every beat each bear has its own spot on the pitch (the steal and the high five meet on purpose)', () => {
        for (const { beat, pair } of allBeats()) {
            const s = sceneOf(beat);
            for (const f of s.figs) {
                expect(f.x, `${f.id} in ${JSON.stringify(beat)}`).toBeGreaterThan(8);
                expect(f.x).toBeLessThan(VIEW.w - 8);
                expect(f.y).toBeGreaterThanOrEqual(PITCH.far);
                expect(f.y).toBeLessThanOrEqual(PITCH.near);
            }
            for (let i = 0; i < s.figs.length; i++) for (let j = i + 1; j < s.figs.length; j++) {
                const a = s.figs[i], b = s.figs[j];
                if (pair?.includes(a.id) && pair.includes(b.id)) continue;
                const k = Math.max(a.k, b.k);
                const clash = Math.abs(a.x - b.x) < 24 * k && Math.abs(a.y - b.y) < 40 * k;
                expect(clash, `${a.id} and ${b.id} clump in ${JSON.stringify(beat)}`).toBe(false);
            }
        }
    });

    test('each right answer passes the ball forward to the next bear, who runs to meet it; the ball is lifted on its way', () => {
        let m = newMatch();
        let prev = sceneOf(KICKOFF);
        for (let p = 0; p < VOETBAL.passes; p++) {
            const next = playOf(m, true);
            const steps = beatsOf(m, next);
            expect(steps[0].beat).toMatchObject({ kind: 'hold', p: p + 1, kicker: HOLDER[p] });
            const s = sceneOf(steps[0].beat);
            const receiver = fig(s, `ijs${HOLDER[p + 1]}`);
            expect(s.ball.x).toBeGreaterThan(prev.ball.x);
            const nearest = [...s.figs].sort((a, b) => dist(a, s.ball) - dist(b, s.ball))[0];
            expect(nearest.id).toBe(receiver.id);
            expect(fig(s, `ijs${HOLDER[p]}`).pose).toBe('kick');
            expect(passArc(prev.ball, s.ball, s.move)).toBeGreaterThan(0);
            expect(sceneOf(steps[1].beat).figs.every(f => f.pose !== 'kick')).toBe(true);
            prev = s;
            m = next;
        }
        expect(passArc(prev.ball, sceneOf(KICKOFF).ball, 'roll')).toBe(0);
    });

    test('a wrong pass: the nearest black bear nips in ("Oeps!"), then the ball rolls back to the bear before', () => {
        for (let p = 0; p <= VOETBAL.passes - 1; p++) {
            const m = after(newMatch(), ...Array<boolean>(p).fill(true));
            const holderSpot = fig(sceneOf({ kind: 'hold', p, kicker: null, move: 'still' }), `ijs${HOLDER[p]}`);
            const outfield = sceneOf({ kind: 'hold', p, kicker: null, move: 'still' }).figs.filter(f => f.team === 'zwart' && f.slot > 0);
            const nearest = [...outfield].sort((a, b) => dist(a, holderSpot) - dist(b, holderSpot))[0];
            expect(nearest.slot, `presser at ${p}`).toBe(PRESSER[p]);
            const [steal, back] = beatsOf(m, playOf(m, false));
            const s = sceneOf(steal.beat);
            const tapper = fig(s, `zwart${PRESSER[p]}`);
            expect(tapper.pose).toBe('kick');
            expect(dist(tapper, s.ball)).toBeLessThan(dist(fig(s, `ijs${HOLDER[p]}`), tapper) + 1);
            expect(s.bubble).not.toBeNull();
            expect(back.at).toBe(VOETBAL.tapMs);
            const r = sceneOf(back.beat);
            expect(r.move).toBe('roll');
            const nearestBack = [...r.figs].sort((a, b) => dist(a, r.ball) - dist(b, r.ball))[0];
            expect(nearestBack.id).toBe(`ijs${HOLDER[Math.max(0, p - 1)]}`);
        }
    });

    test('the shot: a goal flies past the diving keeper into the net; a save lands in his gloves; then the kick-off', () => {
        const ready = after(newMatch(), true, true, true, true);
        expect(isShot(ready)).toBe(true);
        const line = (v: number) => project(1, v);
        for (const n of [4, 5]) {
            const m = { ...ready, n };
            const goal = beatsOf(m, playOf(m, true));
            expect(goal.map(s => s.beat.kind)).toEqual(['shot', 'goal', 'hold']);
            const flying = sceneOf(goal[0].beat);
            expect(fig(flying, `ijs${HOLDER[VOETBAL.passes]}`).pose).toBe('kick');
            expect(fig(flying, 'zwart0').pose).toBe('dive');
            const inNet = sceneOf(goal[1].beat);
            const v = (inNet.ball.y - PITCH.far) / (PITCH.near - PITCH.far);
            expect(v).toBeGreaterThan(GOAL_V);
            expect(v).toBeLessThan(1 - GOAL_V);
            expect(inNet.ball.x).toBeGreaterThan(line(v).x);
            expect(inNet).toMatchObject({ crowd: 'goal', bulge: true });
            expect(inNet.figs.filter(f => f.team === 'ijs').every(f => f.jump && f.pose === 'cheer')).toBe(true);
            expect(dist(fig(inNet, 'zwart0'), inNet.ball)).toBeGreaterThan(14);
            expect(goal[2]).toMatchObject({ at: VOETBAL.kickoffMs, beat: { kind: 'hold', p: 0, move: 'reset' } });
            expect(sceneOf(goal[2].beat).ball).toEqual(sceneOf(KICKOFF).ball);

            const save = beatsOf(m, playOf(m, false));
            expect(save.map(s => s.beat.kind)).toEqual(['shot', 'save', 'five', 'hold']);
            const caught = sceneOf(save[0].beat);
            const k = fig(caught, 'zwart0');
            const gloves = figPoint(k, 0, -76);
            expect(dist({ x: caught.ball.x, y: caught.ball.y - caught.ball.lift }, gloves)).toBeLessThan(3);
            const five = sceneOf(save[2].beat);
            expect(five.star).not.toBeNull();
            expect(dist(fig(five, `ijs${HOLDER[VOETBAL.passes]}`), fig(five, 'zwart0'))).toBeLessThan(40);
        }
    });

    test('the keeper dives toward the ball on a save and the other way on a goal', () => {
        const m: Match = { ...after(newMatch(), true, true, true, true), n: 5 };
        const goalKeeper = fig(sceneOf(beatsOf(m, playOf(m, true))[0].beat), 'zwart0');
        const saveKeeper = fig(sceneOf(beatsOf(m, playOf(m, false))[0].beat), 'zwart0');
        expect(Math.sign(goalKeeper.y - fig(sceneOf(KICKOFF), 'zwart0').y)).not.toBe(Math.sign(saveKeeper.y - fig(sceneOf(KICKOFF), 'zwart0').y));
    });
});

describe('Voetbal on the session (fake clock)', () => {
    beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] }); });
    const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
    const dots = (c: HTMLElement) => c.querySelectorAll('.vb-dot.is-on').length;

    test('passes on right answers, a wrong one rolls back one bear, the shot shows its ring', () => {
        start();
        const { container } = render(<Wired />);
        expect(sp().result).toMatchObject({ title: 'Wat een wedstrijd!', lead: 'IJsberen 0 doelpunten' });
        rightKey(); wait(800);
        rightKey(); wait(800);
        expect(dots(container)).toBe(2);
        wrongKey();
        expect(container.querySelector('.vb-bubble')!.textContent).toBe('Oeps!');
        wait(1700);
        expect(container.querySelector('.vb-bubble')).toBeNull();
        expect(dots(container)).toBe(1);
        expect(sp().mistakes).toHaveLength(1);
        for (let i = 0; i < 3; i++) { expect(container.querySelector('.vb-ring')).toBeNull(); rightKey(); wait(800); }
        expect(dots(container)).toBe(4);
        expect(container.querySelector('.vb-ring')).not.toBeNull();
        expect(container.querySelector('.vb-tag.is-on')!.textContent).toBe('Schiet op doel!');
    });

    test('a shot in time is a goal; the score and the end lines go up', () => {
        start();
        const { container } = render(<Wired />);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        wait(5_000);
        rightKey();
        expect(container.querySelector('.vb-shout.is-goal')!.textContent).toBe('GOAL!');
        expect(container.querySelector('.vb-score')!.getAttribute('aria-label')).toBe('IJsberen 1 doelpunt');
        expect(sp().result).toMatchObject({ lead: 'IJsberen 1 doelpunt', detail: 'Nieuw record!' });
        expect(container.querySelector('.vb-board-num')!.textContent).toBe('1');
        wait(VOETBAL.flightMs);
        // The ball is in the net: the stand cheers, the net puffs out, the polar bears jump.
        expect(container.querySelector('.vb-stand.is-goal')).not.toBeNull();
        expect(container.querySelector('.vb-goal-net.is-bulge')).not.toBeNull();
        expect(container.querySelectorAll('.vb-fig.is-jump')).toHaveLength(5);
        wait(800);
        expect(dots(container)).toBe(0);
        expect(container.querySelector('.vb-ring')).toBeNull();
        // The kick-off: everybody back in place, the polar keeper has the ball again.
        wait(VOETBAL.kickoffMs);
        expect(container.querySelector('.vb-stand.is-goal')).toBeNull();
        expect(container.querySelectorAll('.vb-fig.is-jump')).toHaveLength(0);
        expect(container.querySelector('.vb-ball-move.is-reset')).not.toBeNull();
    });

    test('the scene shows no numbers of its own: only the score and the half on the scoreboard', () => {
        start();
        const { container } = render(<Wired />);
        const texts = [...container.querySelectorAll('.vb-svg text')].map(t => t.textContent);
        expect(texts).toEqual(['0', '1e helft']);
        expect(container.querySelector('.vb-svg [class*="key"]')).toBeNull();
    });

    test('reduced motion: the root holds every animation still', () => {
        start();
        const { container } = render(<Wired reducedMotion />);
        expect(container.querySelector('.vb-root.is-still')).not.toBeNull();
    });

    test('the shot uses the skin deadline: 10 s and the keeper catches it (a miss); a wrong shot is a save too', () => {
        start();
        const { container } = render(<Wired />);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        wait(9_500);
        expect(sp().misses).toBe(0);
        wait(750);
        expect(sp().misses).toBe(1);
        expect(sp().mistakes).toHaveLength(1);
        expect(sp().mistakes[0].given).toBe('');
        expect(container.querySelector('.vb-shout.is-save')!.textContent).toContain('Gevangen!');
        wait(1700);
        expect(dots(container)).toBe(0);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        wrongKey();
        expect(container.querySelector('.vb-shout.is-save')).not.toBeNull();
        expect(sp().misses).toBe(1);
        expect(container.querySelector('.vb-score')!.getAttribute('aria-label')).toBe('IJsberen 0 doelpunten');
    });

    test('help pauses the shot clock and the match clock', () => {
        start();
        render(<Wired />);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        wait(4_000);
        const left = progressOf(sp()).msLeft!;
        act(() => sp().openHelp());
        wait(60_000);
        expect(sp().misses).toBe(0);
        expect(progressOf(sp()).msLeft).toBe(left);
        act(() => sp().closeHelp());
        wait(5_500);
        expect(sp().misses).toBe(0);
        wait(1_000);
        expect(sp().misses).toBe(1);
    });

    test('half time: a whistle and "Rust!", the match clock and the keypad held for 2 s, then the second half', () => {
        start();
        const { container } = render(<Wired />);
        wait(89_000);
        expect(container.querySelector('.vb-rust')).toBeNull();
        wait(1_250);
        expect(container.querySelector('.vb-rust')!.textContent).toContain('Rust!');
        expect(container.querySelector('.vb-rust-art')).not.toBeNull();
        expect(sp().held).toBe(true);
        const left = progressOf(sp()).msLeft!;
        expect(left).toBeLessThanOrEqual(90_000);
        // The keypad waits during the break.
        rightKey();
        expect(sp().history).toHaveLength(0);
        wait(1_500);
        expect(progressOf(sp()).msLeft).toBe(left);
        wait(600);
        expect(container.querySelector('.vb-rust')).toBeNull();
        expect(sp().held).toBe(false);
        expect(container.querySelector('.vb-half')!.textContent).toBe('2e helft');
        wait(1_000);
        expect(progressOf(sp()).msLeft).toBeLessThan(left);
        rightKey();
        expect(sp().history).toHaveLength(1);
    });

    test('help during the break keeps the clock held until both are over', () => {
        start();
        render(<Wired />);
        wait(90_250);
        expect(sp().held).toBe(true);
        const left = progressOf(sp()).msLeft!;
        act(() => sp().openHelp());
        wait(3_000);
        expect(sp().held).toBe(false);
        expect(progressOf(sp()).msLeft).toBe(left);
        act(() => sp().closeHelp());
        wait(1_000);
        expect(progressOf(sp()).msLeft).toBeLessThan(left);
    });

    test('reduced motion: the break is a plain card', () => {
        start();
        const { container } = render(<Wired reducedMotion />);
        wait(90_250);
        expect(container.querySelector('.vb-rust')!.textContent).toContain('Rust!');
        expect(container.querySelector('.vb-rust-art')).toBeNull();
    });

    test('the final whistle ends the round with the goals as its lines; 5 minutes is 300 s', () => {
        start({ tijd: '5' });
        render(<Wired />);
        expect(progressOf(sp()).msTotal).toBe(300_000);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        rightKey();
        wait(310_000);
        expect(sp().phase).toBe('end');
        expect(sp().outcome).toBe('done');
        expect(sp().result).toMatchObject({ title: 'Wat een wedstrijd!', lead: 'IJsberen 1 doelpunt' });
        expect(loadBest('voetbal:test|5')).toBe(1);
    });

    test('the question cap ends the round too', () => {
        start();
        for (let i = 0; i < VOETBAL.cap; i++) {
            if (sp().phase === 'end') break;
            act(() => sp().answer(sp().question!.answer));
            act(() => sp().next());
        }
        expect(sp().phase).toBe('end');
        expect(sp().history).toHaveLength(VOETBAL.cap);
    });

    test('the ending: the cup and the team', () => {
        const { container } = render(<VoetbalEnding outcome="done" progress={progressOf(sp())} options={{}} reducedMotion={false} />);
        expect(container.querySelector('.vb-cup')).not.toBeNull();
        expect(container.querySelectorAll('.vb-bear.is-ijs')).toHaveLength(3);
    });
});
