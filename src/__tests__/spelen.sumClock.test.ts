import { describe, test, expect } from 'vitest';
import { CLOCK } from '../oefenen/spelen/levels/clock';
import { SUM_CLOCK_URGENT_MS, sumClockLeft, sumClockStart, sumClockStep, sumClockUrgent, type SumClock } from '../oefenen/spelen/levels/sumClock';

// The clock per sum for games without a clock of their own (levels/sumClock.ts): each sum gets the clock rule's
// time for the play so far, it only runs while the sum waits, and it runs out once.

describe('the clock per sum (pure)', () => {
    const run = (c: SumClock, ms: number, level: Parameters<typeof sumClockStep>[2], key: string, live = true) => {
        let s = c;
        let ups = 0;
        for (let t = 0; t < ms; t += 100) {
            const r = sumClockStep(s, 100, level, key, live);
            s = r.clock;
            if (r.timeUp) ups++;
        }
        return { s, ups };
    };

    test('each sum gets the clock rule\'s time for the play so far; it runs out once; Makkelijk never', () => {
        const a = run(sumClockStart(), 11_900, 'normaal', 'a');
        expect(a.s.limitMs).toBe(CLOCK.startMs);
        expect(a.ups).toBe(0);
        const b = run(a.s, 5_000, 'normaal', 'a');
        expect(b.ups).toBe(1);
        expect(b.s.out).toBe(true);
        expect(sumClockLeft(b.s)).toBe(0);
        // A minute of play later the next sum gets 11 s (Normaal), 11 s too on Onmogelijk, and nothing on Makkelijk.
        const later = { ...sumClockStart(), playedMs: 61_000 };
        expect(sumClockStep(later, 0, 'normaal', 'x', true).clock.limitMs).toBe(11_000);
        expect(sumClockStep({ ...later, playedMs: 91_000 }, 0, 'onmogelijk', 'x', true).clock.limitMs).toBe(10_000);
        const easy = run(sumClockStart(), 120_000, 'makkelijk', 'a');
        expect(easy.s.limitMs).toBeNull();
        expect(easy.ups).toBe(0);
        expect(sumClockLeft(easy.s)).toBe(1);
    });

    test('help, a flash or a dive holds it (live false); the play time holds too', () => {
        const held = run(sumClockStart(), 60_000, 'moeilijk', 'a', false);
        expect(held.s.waitedMs).toBe(0);
        expect(held.s.playedMs).toBe(0);
        expect(held.ups).toBe(0);
        const half = run(sumClockStart(), 6_000, 'moeilijk', 'a');
        expect(sumClockLeft(half.s)).toBeCloseTo(0.5);
        expect(sumClockUrgent(half.s)).toBe(false);
        const late = run(half.s, CLOCK.startMs - 6_000 - SUM_CLOCK_URGENT_MS + 100, 'moeilijk', 'a');
        expect(sumClockUrgent(late.s)).toBe(true);
        // A new sum starts its own wait.
        const next = sumClockStep(late.s, 100, 'moeilijk', 'b', true).clock;
        expect(next.waitedMs).toBe(100);
        expect(next.out).toBe(false);
    });
});
