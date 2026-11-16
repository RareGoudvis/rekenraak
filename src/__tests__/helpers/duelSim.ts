import { vi } from 'vitest';
import { useDuelStore } from '../../oefenen/spelen/duel/duelStore';
import type { DuelConfig, DuelLevel, DuelRule, DuelStream, Side } from '../../oefenen/spelen/duel/types';
import type { SkinMeta } from '../../oefenen/spelen/skins/types';
import type { SpelFrom } from '../../oefenen/spelen/useSpelStore';

// A simulated pupil on the left against the real bot on the right, through the real duel store (every rule,
// flight, lock and clock as in a match). Needs fake timers (setTimeout + Date). Seeded: same numbers every run.

export interface KidModel { minMs: number; maxMs: number; pRight: number }

// The child models the bot is tuned against (owner 2026-11-16): a 9-year-old, a slower and a fast pupil.
export const KIDS = {
    slower: { minMs: 6_000, maxMs: 9_000, pRight: 0.75 },
    average: { minMs: 4_000, maxMs: 7_000, pRight: 0.85 },
    fast: { minMs: 2_000, maxMs: 4_000, pRight: 0.95 },
} as const satisfies Record<string, KidModel>;

/** mulberry32: a small seeded generator. */
export function mulberry32(seed: number) {
    return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

const wrongAnswer = (a: string) => (/^\d+$/.test(a) ? String(Number(a) + 1) : `${a}9`);

export interface SimSpec {
    meta: SkinMeta;
    from: SpelFrom;
    rule: DuelRule;
    level: DuelLevel;
    kid: KidModel;
    rounds: number;
    seed?: number;
    lives?: number;
    stream?: DuelStream;
    extra?: Partial<DuelConfig>;
    // A round longer than this (simulated) is cut off as a draw.
    maxRoundMs?: number;
}

/** Plays `rounds` single rounds (best of 1); returns the share the pupil won (draws count half) and the draws. */
export function simulateRounds(spec: SimSpec): { kidWins: number; draws: number } {
    const du = () => useDuelStore.getState();
    const rnd = mulberry32(spec.seed ?? 42);
    let won = 0, draws = 0;
    for (let r = 0; r < spec.rounds; r++) {
        let pending: ReturnType<typeof setTimeout> | null = null;
        let waitingFor = '';
        // The pupil answers each new sum (and after a lock lifts) after a draw from its pace.
        const unsub = useDuelStore.subscribe(st => {
            const me = st.sides.left;
            const q = me.question;
            const ready = st.phase === 'play' && !st.paused && q && !me.feedback && !me.locked && !me.out;
            const key = ready ? `${q!.key}:${me.tries}:${me.shownAt}` : '';
            if (key === waitingFor) return;
            if (pending) clearTimeout(pending);
            pending = null;
            waitingFor = key;
            if (!ready) return;
            const delay = spec.kid.minMs + (spec.kid.maxMs - spec.kid.minMs) * rnd();
            const right = rnd() < spec.kid.pRight;
            pending = setTimeout(() => {
                pending = null;
                const cur = du().sides.left.question;
                if (cur) du().answer('left', right ? cur.answer : wrongAnswer(cur.answer));
            }, delay);
        });
        du().begin({
            meta: spec.meta, from: spec.from, rule: spec.rule,
            config: { players: 1, level: spec.level, lives: spec.lives ?? 5, bestOf: 1, stream: spec.stream ?? 'own', readyMs: 0, rng: rnd, ...spec.extra },
        });
        const cap = spec.maxRoundMs ?? 15 * 60_000;
        for (let t = 0; t < cap && du().phase === 'play'; t += 1000) vi.advanceTimersByTime(1000);
        const w: Side | 'draw' | null = du().phase === 'play' ? 'draw' : du().roundWinner;
        unsub();
        if (pending) clearTimeout(pending);
        du().stop();
        if (w === 'left') won++;
        else if (w === 'draw') { draws++; won += 0.5; }
    }
    return { kidWins: won / spec.rounds, draws };
}
