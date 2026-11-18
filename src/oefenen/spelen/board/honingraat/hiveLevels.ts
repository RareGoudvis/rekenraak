import type { Level } from '../../levels/levels';

// Honingraat's boards per level, apart from hive.ts so the registry reads it without pulling in the board code.

// Makkelijk = the old Normaal (three boards, no wasp); Moeilijk and Onmogelijk play five, so their wasps come twice.
export const HIVE_BOARDS: Record<Level, number> = { makkelijk: 3, normaal: 3, moeilijk: 5, onmogelijk: 5 };

// The Wespenkoningin after the last board (owner 2026-11-18), Moeilijk and Onmogelijk only; the rules are boss.ts.
export const BOSS = {
    // Her health bar: this many right answers and she flees (Onmogelijk a longer fight).
    hits: { moeilijk: 6, onmogelijk: 8 },
    // Honey pots on the shelf: each wrong answer she grabs one, the last one taken and she has won.
    pots: { moeilijk: 3, onmogelijk: 2 },
    // How long each moment shows: her entrance, a hit (the swarm, her wobble), a grab, and the two endings.
    ms: { intro: 2600, hit: 1000, grab: 1600, fled: 3400, robbed: 3000 },
} as const;

export type BossLevel = keyof typeof BOSS.hits;
export const hasBoss = (level: Level): level is BossLevel => level in BOSS.hits;
