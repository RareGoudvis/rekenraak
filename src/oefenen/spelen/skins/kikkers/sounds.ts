import { noise, playRecipe, tone, type Recipe } from '../../sound';

// Kikkers en vliegjes' own sounds (Web Audio, short and soft, through sound.ts's master and on / off).

const SOUNDS = {
    // The tongue: a quick rising flick, a wet click at the bug, then a slurp back in.
    snap: (ac, d, t) => {
        tone(ac, d, t, { f0: 260, f1: 1500, dur: 0.08, vol: 0.2 });
        noise(ac, d, t, { at: 0.09, dur: 0.04, vol: 0.22, filter: 'bandpass', f0: 2600, q: 1.4 });
        tone(ac, d, t, { at: 0.12, f0: 1100, f1: 300, dur: 0.18, vol: 0.18, wobble: [32, 60] });
    },
    // The gulp: two low blops.
    gulp: (ac, d, t) => {
        tone(ac, d, t, { f0: 210, f1: 110, dur: 0.11, vol: 0.32 });
        tone(ac, d, t, { at: 0.12, f0: 170, f1: 95, dur: 0.12, vol: 0.24 });
    },
    // Now and then a small burp after the gulp.
    burp: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 150, f1: 105, dur: 0.32, vol: 0.26, wobble: [26, 18] });
        noise(ac, d, t, { dur: 0.25, vol: 0.06, filter: 'lowpass', f0: 500, f1: 250 });
    },
    // A beetle is a crunchier catch: a little crack on top of the gulp.
    crunch: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.05, vol: 0.2, filter: 'highpass', f0: 1800 });
        noise(ac, d, t, { at: 0.06, dur: 0.05, vol: 0.16, filter: 'highpass', f0: 2200 });
    },
    // The golden dragonfly: a soft hum swelling in, and a bright chime run.
    golden: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 300, f1: 340, dur: 0.6, vol: 0.08, wobble: [44, 18] });
        [1319, 1568, 1976, 2637].forEach((f, i) => tone(ac, d, t, { at: 0.08 + i * 0.07, f0: f, dur: 0.24, vol: 0.09 }));
    },
    // +5: a sparkle shower.
    sparkle: (ac, d, t) => {
        [1568, 2093, 1760, 2637, 2349].forEach((f, i) => tone(ac, d, t, { at: i * 0.06, f0: f, dur: 0.16, vol: 0.08 }));
    },
    // A mistake: a silly falling "oei" with a wobble and a small splash. Never a buzzer.
    oops: (ac, d, t) => {
        tone(ac, d, t, { f0: 620, f1: 260, dur: 0.34, vol: 0.18, wobble: [11, 30] });
        noise(ac, d, t, { at: 0.22, dur: 0.28, vol: 0.16, filter: 'lowpass', f0: 1300, f1: 350 });
    },
    // A frog falls flat in the water: a bigger splash.
    splash: (ac, d, t) => {
        tone(ac, d, t, { f0: 480, f1: 160, dur: 0.3, vol: 0.18 });
        noise(ac, d, t, { at: 0.12, dur: 0.55, vol: 0.28, filter: 'lowpass', f0: 1800, f1: 300 });
    },
    // A croak: "rib-bit", two low wobbly pulses.
    croak: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 190, f1: 150, dur: 0.14, vol: 0.34, wobble: [42, 34] });
        tone(ac, d, t, { type: 'triangle', at: 0.19, f0: 240, f1: 140, dur: 0.2, vol: 0.34, wobble: [42, 40] });
    },
    // A jump: a springy boing up.
    hop: (ac, d, t) => tone(ac, d, t, { f0: 220, f1: 660, dur: 0.22, vol: 0.18, wobble: [16, 20] }),
} satisfies Record<string, Recipe>;

export type KikkerSound = keyof typeof SOUNDS;

/** Plays one of the frogs' sounds (silent when sound is off or not yet unlocked). */
export const playKikker = (s: KikkerSound) => playRecipe(SOUNDS[s]);
