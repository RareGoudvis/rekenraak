import { INTERACT_SEP, type KioskAnswer, type KioskDescriptor, type OefenRun, type OefenSessie, type OefenStats, type OefenSummaryRow, type OefenTypeStats } from './types';
import { kioskFor, kioskInputOf, kioskInteractOf } from './kiosk';
import { exerciseKeyOf } from '../generateDispatch';
import { deadSlots, plannedTotal } from './scheduler';

// The pupil's results: accumulated per slot during a run, kept in this device's localStorage
// per session id (never the worksheet autosave), last MAX_RUNS runs.

export const MAX_RUNS = 5;
export const oefenStorageKey = (sessionId: string) => `rekenraak_oefen_${sessionId}`;

const emptyType = (): OefenTypeStats => ({ made: 0, correct: 0, wrong: 0, errors: [] });

export function emptyStats(s: OefenSessie, now: number = Date.now()): OefenStats {
    return { startedAt: now, perType: Object.fromEntries(s.types.map((_, i) => [i, emptyType()])), history: [] };
}

/** The answer as one line: '7 r 3' for quotiënt + rest, '8:05' for a time, '12 ; 15' for fields. */
export function answerText(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>, answer: KioskAnswer): string {
    const parts = Array.isArray(answer) ? answer.map(a => a.trim()) : [answer.trim()];
    const input = kioskInputOf(d, ex, c);
    if (input !== 'interactive' && d.showAnswer) return d.showAnswer(parts, ex, c);
    if (input === 'number+rest') return `${parts[0] ?? ''} r ${parts[1] ?? ''}`;
    if (input === 'number+unit') return `${parts[0] ?? ''} ${parts[1] ?? ''}`;
    if (input === 'time') return `${parts[0] ?? ''}:${(parts[1] ?? '').padStart(2, '0')}`;
    if (input === 'multi-number') return parts.join(' ; ');
    const ia = input === 'interactive' ? kioskInteractOf(d, c) : undefined;
    if (ia?.show) return ia.show(parts.join(' '), ex, c);
    return parts.join(' ');
}

/** The expected answer as the stats screen shows it: the first accepted spelling. */
export function expectedText(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>): string {
    const accepted = d.answerOf(ex, c);
    const input = kioskInputOf(d, ex, c);
    if (input !== 'interactive' && d.showAnswer) return d.showAnswer(input === 'multi-number' ? accepted.map(a => a.split('|')[0]) : accepted.slice(0, input === 'number+rest' || input === 'time' ? 2 : 1), ex, c);
    if (input === 'number+rest' || input === 'number+unit') return answerText(d, ex, c, accepted);
    // One field each, its first spelling.
    if (input === 'multi-number') return accepted.map(a => a.split('|')[0]).join(' ; ');
    const ia = input === 'interactive' ? kioskInteractOf(d, c) : undefined;
    if (ia) {
        const want = ia.answerOf(ex, c);
        if (ia.show) return ia.show(want, ex, c);
        // fill-cells: each cell's first spelling ('|1', a carry that may stay blank, shows blank).
        if (ia.kind === 'fill-cells') return want.split(INTERACT_SEP).map(p => p.split('|')[0]).join(INTERACT_SEP);
    }
    return accepted[0] ?? '';
}

// 2 kansen: a missed first try (firstWrong) always leaves an error row, juist na 2e kans too.
/** A new stats object with this final answer counted (and an error row when it was ever wrong). */
export function recordAnswer(
    stats: OefenStats, slot: number, typeId: string, exercise: unknown, given: KioskAnswer,
    correct: boolean, ms: number, constraints: Record<string, unknown>, now: number = Date.now(),
    firstWrong?: KioskAnswer,
): OefenStats {
    const prev = stats.perType[slot] ?? emptyType();
    const d = kioskFor(typeId);
    const retried = firstWrong !== undefined;
    const errors = (correct && !retried) || !d ? prev.errors : [...prev.errors, {
        exercise: d.display(exercise, constraints),
        given: answerText(d, exercise, constraints, retried ? firstWrong : given),
        expected: expectedText(d, exercise, constraints),
        at: now,
        ...(retried && { secondTry: correct }),
        ...(retried && !correct && { second: answerText(d, exercise, constraints, given) }),
    }];
    const secondTry = (prev.secondTry ?? 0) + (retried && correct ? 1 : 0);
    return {
        ...stats,
        perType: {
            ...stats.perType,
            [slot]: {
                made: prev.made + 1, correct: prev.correct + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1),
                ...(secondTry > 0 && { secondTry }), errors,
            },
        },
        history: [...stats.history, { slot, typeId, exerciseKey: exerciseKeyOf(typeId, exercise), correct, ms, ...(retried && { secondTry: true }) }],
    };
}

/** The types that can serve (a type whose settings generate nothing is retired for the run). */
export function viableTypes(s: OefenSessie): OefenSessie['types'] {
    const dead = deadSlots(s);
    return s.types.filter((_, i) => !dead.has(i));
}

/** The run's planned length without the retired types, or null when it has none. */
export const viablePlannedTotal = (s: OefenSessie): number | null => plannedTotal({ ...s, types: viableTypes(s) });

/** One row per type in session order, with percent correct. */
export function summary(stats: OefenStats, s: OefenSessie): OefenSummaryRow[] {
    // Driven by the session's types: slots a stored run has beyond them (an older edit) are ignored.
    return s.types.map((t, slot) => {
        const st = stats.perType[slot] ?? emptyType();
        return {
            slot, typeId: t.typeId, label: t.label,
            made: st.made, correct: st.correct, wrong: st.wrong, secondTry: st.secondTry ?? 0,
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
