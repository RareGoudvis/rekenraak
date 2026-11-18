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
    // A strop: four quick stomps under an angry grumble and a hiss of steam.
    strop: (ac, d, t) => {
        [0, 0.16, 0.32, 0.48].forEach(at => tone(ac, d, t, { f0: 120, f1: 55, at, dur: 0.11, vol: 0.2 }));
        tone(ac, d, t, { type: 'triangle', f0: 210, f1: 140, at: 0.05, dur: 0.55, vol: 0.12, wobble: [16, 22] });
        noise(ac, d, t, { at: 0.5, dur: 0.4, vol: 0.08, filter: 'highpass', f0: 3000 });
    },
    // A kid's strop: a cartoon "bwaah" that wobbles down.
    wail: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 520, f1: 330, dur: 0.7, vol: 0.13, wobble: [7, 30] });
        [0.1, 0.3].forEach(at => tone(ac, d, t, { f0: 110, f1: 60, at, dur: 0.1, vol: 0.14 }));
    },
    // The dog: two short barks.
    woef: (ac, d, t) => {
        [0, 0.2].forEach(at => {
            tone(ac, d, t, { type: 'triangle', f0: 420, f1: 230, at, dur: 0.12, vol: 0.18 });
            noise(ac, d, t, { at, dur: 0.08, vol: 0.1, filter: 'bandpass', f0: 900, q: 1.2 });
        });
    },
    // Closing time: the roller shutter rattles down, lands with a clunk, and a little "pling" of the sign.
    rolluik: (ac, d, t) => {
        [0, 0.4, 0.8].forEach((at, i) => noise(ac, d, t, { at, dur: 0.45, vol: 0.1 + i * 0.02, filter: 'bandpass', f0: 1400 - i * 250, f1: 900 - i * 200, q: 3 }));
        [0, 0.09, 0.18, 0.27, 0.36, 0.45, 0.54, 0.63, 0.72, 0.81, 0.9, 0.99].forEach(at => tone(ac, d, t, { f0: 700, f1: 520, at, dur: 0.03, vol: 0.05 }));
        tone(ac, d, t, { f0: 140, f1: 70, at: 1.05, dur: 0.18, vol: 0.22 });
        noise(ac, d, t, { at: 1.05, dur: 0.15, vol: 0.12, filter: 'lowpass', f0: 900 });
        tone(ac, d, t, { f0: 1320, at: 1.3, dur: 0.4, vol: 0.06 });
    },
} satisfies Record<string, Recipe>;

export type FrituurSound = keyof typeof RECIPES;
export const FRITUUR_SOUNDS = Object.keys(RECIPES) as FrituurSound[];

export const playFrituur = (name: FrituurSound) => playRecipe(RECIPES[name]);
