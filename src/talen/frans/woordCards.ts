import type { CardVariant } from '../../config/eenvoudig/cards';
import type { Leerjaar } from '../../config/gradePresets';
import { WORD_DIRS, type WordDirChoice, type WordSettings } from './woorden';

// The Frans word cards on the Zelf home (owner 2026-11-18): dagen, maanden and both, each asked three ways. Like the
// verb cards, a variant is a plain card variant (leafId frans-<card>, the settings in `ov`); woordKiosk.ts makes it a
// session type. A new word card = one row here (its lists from woorden.ts) and its picture in FransArt.tsx.

export const FRANS_WOORD_TYPE_ID = 'frans-woorden';

export type WoordCardId = 'dagen' | 'maanden' | 'dagen-maanden';

export interface WoordCard {
    id: WoordCardId;
    label: string;
    lists: readonly string[];
}

export const WOORD_CARDS: readonly WoordCard[] = [
    { id: 'dagen', label: 'Dagen', lists: ['dagen'] },
    { id: 'maanden', label: 'Maanden', lists: ['maanden'] },
    { id: 'dagen-maanden', label: 'Dagen en maanden', lists: ['dagen', 'maanden'] },
];

// A no-break space keeps the arrow with the first language when the button wraps ("Nederlands →" over "Frans").
export const WORD_DIR_LABELS: Readonly<Record<WordDirChoice, string>> = {
    'fr-nl': 'Frans → Nederlands',
    'nl-fr': 'Nederlands → Frans',
    mix: 'Door elkaar',
};

const LEAF_PREFIX = 'frans-';
export const woordLeafOf = (card: WoordCard): string => `${LEAF_PREFIX}${card.id}`;
export const woordCardOfLeaf = (leafId: string): WoordCard | null =>
    leafId.startsWith(LEAF_PREFIX) ? WOORD_CARDS.find(c => woordLeafOf(c) === leafId) ?? null : null;

/** The card variant of one direction: what a Zelf choice holds. */
export function woordVariant(card: WoordCard, dir: WordDirChoice, grade: Leerjaar): CardVariant {
    const ov: WordSettings & Record<string, unknown> = { lists: [...card.lists], dir };
    return { id: `frans-${card.id}-${dir}`, l: WORD_DIR_LABELS[dir], lj: grade, leafId: woordLeafOf(card), ov, count: null, label: `${card.label} · ${WORD_DIR_LABELS[dir]}` };
}

/** A card's three directions, in the owner's order. */
export const woordVariants = (card: WoordCard, grade: Leerjaar): CardVariant[] => WORD_DIRS.map(d => woordVariant(card, d, grade));

export const woordLeaves: readonly string[] = WOORD_CARDS.map(woordLeafOf);
