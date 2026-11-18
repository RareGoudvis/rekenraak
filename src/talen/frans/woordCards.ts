import type { CardVariant } from '../../config/eenvoudig/cards';
import type { Leerjaar } from '../../config/gradePresets';
import type { WordDirChoice, WordSettings } from './woorden';

// The Frans word cards on the Zelf home (owner 2026-11-18): Dagen en maanden (two toggles) and Getallen (which
// numbers), each with a Richting. The pupil's pick becomes one plain card variant (the lists and the direction in
// `ov`); woordKiosk.ts makes it a session type. A new word card = a leaf here, its lists in woorden.ts, its options in
// fransOptions.ts and its picture in FransArt.tsx.

export const FRANS_WOORD_TYPE_ID = 'frans-woorden';
export const WOORD_LEAF = 'frans-woorden';
export const GETALLEN_LEAF = 'frans-getallen';
export const woordLeaves: readonly string[] = [WOORD_LEAF, GETALLEN_LEAF];

export type NumberSet = 'getallen20' | 'tientallen' | 'getallen100';
export const NUMBER_SETS: readonly { set: NumberSet; label: string }[] = [
    { set: 'getallen20', label: 'tot 20' },
    { set: 'tientallen', label: 'tientallen tot 100' },
    { set: 'getallen100', label: 'alles tot 100' },
];

// The ways in each card's order: the words start from French (mercredi → woensdag), the numbers from the digits
// (14 → quatorze). short = the segment text (three fit a phone).
export const WORD_WAYS: readonly { dir: WordDirChoice; label: string; short: string }[] = [
    { dir: 'fr-nl', label: 'Frans → Nederlands', short: 'FR → NL' },
    { dir: 'nl-fr', label: 'Nederlands → Frans', short: 'NL → FR' },
    { dir: 'mix', label: 'Door elkaar', short: 'Door elkaar' },
];
export const NUMBER_WAYS: readonly { dir: WordDirChoice; label: string; short: string }[] = [
    { dir: 'nl-fr', label: 'Cijfer → Frans', short: 'Cijfer → FR' },
    { dir: 'fr-nl', label: 'Frans → cijfer', short: 'FR → cijfer' },
    { dir: 'mix', label: 'Door elkaar', short: 'Door elkaar' },
];

const LIST_NAMES: Readonly<Record<string, string>> = { dagen: 'Dagen', maanden: 'Maanden', getallen20: 'Getallen tot 20', tientallen: 'Tientallen tot 100', getallen100: 'Getallen tot 100' };

const waysOf = (leafId: string) => (leafId === GETALLEN_LEAF ? NUMBER_WAYS : WORD_WAYS);

/** "Dagen en maanden · FR → NL": what a run of this pick is called in the results. */
export function woordLabelOf(leafId: string, s: WordSettings): string {
    const names = s.lists.map(l => LIST_NAMES[l] ?? l);
    const lists = names.length === 1 ? names[0] : `${names[0]} en ${names.slice(1).join(' en ').toLowerCase()}`;
    return `${lists} · ${waysOf(leafId).find(w => w.dir === s.dir)?.label ?? ''}`;
}

/** The card variant of one pick: what a Zelf choice holds. The same pick always has the same id. */
export function woordVariant(leafId: string, s: WordSettings, grade: Leerjaar): CardVariant {
    const ov: WordSettings & Record<string, unknown> = { lists: [...s.lists], dir: s.dir };
    const l = waysOf(leafId).find(w => w.dir === s.dir)?.label ?? '';
    return { id: `${leafId}-${s.lists.join('-')}-${s.dir}`, l, lj: grade, leafId, ov, count: null, label: woordLabelOf(leafId, s) };
}
