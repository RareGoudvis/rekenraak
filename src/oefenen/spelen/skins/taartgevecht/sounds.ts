import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Taartgevecht's own sounds (DUEL.md "Sounds"): Web Audio recipes on the shared soft master. Slapstick, short,
// never a buzzer.

const RECIPES = {
    // The throw: a quick rising swish of air with a little spin flutter.
    throw: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.3, vol: 0.22, filter: 'bandpass', f0: 420, f1: 2000, q: 0.9 });
        tone(ac, d, t, { type: 'triangle', f0: 240, f1: 420, dur: 0.22, vol: 0.05, wobble: [22, 30] });
    },
    // A pie in the face: a wet, low splat with two squelches after it.
    splat: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.22, vol: 0.5, filter: 'lowpass', f0: 1600, f1: 220 });
        tone(ac, d, t, { f0: 210, f1: 60, dur: 0.18, vol: 0.34 });
        noise(ac, d, t, { at: 0.1, dur: 0.08, vol: 0.16, filter: 'bandpass', f0: 900, f1: 500, q: 2 });
        noise(ac, d, t, { at: 0.2, dur: 0.07, vol: 0.1, filter: 'bandpass', f0: 1200, f1: 700, q: 2 });
    },
    // The last pie lands: a bigger, slower splat that keeps dripping.
    bigSplat: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.45, vol: 0.55, filter: 'lowpass', f0: 1400, f1: 140 });
        tone(ac, d, t, { f0: 170, f1: 45, dur: 0.4, vol: 0.36 });
        for (const [at, f] of [[0.18, 1000], [0.32, 800], [0.5, 1300], [0.68, 900]] as const) {
            noise(ac, d, t, { at, dur: 0.08, vol: 0.12, filter: 'bandpass', f0: f, f1: f * 0.6, q: 2.2 });
        }
    },
    // The crowd goes "oooh": a few soft voices gliding down under a breath of air.
    ooh: (ac, d, t) => {
        for (const [f, at] of [[262, 0], [330, 0.02], [392, 0.04], [196, 0.03]] as const) {
            tone(ac, d, t, { type: 'triangle', f0: f * 1.06, f1: f * 0.86, at, dur: 0.75, vol: 0.06, wobble: [5, 4] });
        }
        noise(ac, d, t, { dur: 0.7, vol: 0.06, filter: 'bandpass', f0: 700, f1: 500, q: 1.5 });
    },
    // A wrong answer: the contestant goes dizzy (a soft wobbly "bloing" and two little birdie tweets).
    dizzy: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 330, f1: 170, dur: 0.34, vol: 0.18, wobble: [12, 24] });
        tone(ac, d, t, { f0: 1760, f1: 2200, at: 0.3, dur: 0.07, vol: 0.06 });
        tone(ac, d, t, { f0: 1980, f1: 2400, at: 0.42, dur: 0.07, vol: 0.06 });
    },
    // The last pie leaves the hand: a short soft drumroll under it.
    drumroll: (ac, d, t) => {
        for (let i = 0; i < 18; i++) noise(ac, d, t, { at: i * 0.045, dur: 0.05, vol: 0.05 + i * 0.006, filter: 'bandpass', f0: 1800, q: 0.8 });
    },
    // The loser licks the cream: a happy slurp going up.
    slurp: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.32, vol: 0.14, filter: 'bandpass', f0: 500, f1: 2200, q: 3 });
        tone(ac, d, t, { f0: 300, f1: 760, dur: 0.28, vol: 0.08, wobble: [30, 40] });
        tone(ac, d, t, { f0: 880, at: 0.36, dur: 0.12, vol: 0.06 });
    },
    // The audience claps for the round's winner: many small claps in a swell.
    applause: (ac, d, t) => {
        let r = 7;
        const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
        for (let i = 0; i < 46; i++) {
            const at = rand() * 1.3;
            noise(ac, d, t, { at, dur: 0.035, vol: 0.06 + 0.06 * Math.sin(Math.PI * (at / 1.3)), filter: 'bandpass', f0: 1100 + rand() * 1400, q: 1.2 });
        }
    },
} satisfies Record<string, Recipe>;

export type TaartSound = keyof typeof RECIPES;

export const playTaart = (name: TaartSound) => playRecipe(RECIPES[name]);
