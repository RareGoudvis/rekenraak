import type { MathBlock, DeelbaarheidKleurExercise } from '../math/types';
import type { DeelbaarheidKleurConstraints } from '../math/constraintTypes';

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
    const c = block.constraints as DeelbaarheidKleurConstraints;
    const viewModeRaw: string = c.viewMode ?? 'strip';
    // 'raster' used to be its own viewMode; it is now the strip mode's 'rechthoek' shape
    // (C1 step 6) — accepted here too so a block saved before the merge still generates.
    const legacyRaster = viewModeRaw === 'raster';
    const viewMode = legacyRaster ? 'strip' : viewModeRaw;
    const rasterVorm: string = c.rasterVorm ?? (legacyRaster ? 'rechthoek' : 'lijn');
    const isRechthoek = viewMode === 'strip' && rasterVorm === 'rechthoek';
    const divisors: number[] = Array.isArray(c.divisors) && c.divisors.length ? c.divisors : [2, 5, 10];
    const maxGetal: number = c.maxGetal ?? 100;
    const perRow: number = c.perRow ?? 10;
    const rasterCount: number = c.rasterCount ?? 100;
    const rasterCols: number = c.rasterCols ?? 10;
    const n = block.numberOfExercises;

    // Every chosen divisor gets a row before any repeats, so a title naming them all ("2, 5 en 10")
    // is true of the rows drawn; a shuffled start keeps one-row blocks (the kiosk) varied.
    const order = [...divisors];
    for (let i = order.length - 1; i > 0; i--) { const j = randInt(0, i); [order[i], order[j]] = [order[j], order[i]]; }
    return Array.from({ length: n }, (_, row) => {
        const divisor = order[row % order.length];
        if (isRechthoek) {
            // Pad UP to a full rectangle (a multiple of rasterCols) so the last visual row
            // is not ragged — capped at maxGetal, since there are no more distinct numbers
            // to add past that.
            const raw = Math.min(rasterCount, maxGetal);
            const rows = Math.max(1, Math.ceil(raw / rasterCols));
            const count = Math.min(rows * rasterCols, maxGetal);
            // Non-repeating randoms (not 1..N) so the coloured answer varies each generate.
            return { id: rndId(), divisor, numbers: stripNumbers(count, maxGetal, divisor), cols: rasterCols, isManuallyEdited: false };
        }
        return { id: rndId(), divisor, numbers: stripNumbers(perRow, maxGetal, divisor), isManuallyEdited: false };
    });
}

// Oefenmodus: a thumb-sized card cannot hold a 100-cell kleurraster, so the card shows at most
// this many numbers. SYNC: DeelbaarheidKleurViewer and the kiosk descriptor both read the same list.
export const KIOSK_MAX_NUMBERS = 20;

// The numbers the card shows: the first KIOSK_MAX_NUMBERS, but never fewer than two multiples
// when the full list has them (a long list with few multiples would otherwise often cut them all).
export function kioskNumbers(numbers: readonly number[], divisor: number): number[] {
    if (numbers.length <= KIOSK_MAX_NUMBERS) return [...numbers];
    const isMul = (n: number) => n % divisor === 0;
    const shown = numbers.slice(0, KIOSK_MAX_NUMBERS);
    const need = 2 - shown.filter(isMul).length;
    if (need <= 0) return shown;
    const extra = numbers.slice(KIOSK_MAX_NUMBERS).filter(isMul).slice(0, need);
    // Spread the swapped-in multiples over the list, onto non-multiples only.
    extra.forEach((m, k) => {
        let p = Math.floor(((k + 1) * KIOSK_MAX_NUMBERS) / (extra.length + 1));
        while (isMul(shown[p])) p = (p + 1) % KIOSK_MAX_NUMBERS;
        shown[p] = m;
    });
    return shown;
}
