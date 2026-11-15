// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { SKINS } from '../oefenen/spelen/skins/registry';
import { createSpelEvents, type SpelOutcome } from '../oefenen/spelen/events';
import {
    SOUND_KEY, SPEL_SOUNDS, cueSound, play, resetSoundForTests, setSoundOn, soundFor, soundOn, unlockSound, useSpelSounds, type SkinSounds,
} from '../oefenen/spelen/sound';

// Spelen sounds: on by default and kept per device (each test starts from a device that turned it off); silent when off, before a gesture or without Web Audio;
// each skin's events map to its own sound; the game shell voices them.

// A Web Audio stand-in that counts what a sound builds.
class FakeParam {
    value = 0;
    setValueAtTime() { return this; }
    exponentialRampToValueAtTime() { return this; }
    linearRampToValueAtTime() { return this; }
}
class FakeNode {
    connect<T>(n: T) { return n; }
}
const made = { contexts: 0, sources: 0 };
class FakeAudioContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = new FakeNode();
    constructor() { made.contexts++; }
    resume() { return Promise.resolve(); }
    createGain() { return Object.assign(new FakeNode(), { gain: new FakeParam() }); }
    createBiquadFilter() { return Object.assign(new FakeNode(), { type: '', frequency: new FakeParam(), Q: new FakeParam() }); }
    createOscillator() {
        made.sources++;
        return Object.assign(new FakeNode(), { type: '', frequency: new FakeParam(), start() { }, stop() { } });
    }
    createBuffer(_c: number, len: number, rate: number) { const d = new Float32Array(len); return { sampleRate: rate, getChannelData: () => d }; }
    createBufferSource() { made.sources++; return Object.assign(new FakeNode(), { buffer: null, start() { }, stop() { } }); }
}

const g = globalThis as unknown as { AudioContext?: unknown };
beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(SOUND_KEY, '0');
    made.contexts = 0;
    made.sources = 0;
    g.AudioContext = FakeAudioContext;
    resetSoundForTests();
});
afterEach(() => { cleanup(); delete g.AudioContext; vi.restoreAllMocks(); });

describe('Spelen sound', () => {
    test('on by default; the choice is kept per device', () => {
        localStorage.clear();
        resetSoundForTests();
        expect(soundOn()).toBe(true);
        setSoundOn(false);
        expect(localStorage.getItem(SOUND_KEY)).toBe('0');
        resetSoundForTests();
        expect(soundOn()).toBe(false);
        setSoundOn(true);
        expect(localStorage.getItem(SOUND_KEY)).toBe('1');
        resetSoundForTests();
        expect(soundOn()).toBe(true);
        setSoundOn(false);
        resetSoundForTests();
        expect(soundOn()).toBe(false);
    });

    test('storage that throws: on, and turning it off still works for this visit', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
        resetSoundForTests();
        expect(soundOn()).toBe(true);
        expect(() => setSoundOn(false)).not.toThrow();
        expect(soundOn()).toBe(false);
    });

    test('silent while off: no AudioContext is made, nothing plays', () => {
        unlockSound();
        for (const s of SPEL_SOUNDS) play(s);
        expect(made).toEqual({ contexts: 0, sources: 0 });
    });

    test('the AudioContext comes with the first gesture after sound is on, once; then every sound plays', () => {
        setSoundOn(true);
        // Turning it on is that gesture; a little sparkle confirms it.
        expect(made.contexts).toBe(1);
        expect(made.sources).toBeGreaterThan(0);
        unlockSound();
        expect(made.contexts).toBe(1);
        for (const s of SPEL_SOUNDS) {
            const before = made.sources;
            play(s);
            expect(made.sources, s).toBeGreaterThan(before);
        }
    });

    test('a stored "on" waits for a gesture before it makes the AudioContext', () => {
        localStorage.setItem(SOUND_KEY, '1');
        resetSoundForTests();
        play('pop');
        expect(made).toEqual({ contexts: 0, sources: 0 });
        unlockSound();
        play('pop');
        expect(made.contexts).toBe(1);
        expect(made.sources).toBeGreaterThan(0);
    });

    test('no Web Audio: turning sound on and playing never throw', () => {
        delete g.AudioContext;
        expect(() => { setSoundOn(true); unlockSound(); for (const s of SPEL_SOUNDS) play(s); }).not.toThrow();
        g.AudioContext = class { constructor() { throw new Error('not allowed'); } };
        resetSoundForTests();
        expect(() => { unlockSound(); play('pop'); }).not.toThrow();
    });

    test('each skin maps its events to its own sounds', () => {
        const cues = (id: string): SkinSounds | undefined => SKINS.find(s => s.meta.id === id)!.meta.sounds;
        const right = { given: '12', streak: 1 };
        const wrong = { given: '11', expected: '12' };
        const miss = { given: '', expected: '12' };
        expect(soundFor(cues('ballonnen'), 'correct', right)).toBe('pop');
        expect(soundFor(cues('ballonnen'), 'wrong', wrong)).toBe('pfff');
        expect(soundFor(cues('pinguintoren'), 'correct', right)).toBe('plok');
        // Pinguïntoren voices its own mistakes: a crack, the splash of a break, or a plop.
        expect(soundFor(cues('pinguintoren'), 'wrong', wrong)).toBeNull();
        expect(cueSound(cues('pinguintoren'), 'barricade')).toBe('krak');
        expect(cueSound(cues('pinguintoren'), 'hit')).toBe('splash');
        expect(cueSound(cues('pinguintoren'), 'miss')).toBe('plop');
        expect(soundFor(cues('zombies'), 'correct', right)).toBe('poef');
        expect(soundFor(cues('zombies'), 'wrong', wrong)).toBe('plop');
        // A zombie through: the skin voices the barricade or the catch itself (cueSound), the session stays quiet.
        expect(soundFor(cues('zombies'), 'wrong', miss)).toBeNull();
        expect(cueSound(cues('zombies'), 'barricade')).toBe('krak');
        expect(cueSound(cues('zombies'), 'caught')).toBe('wahwah');
        expect(soundFor(cues('bom'), 'correct', right)).toBe('snip');
        expect(soundFor(cues('bever'), 'wrong', wrong)).toBe('whoosh');
        // How a round ended: a cheer for a win, a soft PUF for the bomb's time up, never a buzzer for a fail.
        const end = (outcome: SpelOutcome) => ({ score: 1, bestStreak: 1, mistakes: 0, helped: 0, outcome });
        expect(soundFor(cues('bom'), 'end', end('won'))).toBe('cheer');
        expect(soundFor(cues('bom'), 'end', end('lost'))).toBe('puf');
        expect(soundFor(cues('bever'), 'end', end('failed'))).toBe('blub');
        expect(soundFor(cues('zombies'), 'end', end('failed'))).toBe('wahwah');
        expect(soundFor(cues('ballonnen'), 'end', end('done'))).toBe('jingle');
        // Shared by every game: a sparkle every 5 in a row, the jingle at the end, nothing for help or time up.
        for (const { meta } of SKINS) {
            expect(soundFor(meta.sounds, 'streak', { count: 5 })).toBe('sparkle');
            expect(soundFor(meta.sounds, 'streak', { count: 10 })).toBe('sparkle');
            expect(soundFor(meta.sounds, 'streak', { count: 4 })).toBeNull();
            expect(soundFor(meta.sounds, 'streak', { count: 0 })).toBeNull();
            expect(soundFor(meta.sounds, 'end', { score: 1, bestStreak: 1, mistakes: 0, helped: 0, outcome: 'done' })).toBe('jingle');
            expect(soundFor(meta.sounds, 'help', {})).toBeNull();
            expect(soundFor(meta.sounds, 'timeUp', {})).toBeNull();
        }
        // A skin without cues gets the defaults.
        expect(soundFor(undefined, 'correct', right)).toBe('pop');
    });

    test('the shell voices the session events, only when sound is on; a tap wakes the AudioContext', () => {
        const events = createSpelEvents();
        function Shell() { useSpelSounds(events, { correct: 'plok' }); return null; }
        render(<Shell />);
        act(() => events.emit('correct', { given: '1', streak: 1 }));
        expect(made.sources).toBe(0);
        localStorage.setItem(SOUND_KEY, '1');
        resetSoundForTests();
        cleanup();
        render(<Shell />);
        act(() => { window.dispatchEvent(new Event('pointerdown')); });
        expect(made.contexts).toBe(1);
        act(() => events.emit('correct', { given: '1', streak: 1 }));
        expect(made.sources).toBeGreaterThan(0);
    });
});
