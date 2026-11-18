import type { CardVariant } from '../../config/eenvoudig/cards';
import type { Leerjaar } from '../../config/gradePresets';
import type { WordDirChoice, WordSettings } from './woorden';

// The Frans word cards on the Zelf home (owner 2026-11-18): dagen, maanden, both, and the numbers, each asked three
// ways. Like the verb cards, a variant is a plain card variant (leafId frans-<card>, the settings in `ov`);
// woordKiosk.ts makes it a session type. A new word card = one row here (its lists from woorden.ts) and its picture
// in FransArt.tsx.

export const FRANS_WOORD_TYPE_ID = 'frans-woorden';

export type WoordCardId = 'dagen' | 'maanden' | 'dagen-maanden' | 'getallen-20' | 'tientallen' | 'getallen-100';

export interface WoordCard {
    id: WoordCardId;
    label: string;
    lists: readonly string[];
    // The three ways in the card's order, with their button labels.
    dirs: readonly { dir: WordDirChoice; label: string }[];
}

// A no-break space keeps the arrow with the first side when a button wraps ("Nederlands →" over "Frans").
const WORD_WAYS = [
    { dir: 'fr-nl', label: 'Frans → Nederlands' },
    { dir: 'nl-fr', label: 'Nederlands → Frans' },
    { dir: 'mix', label: 'Door elkaar' },
] as const;
// The numbers start from the digits (owner: 14 → quatorze first).
const NUMBER_WAYS = [
    { dir: 'nl-fr', label: 'Cijfer → Frans' },
    { dir: 'fr-nl', label: 'Frans → cijfer' },
    { dir: 'mix', label: 'Door elkaar' },
] as const;

export const WOORD_CARDS: readonly WoordCard[] = [
    { id: 'dagen', label: 'Dagen', lists: ['dagen'], dirs: WORD_WAYS },
    { id: 'maanden', label: 'Maanden', lists: ['maanden'], dirs: WORD_WAYS },
    { id: 'dagen-maanden', label: 'Dagen en maanden', lists: ['dagen', 'maanden'], dirs: WORD_WAYS },
    { id: 'getallen-20', label: 'Getallen tot 20', lists: ['getallen20'], dirs: NUMBER_WAYS },
    { id: 'tientallen', label: 'Tientallen tot 100', lists: ['tientallen'], dirs: NUMBER_WAYS },
    { id: 'getallen-100', label: 'Getallen tot 100', lists: ['getallen100'], dirs: NUMBER_WAYS },
];

/** A card's label for one of its ways ("Cijfer → Frans"). */
export const dirLabelOf = (card: WoordCard, dir: WordDirChoice): string => card.dirs.find(d => d.dir === dir)?.label ?? '';

const LEAF_PREFIX = 'frans-';
export const woordLeafOf = (card: WoordCard): string => `${LEAF_PREFIX}${card.id}`;
export const woordCardOfLeaf = (leafId: string): WoordCard | null =>
    leafId.startsWith(LEAF_PREFIX) ? WOORD_CARDS.find(c => woordLeafOf(c) === leafId) ?? null : null;

/** The card variant of one direction: what a Zelf choice holds. */
export function woordVariant(card: WoordCard, dir: WordDirChoice, grade: Leerjaar): CardVariant {
    const ov: WordSettings & Record<string, unknown> = { lists: [...card.lists], dir };
    const l = dirLabelOf(card, dir);
    return { id: `frans-${card.id}-${dir}`, l, lj: grade, leafId: woordLeafOf(card), ov, count: null, label: `${card.label} · ${l}` };
}

/** A card's three directions, in its own order. */
export const woordVariants = (card: WoordCard, grade: Leerjaar): CardVariant[] => card.dirs.map(d => woordVariant(card, d.dir, grade));

export const woordLeaves: readonly string[] = WOORD_CARDS.map(woordLeafOf);
