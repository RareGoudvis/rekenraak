import type { MathBlock, BreukBewerkExercise, Fraction } from '../math/types';
import { gcd, simplifyFraction, toMixedNumber } from '../math/mathEngine';

const randInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const rndId = () => Math.random().toString(36).substring(2, 9);
const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

// gemengd: improper↔mixed. direction set per item ('beide' randomises).
// maxNumerator/maxDenominator cap the improper fraction (getalopbouw widget).
function makeGemengd(maxNum: number, maxDen: number, dirMode: string): BreukBewerkExercise {
    const direction: 'naar-gemengd' | 'naar-breuk' =
        dirMode === 'beide' ? (Math.random() < 0.5 ? 'naar-gemengd' : 'naar-breuk') : (dirMode as 'naar-gemengd' | 'naar-breuk');
    const d = randInt(2, Math.max(2, maxDen));
    // Improper teller in (d, maxNumerator], not a multiple of d → a real mixed number.
    const lo = d + 1, hi = Math.max(lo, maxNum);
    let n = randInt(lo, hi), guard = 0;
    while (n % d === 0 && guard++ < 40) n = randInt(lo, hi);
    if (n % d === 0) n += 1;   // last-resort nudge
    const improper: Fraction = { n, d };
    const mixed: Fraction = toMixedNumber(n, d);   // already in lowest terms

    return direction === 'naar-gemengd'
        ? { id: rndId(), subType: 'gemengd', direction, inputs: [improper], answers: [mixed], isManuallyEdited: false }
        : { id: rndId(), subType: 'gemengd', direction, inputs: [mixed], answers: [improper], isManuallyEdited: false };
}

// Divisors of `target` within [lo, hi] and ≥ 2 — candidate input denominators.
function divisorsInRange(target: number, lo: number, hi: number): number[] {
    const out: number[] = [];
    for (let d = Math.max(2, lo); d <= Math.min(hi, target); d++) if (target % d === 0) out.push(d);
    return out;
}

// gelijknamig: two fractions with different denominators → a common denominator.
// targetDen (when it has ≥2 divisors in range) fixes the common denominator; else the LCM.
function makeGelijknamig(minD: number, maxD: number, targetDen: number | null): BreukBewerkExercise {
    const lo = Math.max(2, minD), hi = Math.max(lo + 1, maxD);

    let d1: number, d2: number, L: number;
    const divisors = targetDen && targetDen >= 2 ? divisorsInRange(targetDen, lo, hi) : [];
    if (targetDen && divisors.length >= 2) {
        d1 = divisors[randInt(0, divisors.length - 1)];
        let guard = 0;
        do { d2 = divisors[randInt(0, divisors.length - 1)]; } while (d2 === d1 && guard++ < 40);
        L = targetDen;
    } else {
        d1 = randInt(lo, hi);
        let guard = 0;
        do { d2 = randInt(lo, hi); } while (d1 === d2 && guard++ < 40);
        L = lcm(d1, d2);
    }
    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);
    const inputs: Fraction[] = [{ n: n1, d: d1 }, { n: n2, d: d2 }];
    const answers: Fraction[] = [{ n: n1 * (L / d1), d: L }, { n: n2 * (L / d2), d: L }];
    return { id: rndId(), subType: 'gelijknamig', inputs, answers, isManuallyEdited: false };
}

// A coprime proper fraction with denominator ≤ maxDen, numerator ≤ maxNum.
function coprimeBase(maxNum: number, maxDen: number): Fraction {
    let guard = 0;
    while (guard++ < 60) {
        const d = randInt(2, Math.max(2, maxDen));
        const n = randInt(1, Math.max(1, Math.min(d - 1, maxNum)));
        const s = simplifyFraction(n, d);
        if (s.n === n && s.d === d) return s;   // already coprime
    }
    return { n: 1, d: 2 };
}

// vereenvoudigen: a reducible fraction → its lowest-terms form. tablesOnly keeps the
// base denominator and the scale factor within the times tables (≤10). allowIrreducible
// occasionally emits an already-coprime fraction (answer = input) so pupils must judge.
function makeVereenvoudigen(maxNum: number, maxDen: number, tablesOnly: boolean, allowIrreducible: boolean): BreukBewerkExercise {
    if (allowIrreducible && Math.random() < 0.3) {
        const f = coprimeBase(maxNum, maxDen);
        return { id: rndId(), subType: 'vereenvoudigen', inputs: [f], answers: [f], isManuallyEdited: false };
    }

    let guard = 0;
    while (guard++ < 80) {
        const baseDenCap = tablesOnly ? Math.min(10, maxDen) : maxDen;
        const base = coprimeBase(maxNum, baseDenCap);
        const kCap = Math.min(
            Math.floor(maxNum / base.n),
            Math.floor(maxDen / base.d),
            tablesOnly ? 10 : Infinity,
        );
        if (kCap < 2) continue;                 // can't make a reducible fraction within caps
        const k = randInt(2, kCap);
        const input: Fraction = { n: base.n * k, d: base.d * k };
        return { id: rndId(), subType: 'vereenvoudigen', inputs: [input], answers: [base], isManuallyEdited: false };
    }
    // Fallback: a guaranteed reducible fraction.
    return { id: rndId(), subType: 'vereenvoudigen', inputs: [{ n: 2, d: 4 }], answers: [{ n: 1, d: 2 }], isManuallyEdited: false };
}

export function generateBreukBewerkExercises(block: MathBlock): BreukBewerkExercise[] {
    const c = block.constraints;
    const subType: string = c.subType ?? 'gemengd';
    const minD: number = c.minDenominator ?? 2;
    const maxD: number = c.maxDenominator ?? 10;
    const maxN: number = c.maxNumerator ?? 10;
    const dirMode: string = c.direction ?? 'naar-gemengd';
    const tablesOnly: boolean = c.tablesOnly ?? true;
    const allowIrreducible: boolean = c.allowIrreducible ?? false;
    const targetDen: number | null = c.targetDen === '' || c.targetDen == null ? null : Number(c.targetDen);
    const n = block.numberOfExercises;

    return Array.from({ length: n }, () => {
        if (subType === 'gelijknamig') return makeGelijknamig(minD, maxD, targetDen);
        if (subType === 'vereenvoudigen') return makeVereenvoudigen(maxN, maxD, tablesOnly, allowIrreducible);
        return makeGemengd(maxN, maxD, dirMode);
    });
}
