import type { KioskAnswer, KioskDescriptor, OefenRun, OefenSessie, OefenStats, OefenSummaryRow, OefenTypeStats } from './types';
import { kioskFor, kioskInputOf } from './kiosk';
import { exerciseKeyOf } from '../generateDispatch';

// The pupil's results: accumulated per slot during a run, kept in this device's localStorage
// per session id (never the worksheet autosave), last MAX_RUNS runs.

export const MAX_RUNS = 5;
export const oefenStorageKey = (sessionId: string) => `rekenraak_oefen_${sessionId}`;

const emptyType = (): OefenTypeStats => ({ made: 0, correct: 0, wrong: 0, errors: [] });

export function emptyStats(s: OefenSessie, now: number = Date.now()): OefenStats {
    return { startedAt: now, perType: Object.fromEntries(s.types.map((_, i) => [i, emptyType()])), history: [] };
}

/** The answer as one line: '7 r 3' for quotiënt + rest. */
export function answerText(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, answer: KioskAnswer): string {
    const parts = Array.isArray(answer) ? answer.map(a => a.trim()) : [answer.trim()];
    return kioskInputOf(d, ex, c) === 'number+rest' ? `${parts[0] ?? ''} r ${parts[1] ?? ''}` : parts.join(' ');
}

/** The expected answer as the stats screen shows it: the first accepted spelling. */
export function expectedText(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>): string {
    const accepted = d.answerOf(ex, c);
    return kioskInputOf(d, ex, c) === 'number+rest' ? answerText(d, ex, c, accepted) : (accepted[0] ?? '');
}

/** A new stats object with this answer counted (and kept as an error row when wrong). */
export function recordAnswer(
    stats: OefenStats, slot: number, typeId: string, exercise: unknown, given: KioskAnswer,
    correct: boolean, ms: number, constraints: Record<string, unknown>, now: number = Date.now(),
): OefenStats {
    const prev = stats.perType[slot] ?? emptyType();
    const d = kioskFor(typeId);
    const errors = correct || !d ? prev.errors : [...prev.errors, {
        exercise: d.display(exercise, constraints),
        given: answerText(d, exercise, constraints, given),
        expected: expectedText(d, exercise, constraints),
        at: now,
    }];
    return {
        ...stats,
        perType: {
            ...stats.perType,
            [slot]: { made: prev.made + 1, correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1), errors },
        },
        history: [...stats.history, { slot, typeId, exerciseKey: exerciseKeyOf(typeId, exercise), correct, ms }],
    };
}

/** One row per type in session order, with percent correct. */
export function summary(stats: OefenStats, s: OefenSessie): OefenSummaryRow[] {
    return s.types.map((t, slot) => {
        const st = stats.perType[slot] ?? emptyType();
        return {
            slot, typeId: t.typeId, label: t.label,
            made: st.made, correct: st.correct, wrong: st.wrong,
            pct: st.made ? Math.round((st.correct / st.made) * 100) : null,
            errors: st.errors,
        };
    });
}

// ── Persistence ──────────────────────────────────────────────────────────────

interface StoredRuns { v: 1; runs: OefenRun[] }

const isRun = (r: unknown): r is OefenRun =>
    !!r && typeof r === 'object' && typeof (r as OefenRun).index === 'number'
    && !!(r as OefenRun).stats && Array.isArray((r as OefenRun).stats.history);

/** This device's runs for the session, oldest first; [] when none or unreadable. */
export function loadRuns(sessionId: string): OefenRun[] {
    try {
        const raw = localStorage.getItem(oefenStorageKey(sessionId));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as Partial<StoredRuns>;
        return Array.isArray(parsed.runs) ? parsed.runs.filter(isRun) : [];
    } catch { return []; }
}

/** Index for a fresh run ("Opnieuw"). */
export const nextRunIndex = (runs: readonly OefenRun[]) => runs.reduce((m, r) => Math.max(m, r.index + 1), 0);

/** Stores the run (replacing the one with its index), keeping the last MAX_RUNS. False when storage refused it. */
export function saveRun(sessionId: string, run: OefenRun): boolean {
    let runs = [...loadRuns(sessionId).filter(r => r.index !== run.index), run].sort((a, b) => a.index - b.index).slice(-MAX_RUNS);
    // A full storage quota drops the oldest runs first; the current one is the last to go.
    while (runs.length > 0) {
        try {
            localStorage.setItem(oefenStorageKey(sessionId), JSON.stringify({ v: 1, runs } satisfies StoredRuns));
            return true;
        } catch {
            if (runs.length === 1) return false;
            runs = runs.filter(r => r !== run).slice(1).concat(run);
        }
    }
    return false;
}

export function clearRuns(sessionId: string): void {
    try { localStorage.removeItem(oefenStorageKey(sessionId)); } catch { /* storage blocked: nothing to clear */ }
}
