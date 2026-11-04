import type { MinuteDirection } from './clockTypes';

// The four reading zones of the Flemish convention (same cut-offs as formatTimeText):
// "5 over 2" (1-20), "5 voor half 3" (21-29), "5 over half 3" (31-39), "5 voor 3" (40-59).
export type MinuteZone = 'uur-over' | 'half-voor' | 'half-over' | 'uur-voor';

const ZONE_RANGE: Record<MinuteZone, readonly [number, number]> = {
    'uur-over': [1, 20],
    'half-voor': [21, 29],
    'half-over': [31, 39],
    'uur-voor': [40, 59],
};

export const DIRECTION_CHOICES: ReadonlyArray<{ value: MinuteZone; label: string }> = [
    { value: 'uur-over', label: 'Over' },
    { value: 'half-voor', label: 'Voor half' },
    { value: 'half-over', label: 'Over half' },
    { value: 'uur-voor', label: 'Voor' },
];

const ALL_ZONES = DIRECTION_CHOICES.map((c) => c.value);

// Legacy 'over'/'voor' split at :30, so they cover two zones each; kept so saved sheets keep their meaning.
export function directionZones(d: MinuteDirection): MinuteZone[] {
    if (d === 'over') return ['uur-over', 'half-voor'];
    if (d === 'voor') return ['half-over', 'uur-voor'];
    if (d === 'beide') return [...ALL_ZONES];
    return [d];
}

// Does a minute value (1-59, not a multiple category) belong to the chosen direction?
export function directionAllows(d: MinuteDirection, minute: number): boolean {
    if (d === 'over') return minute < 30;
    if (d === 'voor') return minute >= 30;
    if (d === 'beide') return true;
    return directionZones(d).some((z) => minute >= ZONE_RANGE[z][0] && minute <= ZONE_RANGE[z][1]);
}
