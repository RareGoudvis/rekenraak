import type { Level } from '../../levels/levels';

// Honingraat's boards per level, apart from hive.ts so the registry reads it without pulling in the board code.

// Makkelijk = the old Normaal (three boards, no wasp); Moeilijk and Onmogelijk play five, so their wasps come twice.
export const HIVE_BOARDS: Record<Level, number> = { makkelijk: 3, normaal: 3, moeilijk: 5, onmogelijk: 5 };
