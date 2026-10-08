// Oefenmodus data model: the session a share link carries (OefenSessie), what a pupil's
// device keeps (OefenStats / OefenRun) and the per-type kiosk descriptor the registry holds.
// Pure types: the kiosk page, the teacher builder and the services all import from here.

export const OEFEN_VERSION = 1;

// afwisselen = always another type than the previous one (round-robin);
// willekeurig = weighted draw by the per-type sliders.
export type OefenMode = 'afwisselen' | 'willekeurig';

// One exercise type the teacher put in the session. A session may hold the same typeId (even
// the same leaf) twice with other settings, so everything per type is keyed by its SLOT, the
// index in OefenSessie.types — stable because a shared session never changes.
export interface OefenType {
    typeId: string;
    leafId: string;
    // Sidebar label the kiosk and stats screen show for this type.
    label: string;
    // Opdracht line above the exercise; absent = the kiosk resolves the leaf's default.
    instruction?: string;
    // The teacher's block constraints, as the builder's draft block holds them.
    constraints: Record<string, unknown>;
    // Max exercises of this type in one run; absent = no cap.
    limit?: number;
    // Relative chance in 'willekeurig' mode (normalised over the remaining pool).
    weight: number;
}

export interface OefenSessie {
    v: typeof OEFEN_VERSION;
    // Namespaces the pupil's stats in localStorage: [a-z0-9_-], ≤ 40 chars.
    id: string;
    title?: string;
    createdAt: number;
    types: OefenType[];
    mode: OefenMode;
    // Same type twice in a row allowed ('willekeurig' only; 'afwisselen' never repeats).
    allowRepeatType: boolean;
    // Minutes until the kiosk locks and shows the stats; absent = no timer.
    timerMin?: number;
    // No juist/fout feedback until the run ends.
    testMode: boolean;
    // The pupil's Stats button stays hidden until the run ends.
    statsLocked: boolean;
    // Overall cap on exercises in a run; absent = the sum of the limits, or endless.
    total?: number;
}

// ── Kiosk descriptor (registry row field `kiosk`) ────────────────────────────

// number = one typed answer; number+rest = quotiënt + rest fields; choice = one of `choices`;
// missing-operand = one typed answer that fills a puntoefening's blank operand;
// text = a word typed on the device keyboard (Romeinse cijfers, a unit); time = uur + minuten
// fields; multi-number = one field per blank (a getallenrij, a gelijknamig pair).
export type KioskInput = 'number' | 'number+rest' | 'choice' | 'missing-operand' | 'text' | 'time' | 'multi-number';

// Keys the on-screen keypad adds to the digits for this block's settings. Derived from the
// constraints only, never from the exercise, so the keypad does not hint at the answer.
export type KioskKey = ',' | '/' | '-' | ' ';

export interface KioskDescriptor<E = unknown> {
    // The input for a typical exercise of this type; inputOf refines it per exercise.
    input: KioskInput;
    // Per-exercise input (a puntoefening or a met-rest row in an hr block). Absent = `input`.
    inputOf?(ex: E, c: Record<string, unknown>): KioskInput;
    // The buttons for input 'choice', in display order.
    choices?: string[];
    // Per-exercise buttons (the numbers of a "grootste" row); absent = `choices`.
    choicesOf?(ex: E, c: Record<string, unknown>): string[];
    // multi-number: one placeholder per field, e.g. ['1ste', '2de']; absent = numbered.
    labels?(ex: E, c: Record<string, unknown>): string[];
    // multi-number: the sign printed between the fields (ordenen: '<' or '>').
    separator?(ex: E, c: Record<string, unknown>): string;
    keys?(c: Record<string, unknown>): KioskKey[];
    // number / missing-operand / choice / text: every accepted spelling ('2,5' and '2.5').
    // number+rest: exactly [quotiënt, rest]. time: every accepted 'h:mm' (8:05 and 20:05).
    // multi-number: one entry per field, alternatives within a field joined by '|'.
    answerOf(ex: E, c: Record<string, unknown>): string[];
    // Plain-text rendering for stats and error rows, e.g. "47 + 38 = ?".
    display(ex: E, c: Record<string, unknown>): string;
    // The card header when the paper instruction names a pen verb (omcirkel, kleur ...) but the
    // kiosk input is a button or field; undefined = keep the leaf's instruction.
    kioskInstruction?: string | ((ex: E, c: Record<string, unknown>) => string | undefined);
    // Settings this descriptor can check (afronden: simpel only). Absent = always.
    supported?(c: Record<string, unknown>): boolean;
}

// What the pupil handed in: one string, or one string per field (number+rest, time, multi-number).
export type KioskAnswer = string | string[];

// ── Stats (pupil device, localStorage) ───────────────────────────────────────

export interface OefenError {
    // descriptor.display(exercise), e.g. "47 + 38 = ?".
    exercise: string;
    given: string;
    expected: string;
    at: number;
}

export interface OefenTypeStats {
    made: number;
    correct: number;
    wrong: number;
    errors: OefenError[];
}

export interface OefenHistoryEntry {
    slot: number;
    typeId: string;
    // exerciseKeyOf(typeId, exercise): the no-exact-repeat check reads these back.
    exerciseKey: string;
    correct: boolean;
    ms: number;
}

export interface OefenStats {
    startedAt: number;
    finishedAt?: number;
    // Keyed by slot (index in OefenSessie.types).
    perType: Record<number, OefenTypeStats>;
    history: OefenHistoryEntry[];
}

// The exercise on screen, kept so a reload mid-run shows the same one again.
export interface OefenCurrent {
    slot: number;
    exercise: unknown;
    exerciseKey: string;
    shownAt: number;
}

// One attempt at a session; the device keeps the last 5 per session id.
export interface OefenRun {
    // 0, 1, 2… per session on this device; saveRun replaces a run with the same index.
    index: number;
    stats: OefenStats;
    // Epoch ms when the timer hits 0 (startedAt + timerMin); absent = no timer.
    timerEndsAt?: number;
    current?: OefenCurrent;
    done: boolean;
}

// summary(): one row per slot for the stats screen.
export interface OefenSummaryRow {
    slot: number;
    typeId: string;
    label: string;
    made: number;
    correct: number;
    wrong: number;
    // Whole percent correct of made; null when nothing was made.
    pct: number | null;
    errors: OefenError[];
}
