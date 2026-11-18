import type { ReactNode } from 'react';
import { FransBadge, FransPicture } from '../../talen/frans/FransArt';
import { FRANS_TOPICS, fransTopicOf } from '../../talen/frans/fransZelf';

// The pictures of the subjects beside the maths (zelfSubjects.ts): a drawing per topic card and a badge for the
// Keuze screen (their options screens: SubjectOptions.tsx). Kept apart from the data so the session code never loads a drawing.

const PICTURES: ReadonlyMap<string, ReactNode> = new Map(FRANS_TOPICS.map(t => [fransTopicOf(t.topic), <FransPicture key={t.topic} card={t.topic} />]));
const BADGES: Readonly<Record<string, ReactNode>> = { Frans: <FransBadge /> };

/** A subject topic's card picture; undefined for a maths topic (its game or Oefenmodus picture). */
export const subjectPicture = (topicId: string): ReactNode | undefined => PICTURES.get(topicId);

/** A subject's badge on the Keuze screen. */
export const subjectBadge = (section: string): ReactNode => BADGES[section] ?? section.charAt(0);
