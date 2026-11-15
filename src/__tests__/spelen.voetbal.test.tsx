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
    HOLDER, KICKOFF, PRESSER, RESTART, TURNOVER, VOETBAL, VOETBAL_BEST_KEY, beatsOf, endTitle, figPoint, halfTimeDue, isShot, loadBest, newMatch,
    otherSide, passArc, playOf, saveBest, sceneOf, scoreLine, type Beat, type Match, type Scene, type Side,
} from '../oefenen/spelen/skins/voetbal/match';
import { DEPTH, GEO as PITCH, GOAL_V, STAND, VIEW, depthFor, geoOf, goalArt, pitchLines, project, viewHeight } from '../oefenen/spelen/skins/voetbal/pitch';
import { resetKiosk } from './helpers/oefenKiosk';

// Voetbal: possession (our passes on right answers, the black bears' on wrong ones, turnovers where the ball is),
// our shot on its own clock after four passes and theirs at their shooting point, a match clock in two halves with a
// held "Rust!", the end lines the skin reports, and the scene: a 1-1-2-1 pitch where every bear has its own spot.

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

    test('possession: our passes on right answers; a wrong one gives the black bears the ball where it is', () => {
        let m = newMatch();
        m = playOf(m, true);
        m = playOf(m, true);
        expect(m).toMatchObject({ side: 'ijs', passes: 2, last: 'pass' });
        m = playOf(m, false);
        expect(m).toMatchObject({ side: 'zwart', passes: TURNOVER[2], last: 'lose', goals: 0, against: 0 });
        // While they have it, a wrong answer is their pass and a right one wins it back on the spot.
        const theirs = playOf(m, false);
        expect(theirs).toMatchObject({ side: 'zwart', passes: TURNOVER[2] + 1, last: 'zpass' });
        expect(isShot(theirs)).toBe(false);
        expect(playOf(theirs, true)).toMatchObject({ side: 'ijs', passes: TURNOVER[TURNOVER[2] + 1], last: 'win' });
        // A turnover never lands on the shooting point: one pass is always needed first.
        expect(Math.max(...TURNOVER)).toBeLessThan(VOETBAL.passes);
    });

    test('the shooting points: our fifth sum is the shot (a goal or the keeper\'s catch); their next wrong answer there goes in', () => {
        let m = newMatch();
        for (let i = 0; i < 4; i++) m = playOf(m, true);
        expect(isShot(m)).toBe(true);
        expect(playOf(m, true)).toMatchObject({ side: 'zwart', passes: RESTART, goals: 1, last: 'goal' });
        expect(playOf(m, false)).toMatchObject({ side: 'zwart', passes: 0, saves: 1, last: 'save' });
        const z: Match = { ...newMatch(), side: 'zwart', passes: VOETBAL.passes };
        expect(playOf(z, false)).toMatchObject({ side: 'ijs', passes: RESTART, against: 1, last: 'zgoal' });
        expect(playOf(z, true)).toMatchObject({ side: 'ijs', passes: TURNOVER[VOETBAL.passes], against: 0, last: 'win' });
        expect(scoreLine(3, 1)).toBe('IJsberen 3, zwarte beren 1');
        expect([endTitle(3, 1), endTitle(2, 2), endTitle(0, 1)]).toEqual(['Gewonnen!', 'Gelijkspel!', 'Wat een wedstrijd!']);
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
    const hold = (side: Side, p: number): Beat => ({ kind: 'hold', side, p, kicker: null, move: 'still' });
    const nearestTo = (s: Scene, pt: { x: number; y: number }, figs = s.figs) => [...figs].sort((a, b) => dist(a, pt) - dist(b, pt))[0];
    // Every beat of every play from every step, with either team on the ball.
    const allBeats = (): { beat: Beat; pair?: [string, string] }[] => {
        const out: { beat: Beat; pair?: [string, string] }[] = [{ beat: KICKOFF }];
        for (const side of ['ijs', 'zwart'] as const) for (let p = 0; p <= VOETBAL.passes; p++) {
            const m: Match = { ...newMatch(), side, passes: p, n: p };
            for (const correct of [true, false]) {
                for (const { beat } of beatsOf(m, playOf(m, correct))) {
                    const pair: [string, string] | undefined = beat.kind === 'steal' ? [`${beat.side}${HOLDER[beat.p]}`, `${otherSide(beat.side)}${PRESSER[beat.p]}`]
                        : beat.kind === 'five' ? [`ijs${HOLDER[VOETBAL.passes]}`, 'zwart0'] : undefined;
                    out.push({ beat, pair });
                }
            }
        }
        return out;
    };

    test('the pitch lines stay on the pitch and the goals inside the scene', () => {
        for (const g of [geoOf(DEPTH.min), PITCH, geoOf(DEPTH.max)]) {
            const { lines, stripes } = pitchLines(g);
            for (const d of [...lines, ...stripes]) {
                const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
                for (let i = 0; i < nums.length; i += 2) {
                    const [x, y] = [nums[i], nums[i + 1]];
                    const v = (y - g.far) / (g.near - g.far);
                    expect(v).toBeGreaterThanOrEqual(-0.001);
                    expect(v).toBeLessThanOrEqual(1.001);
                    expect(x).toBeGreaterThanOrEqual(project(0, v, g).x - 0.5);
                    expect(x).toBeLessThanOrEqual(project(1, v, g).x + 0.5);
                }
            }
            for (const side of [0, 1] as const) {
                const nums = Object.values(goalArt(side, g)).join(' ').match(/-?\d+(\.\d+)?/g)!.map(Number);
                for (let i = 0; i < nums.length; i += 2) {
                    expect(nums[i]).toBeGreaterThanOrEqual(0);
                    expect(nums[i]).toBeLessThanOrEqual(VIEW.w);
                    expect(nums[i + 1]).toBeGreaterThan(STAND.apron);
                    expect(nums[i + 1]).toBeLessThan(viewHeight(g));
                }
            }
        }
        // The far side is drawn smaller: perspective.
        expect(project(0.5, 0).s).toBeLessThan(project(0.5, 1).s);
    });

    test('the stand stays a strip: a tall scene gets a deeper pitch, not a taller stand', () => {
        // The scene beside the keypad at 1280 x 800, 1024 x 768 and on a phone (pixels of the world box).
        for (const [w, h] of [[852, 728], [596, 700], [390, 300], [473, 330]]) {
            const g = geoOf(depthFor(w, h));
            const units = (VIEW.w * h) / w;
            const shown = Math.max(units, viewHeight(g));
            expect(STAND.apron / shown, `${w}x${h}`).toBeLessThanOrEqual(w / h >= 1.2 ? 0.27 : 0.22);
            expect((g.near - g.far) / shown, `${w}x${h}`).toBeGreaterThan(0.5);
        }
        expect(depthFor(0, 0)).toBe(DEPTH.base);
    });

    test('kick-off: 5 against 5 in 1-1-2-1 (keeper, defender, two wide midfielders, striker) mirrored, the polar keeper has the ball', () => {
        const s = sceneOf(KICKOFF);
        expect(s.figs.filter(f => f.team === 'ijs')).toHaveLength(5);
        expect(s.figs.filter(f => f.team === 'zwart')).toHaveLength(5);
        for (let i = 0; i < 5; i++) {
            const a = fig(s, `ijs${i}`), b = fig(s, `zwart${i}`);
            expect(a.y).toBeCloseTo(b.y, 5);
            expect(a.x + b.x).toBeCloseTo(2 * project(0.5, (a.y - PITCH.far) / (PITCH.near - PITCH.far)).x, 1);
        }
        const vOf = (id: string) => (fig(s, id).y - PITCH.far) / (PITCH.near - PITCH.far);
        for (const team of ['ijs', 'zwart']) {
            for (const central of [0, 1, 4]) expect(Math.abs(vOf(`${team}${central}`) - 0.5)).toBeLessThan(0.05);
            expect(vOf(`${team}2`)).toBeLessThan(0.3);
            expect(vOf(`${team}3`)).toBeGreaterThan(0.7);
        }
        const keeper = fig(s, 'ijs0');
        expect(keeper.x).toBeLessThan(project(0.1, 0.5).x);
        expect(fig(s, 'zwart0').x).toBeGreaterThan(project(0.9, 0.5).x);
        expect(s.figs.filter(f => f.gloves).map(f => f.id).sort()).toEqual(['ijs0', 'zwart0']);
        expect(dist(s.ball, keeper)).toBeLessThan(20);
    });

    test('no clumps: in every beat each bear has its own spot on the pitch (the steal and the high five meet on purpose)', () => {
        for (const g of [geoOf(DEPTH.min), PITCH, geoOf(DEPTH.max)]) for (const { beat, pair } of allBeats()) {
            const s = sceneOf(beat, g);
            for (const f of s.figs) {
                expect(f.x, `${f.id} in ${JSON.stringify(beat)}`).toBeGreaterThan(8);
                expect(f.x).toBeLessThan(VIEW.w - 8);
                expect(f.y).toBeGreaterThanOrEqual(g.far);
                expect(f.y).toBeLessThanOrEqual(g.near);
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
            expect(steps[0].beat).toMatchObject({ kind: 'hold', side: 'ijs', p: p + 1, kicker: HOLDER[p] });
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

    test('the black bears pass the same chain the other way on wrong answers', () => {
        for (let q = 0; q < VOETBAL.passes; q++) {
            const m: Match = { ...newMatch(), side: 'zwart', passes: q };
            const steps = beatsOf(m, playOf(m, false));
            expect(steps[0].beat).toMatchObject({ kind: 'hold', side: 'zwart', p: q + 1, kicker: HOLDER[q] });
            const before = sceneOf(hold('zwart', q)), s = sceneOf(steps[0].beat);
            expect(s.ball.x).toBeLessThan(before.ball.x);
            expect(nearestTo(s, s.ball).id).toBe(`zwart${HOLDER[q + 1]}`);
            expect(fig(s, `zwart${HOLDER[q]}`).pose).toBe('kick');
        }
    });

    test('turnovers: the nearest defender takes the ball where it is ("Oeps!" / "Hebbes!"), then his team plays on', () => {
        for (const side of ['ijs', 'zwart'] as const) for (let p = 0; p <= VOETBAL.passes - (side === 'ijs' ? 1 : 0); p++) {
            const def = otherSide(side);
            const at = sceneOf(hold(side, p));
            const holder = fig(at, `${side}${HOLDER[p]}`);
            const outfield = at.figs.filter(f => f.team === def && f.slot > 0);
            expect(nearestTo(at, holder, outfield).slot, `presser at ${side} ${p}`).toBe(PRESSER[p]);
            const m: Match = { ...newMatch(), side, passes: p };
            const [steal, on] = beatsOf(m, playOf(m, side === 'zwart'));
            const s = sceneOf(steal.beat);
            const taker = fig(s, `${def}${PRESSER[p]}`);
            expect(taker.pose).toBe('kick');
            expect(dist(taker, s.ball)).toBeLessThan(dist(fig(s, `${side}${HOLDER[p]}`), taker) + 1);
            expect(s.bubble?.text).toBe(def === 'zwart' ? 'Oeps!' : 'Hebbes!');
            expect(on).toMatchObject({ at: VOETBAL.tapMs, beat: { kind: 'hold', side: def, p: TURNOVER[p] } });
            const r = sceneOf(on.beat);
            expect(nearestTo(r, r.ball).id).toBe(`${def}${HOLDER[TURNOVER[p]]}`);
            // Where it is: the ball carries on from about the same part of the pitch.
            expect(Math.abs(r.ball.x - at.ball.x), `${side} ${p}`).toBeLessThan(110);
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
            expect(inNet).toMatchObject({ crowd: 'goal', bulge: 1 });
            expect(inNet.figs.filter(f => f.team === 'ijs' && f.slot > 0).every(f => f.jump && f.pose === 'cheer')).toBe(true);
            expect(dist(fig(inNet, 'zwart0'), inNet.ball)).toBeGreaterThan(14);
            // The black bears restart from midfield.
            expect(goal[2]).toMatchObject({ at: VOETBAL.kickoffMs, beat: { kind: 'hold', side: 'zwart', p: RESTART, move: 'reset' } });

            const save = beatsOf(m, playOf(m, false));
            expect(save.map(s => s.beat.kind)).toEqual(['shot', 'save', 'five', 'hold']);
            const caught = sceneOf(save[0].beat);
            const k = fig(caught, 'zwart0');
            const gloves = figPoint(k, 0, -76);
            expect(dist({ x: caught.ball.x, y: caught.ball.y - caught.ball.lift }, gloves)).toBeLessThan(3);
            const five = sceneOf(save[2].beat);
            expect(five.star).not.toBeNull();
            expect(dist(fig(five, `ijs${HOLDER[VOETBAL.passes]}`), fig(five, 'zwart0'))).toBeLessThan(40);
            // Then their keeper plays the ball out.
            const out = sceneOf(save[3].beat);
            expect(save[3].beat).toMatchObject({ kind: 'hold', side: 'zwart', p: 0 });
            expect(nearestTo(out, out.ball).id).toBe('zwart0');
        }
    });

    test('their shot: from their shooting point a wrong answer flies past our diving keeper into our net', () => {
        const line = (v: number) => project(0, v);
        for (const n of [4, 5]) {
            const m: Match = { ...newMatch(), side: 'zwart', passes: VOETBAL.passes, n };
            const steps = beatsOf(m, playOf(m, false));
            expect(steps.map(s => s.beat.kind)).toEqual(['shot', 'goal', 'hold']);
            const flying = sceneOf(steps[0].beat);
            expect(fig(flying, `zwart${HOLDER[VOETBAL.passes]}`).pose).toBe('kick');
            expect(fig(flying, 'ijs0').pose).toBe('dive');
            const inNet = sceneOf(steps[1].beat);
            const v = (inNet.ball.y - PITCH.far) / (PITCH.near - PITCH.far);
            expect(v).toBeGreaterThan(GOAL_V);
            expect(v).toBeLessThan(1 - GOAL_V);
            expect(inNet.ball.x).toBeLessThan(line(v).x);
            expect(inNet).toMatchObject({ crowd: 'goal', bulge: 0 });
            expect(inNet.figs.filter(f => f.team === 'zwart' && f.slot > 0).every(f => f.jump)).toBe(true);
            expect(steps[2].beat).toMatchObject({ kind: 'hold', side: 'ijs', p: RESTART, move: 'reset' });
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

    test('passes on right answers; a wrong one hands the black bears the ball, a right one wins it back; the shot shows its ring', () => {
        start();
        const { container } = render(<Wired />);
        expect(sp().result).toMatchObject({ title: 'Gelijkspel!', lead: 'IJsberen 0, zwarte beren 0' });
        rightKey(); wait(800);
        rightKey(); wait(800);
        expect(dots(container)).toBe(2);
        wrongKey();
        expect(container.querySelector('.vb-bubble')!.textContent).toBe('Oeps!');
        expect(container.querySelector('.vb-tag.is-on')!.textContent).toBe('Pak de bal terug!');
        expect(container.querySelector('.vb-dots.is-zwart')).not.toBeNull();
        expect(dots(container)).toBe(TURNOVER[2]);
        wait(1700);
        expect(container.querySelector('.vb-bubble')).toBeNull();
        expect(sp().mistakes).toHaveLength(1);
        rightKey();
        expect(container.querySelector('.vb-bubble')!.textContent).toBe('Hebbes!');
        expect(container.querySelector('.vb-dots.is-zwart')).toBeNull();
        wait(800);
        expect(dots(container)).toBe(TURNOVER[TURNOVER[2]]);
        for (let i = TURNOVER[TURNOVER[2]]; i < VOETBAL.passes; i++) { expect(container.querySelector('.vb-ring')).toBeNull(); rightKey(); wait(800); }
        expect(dots(container)).toBe(4);
        expect(container.querySelector('.vb-ring')).not.toBeNull();
        expect(container.querySelector('.vb-tag.is-on')!.textContent).toBe('Schiet op doel!');
    });

    test('the black bears can score: their passes on wrong answers, then their shot goes in', () => {
        start();
        const { container } = render(<Wired />);
        wrongKey(); wait(1700);
        while (sp().question && dots(container) < VOETBAL.passes) { wrongKey(); wait(1700); }
        expect(container.querySelector('.vb-dots.is-zwart')).not.toBeNull();
        expect(container.querySelector('.vb-ring')).toBeNull();
        wrongKey();
        expect(container.querySelector('.vb-shout.is-against')!.textContent).toBe('Goal zwarte beren!');
        expect(container.querySelector('.vb-score')!.getAttribute('aria-label')).toBe('IJsberen 0, zwarte beren 1');
        expect(sp().result).toMatchObject({ title: 'Wat een wedstrijd!', lead: 'IJsberen 0, zwarte beren 1' });
        expect([...container.querySelectorAll('.vb-board-num')].map(t => t.textContent)).toEqual(['0', ':', '1']);
        wait(VOETBAL.flightMs);
        expect(container.querySelector('.vb-goal-net.is-bulge.is-left')).not.toBeNull();
        // We restart from midfield.
        wait(VOETBAL.kickoffMs);
        expect(container.querySelector('.vb-dots.is-zwart')).toBeNull();
        expect(dots(container)).toBe(RESTART);
    });

    test('a shot in time is a goal; the score and the end lines go up', () => {
        start();
        const { container } = render(<Wired />);
        for (let i = 0; i < 4; i++) { rightKey(); wait(800); }
        wait(5_000);
        rightKey();
        expect(container.querySelector('.vb-shout.is-goal')!.textContent).toBe('GOAL!');
        expect(container.querySelector('.vb-score')!.getAttribute('aria-label')).toBe('IJsberen 1, zwarte beren 0');
        expect(sp().result).toMatchObject({ title: 'Gewonnen!', lead: 'IJsberen 1, zwarte beren 0', detail: 'Nieuw record!' });
        expect(container.querySelector('.vb-board-num')!.textContent).toBe('1');
        wait(VOETBAL.flightMs);
        // The ball is in the net: the stand cheers, the net puffs out, the polar bears jump.
        expect(container.querySelector('.vb-stand.is-goal')).not.toBeNull();
        expect(container.querySelector('.vb-goal-net.is-bulge')).not.toBeNull();
        expect(container.querySelectorAll('.vb-fig.is-jump')).toHaveLength(4);
        wait(800);
        expect(container.querySelector('.vb-dots.is-zwart')).not.toBeNull();
        expect(container.querySelector('.vb-ring')).toBeNull();
        // The restart: the black bears kick off from midfield.
        wait(VOETBAL.kickoffMs);
        expect(container.querySelector('.vb-stand.is-goal')).toBeNull();
        expect(container.querySelectorAll('.vb-fig.is-jump')).toHaveLength(0);
        expect(container.querySelector('.vb-ball-move.is-reset')).not.toBeNull();
    });

    test('the scene shows no numbers of its own: only the score and the half on the scoreboard', () => {
        start();
        const { container } = render(<Wired />);
        const texts = [...container.querySelectorAll('.vb-svg text')].map(t => t.textContent);
        expect(texts).toEqual(['0', ':', '0', '1e helft']);
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
        // Their keeper has the ball; a right answer wins it back high up the pitch, one pass more is the shot.
        expect(container.querySelector('.vb-dots.is-zwart')).not.toBeNull();
        rightKey(); wait(800);
        while (dots(container) < VOETBAL.passes) { rightKey(); wait(800); }
        wrongKey();
        expect(container.querySelector('.vb-shout.is-save')).not.toBeNull();
        expect(sp().misses).toBe(1);
        expect(container.querySelector('.vb-score')!.getAttribute('aria-label')).toBe('IJsberen 0, zwarte beren 0');
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
        expect(sp().result).toMatchObject({ title: 'Gewonnen!', lead: 'IJsberen 1, zwarte beren 0' });
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
