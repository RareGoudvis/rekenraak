import type { MathBlock, GetallenasExercise, Fraction } from '../math/types';
import type { GetallenasConstraints } from '../math/constraintTypes';

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

// The tick slider's minimum; a line is never shortened below it to make the step fit.
const MIN_TICKS = 4;
// 1-2-5 steps per decade, tried in order when even MIN_TICKS can't hold the chosen step.
const NICE_STEPS = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001];

const nl = (x: number) => x.toLocaleString('nl-BE');

export type LineFit = { step: number; ticks: number; note: string | null };

// SYNC: the start-unit bounds both generators (getallenas, getallenrij) pick from; a line
// fits when that range is non-empty for every direction the block can draw.
function lineFits(lo: number, hi: number, stepN: number, ticks: number, asc: boolean, desc: boolean): boolean {
    const span = stepN * (ticks - 1);
    const ascOk = Math.ceil(lo / stepN) <= Math.floor((hi - span) / stepN);
    const descOk = Math.ceil((lo + span) / stepN) <= Math.floor(hi / stepN);
    return (!asc || ascOk) && (!desc || descOk);
}

// The step and tick count to draw so every value stays within [lo, hi]: fewer ticks first
// (keeps the teacher's step), else a smaller nice step on the full line. `unit` names the
// ticks in the note ('streepjes' on the axis, 'vakjes' in a rij).
export function fitLine(lo: number, hi: number, stepN: number, ticks: number, directionMode: string, minStep: number, unit: string): LineFit {
    const asc = directionMode !== 'left';
    const desc = directionMode === 'left' || directionMode === 'beide';
    if (lineFits(lo, hi, stepN, ticks, asc, desc)) return { step: stepN, ticks, note: null };
    const range = lo === 0 ? `tot ${nl(hi)}` : `van ${nl(lo)} tot ${nl(hi)}`;
    for (let t = ticks - 1; t >= MIN_TICKS; t--) {
        if (lineFits(lo, hi, stepN, t, asc, desc)) {
            return { step: stepN, ticks: t, note: `Sprong +${nl(stepN)} met ${ticks} ${unit} past niet ${range}: ${t} ${unit} gebruikt.` };
        }
    }
    const smaller = NICE_STEPS.find(st => st < stepN && st >= minStep && lineFits(lo, hi, st, ticks, asc, desc));
    if (smaller !== undefined) return { step: smaller, ticks, note: `Sprong +${nl(stepN)} past niet ${range}: sprong +${nl(smaller)} gebruikt.` };
    return { step: stepN, ticks, note: null };
}

export function generateGetallenasExercisesNoted(block: MathBlock): { items: GetallenasExercise[]; note: string | null } {
    const c = block.constraints as GetallenasConstraints;
    const numberType: string = c.numberType ?? 'natural';
    const maxGetal: number = c.maxGetal ?? 100;
    const step: number = c.step ?? 5;
    const directionMode: string = c.direction ?? 'right';
    const hardMode: boolean = c.hardMode ?? false;
    const lo = numberType === 'geheel' ? (c.minGetal ?? -maxGetal) : 0;
    const fit = numberType === 'rational'
        ? { step, ticks: c.ticks ?? 6, note: null }
        : fitLine(lo, maxGetal, step || 1, c.ticks ?? 6, directionMode, numberType === 'decimal' ? 0.001 : 1, 'streepjes');
    const ticks = fit.ticks;

    const n = block.numberOfExercises;
    const results: GetallenasExercise[] = [];

    for (let i = 0; i < n; i++) {
        const direction: 'left' | 'right' = directionMode === 'beide' ? (Math.random() < 0.5 ? 'left' : 'right') : (directionMode === 'left' ? 'left' : 'right');
        const arrowLeft = direction === 'left';

        let values: (number | Fraction)[];
        let start = 0;
        const usedStep = fit.step;

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
    return { items: results, note: fit.note };
}

export function generateGetallenasExercises(block: MathBlock): GetallenasExercise[] {
    return generateGetallenasExercisesNoted(block).items;
}
