import { REGISTRY } from '../config/exerciseRegistry';
import type { MathBlock } from './math/types';
import { tutorCarries } from './oefenen/tutorPayload';
import type { HandigStrategy, StepLine } from './math/workedSteps';

// The one rule for every place that offers worked steps (answer key, stappenhulp QR, Oefenmodus):
// a sum has steps only when its type's strategy returns them under that block's own settings,
// so a compenseren or tienvoud preset never gets rijgen steps anywhere.
export function stepsFor(typeId: string, ex: unknown, constraints: unknown): StepLine[] | null {
    if (!ex) return null;
    return REGISTRY[typeId]?.steps?.(ex, (constraints ?? {}) as Record<string, unknown>) ?? null;
}

// The handig rekenen strategies a pupil may view for this sum (empty when none fits); grade = the pupil's leerjaar when known.
export function handigFor(typeId: string, ex: unknown, constraints: unknown, grade?: number): HandigStrategy[] {
    if (!ex) return [];
    return REGISTRY[typeId]?.handig?.(ex, (constraints ?? {}) as Record<string, unknown>, { grade }) ?? [];
}

export function exercisesOf(block: MathBlock): unknown[] {
    const field = REGISTRY[block.typeId]?.exerciseField;
    const list = field ? (block as unknown as Record<string, unknown>)[field] : null;
    return Array.isArray(list) ? list : [];
}

// At least one sum on the block has worked steps: what decides whether a steps option is shown at all.
export function blockHasSteps(block: MathBlock): boolean {
    if (!REGISTRY[block.typeId]?.steps) return false;
    return exercisesOf(block).some(ex => stepsFor(block.typeId, ex, block.constraints) !== null);
}

// The stappenhulp page reads hoofdrekenen sums and every type with a tutor codec, so a QR is offered only where one of those has steps.
export function blockHasTutorSteps(block: MathBlock): boolean {
    if (!REGISTRY[block.typeId]?.steps) return false;
    return exercisesOf(block).some(ex => tutorCarries(block.typeId, ex, block.constraints) && stepsFor(block.typeId, ex, block.constraints) !== null);
}
