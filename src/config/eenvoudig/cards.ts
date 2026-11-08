// The Eenvoudig card table: what a teacher can click per topic, and the listing rules that
// decide which cards show for a leerjaar, range and kind. The data itself (cards.json) is
// loaded on first use so it stays out of the main bundle.

import type { Leerjaar } from '../gradePresets';

export type CardKind = 'komma' | 'breuk';

// One clickable variant of a card: everything resolveCard needs to build its block.
export interface CardVariant {
    // Stable: stored on the block as cardId and used by shared links.
    id: string;
    // Variant label inside its card ("Zonder brug").
    l: string;
    // The leerjaar whose preset this variant was authored against.
    lj: Leerjaar;
    leafId: string;
    // Diff on the leaf's defaultConstraints.
    ov: Record<string, unknown>;
    // null = the leaf's default count.
    count: number | null;
    // Full descriptive name, e.g. "E,t + E,t zonder brug".
    label: string;
}

export interface CardType {
    topic: string;
    section: string;
    name: string;
    // The range button this card belongs to; null = not tied to a range.
    max: number | null;
    grades: number[];
    // The question above the variant buttons.
    q: string;
    kind: CardKind | null;
    // Listed for every leerjaar.
    always: boolean;
    vars: CardVariant[];
}

export interface EenvoudigData {
    types: CardType[];
    // Variants no card button reaches (duplicates of a listed variant, combination builder presets).
    unlisted: CardVariant[];
}

// The biggest number a leerjaar works with (leerplan ceilings, see GRADE_PRESETS).
export const GRADE_MAX: Record<Leerjaar, number> = { 1: 20, 2: 100, 3: 1000, 4: 10000, 5: 1000000, 6: 1000000000 };

let cache: Promise<EenvoudigData> | null = null;

export function loadEenvoudigData(): Promise<EenvoudigData> {
    cache ??= import('./cards.json').then(m => (m.default ?? m) as unknown as EenvoudigData);
    return cache;
}

export const typesOf = (data: EenvoudigData, topicId: string): CardType[] => data.types.filter(t => t.topic === topicId);

// The range buttons of a topic, ascending.
export function rangesOf(data: EenvoudigData, topicId: string): number[] {
    return [...new Set(typesOf(data, topicId).map(t => t.max).filter((m): m is number => !!m))].sort((a, b) => a - b);
}

// The picked max when the topic offers it, else the biggest range the leerjaar works with, else the smallest.
export function defaultMax(data: EenvoudigData, topicId: string, grade: Leerjaar, picked?: number | null): number | null {
    const ranges = rangesOf(data, topicId);
    if (!ranges.length) return null;
    if (picked && ranges.includes(picked)) return picked;
    return [...ranges].filter(m => m <= GRADE_MAX[grade]).pop() ?? ranges[0];
}

// The kind buttons a topic offers beside its ranges.
export function kindsOf(data: EenvoudigData, topicId: string): CardKind[] {
    return (['komma', 'breuk'] as const).filter(k => typesOf(data, topicId).some(t => t.kind === k));
}

// A kind lists all cards of that kind; the natural list matches the chosen max, or the leerjaar when the card has none.
export function listCards(data: EenvoudigData, topicId: string, opts: { grade: Leerjaar; max?: number | null; kind?: CardKind | null }): CardType[] {
    const { grade, kind } = opts;
    const max = defaultMax(data, topicId, grade, opts.max);
    return typesOf(data, topicId).filter(t => {
        if (kind) return t.kind === kind;
        if (t.kind) return false;
        if (t.max != null) return t.max === max;
        return t.always || t.grades.includes(grade);
    });
}

export function allVariants(data: EenvoudigData): CardVariant[] {
    return [...data.types.flatMap(t => t.vars), ...data.unlisted];
}
