import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Frituur's own sounds (Web Audio, under the shared on / off and soft master): a busy, cheerful snack bar, never a
// buzzer. The shared noise buffer is 0.5 s, so the sizzle chains pieces.

const RECIPES = {
    // The basket goes into the hot oil: a crackling sizzle that settles.
    sizzle: (ac, d, t) => {
        [0, 0.32].forEach((at, i) => noise(ac, d, t, { at, dur: 0.5, vol: 0.2 - i * 0.07, filter: 'highpass', f0: 3200 - i * 600 }));
        noise(ac, d, t, { dur: 0.4, vol: 0.08, filter: 'bandpass', f0: 1800, f1: 900, q: 1.4 });
    },
    // The bell on the counter: one bright ding with a ring.
    ding: (ac, d, t) => {
        tone(ac, d, t, { f0: 1760, dur: 0.9, vol: 0.14 });
        tone(ac, d, t, { f0: 2637, dur: 0.6, vol: 0.06 });
        tone(ac, d, t, { type: 'triangle', f0: 880, dur: 0.25, vol: 0.05 });
    },
    // A happy customer: "mmm!", up and down.
    yum: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 330, f1: 520, dur: 0.18, vol: 0.16 });
        tone(ac, d, t, { type: 'triangle', f0: 520, f1: 390, at: 0.16, dur: 0.24, vol: 0.14 });
    },
    // The wrong order: a puzzled "huh?" that goes up.
    huh: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 260, f1: 240, dur: 0.12, vol: 0.16 });
        tone(ac, d, t, { type: 'triangle', f0: 240, f1: 420, at: 0.13, dur: 0.22, vol: 0.16 });
    },
    // Walking off without food: a grumbly "hmpf" and two stomps.
    grumble: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 190, f1: 120, dur: 0.38, vol: 0.18, wobble: [11, 14] });
        noise(ac, d, t, { dur: 0.12, vol: 0.12, filter: 'lowpass', f0: 600 });
        [0.45, 0.75].forEach(at => tone(ac, d, t, { f0: 110, f1: 60, at, dur: 0.1, vol: 0.18 }));
    },
} satisfies Record<string, Recipe>;

export type FrituurSound = keyof typeof RECIPES;
export const FRITUUR_SOUNDS = Object.keys(RECIPES) as FrituurSound[];

export const playFrituur = (name: FrituurSound) => playRecipe(RECIPES[name]);
