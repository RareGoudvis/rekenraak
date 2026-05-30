import type { MathBlock } from './math/types';
import { REGISTRY } from '../config/exerciseRegistry';

// Generic exercise setter shape (the store's setExercises action).
export type SetExercises = (id: string, field: keyof MathBlock, data: unknown[]) => void;

// Single entry point for generating a block's exercises. Looks the type up in the
// registry, runs its generator, writes the result to the registry-declared field.
// Called by the per-block "Genereer" (Inspector) and "Genereer alles" (store).
export function regenerateBlock(block: MathBlock, setExercises: SetExercises): void {
    const def = REGISTRY[block.typeId];
    if (!def) return;
    setExercises(block.id, def.exerciseField, def.generate(block));
}
