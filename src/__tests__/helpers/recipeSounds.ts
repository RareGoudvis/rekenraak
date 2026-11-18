import { expect } from 'vitest';
import { SOUND_KEY, resetSoundForTests, setSoundOn } from '../../oefenen/spelen/sound';

// A game's own sound recipes (sound.ts tone / noise) under a fake AudioContext: each one makes nodes while the
// sound is on, none while it is off. Needs localStorage (jsdom).

export function expectRecipesPlay<N extends string>(names: readonly N[], play: (name: N) => void): void {
    class Param { setValueAtTime() { } exponentialRampToValueAtTime() { } linearRampToValueAtTime() { } value = 0; }
    class Node { connect<T>(n: T) { return n; } }
    let made = 0;
    class Ctx {
        state = 'running'; currentTime = 0; sampleRate = 8000; destination = new Node();
        resume() { return Promise.resolve(); }
        createGain() { return Object.assign(new Node(), { gain: new Param() }); }
        createBiquadFilter() { return Object.assign(new Node(), { type: '', frequency: new Param(), Q: new Param() }); }
        createOscillator() { made++; return Object.assign(new Node(), { type: '', frequency: new Param(), start() { }, stop() { } }); }
        createBuffer(_c: number, len: number, rate: number) { const d = new Float32Array(len); return { sampleRate: rate, getChannelData: () => d }; }
        createBufferSource() { made++; return Object.assign(new Node(), { buffer: null, start() { }, stop() { } }); }
    }
    const g = globalThis as unknown as { AudioContext?: unknown };
    g.AudioContext = Ctx;
    localStorage.setItem(SOUND_KEY, '0');
    resetSoundForTests();
    setSoundOn(true);
    for (const s of names) {
        const before = made;
        play(s);
        expect(made, s).toBeGreaterThan(before);
    }
    setSoundOn(false);
    const before = made;
    play(names[0]);
    expect(made).toBe(before);
    delete g.AudioContext;
    resetSoundForTests();
}
