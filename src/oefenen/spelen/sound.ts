import { useEffect, useSyncExternalStore } from 'react';
import type { SpelEventMap, SpelEventName, SpelEvents } from './events';

// Spelen sounds, synthesised with Web Audio: no audio files, works offline. Soft, short and low, never a
// buzzer or a "fout" sound. On by default (owner 2026-11-15); a device that turned it off keeps that choice.
// Without Web Audio (jsdom, an old browser, autoplay refused) every call is simply silent.

export const SPEL_SOUNDS = ['pop', 'plop', 'plok', 'splash', 'poef', 'boing', 'jingle', 'sparkle', 'snip', 'puf', 'cheer', 'whoosh', 'blub', 'krak', 'wahwah', 'whoomp', 'piep', 'bonk', 'flip', 'ting', 'bzz', 'drup', 'ork', 'plons', 'tok', 'plof', 'fluit', 'zwoesj', 'blok', 'nana', 'pfff'] as const;
export type SpelSound = typeof SPEL_SOUNDS[number];

// What a skin may voice: a right answer, a wrong one, its own deadline running out (a zombie at the door),
// how the round ended (win / lost / fail), and the skin's own moments (props.sound: barricade, caught).
// Board games: flip = a card turns, nomatch = two cards that are no pair turn back (never a mistake sound).
// whistle = a referee's whistle (Voetbal: kick-off, half time).
// Kasteel: launch = a catapult fires by itself (the computer's clock), hit = a stone knocks blocks off a wall.
export type SoundCue = 'correct' | 'wrong' | 'miss' | 'win' | 'lost' | 'fail' | 'barricade' | 'caught' | 'flip' | 'nomatch' | 'whistle' | 'launch' | 'hit';
// null = that cue stays silent (the skin voices the moment itself).
export type SkinSounds = Partial<Record<SoundCue, SpelSound | null>>;
const DEFAULT_CUES: Record<SoundCue, SpelSound> = {
    correct: 'pop', wrong: 'plop', miss: 'plop', win: 'jingle', lost: 'boing', fail: 'boing', barricade: 'krak', caught: 'boing',
    flip: 'flip', nomatch: 'plop', whistle: 'fluit', launch: 'zwoesj', hit: 'blok',
};
// A small sparkle every this many in a row.
export const SPARKLE_EVERY = 5;

// ── On / off, per device ────────────────────────────────────────────────────
export const SOUND_KEY = 'rekenraak_spelen_geluid_v1';
const listeners = new Set<() => void>();

function readOn(): boolean {
    try { return globalThis.localStorage?.getItem(SOUND_KEY) !== '0'; } catch { return true; }
}
let on = readOn();

export const soundOn = () => on;

export function setSoundOn(next: boolean): void {
    on = next;
    try { globalThis.localStorage?.setItem(SOUND_KEY, next ? '1' : '0'); } catch { /* private mode: this visit only */ }
    // Turning it on is a tap: the moment to make the AudioContext, and a small sound says it works.
    if (next) { unlockSound(); play('sparkle'); }
    listeners.forEach(fn => fn());
}

/** Listen to the on / off choice (music.ts follows it). */
export const subscribeSound = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const subscribe = subscribeSound;

export function useSoundOn(): boolean {
    return useSyncExternalStore(subscribe, soundOn, () => false);
}

// ── The AudioContext: made on the first gesture after sound is on, never before ──
let ctx: AudioContext | null = null;
let out: AudioNode | null = null;
const unlockListeners = new Set<() => void>();

/** The shared AudioContext once a gesture made it (music plays on it too); null before. */
export const audioContext = (): AudioContext | null => ctx;

/** Called after each gesture that made or woke the AudioContext (music waits for the first). */
export function onSoundUnlock(fn: () => void): () => void {
    unlockListeners.add(fn);
    return () => { unlockListeners.delete(fn); };
}

/** From a user gesture (a tap or key while sound is on): make the AudioContext, or wake it. */
export function unlockSound(): void {
    if (!on) return;
    try {
        if (!ctx) {
            const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return;
            const ac = new Ctor();
            // One quiet master with a soft top: nothing shrill, whatever a recipe does.
            const master = ac.createGain();
            master.gain.value = 0.35;
            const soft = ac.createBiquadFilter();
            soft.type = 'lowpass';
            soft.frequency.value = 4500;
            master.connect(soft).connect(ac.destination);
            ctx = ac;
            out = master;
        }
        if (ctx.state === 'suspended') void ctx.resume().catch(() => { });
    } catch {
        ctx = null;
        out = null;
        return;
    }
    unlockListeners.forEach(fn => fn());
}

/** Test hook: forget the AudioContext and re-read the stored choice. */
export function resetSoundForTests(): void {
    ctx = null;
    out = null;
    on = readOn();
}

// ── Recipes ─────────────────────────────────────────────────────────────────
interface Tone { type?: OscillatorType; f0: number; f1?: number; at?: number; dur: number; vol: number; wobble?: [number, number] }
interface Noise { at?: number; dur: number; vol: number; filter: BiquadFilterType; f0: number; f1?: number; q?: number }

function tone(ac: AudioContext, dest: AudioNode, t: number, o: Tone) {
    const start = t + (o.at ?? 0);
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f0, start);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, start + o.dur);
    if (o.wobble) {
        // A boing: the pitch wobbles (rate, depth in Hz).
        const lfo = ac.createOscillator();
        const depth = ac.createGain();
        lfo.frequency.value = o.wobble[0];
        depth.gain.value = o.wobble[1];
        lfo.connect(depth).connect(osc.frequency);
        lfo.start(start);
        lfo.stop(start + o.dur + 0.05);
    }
    // Fast attack, exponential fade: a struck sound, no click at either edge.
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(o.vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + o.dur);
    osc.connect(g).connect(dest);
    osc.start(start);
    osc.stop(start + o.dur + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noise(ac: AudioContext, dest: AudioNode, t: number, o: Noise) {
    const start = t + (o.at ?? 0);
    if (!noiseBuf || noiseBuf.sampleRate !== ac.sampleRate) {
        noiseBuf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.5), ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = o.filter;
    f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(o.f0, start);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, start + o.dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(o.vol, start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + o.dur);
    src.connect(f).connect(g).connect(dest);
    src.start(start);
    src.stop(start + o.dur + 0.05);
}

type Recipe = (ac: AudioContext, dest: AudioNode, t: number) => void;
const RECIPES: Record<SpelSound, Recipe> = {
    // Balloon right: a short burst and a quick drop.
    pop: (ac, d, t) => { noise(ac, d, t, { dur: 0.07, vol: 0.5, filter: 'bandpass', f0: 1800, q: 0.8 }); tone(ac, d, t, { f0: 700, f1: 180, dur: 0.09, vol: 0.35 }); },
    // Wrong: a soft low plop with a breath of air; neutral, never a buzzer.
    plop: (ac, d, t) => { tone(ac, d, t, { f0: 380, f1: 250, dur: 0.16, vol: 0.28 }); noise(ac, d, t, { dur: 0.14, vol: 0.08, filter: 'lowpass', f0: 700, f1: 300 }); },
    // Pinguïntoren right: a wooden block lands.
    plok: (ac, d, t) => { tone(ac, d, t, { type: 'triangle', f0: 620, f1: 470, dur: 0.09, vol: 0.4 }); tone(ac, d, t, { f0: 1240, f1: 940, dur: 0.05, vol: 0.1 }); },
    // Pinguïntoren block falls: a slide down and a small splash.
    splash: (ac, d, t) => { tone(ac, d, t, { f0: 520, f1: 210, dur: 0.3, vol: 0.18 }); noise(ac, d, t, { at: 0.24, dur: 0.35, vol: 0.22, filter: 'lowpass', f0: 1400, f1: 400 }); },
    // Zombie right: a puff of smoke.
    poef: (ac, d, t) => { noise(ac, d, t, { dur: 0.3, vol: 0.38, filter: 'lowpass', f0: 1100, f1: 260 }); tone(ac, d, t, { f0: 160, f1: 70, dur: 0.18, vol: 0.3 }); },
    // Zombie at the door: a silly boing.
    boing: (ac, d, t) => tone(ac, d, t, { f0: 150, f1: 330, dur: 0.38, vol: 0.3, wobble: [14, 28] }),
    // End screen: a short happy run up (C E G C).
    jingle: (ac, d, t) => {
        [523, 659, 784].forEach((f, i) => tone(ac, d, t, { type: 'triangle', f0: f, at: i * 0.11, dur: 0.16, vol: 0.25 }));
        tone(ac, d, t, { type: 'triangle', f0: 1047, at: 0.33, dur: 0.45, vol: 0.25 });
    },
    // Hartjes: a card turns over (a soft paper flick).
    flip: (ac, d, t) => { noise(ac, d, t, { dur: 0.06, vol: 0.16, filter: 'bandpass', f0: 2400, f1: 1200, q: 0.9 }); tone(ac, d, t, { f0: 520, f1: 760, dur: 0.06, vol: 0.06 }); },
    // Hartjes pair found: two bright bell notes.
    ting: (ac, d, t) => { tone(ac, d, t, { f0: 1175, dur: 0.22, vol: 0.16 }); tone(ac, d, t, { f0: 1568, at: 0.09, dur: 0.32, vol: 0.14 }); },
    // Honingraat wrong cell: a short soft bee hum, low and wobbly, never a buzzer.
    bzz: (ac, d, t) => tone(ac, d, t, { type: 'triangle', f0: 210, f1: 190, dur: 0.34, vol: 0.14, wobble: [38, 16] }),
    // Honingraat right cell: honey drips in (a warm blop going up).
    drup: (ac, d, t) => { tone(ac, d, t, { f0: 330, f1: 620, dur: 0.12, vol: 0.26 }); tone(ac, d, t, { f0: 660, f1: 880, at: 0.1, dur: 0.1, vol: 0.1 }); },
    // Every few in a row: two small high notes, after the right-answer sound.
    sparkle: (ac, d, t) => { tone(ac, d, t, { f0: 1319, at: 0.12, dur: 0.12, vol: 0.1 }); tone(ac, d, t, { f0: 1760, at: 0.2, dur: 0.18, vol: 0.1 }); },
    // Bom right: a wire is snipped (two small clicks and a ping).
    snip: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.03, vol: 0.28, filter: 'highpass', f0: 2600 });
        noise(ac, d, t, { at: 0.07, dur: 0.03, vol: 0.28, filter: 'highpass', f0: 2600 });
        tone(ac, d, t, { f0: 880, f1: 1175, at: 0.08, dur: 0.12, vol: 0.14 });
    },
    // Bom time up: a big soft puff of smoke, then a little confetti twinkle. Never a bang.
    puf: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.9, vol: 0.38, filter: 'lowpass', f0: 900, f1: 150 });
        tone(ac, d, t, { f0: 220, f1: 70, dur: 0.5, vol: 0.22 });
        tone(ac, d, t, { f0: 1568, at: 0.55, dur: 0.14, vol: 0.07 });
        tone(ac, d, t, { f0: 2093, at: 0.66, dur: 0.18, vol: 0.06 });
    },
    // A won round: a happy hooray (a swell of air under a quick run up).
    cheer: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.7, vol: 0.12, filter: 'bandpass', f0: 800, f1: 1600, q: 0.7 });
        [523, 659, 784, 1047].forEach((f, i) => tone(ac, d, t, { type: 'triangle', f0: f, at: 0.05 + i * 0.08, dur: 0.3, vol: 0.2 }));
        tone(ac, d, t, { type: 'triangle', f0: 1319, at: 0.4, dur: 0.5, vol: 0.18 });
    },
    // Bever mistake: a wave rolls in.
    whoosh: (ac, d, t) => { noise(ac, d, t, { dur: 0.5, vol: 0.2, filter: 'bandpass', f0: 400, f1: 1200, q: 0.6 }); tone(ac, d, t, { f0: 180, f1: 140, dur: 0.4, vol: 0.12 }); },
    // Bever dam breaks: bubbly blips going up, the beaver floats off giggling.
    blub: (ac, d, t) => { [0, 0.12, 0.24, 0.36].forEach((at, i) => tone(ac, d, t, { f0: 300 + i * 70, f1: 600 + i * 90, at, dur: 0.1, vol: 0.18 })); },
    // Zombies: a crate or fence breaks (a soft wooden crack).
    krak: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.08, vol: 0.32, filter: 'bandpass', f0: 1500, q: 1.2 });
        tone(ac, d, t, { type: 'triangle', f0: 300, f1: 150, dur: 0.14, vol: 0.22 });
        noise(ac, d, t, { at: 0.1, dur: 0.06, vol: 0.18, filter: 'bandpass', f0: 1100, q: 1.2 });
    },
    // Zombies: a survivor is caught; a silly falling "wah wah wah".
    wahwah: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 392, f1: 370, dur: 0.24, vol: 0.2 });
        tone(ac, d, t, { type: 'triangle', f0: 370, f1: 349, at: 0.27, dur: 0.24, vol: 0.2 });
        tone(ac, d, t, { type: 'triangle', f0: 349, f1: 262, at: 0.54, dur: 0.5, vol: 0.2, wobble: [6, 8] });
    },
    // Pakjesband right: a parcel slides down the chimney and lands in the soot, a soft low "whoomp".
    whoomp: (ac, d, t) => {
        tone(ac, d, t, { f0: 420, f1: 160, dur: 0.32, vol: 0.16 });
        tone(ac, d, t, { f0: 110, f1: 60, at: 0.26, dur: 0.22, vol: 0.32 });
        noise(ac, d, t, { at: 0.26, dur: 0.3, vol: 0.14, filter: 'lowpass', f0: 500, f1: 180 });
    },
    // Eieren right: a little shell crack and a chick's two cheeps.
    piep: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.04, vol: 0.22, filter: 'highpass', f0: 2200 });
        tone(ac, d, t, { f0: 2100, f1: 2600, at: 0.12, dur: 0.08, vol: 0.09 });
        tone(ac, d, t, { f0: 2200, f1: 2800, at: 0.26, dur: 0.1, vol: 0.09 });
    },
    // Mollen right: a squeaky toy hammer (a soft rubber bonk and a squeak).
    bonk: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 240, f1: 120, dur: 0.12, vol: 0.32 });
        noise(ac, d, t, { dur: 0.05, vol: 0.12, filter: 'lowpass', f0: 900 });
        tone(ac, d, t, { f0: 1100, f1: 1500, at: 0.07, dur: 0.14, vol: 0.1, wobble: [30, 60] });
    },
    // Zeehondjes right: a happy, soft seal "ork-ork" (two short low barks going up).
    ork: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 260, f1: 340, dur: 0.12, vol: 0.22, wobble: [24, 18] });
        tone(ac, d, t, { type: 'triangle', f0: 300, f1: 400, at: 0.16, dur: 0.14, vol: 0.22, wobble: [24, 18] });
    },
    // Zeehondjes wrong: a soft little "plons" in the water; neutral, never a buzzer.
    plons: (ac, d, t) => { tone(ac, d, t, { f0: 560, f1: 200, dur: 0.14, vol: 0.16 }); noise(ac, d, t, { at: 0.04, dur: 0.26, vol: 0.12, filter: 'lowpass', f0: 1200, f1: 300 }); },
    // Mollen wrong: a cheeky sing-song "na-na-na" (a soft rubbery plop, then high-high-low); teasing, never a buzzer.
    nana: (ac, d, t) => {
        tone(ac, d, t, { f0: 420, f1: 200, dur: 0.1, vol: 0.14 });
        for (const [at, f] of [[0.1, 760], [0.24, 760], [0.38, 600]] as const) tone(ac, d, t, { type: 'triangle', f0: f, f1: f * 0.97, at, dur: 0.12, vol: 0.14, wobble: [26, 14] });
    },
    // Voetbal pass: a soft leather "tok" on the ball.
    tok: (ac, d, t) => { tone(ac, d, t, { type: 'triangle', f0: 190, f1: 95, dur: 0.09, vol: 0.34 }); noise(ac, d, t, { dur: 0.03, vol: 0.12, filter: 'bandpass', f0: 1300, q: 0.9 }); },
    // Voetbal save: the ball lands in the keeper's big gloves, a muffled "plof".
    plof: (ac, d, t) => { noise(ac, d, t, { dur: 0.16, vol: 0.28, filter: 'lowpass', f0: 650, f1: 220 }); tone(ac, d, t, { f0: 150, f1: 85, dur: 0.13, vol: 0.24 }); },
    // Voetbal kick-off and half time: a short, quiet referee's trill (two pips).
    fluit: (ac, d, t) => {
        tone(ac, d, t, { f0: 2100, dur: 0.14, vol: 0.08, wobble: [30, 70] });
        tone(ac, d, t, { f0: 2100, at: 0.2, dur: 0.3, vol: 0.08, wobble: [30, 70] });
    },
    // Kasteel: a catapult throws, a soft rising swish of air.
    zwoesj: (ac, d, t) => { noise(ac, d, t, { dur: 0.32, vol: 0.2, filter: 'bandpass', f0: 500, f1: 1800, q: 0.8 }); tone(ac, d, t, { f0: 200, f1: 320, dur: 0.18, vol: 0.06 }); },
    // Kasteel: a stone knocks a block off the wall, a low bonk and a little rubble after it.
    blok: (ac, d, t) => {
        tone(ac, d, t, { type: 'triangle', f0: 170, f1: 85, dur: 0.16, vol: 0.34 });
        noise(ac, d, t, { dur: 0.08, vol: 0.18, filter: 'lowpass', f0: 800 });
        noise(ac, d, t, { at: 0.12, dur: 0.22, vol: 0.12, filter: 'bandpass', f0: 1200, f1: 500, q: 0.9 });
    },
    // Ballonnen wrong: a balloon lets its air go, a hissing pfff with a silly flutter falling away.
    pfff: (ac, d, t) => {
        noise(ac, d, t, { dur: 0.5, vol: 0.2, filter: 'bandpass', f0: 2600, f1: 900, q: 1.4 });
        tone(ac, d, t, { type: 'triangle', f0: 300, f1: 140, at: 0.05, dur: 0.55, vol: 0.1, wobble: [24, 30] });
    },
};

/** Plays one sound; silent when sound is off, before the first gesture, or without Web Audio. */
export function play(name: SpelSound): void {
    if (!on || !ctx || !out || ctx.state === 'closed') return;
    try { RECIPES[name](ctx, out, ctx.currentTime + 0.01); } catch { /* a missing node type: stay silent */ }
}

// ── Game events → sounds ────────────────────────────────────────────────────
/** The sound for a session event in a skin with these cues (null = none). */
export function soundFor<K extends SpelEventName>(cues: SkinSounds | undefined, name: K, payload: SpelEventMap[K]): SpelSound | null {
    const c = { ...DEFAULT_CUES, ...cues };
    switch (name) {
        case 'correct': return c.correct;
        // An empty given is the skin's own deadline (onMiss).
        case 'wrong': return (payload as SpelEventMap['wrong']).given === '' ? (cues?.miss !== undefined ? cues.miss : c.wrong) : c.wrong;
        case 'streak': { const n = (payload as SpelEventMap['streak']).count; return n > 0 && n % SPARKLE_EVERY === 0 ? 'sparkle' : null; }
        case 'end': {
            const o = (payload as SpelEventMap['end']).outcome;
            return o === 'won' ? c.win : o === 'lost' ? c.lost : o === 'failed' ? c.fail : 'jingle';
        }
        default: return null;
    }
}

/** The sound for one of the skin's own cues (props.sound). */
export const cueSound = (cues: SkinSounds | undefined, cue: SoundCue): SpelSound | null => ({ ...DEFAULT_CUES, ...cues })[cue];

const VOICED: SpelEventName[] = ['correct', 'wrong', 'streak', 'end'];

/** The game shell: voice the session's events with the skin's cues; taps and keys wake the AudioContext. */
export function useSpelSounds(events: SpelEvents, cues: SkinSounds | undefined): void {
    const enabled = useSoundOn();
    useEffect(() => {
        const voice = <K extends SpelEventName>(name: K) => events.on(name, p => { const s = soundFor(cues, name, p); if (s) play(s); });
        const offs = VOICED.map(name => voice(name));
        return () => offs.forEach(off => off());
    }, [events, cues]);
    useEffect(() => {
        if (!enabled) return;
        const wake = () => unlockSound();
        window.addEventListener('pointerdown', wake, true);
        window.addEventListener('keydown', wake, true);
        return () => { window.removeEventListener('pointerdown', wake, true); window.removeEventListener('keydown', wake, true); };
    }, [enabled]);
}
