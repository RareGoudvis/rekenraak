import type { GeldTeruggevenExercise } from '../math/types';
import type { StepLine, StepToken } from '../math/workedSteps';

// Geld teruggeven by aanvullen (owner, 2026-11-13): first the cents up to a round euro, then the euros.
// Below ,50 the cents stop at ,50 first (3,40 → 3,50 → 4), so every jump is one a child can see.

// Dutch money amounts without the euro sign: "3,40", "6"; the cents always get two digits.
export function geldText(cents: number): string {
    const euros = Math.floor(cents / 100);
    const rest = cents % 100;
    return rest === 0 ? String(euros) : `${euros},${String(rest).padStart(2, '0')}`;
}

const word = (w: string): StepToken => ({ t: 'word', w });
const op = (o: '+' | '-'): StepToken => ({ t: 'op', op: o });

export function geldTeruggevenStops(price: number, pay: number): number[] {
    const whole = Math.ceil(price / 100) * 100;
    const stops = [price];
    if (price % 100 !== 0 && price % 100 < 50) stops.push(Math.floor(price / 100) * 100 + 50);
    stops.push(whole, pay);
    return stops.filter((s, i) => s <= pay && (i === 0 || s > stops[i - 1]));
}

export function geldTeruggevenSteps(ex: GeldTeruggevenExercise | undefined): StepLine[] | null {
    if (!ex) return null;
    const { priceCents: price, payWithCents: pay } = ex;
    if (![price, pay].every(v => Number.isInteger(v) && v >= 0 && v <= 1_000_000) || price >= pay) return null;
    const stops = geldTeruggevenStops(price, pay);
    const jumps = stops.slice(1).map((s, i) => s - stops[i]);
    const lines: StepLine[] = jumps.map((j, i) => ({
        kind: 'geld.sprong',
        basis: true,
        aside: true,
        tokens: [word(`${geldText(stops[i])} → ${geldText(stops[i + 1])}: ${geldText(j)}`)],
        mark: i,
    }));
    // One jump is the answer already; "samen" only adds something when the jumps are added up.
    if (jumps.length > 1) {
        const sum: StepToken[] = jumps.flatMap((j, i) => (i ? [op('+'), word(geldText(j))] : [word(geldText(j))]));
        lines.push({ kind: 'geld.samen', basis: true, aside: true, tokens: [word('samen: '), ...sum, word(` = ${geldText(pay - price)}`)] });
    }
    return lines;
}
