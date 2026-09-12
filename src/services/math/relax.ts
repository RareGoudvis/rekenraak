import type { MathBlock } from './types';

// Over-restrictive hoofdrekenen settings (a mask + a forbidden brug + 4 termen + a preset)
// can leave a generator with nothing to produce, and the teacher only saw an empty block.
// Instead of changing the stored settings — they are the teacher's, and stay untouched —
// each generate first tries them as-is and, only if that comes up short, retries on a
// throwaway clone with one more constraint dropped per rung of a fixed ladder.
//
// The rungs are ordered weakest-intent-first: a preset is a strategy hint, a digit mask
// shapes the numbers, a brug is a real didactic goal, and the term count is what the
// teacher literally picked in the header.
export type RelaxStep = 'preset' | 'operand2Mask' | 'operand1Mask' | 'bridges' | 'termCount';

const LADDER: RelaxStep[] = ['preset', 'operand2Mask', 'operand1Mask', 'bridges', 'termCount'];

// Teacher-facing Dutch names, used verbatim in the note under the Genereer button.
const STEP_NAMES: Record<RelaxStep, string> = {
    preset: 'strategie',
    operand2Mask: 'cijfermasker tweede getal',
    operand1Mask: 'cijfermasker eerste getal',
    bridges: 'brug',
    termCount: 'aantal termen',
};

type Constraints = Record<string, unknown>;

const maskHasAny = (m: unknown): boolean =>
    !!m && typeof m === 'object' && Object.values(m as Record<string, unknown>).some(Boolean);

/** Is this rung actually holding the generator back? A no-op rung is skipped, so it never shows up in the note. */
function isActive(c: Constraints, step: RelaxStep): boolean {
    const masks = Array.isArray(c.operandMasks) ? (c.operandMasks as unknown[]) : [];
    switch (step) {
        case 'preset': return typeof c.preset === 'string' && c.preset !== 'vrij';
        case 'operand1Mask': return maskHasAny(c.operand1Mask) || maskHasAny(masks[0]);
        case 'operand2Mask': return maskHasAny(c.operand2Mask) || maskHasAny(masks[1]) || masks.slice(1).some(maskHasAny);
        // A brug map only constrains where it deviates from the implicit 'FREE'.
        case 'bridges': return !!c.bridges && Object.values(c.bridges as Record<string, string>).some(v => v && v !== 'FREE');
        case 'termCount': return typeof c.termCount === 'number' && c.termCount > 2;
    }
}

/** A copy of the constraints with one rung dropped. The stored block is never mutated. */
function drop(c: Constraints, step: RelaxStep): Constraints {
    const masks = Array.isArray(c.operandMasks) ? (c.operandMasks as Constraints[]) : null;
    switch (step) {
        case 'preset': return { ...c, preset: 'vrij' };
        // An empty mask means "no digit structure required" (see generateMaskedInt).
        case 'operand1Mask': return { ...c, operand1Mask: {}, ...(masks ? { operandMasks: masks.map((m, i) => (i === 0 ? {} : m)) } : {}) };
        case 'operand2Mask': return { ...c, operand2Mask: {}, ...(masks ? { operandMasks: masks.map((m, i) => (i === 0 ? m : {})) } : {}) };
        case 'bridges': return { ...c, bridges: {} };
        case 'termCount': return { ...c, termCount: 2 };
    }
}

export interface RelaxResult {
    items: unknown[];
    /** Rungs dropped to reach `items`, in ladder order. Empty when the stored settings sufficed. */
    relaxed: RelaxStep[];
    /** True when even the fully relaxed run stayed under `numberOfExercises`. */
    shortfall: boolean;
}

/**
 * Runs `gen` on the block's own settings first, then walks the ladder cumulatively until
 * the generator yields the requested count. Returns the best attempt either way.
 */
export function generateWithRelaxation(block: MathBlock, gen: (b: MathBlock) => unknown[]): RelaxResult {
    const want = block.numberOfExercises;
    const strict = gen(block);
    if (strict.length >= want) return { items: strict, relaxed: [], shortfall: false };

    let best = strict;
    let bestSteps: RelaxStep[] = [];
    const applied: RelaxStep[] = [];
    let constraints = block.constraints as Constraints;

    for (const step of LADDER) {
        if (!isActive(constraints, step)) continue;
        constraints = drop(constraints, step);
        applied.push(step);
        const items = gen({ ...block, constraints });
        if (items.length > best.length) { best = items; bestSteps = [...applied]; }
        if (items.length >= want) return { items, relaxed: [...applied], shortfall: false };
    }

    return { items: best, relaxed: bestSteps, shortfall: true };
}

/** The line shown under Genereer. `null` when the teacher's own settings were enough. */
export function relaxationNote(result: RelaxResult): string | null {
    if (result.shortfall) return `Slechts ${result.items.length} oefeningen mogelijk bij deze instellingen.`;
    if (!result.relaxed.length) return null;
    return `Instellingen versoepeld om genoeg oefeningen te maken: ${result.relaxed.map(s => STEP_NAMES[s]).join(', ')}.`;
}
