// French word lists for the kids app (Op.stap Frans: woordenschat). A list is data only: its {fr, nl} pairs in their
// natural order; the question maker below asks any list in either direction. A new list (the numbers to 20) = one
// entry in WORD_LISTS and a card in woordCards.ts.

export interface WordPair {
    fr: string;
    nl: string;
}

export interface WordList {
    id: string;
    pairs: readonly WordPair[];
    // What one item is, for the explanation "woensdag is de 3de dag van de week"; absent = the order means nothing.
    ordinal?: string;
}

const pairs = (fr: readonly string[], nl: readonly string[]): WordPair[] => {
    if (fr.length !== nl.length) throw new Error('Frans: a word list needs as many French as Dutch words');
    return fr.map((w, i) => ({ fr: w, nl: nl[i] }));
};

// Lowercase in both languages, as French writes them; the week starts on Monday in France and in Flanders.
export const DAGEN: WordList = {
    id: 'dagen',
    ordinal: 'dag van de week',
    pairs: pairs(
        ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
        ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'],
    ),
};

export const MAANDEN: WordList = {
    id: 'maanden',
    ordinal: 'maand van het jaar',
    pairs: pairs(
        ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
        ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
    ),
};

export const WORD_LISTS: readonly WordList[] = [DAGEN, MAANDEN];
export const WORD_LIST_BY_ID: ReadonlyMap<string, WordList> = new Map(WORD_LISTS.map(l => [l.id, l]));

// fr-nl = see "mercredi", pick "woensdag"; nl-fr = see "augustus", pick "août"; mix = either, per question.
export type WordDir = 'fr-nl' | 'nl-fr';
export type WordDirChoice = WordDir | 'mix';
export const WORD_DIRS: readonly WordDirChoice[] = ['fr-nl', 'nl-fr', 'mix'];

export interface WordSettings {
    // The WORD_LISTS ids the card asks.
    lists: readonly string[];
    dir: WordDirChoice;
}

export interface WordExercise {
    list: string;
    // The pair's place in its list (0 = lundi / janvier).
    index: number;
    dir: WordDir;
    // The word on the card ("mercredi") and the right choice ("woensdag").
    shown: string;
    answer: string;
    // Six different words in the answer's language, the answer among them, shuffled.
    choices: string[];
}

export const WORD_CHOICE_COUNT = 6;
// With two lists (dagen en maanden) at most this many distractors come from the answer's own list, so the other list
// always shows too; one list alone fills every place from itself.
const OWN_LIST_MAX = 3;

function shuffle<T>(list: readonly T[], rng: () => number): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const pick = <T>(list: readonly T[], rng: () => number): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

const side = (p: WordPair, dir: WordDir) => (dir === 'fr-nl' ? { shown: p.fr, answer: p.nl } : { shown: p.nl, answer: p.fr });

/** The lists a setting asks, in its order; unknown ids are left out. */
export const listsOf = (ids: readonly string[]): WordList[] => ids.map(id => WORD_LIST_BY_ID.get(id)).filter((l): l is WordList => !!l);

/** One question from the card's lists, or null when they cannot make six choices. */
export function makeWordExercise(s: WordSettings, rng: () => number): WordExercise | null {
    const lists = listsOf(s.lists);
    const all = lists.flatMap(l => l.pairs.map((p, index) => ({ list: l, p, index })));
    if (all.length < WORD_CHOICE_COUNT) return null;
    const { list, p, index } = pick(all, rng);
    const dir: WordDir = s.dir === 'mix' ? (rng() < 0.5 ? 'fr-nl' : 'nl-fr') : s.dir;
    const { shown, answer } = side(p, dir);
    const words = (from: readonly WordPair[]) => shuffle(from.map(x => side(x, dir).answer), rng);
    const own = words(list.pairs.filter(x => x !== p));
    const other = words(lists.filter(l => l !== list).flatMap(l => l.pairs));
    const ownCount = other.length ? OWN_LIST_MAX : WORD_CHOICE_COUNT - 1;
    const out: string[] = [answer];
    for (const w of [...own.slice(0, ownCount), ...other, ...own]) {
        if (out.length >= WORD_CHOICE_COUNT) break;
        if (!out.includes(w)) out.push(w);
    }
    if (out.length < WORD_CHOICE_COUNT) return null;
    return { list: list.id, index, dir, shown, answer, choices: shuffle(out, rng) };
}

const pairOf = (ex: WordExercise): WordPair => WORD_LIST_BY_ID.get(ex.list)!.pairs[ex.index];

/** The right pair, the question's word first: "mercredi = woensdag", "augustus = août". */
export const pairLine = (ex: WordExercise): string => `${ex.shown} = ${ex.answer}`;

// Dutch ordinals: 1ste, 8ste and from 20 on take -ste, the rest -de.
const ordinalNl = (n: number): string => `${n}${n === 1 || n === 8 || n >= 20 ? 'ste' : 'de'}`;

/** "woensdag is de 3de dag van de week": the Dutch word's place, or null when the list has no order. */
export function orderLine(ex: WordExercise): string | null {
    const list = WORD_LIST_BY_ID.get(ex.list);
    return list?.ordinal ? `${pairOf(ex).nl} is de ${ordinalNl(ex.index + 1)} ${list.ordinal}.` : null;
}

/** The list a question comes from as the help shows it: "lundi = maandag" … */
export const tableOfList = (id: string): string[] => (WORD_LIST_BY_ID.get(id)?.pairs ?? []).map(p => `${p.fr} = ${p.nl}`);

/** The longest word a setting can put on a choice: the answer side's words of its lists. */
export function wordChoiceChars(s: WordSettings): number {
    const lists = listsOf(s.lists);
    const sides: WordDir[] = s.dir === 'mix' ? ['fr-nl', 'nl-fr'] : [s.dir];
    return Math.max(1, ...lists.flatMap(l => l.pairs.flatMap(p => sides.map(d => side(p, d).answer.length))));
}
