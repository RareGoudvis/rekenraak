import { describe, it, expect } from 'vitest';
import { wrap, normalizeHours, minuteFromAngle, hourFromAngle, turnHourTo, carryHour, stepMinutes, stepHours } from '../services/clock/clockMath';

// Circular distance between two angles, the oracle every dial lookup is checked against.
const arc = (a: number, b: number) => { const d = wrap(a - b, 360); return Math.min(d, 360 - d); };
const DIAL = Array.from({ length: 72 }, (_, i) => i * 5);

describe('minuteFromAngle', () => {
    it.each([1, 5])('picks the nearest %i-minute mark at every 5° around the dial', (step) => {
        for (const a of DIAL) {
            const m = minuteFromAngle(a, step);
            expect(m % step).toBe(0);
            expect(m).toBeGreaterThanOrEqual(0);
            expect(m).toBeLessThan(60);
            const best = Math.min(...Array.from({ length: 60 / step }, (_, i) => arc(a, i * step * 6)));
            expect(arc(a, m * 6)).toBeCloseTo(best, 9);
        }
    });

    it('wraps the top of the dial and negative or over-full angles to the same minute', () => {
        expect(minuteFromAngle(359)).toBe(0);
        expect(minuteFromAngle(358, 5)).toBe(0);
        expect(minuteFromAngle(-6)).toBe(59);
        expect(minuteFromAngle(360 + 90)).toBe(15);
        expect(minuteFromAngle(180, 5)).toBe(30);
    });
});

describe('hourFromAngle', () => {
    it('picks the hour whose hand position (with the minutes) lies nearest, at every 5° for every 5 minutes', () => {
        for (let m = 0; m < 60; m += 5) {
            for (const a of DIAL) {
                const h = hourFromAngle(a, m);
                expect(h).toBeGreaterThanOrEqual(0);
                expect(h).toBeLessThan(12);
                const best = Math.min(...Array.from({ length: 12 }, (_, i) => arc(a, i * 30 + m / 2)));
                expect(arc(a, h * 30 + m / 2)).toBeCloseTo(best, 9);
            }
        }
    });

    it('reads the minute offset: at :50 the hand near the 4 still means 3 o\'clock', () => {
        // 3:50 → kleine wijzer at 90 + 25 = 115°, close to the 4 (120°).
        expect(hourFromAngle(115, 50)).toBe(3);
        expect(hourFromAngle(118, 50)).toBe(3);
        // The old round(angle / 30) would have said 4.
        expect(Math.round(118 / 30)).toBe(4);
        expect(hourFromAngle(355, 50)).toBe(11);
        expect(hourFromAngle(5, 10)).toBe(0);
    });
});

describe('carryHour', () => {
    it('carries forward when the minute hand passes 12 clockwise', () => {
        expect(carryHour(55, 0, 3)).toBe(4);
        expect(carryHour(58, 2, 11)).toBe(0);
        expect(carryHour(59, 0, 23, 24)).toBe(0);
        expect(carryHour(50, 5, 11, 24)).toBe(12);
    });

    it('carries back when the minute hand passes 12 anticlockwise', () => {
        expect(carryHour(0, 55, 4)).toBe(3);
        expect(carryHour(2, 58, 0)).toBe(11);
        expect(carryHour(0, 59, 0, 24)).toBe(23);
        expect(carryHour(5, 50, 12, 24)).toBe(11);
    });

    it('keeps the hour on any move that does not cross 12', () => {
        for (let p = 0; p < 60; p++) {
            for (let n = 0; n < 60; n++) {
                if (Math.abs(n - p) <= 30) expect(carryHour(p, n, 7)).toBe(7);
            }
        }
    });
});

describe('12 / 24-hour normalisation', () => {
    it('folds hours onto the cycle', () => {
        expect(normalizeHours(12)).toBe(0);
        expect(normalizeHours(13)).toBe(1);
        expect(normalizeHours(-1)).toBe(11);
        expect(normalizeHours(24, 24)).toBe(0);
        expect(normalizeHours(-1, 24)).toBe(23);
        expect(normalizeHours(13, 24)).toBe(13);
    });

    it('keeps the half of the day when the kleine wijzer turns without passing 12 on a 24-hour clock', () => {
        expect(turnHourTo(3, 14, 24)).toBe(15);
        expect(turnHourTo(1, 12, 24)).toBe(13);
        expect(turnHourTo(11, 9, 24)).toBe(11);
        expect(turnHourTo(4, 9, 24)).toBe(4);
        expect(turnHourTo(3, 14, 12)).toBe(3);
    });

    it('flips voormiddag / namiddag when the kleine wijzer passes 12, both ways', () => {
        expect(turnHourTo(0, 11, 24)).toBe(12);
        expect(turnHourTo(11, 12, 24)).toBe(11);
        expect(turnHourTo(0, 23, 24)).toBe(0);
        expect(turnHourTo(11, 0, 24)).toBe(23);
        expect(turnHourTo(1, 10, 24)).toBe(13);
        // A 12-hour face has no halves to flip.
        expect(turnHourTo(0, 11, 12)).toBe(0);
    });
});

describe('arrow-key steps', () => {
    it('steps the minutes by the step and carries the hour both ways', () => {
        expect(stepMinutes(3, 55, 1, 5)).toEqual({ hours: 4, minutes: 0 });
        expect(stepMinutes(4, 0, -1, 5)).toEqual({ hours: 3, minutes: 55 });
        expect(stepMinutes(11, 59, 1)).toEqual({ hours: 0, minutes: 0 });
        expect(stepMinutes(23, 59, 1, 1, 24)).toEqual({ hours: 0, minutes: 0 });
        expect(stepMinutes(0, 0, -1, 1, 24)).toEqual({ hours: 23, minutes: 59 });
        expect(stepMinutes(5, 20, 1, 5)).toEqual({ hours: 5, minutes: 25 });
    });

    it('steps the hours around the cycle without touching anything else', () => {
        expect(stepHours(11, 1)).toBe(0);
        expect(stepHours(0, -1)).toBe(11);
        expect(stepHours(23, 1, 24)).toBe(0);
        expect(stepHours(12, -1, 24)).toBe(11);
    });

    it('a full turn of minute steps advances exactly one hour', () => {
        let t = { hours: 9, minutes: 0 };
        for (let i = 0; i < 12; i++) t = stepMinutes(t.hours, t.minutes, 1, 5);
        expect(t).toEqual({ hours: 10, minutes: 0 });
        for (let i = 0; i < 60; i++) t = stepMinutes(t.hours, t.minutes, -1);
        expect(t).toEqual({ hours: 9, minutes: 0 });
    });
});
