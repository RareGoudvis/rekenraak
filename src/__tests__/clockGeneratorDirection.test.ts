import { describe, test, expect } from 'vitest';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { constraintSpaceFor } from '../config/constraintSpace';
import type { ClockExercise } from '../services/clock/clockTypes';

// The klok Richting zones (F3, 2026-10-10): every generated minute (outside the fixed hele / halve
// uren and kwartieren) lies in the chosen zone; the legacy over / voor keep their :30 split.
const ZONES: Array<[string, number, number]> = [
    ['uur-over', 1, 20], ['half-voor', 21, 29], ['half-over', 31, 39], ['uur-voor', 40, 59],
    ['over', 1, 29], ['voor', 30, 59],
];

const minutesFor = (minuteDirection: string) => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 200; seed++) {
        const block = makeBlock('klok-kloklezen', { constraints: { timeTypes: ['nauwkeurig_5', 'nauwkeurig_1'], minuteDirection }, block: { numberOfExercises: 6 } });
        for (const ex of generateFor(block) as ClockExercise[]) seen.add(ex.minutes);
    }
    return [...seen];
};

describe('clock generator follows the Richting zone', () => {
    test.each(ZONES)('%s → only minutes %i-%i', (d, lo, hi) => {
        const ms = minutesFor(d);
        expect(ms.length).toBeGreaterThan(0);
        for (const m of ms) expect(m, `${d}: ${m}`).toBeGreaterThanOrEqual(lo);
        for (const m of ms) expect(m, `${d}: ${m}`).toBeLessThanOrEqual(hi);
    });
    test('beide spans the whole hour', () => {
        const ms = minutesFor('beide');
        expect(Math.min(...ms)).toBeLessThan(10);
        expect(Math.max(...ms)).toBeGreaterThan(50);
    });
    test('constraintSpace sweeps the four zones too', () => {
        expect(constraintSpaceFor('klok-kloklezen').minuteDirection).toEqual(['over', 'voor', 'beide', 'uur-over', 'half-voor', 'half-over', 'uur-voor']);
    });
});
