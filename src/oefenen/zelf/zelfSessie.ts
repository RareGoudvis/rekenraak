import { GRADE_MAX, defaultMax, kindsOf, listCards, typesOf, type CardType, type CardVariant, type EenvoudigData } from '../../config/eenvoudig/cards';
import { EENVOUDIG_NAV } from '../../config/eenvoudig/nav';
import { resolveCard } from '../../config/eenvoudig/resolveCard';
import type { Leerjaar } from '../../config/gradePresets';
import { rowMayHaveMab, rowYields, withKioskSeed } from '../../components/oefenen/oefenBuild';
import { kioskLabelOf, kioskSupports } from '../../services/oefenen/kiosk';
import { childLabel } from './zelfLabels';
import { MAX_TYPES, fnv1a } from '../../services/oefenen/session';
import { OEFEN_VERSION, type OefenSessie, type OefenType } from '../../services/oefenen/types';
import { TUTOR_SESSIE_PREFIX, isTutorSessie } from '../../services/oefenen/tutorOefenLink';

export type ZelfMode = { kind: 'count'; n: 3 | 5 | 10 } | { kind: 'timer'; min: 1 | 3 | 5 };

export const ZELF_COUNTS = [3, 5, 10] as const;
export const ZELF_MINUTES = [1, 3, 5] as const;

// Teacher ids are 8 chars, so this prefix can never collide with one; it also marks a session as self-made.
const ID_PREFIX = 'zelf-';
// SYNC: parseType's MAX_LABEL / MAX_INSTRUCTION in session.ts.
const MAX_LABEL = 80;
const MAX_INSTRUCTION = 200;

export const isZelfSessie = (s: { id: string } | null): boolean => !!s && s.id.startsWith(ID_PREFIX);

const cut = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

export const modeKey = (m: ZelfMode): string => (m.kind === 'count' ? `n${m.n}` : `t${m.min}`);

// One plain choice on the pupil's screen: a few card variants that belong together.
// `source` = the Op.stap heading / card name the label was made from (absent for labels built in code).
export interface ZelfChoice { key: string; label: string; vars: CardVariant[]; source?: string }

const toType = (v: CardVariant): OefenType => {
    const card = resolveCard(v);
    return {
        typeId: card.typeId,
        leafId: card.leafId,
        label: cut(kioskLabelOf(card.leafId) ?? card.label, MAX_LABEL),
        instruction: cut(card.instruction, MAX_INSTRUCTION),
        // Same kiosk start as a builder row (klok in woorden, plaats shuffled).
        constraints: withKioskSeed(card.typeId, card.constraints),
        weight: 100,
    };
};

// Evenly spread pick, so a long choice keeps its easy and its hard variants.
function spread<T>(list: T[], max: number): T[] {
    if (list.length <= max) return list;
    return Array.from({ length: max }, (_, i) => list[Math.floor((i * list.length) / max)]);
}

/** One session for a choice: its variants as equally weighted types; the same choice always has the same id, so earlier runs come back. */
export function buildZelfSessie(choice: ZelfChoice, mode: ZelfMode, now = Date.now(), grade?: number, noMab?: boolean): OefenSessie {
    const types = spread(choice.vars, MAX_TYPES).map(toType);
    const several = types.length > 1;
    return {
        v: OEFEN_VERSION,
        id: `${ID_PREFIX}${fnv1a(`${choice.key}|${modeKey(mode)}`)}`,
        createdAt: now,
        types,
        // Round-robin would always start with the same few variants of a long choice.
        mode: several ? 'willekeurig' : 'afwisselen',
        allowRepeatType: several,
        testMode: false,
        statsLocked: false,
        ...(mode.kind === 'count' ? { total: mode.n } : { timerMin: mode.min }),
        // The picked leerjaar: handig rekenen offers ontbinden from leerjaar 6. Not in the id: the same choice keeps its runs.
        ...(grade ? { grade } : {}),
        // The pupil's own "Hulp met MAB" choice; only leerjaar 1–3 ever shows MAB.
        ...(noMab && grade && grade <= 3 ? { noMab: true as const } : {}),
    };
}

/** Whether the choice can show MAB above its steps (the leerjaar 1–3 check is the caller's). */
export function choiceMayHaveMab(choice: ZelfChoice): boolean {
    return choice.vars.some(v => {
        try {
            const t = toType(v);
            return rowMayHaveMab({ leaf: { id: t.leafId, typeId: t.typeId, label: t.label }, constraints: t.constraints });
        } catch { return false; }
    });
}

export interface UsableCard { card: CardType; vars: CardVariant[] }

const variantOk = new Map<string, boolean>();

// The kiosk can check the variant's settings and they yield at least one exercise.
function usable(v: CardVariant): boolean {
    let ok = variantOk.get(v.id);
    if (ok === undefined) {
        try {
            const c = resolveCard(v);
            const constraints = withKioskSeed(c.typeId, c.constraints);
            ok = kioskSupports(c.typeId, constraints) && rowYields({ leaf: { id: c.leafId, typeId: c.typeId, label: c.label }, constraints });
        } catch { ok = false; }
        variantOk.set(v.id, ok);
    }
    return ok;
}

const byGrade = new Map<EenvoudigData, Map<string, Map<string, UsableCard[]>>>();

// The number ranges a pupil works in per leerjaar (owner 2026-11-15); two = the pupil picks ("Tot hoeveel?", the smaller first).
export const ZELF_RANGES: Readonly<Record<Leerjaar, readonly number[]>> = {
    1: [10, 20], 2: [100], 3: [1000], 4: [10_000, 100_000], 5: [1_000_000], 6: [1_000_000_000],
};

const firstGrade = (card: CardType) => (card.grades.length ? Math.min(...card.grades) : 0);
// A card of exactly the pupil's range may be authored one leerjaar ahead when that range is past the leerjaar's own (leerjaar 4 "tot 100 000" uses the leerjaar 5 cards).
const cardFits = (card: CardType, grade: Leerjaar, exact: number | null) => firstGrade(card) <= grade || (exact !== null && card.max === exact && firstGrade(card) <= grade + 1);
const varFits = (card: CardType, v: CardVariant, grade: Leerjaar, exact: number | null) => v.lj <= grade || (exact !== null && card.max === exact && v.lj <= grade + 1);

/**
 * The card range a topic plays for the pupil's range: the cards of exactly that max, else the closest below, else the
 * smallest above. null = the topic has no range cards (klok, breuken, tafels …).
 */
export function zelfMaxOf(data: EenvoudigData, topicId: string, grade: Leerjaar, range: number): number | null {
    const ahead = range > GRADE_MAX[grade] ? range : null;
    const maxes = [...new Set(typesOf(data, topicId).filter(t => t.max != null && !t.kind && cardFits(t, grade, ahead)).map(t => t.max!))].sort((a, b) => a - b);
    if (!maxes.length) return null;
    return maxes.filter(m => m <= range).pop() ?? maxes[0];
}

/**
 * Per topic (only those with something usable) the listed cards for the leerjaar, each with its usable variants.
 * range = the pupil's "Tot hoeveel?" (zelfMaxOf per topic); absent = the leerjaar's own range buttons (Eenvoudig's default).
 */
export function usableVariants(data: EenvoudigData, grade: Leerjaar, range?: number): Map<string, UsableCard[]> {
    let perGrade = byGrade.get(data);
    if (!perGrade) { perGrade = new Map(); byGrade.set(data, perGrade); }
    const cacheKey = `${grade}|${range ?? ''}`;
    const cached = perGrade.get(cacheKey);
    if (cached) return cached;
    const out = new Map<string, UsableCard[]>();
    for (const topic of EENVOUDIG_NAV.flatMap(s => s.topics)) {
        if (!topic.hasCards) continue;
        const max = range === undefined ? null : zelfMaxOf(data, topic.id, grade, range);
        // Only a range past the leerjaar's own (leerjaar 4 "tot 100 000") may borrow the next leerjaar's cards.
        const exact = max !== null && max === range && range > GRADE_MAX[grade] ? max : null;
        // A topic with komma / breuk buttons lists those cards apart; a pupil sees all of them.
        const cards = new Set<CardType>(listCards(data, topic.id, { grade, max }));
        for (const kind of kindsOf(data, topic.id)) for (const c of listCards(data, topic.id, { grade, kind })) cards.add(c);
        // Op.stap: a card or variant authored for a later leerjaar is not offered yet (komma / tafels in leerjaar 1).
        const list = [...cards]
            .filter(card => !card.grades.length || cardFits(card, grade, exact))
            .map(card => ({ card, vars: card.vars.filter(v => varFits(card, v, grade, exact) && usable(v)) }))
            .filter(c => c.vars.length > 0);
        if (list.length) out.set(topic.id, list);
    }
    perGrade.set(cacheKey, out);
    return out;
}

const ALLES = 'Alles door elkaar';
// Only "Zonder brug" promises no brug; "Geen brug nodig" variants forbid nothing (the audit found brug sums in them), so they go to Alles only.
const ZONDER = /^zonder brug/i;
const MET = /^brug bij /i;
const BRUG_TOPIC = /(Optellen|Aftrekken)$/;
const TAFEL_TOPIC = /tafels$/;
const TAFEL_CARD = /^(Deel)?tafel van (\d+)$/i;

const uniq = (vars: CardVariant[]) => [...new Map(vars.map(v => [v.id, v])).values()];
const same = (a: CardVariant[], b: CardVariant[]) => a.length === b.length && a.every(v => b.includes(v));

function groupBy<T>(items: T[], keyOf: (t: T) => string): Map<string, T[]> {
    const out = new Map<string, T[]>();
    for (const it of items) { const k = keyOf(it); out.set(k, [...(out.get(k) ?? []), it]); }
    return out;
}

// '+' and '−': the Flemish curriculum's one question is "met of zonder brug".
function brugChoices(cards: UsableCard[]): ZelfChoice[] {
    const whole = cards.filter(c => c.card.kind !== 'breuk').flatMap(c => c.vars);
    const zonder = whole.filter(v => ZONDER.test(v.l));
    const met = whole.filter(v => MET.test(v.l));
    const breuken = cards.filter(c => c.card.kind === 'breuk').flatMap(c => c.vars);
    const out: ZelfChoice[] = [];
    // Only one side present (all "Geen brug nodig"): a "Zonder brug" button would be a claim the data does not make.
    if (zonder.length && met.length) out.push({ key: 'zonder', label: 'Zonder brug', vars: zonder }, { key: 'met', label: 'Met brug', vars: met });
    if (whole.length) out.push({ key: 'alles', label: ALLES, vars: whole });
    if (breuken.length) out.push({ key: 'breuken', label: 'Breuken', vars: breuken });
    return out;
}

// Tafels: "Tafel van 1 tot 5", "6 tot 10" and the rest, because a pupil practises a few at a time.
function tafelChoices(cards: UsableCard[]): ZelfChoice[] {
    const parsed = cards.map(c => ({ c, m: TAFEL_CARD.exec(c.card.name) })).filter(x => x.m);
    const lead = cards.some(c => /^deel/i.test(c.card.name)) ? 'Deeltafel' : 'Tafel';
    const band = (key: string, from: number, to: number, label: (ns: number[]) => string): ZelfChoice | null => {
        const hit = parsed.filter(x => +x.m![2] >= from && +x.m![2] <= to);
        if (!hit.length) return null;
        return { key, label: label(hit.map(x => +x.m![2])), vars: hit.flatMap(x => x.c.vars) };
    };
    const range = (ns: number[]) => ns.length === 1 ? `${lead} van ${ns[0]}` : `${lead} van ${Math.min(...ns)} tot ${Math.max(...ns)}`;
    const list = (ns: number[]) => `${lead} van ${ns.slice(0, -1).join(', ')} en ${ns[ns.length - 1]}`;
    const out = [band('t1-5', 1, 5, range), band('t6-10', 6, 10, range), band('t11+', 11, 99, ns => ns.length > 1 ? list(ns) : range(ns))]
        .filter((x): x is ZelfChoice => !!x);
    const all = uniq(cards.flatMap(c => c.vars));
    return [...out, { key: 'alles', label: ALLES, vars: all }];
}

// "Welke tafels?" (owner 2026-11-15): the pupil toggles the tafels and picks × / : / both, instead of the tafel bands.
export const isTafelTopic = (topicId: string) => TAFEL_TOPIC.test(topicId);
const UPTO = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
export const TAFELS_DEFAULT: readonly number[] = UPTO(10);
/** The tafels a leerjaar offers: 1–10 in leerjaar 2, from leerjaar 3 also 11–15, 25, 50 and 100. */
export const tafelsOffer = (grade: Leerjaar): readonly number[] => (grade <= 2 ? UPTO(10) : [...UPTO(15), 25, 50, 100]);
export type TafelOp = 'x' | ':' | 'beide';
const TAFEL_LEAF = { x: 'hr-std-vermenigvuldigen-nat', ':': 'hr-std-delen-nat' } as const;

/** "1 tot 10", "2, 3 en 5", "7": the tafels in a label, runs of three or more joined. */
export function tafelList(tables: readonly number[]): string {
    const ns = [...new Set(tables)].sort((a, b) => a - b);
    const parts: string[] = [];
    for (let i = 0; i < ns.length;) {
        let j = i;
        while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++;
        if (j - i >= 2) parts.push(`${ns[i]} tot ${ns[j]}`); else for (let k = i; k <= j; k++) parts.push(String(ns[k]));
        i = j + 1;
    }
    return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} en ${parts[parts.length - 1]}` : parts[0] ?? '';
}

/** The choice the tafel toggles make: one card variant per operation with every toggled tafel (as the tafel cards in cards.json), null without a tafel. */
export function tafelChoice(grade: Leerjaar, topicId: string, tables: readonly number[], op: TafelOp): ZelfChoice | null {
    const ns = [...new Set(tables)].sort((a, b) => a - b);
    if (!ns.length) return null;
    const ops = op === 'beide' ? (['x', ':'] as const) : [op];
    const lead = op === 'x' ? 'Tafel' : op === ':' ? 'Deeltafel' : 'Maal- en deeltafel';
    const label = `${lead}${ns.length > 1 ? 's' : ''} van ${tafelList(ns)}`;
    const vars: CardVariant[] = ops.map(o => ({
        id: `zelf-tafels-${o === 'x' ? 'maal' : 'deel'}-${ns.join('-')}`,
        l: label,
        lj: grade,
        leafId: TAFEL_LEAF[o],
        ov: { multiplicationMode: 'tafels', selectedTables: ns, tableLimit: 10 },
        count: null,
        label,
    }));
    return { key: `${grade}|${topicId}|tafels:${op}:${ns.join(',')}`, label: cut(label, MAX_LABEL), vars };
}

/** The × / : pick and the tafels a tafel choice was made with (back from a game), or null for any other choice. */
export function tafelPickOf(choice: ZelfChoice): { op: TafelOp; tables: number[] } | null {
    const m = /\|tafels:(x|:|beide):([\d,]+)$/.exec(choice.key);
    return m ? { op: m[1] as TafelOp, tables: m[2].split(',').map(Number) } : null;
}

const KOMMA_TOPIC = 'Kommagetallen en procenten';

export type NumberKind = 'procent' | 'komma' | 'other';

// Procent wins: "Kommagetal en procent" exercises are about procent, and a pupil must not meet procent sums under Kommagetallen.
export function numberKindOf(card: CardType, v: CardVariant): NumberKind {
    // Decided per variant: a procent card can hold a breuk → kommagetal exercise, which belongs with Kommagetallen.
    const own = `${v.l} ${v.label}`;
    if (/procent|percent|%/i.test(own)) return 'procent';
    if (/procent|percent/i.test(`${card.name} ${v.leafId}`) && !/komma|decima|breuk/i.test(own)) return 'procent';
    if (card.kind === 'komma' || /komma|decimaa?l/i.test(`${card.name} ${v.l} ${v.label}`) || /-dec(?![a-z])/.test(v.leafId)) return 'komma';
    return 'other';
}

// A topic that holds both procent and kommagetal sums: one choice per kind, never a mix, so no "Alles door elkaar".
function kindChoices(cards: UsableCard[], topicId: string): ZelfChoice[] | null {
    const vars = cards.flatMap(c => c.vars.map(v => ({ v, k: numberKindOf(c.card, v) })));
    const has = (k: NumberKind) => vars.some(x => x.k === k);
    // Its own topic always splits (leerjaar 4 has komma + breuk but no procent yet); elsewhere only when both kinds meet.
    if (!(topicId === KOMMA_TOPIC || (has('procent') && has('komma')))) return null;
    const pick = (k: NumberKind, key: string, label: string): ZelfChoice[] => {
        const hit = vars.filter(x => x.k === k).map(x => x.v);
        return hit.length ? [{ key, label, vars: hit }] : [];
    };
    return [...pick('other', 'breuken', 'Breuken'), ...pick('komma', 'komma', 'Kommagetallen'), ...pick('procent', 'procent', 'Procenten')];
}

// Anything else: the curriculum heading of the cards (komma / breuk cards without one get their kind), else the card names.
function generalChoices(cards: UsableCard[], topicId: string): ZelfChoice[] {
    const split = kindChoices(cards, topicId);
    if (split) return split;
    const kindName = (c: UsableCard) => c.card.kind === 'komma' ? 'Kommagetallen' : c.card.kind === 'breuk' ? 'Breuken' : 'Gewone getallen';
    const bySection = groupBy(cards, c => c.card.section || kindName(c));
    const byName = groupBy(cards, c => c.card.name);
    const groups = bySection.size >= 2 && bySection.size <= 5 ? bySection : byName.size <= 5 ? byName : bySection.size <= 5 ? bySection : null;
    if (!groups) return [{ key: 'alles', label: ALLES, vars: cards.flatMap(c => c.vars) }];
    const out = [...groups].map(([name, cs]) => ({ key: `${groups === bySection ? 's' : 'c'}:${name}`, label: childLabel(topicId, name), source: name, vars: cs.flatMap(c => c.vars) }));
    return out.length > 1 ? [...out, { key: 'alles', label: ALLES, vars: cards.flatMap(c => c.vars) }] : out;
}

/**
 * The few plain choices a pupil gets for a topic in a leerjaar (at most six), each a set of usable card variants.
 * range = the pupil's "Tot hoeveel?" (usableVariants); a range other than Eenvoudig's default marks the key, so its runs stay apart.
 */
export function choicesFor(data: EenvoudigData, grade: Leerjaar, topicId: string, range?: number): ZelfChoice[] {
    const cards = usableVariants(data, grade, range).get(topicId) ?? [];
    if (!cards.length) return [];
    const max = range === undefined ? null : zelfMaxOf(data, topicId, grade, range);
    const tail = max !== null && max !== defaultMax(data, topicId, grade) ? `|tot${max}` : '';
    const raw = BRUG_TOPIC.test(topicId) ? brugChoices(cards) : TAFEL_TOPIC.test(topicId) ? tafelChoices(cards) : generalChoices(cards, topicId);
    // A choice that repeats another one's variants only adds a button.
    const out: ZelfChoice[] = [];
    for (const c of raw) {
        const vars = uniq(c.vars);
        const dup = out.findIndex(o => same(o.vars, vars));
        if (dup >= 0) { if (c.label === ALLES) out[dup] = { ...out[dup], label: ALLES, source: undefined }; continue; }
        out.push({ key: `${grade}|${topicId}|${c.key}${tail}`, label: cut(c.label, MAX_LABEL), vars, source: c.source });
    }
    return out;
}

/** Nakijken on the end screen: the same content, its round = exactly the `n` missed exercises (the store holds them). SYNC: spelen/review.ts */
export function reviewSessieOf(s: OefenSessie, n: number): OefenSessie {
    const rest: OefenSessie = { ...s };
    // A review is counted, never timed.
    delete rest.timerMin;
    // A stappenhulp run's review keeps its prefix, so its end screen still leads back to the sheet.
    return { ...rest, id: `${isTutorSessie(s) ? TUTOR_SESSIE_PREFIX : ID_PREFIX}${fnv1a(`nakijken|${s.id}`)}`, title: 'Nakijken', total: n, mode: 'afwisselen', allowRepeatType: true };
}
