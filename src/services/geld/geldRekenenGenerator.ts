import type { MathBlock, GeldRekenenExercise } from '../math/types';

// Geld rekenen — korting / winst-verlies / intrest as rooster rows (deliberately
// tabular, not vraagstukken). All money in cents; amounts constructed so every
// answer is whole cents (whole euros by default).

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

const id = () => Math.random().toString(36).substring(2, 9);

export function generateGeldRekenenExercises(block: MathBlock): GeldRekenenExercise[] {
    const c = block.constraints;
    const subType: 'korting' | 'winst' | 'intrest' = c.subType ?? 'korting';
    const percents: number[] = c.percents ?? [10, 25, 50];
    const maxEuro: number = c.maxEuro ?? 100;
    const wholeEuros: boolean = c.wholeEuros ?? true;
    const count = block.numberOfExercises || 5;

    const out: GeldRekenenExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        if (subType === 'korting' || subType === 'intrest') {
            const percent = pick(percents);
            // Base must divide cleanly: percent of it stays whole cents (or whole euros).
            const unit = wholeEuros ? 100 : 1;                       // cents per allowed step
            const step = (100 / gcd(percent, 100)) * unit;           // smallest clean base
            const maxK = Math.floor((maxEuro * 100) / step);
            if (maxK < 1) continue;
            const amount = randInt(1, maxK) * step;
            const months = subType === 'intrest' ? (c.halfYear ? pick([6, 12]) : 12) : undefined;
            // Half-year interest halves the amount — require it to stay whole cents.
            if (months === 6 && ((amount * percent) / 100) % 2 !== 0) continue;
            const key = `${percent}-${amount}-${months ?? ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(subType === 'korting'
                ? { id: id(), subType, percent, priceCents: amount, isManuallyEdited: false }
                : { id: id(), subType, percent, capitalCents: amount, months, isManuallyEdited: false });
        } else {
            // winst/verlies: two prices; ~half the rows are a loss.
            const unit = wholeEuros ? 100 : 1;
            const buy = randInt(1, maxEuro * 100 / unit) * unit;
            const sell = randInt(1, maxEuro * 100 / unit) * unit;
            if (buy === sell) continue;
            const key = `${buy}-${sell}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: id(), subType, buyCents: buy, sellCents: sell, isManuallyEdited: false });
        }
    }
    return out;
}

function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
}

// € 1 234,50 — nl-BE euro notation; whole amounts print without cents.
export function formatEuro(cents: number): string {
    const negative = cents < 0;
    const abs = Math.abs(cents);
    const euros = Math.floor(abs / 100);
    const rest = abs % 100;
    const intStr = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const body = rest === 0 ? intStr : `${intStr},${String(rest).padStart(2, '0')}`;
    return `${negative ? '−' : ''}€ ${body}`;
}
