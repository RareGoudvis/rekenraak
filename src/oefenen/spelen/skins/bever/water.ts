import type { SkinChoices } from '../types';

// The Bever's water model, in sticks (one right answer = one stick on the dam). Pure, so the tuning is testable:
// the dam holds while the water stays below its top; the water rises with play time (help pauses the clock)
// and one wave per counted mistake.

export type BeverLevel = 'normaal' | 'moeilijk';

// THE tuning table. Checked with a simulated L2 pupil (one answer every 6–8 s, 80 % right, 3 minutes,
// bever.test): Normaal holds about 96 % of rounds, Moeilijk about half (tight).
export const BEVER = {
    // The dam at the start, and the water already against it.
    dam0: 7,
    water0: 1,
    levels: {
        // rise = sticks per second of play, wave = sticks per mistake.
        normaal: { rise: 0.06, wave: 1 },
        moeilijk: { rise: 0.075, wave: 2 },
    },
    // Sticks in view before the camera zooms out (the rest of the scene is sky).
    view: 15,
} as const;

export const levelOf = (options: SkinChoices): BeverLevel => (options.niveau === 'moeilijk' ? 'moeilijk' : 'normaal');

export const damHeight = (right: number) => BEVER.dam0 + right;

export function waterLevel(level: BeverLevel, elapsedMs: number, mistakes: number): number {
    const { rise, wave } = BEVER.levels[level];
    return BEVER.water0 + rise * Math.max(0, elapsedMs) / 1000 + wave * mistakes;
}

/** Water at or over the top of the dam: it breaks. */
export const damBreaks = (water: number, dam: number) => water >= dam;

/** The camera: 1 until the dam (or the water) outgrows the view, then it zooms out to keep both in sight. */
export const beverScale = (dam: number, water: number) => Math.min(1, BEVER.view / (Math.max(dam, water) + 3));
