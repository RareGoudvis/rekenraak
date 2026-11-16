import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Meteorietenregen's own sounds (Web Audio, played under the shared on / off and soft master): space action,
// big but round booms, never a harsh buzzer. The shared noise buffer is 0.5 s, so long rumbles chain pieces.

const RECIPES = {
    // The launcher fires: a thump and a rising whoosh of air.
    launch: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 140, f1: 55, dur: 0.18, vol: 0.34 });
        noise(ac, d, t, { dur: 0.45, vol: 0.22, filter: 'bandpass', f0: 300, f1: 2200, q: 0.9 });
        tone(ac, d, t, { f0: 260, f1: 980, at: 0.03, dur: 0.32, vol: 0.06 });
    },
    // A meteor comes down: the cartoon falling whistle.
    whistle: (ac, d, t) => tone(ac, d, t, { f0: 1500, f1: 420, dur: 1.15, vol: 0.06, wobble: [7, 18] }),
    // The incoming alarm: two soft beeps.
    alarm: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 880, dur: 0.11, vol: 0.12 });
        tone(ac, d, t, { type: 'triangle', f0: 660, at: 0.16, dur: 0.13, vol: 0.12 });
    },
    // A shield goes up: a warm hum that swells, and a little chime on top.
    shieldUp: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 110, f1: 220, dur: 0.6, vol: 0.14, wobble: [9, 5] });
        tone(ac, d, t, { f0: 440, f1: 880, at: 0.05, dur: 0.45, vol: 0.08 });
        tone(ac, d, t, { f0: 1320, at: 0.38, dur: 0.35, vol: 0.06 });
    },
    // A meteor bounces off a shield: a springy "bwoing" and a crackle of sparks.
    shieldBlock: (ac, d, t) => {
        tone(ac, d, t, { f0: 720, f1: 210, dur: 0.42, vol: 0.2, wobble: [28, 40] });
        noise(ac, d, t, { dur: 0.3, vol: 0.16, filter: 'highpass', f0: 2600 });
        tone(ac, d, t, { f0: 1250, f1: 1600, at: 0.02, dur: 0.16, vol: 0.06 });
        noise(ac, d, t, { at: 0.08, dur: 0.25, vol: 0.12, filter: 'lowpass', f0: 900, f1: 250 });
    },
    // An unshielded hit: a round boom with a crackle of debris.
    impact: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.5, vol: 0.5, filter: 'lowpass', f0: 1300, f1: 140 });
        tone(ac, d, t, { f0: 95, f1: 34, dur: 0.6, vol: 0.5 });
        noise(ac, d, t, { at: 0.06, dur: 0.3, vol: 0.12, filter: 'bandpass', f0: 2000, f1: 700, q: 1.1 });
        noise(ac, d, t, { at: 0.35, dur: 0.45, vol: 0.18, filter: 'lowpass', f0: 500, f1: 120 });
    },
    // The base explodes: a big boom, a long rumble and pops of debris.
    bigBoom: (ac, d, t) => {
        tone(ac, d, t, { f0: 80, f1: 26, dur: 1.4, vol: 0.6 });
        [0, 0.4, 0.8, 1.2].forEach((at, i) => noise(ac, d, t, { at, dur: 0.55, vol: 0.55 - i * 0.12, filter: 'lowpass', f0: 1500 - i * 300, f1: 90 }));
        [0.25, 0.45, 0.7, 0.95].forEach(at => noise(ac, d, t, { at, dur: 0.08, vol: 0.14, filter: 'bandpass', f0: 1600, q: 1.2 }));
    },
    // Fireworks over the winner: a whistle up and a soft pop.
    firework: (ac, d, t) => {
        tone(ac, d, t, { f0: 500, f1: 1400, dur: 0.4, vol: 0.05 });
        noise(ac, d, t, { at: 0.42, dur: 0.22, vol: 0.2, filter: 'lowpass', f0: 2400, f1: 600 });
        tone(ac, d, t, { f0: 1760, at: 0.5, dur: 0.18, vol: 0.05 });
    },
} satisfies Record<string, Recipe>;

export type MeteorSound = keyof typeof RECIPES;
export const METEOR_SOUNDS = Object.keys(RECIPES) as MeteorSound[];

export const playMeteor = (name: MeteorSound) => playRecipe(RECIPES[name]);
