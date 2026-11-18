import type { Leerjaar } from '../../config/gradePresets';
import type { ZelfChoice } from './zelfSessie';
import { FRANS_ZELF } from '../../talen/frans/fransZelf';

// Subjects beside the maths on the Zelf home (subjects.ts is their kiosk side): each one its own section with its
// topics, shown in its leerjaren; a topic's "Welke oefening?" buttons come from the subject, not from cards.json.

// A small row of its own under "Welke oefening?" (Frans: the Richting of a verb card); the first option is the default.
export interface ZelfFacet {
    label: string;
    // short = the button text where the row is narrow (a phone); label = its full name.
    options: readonly { key: string; label: string; short?: string }[];
}

export interface ZelfSubject {
    // The section heading on the home ("Frans").
    section: string;
    // The section's colour: a kid token.
    tint: string;
    grades: readonly Leerjaar[];
    topics: readonly { id: string; label: string }[];
    // The extra row a topic shows, or null.
    facet?(topicId: string): ZelfFacet | null;
    // The choices of one of its topics at this leerjaar ([] when the leerjaar has none), for one facet option
    // (absent = the first); each choice carries its option in `facet`.
    choices(grade: Leerjaar, topicId: string, facet?: string): ZelfChoice[];
}

export const ZELF_SUBJECTS: readonly ZelfSubject[] = [FRANS_ZELF];

/** The subject a topic belongs to, or null for a maths topic. */
export const zelfSubjectOf = (topicId: string): ZelfSubject | null => ZELF_SUBJECTS.find(s => s.topics.some(t => t.id === topicId)) ?? null;

/** A subject topic's label, or null for a maths topic. */
export const subjectTopicLabel = (topicId: string): string | null => zelfSubjectOf(topicId)?.topics.find(t => t.id === topicId)?.label ?? null;

/** The extra row of a subject topic, or null (every maths topic). */
export const zelfFacetOf = (topicId: string): ZelfFacet | null => zelfSubjectOf(topicId)?.facet?.(topicId) ?? null;
