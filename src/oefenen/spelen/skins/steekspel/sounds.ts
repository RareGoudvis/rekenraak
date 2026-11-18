import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Steekspel's own sounds (Web Audio, under the shared on / off and soft master): hooves, a proud stamp, a bright
// "shing" for new gear, the charge, a horse's sneeze for a mistake, a wooden BONK at the tilt, a soft hay poof, a
// herald's fanfare.

const RECIPES = {
    // A right answer: the horse stamps twice and snorts, proud.
    stamp: (ac, d, t) => {
        [0, 0.16].forEach(at => {
            tone(ac, d, t, { type: 'triangle', f0: 220, f1: 90, at, dur: 0.09, vol: 0.24 });
            noise(ac, d, t, { at, dur: 0.06, vol: 0.1, filter: 'lowpass', f0: 900 });
        });
        noise(ac, d, t, { at: 0.3, dur: 0.16, vol: 0.05, filter: 'bandpass', f0: 700, f1: 400, q: 1 });
    },
    // The charge: a trumpet call over hooves that get faster.
    charge: (ac, d, t) => {
        [[392, 0, 0.1], [523, 0.12, 0.1], [659, 0.24, 0.1], [784, 0.36, 0.3]].forEach(([f0, at, dur]) => tone(ac, d, t, { type: 'square', f0, at, dur, vol: 0.03 }));
        for (let i = 0, at = 0.1; i < 12; i++, at += 0.13 - i * 0.004) {
            tone(ac, d, t, { type: 'triangle', f0: i % 2 ? 360 : 280, f1: 150, at, dur: 0.05, vol: 0.16 });
            noise(ac, d, t, { at, dur: 0.035, vol: 0.07, filter: 'bandpass', f0: 1400, q: 1.5 });
        }
    },
    // A piece of gear: a bright metal shing.
    shing: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.35, vol: 0.12, filter: 'highpass', f0: 3500 });
        tone(ac, d, t, { f0: 1320, f1: 1760, dur: 0.4, vol: 0.06 });
        tone(ac, d, t, { f0: 2640, at: 0.05, dur: 0.3, vol: 0.03 });
    },
    // A mistake: the horse sneezes (a breath in, hatsjoe) and snorts.
    sneeze: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.25, vol: 0.06, filter: 'bandpass', f0: 600, f1: 1400, q: 1 });
        noise(ac, d, t, { at: 0.3, dur: 0.2, vol: 0.28, filter: 'bandpass', f0: 2600, f1: 900, q: 0.8 });
        tone(ac, d, t, { type: 'triangle', f0: 420, f1: 220, at: 0.3, dur: 0.18, vol: 0.12 });
        noise(ac, d, t, { at: 0.55, dur: 0.22, vol: 0.1, filter: 'lowpass', f0: 500, f1: 200 });
    },
    // The tilt: the lances crash, a wooden BONK and a clang of a shield.
    bonk: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.3, vol: 0.45, filter: 'lowpass', f0: 2200, f1: 300 });
        tone(ac, d, t, { type: 'triangle', f0: 180, f1: 70, dur: 0.3, vol: 0.4 });
        tone(ac, d, t, { f0: 880, f1: 860, at: 0.02, dur: 0.5, vol: 0.06, wobble: [9, 6] });
        [0.05, 0.12, 0.2].forEach(at => noise(ac, d, t, { at, dur: 0.05, vol: 0.12, filter: 'bandpass', f0: 1800, q: 2 }));
    },
    // Into the hay: a soft poof, and a boing for the helmet.
    hay: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.45, vol: 0.3, filter: 'lowpass', f0: 900, f1: 200 });
        tone(ac, d, t, { f0: 300, f1: 640, at: 0.2, dur: 0.35, vol: 0.1, wobble: [20, 30] });
    },
    // Little birds round the fallen knight's head.
    tweet: (ac, d, t) => {
        [0, 0.18, 0.36].forEach(at => tone(ac, d, t, { f0: 2200, f1: 2900, at, dur: 0.09, vol: 0.04 }));
    },
    // The herald's fanfare for the winner: ta-ta-ta-taaa.
    fanfare: (ac, d, t) => {
        [[523, 0, 0.12], [523, 0.14, 0.12], [523, 0.28, 0.12], [659, 0.42, 0.18], [784, 0.62, 0.45]].forEach(([f0, at, dur]) => {
            tone(ac, d, t, { type: 'square', f0, at, dur, vol: 0.035 });
            tone(ac, d, t, { type: 'triangle', f0: f0 * 2, at, dur, vol: 0.03 });
        });
    },
} satisfies Record<string, Recipe>;

export type JoustSound = keyof typeof RECIPES;
export const JOUST_SOUNDS = Object.keys(RECIPES) as JoustSound[];

export const playJoust = (name: JoustSound) => playRecipe(RECIPES[name]);
