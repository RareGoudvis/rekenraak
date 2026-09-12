import type { MathBlock, Equation } from './types';
import type { MixedConstraints, MixedOp, MixedVariantId } from './constraintTypes';
import { MIXED_VARIANTS, mixedVariant } from './constraintTypes';
import {
    generateAdditionExercises, generateSubtractionExercises,
    generateMultiplicationExercises, generateDivisionExercises,
} from './mathEngine';
import { generateWithRelaxation, relaxationNote, type RelaxStep } from './relax';

// 'Gemengd' produces one list in which every exercise may come from a different variant
// (operator + optional preset). Nothing here is a new kind of sum: each exercise is made
// by the ordinary hoofdrekenen generator for its operator, run on a one-exercise block
// whose constraints are the shared bag with that variant's overrides merged on top.

const GENERATOR: Record<MixedOp, (block: MathBlock) => Equation[]> = {
    '+': generateAdditionExercises,
    '-': generateSubtractionExercises,
    'x': generateMultiplicationExercises,
    ':': generateDivisionExercises,
};

const TYPE_ID: Record<MixedOp, string> = {
    '+': 'hr-std-optellen',
    '-': 'hr-std-aftrekken',
    'x': 'hr-std-vermenigvuldigen',
    ':': 'hr-std-delen',
};

// SYNC: same order as LADDER in relax.ts — the union of per-variant relaxations is
// reported in ladder order so the note reads the same as a single-operator block's.
const LADDER_ORDER: RelaxStep[] = ['preset', 'operand2Mask', 'operand1Mask', 'bridges', 'termCount'];

// x and : read settings the shared +/- bag never carries (mulDivDefaults in the registry).
// Without them `multiplicationMode: 'tafels'` meets an empty table list and yields nothing.
const MULDIV_BASE = { multiplicationMode: 'tafels', selectedTables: [2, 3, 4, 5, 10], tableLimit: 10 };

// What a preset needs beside `preset` itself, mirroring HrPresetRow's fallbacks. Presets
// are 2-term by definition, so the shared termCount never leaks into a preset variant.
const PRESET_BASE: Record<string, Record<string, unknown>> = {
    compenseren: { presetDistance: 1, compenserenScaffold: 'tussenstap', termCount: 2 },
    tienvoud: { presetFactors: [10, 100, 1000], termCount: 2 },
};

/** Identity of an exercise for de-duplication: the same numbers under the same operator. */
export const mixedKey = (eq: Equation): string => `${eq.operands.map(o => JSON.stringify(o)).join('|')}${eq.operator}`;

/**
 * The block the ordinary hoofdrekenen generator sees for one variant: shared settings,
 * then the variant's preset defaults, then the tab's own overrides, as a single exercise.
 */
export function effectiveBlockFor(block: MathBlock, variantId: MixedVariantId): MathBlock {
    const variant = mixedVariant(variantId);
    const { variants: _variants, mix: _mix, perVariant, ...shared } = block.constraints as MixedConstraints;
    const isMulDiv = variant.op === 'x' || variant.op === ':';
    return {
        ...block,
        typeId: TYPE_ID[variant.op],
        numberOfExercises: 1,
        constraints: {
            ...(isMulDiv ? MULDIV_BASE : {}),
            ...shared,
            preset: variant.preset ?? 'vrij',
            ...(variant.preset ? PRESET_BASE[variant.preset] : {}),
            ...(perVariant?.[variantId] ?? {}),
        },
    };
}

interface OneResult {
    equation: Equation | null;
    relaxed: RelaxStep[];
}

// Retries exist only to dodge `avoid`; each run already yields its exercise on the first
// successful candidate, so a variant with few possibilities gives up quickly.
const AVOID_RETRIES = 25;

function generateOne(block: MathBlock, variantId: MixedVariantId, avoid: Set<string>): OneResult {
    const variant = mixedVariant(variantId);
    const effective = effectiveBlockFor(block, variantId);
    const generate = GENERATOR[variant.op];
    let relaxed: RelaxStep[] = [];

    for (let attempt = 0; attempt < AVOID_RETRIES; attempt++) {
        const result = generateWithRelaxation(effective, generate as (b: MathBlock) => unknown[]);
        relaxed = result.relaxed;
        const equation = result.items[0] as Equation | undefined;
        if (!equation) break;
        if (!avoid.has(mixedKey(equation))) return { equation, relaxed };
    }
    return { equation: null, relaxed };
}

/** One exercise for one variant, skipping any equation whose key is already in `avoid`. */
export function generateMixedOne(block: MathBlock, variantId: MixedVariantId, avoid?: Set<string>): Equation | null {
    return generateOne(block, variantId, avoid ?? new Set()).equation;
}

/** The variant of each exercise, in order: the chosen list in turn, or uniformly at random. */
function variantPlan(variants: MixedVariantId[], mix: 'random' | 'cycle', count: number): MixedVariantId[] {
    if (mix === 'cycle') return Array.from({ length: count }, (_, i) => variants[i % variants.length]);

    // Random, but every chosen variant must actually appear once there is room for it —
    // a teacher who ticks four variants expects to see four, not three plus a double.
    const plan: MixedVariantId[] = count >= variants.length ? [...variants] : [];
    while (plan.length < count) plan.push(variants[Math.floor(Math.random() * variants.length)]);
    for (let i = plan.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [plan[i], plan[j]] = [plan[j], plan[i]];
    }
    return plan;
}

const validVariants = (c: MixedConstraints): MixedVariantId[] => {
    const known = new Set(MIXED_VARIANTS.map(v => v.id));
    const chosen = (c.variants ?? []).filter(v => known.has(v));
    return chosen.length ? chosen : ['+'];
};

export function generateMixedExercisesNoted(block: MathBlock): { items: Equation[]; note: string | null } {
    const c = block.constraints as MixedConstraints;
    const variants = validVariants(c);
    const plan = variantPlan(variants, c.mix === 'cycle' ? 'cycle' : 'random', block.numberOfExercises);

    const items: Equation[] = [];
    const seen = new Set<string>();
    const relaxed = new Set<RelaxStep>();

    for (const variantId of plan) {
        const result = generateOne(block, variantId, seen);
        result.relaxed.forEach(step => relaxed.add(step));
        if (!result.equation) continue;
        seen.add(mixedKey(result.equation));
        items.push(result.equation);
    }

    const note = relaxationNote({
        items,
        relaxed: LADDER_ORDER.filter(step => relaxed.has(step)),
        shortfall: items.length < block.numberOfExercises,
    });
    return { items, note };
}

export function generateMixedExercises(block: MathBlock): Equation[] {
    return generateMixedExercisesNoted(block).items;
}
