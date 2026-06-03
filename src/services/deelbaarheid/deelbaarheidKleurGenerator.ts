import type { MathBlock, DeelbaarheidKleurExercise } from '../math/types';

const rndId = () => Math.random().toString(36).substring(2, 9);
const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

// `perRow` distinct numbers in [1,maxGetal] with at least `minMultiples` multiples of divisor.
function stripNumbers(perRow: number, maxGetal: number, divisor: number, minMultiples = 2): number[] {
    const pool = new Set<number>();
    let guard = 0;
    // Seed a few guaranteed multiples so colouring is never empty.
    const maxMult = Math.floor(maxGetal / divisor);
    while (pool.size < Math.min(minMultiples, maxMult) && guard++ < 200) pool.add(divisor * randInt(1, maxMult));
    guard = 0;
    while (pool.size < perRow && guard++ < perRow * 50) pool.add(randInt(1, maxGetal));
    return [...pool].sort(() => Math.random() - 0.5);
}

export function generateDeelbaarheidKleurExercises(block: MathBlock): DeelbaarheidKleurExercise[] {
    const c = block.constraints;
    const viewMode: string = c.viewMode ?? 'strip';
    const divisors: number[] = Array.isArray(c.divisors) && c.divisors.length ? c.divisors : [2, 5, 10];
    const maxGetal: number = c.maxGetal ?? 100;
    const perRow: number = c.perRow ?? 10;
    const rasterCount: number = c.rasterCount ?? 100;
    const rasterCols: number = c.rasterCols ?? 10;
    const n = block.numberOfExercises;

    return Array.from({ length: n }, () => {
        const divisor = divisors[randInt(0, divisors.length - 1)];   // random divisor per row
        if (viewMode === 'raster') {
            // Non-repeating randoms (not 1..N) so the coloured answer varies each generate.
            const count = Math.min(rasterCount, maxGetal);
            return { id: rndId(), divisor, numbers: stripNumbers(count, maxGetal, divisor), cols: rasterCols, isManuallyEdited: false };
        }
        return { id: rndId(), divisor, numbers: stripNumbers(perRow, maxGetal, divisor), isManuallyEdited: false };
    });
}
