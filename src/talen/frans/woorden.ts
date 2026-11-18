import { GETALLEN_20, GETALLEN_100, TIENTALLEN } from './getallen';

// French word lists for the kids app (Op.stap Frans: woordenschat). A list is data only: its {fr, nl} pairs in their
// natural order; the question maker below asks any list in either direction. A new list = one entry in WORD_LISTS and
// a card in woordCards.ts.

export interface WordPair {
    fr: string;
    // The Dutch word, or for a number its digits ("72").
    nl: string;
    // A second French form used in Belgium (septante-deux beside soixante-douze); one question shows one of the two.
    alt?: string;
}

// The kiosk's line above the card and the label before the blank, per direction.
export interface WordTexts {
    instruction: string;
    ask: string;
}

export interface WordList {
    id: string;
    pairs: readonly WordPair[];
    // What one item is, for the explanation "woensdag is de 3de dag van de week"; absent = the order means nothing.
    ordinal?: string;
    // The distractors in tiers of pair indices, closest first (the numbers: 17 beside 70, the neighbours); absent = any
    // other pair of the list, at random.
    near?: (index: number) => readonly (readonly number[])[];
    // The pairs the game help lists for a question (a number's own tens); absent = the whole list.
    helpRows?: (index: number) => readonly number[];
    // Absent = the words' texts (Nederlands / Frans).
    texts?: Readonly<Record<WordDir, WordTexts>>;
    // The help lines read Dutch side first ("72 = soixante-douze"); absent = French first ("lundi = maandag").
    nlFirst?: boolean;
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

export const WORD_LISTS: readonly WordList[] = [DAGEN, MAANDEN, GETALLEN_20, TIENTALLEN, GETALLEN_100];
export const WORD_LIST_BY_ID: ReadonlyMap<string, WordList> = new Map(WORD_LISTS.map(l => [l.id, l]));

// fr-nl = see "mercredi", pick "woensdag"; nl-fr = see "augustus", pick "août"; mix = either, per question.
export type WordDir = 'fr-nl' | 'nl-fr';
export type WordDirChoice = WordDir | 'mix';
export const WORD_DIRS: readonly WordDirChoice[] = ['fr-nl', 'nl-fr', 'mix'];

const WORD_TEXTS: Readonly<Record<WordDir, WordTexts>> = {
    'fr-nl': { instruction: 'Wat betekent dit Franse woord?', ask: 'Nederlands:' },
    'nl-fr': { instruction: 'Hoe zeg je dit in het Frans?', ask: 'Frans:' },
};

export interface WordSettings {
    // The WORD_LISTS ids the card asks.
    lists: readonly string[];
    dir: WordDirChoice;
}

export interface WordExercise {
    list: string;
    // The pair's place in its list (0 = lundi / janvier / zéro).
    index: number;
    dir: WordDir;
    // The word on the card ("mercredi") and the right choice ("woensdag").
    shown: string;
    answer: string;
    // Six different words in the answer's language, the answer among them, shuffled.
    choices: string[];
    // The question uses the Belgian forms (septante, nonante), for every French word on it.
    be?: boolean;
}

export const WORD_CHOICE_COUNT = 6;
// With two lists (dagen en maanden) at most this many distractors come from the answer's own list, so the other list
// always shows too; one list alone fills every place from itself.
const OWN_LIST_MAX = 3;
// Of a list with near tiers, at most this many distractors from its closest tier (the traps), so the neighbours show too.
const TRAP_MAX = 3;

function shuffle<T>(list: readonly T[], rng: () => number): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const pick = <T>(list: readonly T[], rng: () => number): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

/** The French word of a pair in the question's form: the Belgian one where the pair has it. */
export const frOf = (p: WordPair, be: boolean): string => (be && p.alt ? p.alt : p.fr);

const side = (p: WordPair, dir: WordDir, be = false) => (dir === 'fr-nl' ? { shown: frOf(p, be), answer: p.nl } : { shown: p.nl, answer: frOf(p, be) });

/** The lists a setting asks, in its order; unknown ids are left out. */
export const listsOf = (ids: readonly string[]): WordList[] => ids.map(id => WORD_LIST_BY_ID.get(id)).filter((l): l is WordList => !!l);

// The distractor order of a list with near tiers: a few traps, then the rest of the tiers in turn, each tier shuffled.
function nearOrder(list: WordList, index: number, rng: () => number): number[] {
    const tiers = list.near!(index).map(t => shuffle(t.filter(i => i !== index && i >= 0 && i < list.pairs.length), rng));
    const [traps = [], ...rest] = tiers;
    const all = list.pairs.map((_, i) => i).filter(i => i !== index);
    return [...traps.slice(0, TRAP_MAX), ...rest.flat(), ...traps.slice(TRAP_MAX), ...shuffle(all, rng)];
}

/** One question from the card's lists, or null when they cannot make six choices. */
export function makeWordExercise(s: WordSettings, rng: () => number): WordExercise | null {
    const lists = listsOf(s.lists);
    const all = lists.flatMap(l => l.pairs.map((p, index) => ({ list: l, p, index })));
    if (all.length < WORD_CHOICE_COUNT) return null;
    const { list, p, index } = pick(all, rng);
    const dir: WordDir = s.dir === 'mix' ? (rng() < 0.5 ? 'fr-nl' : 'nl-fr') : s.dir;
    // One form for the whole question, so its choices never hold both forms of one number; only a list with
    // Belgian forms draws it (the days and months keep their seeded questions).
    const be = list.pairs.some(x => x.alt) && rng() < 0.5;
    const { shown, answer } = side(p, dir, be);
    const words = (from: readonly WordPair[]) => shuffle(from.map(x => side(x, dir, be).answer), rng);
    const candidates = list.near
        ? nearOrder(list, index, rng).map(i => side(list.pairs[i], dir, be).answer)
        : (() => {
            const own = words(list.pairs.filter(x => x !== p));
            const other = words(lists.filter(l => l !== list).flatMap(l => l.pairs));
            const ownCount = other.length ? OWN_LIST_MAX : WORD_CHOICE_COUNT - 1;
            return [...own.slice(0, ownCount), ...other, ...own];
        })();
    const out: string[] = [answer];
    for (const w of candidates) {
        if (out.length >= WORD_CHOICE_COUNT) break;
        if (!out.includes(w)) out.push(w);
    }
    if (out.length < WORD_CHOICE_COUNT) return null;
    return { list: list.id, index, dir, shown, answer, choices: shuffle(out, rng), ...(be && { be }) };
}

const pairOf = (ex: WordExercise): WordPair => WORD_LIST_BY_ID.get(ex.list)!.pairs[ex.index];

/** The kiosk texts of a question's list and direction. */
export const textsOf = (ex: WordExercise): WordTexts => (WORD_LIST_BY_ID.get(ex.list)?.texts ?? WORD_TEXTS)[ex.dir];

/** The right pair, the question's word first: "mercredi = woensdag", "72 = soixante-douze". */
export const pairLine = (ex: WordExercise): string => `${ex.shown} = ${ex.answer}`;

/** The other form of a number with two ("In België ook: septante-deux."), or null. */
export function otherFormLine(ex: WordExercise): string | null {
    const p = pairOf(ex);
    if (!p.alt) return null;
    return ex.be ? `In Frankrijk: ${p.fr}.` : `In België ook: ${p.alt}.`;
}

/** The line the flash shows after a fout: the pair, with a number's other form in brackets. */
export function flashLine(ex: WordExercise): string {
    const p = pairOf(ex);
    if (!p.alt) return pairLine(ex);
    return `${pairLine(ex)} (${ex.be ? `in Frankrijk: ${p.fr}` : `in België ook: ${p.alt}`})`;
}

// Dutch ordinals: 1ste, 8ste and from 20 on take -ste, the rest -de.
const ordinalNl = (n: number): string => `${n}${n === 1 || n === 8 || n >= 20 ? 'ste' : 'de'}`;

/** "woensdag is de 3de dag van de week": the Dutch word's place, or null when the list has no order. */
export function orderLine(ex: WordExercise): string | null {
    const list = WORD_LIST_BY_ID.get(ex.list);
    return list?.ordinal ? `${pairOf(ex).nl} is de ${ordinalNl(ex.index + 1)} ${list.ordinal}.` : null;
}

/** The pairs the game help shows for a question, French = Dutch in the question's form: "lundi = maandag" … */
export function tableOf(ex: WordExercise): string[] {
    const list = WORD_LIST_BY_ID.get(ex.list);
    if (!list) return [];
    const rows = list.helpRows?.(ex.index) ?? list.pairs.map((_, i) => i);
    return rows.map(i => list.pairs[i]).map(p => (list.nlFirst ? `${p.nl} = ${frOf(p, !!ex.be)}` : `${frOf(p, !!ex.be)} = ${p.nl}`));
}

/** The longest word a setting can put on a choice: the answer side's words of its lists (both forms of a number). */
export function wordChoiceChars(s: WordSettings): number {
    const lists = listsOf(s.lists);
    const sides: WordDir[] = s.dir === 'mix' ? ['fr-nl', 'nl-fr'] : [s.dir];
    return Math.max(1, ...lists.flatMap(l => l.pairs.flatMap(p => sides.flatMap(d => [false, true].map(be => side(p, d, be).answer.length)))));
}

/** Every answer of this setting is a number (Frans → cijfer): the games can type it. */
export const answersAreNumbers = (s: WordSettings): boolean =>
    s.dir === 'fr-nl' && listsOf(s.lists).every(l => l.pairs.every(p => /^\d+$/.test(p.nl)));
