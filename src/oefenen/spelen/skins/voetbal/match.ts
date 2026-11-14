// Voetbal's match, pure for the tests. The build-up is untimed: each right answer is a pass to the next polar
// bear, a wrong one lets a black bear tap the ball away (back to the own half). After PASSES passes the next sum
// is the shot, on its own clock (onMiss): right = a goal, wrong or too late = the keeper's catch. The match
// clock is the session's (round.seconds); at its half the skin holds it for the "Rust!" break.

export const VOETBAL = {
    // Passes before the shot (pass dots 1–4); the polar bears stand at spots 0..PASSES.
    passes: 4,
    // The shot's own countdown.
    shotMs: 10_000,
    // The half-time break: the match clock stands still meanwhile.
    rustMs: 2_000,
    // A hidden question cap, so a round always ends (the clock ends it first in practice).
    cap: 200,
    // How long the ball stays in the net, in the keeper's gloves or at the black bear before the kick-off.
    settleMs: 1_100,
    tapMs: 550,
} as const;

// What the last answer did, for the scene.
export type Play = 'pass' | 'tap' | 'goal' | 'save' | null;

export interface Match {
    // Passes in this attack (0..PASSES); PASSES = the striker has the ball and the sum on screen is the shot.
    passes: number;
    goals: number;
    saves: number;
    half: 1 | 2;
    last: Play;
    // Counts plays, so the same play twice in a row restarts its animation.
    n: number;
}

export const newMatch = (): Match => ({ passes: 0, goals: 0, saves: 0, half: 1, last: null, n: 0 });

/** The sum on screen is the shot (the striker has the ball). */
export const isShot = (m: Match) => m.passes >= VOETBAL.passes;

/** After a right or wrong answer (a missed shot is a wrong one). */
export function playOf(m: Match, correct: boolean): Match {
    const n = m.n + 1;
    if (isShot(m)) return correct
        ? { ...m, passes: 0, goals: m.goals + 1, last: 'goal', n }
        : { ...m, passes: 0, saves: m.saves + 1, last: 'save', n };
    return correct ? { ...m, passes: m.passes + 1, last: 'pass', n } : { ...m, passes: 0, last: 'tap', n };
}

/** The first half is over: half the match clock gone. */
export const halfTimeDue = (m: Match, msLeft: number | null, msTotal: number | null) =>
    m.half === 1 && msLeft !== null && !!msTotal && msLeft > 0 && msLeft <= msTotal / 2;

/** Shot clock: what is left after dt of play (never below 0). */
export const shotStep = (left: number, dt: number) => Math.max(0, left - Math.max(0, dt));

/** The end screen's lead: "IJsberen 4 doelpunten". */
export const goalsLine = (goals: number) => `IJsberen ${goals} ${goals === 1 ? 'doelpunt' : 'doelpunten'}`;

// The pupil's best match per card and length on this device (never shared). Storage may be blocked: try/catch.
export const VOETBAL_BEST_KEY = 'rekenraak_spel_voetbal';

function readAll(): Record<string, number> {
    try {
        const v: unknown = JSON.parse(globalThis.localStorage?.getItem(VOETBAL_BEST_KEY) ?? '{}');
        return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, number> : {};
    } catch { return {}; }
}

/** The most goals in one match for this key, 0 when none (or unreadable). */
export function loadBest(key: string): number {
    const n = readAll()[key];
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Keeps goals when it beats the best on this device. */
export function saveBest(key: string, goals: number): void {
    if (goals <= loadBest(key)) return;
    try { globalThis.localStorage?.setItem(VOETBAL_BEST_KEY, JSON.stringify({ ...readAll(), [key]: goals })); } catch { /* blocked: this match only */ }
}

export function wipeBest(key: string): void {
    try {
        const all = readAll();
        delete all[key];
        globalThis.localStorage?.setItem(VOETBAL_BEST_KEY, JSON.stringify(all));
    } catch { /* blocked: nothing kept anyway */ }
}
