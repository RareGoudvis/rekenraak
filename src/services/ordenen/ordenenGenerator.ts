import type { MathBlock, OrdenenExercise, Fraction } from '../math/types';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);

// Numeric value of a number|Fraction (for sorting + dedup).
const val = (v: number | Fraction): number =>
    typeof v === 'number' ? v : (v.whole ?? 0) + v.n / v.d;

function genValue(numberType: string, maxGetal: number): number | Fraction {
    if (numberType === 'geheel') return randInt(-maxGetal, maxGetal);
    // decimal: 1 decimal place for a basic version
    if (numberType === 'decimal') return Math.round(randInt(0, maxGetal * 10)) / 10;
    if (numberType === 'rational') {
        const d = randInt(2, 10);
        return { n: randInt(1, d * 2), d };
    }
    return randInt(0, maxGetal); // natural
}

export function generateOrdenenExercises(block: MathBlock): OrdenenExercise[] {
    const {
        numberType = 'natural',
        count = 3,
        operatorMode = 'oplopend',   // oplopend (<) | aflopend (>) | beide (random per set)
        maxGetal = 100,
    } = block.constraints;

    const n = block.numberOfExercises;
    const results: OrdenenExercise[] = [];

    for (let i = 0; i < n; i++) {
        const values: (number | Fraction)[] = [];
        const seen = new Set<number>();
        let attempts = 0;
        while (values.length < count && attempts < 500) {
            attempts++;
            const v = genValue(numberType, maxGetal);
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
