import type { MathBlock, GetallenasExercise, Fraction } from '../math/types';
import { numberMatchesMask, getMaskPlaces } from '../math/mathEngine';
import type { GetallenrijConstraints } from '../math/constraintTypes';
import { fitLine } from '../getallenas/getallenasGenerator';

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

// Enumerate every masked build up to this many (9 digits per masked place), else sample.
const MASK_ENUM_LIMIT = 9 ** 5;

// Step units (anchor = units × step) in [aU, bU] whose value has a nonzero digit on exactly
// the masked places, built digit by digit instead of hoping a random start matches.
function maskedAnchorUnits(weightsS: number[], stepS: number, aU: number, bU: number): number[] {
    const fits = (v: number) => v % stepS === 0 && v / stepS >= aU && v / stepS <= bU;
    if (9 ** weightsS.length <= MASK_ENUM_LIMIT) {
        let sums = [0];
        for (const w of weightsS) sums = sums.flatMap(acc => [1, 2, 3, 4, 5, 6, 7, 8, 9].map(dg => acc + dg * w));
        return sums.filter(fits).map(v => v / stepS);
    }
    for (let i = 0; i < 3000; i++) {
        const v = weightsS.reduce((acc, w) => acc + randInt(1, 9) * w, 0);
        if (fits(v)) return [v / stepS];
    }
    return [];
}

const nl = (x: number) => x.toLocaleString('nl-BE');

// A 1/d row of `ticks` cells needs ticks − 1 units below the teller cap; fewer cells when not.
function fitFractionRow(maxUnits: number, d: number, ticks: number): { ticks: number; note: string | null } {
    if (ticks - 1 <= maxUnits) return { ticks, note: null };
    const fewer = maxUnits + 1;
    return { ticks: fewer, note: `Hoogste teller ${maxUnits} bij noemer ${d}: ${fewer} vakjes i.p.v. ${ticks}.` };
}

export function generateGetallenrijExercisesNoted(block: MathBlock): { items: GetallenasExercise[]; note: string | null } {
    const c = block.constraints as GetallenrijConstraints;
    const numberType: string = c.numberType ?? 'natural';
    const maxGetal: number = c.maxGetal ?? 100;
    const step: number = c.step ?? 5;
    const directionMode: string = c.direction ?? 'right';
    const hardMode: boolean = c.hardMode ?? false;
    const lo = numberType === 'geheel' ? (c.minGetal ?? -maxGetal) : 0;
    // Rational rows count in units of 1/d; maxTeller (getalopbouw) caps the highest teller.
    const d = c.fractionStep && c.fractionStep > 1 ? c.fractionStep : 4;
    const maxWholeUnits = c.maxTeller && c.maxTeller >= 1 ? Math.floor(c.maxTeller) : 5 * d;
    const fit = numberType === 'rational'
        ? { step, ...fitFractionRow(maxWholeUnits, d, c.ticks ?? 6) }
        : fitLine(lo, maxGetal, step || 1, c.ticks ?? 6, directionMode, numberType === 'decimal' ? 0.001 : 1, 'vakjes');
    const ticks = fit.ticks;
    const numberMask: Record<string, boolean> = c.numberMask ?? {};
    // 'Specifieke getalopbouw' only constrains place-value number types (anchor value).
    const useMask = (numberType === 'natural' || numberType === 'decimal') && Object.values(numberMask).some(Boolean);

    const n = block.numberOfExercises;
    const results: GetallenasExercise[] = [];
    // Anchor builds per start range, and how many rows had to give up on the mask.
    const anchorCache = new Map<string, number[]>();
    let maskMisses = 0;

    for (let i = 0; i < n; i++) {
        // arrowLeft = descending L→R: a 'dalend' row subtracts as you read right.
        const arrowLeft = directionMode === 'beide' ? Math.random() < 0.5 : directionMode === 'left';

        let values: (number | Fraction)[];
        let start = 0;
        const usedStep = fit.step;

        if (numberType === 'rational') {
            const fracOpts = { mixed: c.allowMixed ?? true, simplify: !(c.gelijknamig ?? false) };
            const span = ticks - 1;
            const startUnits = arrowLeft
                ? pick(span, maxWholeUnits)
                : pick(0, Math.max(0, maxWholeUnits - span));
            values = Array.from({ length: ticks }, (_, k) => fracFromQuarters(arrowLeft ? startUnits - k : startUnits + k, d, fracOpts));
        } else {
            const hi = maxGetal;
            const stepN = usedStep || 1;
            const span = stepN * (ticks - 1);
            const dp = stepDecimals(stepN);

            // Clamp so a row longer than the range (step×ticks > maxGetal) anchors at lo
            // instead of `pick` swapping bounds into negative starts on a natural row.
            const loU = Math.ceil(lo / stepN);
            const need = Math.ceil((lo + span) / stepN);
            const hiU = Math.floor(hi / stepN);
            const upper = Math.floor((hi - span) / stepN);
            // Try to land an anchor (leftmost value) whose place structure matches the mask.
            let attempts = 0;
            do {
                const startU = arrowLeft
                    ? pick(need, Math.max(need, hiU))
                    : pick(loU, Math.max(loU, upper));
                start = startU * stepN;
                attempts++;
            } while (useMask && !numberMatchesMask(start, numberMask, maxGetal, numberType as 'natural' | 'decimal', dp) && attempts < 80);
            // The random draws above stay first so rows that already matched keep their seeded output.
            if (useMask && !numberMatchesMask(start, numberMask, maxGetal, numberType as 'natural' | 'decimal', dp)) {
                const scale = Math.pow(10, dp);
                const [aU, bU] = arrowLeft ? [need, Math.max(need, hiU)] : [loU, Math.max(loU, upper)];
                const key = `${aU},${bU}`;
                if (!anchorCache.has(key)) {
                    const weightsS = getMaskPlaces(maxGetal, numberType as 'natural' | 'decimal', dp).filter(p => numberMask[p.key]).map(p => Math.round(p.weight * scale));
                    anchorCache.set(key, maskedAnchorUnits(weightsS, Math.round(stepN * scale), aU, bU));
                }
                const options = anchorCache.get(key)!;
                if (options.length) start = options[randInt(0, options.length - 1)] * stepN;
                else maskMisses++;
            }

            values = numericValues(start, stepN, ticks, arrowLeft);
        }

        const ratio = hardMode ? 0.6 : 0.4;
        const blankMask = Array.from({ length: ticks }, (_, k) => k !== 0 && Math.random() < ratio);
        if (!blankMask.some(Boolean)) blankMask[ticks - 1] = true;

        results.push({ id: rndId(), start, step: usedStep, tickCount: ticks, blankMask, direction: arrowLeft ? 'left' : 'right', values, numberType, isManuallyEdited: false });
    }
    let maskNote: string | null = null;
    if (maskMisses > 0) {
        const keys = getMaskPlaces(maxGetal, numberType as 'natural' | 'decimal', stepDecimals(fit.step)).filter(p => numberMask[p.key]).map(p => p.key).join(', ');
        const range = lo === 0 ? `tot ${nl(maxGetal)}` : `van ${nl(lo)} tot ${nl(maxGetal)}`;
        const where = maskMisses >= n ? '' : ` bij ${maskMisses} van de ${n} rijen`;
        maskNote = `De getalopbouw (${keys}) van het eerste getal past niet bij sprong +${nl(fit.step)} ${range} en is${where} genegeerd.`;
    }
    return { items: results, note: fit.note && maskNote ? `${fit.note} ${maskNote}` : (fit.note ?? maskNote) };
}

export function generateGetallenrijExercises(block: MathBlock): GetallenasExercise[] {
    return generateGetallenrijExercisesNoted(block).items;
}
