import type { Leerjaar } from '../../config/gradePresets';
import type { ZelfChoice } from '../../oefenen/zelf/zelfSessie';
import { FRANS_DIRS, FRANS_MODES_ORDER, FRANS_MODE_LABELS, FRANS_TENSES, fransVariant, tenseForGrade, verbsOfGroup, type VerbPick } from './fransCards';
import { GETALLEN_LEAF, NUMBER_SETS, NUMBER_WAYS, WOORD_LEAF, WORD_WAYS, woordVariant, type NumberSet } from './woordCards';
import { VERBS, type VerbGroup } from './verbs';
import type { FransMode } from './questions';
import type { WordDirChoice } from './woorden';

// The options of the three Frans cards (owner 2026-11-18), as pure state: the defaults, the toggles with their "at
// least one" rules, the device's last pick (one key for all three), and the Zelf choice a pick makes.

export const FRANS_OPTIONS_KEY = 'rekenraak_zelf_frans_v1';

export interface WordPick { dagen: boolean; maanden: boolean; dir: WordDirChoice }
export interface NumberPick { set: NumberSet; dir: WordDirChoice }
export interface FransPicks { werkwoorden: VerbPick; woorden: WordPick; getallen: NumberPick }

// avoir and être: the first verbs a class meets.
export const DEFAULT_PICKS: FransPicks = {
    werkwoorden: { verbs: ['être', 'avoir'], mode: 'vervoegen', dir: 'nl-fr', tense: 'present' },
    woorden: { dagen: true, maanden: false, dir: 'fr-nl' },
    getallen: { set: 'getallen20', dir: 'nl-fr' },
};

const ALL_VERBS = VERBS.map(v => v.inf);
const inOrder = (verbs: Iterable<string>) => { const on = new Set(verbs); return ALL_VERBS.filter(v => on.has(v)); };
const oneOf = <T>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? v as T : fallback);

/** A stored pick made safe: known verbs only (at least one), known modes and ways, at least one word list. */
export function cleanPicks(raw: unknown): FransPicks {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof FransPicks, Record<string, unknown>>>;
    const d = DEFAULT_PICKS;
    const w = r.werkwoorden ?? {}, m = r.woorden ?? {}, g = r.getallen ?? {};
    const verbs = Array.isArray(w.verbs) ? inOrder(w.verbs.filter((x): x is string => typeof x === 'string')) : [];
    const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
    const words = { dagen: flag(m.dagen, d.woorden.dagen), maanden: flag(m.maanden, d.woorden.maanden) };
    return {
        werkwoorden: {
            verbs: verbs.length ? verbs : [...d.werkwoorden.verbs], mode: oneOf(w.mode, FRANS_MODES_ORDER, d.werkwoorden.mode),
            dir: oneOf(w.dir, FRANS_DIRS, d.werkwoorden.dir), tense: oneOf(w.tense, FRANS_TENSES, 'present'),
        },
        woorden: { ...(words.dagen || words.maanden ? words : { dagen: true, maanden: false }), dir: oneOf(m.dir, WORD_WAYS.map(x => x.dir), d.woorden.dir) },
        getallen: { set: oneOf(g.set, NUMBER_SETS.map(x => x.set), d.getallen.set), dir: oneOf(g.dir, NUMBER_WAYS.map(x => x.dir), d.getallen.dir) },
    };
}

export function readPicks(): FransPicks {
    try { return cleanPicks(JSON.parse(globalThis.localStorage?.getItem(FRANS_OPTIONS_KEY) ?? '{}')); } catch { return cleanPicks({}); }
}

export function savePicks(picks: FransPicks) {
    try { globalThis.localStorage?.setItem(FRANS_OPTIONS_KEY, JSON.stringify(picks)); } catch { /* private mode: this visit only */ }
}

// ── The verb toggles: a group is on while one of its verbs is; the last verb never goes off. ──

export const groupIsOn = (p: VerbPick, group: VerbGroup): boolean => verbsOfGroup(group).some(v => p.verbs.includes(v));

/** A group on = all its verbs on; off = none of them, unless that leaves no verb at all. */
export function toggleGroup(p: VerbPick, group: VerbGroup): VerbPick {
    const own = verbsOfGroup(group);
    if (!groupIsOn(p, group)) return { ...p, verbs: inOrder([...p.verbs, ...own]) };
    const rest = p.verbs.filter(v => !own.includes(v));
    return rest.length ? { ...p, verbs: rest } : p;
}

/** One verb on or off; the last one stays on. */
export function toggleVerb(p: VerbPick, inf: string): VerbPick {
    if (!p.verbs.includes(inf)) return { ...p, verbs: inOrder([...p.verbs, inf]) };
    const rest = p.verbs.filter(v => v !== inf);
    return rest.length ? { ...p, verbs: rest } : p;
}

/** Alles aan / alles uit of one group ("uit" switches the group off; the last group keeps its first verb). */
export function setGroup(p: VerbPick, group: VerbGroup, on: boolean): VerbPick {
    const own = verbsOfGroup(group);
    if (on) return { ...p, verbs: inOrder([...p.verbs, ...own]) };
    const rest = p.verbs.filter(v => !own.includes(v));
    return { ...p, verbs: rest.length ? rest : [own[0]] };
}

/** Both word lists can be on; the last one stays on. */
export function toggleList(p: WordPick, list: 'dagen' | 'maanden'): WordPick {
    const next = { ...p, [list]: !p[list] };
    return next.dagen || next.maanden ? next : p;
}

// ── The Zelf choices the picks make (one per card; its key and id follow the pick, so a pick keeps its runs). ──

export function verbChoice(p: VerbPick, grade: Leerjaar, topicId: string): ZelfChoice {
    const v = fransVariant(p, grade);
    // The présent keeps the key it had before the Tijd row, so its earlier runs still count.
    const tense = tenseForGrade(p.tense ?? 'present', grade);
    return { key: `${grade}|${topicId}|${p.mode}|${p.dir}|${p.verbs.join('+')}${tense === 'present' ? '' : `|${tense}`}`, label: FRANS_MODE_LABELS[p.mode as FransMode], vars: [v] };
}

export const wordListsOf = (p: WordPick): string[] => [...(p.dagen ? ['dagen'] : []), ...(p.maanden ? ['maanden'] : [])];

export function wordChoice(p: WordPick, grade: Leerjaar, topicId: string): ZelfChoice {
    const v = woordVariant(WOORD_LEAF, { lists: wordListsOf(p), dir: p.dir }, grade);
    return { key: `${grade}|${topicId}|${wordListsOf(p).join('+')}|${p.dir}`, label: v.label, vars: [v] };
}

export function numberChoice(p: NumberPick, grade: Leerjaar, topicId: string): ZelfChoice {
    const v = woordVariant(GETALLEN_LEAF, { lists: [p.set], dir: p.dir }, grade);
    return { key: `${grade}|${topicId}|${p.set}|${p.dir}`, label: v.label, vars: [v] };
}

