import type { MathBlock, DeelbaarheidExercise } from '../math/types';
import type { DeelbaarheidConstraints } from '../math/constraintTypes';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);

export function generateDeelbaarheidExercises(block: MathBlock): DeelbaarheidExercise[] {
    const {
        layout = 'tabel',          // 'tabel' | 'veelvouden'
        maxGetal = 1000,
        base = 9,
        terms = 6,                 // veelvouden: how many numbers in the row (incl 0)
        givenCount = 2,            // veelvouden: how many filled before the blanks
    } = block.constraints as DeelbaarheidConstraints;

    const n = block.numberOfExercises;
    const results: DeelbaarheidExercise[] = [];

    if (layout === 'veelvouden') {
        // Clamp givenCount to terms-1 so at least one blank always remains: a stale
        // givenCount (set high at a larger `terms`, then terms lowered) would otherwise
        // pre-fill the whole row and leave nothing to solve.
        const given = Math.max(0, Math.min(givenCount, terms - 1));
        // Six copies of "0, 9, 18, …" was one exercise printed six times: the first row starts at 0,
        // every other row at its own multiple (×1 … ×10, more when the block asks for more rows).
        const starts = Array.from({ length: Math.max(10, n - 1) }, (_, k) => k + 1);
        for (let k = starts.length - 1; k > 0; k--) {
            const j = randInt(0, k);
            [starts[k], starts[j]] = [starts[j], starts[k]];
        }
        for (let i = 0; i < n; i++) {
            const from = i === 0 ? 0 : starts[i - 1];
            const sequence = Array.from({ length: terms }, (_, k) => base * (from + k));
            results.push({ id: rndId(), base, sequence, givenCount: given, isManuallyEdited: false });
        }
        return results;
    }

    // tabel: one generated number per row; divisor columns come from constraints.
    const used = new Set<number>();
    for (let i = 0; i < n; i++) {
        let number = randInt(10, maxGetal);
        let attempts = 0;
        while (used.has(number) && attempts < 200) { number = randInt(10, maxGetal); attempts++; }
        used.add(number);
        results.push({ id: rndId(), number, isManuallyEdited: false });
    }
    return results;
}
