import type { ZelfFacet, ZelfSubject } from '../../oefenen/zelf/zelfSubjects';
import type { ZelfChoice } from '../../oefenen/zelf/zelfSessie';
import { FRANS_CARDS, FRANS_DIRS, FRANS_DIR_LABELS, FRANS_GRADES, FRANS_MODE_LABELS, fransVariants, type FransCard } from './fransCards';
import { WOORD_CARDS, dirLabelOf, woordVariants, type WoordCard } from './woordCards';
import type { FransMode } from './questions';
import type { WordDirChoice } from './woorden';

// Frans on the Zelf home: one topic per card. A verb card's "Welke oefening?" buttons are its three oefeningen with a
// Richting row under them (owner 2026-11-18: three times three buttons would crowd the screen); a word card's buttons
// are its three directions.

const TOPIC_PREFIX = 'frans:';
export const fransTopicOf = (card: FransCard | WoordCard): string => `${TOPIC_PREFIX}${card.id}`;
const cardOfTopic = (topicId: string) => FRANS_CARDS.find(c => fransTopicOf(c) === topicId) ?? null;
const woordCardOfTopic = (topicId: string) => WOORD_CARDS.find(c => fransTopicOf(c) === topicId) ?? null;

// "Nederlands → Frans" does not fit three segments on a phone: the buttons say NL → FR, their names say it in full.
const RICHTING_SHORT: Readonly<Record<WordDirChoice, string>> = { 'nl-fr': 'NL → FR', 'fr-nl': 'FR → NL', mix: 'Door elkaar' };
const RICHTING: ZelfFacet = { label: 'Richting', options: FRANS_DIRS.map(d => ({ key: d, label: FRANS_DIR_LABELS[d].replace(' ', ' '), short: RICHTING_SHORT[d] })) };

export const FRANS_ZELF: ZelfSubject = {
    section: 'Frans',
    tint: 'var(--kid-fr-tint)',
    grades: FRANS_GRADES,
    topics: [...FRANS_CARDS, ...WOORD_CARDS].map(c => ({ id: fransTopicOf(c), label: c.label })),
    facet: topicId => (cardOfTopic(topicId) ? RICHTING : null),
    choices: (grade, topicId, facet) => {
        if (!FRANS_GRADES.includes(grade)) return [];
        const card = cardOfTopic(topicId);
        if (card) {
            const dir = (FRANS_DIRS.find(d => d === facet) ?? 'nl-fr') as WordDirChoice;
            return fransVariants(card, grade, dir).map((v): ZelfChoice => {
                const mode = v.ov.mode as FransMode;
                // Nederlands → Frans keeps the key it had before the Richting row, so earlier runs still count.
                return { key: `${grade}|${topicId}|${mode}${dir === 'nl-fr' ? '' : `|${dir}`}`, label: FRANS_MODE_LABELS[mode], vars: [v], facet: dir };
            });
        }
        const woord = woordCardOfTopic(topicId);
        return woord ? woordVariants(woord, grade).map((v): ZelfChoice => {
            const dir = v.ov.dir as WordDirChoice;
            return { key: `${grade}|${topicId}|${dir}`, label: dirLabelOf(woord, dir), vars: [v] };
        }) : [];
    },
};
