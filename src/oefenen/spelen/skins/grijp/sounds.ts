import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Grijpmachine's own sounds (Web Audio, under the shared on / off and soft master): a cheerful arcade, never a buzzer.

const RECIPES = {
    // A coin rolls into the slot: two bright clinks.
    coin: (ac, d, t) => {
        tone(ac, d, t, { f0: 2350, dur: 0.12, vol: 0.09 });
        tone(ac, d, t, { f0: 3100, at: 0.09, dur: 0.18, vol: 0.07 });
        noise(ac, d, t, { at: 0.02, dur: 0.12, vol: 0.05, filter: 'bandpass', f0: 5000, q: 3 });
    },
    // The gantry motor: a soft whirr that rises and settles (about one move long).
    whirr: (ac, d, t) => {
        [0, 0.22, 0.44].forEach((at, i) => {
            tone(ac, d, t, { type: 'sawtooth', f0: 96 + i * 8, f1: 110 + i * 8, at, dur: 0.34, vol: 0.045, wobble: [26, 6] });
            noise(ac, d, t, { at, dur: 0.3, vol: 0.04, filter: 'bandpass', f0: 760 + i * 60, q: 2.5 });
        });
    },
    // The claw goes down: a falling zip.
    drop: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 640, f1: 240, dur: 0.42, vol: 0.09 });
        noise(ac, d, t, { dur: 0.36, vol: 0.04, filter: 'bandpass', f0: 1400, f1: 500, q: 2 });
    },
    // The fingers close: a clack.
    clack: (ac, d, t) => {
        tone(ac, d, t, { type: 'square', f0: 300, f1: 180, dur: 0.06, vol: 0.06 });
        noise(ac, d, t, { dur: 0.07, vol: 0.1, filter: 'highpass', f0: 2200 });
    },
    // A squeezed plush: a squeaky "iiep!".
    squeak: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 900, f1: 1500, dur: 0.12, vol: 0.12 });
        tone(ac, d, t, { type: 'triangle', f0: 1500, f1: 1100, at: 0.11, dur: 0.14, vol: 0.1 });
    },
    // The plush slips out: a sliding "oei" going down.
    slip: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 1200, f1: 380, dur: 0.38, vol: 0.12, wobble: [9, 22] });
    },
    // It lands back on the heap: a soft double boing.
    boing: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 190, f1: 330, dur: 0.16, vol: 0.12 });
        tone(ac, d, t, { type: 'triangle', f0: 230, f1: 300, at: 0.2, dur: 0.12, vol: 0.07 });
    },
    // The near miss: a held breath ("oooh") that wobbles, then a relieved hop up.
    ooh: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 520, f1: 470, dur: 0.5, vol: 0.09, wobble: [7, 18] });
        tone(ac, d, t, { type: 'triangle', f0: 470, f1: 700, at: 0.52, dur: 0.18, vol: 0.09 });
    },
    // Into the chute: a hollow thunk.
    thunk: (ac, d, t) => {
        tone(ac, d, t, { f0: 160, f1: 70, dur: 0.18, vol: 0.18 });
        noise(ac, d, t, { dur: 0.1, vol: 0.06, filter: 'lowpass', f0: 500 });
    },
    // A prize on the shelf: a happy little jingle up.
    jingle: (ac, d, t) => {
        [784, 988, 1175, 1568].forEach((f0, i) => tone(ac, d, t, { type: 'triangle', f0, at: i * 0.07, dur: 0.2, vol: 0.09 }));
        tone(ac, d, t, { f0: 2093, at: 0.3, dur: 0.4, vol: 0.05 });
    },
    // The jackpot at the end: a fanfare over ringing bells.
    jackpot: (ac, d, t) => {
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f0, i) => tone(ac, d, t, { type: 'square', f0, at: i * 0.11, dur: 0.16, vol: 0.05 }));
        [0.8, 0.95, 1.1, 1.25].forEach((at, i) => tone(ac, d, t, { f0: 1760 + i * 220, at, dur: 0.5, vol: 0.06 }));
        tone(ac, d, t, { type: 'triangle', f0: 1047, at: 0.78, dur: 0.9, vol: 0.08 });
    },
} satisfies Record<string, Recipe>;

export type GrijpSound = keyof typeof RECIPES;
export const GRIJP_SOUNDS = Object.keys(RECIPES) as GrijpSound[];

export const playGrijp = (name: GrijpSound) => playRecipe(RECIPES[name]);
