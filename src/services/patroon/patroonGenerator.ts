import type { MathBlock, PatroonExercise, PatroonStep } from '../math/types';
import { getMaskPlaces } from '../math/mathEngine';
import type { PatroonConstraints, OpSetting } from '../math/constraintTypes';

const rndId = () => Math.random().toString(36).substring(2, 9);
const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

type Place = { key: string; weight: number };

// opSettings as stored leaves both keys optional (kettingsommen write max only), so the
// generator resolves them once at the entry line and works with filled-in values below.
// `places` = the masked places this op builds its operand from (empty = free operand).
type ResolvedOpSetting = { max: number; places: Place[] };

// Operand for one step. ×/÷ stay small whole factors; +/− build from the mask over the
// block's full place range (D/H/T/E + t/h/d for decimals), else random within the op max.
function buildOperand(op: string, s: ResolvedOpSetting, maxGetal: number, dp: number): number {
    const max = Math.max(1, s.max ?? 10);
    if (op === 'x' || op === ':') return randInt(2, Math.max(2, Math.min(max, 12)));
    const scale = Math.pow(10, dp);
    if (s.places.length) {
        let n = 0;
        for (const p of s.places) n += randInt(1, 9) * p.weight;
        return Math.max(1 / scale, Math.min(Math.round(n * scale) / scale, maxGetal));
    }
    if (dp > 0) return Math.max(1, Math.round(randInt(1, Math.max(1, max) * scale))) / scale;
    return randInt(1, max);
}

// The smallest operand an op can take: digit 1 on every masked place, else 1 (factor 2 for ×/÷).
function minimalOperand(op: string, s: ResolvedOpSetting, scale: number): number {
    if (op === 'x' || op === ':') return 2;
    if (!s.places.length) return 1;
    return Math.round(s.places.reduce((sum, p) => sum + p.weight, 0) * scale) / scale;
}

const scaleFor = (numberType: string, maxDecimals: number) => (numberType === 'decimal' ? Math.pow(10, maxDecimals) : 1);
const isClean = (v: number, scale: number) => Math.abs(v * scale - Math.round(v * scale)) < 1e-9;
const snap = (v: number, scale: number) => Math.round(v * scale) / scale;

function applyStep(prev: number, step: PatroonStep): number {
    const v = step.op === '+' ? prev + step.operand
        : step.op === '-' ? prev - step.operand
            : step.op === 'x' ? prev * step.operand
                : prev / step.operand;
    return snap(v, 1e6);   // kill float drift; cleanliness checked separately
}

// Every op sequence of length `steps` over `ops` (at most 4^4).
function opSequences(ops: string[], steps: number): string[][] {
    let seqs: string[][] = [[]];
    for (let i = 0; i < steps; i++) seqs = seqs.flatMap(seq => ops.map(op => [...seq, op]));
    return seqs;
}

const OP_NAME: Record<string, string> = { '+': 'optellen', '-': 'aftrekken' };
const nl = (x: number) => x.toLocaleString('nl-BE');

export function generatePatroonExercisesNoted(block: MathBlock): { items: PatroonExercise[]; note: string | null } {
    const c = block.constraints as PatroonConstraints;
    const numberType: string = c.numberType ?? 'natural';
    const maxGetal: number = c.maxGetal ?? 100;
    const minGetal: number = numberType === 'geheel' ? (c.minGetal ?? -maxGetal) : (numberType === 'decimal' ? 0 : 1);
    const ticks: number = c.ticks ?? 6;
    const steps: number = Math.min(4, Math.max(1, c.steps ?? 1));
    const ops: string[] = Array.isArray(c.ops) && c.ops.length ? c.ops : ['+'];
    const opSettings: Record<string, OpSetting> = c.opSettings ?? {};
    const maxDecimals: number = numberType === 'decimal' ? Math.min(3, Math.max(1, c.maxDecimals ?? 1)) : 0;
    const scale = scaleFor(numberType, maxDecimals);
    const n = block.numberOfExercises;
    const notes: string[] = [];

    // "Stap (max)" bounds a +/− operand, mask or not; a mask whose smallest number (digit 1 on
    // every place) is already above it can't be honoured, so that op builds a free operand.
    const placeRange = getMaskPlaces(maxGetal, numberType === 'decimal' ? 'decimal' : 'natural', maxDecimals);
    const settings: Record<string, ResolvedOpSetting> = {};
    const capFor = (op: string) => Math.min(Math.max(1, settings[op].max), maxGetal);
    for (const op of ops) {
        const max = opSettings[op]?.max ?? 10;
        const places = placeRange.filter(p => opSettings[op]?.mask?.[p.key]);
        const smallest = places.reduce((sum, p) => sum + p.weight, 0);
        const fits = !(op === '+' || op === '-') || snap(smallest, scale) <= Math.min(Math.max(1, max), maxGetal);
        settings[op] = { max, places: fits ? places : [] };
        if (!fits) notes.push(`De getalopbouw bij ${OP_NAME[op]} (${places.map(p => p.key).join(', ')}) past niet onder de grootste stap ${nl(Math.min(Math.max(1, max), maxGetal))} en is genegeerd.`);
    }
    // Only the steps a line of `ticks` values actually applies are drawn on the sheet.
    const withinCap = (cycle: PatroonStep[]) => cycle.slice(0, ticks - 1).every(st => !(st.op === '+' || st.op === '-') || st.operand <= capFor(st.op));

    const runFrom = (start: number, cycle: PatroonStep[]): number[] | null => {
        const vals = [start];
        for (let i = 1; i < ticks; i++) {
            const v = applyStep(vals[i - 1], cycle[(i - 1) % cycle.length]);
            if (!isClean(v, scale) || v > maxGetal || v < minGetal) return null;
            vals.push(snap(v, scale));
        }
        return vals;
    };

    // Built only when the random search fails: each op sequence with its smallest operands and
    // the starts that keep it within [minGetal, maxGetal]. Starts near both ends, near 0 and
    // on multiples of the ÷ product cover the +, −, × and ÷ runs.
    let fallback: { cycle: PatroonStep[]; starts: number[] }[] | null = null;
    const buildFallback = () => {
        const out: { cycle: PatroonStep[]; starts: number[] }[] = [];
        const loS = Math.ceil(minGetal * scale), hiS = Math.floor(maxGetal * scale);
        for (const seq of opSequences(ops, steps)) {
            const cycle = seq.map(op => ({ op: op as PatroonStep['op'], operand: minimalOperand(op, settings[op], scale) }));
            let divisor = 1;
            for (let i = 0; i < ticks - 1 && divisor <= maxGetal; i++) if (cycle[i % cycle.length].op === ':') divisor *= 2;
            const units = new Set<number>();
            for (let k = 0; k <= 60; k++) {
                units.add(loS + k); units.add(hiS - k); units.add(k);
                if (divisor > 1) { units.add(k * divisor * scale); units.add(-k * divisor * scale); }
            }
            const starts = [...units].filter(u => u >= loS && u <= hiS).sort((a, b) => a - b).map(u => u / scale).filter(s => runFrom(s, cycle));
            if (starts.length) out.push({ cycle, starts });
        }
        return out;
    };

    const items: PatroonExercise[] = [];
    for (let e = 0; e < n; e++) {
        let values: number[] | null = null;
        let cycle: PatroonStep[] = [];
        let attempts = 0;

        while (!values && attempts < 12) {
            attempts++;
            cycle = Array.from({ length: steps }, () => {
                const op = ops[randInt(0, ops.length - 1)];
                return { op: op as PatroonStep['op'], operand: buildOperand(op, settings[op], maxGetal, maxDecimals) };
            });
            // An over-cap cycle still draws its starts, so blocks that never hit one keep their seeded output.
            const ok = withinCap(cycle);
            for (let t = 0; t < 120 && !values; t++) {
                const start = numberType === 'decimal'
                    ? Math.round(randInt(0, maxGetal * scale)) / scale
                    : randInt(minGetal, maxGetal);
                const run = runFrom(start, cycle);
                values = ok ? run : null;
            }
        }
        if (!values) {
            fallback ??= buildFallback();
            if (!fallback.length) continue;
            const pick = fallback[randInt(0, fallback.length - 1)];
            cycle = pick.cycle;
            values = runFrom(pick.starts[randInt(0, pick.starts.length - 1)], cycle)!;
        }

        const blankMask = Array.from({ length: ticks }, (_, k) => k !== 0 && Math.random() < 0.45);
        if (!blankMask.some(Boolean)) blankMask[ticks - 1] = true;

        items.push({ id: rndId(), values, blankMask, cycle, numberType, isManuallyEdited: false });
    }
    if (items.length < n) {
        notes.push(items.length === 0
            ? `Geen patroon mogelijk met deze bewerkingen tussen ${nl(minGetal)} en ${nl(maxGetal)}.`
            : `Slechts ${items.length} ${items.length === 1 ? 'patroon' : 'patronen'} mogelijk met deze bewerkingen tussen ${nl(minGetal)} en ${nl(maxGetal)}.`);
    }
    return { items, note: notes.length ? notes.join(' ') : null };
}

export function generatePatroonExercises(block: MathBlock): PatroonExercise[] {
    return generatePatroonExercisesNoted(block).items;
}
