import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Spookhuis' own sounds (Web Audio, under the shared on / off and soft master): cartoon spooky, giggly, never a scream.

const RECIPES = {
    // A friendly ghost: a soft "oe-hoe" sliding up and down with a little vibrato.
    oehoe: (ac, d, t) => {
        tone(ac, d, t, { f0: 440, f1: 620, dur: 0.35, vol: 0.12, wobble: [6, 10] });
        tone(ac, d, t, { f0: 620, f1: 400, at: 0.32, dur: 0.5, vol: 0.11, wobble: [6, 12] });
    },
    // The ghost's giggle as it turns a card back: four quick high "hi"s, falling.
    hihi: (ac, d, t) => {
        [0, 0.11, 0.22, 0.33].forEach((at, i) => tone(ac, d, t, { type: 'triangle', f0: 1100 - i * 70, f1: 900 - i * 60, at, dur: 0.08, vol: 0.1 }));
        noise(ac, d, t, { dur: 0.3, vol: 0.05, filter: 'bandpass', f0: 1800, q: 1 });
    },
    // A pumpkin pops up in a card's place: a round "plop" and a wobbly boing.
    pompoen: (ac, d, t) => {
        tone(ac, d, t, { f0: 300, f1: 160, dur: 0.14, vol: 0.22 });
        tone(ac, d, t, { type: 'triangle', f0: 180, f1: 300, at: 0.12, dur: 0.32, vol: 0.14, wobble: [12, 22] });
    },
    // A zombie's silly "breinnn": a low groan that wobbles and slides down, played for laughs.
    brein: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 150, f1: 120, dur: 0.7, vol: 0.06, wobble: [5, 8] });
        tone(ac, d, t, { type: 'triangle', f0: 300, f1: 210, dur: 0.75, vol: 0.12, wobble: [5, 14] });
    },
    // The zombie dance: a bouncy bass line, boom-chick boom-chick.
    dans: (ac, d, t) => {
        [0, 0.24, 0.48, 0.72].forEach((at, i) => {
            tone(ac, d, t, { type: 'triangle', f0: i % 2 ? 147 : 110, f1: i % 2 ? 140 : 100, at, dur: 0.14, vol: 0.22 });
            noise(ac, d, t, { at: at + 0.12, dur: 0.05, vol: 0.08, filter: 'highpass', f0: 4000 });
        });
    },
    // A brain jelly: a wet wobbly "blobbel".
    pudding: (ac, d, t) => {
        tone(ac, d, t, { f0: 260, f1: 420, dur: 0.4, vol: 0.18, wobble: [16, 60] });
        noise(ac, d, t, { dur: 0.12, vol: 0.08, filter: 'lowpass', f0: 600 });
    },
    // A ghost pirate's "Arrr!": a rolling growl.
    arrr: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 170, f1: 140, dur: 0.55, vol: 0.06, wobble: [24, 18] });
        tone(ac, d, t, { type: 'triangle', f0: 340, f1: 260, dur: 0.55, vol: 0.1, wobble: [24, 30] });
    },
    // The chest pops open and coins spill: a creak, then bright little clinks.
    munten: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 240, f1: 380, dur: 0.18, vol: 0.1 });
        [0.16, 0.24, 0.3, 0.38, 0.47, 0.55].forEach((at, i) => tone(ac, d, t, { f0: 2200 + (i % 3) * 330, at, dur: 0.09, vol: 0.07 }));
    },
    // A rusty anchor drops onto the card: a dull clank.
    anker: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 220, f1: 110, dur: 0.3, vol: 0.2 });
        tone(ac, d, t, { f0: 660, f1: 640, dur: 0.4, vol: 0.05 });
        noise(ac, d, t, { dur: 0.08, vol: 0.12, filter: 'bandpass', f0: 1400, q: 1.5 });
    },
    // The lights come on: a switch click and a warm chord.
    licht: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.03, vol: 0.2, filter: 'highpass', f0: 2500 });
        [392, 494, 587, 784].forEach((f, i) => tone(ac, d, t, { type: 'triangle', f0: f, at: 0.06 + i * 0.07, dur: 0.6, vol: 0.12 }));
    },
} satisfies Record<string, Recipe>;

export type SpookSound = keyof typeof RECIPES;
export const SPOOK_SOUNDS = Object.keys(RECIPES) as SpookSound[];

export const playSpook = (name: SpookSound) => playRecipe(RECIPES[name]);
