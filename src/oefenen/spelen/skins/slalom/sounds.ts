import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Skislalom's own sounds (Web Audio, on the shared soft master): snow, wind and a silly tumble, never a buzzer.

const RECIPES = {
    // A carve: skis hissing through the snow, a short sweep of filtered noise.
    carve: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.32, vol: 0.2, filter: 'bandpass', f0: 2600, f1: 1100, q: 0.7 });
        noise(ac, d, t, { at: 0.04, dur: 0.22, vol: 0.08, filter: 'highpass', f0: 4000 });
    },
    // Through the gate: a whoosh of air, the flag's flap and a bright little ting.
    gate: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.42, vol: 0.24, filter: 'bandpass', f0: 500, f1: 2400, q: 0.8 });
        noise(ac, d, t, { at: 0.12, dur: 0.06, vol: 0.14, filter: 'bandpass', f0: 900, q: 2 });
        noise(ac, d, t, { at: 0.2, dur: 0.05, vol: 0.1, filter: 'bandpass', f0: 1100, q: 2 });
        tone(ac, d, t, { f0: 1320, at: 0.08, dur: 0.22, vol: 0.07 });
        tone(ac, d, t, { f0: 1760, at: 0.16, dur: 0.26, vol: 0.06 });
    },
    // The jump: a springy hop up and a soft landing in powder.
    jump: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 300, f1: 900, dur: 0.28, vol: 0.12 });
        noise(ac, d, t, { at: 0.42, dur: 0.3, vol: 0.2, filter: 'lowpass', f0: 1800, f1: 400 });
        tone(ac, d, t, { f0: 1580, at: 0.46, dur: 0.2, vol: 0.05 });
    },
    // The tumble: a soft flump into the snow, two skis clattering and a silly falling slide whistle.
    tumble: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.35, vol: 0.45, filter: 'lowpass', f0: 900, f1: 160 });
        tone(ac, d, t, { f0: 160, f1: 70, dur: 0.25, vol: 0.3 });
        noise(ac, d, t, { at: 0.18, dur: 0.05, vol: 0.18, filter: 'bandpass', f0: 2400, q: 3 });
        noise(ac, d, t, { at: 0.3, dur: 0.05, vol: 0.14, filter: 'bandpass', f0: 1900, q: 3 });
        tone(ac, d, t, { type: 'triangle', f0: 900, f1: 260, at: 0.05, dur: 0.6, vol: 0.06, wobble: [10, 30] });
    },
    // The snowman laughs: four quick bouncy "hi"s going down.
    laugh: (ac, d, t) => {
        [0, 0.13, 0.26, 0.39].forEach((at, i) => tone(ac, d, t, { type: 'triangle', f0: 620 - i * 40, f1: 520 - i * 40, at, dur: 0.1, vol: 0.09, wobble: [30, 25] }));
    },
    // Back up: a quick pop.
    up: (ac, d, t) => tone(ac, d, t, { f0: 420, f1: 820, dur: 0.12, vol: 0.12 }),
    // A gate slipped past: a low swish and a soft "oops" going down.
    miss: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.35, vol: 0.18, filter: 'bandpass', f0: 1600, f1: 500, q: 0.8 });
        tone(ac, d, t, { type: 'triangle', f0: 520, f1: 330, at: 0.08, dur: 0.3, vol: 0.08 });
    },
    // A new record on the way: a happy little arpeggio.
    record: (ac, d, t) => {
        [660, 880, 1100, 1320].forEach((f0, i) => tone(ac, d, t, { f0, at: i * 0.08, dur: 0.22, vol: 0.07 }));
    },
    // A piece of gear flies off: a cartoon "whoops" up and down with a little whoosh.
    whoops: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 380, f1: 760, dur: 0.14, vol: 0.12 });
        tone(ac, d, t, { type: 'triangle', at: 0.14, f0: 760, f1: 300, dur: 0.24, vol: 0.12, wobble: [14, 20] });
        noise(ac, d, t, { at: 0.04, dur: 0.3, vol: 0.08, filter: 'bandpass', f0: 2400, f1: 900, q: 1 });
    },
    // Into the snowbank: a soft fat "plof", then a giggle going up and down.
    plof: (ac, d, t) => {
        tone(ac, d, t, { f0: 160, f1: 60, dur: 0.22, vol: 0.3 });
        noise(ac, d, t, { dur: 0.3, vol: 0.2, filter: 'lowpass', f0: 900, f1: 200 });
        [0.35, 0.47, 0.59, 0.71, 0.83, 0.95].forEach((at, i) => tone(ac, d, t, { type: 'triangle', at, f0: 520 + (i % 2) * 120, f1: 460 + (i % 2) * 120, dur: 0.09, vol: 0.09 }));
    },
} satisfies Record<string, Recipe>;

export type SlalomSound = keyof typeof RECIPES;
export const SLALOM_SOUNDS = Object.keys(RECIPES) as SlalomSound[];

export const playSlalom = (name: SlalomSound) => playRecipe(RECIPES[name]);
