import { describe, expect, it } from 'vitest';
import { directionAllows, directionZones, DIRECTION_CHOICES } from '../services/clock/minuteDirection';
import type { MinuteDirection } from '../services/clock/clockTypes';

const minutesOf = (d: MinuteDirection) => Array.from({ length: 59 }, (_, i) => i + 1).filter((m) => directionAllows(d, m));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('clock Richting: four zones of the Flemish reading convention', () => {
    it('offers over / voor half / over half / voor, in that order', () => {
        expect(DIRECTION_CHOICES.map((c) => c.value)).toEqual(['uur-over', 'half-voor', 'half-over', 'uur-voor']);
        expect(DIRECTION_CHOICES.map((c) => c.label)).toEqual(['Over', 'Voor half', 'Over half', 'Voor']);
    });
    it('maps each choice to its minute range (matches formatTimeText: 1-20 / 21-29 / 31-39 / 40-59)', () => {
        expect(minutesOf('uur-over')).toEqual(range(1, 20));
        expect(minutesOf('half-voor')).toEqual(range(21, 29));
        expect(minutesOf('half-over')).toEqual(range(31, 39));
        expect(minutesOf('uur-voor')).toEqual(range(40, 59));
    });
    it('keeps the legacy values: over = before :30, voor = from :30, beide = all', () => {
        expect(minutesOf('over')).toEqual(range(1, 29));
        expect(minutesOf('voor')).toEqual(range(30, 59));
        expect(minutesOf('beide')).toEqual(range(1, 59));
    });
    it('a legacy value highlights every new choice it covers', () => {
        expect(directionZones('over')).toEqual(['uur-over', 'half-voor']);
        expect(directionZones('voor')).toEqual(['half-over', 'uur-voor']);
        expect(directionZones('beide')).toEqual(['uur-over', 'half-voor', 'half-over', 'uur-voor']);
        expect(directionZones('half-over')).toEqual(['half-over']);
    });
});
