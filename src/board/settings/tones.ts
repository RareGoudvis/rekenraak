// Classroom signal tones, synthesised with WebAudio so nothing ships as an audio file and the
// board keeps working offline. Every caller is optional: no AudioContext (jsdom, an old
// browser, autoplay refused) simply means silence.

export const TONES = ['bel', 'gong', 'piep', 'xylofoon', 'zacht'] as const;
export type Tone = typeof TONES[number];
export const TONE_LABELS: Record<Tone, string> = {
    bel: 'Bel', gong: 'Gong', piep: 'Piep', xylofoon: 'Xylofoon', zacht: 'Zacht',
};

// Each note: frequency (Hz), start offset (s), length (s), waveform.
type Note = [number, number, number, OscillatorType];
const SCORES: Record<Tone, Note[]> = {
    bel: [[1318, 0, 0.9, 'sine'], [1975, 0, 0.6, 'sine']],
    gong: [[196, 0, 2.2, 'sine'], [294, 0, 1.6, 'triangle']],
    piep: [[880, 0, 0.18, 'square'], [880, 0.28, 0.18, 'square']],
    xylofoon: [[784, 0, 0.3, 'triangle'], [988, 0.18, 0.3, 'triangle'], [1175, 0.36, 0.5, 'triangle']],
    zacht: [[523, 0, 0.8, 'sine']],
};
const SCORE_LEN: Record<Tone, number> = { bel: 1.0, gong: 2.3, piep: 0.5, xylofoon: 0.9, zacht: 0.9 };

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
    try {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        ctx ??= new Ctor();
        if (ctx.state === 'suspended') void ctx.resume();
        return ctx;
    } catch {
        return null;
    }
}

export function playTone(tone: Tone, repeat = 1, volume = 0.25): void {
    const ac = audio();
    if (!ac) return;
    const t0 = ac.currentTime + 0.02;
    for (let r = 0; r < repeat; r++) {
        const base = t0 + r * (SCORE_LEN[tone] + 0.25);
        for (const [freq, at, len, type] of SCORES[tone]) {
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            // Fast attack + exponential decay: a struck sound instead of a click-edged beep.
            gain.gain.setValueAtTime(0.0001, base + at);
            gain.gain.exponentialRampToValueAtTime(volume, base + at + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, base + at + len);
            osc.connect(gain).connect(ac.destination);
            osc.start(base + at);
            osc.stop(base + at + len + 0.05);
        }
    }
}
