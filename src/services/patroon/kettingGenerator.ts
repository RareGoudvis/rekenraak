import type { MathBlock, PatroonExercise, PatroonStep } from '../math/types';
import type { KettingConstraints, OpSetting } from '../math/constraintTypes';
import { joinNotes, repeatNote, repeatsIn } from '../generationNotes';

// Kettingsommen — a chain of DISTINCT operations (5 →+3→ 8 →×2→ 16 → …), printed by
// the existing PatroonViewer with all operators shown. cycle length = ticks − 1 so
// every connector carries its own step; every value after the start is blank by default.

const rndId = () => Math.random().toString(36).substring(2, 9);
const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

function buildStep(op: string, opMax: number): PatroonStep {
    // ×/: stay small factors; +/− free within the per-op max.
    const operand = op === 'x' || op === ':' ? randInt(2, Math.max(2, Math.min(opMax, 10))) : randInt(1, Math.max(1, opMax));
    return { op: op as PatroonStep['op'], operand };
}

function applyStep(prev: number, step: PatroonStep): number {
    return step.op === '+' ? prev + step.operand
        : step.op === '-' ? prev - step.operand
            : step.op === 'x' ? prev * step.operand
                : prev / step.operand;
}

// Op sequences of `length` over `ops` with no op twice in a row (unless only one op is chosen).
function chainSequences(ops: string[], length: number): string[][] {
    let seqs: string[][] = [[]];
    for (let i = 0; i < length; i++) {
        seqs = seqs.flatMap(seq => ops.filter(op => i === 0 || ops.length === 1 || op !== seq[i - 1]).map(op => [...seq, op]));
    }
    return seqs;
}

const nl = (x: number) => x.toLocaleString('nl-BE');

export function generateKettingExercisesNoted(block: MathBlock): { items: PatroonExercise[]; note: string | null } {
    const c = block.constraints as KettingConstraints;
    const maxGetal: number = c.maxGetal ?? 100;
    const chainLength: number = Math.min(5, Math.max(3, c.chainLength ?? 4));
    const ops: string[] = Array.isArray(c.ops) && c.ops.length ? c.ops : ['+', '-'];
    const opSettings: Record<string, OpSetting> = c.opSettings ?? {};
    const showIntermediates: boolean = c.showIntermediates ?? false;
    const blankMiddle: boolean = c.blankMiddle ?? false;
    const ticks = chainLength + 1;
    const n = block.numberOfExercises || 6;
    // The start grows with the max (a fifth of it), so Tot 1 000 reads unlike Tot 100; up to Tot 100 it stays <= 20.
    const maxStart = Math.max(Math.min(20, maxGetal), Math.floor(maxGetal / 5));

    const run = (start: number, cycle: PatroonStep[]): number[] | null => {
        const vals = [start];
        for (const step of cycle) {
            const v = applyStep(vals[vals.length - 1], step);
            if (!Number.isInteger(v) || v < 0 || v > maxGetal) return null;
            vals.push(v);
        }
        return vals;
    };

    // Built only when the random search fails: every allowed op chain with its smallest
    // operands (1 for +/−, 2 for ×/÷) and the starts that keep it whole and within the max.
    let fallback: { cycle: PatroonStep[]; starts: number[] }[] | null = null;
    const buildFallback = () => chainSequences(ops, chainLength)
        .map(seq => seq.map(op => ({ op: op as PatroonStep['op'], operand: op === 'x' || op === ':' ? 2 : 1 })))
        .map(cycle => ({ cycle, starts: Array.from({ length: maxStart }, (_, i) => i + 1).filter(st => run(st, cycle)) }))
        .filter(f => f.starts.length > 0);

    const items: PatroonExercise[] = [];
    for (let e = 0; e < n; e++) {
        let values: number[] | null = null;
        let cycle: PatroonStep[] = [];
        for (let attempt = 0; attempt < 300 && !values; attempt++) {
            // Build into a local — referencing `cycle[i-1]` inside Array.from read the
            // PREVIOUS attempt's array (not-yet-assigned), so the no-repeat filter never fired.
            const built: PatroonStep[] = [];
            for (let i = 0; i < chainLength; i++) {
                // Avoid the same op twice in a row — that's a patroon, not a ketting.
                const pool = i > 0 && ops.length > 1 ? ops.filter(o => o !== built[i - 1].op) : ops;
                const op = pool[randInt(0, pool.length - 1)];
                built.push(buildStep(op, opSettings[op]?.max ?? 10));
            }
            cycle = built;
            values = run(randInt(1, maxStart), cycle);
        }
        if (!values) {
            fallback ??= buildFallback();
            if (!fallback.length) continue;
            const pick = fallback[randInt(0, fallback.length - 1)];
            cycle = pick.cycle;
            values = run(pick.starts[randInt(0, pick.starts.length - 1)], cycle)!;
        }
        // The pupil works the chain from the start: every later value is blank, unless the teacher shows
        // the tussenresultaten (then the end, plus one random middle value with blankMiddle).
        const blankMask = Array.from({ length: ticks }, (_, k) => (showIntermediates ? k === ticks - 1 : k > 0));
        if (showIntermediates && blankMiddle && ticks > 3) blankMask[randInt(1, ticks - 2)] = true;
        items.push({ id: rndId(), values, blankMask, cycle, numberType: 'natural', isManuallyEdited: false });
    }
    const note = items.length >= n ? null
        : items.length === 0 ? `Geen kettingsom mogelijk met deze bewerkingen tot ${nl(maxGetal)}.`
            : `Slechts ${items.length} ${items.length === 1 ? 'kettingsom' : 'kettingsommen'} mogelijk met deze bewerkingen tot ${nl(maxGetal)}.`;
    // The smallest-operand fallback holds few chains (only × to 20: just 1·2·2·2·2), so it repeats them.
    return { items, note: fallback ? joinNotes(note, repeatNote(repeatsIn(items))) : note };
}

export function generateKettingExercises(block: MathBlock): PatroonExercise[] {
    return generateKettingExercisesNoted(block).items;
}
