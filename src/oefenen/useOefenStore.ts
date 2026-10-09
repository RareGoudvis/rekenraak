import { create } from 'zustand';
import { attemptsOf, type KioskAnswer, type KioskExtraKey, type KioskInput, type KioskPiece, type OefenCurrent, type OefenRun, type OefenSessie } from '../services/oefenen/types';
import { decodeSessie } from '../services/oefenen/session';
import { isDone, nextExercise, nextType } from '../services/oefenen/scheduler';
import { clearRuns, emptyStats, loadRuns, nextRunIndex, recordAnswer, saveRun } from '../services/oefenen/stats';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInputOf, kioskInteractOf } from '../services/oefenen/kiosk';
import { EMPTY_INTERACTION, built, type InteractionKind, type InteractionState } from '../components/viewer/ViewerInteractionContext';

// The pupil kiosk's own store. It never imports the worksheet store or autosave: the only
// thing it writes is this session's runs, through saveRun (localStorage per session id).

// start = confirm screen · exercise = answering · feedback = juist/fout flashes, then the next
// exercise follows by itself · retry = "fout, probeer nog eens" flashes (2 kansen), then the same
// exercise again · stats = Stats opened mid-run · locked = the run ended (timer or done).
export type OefenPhase = 'start' | 'exercise' | 'feedback' | 'retry' | 'stats' | 'locked';

// How long each flash stays before the kiosk moves on by itself (Enter or a tap skips it):
// juist is a glance, fout and the retry get time to sink in.
export const FLASH_MS = { juist: 700, fout: 1200, retry: 1000 } as const;

// The exercise on screen plus the constraints it was generated with: answerOf / display /
// checkAnswer must get exactly those, and a reload must too, so they travel in the run.
export type KioskCurrent = OefenCurrent & { constraints: Record<string, unknown> };

// Typed answers stay short: no answer the starter types ask for is longer, and a longer
// string would overflow the answer field on a phone.
const MAX_CHARS = 12;
// The longest word answer is 'hoeveelheidsgetal' (17); the text field is a full row wide.
const MAX_WORD_CHARS = 24;

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
    // Where closeStats returns to; a flash interrupted by Stats resumes as if it had ended.
    statsFrom: 'exercise' | 'feedback' | 'retry';
    // Phase C: what the pupil did ON the card (taps, filled cells, order) for an 'interactive'
    // exercise, and the cell the keypad types into. Reset with every new exercise.
    interaction: InteractionState;
    activeCell: string | null;
    // The last save of the run was refused (quota, private mode): a reload would lose it, so the kiosk says so.
    storageFailed: boolean;

    load(hash: string): void;
    start(): void;
    // The next exercise (or the end screen): what a feedback flash does when it ends.
    next(): void;
    // Ends the flash on screen now (Enter, a tap): feedback → next, retry → the second try.
    skipFlash(): void;
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
    setInteraction(next: InteractionState): void;
    focusCell(key: string | null): void;
    // fill-cells: a physical keyboard typed into a cell; Tab / Shift+Tab; Enter (next cell, or Controleer on the last).
    typeCell(key: string, raw: string): void;
    // false = the active cell is the first / last one: Tab may leave the grid.
    moveCell(step: 1 | -1): boolean;
    enterCell(): void;
    // build: lay one more of a tray piece (1) or take one back (-1); clearBuild empties the tray's work (Wissen).
    lay(key: string, delta: 1 | -1): void;
    clearBuild(): void;
    // fill-cells: a descriptor action key (keypad or hotkey) on the active cell, e.g. Lenen.
    pressExtra(id: string): void;
}

// A test shows nothing about juist/fout until the end, so it hides the results like statsLocked does.
export const resultsHidden = (s: OefenSessie, run: OefenRun) => (s.statsLocked || s.testMode) && !run.done;

const currentOf = (run: OefenRun | null): KioskCurrent | null => (run?.current as KioskCurrent | undefined) ?? null;

export interface CurrentInput {
    kind: KioskInput;
    keys: string[];
    choices: string[];
    // One placeholder per answer field (its count is the field count).
    labels: string[];
    // multi-number: the sign between the fields (ordenen's < or >), from the descriptor.
    separator?: string;
    // interactive: how the pupil answers on the card (tap, tap-multi, fill-cells, order, build).
    interact?: InteractionKind;
    // build: the tray's pieces.
    pieces?: KioskPiece[];
    // The descriptor's action keys for this exercise (Lenen), beside the character keys.
    extraKeys: KioskExtraKey[];
}

const FIXED_LABELS: Partial<Record<KioskInput, string[]>> = {
    'number+rest': ['quotiënt', 'rest'], time: ['uur', 'min'], 'missing-operand': ['Wat ontbreekt?'], text: ['Antwoord'],
    // number+unit: the number is typed in field 0, the unit button fills field 1.
    'number+unit': ['Getal', 'Eenheid'],
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
    const ia = kind === 'interactive' ? kioskInteractOf(d, cur.constraints) : undefined;
    return {
        kind, keys: d.keys?.(cur.constraints) ?? [], choices, labels, separator: d.separator?.(cur.exercise, cur.constraints),
        extraKeys: d.extraKeys?.(cur.exercise, cur.constraints) ?? [],
        ...(ia && { interact: ia.kind }),
        ...(ia?.kind === 'build' && { pieces: ia.pieces?.(cur.exercise, cur.constraints) ?? [] }),
    };
}

/** The interactive answer built from the card state, and whether Controleer may take it. */
export function interactionAnswer(s: OefenSessie | null, cur: KioskCurrent | null, state: InteractionState): { given: string; ready: boolean } | null {
    const d = s && cur ? kioskFor(s.types[cur.slot]?.typeId ?? '') : null;
    const ia = d && cur ? kioskInteractOf(d, cur.constraints) : undefined;
    if (!d || !ia || !cur || kioskInputOf(d, cur.exercise, cur.constraints) !== 'interactive') return null;
    const given = ia.fromState(state, cur.exercise, cur.constraints);
    // An empty set can be the right answer to "tap every even number" (a row of odd ones).
    return { given, ready: ia.kind === 'tap-multi' || given.trim() !== '' };
}

export interface CellPlan {
    // Every cell in the descriptor's key order (Tab walks it).
    keys: string[];
    // The cells Enter and a full cell move through: the keys minus the scratch cells (carries).
    flow: string[];
    length: Record<string, number | undefined>;
}

/** The fill-cells navigation for the exercise on the card, from the descriptor's keys and cellOf (never its answer). */
export function cellPlanOf(s: OefenSessie | null, cur: KioskCurrent | null): CellPlan | null {
    const d = s && cur ? kioskFor(s.types[cur.slot]?.typeId ?? '') : null;
    const ia = d && cur ? kioskInteractOf(d, cur.constraints) : undefined;
    if (!d || !ia || !cur || ia.kind !== 'fill-cells' || kioskInputOf(d, cur.exercise, cur.constraints) !== 'interactive') return null;
    const keys = ia.keys?.(cur.exercise, cur.constraints) ?? [];
    const spec = (k: string) => ia.cellOf?.(k, cur.exercise, cur.constraints) ?? {};
    return { keys, flow: keys.filter(k => !spec(k).scratch), length: Object.fromEntries(keys.map(k => [k, spec(k).length])) };
}

// The first flow cell after `key` in key order (a carry hands on to the digit below it).
const flowAfter = (plan: CellPlan, key: string | null): string | null => {
    const at = key === null ? -1 : plan.keys.indexOf(key);
    return plan.keys.slice(at + 1).find(k => plan.flow.includes(k)) ?? null;
};

const fieldsFor = (info: CurrentInput | null) => (info?.kind === 'choice' ? [''] : (info?.labels ?? ['']).map(() => ''));

// Keeps what the field may hold: digits plus this type's extra keys; '.' types as ','.
// A text field takes letters, digits, spaces and ° (°C, m²); a time field two digits.
export function sanitizeAnswer(raw: string, keys: readonly string[], kind: KioskInput = 'number'): string {
    if (kind === 'text') return raw.replace(/[^\p{L}\p{N}\s°]/gu, '').slice(0, MAX_WORD_CHARS);
    let out = '';
    for (const ch0 of raw) {
        const ch = ch0 === '.' && keys.includes(',') ? ',' : ch0;
        if ((ch >= '0' && ch <= '9') || (kind !== 'time' && keys.includes(ch))) out += ch;
    }
    return out.slice(0, kind === 'time' ? 2 : MAX_CHARS);
}

export const useOefenStore = create<OefenState>()((set, get) => {
    // The pending end of a flash; one at a time, cleared by every move that leaves the flash.
    let flashTimer: ReturnType<typeof setTimeout> | null = null;
    const clearFlash = () => {
        if (flashTimer !== null) clearTimeout(flashTimer);
        flashTimer = null;
    };
    const scheduleFlash = (ms: number) => {
        clearFlash();
        const shownThen = get().shown;
        // Only the flash it was set for: a reload, restart or test reset since then has moved on.
        flashTimer = setTimeout(() => {
            flashTimer = null;
            if (get().shown === shownThen) get().skipFlash();
        }, ms);
    };

    // 2 kansen: the second try at the same exercise, fields, taps and cells cleared, back in the first cell.
    const secondTry = () => {
        const { sessie: s, shown } = get();
        set({
            phase: 'exercise', input: fieldsFor(currentInput(s, shown)), field: 0, lastCorrect: null, interaction: EMPTY_INTERACTION,
            activeCell: s && shown ? firstCell(s, shown) : null,
        });
    };

    const persist = (run: OefenRun) => {
        const s = get().sessie;
        if (s) set({ storageFailed: !saveRun(s.id, run) });
    };

    // Ends the run: the timer ran out or every exercise is made. The end screen is the stats.
    const finish = (run: OefenRun, now = Date.now()) => {
        clearFlash();
        const done: OefenRun = { ...run, done: true, current: undefined, stats: { ...run.stats, finishedAt: run.stats.finishedAt ?? now } };
        persist(done);
        set({ run: done, shown: null, phase: 'locked', input: [''], field: 0, lastCorrect: null });
    };

    // fill-cells: `raw` becomes the cell's text. A cell of fixed length takes the newest
    // characters (typing over a ruitje replaces its digit) and, once full, hands the keypad on.
    const writeCell = (cell: string, raw: string, grew: boolean) => {
        const { interaction, sessie, shown } = get();
        const plan = cellPlanOf(sessie, shown);
        const info = currentInput(sessie, shown);
        if (!plan || !info || !plan.keys.includes(cell)) return;
        const len = plan.length[cell];
        let value = sanitizeAnswer(raw, info.keys);
        if (len !== undefined && value.length > len) value = value.slice(-len);
        const full = grew && len !== undefined && value.length >= len;
        const next = full ? flowAfter(plan, cell) : null;
        set({ interaction: { ...interaction, cells: { ...interaction.cells, [cell]: value } }, ...(next && { activeCell: next }) });
    };

    // fill-cells: a keypad key types into the active cell of the card (the cell owns the value).
    const pressCell = (key: string) => {
        const { interaction, activeCell } = get();
        if (!activeCell) return;
        const value = interaction.cells[activeCell] ?? '';
        if (key === 'back') writeCell(activeCell, value.slice(0, -1), false);
        else writeCell(activeCell, value + key, true);
    };

    // The cell the keypad starts in: the first one on the Enter path.
    const firstCell = (s: OefenSessie, cur: KioskCurrent) => {
        const plan = cellPlanOf(s, cur);
        return plan ? (plan.flow[0] ?? plan.keys[0] ?? null) : null;
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
        interaction: EMPTY_INTERACTION,
        activeCell: null,
        storageFailed: false,

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
            clearFlash();
            set({ sessie: s, error: null, run: null, shown: null, phase: 'start', input: [''], field: 0, lastCorrect: null, interaction: EMPTY_INTERACTION, activeCell: null, storageFailed: false });
            const runs = loadRuns(s.id);
            const last = runs.length ? runs.reduce((a, b) => (b.index > a.index ? b : a)) : null;
            if (!last) return;
            // A finished run reopens on its end screen: reloading must not hide the stats.
            if (last.done) { set({ run: last, phase: 'locked' }); return; }
            const now = Date.now();
            if (timeUp(last, now)) { set({ run: last }); finish(last, now); return; }
            set({ run: last });
            const cur = currentOf(last);
            // A reload mid-retry comes back on the second try (cur.wrongFirst is kept).
            if (cur) set({ shown: cur, phase: 'exercise', input: fieldsFor(currentInput(s, cur)), field: 0, activeCell: firstCell(s, cur) });
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
            clearFlash();
            const { sessie: s, run } = get();
            if (!s || !run) return;
            const now = Date.now();
            if (run.done) { set({ phase: 'locked' }); return; }
            if (timeUp(run, now) || isDone(s, run.stats, now)) { finish(run, now); return; }
            const seen = new Set(run.stats.history.map(h => h.exerciseKey));
            let pick = nextType(s, run.stats.history);
            let made = pick && nextExercise(s, pick.type, seen);
            // A type that yields nothing is retired by the scheduler: draw again from the rest (bounded by the slot count).
            for (let tries = 0; pick && !made && tries < s.types.length; tries++) {
                pick = nextType(s, run.stats.history);
                made = pick && nextExercise(s, pick.type, seen);
            }
            if (!pick || !made) { finish(run, now); return; }
            const current: KioskCurrent = { slot: pick.slot, exercise: made.exercise, exerciseKey: made.key, shownAt: now, constraints: made.constraints };
            const updated: OefenRun = { ...run, current };
            persist(updated);
            set({ run: updated, shown: current, phase: 'exercise', input: fieldsFor(currentInput(s, current)), field: 0, lastCorrect: null, interaction: EMPTY_INTERACTION, activeCell: firstCell(s, current) });
        },

        press(key) {
            const { phase, input, field, sessie, shown } = get();
            if (phase !== 'exercise') return;
            const info = currentInput(sessie, shown);
            if (!info || info.kind === 'choice') return;
            // build: Backspace takes back the newest kind of piece laid; digits do nothing.
            if (info.interact === 'build') {
                const last = get().interaction.build.at(-1);
                if (key === 'back' && last) get().lay(last.key, -1);
                return;
            }
            if (info.kind === 'interactive') { pressCell(key); return; }
            // number+unit: the keypad only ever types the number; the unit is a button.
            const at = info.kind === 'number+unit' ? 0 : field;
            const value = input[at] ?? '';
            const nextValue = key === 'back' ? value.slice(0, -1) : sanitizeAnswer(value + key, info.keys, info.kind);
            // Two digits of uur typed: the keypad moves on to the minutes, like a digital clock.
            const advance = info.kind === 'time' && key !== 'back' && field === 0 && nextValue.length === 2;
            set({ input: input.map((v, i) => (i === at ? nextValue : v)), ...(advance && { field: 1 }) });
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
            if (!info?.choices.includes(choice)) return;
            if (info.kind === 'choice') set({ input: [choice] });
            else if (info.kind === 'number+unit') set({ input: [get().input[0] ?? '', choice] });
        },

        skipFlash() {
            const { phase } = get();
            if (phase === 'feedback') get().next();
            else if (phase === 'retry') { clearFlash(); secondTry(); }
        },

        answer() {
            const { phase, sessie: s, run, input, shown: cur } = get();
            // Not while a flash is on screen: a double tap on Controleer must not answer twice.
            if (phase !== 'exercise' || !s || !run || !cur) return;
            const now = Date.now();
            // The clock ticks once a second: an answer in the gap after the deadline ends the run uncounted.
            if (timeUp(run, now)) { finish(run, now); return; }
            const interactive = interactionAnswer(s, cur, get().interaction);
            if (interactive ? !interactive.ready : input.some(v => v.trim() === '')) return;
            const type = s.types[cur.slot];
            const d = type && kioskFor(type.typeId);
            if (!d) return;
            const given: KioskAnswer = interactive ? interactive.given : input.length > 1 ? input.map(v => v.trim()) : input[0].trim();
            const correct = checkAnswer(d, cur.exercise, cur.constraints, given, type.exactForm);
            // First try missed with 2 kansen: nothing is counted yet, the same exercise comes back.
            if (!correct && attemptsOf(s) === 2 && cur.wrongFirst === undefined) {
                const retry: KioskCurrent = { ...cur, wrongFirst: given };
                const updated: OefenRun = { ...run, current: retry };
                persist(updated);
                set({ run: updated, shown: retry, lastCorrect: false, phase: 'retry' });
                scheduleFlash(FLASH_MS.retry);
                return;
            }
            const stats = recordAnswer(run.stats, cur.slot, type.typeId, cur.exercise, given, correct, Math.max(0, now - cur.shownAt), cur.constraints, now, cur.wrongFirst);
            const updated: OefenRun = { ...run, stats, current: undefined };
            persist(updated);
            set({ run: updated, lastCorrect: correct });
            // Testmodus: no juist/fout per exercise, straight on to the next one.
            if (s.testMode) { get().next(); return; }
            set({ phase: 'feedback' });
            scheduleFlash(correct ? FLASH_MS.juist : FLASH_MS.fout);
        },

        openStats() {
            const { phase, sessie: s, run } = get();
            if (!s || !run || (phase !== 'exercise' && phase !== 'feedback' && phase !== 'retry')) return;
            if (resultsHidden(s, run)) return;
            // The flash waits behind the stats; closing them ends it.
            clearFlash();
            set({ phase: 'stats', statsFrom: phase });
        },

        closeStats() {
            const { phase, statsFrom } = get();
            if (phase !== 'stats') return;
            set({ phase: statsFrom });
            if (statsFrom !== 'exercise') get().skipFlash();
        },

        // Owner call 15: only the end screen starts over or wipes; mid-run (the Resultaten peek
        // included) a pupil must not escape a timed test or lose the run.
        restart() {
            if (get().phase !== 'locked') return;
            get().start();
        },

        clear() {
            const s = get().sessie;
            if (!s || get().phase !== 'locked') return;
            clearFlash();
            clearRuns(s.id);
            set({ run: null, shown: null, phase: 'start', input: [''], field: 0, lastCorrect: null });
        },

        tick(now = Date.now()) {
            const { run } = get();
            if (run && !run.done && timeUp(run, now)) finish(run, now);
        },

        setInteraction(next) {
            if (get().phase === 'exercise') set({ interaction: next });
        },

        focusCell(key) {
            set({ activeCell: key });
        },

        typeCell(key, raw) {
            if (get().phase !== 'exercise') return;
            const before = get().interaction.cells[key] ?? '';
            set({ activeCell: key });
            writeCell(key, raw, raw.length > before.length);
        },

        moveCell(step) {
            const plan = cellPlanOf(get().sessie, get().shown);
            if (!plan?.keys.length) return false;
            const at = plan.keys.indexOf(get().activeCell ?? '');
            const to = at < 0 ? (step > 0 ? 0 : plan.keys.length - 1) : at + step;
            if (to < 0 || to >= plan.keys.length) return false;
            set({ activeCell: plan.keys[to] });
            return true;
        },

        lay(key, delta) {
            const { phase, sessie, shown, interaction } = get();
            if (phase !== 'exercise') return;
            const piece = currentInput(sessie, shown)?.pieces?.find(p => p.key === key);
            if (piece) set({ interaction: built(interaction, key, delta, piece.max) });
        },

        clearBuild() {
            if (get().phase === 'exercise') set({ interaction: { ...get().interaction, build: [] } });
        },

        enterCell() {
            const { sessie: s, shown: cur, activeCell, phase } = get();
            const plan = cellPlanOf(s, cur);
            if (!plan || phase !== 'exercise') return;
            const next = flowAfter(plan, activeCell);
            if (next) { set({ activeCell: next }); return; }
            // Past the last cell: check, or (nothing to check yet) back to the first cell.
            if (interactionAnswer(s, cur, get().interaction)?.ready) get().answer();
            else set({ activeCell: plan.flow[0] ?? plan.keys[0] ?? null });
        },

        pressExtra(id) {
            const { phase, sessie: s, shown: cur, interaction, activeCell } = get();
            if (phase !== 'exercise' || !cur) return;
            const key = currentInput(s, cur)?.extraKeys.find(k => k.id === id);
            const next = key?.apply(interaction, activeCell, cur.exercise, cur.constraints);
            // The active cell stays: the pupil types this column's digit next.
            if (next) set({ interaction: next });
        },
    };
});
