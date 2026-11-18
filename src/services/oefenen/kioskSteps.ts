import { stepsFor, stepsOrMabFor } from '../stepsAvailability';
import type { StepLine } from '../math/workedSteps';
import { subjectFor } from './subjects';

// The help a pupil gets in the kiosk and the games, for a maths type or a subject (subjects.ts).

/** After a final fout: the type's steps (else the MAB picture), or a subject's explanation. */
export function kioskStepsFor(typeId: string, ex: unknown, c: Record<string, unknown>, ctx: { grade?: number; noMab?: boolean }): StepLine[] | null {
    const subject = subjectFor(typeId);
    return subject ? subject.steps(ex, c) : stepsOrMabFor(typeId, ex, c, ctx);
}

/** A game's "Hoe los ik dit op?": the type's steps, or a subject's help (else its explanation). */
export function kioskHelpFor(typeId: string, ex: unknown, c: Record<string, unknown>): StepLine[] | null {
    const subject = subjectFor(typeId);
    return subject ? (subject.help ?? subject.steps)(ex, c) : stepsFor(typeId, ex, c);
}

/** A subject's explanation is one whole (shown at once, no step buttons); a maths type's steps come one by one. */
export const stepsArePlain = (typeId: string): boolean => subjectFor(typeId) !== null;

/** The line a subject's flash shows after an answer ("Jos a"); null for a maths type or when the subject has none. */
export const kioskAfterLine = (typeId: string, ex: unknown, c: Record<string, unknown>, correct: boolean): string | null =>
    subjectFor(typeId)?.afterLine?.(ex, c, correct) ?? null;
