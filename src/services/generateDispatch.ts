import type { MathBlock } from './math/types';
import { REGISTRY } from '../config/exerciseRegistry';

// Generic exercise setter shape (the store's setExercises action).
export type SetExercises = (id: string, field: keyof MathBlock, data: unknown[]) => void;

// Prefix of the note written when a generator throws — the Inspector keys its
// warning colour off it, so both sides must agree on the wording.
export const GENERATION_FAILED = 'Kon geen oefeningen maken:';

// Optional sink for the teacher-facing note about the last generate (the store's
// setGenerationNote action). Callers that don't care may omit it.
export type SetGenerationNote = (id: string, note: string | null) => void;

// Single entry point for generating a block's exercises. Looks the type up in the
// registry, runs its generator, writes the result to the registry-declared field.
// Called by the per-block "Genereer" (Inspector) and "Genereer alles" (store).

export function regenerateBlock(block: MathBlock, setExercises: SetExercises, setGenerationNote?: SetGenerationNote): void {
    const def = REGISTRY[block.typeId];
    if (!def) return;
    try {
        const { items, note } = def.generateNoted ? def.generateNoted(block) : { items: def.generate(block), note: null };
        setExercises(block.id, def.exerciseField, items);
        setGenerationNote?.(block.id, note);
    } catch (err) {
        // A throwing generator used to leave the previous exercises in place with no hint
        // that Genereer had failed at all.
        console.warn(`[rekenraak] generator for ${block.typeId} threw`, err);
        setGenerationNote?.(block.id, `${GENERATION_FAILED} ${err instanceof Error ? err.message : String(err)}`);
    }
}
