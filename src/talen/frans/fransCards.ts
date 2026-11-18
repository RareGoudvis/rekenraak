import type { CardVariant } from '../../config/eenvoudig/cards';
import type { Leerjaar } from '../../config/gradePresets';
import { VERBS, type Tense, type VerbGroup } from './verbs';
import { FRANS_MODES, type FransMode, type FransSettings } from './questions';

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

// Step 1 is présent only; step 2 adds a Tijd row that sets this per choice.
export const FRANS_TENSE: Tense = 'present';

const LEAF_PREFIX = 'frans-';
export const fransLeafOf = (card: FransCard): string => `${LEAF_PREFIX}${card.id}`;
export const fransCardOfLeaf = (leafId: string): FransCard | null =>
    leafId.startsWith(LEAF_PREFIX) ? FRANS_CARDS.find(c => fransLeafOf(c) === leafId) ?? null : null;

/** The card variant of one oefening: what a Zelf choice holds. */
export function fransVariant(card: FransCard, mode: FransMode, grade: Leerjaar, tense: Tense = FRANS_TENSE): CardVariant {
    const ov: FransSettings & Record<string, unknown> = { tense, mode, verbs: [...card.verbs] };
    const label = `${card.label} · ${FRANS_MODE_LABELS[mode]}`;
    return { id: `frans-${card.id}-${mode}-${tense}`, l: FRANS_MODE_LABELS[mode], lj: grade, leafId: fransLeafOf(card), ov, count: null, label };
}

/** A card's three oefeningen, in the owner's order. */
export const fransVariants = (card: FransCard, grade: Leerjaar): CardVariant[] => FRANS_MODES.map(m => fransVariant(card, m, grade));

export const fransLeaves: readonly string[] = FRANS_CARDS.map(fransLeafOf);
