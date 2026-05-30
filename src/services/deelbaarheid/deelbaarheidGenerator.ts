import type { MathBlock, DeelbaarheidExercise } from '../math/types';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);

export function generateDeelbaarheidExercises(block: MathBlock): DeelbaarheidExercise[] {
    const {
        layout = 'tabel',          // 'tabel' | 'veelvouden'
        maxGetal = 1000,
        base = 9,
        terms = 6,                 // veelvouden: how many numbers in the row (incl 0)
        givenCount = 2,            // veelvouden: how many filled before the blanks
    } = block.constraints;

    const n = block.numberOfExercises;
    const results: DeelbaarheidExercise[] = [];

    if (layout === 'veelvouden') {
        for (let i = 0; i < n; i++) {
            const sequence = Array.from({ length: terms }, (_, k) => base * k); // 0, base, 2·base, …
            results.push({ id: rndId(), base, sequence, givenCount, isManuallyEdited: false });
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
