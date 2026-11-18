import type { Leerjaar } from '../../config/gradePresets';
import type { ZelfChoice } from './zelfSessie';
import { FRANS_ZELF } from '../../talen/frans/fransZelf';

// Subjects beside the maths on the Zelf home (subjects.ts is their kiosk side): each one its own section with its
// topics, shown in its leerjaren; a topic's "Welke oefening?" buttons come from the subject, not from cards.json.

export interface ZelfSubject {
    // The section heading on the home ("Frans").
    section: string;
    // The section's colour: a kid token.
    tint: string;
    grades: readonly Leerjaar[];
    topics: readonly { id: string; label: string }[];
    // The choices of one of its topics at this leerjaar ([] when the leerjaar has none).
    choices(grade: Leerjaar, topicId: string): ZelfChoice[];
}

export const ZELF_SUBJECTS: readonly ZelfSubject[] = [FRANS_ZELF];

/** The subject a topic belongs to, or null for a maths topic. */
export const zelfSubjectOf = (topicId: string): ZelfSubject | null => ZELF_SUBJECTS.find(s => s.topics.some(t => t.id === topicId)) ?? null;

/** A subject topic's label, or null for a maths topic. */
export const subjectTopicLabel = (topicId: string): string | null => zelfSubjectOf(topicId)?.topics.find(t => t.id === topicId)?.label ?? null;
