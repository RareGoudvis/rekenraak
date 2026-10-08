import { create } from 'zustand';
import type { KioskAnswer, KioskInput, OefenCurrent, OefenRun, OefenSessie } from '../services/oefenen/types';
import { decodeSessie } from '../services/oefenen/session';
import { isDone, nextExercise, nextType } from '../services/oefenen/scheduler';
import { clearRuns, emptyStats, loadRuns, nextRunIndex, recordAnswer, saveRun } from '../services/oefenen/stats';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInputOf } from '../services/oefenen/kiosk';

// The pupil kiosk's own store. It never imports the worksheet store or autosave: the only
// thing it writes is this session's runs, through saveRun (localStorage per session id).

// start = confirm screen · exercise = answering · feedback = juist/fout shown ·
// stats = Stats opened mid-run · locked = the run ended (timer or done), stats as end screen.
export type OefenPhase = 'start' | 'exercise' | 'feedback' | 'stats' | 'locked';

// The exercise on screen plus the constraints it was generated with: answerOf / display /
// checkAnswer must get exactly those, and a reload must too, so they travel in the run.
export type KioskCurrent = OefenCurrent & { constraints: Record<string, unknown> };

// Typed answers stay short: no answer the starter types ask for is longer, and a longer
// string would overflow the answer field on a phone.
const MAX_CHARS = 12;

interface OefenState {
    sessie: OefenSessie | null;
    error: string | null;
    phase: OefenPhase;
    run: OefenRun | null;
    // The exercise on the card. The run's `current` is cleared once answered (a reload must not
    // count it twice), but the card keeps showing it under the feedback.
    shown: KioskCurrent | null;
    // One entry per answer field: [answer] or [quotiënt, rest]; a choice sits in [0].
    input: string[];
    field: number;
    lastCorrect: boolean | null;
    // Where closeStats returns to.
    statsFrom: 'exercise' | 'feedback';

    load(hash: string): void;
    start(): void;
    next(): void;
    press(key: string): void;
    setField(i: number, raw: string): void;
    focusField(i: number): void;
    choose(choice: string): void;
    answer(): void;
    openStats(): void;
    closeStats(): void;
    restart(): void;
    clear(): void;
    tick(now?: number): void;
}

const currentOf = (run: OefenRun | null): KioskCurrent | null => (run?.current as KioskCurrent | undefined) ?? null;

export interface CurrentInput {
    kind: KioskInput;
    keys: string[];
    choices: string[];
    // One placeholder per answer field (its count is the field count).
    labels: string[];
}

const FIXED_LABELS: Partial<Record<KioskInput, string[]>> = {
    'number+rest': ['quotiënt', 'rest'], time: ['uur', 'min'], 'missing-operand': ['Wat ontbreekt?'], text: ['Antwoord'],
};

/** The input kind, extra keypad keys, choices and field labels for the exercise on the card. */
export function currentInput(s: OefenSessie | null, cur: KioskCurrent | null): CurrentInput | null {
    if (!s || !cur) return null;
    const d = kioskFor(s.types[cur.slot]?.typeId ?? '');
    if (!d) return null;
    const kind = kioskInputOf(d, cur.exercise, cur.constraints);
    const choices = d.choicesOf?.(cur.exercise, cur.constraints) ?? d.choices ?? [];
    let labels = FIXED_LABELS[kind] ?? ['Antwoord'];
    if (kind === 'multi-number') {
        // Only the field COUNT is read from the answer, never a value.
        const n = d.answerOf(cur.exercise, cur.constraints).length;
        const named = d.labels?.(cur.exercise, cur.constraints) ?? [];
        labels = Array.from({ length: n }, (_, i) => named[i] ?? `${i + 1}`);
    }
    return { kind, keys: d.keys?.(cur.constraints) ?? [], choices, labels };
}

const fieldsFor = (info: CurrentInput | null) => (info?.kind === 'choice' ? [''] : (info?.labels ?? ['']).map(() => ''));

// Keeps what the field may hold: digits plus this type's extra keys; '.' types as ','.
// A text field takes letters and spaces; a time field two digits.
export function sanitizeAnswer(raw: string, keys: readonly string[], kind: KioskInput = 'number'): string {
    if (kind === 'text') return raw.replace(/[^\p{L}\s]/gu, '').slice(0, MAX_CHARS + 4);
    let out = '';
    for (const ch0 of raw) {
        const ch = ch0 === '.' && keys.includes(',') ? ',' : ch0;
        if ((ch >= '0' && ch <= '9') || (kind !== 'time' && keys.includes(ch))) out += ch;
    }
    return out.slice(0, kind === 'time' ? 2 : MAX_CHARS);
}

export const useOefenStore = create<OefenState>()((set, get) => {
    const persist = (run: OefenRun) => {
        const s = get().sessie;
        if (s) saveRun(s.id, run);
    };

    // Ends the run: the timer ran out or every exercise is made. The end screen is the stats.
    const finish = (run: OefenRun, now = Date.now()) => {
        const done: OefenRun = { ...run, done: true, current: undefined, stats: { ...run.stats, finishedAt: run.stats.finishedAt ?? now } };
        persist(done);
        set({ run: done, shown: null, phase: 'locked', input: [''], field: 0, lastCorrect: null });
    };

    const timeUp = (run: OefenRun, now: number) => run.timerEndsAt !== undefined && now >= run.timerEndsAt;

    const newRun = (s: OefenSessie, now: number): OefenRun => {
        return {
            index: nextRunIndex(loadRuns(s.id)), done: false,
            stats: emptyStats(s, now),
            ...(s.timerMin ? { timerEndsAt: now + s.timerMin * 60_000 } : {}),
        };
    };

    return {
        sessie: null,
        error: null,
        phase: 'start',
        run: null,
        shown: null,
        input: [''],
        field: 0,
        lastCorrect: null,
        statsFrom: 'exercise',

        load(hash) {
            // No payload at all is not an error message, just the "open the link" screen.
            if (!/^#?oefen=/.test(hash)) { set({ sessie: null, run: null, shown: null, error: null }); return; }
            let s: OefenSessie;
            try {
                s = decodeSessie(hash);
            } catch (e) {
                set({ sessie: null, run: null, error: e instanceof Error ? e.message : 'Deze oefenlink is ongeldig.' });
                return;
            }
            set({ sessie: s, error: null, run: null, shown: null, phase: 'start', input: [''], field: 0, lastCorrect: null });
            const runs = loadRuns(s.id);
            const last = runs.length ? runs.reduce((a, b) => (b.index > a.index ? b : a)) : null;
            if (!last) return;
            // A finished run reopens on its end screen: reloading must not hide the stats.
            if (last.done) { set({ run: last, phase: 'locked' }); return; }
            const now = Date.now();
            if (timeUp(last, now)) { set({ run: last }); finish(last, now); return; }
            set({ run: last });
            const cur = currentOf(last);
            if (cur) set({ shown: cur, phase: 'exercise', input: fieldsFor(currentInput(s, cur)), field: 0 });
            else get().next();
        },

        start() {
            const s = get().sessie;
            if (!s) return;
            const run = newRun(s, Date.now());
            persist(run);
            set({ run });
            get().next();
        },

        next() {
            const { sessie: s, run } = get();
            if (!s || !run) return;
            const now = Date.now();
            if (run.done) { set({ phase: 'locked' }); return; }
            if (timeUp(run, now) || isDone(s, run.stats, now)) { finish(run, now); return; }
            const pick = nextType(s, run.stats.history);
            const made = pick && nextExercise(s, pick.type, new Set(run.stats.history.map(h => h.exerciseKey)));
            if (!pick || !made) { finish(run, now); return; }
            const current: KioskCurrent = { slot: pick.slot, exercise: made.exercise, exerciseKey: made.key, shownAt: now, constraints: made.constraints };
            const updated: OefenRun = { ...run, current };
            persist(updated);
            set({ run: updated, shown: current, phase: 'exercise', input: fieldsFor(currentInput(s, current)), field: 0, lastCorrect: null });
        },

        press(key) {
            const { phase, input, field, sessie, shown } = get();
            if (phase !== 'exercise') return;
            const info = currentInput(sessie, shown);
            if (!info || info.kind === 'choice') return;
            const value = input[field] ?? '';
            const nextValue = key === 'back' ? value.slice(0, -1) : sanitizeAnswer(value + key, info.keys, info.kind);
            // Two digits of uur typed: the keypad moves on to the minutes, like a digital clock.
            const advance = info.kind === 'time' && key !== 'back' && field === 0 && nextValue.length === 2;
            set({ input: input.map((v, i) => (i === field ? nextValue : v)), ...(advance && { field: 1 }) });
        },

        setField(i, raw) {
            const { phase, input, sessie, shown } = get();
            if (phase !== 'exercise') return;
            const info = currentInput(sessie, shown);
            if (!info) return;
            set({ input: input.map((v, j) => (j === i ? sanitizeAnswer(raw, info.keys, info.kind) : v)), field: i });
        },

        focusField(i) {
            if (i >= 0 && i < get().input.length) set({ field: i });
        },

        choose(choice) {
            const { phase, sessie, shown } = get();
            if (phase !== 'exercise') return;
            const info = currentInput(sessie, shown);
            if (info?.kind === 'choice' && info.choices.includes(choice)) set({ input: [choice] });
        },

        answer() {
            const { phase, sessie: s, run, input, shown: cur } = get();
            if (phase !== 'exercise' || !s || !run || !cur) return;
            if (input.some(v => v.trim() === '')) return;
            const type = s.types[cur.slot];
            const d = type && kioskFor(type.typeId);
            if (!d) return;
            const now = Date.now();
            const given: KioskAnswer = input.length > 1 ? input.map(v => v.trim()) : input[0].trim();
            const correct = checkAnswer(d, cur.exercise, cur.constraints, given);
            const stats = recordAnswer(run.stats, cur.slot, type.typeId, cur.exercise, given, correct, Math.max(0, now - cur.shownAt), cur.constraints);
            const updated: OefenRun = { ...run, stats, current: undefined };
            persist(updated);
            set({ run: updated, lastCorrect: correct });
            // Testmodus: no juist/fout per exercise, straight on to the next one.
            if (s.testMode) get().next();
            else set({ phase: 'feedback' });
        },

        openStats() {
            const { phase, sessie: s, run } = get();
            if (!s || !run || (phase !== 'exercise' && phase !== 'feedback')) return;
            if (s.statsLocked && !run.done) return;
            set({ phase: 'stats', statsFrom: phase });
        },

        closeStats() {
            if (get().phase === 'stats') set({ phase: get().statsFrom });
        },

        restart() {
            get().start();
        },

        clear() {
            const s = get().sessie;
            if (!s) return;
            clearRuns(s.id);
            set({ run: null, shown: null, phase: 'start', input: [''], field: 0, lastCorrect: null });
        },

        tick(now = Date.now()) {
            const { run } = get();
            if (run && !run.done && timeUp(run, now)) finish(run, now);
        },
    };
});
