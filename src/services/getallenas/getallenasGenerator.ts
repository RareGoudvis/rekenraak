import type { MathBlock, GetallenasExercise, Fraction } from '../math/types';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// i/d as a Fraction. mixed → 5/4 becomes 1 1/4; simplify → reduce by gcd.
// gelijknamige breuken = simplify:false (keeps the denominator d, e.g. 5/4, 6/4).
function fracFromQuarters(units: number, d: number, opts: { mixed: boolean; simplify: boolean }): number | Fraction {
    if (units % d === 0) return units / d;                 // whole-number tick
    if (opts.mixed && units >= d) {
        const whole = Math.floor(units / d);
        const remN = units - whole * d;
        const g = opts.simplify ? gcd(remN, d) : 1;
        return { whole, n: remN / g, d: d / g };
    }
    const g = opts.simplify ? gcd(units, d) : 1;
    return { n: units / g, d: d / g };
}

// Build the L→R tick values for a numeric line; round to 1e6 to kill float drift (0,001 ok).
function numericValues(start: number, step: number, ticks: number, arrowLeft: boolean): number[] {
    return Array.from({ length: ticks }, (_, i) => {
        const raw = arrowLeft ? start - i * step : start + i * step;
        return Math.round(raw * 1e6) / 1e6;
    });
}

// randInt that tolerates swapped/equal bounds.
const pick = (a: number, b: number): number => randInt(Math.min(a, b), Math.max(a, b));

export function generateGetallenasExercises(block: MathBlock): GetallenasExercise[] {
    const c = block.constraints;
    const numberType: string = c.numberType ?? 'natural';
    const maxGetal: number = c.maxGetal ?? 100;
    const step: number = c.step ?? 5;
    const directionMode: string = c.direction ?? 'right';
    const hardMode: boolean = c.hardMode ?? false;
    const ticks: number = c.ticks ?? 6;

    const n = block.numberOfExercises;
    const results: GetallenasExercise[] = [];

    for (let i = 0; i < n; i++) {
        const direction: 'left' | 'right' = directionMode === 'beide' ? (Math.random() < 0.5 ? 'left' : 'right') : (directionMode === 'left' ? 'left' : 'right');
        const arrowLeft = direction === 'left';

        let values: (number | Fraction)[];
        let start = 0;
        const usedStep = step;

        if (numberType === 'rational') {
            // Unit-fraction step 1/d; values are i/d from a whole-number start.
            const d = c.fractionStep && c.fractionStep > 1 ? c.fractionStep : 4;
            const fracOpts = { mixed: c.allowMixed ?? true, simplify: !(c.gelijknamig ?? false) };
            const maxWholeUnits = 5 * d;                       // keep ≤ 5 on the line
            const span = (ticks - 1);
            const startUnits = arrowLeft
                ? pick(span, maxWholeUnits)                    // descending: leftmost largest
                : pick(0, Math.max(0, maxWholeUnits - span));
            values = Array.from({ length: ticks }, (_, k) => fracFromQuarters(arrowLeft ? startUnits - k : startUnits + k, d, fracOpts));
        } else {
            const lo = numberType === 'geheel' ? (c.minGetal ?? -maxGetal) : 0;
            const hi = maxGetal;
            const stepN = usedStep || 1;                        // may be 0.5, 0.001, etc.
            const span = stepN * (ticks - 1);
            const loU = Math.ceil(lo / stepN);
            const hiU = Math.floor(hi / stepN);
            let startU: number;
            if (arrowLeft) {
                // descending L→R: leftmost is largest, rightmost = start − span must be ≥ lo.
                // Clamp so we never pick below `need` (else the range end drops under lo → negatives
                // on a natural line when step×ticks overruns maxGetal).
                const need = Math.ceil((lo + span) / stepN);
                startU = pick(need, Math.max(need, hiU));
            } else {
                // ascending: start ≥ lo; upper bound keeps the last tick ≤ hi when it fits, else anchors at lo.
                const upper = Math.floor((hi - span) / stepN);
                startU = pick(loU, Math.max(loU, upper));
            }
            start = startU * stepN;
            values = numericValues(start, stepN, ticks, arrowLeft);
        }

        const ratio = hardMode ? 0.6 : 0.4;
        const blankMask = Array.from({ length: ticks }, (_, k) => k !== 0 && Math.random() < ratio);
        if (!blankMask.some(Boolean)) blankMask[ticks - 1] = true;

        results.push({ id: rndId(), start, step: usedStep, tickCount: ticks, blankMask, direction, values, numberType, isManuallyEdited: false });
    }
    return results;
}
