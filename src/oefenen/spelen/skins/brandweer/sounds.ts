import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Brandweer's own sounds (Web Audio, under the shared on / off and soft master): a soft two-tone siren, water,
// a hiss of steam, a fire that puffs up, a bouncy rescue sheet and the pets. Round and friendly, never an alarm.

const RECIPES = {
    // The truck's siren: the Belgian "pin-pon", soft and short.
    sirene: (ac, d, t) => {
        [0, 0.5, 1].forEach(at => {
            tone(ac, d, t, { type: 'triangle', f0: 660, at, dur: 0.24, vol: 0.09 });
            tone(ac, d, t, { type: 'triangle', f0: 880, at: at + 0.25, dur: 0.24, vol: 0.09 });
        });
    },
    // The hose sprays: a rush of water.
    spray: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.45, vol: 0.2, filter: 'bandpass', f0: 1600, f1: 900, q: 0.7 });
        noise(ac, d, t, { at: 0.1, dur: 0.4, vol: 0.1, filter: 'highpass', f0: 3000 });
    },
    // The window goes out: a hiss of steam that fades down.
    sis: (ac, d, t) => {
        noise(ac, d, t, { at: 0.3, dur: 0.5, vol: 0.18, filter: 'highpass', f0: 4200, f1: 2200 });
        tone(ac, d, t, { f0: 520, f1: 300, at: 0.32, dur: 0.18, vol: 0.05 });
    },
    // The Superstraal (3 in a row): a big gush and a little rising chime.
    super: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.5, vol: 0.28, filter: 'bandpass', f0: 1200, f1: 700, q: 0.6 });
        [784, 988, 1318].forEach((f0, i) => tone(ac, d, t, { f0, at: 0.18 + i * 0.09, dur: 0.22, vol: 0.06 }));
    },
    // A wrong window: the hose only dribbles (three soft plops) and the flames puff up with a whoomp.
    dribble: (ac, d, t) => {
        [0, 0.12, 0.26].forEach((at, i) => tone(ac, d, t, { f0: 420 - i * 60, f1: 200, at, dur: 0.1, vol: 0.12 }));
        noise(ac, d, t, { at: 0.3, dur: 0.4, vol: 0.2, filter: 'lowpass', f0: 300, f1: 1100 });
    },
    // A pet lands in the rescue sheet: a springy boing.
    bounce: (ac, d, t) => tone(ac, d, t, { f0: 320, f1: 640, dur: 0.32, vol: 0.18, wobble: [18, 30] }),
    // The pets: a small meow, a happy woof, a squeak.
    kat: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 700, f1: 1100, dur: 0.16, vol: 0.08 });
        tone(ac, d, t, { type: 'triangle', f0: 1100, f1: 620, at: 0.15, dur: 0.28, vol: 0.08 });
    },
    hond: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 300, f1: 200, dur: 0.12, vol: 0.14 });
        tone(ac, d, t, { type: 'triangle', f0: 320, f1: 210, at: 0.18, dur: 0.12, vol: 0.14 });
    },
    konijn: (ac, d, t) => tone(ac, d, t, { f0: 1400, f1: 1900, dur: 0.1, vol: 0.06 }),
    // A building fully out: the crowd's "hooray" is the shared cheer; this is the bell on the truck.
    bel: (ac, d, t) => {
        [0, 0.22, 0.44].forEach(at => {
            tone(ac, d, t, { f0: 1568, at, dur: 0.4, vol: 0.07 });
            tone(ac, d, t, { f0: 2093, at, dur: 0.25, vol: 0.03 });
        });
    },
    // A window's clock ran out: the fire leaps to the next window with a whoosh and a crackle.
    whoosh: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.45, vol: 0.24, filter: 'bandpass', f0: 400, f1: 1800, q: 0.8 });
        noise(ac, d, t, { at: 0.3, dur: 0.25, vol: 0.1, filter: 'highpass', f0: 2800 });
    },
    // The collapse: a low rumble, a soft thud per floor, a big crash into the heap, a helmet's clonk on the rubble.
    rumble: (ac, d, t) => {
        [0, 0.4].forEach(at => noise(ac, d, t, { at, dur: 0.5, vol: 0.26, filter: 'lowpass', f0: 260, f1: 120 }));
        tone(ac, d, t, { f0: 55, f1: 45, dur: 0.9, vol: 0.2, wobble: [9, 6] });
    },
    thud: (ac, d, t) => {
        tone(ac, d, t, { f0: 110, f1: 40, dur: 0.3, vol: 0.4 });
        noise(ac, d, t, { dur: 0.35, vol: 0.28, filter: 'lowpass', f0: 700, f1: 150 });
    },
    crash: (ac, d, t) => {
        tone(ac, d, t, { f0: 80, f1: 28, dur: 1.1, vol: 0.5 });
        [0, 0.35, 0.7].forEach((at, i) => noise(ac, d, t, { at, dur: 0.5, vol: 0.45 - i * 0.12, filter: 'lowpass', f0: 1400 - i * 350, f1: 120 }));
        [0.2, 0.4, 0.6, 0.85].forEach(at => noise(ac, d, t, { at, dur: 0.07, vol: 0.12, filter: 'bandpass', f0: 1500, q: 1.3 }));
    },
    klonk: (ac, d, t) => {
        [0, 0.32, 0.52].forEach((at, i) => tone(ac, d, t, { type: 'triangle', f0: 620, f1: 480, at, dur: 0.12, vol: 0.14 - i * 0.04 }));
    },
    // The swaying block: a long wooden creak that bends down, and a little groan of the beams under it.
    kraak: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 210, f1: 150, dur: 0.7, vol: 0.06, wobble: [24, 18] });
        noise(ac, d, t, { dur: 0.6, vol: 0.06, filter: 'bandpass', f0: 520, f1: 380, q: 6 });
        tone(ac, d, t, { type: 'triangle', at: 0.55, f0: 120, f1: 90, dur: 0.4, vol: 0.08 });
    },
} satisfies Record<string, Recipe>;

export type BrandweerSound = keyof typeof RECIPES;
export const BRANDWEER_SOUNDS = Object.keys(RECIPES) as BrandweerSound[];

export const playBrandweer = (name: BrandweerSound) => playRecipe(RECIPES[name]);
