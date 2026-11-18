import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Honingraat's own sounds for the Wespenkoningin (Web Audio, under the shared on / off and soft master): a silly
// royal buzz, never a scary one. The wasp battles keep the shared cues (meta.sounds).

const RECIPES = {
    // She arrives: a little toy fanfare over a deep, wobbly royal buzz.
    queen: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 150, f1: 120, dur: 1.4, vol: 0.05, wobble: [24, 12] });
        [0, 0.16, 0.32].forEach((at, i) => tone(ac, d, t, { type: 'triangle', f0: [523, 659, 784][i], at, dur: 0.16, vol: 0.12 }));
        tone(ac, d, t, { type: 'triangle', f0: 1047, at: 0.5, dur: 0.55, vol: 0.12, wobble: [6, 8] });
    },
    // A right answer: a swarm of tiny zaps, one per bee.
    sting: (ac, d, t) => {
        [0, 0.07, 0.13, 0.2, 0.26].forEach((at, i) => tone(ac, d, t, { type: 'square', f0: 900 + i * 90, f1: 1500 + i * 120, at, dur: 0.07, vol: 0.035 }));
        noise(ac, d, t, { at: 0.3, dur: 0.12, vol: 0.18, filter: 'bandpass', f0: 1600, q: 1 });
    },
    // She is hit: a springy "au" that slides down.
    ouch: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 620, f1: 300, dur: 0.38, vol: 0.2, wobble: [16, 30] });
        tone(ac, d, t, { f0: 1240, f1: 600, dur: 0.18, vol: 0.05 });
    },
    // A wrong answer: she swoops down, a cork-pop as the pot comes loose, a cheeky giggle.
    grab: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.35, vol: 0.12, filter: 'bandpass', f0: 500, f1: 1800, q: 0.9 });
        tone(ac, d, t, { f0: 420, f1: 900, at: 0.32, dur: 0.08, vol: 0.18 });
        [0, 0.12, 0.24].forEach(at => tone(ac, d, t, { type: 'triangle', f0: 880, f1: 760, at: 0.5 + at, dur: 0.09, vol: 0.08 }));
    },
    // She flees: a falling cartoon whistle, then a happy two-note toot.
    fled: (ac, d, t) => {
        tone(ac, d, t, { f0: 1400, f1: 300, dur: 0.9, vol: 0.07, wobble: [8, 22] });
        tone(ac, d, t, { type: 'triangle', f0: 784, at: 1.0, dur: 0.18, vol: 0.12 });
        tone(ac, d, t, { type: 'triangle', f0: 1047, at: 1.2, dur: 0.4, vol: 0.12 });
    },
    // She flies off with the honey: a buzz that fades away and a soft "wah wah".
    robbed: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 220, f1: 330, dur: 0.9, vol: 0.05, wobble: [26, 10] });
        tone(ac, d, t, { type: 'triangle', f0: 392, f1: 370, at: 0.9, dur: 0.35, vol: 0.12 });
        tone(ac, d, t, { type: 'triangle', f0: 330, f1: 290, at: 1.3, dur: 0.6, vol: 0.12, wobble: [5, 6] });
    },
} satisfies Record<string, Recipe>;

export type HiveSound = keyof typeof RECIPES;
export const HIVE_SOUNDS = Object.keys(RECIPES) as HiveSound[];

export const playHive = (name: HiveSound) => playRecipe(RECIPES[name]);
