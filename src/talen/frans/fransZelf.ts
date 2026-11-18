import type { ZelfSubject } from '../../oefenen/zelf/zelfSubjects';
import type { ZelfChoice } from '../../oefenen/zelf/zelfSessie';
import { FRANS_CARDS, FRANS_GRADES, FRANS_MODE_LABELS, fransVariants, type FransCard } from './fransCards';
import { WOORD_CARDS, WORD_DIR_LABELS, woordVariants, type WoordCard } from './woordCards';
import type { FransMode } from './questions';
import type { WordDirChoice } from './woorden';

// Frans on the Zelf home: one topic per card, the verb cards (three oefeningen each) then the word cards (three
// directions each), as the "Welke oefening?" buttons.

const TOPIC_PREFIX = 'frans:';
export const fransTopicOf = (card: FransCard | WoordCard): string => `${TOPIC_PREFIX}${card.id}`;
const cardOfTopic = (topicId: string) => FRANS_CARDS.find(c => fransTopicOf(c) === topicId) ?? null;
const woordCardOfTopic = (topicId: string) => WOORD_CARDS.find(c => fransTopicOf(c) === topicId) ?? null;

export const FRANS_ZELF: ZelfSubject = {
    section: 'Frans',
    tint: 'var(--kid-fr-tint)',
    grades: FRANS_GRADES,
    topics: [...FRANS_CARDS, ...WOORD_CARDS].map(c => ({ id: fransTopicOf(c), label: c.label })),
    choices: (grade, topicId) => {
        if (!FRANS_GRADES.includes(grade)) return [];
        const card = cardOfTopic(topicId);
        if (card) {
            return fransVariants(card, grade).map((v): ZelfChoice => {
                const mode = v.ov.mode as FransMode;
                return { key: `${grade}|${topicId}|${mode}`, label: FRANS_MODE_LABELS[mode], vars: [v] };
            });
        }
        const woord = woordCardOfTopic(topicId);
        return woord ? woordVariants(woord, grade).map((v): ZelfChoice => {
            const dir = v.ov.dir as WordDirChoice;
            return { key: `${grade}|${topicId}|${dir}`, label: WORD_DIR_LABELS[dir], vars: [v] };
        }) : [];
    },
};
