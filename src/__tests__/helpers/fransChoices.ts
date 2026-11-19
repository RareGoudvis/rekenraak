import type { Leerjaar } from '../../config/gradePresets';
import type { ZelfChoice } from '../../oefenen/zelf/zelfSessie';
import { FRANS_DIRS, FRANS_MODES_ORDER, verbsOfGroup } from '../../talen/frans/fransCards';
import { numberChoice, verbChoice, wordChoice } from '../../talen/frans/fransPicks';
import { NUMBER_SETS, type NumberSet } from '../../talen/frans/woordCards';
import { VERBS } from '../../talen/frans/verbs';
import type { FransMode, TenseChoice } from '../../talen/frans/questions';
import type { WordDirChoice } from '../../talen/frans/woorden';

// The Frans choices the tests play: what the three options screens can make (FransOptions.tsx), built the same way.

// The verb selections worth testing: the old cards' sets, a single verb with shared forms, a group's few verbs.
export const VERB_SETS: Readonly<Record<string, readonly string[]>> = {
    'avoir-etre': ['avoir', 'être'],
    onregelmatig: verbsOfGroup('onregelmatig'),
    er: verbsOfGroup('er'),
    'ir-re': [...verbsOfGroup('ir'), ...verbsOfGroup('re')],
    alles: VERBS.map(v => v.inf),
    parler: ['parler'],
    faire: ['faire'],
    ir: verbsOfGroup('ir'),
};

export const verbsOf = (verbs: readonly string[], mode: FransMode, dir: WordDirChoice = 'nl-fr', grade: Leerjaar = 5, tense: TenseChoice = 'present'): ZelfChoice =>
    verbChoice({ verbs, mode, dir, tense }, grade, 'frans:werkwoorden');
export const wordsOf = (lists: { dagen: boolean; maanden: boolean }, dir: WordDirChoice, grade: Leerjaar = 5): ZelfChoice =>
    wordChoice({ ...lists, dir }, grade, 'frans:woorden');
export const numbersOf = (set: NumberSet, dir: WordDirChoice, grade: Leerjaar = 5): ZelfChoice => numberChoice({ set, dir }, grade, 'frans:getallen');

export const WORD_LISTS_PICKS = [{ dagen: true, maanden: false }, { dagen: false, maanden: true }, { dagen: true, maanden: true }] as const;
const DIRS: readonly WordDirChoice[] = ['fr-nl', 'nl-fr', 'mix'];

const MODE_OF: Readonly<Record<string, FransMode>> = { 'Eén werkwoord vervoegen': 'vervoegen', 'Welk werkwoord?': 'werkwoord', 'Alles samen': 'samen' };
const DIR_OF: Readonly<Record<string, WordDirChoice>> = {
    'Frans → Nederlands': 'fr-nl', 'Nederlands → Frans': 'nl-fr', 'Door elkaar': 'mix', 'Cijfer → Frans': 'nl-fr', 'Frans → cijfer': 'fr-nl',
};
const LISTS_OF: Readonly<Record<string, { dagen: boolean; maanden: boolean }>> = {
    dagen: { dagen: true, maanden: false }, maanden: { dagen: false, maanden: true }, 'dagen-maanden': { dagen: true, maanden: true },
};
const SET_OF: Readonly<Record<string, NumberSet>> = { 'getallen-20': 'getallen20', tientallen: 'tientallen', 'getallen-100': 'getallen100' };

/** A pick named as one of the old cards and its button ("frans:er", "Alles samen"; "frans:dagen", "Frans → Nederlands"). */
export function pickOf(card: string, label: string, grade: Leerjaar = 5, dir?: WordDirChoice): ZelfChoice {
    const id = card.replace(/^frans:/, '');
    if (VERB_SETS[id]) return verbsOf(VERB_SETS[id], MODE_OF[label], dir ?? 'nl-fr', grade);
    if (LISTS_OF[id]) return wordsOf(LISTS_OF[id], DIR_OF[label], grade);
    return numbersOf(SET_OF[id], DIR_OF[label], grade);
}

/** Every pick worth testing, with the topic it belongs to. */
export function allFransChoices(grade: Leerjaar = 5): { topic: string; choice: ZelfChoice }[] {
    return [
        ...Object.values(VERB_SETS).flatMap(verbs => FRANS_MODES_ORDER.flatMap(m => FRANS_DIRS.map(d => ({ topic: 'frans:werkwoorden', choice: verbsOf(verbs, m, d, grade) })))),
        ...WORD_LISTS_PICKS.flatMap(l => DIRS.map(d => ({ topic: 'frans:woorden', choice: wordsOf(l, d, grade) }))),
        ...NUMBER_SETS.flatMap(n => DIRS.map(d => ({ topic: 'frans:getallen', choice: numbersOf(n.set, d, grade) }))),
    ];
}
