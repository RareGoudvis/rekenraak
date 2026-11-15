// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SKINS } from '../oefenen/spelen/skins/registry';
import { SOUND_KEY, resetSoundForTests, setSoundOn, unlockSound } from '../oefenen/spelen/sound';
import {
    MUSIC_IDS, MUSIC_KEY, NEXT_LEVEL, levelOf, MUSIC_TRACKS, XFADE_S, musicOn, musicUrl, resetMusicForTests, setGameMusic, setMusicOn, useSpelMusic, type MusicId,
} from '../oefenen/spelen/music';
import SoundToggle from '../oefenen/spelen/SoundToggle';

// Spelen music: off by default, only with sound on, fetched lazily per atmosphere, looped, faded, stopped on
// the end screen, on leaving and while the tab is hidden.

class FakeParam {
    value = 0;
    setValueAtTime(v: number) { this.value = v; return this; }
    linearRampToValueAtTime(v: number) { this.value = v; return this; }
    exponentialRampToValueAtTime(v: number) { this.value = v; return this; }
    cancelScheduledValues() { return this; }
}
class FakeNode {
    connect<T>(n: T) { return n; }
    disconnect() { }
}
interface FakeSource { buffer: unknown; loop: boolean; loopStart: number; loopEnd: number; started: number[]; stopped: boolean; onended: null | (() => void) }
const log = { sources: [] as FakeSource[], decoded: 0 };
class FakeAudioContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = new FakeNode();
    resume() { return Promise.resolve(); }
    createGain() { return Object.assign(new FakeNode(), { gain: new FakeParam() }); }
    createBiquadFilter() { return Object.assign(new FakeNode(), { type: '', frequency: new FakeParam(), Q: new FakeParam() }); }
    createOscillator() { return Object.assign(new FakeNode(), { type: '', frequency: new FakeParam(), start() { }, stop() { } }); }
    createBuffer(_c: number, len: number, rate: number) { const d = new Float32Array(len); return { sampleRate: rate, getChannelData: () => d }; }
    createBufferSource() {
        const s: FakeSource & FakeNode = Object.assign(new FakeNode(), {
            buffer: null, loop: false, loopStart: 0, loopEnd: 0, started: [] as number[], stopped: false, onended: null,
            start(at: number) { s.started.push(at); }, stop() { s.stopped = true; },
        });
        log.sources.push(s);
        return s;
    }
    decodeAudioData(data: ArrayBuffer) { log.decoded++; return Promise.resolve({ duration: (data as unknown as { seconds: number }).seconds }); }
}

const g = globalThis as unknown as { AudioContext?: unknown };
let fetched: string[] = [];
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const music = () => log.sources.filter(s => s.buffer);
const playingNow = () => music().filter(s => !s.stopped);

beforeEach(() => {
    localStorage.clear();
    // Each test starts from a device that turned both off (the default is on).
    localStorage.setItem(SOUND_KEY, '0');
    localStorage.setItem(MUSIC_KEY, '0');
    log.sources = [];
    log.decoded = 0;
    fetched = [];
    g.AudioContext = FakeAudioContext;
    vi.stubGlobal('fetch', vi.fn((url: string) => {
        fetched.push(url);
        const id = /music\/(\w+)\.mp3$/.exec(url)?.[1] as MusicId;
        // The decoded length: a seamless loop with the encoder's padding kept, a cut at its own length.
        const seconds = MUSIC_TRACKS[id].seconds + (MUSIC_TRACKS[id].loop === 'seamless' ? 0.05 : 0);
        return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve({ seconds }) });
    }));
    resetSoundForTests();
    resetMusicForTests();
});
afterEach(() => {
    setGameMusic(null);
    cleanup();
    delete g.AudioContext;
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('Spelen music', () => {
    test('on by default and kept per device', () => {
        localStorage.clear();
        resetMusicForTests();
        expect(musicOn()).toBe(true);
        setMusicOn(false);
        resetMusicForTests();
        expect(musicOn()).toBe(false);
        setMusicOn(true);
        expect(localStorage.getItem(MUSIC_KEY)).toBe('1');
        resetMusicForTests();
        expect(musicOn()).toBe(true);
    });

    test('nothing loads while music is off, or while sound is off', async () => {
        setSoundOn(true);
        setGameMusic('weide');
        await flush();
        expect(fetched).toEqual([]);
        setSoundOn(false);
        setMusicOn(true);
        setGameMusic('weide');
        unlockSound();
        await flush();
        expect(fetched).toEqual([]);
        expect(music()).toEqual([]);
    });

    test('lazy: only the game\'s own track, fetched once, when the game starts with music on', async () => {
        setMusicOn(true);
        setSoundOn(true);
        await flush();
        expect(fetched).toEqual([]);
        setGameMusic('ijs');
        await flush();
        expect(fetched).toEqual([musicUrl('ijs')]);
        expect(playingNow()).toHaveLength(1);
        setGameMusic(null);
        setGameMusic('ijs');
        await flush();
        // The second game with the same atmosphere reuses the decoded file.
        expect(fetched).toHaveLength(1);
        expect(log.decoded).toBe(1);
    });

    test('a stored "on" waits for the first gesture (the AudioContext) before it loads', async () => {
        localStorage.setItem(MUSIC_KEY, '1');
        localStorage.setItem('rekenraak_spelen_geluid_v1', '1');
        resetSoundForTests();
        resetMusicForTests();
        setGameMusic('zee');
        await flush();
        expect(fetched).toEqual([]);
        unlockSound();
        await flush();
        expect(fetched).toEqual([musicUrl('zee')]);
        expect(playingNow()).toHaveLength(1);
    });

    test('a seamless track loops on itself and skips padding a decoder kept', async () => {
        setMusicOn(true);
        setSoundOn(true);
        setGameMusic('kasteel');
        await flush();
        const [s] = playingNow();
        expect(s.loop).toBe(true);
        expect(s.loopStart).toBeGreaterThan(0);
        expect(s.loopEnd - s.loopStart).toBeCloseTo(MUSIC_TRACKS.kasteel.seconds, 3);
    });

    test('a cut from a longer piece queues its next pass to overlap the end', async () => {
        vi.useFakeTimers();
        setMusicOn(true);
        setSoundOn(true);
        setGameMusic('weide');
        await flush();
        expect(playingNow()).toHaveLength(1);
        expect(playingNow()[0].loop).toBe(false);
        vi.advanceTimersByTime(MUSIC_TRACKS.weide.seconds * 1000);
        const [a, b] = music();
        expect(b.started[0] - a.started[0]).toBeCloseTo(MUSIC_TRACKS.weide.seconds - XFADE_S, 3);
    });

    test('stops on the end screen and on leaving; turning sound off stops it too', async () => {
        setMusicOn(true);
        setSoundOn(true);
        function Shell({ active }: { active: boolean }) { useSpelMusic('gek', active); return null; }
        const view = render(<Shell active />);
        await flush();
        expect(playingNow()).toHaveLength(1);
        view.rerender(<Shell active={false} />);
        expect(playingNow()).toHaveLength(0);
        view.rerender(<Shell active />);
        await flush();
        expect(playingNow()).toHaveLength(1);
        view.unmount();
        expect(playingNow()).toHaveLength(0);
        render(<Shell active />);
        await flush();
        expect(playingNow()).toHaveLength(1);
        setSoundOn(false);
        expect(playingNow()).toHaveLength(0);
    });

    test('a hidden tab silences it; coming back plays it again', async () => {
        setMusicOn(true);
        setSoundOn(true);
        setGameMusic('race');
        await flush();
        const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(playingNow()).toHaveLength(0);
        vis.mockReturnValue('visible');
        document.dispatchEvent(new Event('visibilitychange'));
        await flush();
        expect(playingNow()).toHaveLength(1);
        expect(fetched).toHaveLength(1);
    });

    test('a failed download stays silent and may try again next game', async () => {
        setMusicOn(true);
        setSoundOn(true);
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));
        setGameMusic('sport');
        await flush();
        expect(music()).toEqual([]);
        setGameMusic(null);
        setGameMusic('sport');
        await flush();
        expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    });
});

describe('The speaker cycles Uit, Geluid, Geluid + muziek', () => {
    test('the cycle', () => {
        expect(levelOf(false, true)).toBe('uit');
        expect(NEXT_LEVEL.uit).toBe('geluid');
        expect(NEXT_LEVEL.geluid).toBe('muziek');
        expect(NEXT_LEVEL.muziek).toBe('uit');
    });

    test('three taps go round and are remembered', () => {
        render(<SoundToggle />);
        fireEvent.click(screen.getByRole('button', { name: 'Geluid uit' }));
        expect(localStorage.getItem(MUSIC_KEY)).toBe('0');
        fireEvent.click(screen.getByRole('button', { name: 'Geluid aan' }));
        expect(localStorage.getItem(MUSIC_KEY)).toBe('1');
        expect(screen.getByRole('button', { name: 'Geluid en muziek aan' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Geluid en muziek aan' }));
        expect(screen.getByRole('button', { name: 'Geluid uit' }).getAttribute('aria-pressed')).toBe('false');
        expect(musicOn()).toBe(false);
    });
});

describe('The tracks', () => {
    const dir = join(process.cwd(), 'public', 'spelen', 'music');
    test('every skin names a track; every track has its file (≤ 1 MB, ≤ 8 MB together) and a credit', () => {
        for (const s of SKINS) expect(MUSIC_IDS, s.meta.id).toContain(s.meta.music);
        const credits = readFileSync(join(dir, 'CREDITS.md'), 'utf8');
        let total = 0;
        for (const id of MUSIC_IDS) {
            const size = statSync(join(dir, `${id}.mp3`)).size;
            expect(size, id).toBeLessThanOrEqual(1024 * 1024);
            total += size;
            expect(credits, id).toContain(`${id}.mp3`);
        }
        expect(total).toBeLessThanOrEqual(8 * 1024 * 1024);
    });
});
