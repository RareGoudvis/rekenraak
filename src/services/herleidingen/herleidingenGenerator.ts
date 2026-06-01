import type { MathBlock, HerleidingExercise } from '../math/types';

// Metric ladders. factor = value relative to the SMALLEST unit, so every factor is a
// power of 10 and all conversions stay exact integers (no JS float rounding).
interface Unit { key: string; factor: number; }
const LADDERS: Record<string, Unit[]> = {
    lengte: [{ key: 'km', factor: 1e6 }, { key: 'hm', factor: 1e5 }, { key: 'dam', factor: 1e4 }, { key: 'm', factor: 1e3 }, { key: 'dm', factor: 1e2 }, { key: 'cm', factor: 1e1 }, { key: 'mm', factor: 1 }],
    inhoud: [{ key: 'kl', factor: 1e6 }, { key: 'hl', factor: 1e5 }, { key: 'dal', factor: 1e4 }, { key: 'l', factor: 1e3 }, { key: 'dl', factor: 1e2 }, { key: 'cl', factor: 1e1 }, { key: 'ml', factor: 1 }],
    massa: [{ key: 'kg', factor: 1e6 }, { key: 'hg', factor: 1e5 }, { key: 'dag', factor: 1e4 }, { key: 'g', factor: 1e3 }, { key: 'dg', factor: 1e2 }, { key: 'cg', factor: 1e1 }, { key: 'mg', factor: 1 }],
};

export function ladderFor(measure: string): Unit[] {
    return LADDERS[measure] ?? LADDERS.lengte;
}

const ALL_FORMATS = ['enkel-getal', 'enkel-eenheid', 'samengesteld-enkel', 'enkel-samengesteld'] as const;
const MAX_ATTEMPTS = 20000;

const ri = (n: number) => 1 + Math.floor(Math.random() * Math.max(1, n)); // 1..n
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function generateHerleidingExercises(block: MathBlock): HerleidingExercise[] {
    const c = block.constraints || {};
    const measure: string = c.measure ?? 'lengte';
    const max: number = Math.max(1, c.maxGetal ?? 9);
    const count: number = block.numberOfExercises || 8;
    const formats: string[] = (c.formats?.length ? c.formats : ALL_FORMATS) as string[];

    const ladder = ladderFor(measure);
    // Enabled units, sorted high→low (descending factor). Need ≥2 to convert.
    let units: Unit[] = ladder.filter(u => (c.units ?? ladder.map(x => x.key)).includes(u.key));
    if (units.length < 2) units = ladder;

    // A "big > small" pair from the enabled units.
    const pickPair = (): [Unit, Unit] => {
        const i = Math.floor(Math.random() * (units.length - 1));
        const j = i + 1 + Math.floor(Math.random() * (units.length - 1 - i));
        return [units[i], units[j]]; // units[i].factor > units[j].factor (sorted desc)
    };

    const build = (format: string): HerleidingExercise | null => {
        if (format === 'enkel-getal') {
            const [big, small] = pickPair();
            const coeff = ri(max);
            return part(format, [{ key: big.key, value: coeff }], [{ key: small.key, value: coeff * (big.factor / small.factor) }], 'number');
        }
        if (format === 'enkel-eenheid') {
            const [big, small] = pickPair();
            const coeff = ri(max);
            const smallVal = coeff * (big.factor / small.factor);
            // Show either direction; the student always writes the answer UNIT.
            return Math.random() < 0.5
                ? part(format, [{ key: big.key, value: coeff }], [{ key: small.key, value: smallVal }], 'unit')
                : part(format, [{ key: small.key, value: smallVal }], [{ key: big.key, value: coeff }], 'unit');
        }
        if (format === 'samengesteld-enkel') {
            const [big, small] = pickPair();
            const ratio = big.factor / small.factor; // ≥ 10
            const c1 = ri(max);
            const c2 = ri(Math.min(max, ratio - 1)); // proper compound part < ratio
            return part(format, [{ key: big.key, value: c1 }, { key: small.key, value: c2 }], [{ key: small.key, value: c1 * ratio + c2 }], 'number');
        }
        // enkel-samengesteld: answer = A(big) + B(mid); given = a single lower unit C (≤ B).
        const [A, B] = pickPair();
        const lowers = units.filter(u => u.factor <= B.factor);
        const C = pick(lowers);
        const cA = ri(max);
        const cB = ri(Math.min(max, A.factor / B.factor - 1));
        const fromVal = cA * (A.factor / C.factor) + cB * (B.factor / C.factor);
        return part(format, [{ key: C.key, value: fromVal }], [{ key: A.key, value: cA }, { key: B.key, value: cB }], 'number');
    };

    const out: HerleidingExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < MAX_ATTEMPTS) {
        attempts++;
        const ex = build(pick(formats));
        if (!ex) continue;
        const key = `${ex.format}|${ex.fromParts.map(p => p.key + p.value).join(',')}=${ex.toParts.map(p => p.key + p.value).join(',')}|${ex.blank}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(ex);
    }
    return out;
}

function part(format: string, fromParts: { key: string; value: number }[], toParts: { key: string; value: number }[], blank: 'number' | 'unit'): HerleidingExercise {
    return {
        id: `herl-${Math.random().toString(36).slice(2, 9)}`,
        format: format as HerleidingExercise['format'],
        fromParts, toParts, blank,
        isManuallyEdited: false,
    };
}
