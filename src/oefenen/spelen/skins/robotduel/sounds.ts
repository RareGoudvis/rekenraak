import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Robotduel's own sounds (DUEL.md "Sounds"): short Web Audio recipes on the shared soft master. Cartoon metal,
// never harsh: low thuds, a ringing clang, servo whirrs, a laser pew, a rocket, a soft boom, a crowd.
// The shared noise buffer is 0.5 s, so longer noise is laid down in overlapping pieces.

const RD = {
    // A punch winds up: a quick servo whirr going up.
    whirr: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 180, f1: 520, dur: 0.2, vol: 0.06 });
        tone(ac, d, t, { type: 'square', f0: 90, f1: 260, dur: 0.18, vol: 0.03 });
    },
    // The fist lands: a low thud and a short metal clang over it.
    punch: (ac, d, t) => {
        tone(ac, d, t, { f0: 150, f1: 48, dur: 0.22, vol: 0.5 });
        noise(ac, d, t, { dur: 0.12, vol: 0.34, filter: 'lowpass', f0: 1400, f1: 300 });
        for (const [f, v] of [[523, 0.07], [1307, 0.05], [2093, 0.03]] as const) tone(ac, d, t, { type: 'triangle', f0: f, f1: f * 0.98, at: 0.01, dur: 0.32, vol: v });
    },
    // A hit on a dropped guard: a second, higher clang rings on.
    crit: (ac, d, t) => {
        for (const [f, v] of [[880, 0.07], [1975, 0.05], [2960, 0.03]] as const) tone(ac, d, t, { type: 'triangle', f0: f, at: 0.06, dur: 0.5, vol: v });
    },
    // The special charges: a rising hum with a wobble.
    charge: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 140, f1: 620, dur: 0.48, vol: 0.05, wobble: [18, 12] });
        tone(ac, d, t, { f0: 420, f1: 1250, dur: 0.48, vol: 0.06 });
    },
    // The rocket fist leaves: a whoosh with a rumble (after the charge).
    rocket: (ac, d, t) => {
        noise(ac, d, t, { at: 0.42, dur: 0.48, vol: 0.26, filter: 'bandpass', f0: 500, f1: 2200, q: 0.7 });
        tone(ac, d, t, { at: 0.42, f0: 90, f1: 60, dur: 0.46, vol: 0.18 });
    },
    // The laser fires: a bright pew falling fast, twice (after the charge).
    laser: (ac, d, t) => {
        tone(ac, d, t, { type: 'square', at: 0.44, f0: 1900, f1: 240, dur: 0.24, vol: 0.06 });
        tone(ac, d, t, { type: 'sawtooth', at: 0.5, f0: 1500, f1: 300, dur: 0.3, vol: 0.05 });
        tone(ac, d, t, { at: 0.44, f0: 980, f1: 900, dur: 0.44, vol: 0.05, wobble: [40, 30] });
    },
    // A special lands: a soft boom and a clang.
    boom: (ac, d, t) => {
        tone(ac, d, t, { f0: 120, f1: 36, dur: 0.5, vol: 0.55 });
        noise(ac, d, t, { dur: 0.45, vol: 0.4, filter: 'lowpass', f0: 1800, f1: 200 });
        noise(ac, d, t, { at: 0.3, dur: 0.45, vol: 0.18, filter: 'lowpass', f0: 600, f1: 150 });
        tone(ac, d, t, { type: 'triangle', f0: 660, at: 0.02, dur: 0.4, vol: 0.06 });
    },
    // A wrong answer: the robot powers down a little (a falling servo sigh); never a buzzer.
    powerDown: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 420, f1: 110, dur: 0.42, vol: 0.05 });
        tone(ac, d, t, { type: 'triangle', f0: 330, f1: 140, dur: 0.38, vol: 0.12 });
    },
    // A robot falls apart: a big soft boom, then bolts tinkling on the floor.
    explode: (ac, d, t) => {
        tone(ac, d, t, { f0: 100, f1: 30, dur: 0.8, vol: 0.6 });
        noise(ac, d, t, { dur: 0.48, vol: 0.45, filter: 'lowpass', f0: 2200, f1: 260 });
        noise(ac, d, t, { at: 0.35, dur: 0.48, vol: 0.28, filter: 'lowpass', f0: 900, f1: 150 });
        [[0.55, 2637], [0.68, 3136], [0.79, 2349], [0.9, 2794], [1.02, 2489]].forEach(([at, f]) => tone(ac, d, t, { type: 'triangle', at, f0: f, dur: 0.09, vol: 0.05 }));
    },
    // The boxing bell: two rings.
    bell: (ac, d, t) => {
        for (const at of [0, 0.22]) {
            tone(ac, d, t, { type: 'triangle', at, f0: 1568, dur: 0.6, vol: 0.09 });
            tone(ac, d, t, { at, f0: 3951, dur: 0.3, vol: 0.03 });
        }
    },
    // The crowd roars: swells of air.
    roar: (ac, d, t) => {
        for (const [at, v] of [[0, 0.1], [0.3, 0.16], [0.6, 0.14], [0.9, 0.08]] as const) {
            noise(ac, d, t, { at, dur: 0.48, vol: v, filter: 'bandpass', f0: 700, f1: 1300, q: 0.6 });
        }
    },
} satisfies Record<string, Recipe>;

export type RobotSound = keyof typeof RD;
export const playRobot = (name: RobotSound) => playRecipe(RD[name]);
