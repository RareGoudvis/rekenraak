import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Monstertrucks' own sounds (Web Audio, under the shared on / off and soft master): a growly but round engine, a
// friendly sputter for a wheelie, a crunch of tin for the cars, an air horn at the finish. Never a harsh buzzer.

const RECIPES = {
    // Gas: the engine revs up and settles, gravel under the tyres.
    rev: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 70, f1: 150, dur: 0.34, vol: 0.08, wobble: [26, 10] });
        tone(ac, d, t, { type: 'triangle', f0: 55, f1: 95, dur: 0.4, vol: 0.18 });
        noise(ac, d, t, { at: 0.05, dur: 0.3, vol: 0.12, filter: 'bandpass', f0: 900, f1: 400, q: 0.8 });
    },
    // The ramp jump: a big rev, a whoosh of exhaust flames up.
    boost: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 80, f1: 240, dur: 0.6, vol: 0.09, wobble: [30, 14] });
        tone(ac, d, t, { type: 'triangle', f0: 60, f1: 160, dur: 0.6, vol: 0.2 });
        noise(ac, d, t, { dur: 0.5, vol: 0.2, filter: 'bandpass', f0: 400, f1: 2400, q: 0.9 });
        tone(ac, d, t, { f0: 500, f1: 1200, at: 0.12, dur: 0.4, vol: 0.05 });
    },
    // Landing on the junk cars: a crunch of tin and a clank.
    crunch: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.35, vol: 0.4, filter: 'lowpass', f0: 1800, f1: 200 });
        tone(ac, d, t, { f0: 110, f1: 40, dur: 0.35, vol: 0.4 });
        [0.04, 0.11, 0.19].forEach((at, i) => noise(ac, d, t, { at, dur: 0.07, vol: 0.18 - i * 0.03, filter: 'bandpass', f0: 2600 - i * 500, q: 2 }));
        tone(ac, d, t, { type: 'square', f0: 620, f1: 540, at: 0.08, dur: 0.12, vol: 0.03 });
    },
    // A wheelie: the engine sputters (pop pop pop) and the nose comes down with a boing.
    wheelie: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 90, f1: 60, dur: 0.3, vol: 0.06, wobble: [12, 18] });
        [0.05, 0.2, 0.34].forEach(at => noise(ac, d, t, { at, dur: 0.06, vol: 0.2, filter: 'lowpass', f0: 700, f1: 200 }));
        tone(ac, d, t, { f0: 330, f1: 180, at: 0.55, dur: 0.3, vol: 0.12, wobble: [18, 30] });
    },
    // The air horn at the finish: two blasts.
    horn: (ac, d, t) => {
        [0, 0.38].forEach(at => {
            tone(ac, d, t, { type: 'sawtooth', f0: 311, at, dur: 0.3, vol: 0.05 });
            tone(ac, d, t, { type: 'square', f0: 392, at, dur: 0.3, vol: 0.035 });
        });
    },
    // The donut: tyres squeal round and round in the dirt.
    screech: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.5, vol: 0.12, filter: 'bandpass', f0: 1800, f1: 2400, q: 6 });
        noise(ac, d, t, { at: 0.45, dur: 0.5, vol: 0.1, filter: 'bandpass', f0: 2400, f1: 1600, q: 6 });
        tone(ac, d, t, { type: 'sawtooth', f0: 90, f1: 130, dur: 0.9, vol: 0.05, wobble: [6, 20] });
    },
    // The ramp rolls in front of a truck: a little ratchet tick-tick.
    ramp: (ac, d, t) => {
        [0, 0.07, 0.14].forEach(at => tone(ac, d, t, { type: 'triangle', f0: 900, at, dur: 0.05, vol: 0.06 }));
    },
} satisfies Record<string, Recipe>;

export type TruckSound = keyof typeof RECIPES;
export const TRUCK_SOUNDS = Object.keys(RECIPES) as TruckSound[];

export const playTruck = (name: TruckSound) => playRecipe(RECIPES[name]);
