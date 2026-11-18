import { noise, playRecipe, tone, type Recipe } from '../../sound';
import type { DraakKind } from './rule';

// Drakenrace's own sounds (Web Audio, under the shared on / off and soft master): soft wingbeats, a cartoon
// crackle and zap (never a harsh thunderclap), a gong with a long shimmer, fireworks. The noise buffer is 0.5 s.

const RECIPES = {
    // The round begins: a small, friendly dragon "rawr".
    rawr: (ac, d, t) => {
        tone(ac, d, t, { type: 'sawtooth', f0: 260, f1: 170, dur: 0.42, vol: 0.06, wobble: [18, 22] });
        tone(ac, d, t, { type: 'triangle', f0: 340, f1: 220, dur: 0.38, vol: 0.12, wobble: [18, 26] });
        noise(ac, d, t, { dur: 0.35, vol: 0.08, filter: 'bandpass', f0: 700, f1: 400, q: 1.2 });
    },
    // A right answer: one big wingbeat, a soft whoomph of air.
    beat: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.22, vol: 0.32, filter: 'lowpass', f0: 900, f1: 180 });
        noise(ac, d, t, { at: 0.06, dur: 0.3, vol: 0.12, filter: 'bandpass', f0: 500, f1: 1600, q: 0.8 });
        tone(ac, d, t, { type: 'triangle', f0: 150, f1: 90, dur: 0.18, vol: 0.18 });
    },
    // A tailwind (a catch-up): a long soft whoosh.
    wind: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.5, vol: 0.22, filter: 'bandpass', f0: 300, f1: 1800, q: 0.7 });
        noise(ac, d, t, { at: 0.35, dur: 0.5, vol: 0.16, filter: 'bandpass', f0: 1800, f1: 500, q: 0.7 });
    },
    // A cloud blown apart: a soft round poof.
    poof: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.3, vol: 0.3, filter: 'lowpass', f0: 1400, f1: 200 });
        tone(ac, d, t, { f0: 420, f1: 820, dur: 0.18, vol: 0.06 });
    },
    // Into a wall or an island: a hollow bonk.
    bonk: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 240, f1: 120, dur: 0.22, vol: 0.3 });
        noise(ac, d, t, { dur: 0.08, vol: 0.2, filter: 'lowpass', f0: 1200 });
        tone(ac, d, t, { at: 0.18, f0: 900, f1: 600, dur: 0.3, vol: 0.05, wobble: [10, 30] });
    },
    // The birds: a few chirps.
    tweet: (ac, d, t) => {
        [0, 0.1, 0.24, 0.34].forEach((at, i) => tone(ac, d, t, { at, f0: 2200 + (i % 2) * 400, f1: 3000, dur: 0.07, vol: 0.05 }));
    },
    // Off the balloon: a rubbery boing.
    boing: (ac, d, t) => {
        tone(ac, d, t, { f0: 180, f1: 460, dur: 0.5, vol: 0.18, wobble: [14, 40] });
    },
    // The cloud charges (2 in a row): a little crackle.
    charge: (ac, d, t) => {
        [0, 0.07, 0.15, 0.2].forEach((at, i) => noise(ac, d, t, { at, dur: 0.05, vol: 0.1 - i * 0.015, filter: 'highpass', f0: 3200 }));
        tone(ac, d, t, { f0: 600, f1: 1200, dur: 0.3, vol: 0.04 });
    },
    // The lightning: a bright crack, a zap down, and a round rumble.
    lightning: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.12, vol: 0.38, filter: 'highpass', f0: 2600 });
        tone(ac, d, t, { type: 'square', f0: 1400, f1: 180, dur: 0.28, vol: 0.05 });
        noise(ac, d, t, { at: 0.08, dur: 0.5, vol: 0.28, filter: 'lowpass', f0: 600, f1: 90 });
        noise(ac, d, t, { at: 0.45, dur: 0.5, vol: 0.16, filter: 'lowpass', f0: 380, f1: 70 });
    },
    // The dragon it hits: a fizzy "bzzt" and a dizzy boing.
    zapped: (ac, d, t) => {
        tone(ac, d, t, { type: 'square', f0: 220, dur: 0.22, vol: 0.05, wobble: [60, 40] });
        tone(ac, d, t, { at: 0.2, f0: 700, f1: 300, dur: 0.5, vol: 0.12, wobble: [12, 30] });
    },
    // A wrong answer: the dragon spins, a "wee-oo" sliding down and a puff.
    stall: (ac, d, t) => {
        tone(ac, d, t, { f0: 760, f1: 260, dur: 0.6, vol: 0.13, wobble: [9, 34] });
        noise(ac, d, t, { at: 0.1, dur: 0.3, vol: 0.1, filter: 'bandpass', f0: 900, f1: 300, q: 0.9 });
    },
    // The finish: a gong, a few inharmonic partials that ring out long.
    gong: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.08, vol: 0.3, filter: 'lowpass', f0: 1800 });
        tone(ac, d, t, { f0: 98, dur: 3.2, vol: 0.32, wobble: [2.2, 1.5] });
        tone(ac, d, t, { f0: 196.8, dur: 2.6, vol: 0.14, wobble: [3.1, 2] });
        tone(ac, d, t, { f0: 263, dur: 2.2, vol: 0.1 });
        tone(ac, d, t, { f0: 391, dur: 1.8, vol: 0.07, wobble: [4.6, 3] });
        tone(ac, d, t, { f0: 578, dur: 1.3, vol: 0.05 });
    },
    // Fireworks: a whistle up and a soft pop.
    firework: (ac, d, t) => {
        tone(ac, d, t, { f0: 520, f1: 1500, dur: 0.38, vol: 0.05 });
        noise(ac, d, t, { at: 0.4, dur: 0.22, vol: 0.2, filter: 'lowpass', f0: 2400, f1: 600 });
        tone(ac, d, t, { f0: 1760, at: 0.48, dur: 0.18, vol: 0.05 });
    },
} satisfies Record<string, Recipe>;

export type DraakSound = keyof typeof RECIPES;
export const DRAAK_SOUNDS = Object.keys(RECIPES) as DraakSound[];

export const playDraak = (name: DraakSound) => playRecipe(RECIPES[name]);

// Each obstacle's own sound on top of the wingbeat (a clear) or the "wee-oo" (a crash).
const CONTACT: Record<DraakKind, { clear: DraakSound | null; crash: DraakSound | null }> = {
    cloud: { clear: 'poof', crash: 'zapped' },
    storm: { clear: 'poof', crash: 'lightning' },
    tower: { clear: null, crash: 'bonk' },
    birds: { clear: 'tweet', crash: 'tweet' },
    island: { clear: null, crash: 'bonk' },
    gate: { clear: 'charge', crash: 'zapped' },
    balloon: { clear: null, crash: 'boing' },
};

/** The obstacle's own sound at a contact (null = only the wingbeat or the "wee-oo"). */
export const soundOfContact = (kind: DraakKind, outcome: 'clear' | 'crash') => CONTACT[kind][outcome];
