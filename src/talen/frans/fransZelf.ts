import type { ZelfSubject } from '../../oefenen/zelf/zelfSubjects';
import type { ZelfChoice } from '../../oefenen/zelf/zelfSessie';
import type { Leerjaar } from '../../config/gradePresets';
import { FRANS_GRADES } from './fransCards';
import { numberChoice, readPicks, verbChoice, wordChoice, type FransPicks } from './fransPicks';

// Frans on the Zelf home (owner 2026-11-18): three cards, each with its own options screen (FransOptions.tsx); the
// pupil's last pick on this device is the topic's one choice, so the Keuze screen opens on it and the games and the
// topic card's stickers play it.

export type FransTopic = 'werkwoorden' | 'woorden' | 'getallen';
export const FRANS_TOPICS: readonly { topic: FransTopic; label: string }[] = [
    { topic: 'werkwoorden', label: 'Werkwoorden' },
    { topic: 'woorden', label: 'Dagen en maanden' },
    { topic: 'getallen', label: 'Getallen' },
];

const TOPIC_PREFIX = 'frans:';
export const fransTopicOf = (topic: FransTopic): string => `${TOPIC_PREFIX}${topic}`;
export const fransTopicOfId = (topicId: string): FransTopic | null => FRANS_TOPICS.find(t => fransTopicOf(t.topic) === topicId)?.topic ?? null;

/** The Zelf choice a pick makes on one of the three cards. */
export function fransChoiceOf(topic: FransTopic, picks: FransPicks, grade: Leerjaar): ZelfChoice {
    const id = fransTopicOf(topic);
    if (topic === 'werkwoorden') return verbChoice(picks.werkwoorden, grade, id);
    if (topic === 'woorden') return wordChoice(picks.woorden, grade, id);
    return numberChoice(picks.getallen, grade, id);
}

export const FRANS_ZELF: ZelfSubject = {
    section: 'Frans',
    tint: 'var(--kid-fr-tint)',
    grades: FRANS_GRADES,
    topics: FRANS_TOPICS.map(t => ({ id: fransTopicOf(t.topic), label: t.label })),
    choices: (grade, topicId) => {
        const topic = fransTopicOfId(topicId);
        return topic && FRANS_GRADES.includes(grade) ? [fransChoiceOf(topic, readPicks(), grade)] : [];
    },
};
