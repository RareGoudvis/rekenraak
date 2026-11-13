import type { AfrondenExercise } from '../../math/types';
import { formatMathNumber } from '../../math/formatters';
import { afrondenSteps, afrondenTarget } from '../afrondenSteps';
import { targetsFor } from '../../afronden/roundTargets';
import { defineCodec } from '../tutorCodec';

// Afronden simpel as [number, targetKey] (+ the printed decimals on a decimal block). The target is
// resolved here, so the page never needs the block's numberType.
const KEYS = new Set([...targetsFor('natural'), ...targetsFor('decimal')].map(t => t.key));
const okNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e9;
const okDecimals = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 3;

export const codec = defineCodec<AfrondenExercise>({
    id: 'af',
    typeIds: ['afronden'],
    what: 'afronding',
    out(ex, c) {
        const a = ex as AfrondenExercise | undefined;
        if (!a || !okNumber(a.number)) return null;
        const key = afrondenTarget(a, c.numberType).key;
        return okDecimals(a.decimalPlaces) ? [a.number, key, a.decimalPlaces] : [a.number, key];
    },
    in(wire) {
        if (!Array.isArray(wire) || wire.length < 2 || wire.length > 3) return null;
        const [number, key, dp] = wire as unknown[];
        if (!okNumber(number) || typeof key !== 'string' || !KEYS.has(key) || (wire.length === 3 && !okDecimals(dp))) return null;
        return { id: '', number, targetKey: key, ...(wire.length === 3 && { decimalPlaces: dp as number }), isManuallyEdited: false };
    },
    steps: ex => afrondenSteps(ex),
    // As the sheet prints it ("347 ≈ … (T)"): the card heading never wraps, so it stays short.
    sum: ex => [{ t: 'word', w: formatMathNumber(ex.number ?? 0, ex.decimalPlaces) }, { t: 'word', w: ` ≈ … (${afrondenTarget(ex).heading ?? afrondenTarget(ex).key})` }],
});
