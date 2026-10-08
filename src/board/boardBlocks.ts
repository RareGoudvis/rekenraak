import { REGISTRY } from '../config/exerciseRegistry';
import type { MathBlock } from '../services/math/types';
import { rndId } from './boardTypes';

// MathBlock factory for board widgets. Same registry contract as the worksheet,
// but board-tuned defaults: no opdracht-titel, no score, and a lower exercise
// count (a board widget teaches a handful of exercises, not a full page).
export function makeBoardBlock(typeId: string, variantConstraints: Record<string, unknown> = {}): MathBlock | null {
    const def = REGISTRY[typeId];
    if (!def) return null;
    const block: MathBlock = {
        id: `bw-${rndId()}`,
        typeId,
        instructionText: '',
        instructionMode: 'geen',
        layoutPreset: 'inline-short',
        steppedLines: 3,
        numberOfExercises: Math.min(def.defaultCount, 6),
        totalPoints: 0,
        verticalSpacing: 14,
        constraints: { ...def.defaultConstraints(typeId), ...variantConstraints },
        exercises: [],
    };
    return regenerateBoardBlock(block);
}

// Generate directly against the registry — board blocks never live in the
// worksheet store, so we write the exercise field ourselves instead of going
// through setExercises.
export function regenerateBoardBlock(block: MathBlock): MathBlock {
    const def = REGISTRY[block.typeId];
    if (!def) return block;
    return { ...block, [def.exerciseField]: def.generate(block) };
}
