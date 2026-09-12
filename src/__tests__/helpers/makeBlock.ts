import type { MathBlock } from '../../services/math/types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { baseApply, DEFAULT_BASE, type BaseSettings } from '../../config/baseSettings';

// SYNC: mirrors `addBlockFromType` in src/store/useWorksheetStore.tsx (the block literal
// plus the registry-defaults → base-snapshot → leaf-override merge order). Reimplemented
// rather than imported because the store is React/zustand and these suites run in node.
// If the store's block literal changes, change it here too.

export interface MakeBlockOptions {
    /** Leaf `defaultConstraints` from APP_STRUCTURE, or an ad-hoc constraint override. */
    constraints?: Record<string, unknown>;
    /** Global base difficulty to snapshot in (defaults to DEFAULT_BASE). */
    base?: BaseSettings;
    /** Overrides for the block's own fields (count, layoutPreset, widthUnits, …). */
    block?: Partial<MathBlock>;
    /** Deterministic id instead of a random one, so failures name the block. */
    id?: string;
}

let seq = 0;

export function makeBlock(typeId: string, opts: MakeBlockOptions = {}): MathBlock {
    const def = REGISTRY[typeId];
    const registryDefaults = def ? def.defaultConstraints(typeId) : {};
    const baseSnapshot = def ? baseApply(opts.base ?? DEFAULT_BASE, registryDefaults) : {};

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
        constraints: { ...registryDefaults, ...baseSnapshot, ...(opts.constraints ?? {}) },
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
