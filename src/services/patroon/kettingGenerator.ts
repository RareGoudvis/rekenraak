import type { MathBlock, PatroonExercise, PatroonStep } from '../math/types';

// Kettingsommen — a chain of DISTINCT operations (5 →+3→ 8 →×2→ 16 → …), printed by
// the existing PatroonViewer with all operators shown. cycle length = ticks − 1 so
// every connector carries its own step; blanks default to the end value only.

const rndId = () => Math.random().toString(36).substring(2, 9);
const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

function buildStep(op: string, opMax: number): PatroonStep {
    // ×/: stay small factors; +/− free within the per-op max.
    const operand = op === 'x' || op === ':' ? randInt(2, Math.max(2, Math.min(opMax, 10))) : randInt(1, Math.max(1, opMax));
    return { op: op as PatroonStep['op'], operand };
}

export function generateKettingExercises(block: MathBlock): PatroonExercise[] {
    const c = block.constraints;
    const maxGetal: number = c.maxGetal ?? 100;
    const chainLength: number = Math.min(5, Math.max(3, c.chainLength ?? 4));
    const ops: string[] = Array.isArray(c.ops) && c.ops.length ? c.ops : ['+', '-'];
    const opSettings: Record<string, { max: number }> = c.opSettings ?? {};
    const blankMiddle: boolean = c.blankMiddle ?? false;
    const ticks = chainLength + 1;
    const n = block.numberOfExercises || 6;

    return Array.from({ length: n }, () => {
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
            const start = randInt(1, Math.min(20, maxGetal));
            const vals = [start];
            let ok = true;
            for (const step of cycle) {
                const prev = vals[vals.length - 1];
                const v = step.op === '+' ? prev + step.operand
                    : step.op === '-' ? prev - step.operand
                    : step.op === 'x' ? prev * step.operand
                    : prev / step.operand;
                if (!Number.isInteger(v) || v < 0 || v > maxGetal) { ok = false; break; }
                vals.push(v);
            }
            if (ok) values = vals;
        }
        // Fallback: simple +1 ladder — never fails.
        if (!values) {
            cycle = Array.from({ length: chainLength }, () => ({ op: '+' as const, operand: 1 }));
            values = Array.from({ length: ticks }, (_, i) => i + 1);
        }
        // End blank always; blankMiddle adds one random intermediate blank.
        const blankMask = Array.from({ length: ticks }, (_, k) => k === ticks - 1);
        if (blankMiddle && ticks > 3) blankMask[randInt(1, ticks - 2)] = true;
        return { id: rndId(), values, blankMask, cycle, numberType: 'natural', isManuallyEdited: false };
    });
}
