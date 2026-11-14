import { resolveCard } from '../../config/eenvoudig/resolveCard';
import { RANGES } from '../../config/numberRanges';
import type { CardVariant } from '../../config/eenvoudig/cards';
import type { SumFacts } from './distractors';

// How long a game answer can get, from a card's own settings: the picker hides the skins whose targets
// (an egg, a mole) cannot show it. SYNC: the hr-std branches in mathEngine.ts (what bounds each draw).

const num = (v: unknown, fallback: number) => (typeof v === 'number' && v > 0 ? v : fallback);

// The biggest number a pupil may have to give for this variant's sums; null = unknown.
export function answerBoundOf(op: SumFacts['op'], c: Record<string, unknown>): number | null {
    if ((c.numberType ?? 'natural') !== 'natural') return null;
    const max = num(c.maxGetal, 1000);
    // A puntoefening asks a term instead of the result, so the biggest term counts too.
    const punt = c.equationType === 'puntoefening';
    if (op === '+' || op === '-') return max;
    if (c.preset === 'tienvoud') {
        const factors = (Array.isArray(c.presetFactors) && c.presetFactors.length ? c.presetFactors : [10, 100, 1000]) as number[];
        const capped = !!c.tienvoudTotMax || !!c.capToMax;
        const base = Math.min(max, Math.max(...RANGES.hrTienvoud));
        const biggest = capped ? max : base * Math.max(...factors);
        if (op === 'x' || punt) return biggest;
        return capped ? Math.floor(max / Math.min(...factors)) : base;
    }
    // Chains of 3-4 factors keep every number under the max.
    if (num(c.termCount, 2) > 2) return max;
    const mode = c.multiplicationMode ?? 'tafels';
    if (mode === 'tafels') {
        const tables = (Array.isArray(c.selectedTables) ? c.selectedTables : []) as number[];
        const limit = num(c.tableLimit, 10);
        const product = Math.max(limit, ...tables.map(t => t * limit));
        // Uitkomst tot (tableProductMax) is a × setting only.
        const biggest = op === 'x' && typeof c.tableProductMax === 'number' && c.tableProductMax > 0 ? Math.min(product, c.tableProductMax) : product;
        return op === 'x' || punt ? biggest : limit;
    }
    if (mode === 'andere') return op === 'x' || punt ? max : Math.floor(max / 2);
    return null;
}

/** The longest answer (in characters) any of these variants can have; undefined = unknown. */
export function answerCharsOf(vars: readonly CardVariant[], opOf: (v: CardVariant) => SumFacts['op']): number | undefined {
    let longest = 0;
    for (const v of vars) {
        let bound: number | null;
        try { bound = answerBoundOf(opOf(v), resolveCard(v).constraints); } catch { bound = null; }
        if (bound === null) return undefined;
        longest = Math.max(longest, String(bound).length);
    }
    return longest || undefined;
}
