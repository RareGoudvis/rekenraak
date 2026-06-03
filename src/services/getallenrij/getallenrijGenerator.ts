import type { MathBlock, GetallenasExercise, Fraction } from '../math/types';
import { numberMatchesMask } from '../math/mathEngine';

// Getallenrijen = number sequences (start ± k·step) shown in a pill, some cells blank.
// Same value model as getallenas (GetallenasExercise) minus the drawn axis line; adds
// a getalopbouw mask on the anchor value and a free custom jump for every number type.

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// i/d as a Fraction. mixed → 5/4 becomes 1 1/4; simplify → reduce by gcd.
// gelijknamige breuken = simplify:false (keeps the denominator d, e.g. 5/4, 6/4).
function fracFromQuarters(units: number, d: number, opts: { mixed: boolean; simplify: boolean }): number | Fraction {
    if (units % d === 0) return units / d;                 // whole-number cell
    if (opts.mixed && units >= d) {
        const whole = Math.floor(units / d);
        const remN = units - whole * d;
        const g = opts.simplify ? gcd(remN, d) : 1;
        return { whole, n: remN / g, d: d / g };
    }
    const g = opts.simplify ? gcd(units, d) : 1;
    return { n: units / g, d: d / g };
}

// L→R cell values for a numeric row; round to 1e6 to kill float drift (0,001 ok).
function numericValues(start: number, step: number, ticks: number, arrowLeft: boolean): number[] {
    return Array.from({ length: ticks }, (_, i) => {
        const raw = arrowLeft ? start - i * step : start + i * step;
        return Math.round(raw * 1e6) / 1e6;
    });
}

// randInt that tolerates swapped/equal bounds.
const pick = (a: number, b: number): number => randInt(Math.min(a, b), Math.max(a, b));

// Decimal places of a step (0,1 → 1, 0,005 → 3) so the mask can match decimal anchors.
const stepDecimals = (s: number): number => {
    const str = String(s);
    const i = str.indexOf('.');
    return i < 0 ? 0 : str.length - i - 1;
};

export function generateGetallenrijExercises(block: MathBlock): GetallenasExercise[] {
    const c = block.constraints;
    const numberType: string = c.numberType ?? 'natural';
    const maxGetal: number = c.maxGetal ?? 100;
    const step: number = c.step ?? 5;
    const directionMode: string = c.direction ?? 'right';
    const hardMode: boolean = c.hardMode ?? false;
    const ticks: number = c.ticks ?? 6;
    const numberMask: Record<string, boolean> = c.numberMask ?? {};
    // 'Specifieke getalopbouw' only constrains place-value number types (anchor value).
    const useMask = (numberType === 'natural' || numberType === 'decimal') && Object.values(numberMask).some(Boolean);

    const n = block.numberOfExercises;
    const results: GetallenasExercise[] = [];

    for (let i = 0; i < n; i++) {
        // arrowLeft = descending L→R: a 'dalend' row subtracts as you read right.
        const arrowLeft = directionMode === 'beide' ? Math.random() < 0.5 : directionMode === 'left';

        let values: (number | Fraction)[];
        let start = 0;
        const usedStep = step;

        if (numberType === 'rational') {
            const d = c.fractionStep && c.fractionStep > 1 ? c.fractionStep : 4;
            const fracOpts = { mixed: c.allowMixed ?? true, simplify: !(c.gelijknamig ?? false) };
            // maxTeller (getalopbouw) caps the highest teller in the row; default ≤ 5 wholes.
            const maxWholeUnits = c.maxTeller && c.maxTeller > d ? c.maxTeller : 5 * d;
            const span = ticks - 1;
            const startUnits = arrowLeft
                ? pick(span, maxWholeUnits)
                : pick(0, Math.max(0, maxWholeUnits - span));
            values = Array.from({ length: ticks }, (_, k) => fracFromQuarters(arrowLeft ? startUnits - k : startUnits + k, d, fracOpts));
        } else {
            const lo = numberType === 'geheel' ? (c.minGetal ?? -maxGetal) : 0;
            const hi = maxGetal;
            const stepN = usedStep || 1;
            const span = stepN * (ticks - 1);
            const dp = stepDecimals(stepN);

            // Try to land an anchor (leftmost value) whose place structure matches the mask.
            let attempts = 0;
            do {
                const startU = arrowLeft
                    ? pick(Math.ceil((lo + span) / stepN), Math.floor(hi / stepN))
                    : pick(Math.ceil(lo / stepN), Math.floor((hi - span) / stepN));
                start = startU * stepN;
                attempts++;
            } while (useMask && !numberMatchesMask(start, numberMask, maxGetal, numberType as 'natural' | 'decimal', dp) && attempts < 80);

            values = numericValues(start, stepN, ticks, arrowLeft);
        }

        const ratio = hardMode ? 0.6 : 0.4;
        const blankMask = Array.from({ length: ticks }, (_, k) => k !== 0 && Math.random() < ratio);
        if (!blankMask.some(Boolean)) blankMask[ticks - 1] = true;

        results.push({ id: rndId(), start, step: usedStep, tickCount: ticks, blankMask, direction: arrowLeft ? 'left' : 'right', values, numberType, isManuallyEdited: false });
    }
    return results;
}
