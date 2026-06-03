import type { MathBlock, OrdenenExercise, Fraction } from '../math/types';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);
const val = (f: Fraction): number => (f.whole ?? 0) + f.n / f.d;
const fkey = (f: Fraction): string => `${f.whole ?? 0}/${f.n}/${f.d}`;

// 'Speciale breuken' — a curated pool of near-1 / commonly-confused fractions.
const SPECIAL_POOL: Fraction[] = [
    { n: 2, d: 3 }, { n: 3, d: 4 }, { n: 4, d: 5 }, { n: 5, d: 6 }, { n: 6, d: 7 },
    { n: 7, d: 8 }, { n: 8, d: 9 }, { n: 9, d: 10 }, { n: 11, d: 12 }, { n: 14, d: 15 }, { n: 15, d: 16 },
];

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Build `count` distinct fractions for the chosen pool/mode.
function buildSet(mode: string, count: number, minD: number, maxD: number): Fraction[] {
    const lo = Math.max(2, minD), hi = Math.max(lo, maxD);

    if (mode === 'speciale') {
        return shuffle(SPECIAL_POOL).slice(0, Math.min(count, SPECIAL_POOL.length));
    }

    if (mode === 'gelijknamige') {
        // One shared denominator big enough to host `count` distinct numerators.
        let d = randInt(Math.max(lo, count + 1), Math.max(lo, count + 1, hi));
        if (d - 1 < count) d = count + 1;
        const nums = shuffle(Array.from({ length: d - 1 }, (_, i) => i + 1)).slice(0, count);
        return nums.map(n => ({ n, d }));
    }

    if (mode === 'gelijknamig-te-maken') {
        // Distinct small denominators (unlike) — pupil makes them gelijknamig first.
        const pool = [2, 3, 4, 5, 6, 8, 10, 12].filter(d => d >= lo && d <= Math.max(hi, 12));
        const dens = shuffle(pool.length >= count ? pool : [2, 3, 4, 5, 6, 8, 10, 12]).slice(0, count);
        return dens.map(d => ({ n: randInt(1, d - 1), d }));
    }

    // stambreuken — numerator 1, distinct denominators.
    const denPool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const dens = shuffle(denPool.length >= count ? denPool : Array.from({ length: Math.max(count + 1, 2) }, (_, i) => i + 2)).slice(0, count);
    return dens.map(d => ({ n: 1, d }));
}

export function generateBreukenRangschikkenExercises(block: MathBlock): OrdenenExercise[] {
    const c = block.constraints;
    const mode: string = c.fractionMode ?? 'stambreuken';
    const count: number = Math.min(5, Math.max(2, c.count ?? 4));
    const operatorMode: string = c.operatorMode ?? 'oplopend';
    const minD: number = c.minDenominator ?? 2;
    const maxD: number = c.maxDenominator ?? 10;

    const n = block.numberOfExercises;
    const results: OrdenenExercise[] = [];

    for (let i = 0; i < n; i++) {
        // Retry until we have `count` distinct-valued fractions.
        let values: Fraction[] = [];
        let attempts = 0;
        while (values.length < count && attempts < 200) {
            attempts++;
            const candidate = buildSet(mode, count, minD, maxD);
            const seen = new Set<number>();
            values = candidate.filter(f => {
                const v = val(f);
                if (seen.has(v)) return false;
                seen.add(v);
                return true;
            });
        }

        const operator: '<' | '>' =
            operatorMode === 'aflopend' ? '>' : operatorMode === 'beide' ? (Math.random() < 0.5 ? '<' : '>') : '<';
        const ordered = [...values].sort((a, b) => operator === '<' ? val(a) - val(b) : val(b) - val(a));
        // Shuffle for the prompt, but ensure it isn't already in order.
        let display = shuffle(values);
        if (display.map(fkey).join() === ordered.map(fkey).join() && values.length > 1) display = [...values].reverse();

        results.push({ id: rndId(), values: ordered, display, operator, isManuallyEdited: false });
    }
    return results;
}
