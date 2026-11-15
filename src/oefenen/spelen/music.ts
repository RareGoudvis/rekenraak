import { useEffect, useSyncExternalStore } from 'react';
import { audioContext, onSoundUnlock, soundOn, subscribeSound } from './sound';

// Spelen background music: one quiet CC0 loop per game atmosphere (public/spelen/music/, CREDITS.md there).
// It plays only with sound on AND music on (both off by default), is fetched the first time a game wants it,
// rides the sound effects' AudioContext under them, and stops on the end screen, on leaving and while hidden.

export const MUSIC_IDS = ['weide', 'ijs', 'griezel', 'tikken', 'race', 'kerst', 'fabriek', 'zee', 'sport', 'kasteel', 'rivier', 'gek', 'zacht'] as const;
export type MusicId = typeof MUSIC_IDS[number];

// seamless = a real loop, played end to end; xfade = a cut from a longer piece (its file fades out at the end),
// the next pass starts this many seconds before the end so the two overlap.
export interface MusicTrack { seconds: number; loop: 'seamless' | 'xfade' }
export const XFADE_S = 3;
export const MUSIC_TRACKS: Record<MusicId, MusicTrack> = {
    weide: { seconds: 75, loop: 'xfade' },
    ijs: { seconds: 49.5, loop: 'seamless' },
    griezel: { seconds: 57.65, loop: 'xfade' },
    tikken: { seconds: 40.421, loop: 'seamless' },
    race: { seconds: 75, loop: 'xfade' },
    kerst: { seconds: 39.6, loop: 'xfade' },
    fabriek: { seconds: 75, loop: 'xfade' },
    zee: { seconds: 64.71, loop: 'seamless' },
    sport: { seconds: 31.979, loop: 'seamless' },
    kasteel: { seconds: 56.308, loop: 'seamless' },
    rivier: { seconds: 75, loop: 'xfade' },
    gek: { seconds: 75, loop: 'xfade' },
    zacht: { seconds: 39.52, loop: 'seamless' },
};

export const musicUrl = (id: MusicId) => `${import.meta.env.BASE_URL}spelen/music/${id}.mp3`;

// The files sit at about -20 LUFS; this keeps the bed well under the effects (their master is 0.35).
const VOLUME = 0.4;
const FADE_IN_S = 1.2;
const FADE_OUT_S = 0.8;
// LAME's encoder delay (576 + 529 samples at 44.1 kHz): skipped when a decoder keeps it, so a loop stays gapless.
const MP3_DELAY_S = 1105 / 44100;

// ── On / off, per device ────────────────────────────────────────────────────
export const MUSIC_KEY = 'rekenraak_spelen_muziek_v1';
const listeners = new Set<() => void>();
function readOn(): boolean {
    try { return globalThis.localStorage?.getItem(MUSIC_KEY) !== '0'; } catch { return true; }
}
let on = readOn();

/** The music choice alone (it only sounds while sound itself is on too). */
export const musicOn = () => on;
const audible = () => on && soundOn();

export function setMusicOn(next: boolean): void {
    on = next;
    try { globalThis.localStorage?.setItem(MUSIC_KEY, next ? '1' : '0'); } catch { /* private mode: this visit only */ }
    listeners.forEach(fn => fn());
    sync();
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function useMusicOn(): boolean {
    return useSyncExternalStore(subscribe, musicOn, () => false);
}

// The game bar's speaker steps (SoundToggle): Uit → Geluid → Geluid + muziek → Uit.
export type SoundLevel = 'uit' | 'geluid' | 'muziek';
export const levelOf = (sound: boolean, music: boolean): SoundLevel => (!sound ? 'uit' : music ? 'muziek' : 'geluid');
export const NEXT_LEVEL: Record<SoundLevel, SoundLevel> = { uit: 'geluid', geluid: 'muziek', muziek: 'uit' };

// ── The player ──────────────────────────────────────────────────────────────
// What the game on screen asks for; what sounds now (its gain and every source, for a clean stop).
let wanted: MusicId | null = null;
interface Playing { id: MusicId; gain: GainNode; sources: AudioBufferSourceNode[]; timer: ReturnType<typeof setTimeout> | null }
let playing: Playing | null = null;
const buffers = new Map<MusicId, Promise<AudioBuffer>>();
let wired = false;

function load(ac: AudioContext, id: MusicId): Promise<AudioBuffer> {
    let p = buffers.get(id);
    if (!p) {
        p = fetch(musicUrl(id))
            .then(r => { if (!r.ok) throw new Error(`music ${id}: ${r.status}`); return r.arrayBuffer(); })
            .then(data => ac.decodeAudioData(data));
        // A failed fetch (offline) may try again next game.
        p.catch(() => buffers.delete(id));
        buffers.set(id, p);
    }
    return p;
}

function fadeOut(p: Playing, ac: AudioContext): void {
    if (p.timer) clearTimeout(p.timer);
    const t = ac.currentTime;
    try {
        p.gain.gain.cancelScheduledValues(t);
        p.gain.gain.setValueAtTime(p.gain.gain.value, t);
        p.gain.gain.linearRampToValueAtTime(0, t + FADE_OUT_S);
        p.sources.forEach(s => s.stop(t + FADE_OUT_S + 0.05));
    } catch { /* already stopped */ }
    setTimeout(() => { try { p.gain.disconnect(); } catch { /* gone */ } }, (FADE_OUT_S + 0.2) * 1000);
}

function begin(ac: AudioContext, id: MusicId, buf: AudioBuffer): Playing {
    const track = MUSIC_TRACKS[id];
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0, ac.currentTime);
    gain.gain.linearRampToValueAtTime(VOLUME, ac.currentTime + FADE_IN_S);
    gain.connect(ac.destination);
    const p: Playing = { id, gain, sources: [], timer: null };
    const source = () => {
        const s = ac.createBufferSource();
        s.buffer = buf;
        s.connect(gain);
        s.onended = () => { p.sources = p.sources.filter(x => x !== s); };
        p.sources.push(s);
        return s;
    };
    const t0 = ac.currentTime + 0.05;
    if (track.loop === 'seamless') {
        const s = source();
        s.loop = true;
        // A decoder that kept the encoder's padding: loop the music itself, not the silence around it.
        const extra = buf.duration - track.seconds;
        if (extra > 0.005) { s.loopStart = Math.min(extra, MP3_DELAY_S); s.loopEnd = s.loopStart + track.seconds; }
        s.start(t0, s.loopStart || 0);
        return p;
    }
    // A cut from a longer piece: each pass starts XFADE_S before the last one ends, queued a little ahead.
    const pass = buf.duration - XFADE_S;
    const queue = (at: number) => {
        source().start(at);
        const lead = (at + pass - ac.currentTime - 2) * 1000;
        p.timer = setTimeout(() => queue(at + pass), Math.max(0, lead));
    };
    queue(t0);
    return p;
}

function sync(): void {
    const ac = audioContext();
    const want = audible() && !isHidden() ? wanted : null;
    if (playing && playing.id !== want) {
        if (ac) fadeOut(playing, ac);
        playing = null;
    }
    if (!want || playing || !ac) return;
    load(ac, want).then(buf => {
        // Still wanted after the download, and nothing else started meanwhile.
        if (playing || wanted !== want || !audible() || isHidden() || audioContext() !== ac) return;
        playing = begin(ac, want, buf);
    }).catch(() => { /* no file, no music */ });
}

const isHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

// Once: follow the sound toggle, the first gesture (the AudioContext arrives) and a hidden tab.
function wire(): void {
    if (wired) return;
    wired = true;
    subscribeSound(sync);
    onSoundUnlock(sync);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', sync);
}

/** The game on screen wants this music (null = silence). Nothing loads while music or sound is off. */
export function setGameMusic(id: MusicId | null): void {
    wire();
    wanted = id;
    sync();
}

/** The game shell: music while `active` (a round being played), silence on the end screen and after leaving. */
export function useSpelMusic(id: MusicId | undefined, active: boolean): void {
    useEffect(() => {
        if (!id || !active) return;
        setGameMusic(id);
        return () => setGameMusic(null);
    }, [id, active]);
}

/** Test hook: forget the player, the cache and the stored choice. */
export function resetMusicForTests(): void {
    if (playing?.timer) clearTimeout(playing.timer);
    playing = null;
    wanted = null;
    buffers.clear();
    on = readOn();
}
