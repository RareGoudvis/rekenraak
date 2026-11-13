import type { StepLine, StepToken } from '../math/workedSteps';
import type { AfrondenExercise } from '../math/types';
import { formatMathNumber } from '../math/formatters';
import { roundTo, targetsFor, ROUND_SCALE, type RoundTarget } from '../afronden/roundTargets';

// Afronden (simpel: one number, one target) as three questions, then "347 ≈ 350":
// between which two round numbers, which digit decides, up or down. Rooster rows have no steps.

// Place names by power of ten, as the pupil says them ("rechts van de tientallen").
const PLACE: Record<number, string> = {
    [-3]: 'duizendsten', [-2]: 'honderdsten', [-1]: 'tienden', 0: 'eenheden', 1: 'tientallen', 2: 'honderdtallen',
    3: 'duizendtallen', 4: 'tienduizendtallen', 5: 'honderdduizendtallen', 6: 'miljoenen', 7: 'tientallen miljoenen',
    8: 'honderdtallen miljoenen', 9: 'miljarden',
};

const ALL_TARGETS = [...targetsFor('natural'), ...targetsFor('decimal')];

// The exercise's target: its own key (natural and decimal keys never overlap), else the block's first, as the viewer does.
export function afrondenTarget(ex: Pick<AfrondenExercise, 'targetKey'>, numberType?: unknown): RoundTarget {
    return ALL_TARGETS.find(t => t.key === ex.targetKey) ?? targetsFor(numberType === 'decimal' ? 'decimal' : 'natural')[0];
}

export const placeExp = (weight: number) => Math.round(Math.log10(weight));
export const decimalsOfWeight = (weight: number) => Math.max(0, -placeExp(weight));
const clean = (x: number) => Number(x.toFixed(6));

// A decimal keeps its printed zeros (4,10; 56,0): a word token, since a num token would drop them.
function shown(v: number, decimals: number): StepToken {
    const text = formatMathNumber(v, decimals);
    return decimals > 0 && text !== formatMathNumber(v) ? { t: 'word', w: text } : { t: 'num', v };
}

// The two round neighbours, the deciding digit and the way to go; null for a number that has nothing to round.
export function afrondenParts(n: number, t: RoundTarget) {
    const units = Math.round(n * ROUND_SCALE);
    const step = Math.round(t.weight * ROUND_SCALE);
    const lower = clean((Math.floor(units / step) * step) / ROUND_SCALE);
    const digit = Math.floor(units / (step / 10)) % 10;
    return { lower, upper: clean(lower + t.weight), digit, rounded: roundTo(n, t.weight), exact: units % step === 0 };
}

export function afrondenSteps(ex: AfrondenExercise | undefined, c?: Record<string, unknown>): StepLine[] | null {
    const n = ex?.number;
    if (!ex || typeof n !== 'number' || !Number.isFinite(n) || n < 0) return null;
    const t = afrondenTarget(ex, c?.numberType);
    const exp = placeExp(t.weight);
    const dp = ex.decimalPlaces ?? 0;
    const td = decimalsOfWeight(t.weight);
    const { lower, upper, digit, rounded, exact } = afrondenParts(n, t);
    const word = (w: string): StepToken => ({ t: 'word', w });
    const nTok = shown(n, dp);
    const nText = formatMathNumber(n, dp || undefined);
    const closing: StepLine = { kind: 'afronden.klaar', basis: true, aside: true, tokens: [nTok, word(' ≈ '), shown(rounded, td)] };
    // Already on a round number (a mask can give 300 to round to a tiental): nothing to ask.
    if (exact) return [{ ...closing, kind: 'afronden.al', tokens: [nTok, word(t.heading ? ' is al rond, dus ' : ` ligt al op een ${t.label}, dus `), nTok, word(' ≈ '), shown(rounded, td)] }];
    const place = PLACE[exp];
    const between = t.weight < 1 ? `getallen met ${td} ${td === 1 ? 'cijfer' : 'cijfers'} na de komma` : t.weight === 1 ? 'gehele getallen' : place;
    const firstHint = t.weight <= 1
        ? `Laat de cijfers rechts van de ${place} weg: dat is het eerste getal.`
        : `Maak de cijfers rechts van de ${place} 0: dat is het eerste getal.`;
    const up = digit >= 5;
    return [
        {
            kind: 'afronden.tussen', basis: true, aside: true, mark: t.key,
            question: `Tussen welke twee ${between} ligt ${nText}?`, hint: firstHint,
            tokens: [shown(lower, td), word(' en '), shown(upper, td)],
        },
        {
            kind: 'afronden.cijfer', basis: true, aside: true, mark: exp - 1,
            question: 'Welk cijfer beslist?', hint: `Kijk naar het cijfer rechts van de ${place}.`,
            tokens: [word(`de ${PLACE[exp - 1]}: `), { t: 'num', v: digit }],
        },
        {
            kind: 'afronden.richting', basis: true, aside: true, mark: up ? 'up' : 'down',
            question: 'Rond je naar boven of naar beneden af?', hint: '5 of meer: naar boven. Minder dan 5: naar beneden.',
            tokens: [{ t: 'num', v: digit }, word(up ? ' is 5 of meer: naar boven' : ' is minder dan 5: naar beneden')],
        },
        closing,
    ];
}
