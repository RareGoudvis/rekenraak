import type { ZelfSubject } from '../../oefenen/zelf/zelfSubjects';
import type { ZelfChoice } from '../../oefenen/zelf/zelfSessie';
import { FRANS_CARDS, FRANS_GRADES, FRANS_MODE_LABELS, fransVariants, type FransCard } from './fransCards';
import type { FransMode } from './questions';

// Frans on the Zelf home: five topics (one per card), each with its three oefeningen as the "Welke oefening?" buttons.

const TOPIC_PREFIX = 'frans:';
export const fransTopicOf = (card: FransCard): string => `${TOPIC_PREFIX}${card.id}`;
const cardOfTopic = (topicId: string) => FRANS_CARDS.find(c => fransTopicOf(c) === topicId) ?? null;

export const FRANS_ZELF: ZelfSubject = {
    section: 'Frans',
    tint: 'var(--kid-fr-tint)',
    grades: FRANS_GRADES,
    topics: FRANS_CARDS.map(c => ({ id: fransTopicOf(c), label: c.label })),
    choices: (grade, topicId) => {
        const card = cardOfTopic(topicId);
        if (!card || !FRANS_GRADES.includes(grade)) return [];
        return fransVariants(card, grade).map((v): ZelfChoice => {
            const mode = v.ov.mode as FransMode;
            return { key: `${grade}|${topicId}|${mode}`, label: FRANS_MODE_LABELS[mode], vars: [v] };
        });
    },
};
