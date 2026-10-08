import { create } from 'zustand';
import type { KioskAnswer, KioskInput, OefenCurrent, OefenRun, OefenSessie } from '../services/oefenen/types';
import {
    checkAnswer, clearRuns, decodeSessie, emptyStats, isDone, kioskFor, kioskInputOf, loadRuns,
    nextExercise, nextType, recordAnswer, saveRun,
} from './k1Stubs';

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

/** The input kind, extra keypad keys and choices for the exercise on the card. */
export function currentInput(s: OefenSessie | null, cur: KioskCurrent | null): { kind: KioskInput; keys: string[]; choices: string[] } | null {
    if (!s || !cur) return null;
    const d = kioskFor(s.types[cur.slot]?.typeId ?? '');
    if (!d) return null;
    return { kind: kioskInputOf(d, cur.exercise, cur.constraints), keys: d.keys?.(cur.constraints) ?? [], choices: d.choices ?? [] };
}

const fieldsFor = (kind: KioskInput | undefined) => (kind === 'number+rest' ? ['', ''] : ['']);

// Keeps what the field may hold: digits plus this type's extra keys; '.' types as ','.
function sanitize(raw: string, keys: string[]): string {
    let out = '';
    for (const ch0 of raw) {
        const ch = ch0 === '.' && keys.includes(',') ? ',' : ch0;
        if ((ch >= '0' && ch <= '9') || keys.includes(ch)) out += ch;
    }
    return out.slice(0, MAX_CHARS);
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
        const runs = loadRuns(s.id);
        const index = runs.length ? Math.max(...runs.map(r => r.index)) + 1 : 0;
        return {
            index, done: false,
            stats: { ...emptyStats(s), startedAt: now },
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
            if (cur) set({ shown: cur, phase: 'exercise', input: fieldsFor(currentInput(s, cur)?.kind), field: 0 });
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
            const made = pick && nextExercise(s, pick.type, run.stats.history.map(h => h.exerciseKey));
            if (!pick || !made) { finish(run, now); return; }
            const current: KioskCurrent = { slot: pick.slot, exercise: made.exercise, exerciseKey: made.key, shownAt: now, constraints: made.constraints };
            const updated: OefenRun = { ...run, current };
            persist(updated);
            set({ run: updated, shown: current, phase: 'exercise', input: fieldsFor(currentInput(s, current)?.kind), field: 0, lastCorrect: null });
        },

        press(key) {
            const { phase, input, field, sessie, shown } = get();
            if (phase !== 'exercise') return;
            const info = currentInput(sessie, shown);
            if (!info || info.kind === 'choice') return;
            const value = input[field] ?? '';
            const nextValue = key === 'back' ? value.slice(0, -1) : sanitize(value + key, info.keys);
            set({ input: input.map((v, i) => (i === field ? nextValue : v)) });
        },

        setField(i, raw) {
            const { phase, input, sessie, shown } = get();
            if (phase !== 'exercise') return;
            const info = currentInput(sessie, shown);
            if (!info) return;
            set({ input: input.map((v, j) => (j === i ? sanitize(raw, info.keys) : v)), field: i });
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
