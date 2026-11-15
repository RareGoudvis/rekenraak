// Pure logic for Eieren zoeken: how each egg looks this question, and what state each egg is in.

export const PATTERNS = ['zigzag', 'dots', 'stripes', 'waves', 'stars', 'flowers', 'diamonds', 'bunting'] as const;
export type EggPattern = typeof PATTERNS[number];
// How many shell colours the css offers (--egg-c0..7, pastel) and their strong twins (--egg-s0..7).
export const EGG_COLOURS = 8;

export interface EggLook { pattern: EggPattern; base: number; accent: number }

function hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}
function rng(seed: number): () => number {
    let a = seed;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffled<T>(items: readonly T[], r: () => number): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
}

/** Nine different-looking eggs per question: patterns and shell colours are shuffled, never the same two side by side. */
export function eggLooks(seed: string, n = 9): EggLook[] {
    const r = rng(hash(seed));
    const patterns = shuffled(PATTERNS, r);
    const colours = shuffled(Array.from({ length: EGG_COLOURS }, (_, k) => k), r);
    return Array.from({ length: n }, (_, i) => {
        const base = colours[(i + Math.floor(i / EGG_COLOURS) * 3) % EGG_COLOURS];
        // The accent is never the shell's own colour, so the pattern always shows.
        const accent = (base + 2 + Math.floor(r() * (EGG_COLOURS - 3))) % EGG_COLOURS;
        return { pattern: patterns[i % PATTERNS.length], base, accent };
    });
}

export type EggState = 'idle' | 'chick' | 'empty' | 'answer' | 'rest';

/** A right egg holds a chick; a wrong one opens empty; the right egg then glows and the others rest. */
export function eggState(i: number, phase: string, picked: number | null, answer: number, correct: boolean | undefined): EggState {
    const flash = phase === 'right' || phase === 'wrong';
    if (!flash) return 'idle';
    if (picked === i) return correct ? 'chick' : 'empty';
    if (i === answer && !correct) return 'answer';
    return 'rest';
}
