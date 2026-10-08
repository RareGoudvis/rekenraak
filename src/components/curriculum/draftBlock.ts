import { REGISTRY } from '../../config/exerciseRegistry';
import type { MathBlock } from '../../services/math/types';

// Also used by the Oefenmodus builder, which passes its own slot id so one typeId can sit twice.
export function makeDraftBlock(typeId: string, variantConstraints: Record<string, unknown>, id = `draft-${typeId}`): MathBlock {
    const def = REGISTRY[typeId];
    const defaults = def.defaultConstraints(typeId);
    return {
        id,
        typeId,
        instructionText: '',
        instructionMode: 'geen',
        layoutPreset: 'inline-short',
        steppedLines: 3,
        numberOfExercises: def.defaultCount,
        totalPoints: 0,
        verticalSpacing: 14,
        constraints: { ...defaults, ...variantConstraints },
        exercises: [],
    };
}
