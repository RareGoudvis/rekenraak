import { useEffect, useSyncExternalStore } from 'react';
import type { SpelEventMap, SpelEventName, SpelEvents } from './events';

// Spelen sounds, synthesised with Web Audio: no audio files, works offline. Soft, short and low, never a
// buzzer or a "fout" sound. Off by default (a class full of iPads); the choice is kept per device.
// Without Web Audio (jsdom, an old browser, autoplay refused) every call is simply silent.

export const SPEL_SOUNDS = ['pop', 'plop', 'plok', 'splash', 'poef', 'boing', 'jingle', 'sparkle'] as const;
export type SpelSound = typeof SPEL_SOUNDS[number];

// What a skin may voice: a right answer, a wrong one, and its own deadline running out (a zombie at the door).
export type SoundCue = 'correct' | 'wrong' | 'miss';
export type SkinSounds = Partial<Record<SoundCue, SpelSound>>;
const DEFAULT_CUES: Required<SkinSounds> = { correct: 'pop', wrong: 'plop', miss: 'plop' };
// A small sparkle every this many in a row.
export const SPARKLE_EVERY = 5;

// ── On / off, per device ────────────────────────────────────────────────────
export const SOUND_KEY = 'rekenraak_spelen_geluid_v1';
const listeners = new Set<() => void>();

function readOn(): boolean {
    try { return globalThis.localStorage?.getItem(SOUND_KEY) === '1'; } catch { return false; }
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

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function useSoundOn(): boolean {
    return useSyncExternalStore(subscribe, soundOn, () => false);
}

// ── The AudioContext: made on the first gesture after sound is on, never before ──
let ctx: AudioContext | null = null;
let out: AudioNode | null = null;

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
    }
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
    // Every few in a row: two small high notes, after the right-answer sound.
    sparkle: (ac, d, t) => { tone(ac, d, t, { f0: 1319, at: 0.12, dur: 0.12, vol: 0.1 }); tone(ac, d, t, { f0: 1760, at: 0.2, dur: 0.18, vol: 0.1 }); },
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
        case 'wrong': return (payload as SpelEventMap['wrong']).given === '' ? (cues?.miss ?? c.wrong) : c.wrong;
        case 'streak': { const n = (payload as SpelEventMap['streak']).count; return n > 0 && n % SPARKLE_EVERY === 0 ? 'sparkle' : null; }
        case 'end': return 'jingle';
        default: return null;
    }
}

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
