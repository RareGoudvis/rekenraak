import type { MathBlock } from '../../services/math/types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { seedConstraints, DEFAULT_BASE, type BaseSettings } from '../../config/baseSettings';
import type { Leerjaar } from '../../config/gradePresets';

// SYNC: mirrors the block literal of `addBlockFromType` (src/store/slices/blocksSlice.ts);
// the constraints come from the same seedConstraints(). Reimplemented rather than imported
// because the store is React/zustand and these suites run in node.

export interface MakeBlockOptions {
    /** Leaf `defaultConstraints` from APP_STRUCTURE, or an ad-hoc constraint override. */
    constraints?: Record<string, unknown>;
    /** Global base difficulty to snapshot in (defaults to DEFAULT_BASE). */
    base?: BaseSettings;
    /** Picked leerjaar + the leaf it came from, for leaves whose pinned max yields to it. */
    grade?: Leerjaar | null;
    leafId?: string;
    /** Overrides for the block's own fields (count, layoutPreset, widthUnits, …). */
    block?: Partial<MathBlock>;
    /** Deterministic id instead of a random one, so failures name the block. */
    id?: string;
}

let seq = 0;

export function makeBlock(typeId: string, opts: MakeBlockOptions = {}): MathBlock {
    const def = REGISTRY[typeId];
    const base = opts.base ?? DEFAULT_BASE;

    return {
        id: opts.id ?? `t${(seq += 1).toString(36)}`,
        typeId,
        instructionText: '',
        instructionMode: 'geen',
        layoutPreset: 'inline-short',
        steppedLines: 3,
        numberOfExercises: def ? def.defaultCount : 10,
        totalPoints: 5,
        verticalSpacing: 18,
        constraints: seedConstraints({ typeId, base, override: opts.constraints, grade: opts.grade, leafId: opts.leafId }),
        exercises: [],
        ...(opts.block ?? {}),
    } as MathBlock;
}

/** Run a type's generator and return the exercises it produced. */
export function generateFor(block: MathBlock): unknown[] {
    const def = REGISTRY[block.typeId];
    if (!def) throw new Error(`no registry row for ${block.typeId}`);
    return def.generate(block);
}

/** typeIds that carry no generator — sheet furniture drawn purely from constraints. */
export const isLayoutType = (typeId: string) => typeId.startsWith('layout-');
