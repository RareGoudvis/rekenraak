import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Wildwaterrace's own sounds (Web Audio, under the shared on / off and soft master): splashy strokes, a whooshing
// wave, a gurgling eddy, the roar over the falls and a big round splash, a happy horn. The noise buffer is 0.5 s.

const RECIPES = {
    // The round begins: the guide's whistle, two short toots.
    whistle: (ac, d, t) => {
        tone(ac, d, t, { f0: 1700, dur: 0.14, vol: 0.08, wobble: [40, 60] });
        tone(ac, d, t, { at: 0.2, f0: 1700, dur: 0.3, vol: 0.08, wobble: [40, 60] });
    },
    // A right answer: the paddles dig in, a splash and a little plip.
    stroke: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.24, vol: 0.26, filter: 'bandpass', f0: 1300, f1: 500, q: 0.9 });
        tone(ac, d, t, { at: 0.03, f0: 520, f1: 880, dur: 0.1, vol: 0.08 });
        noise(ac, d, t, { at: 0.16, dur: 0.18, vol: 0.12, filter: 'lowpass', f0: 900, f1: 300 });
    },
    // 3 in a row: a wave rises and the raft surfs it, a whoosh up and a "wiee".
    wave: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.5, vol: 0.26, filter: 'bandpass', f0: 400, f1: 2400, q: 0.7 });
        tone(ac, d, t, { at: 0.1, f0: 500, f1: 1100, dur: 0.4, vol: 0.08 });
        noise(ac, d, t, { at: 0.42, dur: 0.4, vol: 0.24, filter: 'lowpass', f0: 1600, f1: 300 });
    },
    // A wrong answer: the eddy turns the raft, a bubbly gurgle sliding down.
    eddy: (ac, d, t) => {
        [0, 0.09, 0.18, 0.27, 0.36].forEach((at, i) => tone(ac, d, t, { at, f0: 520 - i * 50, f1: 700 - i * 60, dur: 0.08, vol: 0.09 }));
        tone(ac, d, t, { at: 0.1, f0: 600, f1: 220, dur: 0.6, vol: 0.06, wobble: [8, 30] });
        noise(ac, d, t, { dur: 0.5, vol: 0.1, filter: 'bandpass', f0: 700, f1: 300, q: 1.4 });
    },
    // Over the falls: a roar and a cartoon drop.
    fall: (ac, d, t) => {
        [0, 0.4].forEach((at, i) => noise(ac, d, t, { at, dur: 0.5, vol: 0.2 - i * 0.06, filter: 'lowpass', f0: 1400, f1: 500 }));
        tone(ac, d, t, { f0: 900, f1: 220, dur: 0.7, vol: 0.07 });
    },
    // The raft lands in the lake: a big round splash.
    splash: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.5, vol: 0.42, filter: 'lowpass', f0: 2400, f1: 300 });
        tone(ac, d, t, { f0: 220, f1: 70, dur: 0.35, vol: 0.3 });
        noise(ac, d, t, { at: 0.2, dur: 0.45, vol: 0.14, filter: 'highpass', f0: 2600 });
    },
    // The winners cheer: a happy horn, toot-toot.
    horn: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 523, dur: 0.16, vol: 0.14 });
        tone(ac, d, t, { type: 'triangle', at: 0.2, f0: 659, dur: 0.32, vol: 0.14 });
        tone(ac, d, t, { at: 0.2, f0: 1318, dur: 0.3, vol: 0.03 });
    },
} satisfies Record<string, Recipe>;

export type WildSound = keyof typeof RECIPES;
export const WILD_SOUNDS = Object.keys(RECIPES) as WildSound[];

export const playWild = (name: WildSound) => playRecipe(RECIPES[name]);
