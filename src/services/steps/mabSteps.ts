import type { Equation } from '../math/types';
import type { StepLine, StepToken } from '../math/workedSteps';

// MAB level A: a picture of MAB pieces above the hoofdrekenen steps (owner, 2026-11-13). Pure: it reads the
// exercise and the very lines the pupil reveals, so the blocks follow the written strategy line for line.
// Whole numbers up to 1000 only; anything else (kommagetallen, breuken, met rest, compenseren) gets no picture.

// 0 = E (eenheid, a small cube), 1 = T (staaf), 2 = H (plaat), 3 = D (blok).
export type MabPlace = 0 | 1 | 2 | 3;
export const MAB_UNITS = ['E', 'T', 'H', 'D'] as const;
export const MAB_MAX = 1000;
// The hoofdrekenen typeIds whose sums can get MAB (the visual, the builder switch, Zelf oefenen).
export const MAB_TYPE_IDS: readonly string[] = ['hr-std-optellen', 'hr-std-aftrekken', 'hr-std-vermenigvuldigen', 'hr-std-delen', 'hr-std-gemengd'];

// have = there; now = what this line adds; wait = still to add later; gone = taken away (crossed out);
// ghost = a piece opened into ten of the next place down (lenen); gain = a piece won by inwisselen.
export type MabPieceState = 'have' | 'now' | 'wait' | 'gone' | 'ghost' | 'gain';

export interface MabCluster {
    // Pieces per place, index = MabPlace.
    pieces: MabPieceState[][];
    // A marked group of ten at a place: pieces[place].slice(from, from + 10).
    rings?: { place: MabPlace; from: number }[];
    // groups (×, :): a frame around the cluster; 'hi' = the one group the answer reads.
    frame?: 'solid' | 'dashed' | 'hi';
    // A '+' drawn before the cluster (the parts of a split).
    plus?: boolean;
    newRow?: boolean;
    // The +/− mat keeps its columns in place from stage to stage.
    stable?: boolean;
}

export interface MabPicture { clusters: MabCluster[]; captions: string[] }

// initial = before any line is shown; stages[i] = after lines[i] (null: keep the previous picture).
export interface MabPlan { initial: MabPicture; stages: (MabPicture | null)[] }

const digit = (n: number, p: number) => Math.floor(n / 10 ** p) % 10;
const emptyPieces = (): MabPieceState[][] => [[], [], [], []];
const repeat = (s: MabPieceState, n: number): MabPieceState[] => Array.from({ length: Math.max(0, n) }, () => s);
const okNum = (v: number) => Number.isInteger(v) && v >= 0 && v <= MAB_MAX;

function matOf(n: number, state: MabPieceState = 'have', extra: Partial<MabCluster> = {}): MabCluster {
    const pieces = emptyPieces();
    for (let p = 0; p < 4; p++) pieces[p] = repeat(state, digit(n, p));
    return { pieces, ...extra };
}

// A + / − line as numbers: "(775 + 30) + 30 + 8" → [775, 30, 30, 8], bracketed. Anything else → null.
function chainOf(tokens: StepToken[], op: '+' | '-'): { nums: number[]; bracket: boolean } | null {
    const nums: number[] = [];
    for (const t of tokens) {
        if (t.t === 'num') { if (!okNum(t.v)) return null; nums.push(t.v); }
        else if (t.t === 'op') { if (t.op !== op) return null; }
        else if (t.t !== 'open' && t.t !== 'close') return null;
    }
    return nums.length ? { nums, bracket: tokens[0]?.t === 'open' } : null;
}

function plusStage(have: number, now: number | null, wait: number[]): MabPicture {
    const n = now ?? 0;
    const counts = [0, 1, 2, 3].map(p => [digit(have, p), digit(n, p), wait.reduce((s, w) => s + digit(w, p), 0)]);
    const gain = [0, 0, 0, 0];
    const rings: MabCluster['rings'] = [];
    const captions: string[] = [];
    // Inwisselen: ten of a place (with any piece won from below) become one of the next place.
    for (let p = 0; p < 3; p++) {
        if (counts[p][0] + counts[p][1] + gain[p] >= 10) {
            rings.push({ place: p as MabPlace, from: 0 });
            gain[p + 1] = 1;
            captions.push(`10 ${MAB_UNITS[p]} wordt 1 ${MAB_UNITS[p + 1]}`);
        }
    }
    const pieces = counts.map(([h, nw, w], p) => [...repeat('have', h), ...repeat('gain', gain[p]), ...repeat('now', nw), ...repeat('wait', w)]);
    return { clusters: [{ pieces, stable: true, ...(rings.length && { rings }) }], captions };
}

function minusStage(have: number, take: number | null): MabPicture {
    const cnt = [0, 1, 2, 3].map(p => digit(have, p));
    const orig = [...cnt];
    const ghost = [0, 0, 0, 0];
    const ringed = [false, false, false, false];
    const captions: string[] = [];
    // Lenen: open one piece of the next place (higher up first when that one is empty too).
    const borrow = (p: number): boolean => {
        const q = p + 1;
        if (q > 3) return false;
        if (cnt[q] === 0 && !borrow(q)) return false;
        cnt[q]--; ghost[q]++; cnt[p] += 10; ringed[p] = true;
        captions.push(`1 ${MAB_UNITS[q]} wordt 10 ${MAB_UNITS[p]}`);
        return true;
    };
    const t = take ?? 0;
    for (let p = 0; p < 4; p++) if (digit(t, p) > cnt[p] && !borrow(p)) return { clusters: [matOf(have, 'have', { stable: true })], captions: [] };
    const rings: MabCluster['rings'] = [];
    const pieces = [0, 1, 2, 3].map(p => {
        const arr: MabPieceState[] = [...repeat('have', ringed[p] ? 10 : 0), ...repeat('have', orig[p])];
        if (ringed[p]) rings.push({ place: p as MabPlace, from: 0 });
        // Mark from the end: the opened piece(s), then the pieces taken away.
        let g = ghost[p], k = digit(t, p);
        for (let i = arr.length - 1; i >= 0 && g > 0; i--) { arr[i] = 'ghost'; g--; }
        for (let i = arr.length - 1; i >= 0 && k > 0; i--) if (arr[i] === 'have') { arr[i] = 'gone'; k--; }
        return arr;
    });
    return { clusters: [{ pieces, stable: true, ...(rings.length && { rings }) }], captions };
}

// Rijgen + and −: the running total, the part this line adds or takes off, the parts still to come.
function addSubPlan(eq: Equation, a: number, b: number, lines: StepLine[]): MabPlan | null {
    const op = eq.operator as '+' | '-';
    const chains = lines.map(l => chainOf(l.tokens, op));
    if (chains.some(c => !c)) return null;
    const stageOf = (c: { nums: number[]; bracket: boolean }): MabPicture => {
        const [have, ...rest] = c.nums;
        const nowFirst = c.bracket || rest.length === 1;
        const now = nowFirst ? rest[0] ?? null : null;
        const wait = nowFirst ? rest.slice(1) : rest;
        return op === '+' ? plusStage(have, now, wait) : minusStage(have, now);
    };
    const stages = chains.map((c, i) => {
        if (c!.nums.length > 1) return stageOf(c!);
        // The answer: the last hidden line's move made visible (840 + 3, 230 − 5 with its lenen), else the result itself.
        const prev = chains[i - 1];
        if (prev && !lines[i - 1].basis && prev.nums.length === 2) return stageOf(prev);
        return { clusters: [matOf(c!.nums[0], 'have', { stable: true })], captions: [] };
    });
    const initial = op === '+' ? plusStage(a, null, [b]) : minusStage(a, null);
    return { initial, stages };
}

// g groups of m: 5 × 65 = five groups of 6 T and 5 E.
const groupsPicture = (g: number, m: number, state: MabPieceState): MabPicture =>
    ({ clusters: Array.from({ length: g }, () => matOf(m, state, { frame: 'solid' })), captions: [] });

// All pieces of the groups gathered: what inwisselen makes of them ("30 T wordt 3 H"), pieces won marked.
function gatheredPicture(perPlace: number[], answer: number): MabPicture {
    const captions: string[] = [];
    const won = [0, 0, 0, 0];
    let carry = 0;
    for (let p = 0; p < 4; p++) {
        const s = perPlace[p] + carry;
        const r = s % 10;
        won[p] = Math.min(carry, r);
        carry = Math.floor(s / 10);
        if (carry > 0 && p < 3) captions.push(`${carry * 10} ${MAB_UNITS[p]} wordt ${carry} ${MAB_UNITS[p + 1]}${r - won[p] > 0 && r > 0 ? ` en ${r - won[p]} ${MAB_UNITS[p]}` : ''}`);
    }
    const pieces = [0, 1, 2, 3].map(p => [...repeat('gain', won[p]), ...repeat('now', digit(answer, p) - won[p])]);
    return { clusters: [{ pieces }], captions };
}

// ×: groups of the factor that is not the number of groups, then the pieces gathered and exchanged.
function maalPlan(a: number, b: number, lines: StepLine[]): MabPlan | null {
    const g = a >= 1 && a <= 9 ? a : b >= 1 && b <= 9 ? b : null;
    if (g === null || a * b > MAB_MAX) return null;
    const m = g === a ? b : a;
    const answer = a * b;
    const perPlace = [0, 1, 2, 3].map(p => g * digit(m, p));
    const resultIdx = lines.findIndex((l, i) => l.kind === 'values' || (l.kind === 'units' && i > 0));
    const answerIdx = lines.findIndex(l => l.kind === 'answer');
    if (answerIdx < 0) return null;
    const gathered = gatheredPicture(perPlace, answer);
    const stages = lines.map((l, i): MabPicture | null => {
        if (i === answerIdx) return resultIdx >= 0 ? { clusters: [matOf(answer)], captions: [] } : gathered;
        if (i === resultIdx) return gathered;
        if (resultIdx >= 0 && i > resultIdx) return null;
        return groupsPicture(g, m, l.kind === 'distribute' ? 'now' : 'have');
    });
    return { initial: groupsPicture(g, m, 'have'), stages };
}

// The deeltal split into parts a pupil shares (96 = 80 + 16 → 8 T and 16 E), each part in the place it is
// shared at; a part of ten or more of a place came from opening the next place ("1 T wordt 10 E").
function pilePicture(parts: { count: number; place: number }[], d: number): MabPicture {
    const captions: string[] = [];
    const clusters: MabCluster[] = parts.map(({ count, place }, i) => {
        const pieces = emptyPieces();
        pieces[place] = repeat('have', count);
        const k = Math.floor(count / 10);
        if (k > 0 && place < 3) captions.push(`${k} ${MAB_UNITS[place + 1]} wordt ${k * 10} ${MAB_UNITS[place]}`);
        return { pieces, ...(i > 0 && { plus: true }), ...(k === 1 && { rings: [{ place: place as MabPlace, from: 0 }] }) };
    });
    clusters.push(...Array.from({ length: d }, (_, i) => ({ pieces: emptyPieces(), frame: 'dashed' as const, ...(i === 0 && { newRow: true }) })));
    return { clusters, captions };
}

function sharedPicture(perGroup: number[], d: number, state: MabPieceState, hi: boolean): MabPicture {
    const cluster = (i: number): MabCluster => {
        const pieces = emptyPieces();
        for (let p = 0; p < 4; p++) pieces[p] = repeat(state, perGroup[p]);
        return { pieces, frame: hi && i === 0 ? 'hi' : 'solid' };
    };
    return { clusters: Array.from({ length: d }, (_, i) => cluster(i)), captions: [] };
}

const UNIT_PLACE: Record<string, number> = { T: 1, H: 2, D: 3 };

// : as verdelingsdeling (2340 : 3 is above 1000): the deeltal split as the lines split it, shared over d groups.
function deelPlan(a: number, d: number, lines: StepLine[]): MabPlan | null {
    if (d < 2 || d > 9 || a % d !== 0) return null;
    const first = lines[0];
    if (!first) return null;
    let parts: { count: number; place: number }[];
    if (first.kind === 'parts') {
        const nums = first.tokens.filter((t): t is Extract<StepToken, { t: 'num' }> => t.t === 'num').map(t => t.v);
        const split = nums.slice(0, -1);
        if (nums[nums.length - 1] !== d || split.reduce((s, v) => s + v, 0) !== a) return null;
        parts = split.map(p => {
            let place = 0;
            while (place < 3 && p % (d * 10 ** (place + 1)) === 0) place++;
            return { count: p / 10 ** place, place };
        });
    } else if (first.kind === 'units') {
        // Naar analogie: 480 : 6 = 48 T : 6.
        const unit = first.tokens.find(t => t.t === 'unit');
        const n = first.tokens.find(t => t.t === 'num');
        if (!unit || unit.t !== 'unit' || !n || n.t !== 'num' || !(unit.u in UNIT_PLACE)) return null;
        parts = [{ count: n.v, place: UNIT_PLACE[unit.u] }];
    } else return null;
    const perGroup = [0, 0, 0, 0];
    for (const { count, place } of parts) { if (count % d !== 0) return null; perGroup[place] += count / d; }
    if (perGroup.some(c => c > 9)) return null;
    const pile = pilePicture(parts, d);
    const stages = lines.map((l, i): MabPicture | null => {
        if (l.kind === 'answer') return sharedPicture(perGroup, d, 'have', true);
        if (i === 0) return pile;
        if (l.kind === 'distribute') return sharedPicture(perGroup, d, 'now', false);
        if (l.kind === 'values' || l.kind === 'units') return sharedPicture(perGroup, d, 'have', false);
        return null;
    });
    const initial: MabPicture = { clusters: [matOf(a), ...pilePicture([], d).clusters], captions: [] };
    return { initial, stages };
}

// The MAB picture for one hoofdrekenen sum and its steps, or null when MAB does not apply (owner rules 1 and 2).
export function mabPlan(data: unknown, lines: StepLine[]): MabPlan | null {
    const eq = data as Equation | null;
    if (!eq || typeof eq !== 'object' || !Array.isArray(eq.operands) || eq.operands.length !== 2 || !lines?.length) return null;
    if (eq.operators && eq.operators.some(o => o !== eq.operator)) return null;
    if (eq.missingIndex !== undefined || (eq.missingTerm && eq.missingTerm !== 'result') || eq.remainder !== undefined) return null;
    const [a, b] = eq.operands;
    if (typeof a !== 'number' || typeof b !== 'number' || !okNum(a) || !okNum(b)) return null;
    // Every number a line shows stays in the MAB range.
    for (const l of lines) for (const t of l.tokens) if (t.t === 'frac' || (t.t === 'num' && !okNum(t.v))) return null;
    if (eq.operator === '+') return a + b <= MAB_MAX ? addSubPlan(eq, a, b, lines) : null;
    if (eq.operator === '-') return b <= a ? addSubPlan(eq, a, b, lines) : null;
    if (eq.operator === 'x') return maalPlan(a, b, lines);
    // Deeltafels are counted in jumps (the kladlijn), not shared: no MAB there.
    if (eq.operator === ':') return a / b > 10 ? deelPlan(a, b, lines) : null;
    return null;
}

// Who gets MAB: leerjaar 1–3 only, and not when the teacher or pupil turned it off (owner rule 4).
export const mabAllowed = (ctx: { grade?: number; noMab?: boolean }): boolean =>
    !ctx.noMab && ctx.grade !== undefined && ctx.grade >= 1 && ctx.grade <= 3;
