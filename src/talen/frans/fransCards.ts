import type { CardVariant } from '../../config/eenvoudig/cards';
import type { Leerjaar } from '../../config/gradePresets';
import { VERBS, type Tense, type VerbGroup } from './verbs';
import { FRANS_MODES, type FransMode, type FransSettings } from './questions';
import type { WordDirChoice } from './woorden';

// The five Frans cards on the Zelf home (owner 2026-11-18) and their three oefeningen. A card's variants are plain
// card variants (leafId frans-<card>, the settings in `ov`), so the Zelf choice, the games and Nakijken carry them as
// they carry the maths cards; the subject seam turns them into session types (fransKiosk.ts).

export const FRANS_TYPE_ID = 'frans-werkwoorden';
// Op.stap Frans starts in leerjaar 5.
export const FRANS_GRADES: readonly Leerjaar[] = [5, 6];

export type FransCardId = 'avoir-etre' | 'onregelmatig' | 'er' | 'ir-re' | 'alles';

export interface FransCard {
    id: FransCardId;
    label: string;
    verbs: readonly string[];
}

const ofGroups = (...groups: VerbGroup[]) => VERBS.filter(v => groups.includes(v.group)).map(v => v.inf);

export const FRANS_CARDS: readonly FransCard[] = [
    { id: 'avoir-etre', label: 'avoir & être', verbs: ['avoir', 'être'] },
    { id: 'onregelmatig', label: 'Onregelmatig', verbs: ofGroups('onregelmatig') },
    { id: 'er', label: 'Werkwoorden op -er', verbs: ofGroups('er') },
    { id: 'ir-re', label: 'Op -ir en -re', verbs: ofGroups('ir', 're') },
    { id: 'alles', label: 'Alles door elkaar', verbs: VERBS.map(v => v.inf) },
];

export const FRANS_MODE_LABELS: Readonly<Record<FransMode, string>> = {
    vervoegen: 'Eén werkwoord vervoegen',
    werkwoord: 'Welk werkwoord?',
    samen: 'Alles samen',
};

// The Richting row under the oefeningen (owner 2026-11-18): Nederlands → Frans as before first, the default. A no-break
// space keeps the arrow with the first language when a button wraps.
export const FRANS_DIRS: readonly WordDirChoice[] = ['nl-fr', 'fr-nl', 'mix'];
export const FRANS_DIR_LABELS: Readonly<Record<WordDirChoice, string>> = {
    'nl-fr': 'Nederlands\u00A0→ Frans',
    'fr-nl': 'Frans\u00A0→ Nederlands',
    mix: 'Door elkaar',
};

// Step 1 is présent only; step 2 adds a Tijd row that sets this per choice.
export const FRANS_TENSE: Tense = 'present';

const LEAF_PREFIX = 'frans-';
export const fransLeafOf = (card: FransCard): string => `${LEAF_PREFIX}${card.id}`;
export const fransCardOfLeaf = (leafId: string): FransCard | null =>
    leafId.startsWith(LEAF_PREFIX) ? FRANS_CARDS.find(c => fransLeafOf(c) === leafId) ?? null : null;

/** "avoir & être · Alles samen", with the direction when it is not the first one. */
export const fransLabelOf = (card: FransCard, mode: FransMode, dir: WordDirChoice = 'nl-fr'): string =>
    [card.label, FRANS_MODE_LABELS[mode], ...(dir === 'nl-fr' ? [] : [FRANS_DIR_LABELS[dir]])].join(' · ');

/** The card variant of one oefening and direction: what a Zelf choice holds (Nederlands → Frans keeps its old id). */
export function fransVariant(card: FransCard, mode: FransMode, grade: Leerjaar, tense: Tense = FRANS_TENSE, dir: WordDirChoice = 'nl-fr'): CardVariant {
    const ov: FransSettings & Record<string, unknown> = { tense, mode, verbs: [...card.verbs], dir };
    const id = `frans-${card.id}-${mode}-${tense}${dir === 'nl-fr' ? '' : `-${dir}`}`;
    return { id, l: FRANS_MODE_LABELS[mode], lj: grade, leafId: fransLeafOf(card), ov, count: null, label: fransLabelOf(card, mode, dir) };
}

/** A card's three oefeningen in one direction, in the owner's order. */
export const fransVariants = (card: FransCard, grade: Leerjaar, dir: WordDirChoice = 'nl-fr'): CardVariant[] =>
    FRANS_MODES.map(m => fransVariant(card, m, grade, FRANS_TENSE, dir));

export const fransLeaves: readonly string[] = FRANS_CARDS.map(fransLeafOf);
