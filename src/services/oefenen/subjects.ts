import type { KioskDescriptor, OefenType } from './types';
import type { StepLine } from '../math/workedSteps';
import type { CardVariant } from '../../config/eenvoudig/cards';
import { FRANS_SUBJECT } from '../../talen/frans/fransKiosk';
import { WOORD_SUBJECT } from '../../talen/frans/woordKiosk';

// The seam for a subject beside the maths (maths = subject 1, the REGISTRY). A subject brings its own exercises, their
// kiosk descriptor and their explanation; the kiosk store, the scheduler, the stats, Nakijken and the games take them
// unchanged. A typeId the REGISTRY does not know is looked up here. Subjects never reach a teacher link: their types
// are made by the Zelf picker only, so the link tables and the wire format stay as they are.

// A plain prompt card instead of a sheet viewer: the lead ("Jos"), the blank the answer fills, and a hint ("(heeft)").
export interface SubjectPrompt {
    lead: string;
    hint?: string;
    // The blank asks something else than the word in the sentence (Frans "welk werkwoord?"): the sentence stays whole
    // and the blank stands on its own line after this label.
    ask?: string;
}

export interface KioskSubject {
    typeId: string;
    // The answer side: input, choices, answerOf, display (as for a maths type).
    kiosk: KioskDescriptor;
    // One exercise for these settings, drawn with `rng`; null = these settings make none (the slot is retired).
    generate(c: Record<string, unknown>, rng: () => number): unknown | null;
    // What makes two exercises the same question (the no-repeat check and the history).
    keyOf(ex: unknown): string;
    // The card.
    prompt(ex: unknown, c: Record<string, unknown>): SubjectPrompt;
    // The explanation after a final fout (the kiosk's steps); shown whole, never line by line.
    steps(ex: unknown, c: Record<string, unknown>): StepLine[] | null;
    // A game's "Hoe los ik dit op?"; absent = the steps.
    help?(ex: unknown, c: Record<string, unknown>): StepLine[] | null;
    // A line every flash shows after the answer (Frans: the full form "Jos a"); null = none.
    afterLine?(ex: unknown, c: Record<string, unknown>, correct: boolean): string | null;
    // Zelf oefenen: one of this subject's card variants as a session type; null = not this subject's.
    typeOf(v: CardVariant): OefenType | null;
}

export const SUBJECTS: readonly KioskSubject[] = [FRANS_SUBJECT, WOORD_SUBJECT];

/** The subject that owns this typeId, or null for a maths type. */
export const subjectFor = (typeId: string): KioskSubject | null => SUBJECTS.find(s => s.typeId === typeId) ?? null;

/** A Zelf card variant of a subject as its session type, or null for a maths variant. */
export function subjectTypeOf(v: CardVariant): OefenType | null {
    for (const s of SUBJECTS) {
        const t = s.typeOf(v);
        if (t) return t;
    }
    return null;
}
