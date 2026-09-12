import type { MathBlock } from './math/types';
import { REGISTRY } from '../config/exerciseRegistry';

// Generic exercise setter shape (the store's setExercises action).
export type SetExercises = (id: string, field: keyof MathBlock, data: unknown[]) => void;

// Optional sink for the teacher-facing note about the last generate (the store's
// setGenerationNote action). Callers that don't care may omit it.
export type SetGenerationNote = (id: string, note: string | null) => void;

// Single entry point for generating a block's exercises. Looks the type up in the
// registry, runs its generator, writes the result to the registry-declared field.
// Called by the per-block "Genereer" (Inspector) and "Genereer alles" (store).

export function regenerateBlock(block: MathBlock, setExercises: SetExercises, setGenerationNote?: SetGenerationNote): void {
    const def = REGISTRY[block.typeId];
    if (!def) return;
    if (def.generateNoted) {
        const { items, note } = def.generateNoted(block);
        setExercises(block.id, def.exerciseField, items);
        setGenerationNote?.(block.id, note);
        return;
    }
    setExercises(block.id, def.exerciseField, def.generate(block));
    setGenerationNote?.(block.id, null);
}
