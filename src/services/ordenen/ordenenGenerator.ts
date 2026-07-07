import type { MathBlock, OrdenenExercise, Fraction } from '../math/types';
import { numberMatchesMask } from '../math/mathEngine';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);

// Numeric value of a number|Fraction (for sorting + dedup).
const val = (v: number | Fraction): number =>
    typeof v === 'number' ? v : (v.whole ?? 0) + v.n / v.d;

interface OrdConstraints {
    maxGetal: number;
    minGetal?: number;                 // geheel: lower bound (default -maxGetal)
    decimalPlaces?: number;            // decimal: 1..3
    minDenominator?: number;           // rational
    maxDenominator?: number;
    unitFractionsOnly?: boolean;       // 'stambreuken' — numerator fixed to 1
    allowMixed?: boolean;              // 'gemengde getallen' — add a whole part
}

function genValue(numberType: string, c: OrdConstraints): number | Fraction {
    const maxGetal = c.maxGetal ?? 100;
    if (numberType === 'geheel') {
        const min = c.minGetal ?? -maxGetal;
        return randInt(min, maxGetal);
    }
    if (numberType === 'decimal') {
        const f = Math.pow(10, Math.min(3, Math.max(1, c.decimalPlaces ?? 1)));
        return randInt(0, maxGetal * f) / f;
    }
    if (numberType === 'rational') {
        // Swap-tolerant: 'Noemer van 8 tot 3' becomes 3..8 rather than collapsing to 8 only.
        const rawMin = Math.max(2, c.minDenominator ?? 2);
        const rawMax = Math.max(2, c.maxDenominator ?? 10);
        const minD = Math.min(rawMin, rawMax);
        const maxD = Math.max(rawMin, rawMax);
        const d = randInt(minD, maxD);
        const n = c.unitFractionsOnly ? 1 : randInt(1, Math.max(1, d - 1));   // proper fraction part
        const f: Fraction = { n, d };
        if (c.allowMixed) f.whole = randInt(1, 5);
        return f;
    }
    return randInt(0, maxGetal); // natural
}

export function generateOrdenenExercises(block: MathBlock): OrdenenExercise[] {
    const c = block.constraints;
    const numberType: string = c.numberType ?? 'natural';
    const count: number = c.count ?? 3;
    const operatorMode: string = c.operatorMode ?? 'oplopend';
    const maxGetal: number = c.maxGetal ?? 100;
    const numberMask: Record<string, boolean> = c.numberMask ?? {};
    // 'Specifieke getalopbouw' only constrains place-value number types.
    const useMask = (numberType === 'natural' || numberType === 'decimal') && Object.values(numberMask).some(Boolean);
    const decimalPlaces = numberType === 'decimal' ? Math.min(3, Math.max(1, c.decimalPlaces ?? 1)) : 0;

    const oc: OrdConstraints = {
        maxGetal, minGetal: c.minGetal, decimalPlaces, minDenominator: c.minDenominator,
        maxDenominator: c.maxDenominator, unitFractionsOnly: c.unitFractionsOnly, allowMixed: c.allowMixed,
    };

    const n = block.numberOfExercises;
    const results: OrdenenExercise[] = [];

    for (let i = 0; i < n; i++) {
        const values: (number | Fraction)[] = [];
        const seen = new Set<number>();
        let attempts = 0;
        while (values.length < count && attempts < 2000) {
            attempts++;
            const v = genValue(numberType, oc);
            if (useMask && typeof v === 'number' && !numberMatchesMask(v, numberMask, maxGetal, numberType as 'natural' | 'decimal', decimalPlaces)) continue;
            const key = val(v);
            if (seen.has(key)) continue;
            seen.add(key);
            values.push(v);
        }

        // 'beide' picks a direction per set — one operator per exercise.
        const operator: '<' | '>' =
            operatorMode === 'aflopend' ? '>' : operatorMode === 'beide' ? (Math.random() < 0.5 ? '<' : '>') : '<';

        const ordered = [...values].sort((a, b) => (operator === '<' ? val(a) - val(b) : val(b) - val(a)));
        const display = [...values].sort(() => Math.random() - 0.5);

        results.push({ id: rndId(), values: ordered, display, operator, isManuallyEdited: false });
    }

    return results;
}
