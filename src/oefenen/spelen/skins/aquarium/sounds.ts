import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Aquarium's own sounds (Web Audio, under the shared on / off and soft master): water, a little glass tap and a
// chatty cat. Calm and soft, never a buzzer.

const RECIPES = {
    // Something goes into the water: a soft plop with a splash of drops.
    plons: (ac, d, t) => {
        tone(ac, d, t, { f0: 520, f1: 160, dur: 0.16, vol: 0.2 });
        noise(ac, d, t, { at: 0.02, dur: 0.3, vol: 0.09, filter: 'bandpass', f0: 2400, f1: 900, q: 1.2 });
        [0.16, 0.24, 0.31].forEach((at, i) => tone(ac, d, t, { at, f0: 900 + i * 260, f1: 1400 + i * 300, dur: 0.06, vol: 0.05 }));
    },
    // A fish's nose taps the glass: two tiny bright ticks.
    tik: (ac, d, t) => {
        [0, 0.12].forEach(at => tone(ac, d, t, { at, f0: 2600, f1: 2200, dur: 0.05, vol: 0.12 }));
    },
    // The startled cat: a short "mrrp?" that goes up.
    mrrp: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 420, f1: 520, dur: 0.1, vol: 0.12, wobble: [28, 18] });
        tone(ac, d, t, { type: 'triangle', at: 0.1, f0: 560, f1: 820, dur: 0.18, vol: 0.12 });
    },
    // The paw swishes the surface: a watery swoosh.
    swish: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.32, vol: 0.13, filter: 'bandpass', f0: 600, f1: 2600, q: 1.6 });
        noise(ac, d, t, { at: 0.18, dur: 0.22, vol: 0.06, filter: 'highpass', f0: 3200 });
    },
    // A fish darts off: three little bubbles going up.
    blub: (ac, d, t) => {
        [0, 0.08, 0.15].forEach((at, i) => tone(ac, d, t, { at, f0: 300 + i * 120, f1: 700 + i * 160, dur: 0.07, vol: 0.08 }));
    },
    // The cat with its catch, out of sight: a happy "nom nom".
    nomnom: (ac, d, t) => {
        [0, 0.26].forEach(at => {
            tone(ac, d, t, { type: 'triangle', at, f0: 300, f1: 380, dur: 0.09, vol: 0.14 });
            tone(ac, d, t, { type: 'triangle', at: at + 0.1, f0: 360, f1: 260, dur: 0.12, vol: 0.12 });
        });
    },
    // The cat licks its lips on its way back: a small "mlem".
    mlem: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 640, f1: 480, dur: 0.12, vol: 0.09 });
        noise(ac, d, t, { at: 0.04, dur: 0.08, vol: 0.04, filter: 'bandpass', f0: 1800, q: 2 });
    },
    // The rare white goldfish: a glittering run up.
    glitter: (ac, d, t) => {
        [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(ac, d, t, { at: i * 0.07, f0: f, dur: 0.5, vol: 0.07 }));
        noise(ac, d, t, { at: 0.2, dur: 0.4, vol: 0.03, filter: 'highpass', f0: 6000 });
    },
} satisfies Record<string, Recipe>;

export type AquariumSound = keyof typeof RECIPES;
export const AQUARIUM_SOUNDS = Object.keys(RECIPES) as AquariumSound[];

export const playAquarium = (name: AquariumSound) => playRecipe(RECIPES[name]);
