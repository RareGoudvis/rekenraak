import { describe, test, expect } from 'vitest';
import { freshSideView } from '../oefenen/spelen/duel/rules';
import type { DuelConfig, DuelCtx, DuelRoundView } from '../oefenen/spelen/duel/types';
import { COURSE, courseKind, courseOver, courseRule, freshLane, isWaiting, noseOf, obstacleIndexOf, progressOf, rushMsOf, stepLane, sumIndexOf, type Lane, type LaneInput } from '../oefenen/spelen/course/course';

// The obstacle course the three duel races share (course/course.ts): the varied course, the rule (a clear +1, a
// crash nothing, the first through the course wins) and the lane's motion (the obstacle arrives with the clock,
// Makkelijk waits in front of it, an answer rushes in, a crash stops, a clear boosts).

const cfg = (lives = 20): DuelConfig => ({ players: 2, level: 'normaal', lives, bestOf: 3, stream: 'own' });
const ctx = (over: Partial<DuelCtx> = {}): DuelCtx => ({ side: 'left', other: 'right', me: freshSideView(20), them: freshSideView(20), streak: 1, level: 'normaal', round: 1, config: cfg(), ...over });
const view = (l: number, r: number, n = 20): DuelRoundView => ({ sides: { left: { ...freshSideView(n), points: l }, right: { ...freshSideView(n), points: r } }, config: cfg(n) });

const input = (over: Partial<LaneInput> = {}): LaneInput => ({ key: '1:0', open: true, correct: false, leftMs: 12_000, spawn: 900, nose: 240, ...over });
/** Steps a lane for ms in frames of 16 ms, the input changing with the time left. */
function run(lane: Lane, ms: number, make: (t: number) => LaneInput) {
    const events: ReturnType<typeof stepLane>['events'] = [];
    for (let t = 0; t < ms; t += 16) { const r = stepLane(lane, make(t), 16); lane = r.lane; events.push(...r.events); }
    return { lane, events };
}

describe('the course', () => {
    const KINDS = ['a', 'b', 'c', 'd', 'e', 'f'] as const;
    test('varied: every kind once per block, never the same twice in a row, the same for both lanes, new every round', () => {
        const seq = (round: number) => Array.from({ length: 60 }, (_, i) => courseKind(KINDS, round, i));
        for (const round of [1, 2, 3, 4, 5]) {
            const s = seq(round);
            for (let b = 0; b < 10; b++) expect(new Set(s.slice(b * 6, b * 6 + 6)).size, `round ${round} block ${b}`).toBe(6);
            for (let i = 1; i < s.length; i++) expect(s[i], `round ${round} at ${i}`).not.toBe(s[i - 1]);
            expect(seq(round)).toEqual(s);
        }
        expect(seq(1)).not.toEqual(seq(2));
        expect(courseKind(['x'], 3, 9)).toBe('x');
    });

    test('the index of the sum on screen: one per sum posed, the answered one while its flash shows', () => {
        expect(obstacleIndexOf({ right: 3, wrong: 2 })).toBe(5);
        expect(sumIndexOf({ right: 3, wrong: 2, question: {}, feedback: null })).toBe(5);
        expect(sumIndexOf({ right: 3, wrong: 2, question: {}, feedback: {} })).toBe(4);
        expect(sumIndexOf({ right: 0, wrong: 0, question: null, feedback: null })).toBeNull();
    });

    test('the front moves across its share of the band with the race; progress stays 0..1', () => {
        expect(noseOf(0, 20, 1000)).toBe(Math.round(1000 * COURSE.travel[0]));
        expect(noseOf(20, 20, 1000)).toBe(Math.round(1000 * COURSE.travel[1]));
        expect(noseOf(30, 20, 1000)).toBe(noseOf(20, 20, 1000));
        expect(progressOf(-1, 20)).toBe(0);
        expect(progressOf(10, 20)).toBe(0.5);
    });
});

describe('the rule', () => {
    const rule = courseRule();
    test('a clear is +1; a wrong answer and a time-out are a crash without a point; the first through the course wins', () => {
        expect(rule.right!(ctx())).toEqual({ points: { left: 1 }, tag: 'clear' });
        expect(rule.wrong!(ctx())).toEqual({ tag: 'crash' });
        expect(rule.timeout!(ctx())).toEqual({ tag: 'crash' });
        expect(rule.roundOver!(view(19, 18), false)).toBeNull();
        expect(rule.roundOver!(view(20, 18), false)).toBe('left');
        expect(rule.roundOver!(view(3, 10, 10), true)).toBe('right');
        expect(courseOver(view(20, 20))).toBe('draw');
        expect(rule.cardMs).toBe(COURSE.cardMs);
    });

    test('a game adds to the clear and swaps the crash (Drakenrace\'s storm)', () => {
        const storm = courseRule({ right: ({ other }) => ({ flags: { [other]: { storm: 4 } }, tag: 'storm' }), crash: ({ side }) => ({ points: { [side]: -1 }, tag: 'bump' }), cardMs: 10 });
        expect(storm.right!(ctx())).toEqual({ flags: { right: { storm: 4 } }, points: { left: 1 }, tag: 'storm' });
        expect(storm.wrong!(ctx())).toEqual({ points: { left: -1 }, tag: 'bump' });
        expect(storm.cardMs).toBe(10);
    });
});

describe('the lane', () => {
    test('a new sum: its obstacle appears past the edge and, on the clock, reaches the vehicle as the time runs out', () => {
        const first = stepLane(freshLane(240), input(), 16);
        expect(first.events).toEqual([{ kind: 'spawn', key: '1:0', at: 900 }]);
        const { lane, events } = run(first.lane, 12_000, t => input({ leftMs: 12_000 - 16 - t }));
        expect(events.some(e => e.kind === 'contact')).toBe(false);
        // Arrived (just before its near edge), never through it.
        expect(lane.at! - lane.dist).toBeCloseTo(COURSE.contactGap, 0);
        // Half way at half time: the obstacle comes on steadily.
        const half = run(first.lane, 6_000, t => input({ leftMs: 12_000 - 16 - t })).lane;
        expect(half.dist).toBeGreaterThan(400);
        expect(half.dist).toBeLessThan(500);
    });

    test('Makkelijk: no clock, the vehicle slows down and waits in front of the obstacle', () => {
        const first = stepLane(freshLane(240), input({ leftMs: null }), 16).lane;
        const { lane } = run(first, 15_000, () => input({ leftMs: null }));
        expect(lane.at! - lane.dist).toBeGreaterThan(COURSE.waitGap);
        expect(lane.at! - lane.dist).toBeLessThan(COURSE.waitGap + 40);
        expect(isWaiting(lane)).toBe(true);
        // Waiting long changes nothing: no crash for being slow.
        expect(run(lane, 20_000, () => input({ leftMs: null })).events).toEqual([]);
    });

    test('a right answer rushes in and clears with a boost; a wrong one rushes in, crashes and stops, then drives on', () => {
        const first = stepLane(freshLane(240), input(), 16).lane;
        const going = run(first, 3_000, t => input({ leftMs: 12_000 - 16 - t })).lane;
        const left = going.at! - COURSE.contactGap - going.dist;
        expect(rushMsOf(left)).toBe(COURSE.rushMs);
        const clear = run(going, COURSE.rushMs + 32, () => input({ open: false, correct: true, leftMs: null }));
        expect(clear.events).toEqual([{ kind: 'contact', key: '1:0', outcome: 'clear' }]);
        expect(clear.lane.speed).toBeGreaterThan(COURSE.cruise);
        // After the clear it drives on past the obstacle and eases back to cruising.
        const on = run(clear.lane, 2_000, () => input({ open: false, correct: true, leftMs: null }));
        expect(on.lane.dist).toBeGreaterThan(going.at!);
        expect(on.lane.speed).toBeLessThan(COURSE.boost);

        const crash = run(going, COURSE.rushMs + 32, () => input({ open: false, correct: false, leftMs: null }));
        expect(crash.events).toEqual([{ kind: 'contact', key: '1:0', outcome: 'crash' }]);
        expect(crash.lane).toMatchObject({ speed: 0, stop: expect.any(Number) });
        const stopped = run(crash.lane, COURSE.stopMs - 100, () => input({ open: false, leftMs: null }));
        expect(stopped.lane.dist).toBeCloseTo(crash.lane.dist, 5);
        const back = run(stopped.lane, 1_000, () => input({ open: false, leftMs: null }));
        expect(back.events).toEqual([{ kind: 'go' }]);
        expect(back.lane.dist).toBeGreaterThan(stopped.lane.dist);
    });

    test('a time-out (the obstacle already there) is a short rush; the next sum brings the next obstacle', () => {
        const first = stepLane(freshLane(240), input(), 16).lane;
        const there = run(first, 12_000, t => input({ leftMs: 12_000 - 16 - t })).lane;
        expect(rushMsOf(there.at! - COURSE.contactGap - there.dist)).toBe(COURSE.rushMinMs);
        const crash = run(there, COURSE.rushMinMs + 32, () => input({ open: false, leftMs: 0 }));
        expect(crash.events.map(e => e.kind)).toEqual(['contact']);
        const next = stepLane(crash.lane, input({ key: '1:1' }), 16);
        expect(next.events).toEqual([{ kind: 'spawn', key: '1:1', at: crash.lane.dist + 900 }]);
    });

    test('paused (dt 0) nothing moves; a halt rolls to a stop', () => {
        const going = run(stepLane(freshLane(240), input(), 16).lane, 2_000, t => input({ leftMs: 12_000 - t })).lane;
        expect(stepLane(going, input({ leftMs: 10_000 }), 0).lane.dist).toBe(going.dist);
        const halted = run(going, 4_000, () => input({ halt: true, leftMs: 8_000 })).lane;
        expect(halted.speed).toBeLessThan(1);
    });
});
