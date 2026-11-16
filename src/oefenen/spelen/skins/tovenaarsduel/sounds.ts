import { noise, playRecipe, tone, type Recipe } from '../../sound';
import type { Spell } from './rule';

// Tovenaarsduel's own sounds (DUEL.md "Sounds"): short Web Audio recipes on the shared soft master. Magic, never
// harsh: a rising chime per streak step, a shimmer for ice, a whoosh and roar for fire, a crack and rumble for
// lightning, a hum and a glassy ring for the shield, a soft poof for a defeat. The shared noise buffer is 0.5 s,
// so longer noise is laid down in overlapping pieces.

// The ladder's chime: one note higher per step (C, E, G, high C), a bell with a sparkle on top.
const STEP_NOTES = [523, 659, 784, 1047] as const;
const chime = (f: number): Recipe => (ac, d, t) => {
    tone(ac, d, t, { type: 'triangle', f0: f, dur: 0.5, vol: 0.12 });
    tone(ac, d, t, { f0: f * 2, dur: 0.35, vol: 0.05 });
    tone(ac, d, t, { f0: f * 3, at: 0.04, dur: 0.22, vol: 0.025 });
};

const RECIPES = {
    step1: chime(STEP_NOTES[0]),
    step2: chime(STEP_NOTES[1]),
    step3: chime(STEP_NOTES[2]),
    step4: chime(STEP_NOTES[3]),
    // IJspijl leaves the staff: a cold shimmer rising, a breath of frosty air.
    castIce: (ac, d, t) => {
        tone(ac, d, t, { f0: 1200, f1: 2600, dur: 0.4, vol: 0.05, wobble: [22, 60] });
        noise(ac, d, t, { dur: 0.45, vol: 0.12, filter: 'highpass', f0: 3000, f1: 6000 });
        noise(ac, d, t, { at: 0.3, dur: 0.4, vol: 0.12, filter: 'bandpass', f0: 2400, f1: 900, q: 0.8 });
    },
    // The spear shatters: little ice pings over a crisp crunch.
    iceShatter: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.25, vol: 0.32, filter: 'highpass', f0: 2500 });
        [[0, 2794], [0.03, 3520], [0.07, 2349], [0.1, 4186], [0.15, 3136], [0.21, 2637]].forEach(([at, f]) => tone(ac, d, t, { type: 'triangle', at, f0: f, dur: 0.12, vol: 0.06 }));
        tone(ac, d, t, { f0: 300, f1: 120, dur: 0.2, vol: 0.18 });
    },
    // Vuurbal: a whoosh that swells, and a low roar while it flies.
    castFire: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.45, vol: 0.2, filter: 'bandpass', f0: 300, f1: 1600, q: 0.7 });
        noise(ac, d, t, { at: 0.35, dur: 0.45, vol: 0.16, filter: 'lowpass', f0: 900, f1: 500 });
        tone(ac, d, t, { f0: 90, f1: 140, at: 0.3, dur: 0.6, vol: 0.12, wobble: [9, 12] });
    },
    // The fireball bursts: a round boom and crackling embers.
    fireBoom: (ac, d, t) => {
        tone(ac, d, t, { f0: 130, f1: 38, dur: 0.55, vol: 0.5 });
        noise(ac, d, t, { dur: 0.48, vol: 0.45, filter: 'lowpass', f0: 1800, f1: 220 });
        [0.12, 0.2, 0.31, 0.4, 0.52, 0.63].forEach(at => noise(ac, d, t, { at, dur: 0.04, vol: 0.12, filter: 'bandpass', f0: 2400, q: 1.5 }));
    },
    // Bliksem charges: a low rumble and a buzz climbing as the cloud gathers.
    charge: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.48, vol: 0.18, filter: 'lowpass', f0: 180, f1: 320 });
        noise(ac, d, t, { at: 0.42, dur: 0.48, vol: 0.16, filter: 'lowpass', f0: 320, f1: 200 });
        tone(ac, d, t, { type: 'sawtooth', f0: 70, f1: 220, dur: 0.85, vol: 0.035, wobble: [30, 10] });
    },
    // The bolt strikes: a sharp crack, then the thunder rolls away.
    thunder: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.12, vol: 0.55, filter: 'highpass', f0: 1800 });
        tone(ac, d, t, { f0: 110, f1: 30, dur: 0.9, vol: 0.5 });
        [0.05, 0.4, 0.8].forEach((at, i) => noise(ac, d, t, { at, dur: 0.5, vol: 0.42 - i * 0.12, filter: 'lowpass', f0: 900 - i * 250, f1: 90 }));
    },
    // Schild: a warm hum swelling under a little chime.
    shieldUp: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 196, f1: 294, dur: 0.7, vol: 0.12, wobble: [7, 6] });
        tone(ac, d, t, { f0: 784, f1: 1175, at: 0.1, dur: 0.5, vol: 0.06 });
        tone(ac, d, t, { f0: 1568, at: 0.45, dur: 0.4, vol: 0.04 });
    },
    // A spell hits the shield: a glassy ring, the dome cracking, shards tinkling.
    shieldBlock: (ac, d, t) => {
        for (const [f, v] of [[1319, 0.08], [1976, 0.06], [2637, 0.05]] as const) tone(ac, d, t, { type: 'triangle', f0: f, dur: 0.6, vol: v });
        noise(ac, d, t, { at: 0.02, dur: 0.18, vol: 0.25, filter: 'highpass', f0: 3200 });
        [[0.2, 3951], [0.27, 3136], [0.33, 4699], [0.41, 3520]].forEach(([at, f]) => tone(ac, d, t, { type: 'triangle', at, f0: f, dur: 0.09, vol: 0.045 }));
    },
    // A wrong answer: the spell fizzles out of the staff, a soft "pfff"; never a buzzer.
    fizzle: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.35, vol: 0.12, filter: 'lowpass', f0: 1500, f1: 300 });
        tone(ac, d, t, { type: 'triangle', f0: 520, f1: 180, dur: 0.32, vol: 0.1 });
    },
    // A wizard is defeated: a soft poof of smoke, a dizzy wobble falling, the hat landing.
    poof: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.45, vol: 0.45, filter: 'lowpass', f0: 1400, f1: 200 });
        tone(ac, d, t, { f0: 180, f1: 60, dur: 0.3, vol: 0.3 });
        tone(ac, d, t, { at: 0.35, f0: 600, f1: 220, dur: 0.6, vol: 0.12, wobble: [10, 40] });
        tone(ac, d, t, { type: 'triangle', at: 1.1, f0: 300, f1: 200, dur: 0.12, vol: 0.18 });
    },
    // "Duel!": a low magic gong with a shimmer.
    gong: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 147, dur: 1.1, vol: 0.2, wobble: [4, 2] });
        tone(ac, d, t, { f0: 294, dur: 0.8, vol: 0.08 });
        noise(ac, d, t, { at: 0.02, dur: 0.45, vol: 0.06, filter: 'highpass', f0: 5000 });
    },
    // The match is won: a magic fanfare, a run up and a sparkling chord.
    fanfare: (ac, d, t) => {
        [[0, 523], [0.12, 659], [0.24, 784], [0.36, 1047]].forEach(([at, f]) => tone(ac, d, t, { type: 'triangle', at, f0: f, dur: 0.22, vol: 0.12 }));
        for (const f of [1047, 1319, 1568]) tone(ac, d, t, { type: 'triangle', at: 0.5, f0: f, dur: 0.9, vol: 0.07 });
        [[0.55, 3136], [0.7, 3951], [0.85, 4699], [1, 3520]].forEach(([at, f]) => tone(ac, d, t, { at, f0: f, dur: 0.1, vol: 0.03 }));
    },
    // Magic fireworks over the winner: a whistle up and a sparkling pop.
    sparkle: (ac, d, t) => {
        tone(ac, d, t, { f0: 700, f1: 1800, dur: 0.35, vol: 0.04 });
        noise(ac, d, t, { at: 0.36, dur: 0.2, vol: 0.14, filter: 'highpass', f0: 2500 });
        [[0.4, 2637], [0.47, 3520], [0.55, 3136]].forEach(([at, f]) => tone(ac, d, t, { type: 'triangle', at, f0: f, dur: 0.08, vol: 0.04 }));
    },
} satisfies Record<string, Recipe>;

export type ToverSound = keyof typeof RECIPES;
export const TOVER_SOUNDS = Object.keys(RECIPES) as ToverSound[];
export const playTover = (name: ToverSound) => playRecipe(RECIPES[name]);

/** The chime for the ladder step a right answer reached (1..4). */
export const stepSound = (step: number): ToverSound => (['step1', 'step2', 'step3', 'step4'] as const)[Math.max(0, Math.min(3, step - 1))];

export const CAST_SOUND: Record<Spell, ToverSound> = { ijs: 'castIce', vuur: 'castFire', bliksem: 'charge', schild: 'shieldUp' };
