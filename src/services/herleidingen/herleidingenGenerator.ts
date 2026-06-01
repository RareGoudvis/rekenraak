import type { MathBlock, HerleidingExercise, HerleidingPart } from '../math/types';

// Metric ladders. factor = value relative to the SMALLEST unit, so every factor is a power of
// 10 and all conversions stay exact integers. Oppervlakte steps ×100 and includes the are-units
// ha/a/ca as aliases of hm²/dam²/m² (equal factors — handled by the strict-pair logic below).
interface Unit { key: string; factor: number; }
const LADDERS: Record<string, Unit[]> = {
    lengte: [{ key: 'km', factor: 1e6 }, { key: 'hm', factor: 1e5 }, { key: 'dam', factor: 1e4 }, { key: 'm', factor: 1e3 }, { key: 'dm', factor: 1e2 }, { key: 'cm', factor: 1e1 }, { key: 'mm', factor: 1 }],
    inhoud: [{ key: 'kl', factor: 1e6 }, { key: 'hl', factor: 1e5 }, { key: 'dal', factor: 1e4 }, { key: 'l', factor: 1e3 }, { key: 'dl', factor: 1e2 }, { key: 'cl', factor: 1e1 }, { key: 'ml', factor: 1 }],
    massa: [{ key: 'kg', factor: 1e6 }, { key: 'hg', factor: 1e5 }, { key: 'dag', factor: 1e4 }, { key: 'g', factor: 1e3 }, { key: 'dg', factor: 1e2 }, { key: 'cg', factor: 1e1 }, { key: 'mg', factor: 1 }],
    oppervlakte: [
        { key: 'km²', factor: 1e12 },
        { key: 'hm²', factor: 1e10 }, { key: 'ha', factor: 1e10 },
        { key: 'dam²', factor: 1e8 }, { key: 'a', factor: 1e8 },
        { key: 'm²', factor: 1e6 }, { key: 'ca', factor: 1e6 },
        { key: 'dm²', factor: 1e4 }, { key: 'cm²', factor: 1e2 }, { key: 'mm²', factor: 1 },
    ],
};

export function ladderFor(measure: string): Unit[] {
    return LADDERS[measure] ?? LADDERS.lengte;
}

const ALL_FORMATS = ['enkel-getal', 'enkel-eenheid', 'samengesteld-enkel', 'enkel-samengesteld'] as const;
const MAX_ATTEMPTS = 20000;

const ri = (n: number) => 1 + Math.floor(Math.random() * Math.max(1, n)); // 1..n
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const round6 = (x: number) => Number(x.toFixed(6)); // avoid float dust on non-exact teacher edits

export function generateHerleidingExercises(block: MathBlock): HerleidingExercise[] {
    const c = block.constraints || {};
    const measure: string = c.measure ?? 'lengte';
    const maxEnkel: number = Math.max(1, c.maxEnkel ?? c.maxGetal ?? 100);
    const maxSam: number = Math.max(1, c.maxSamengesteld ?? c.maxGetal ?? 1000);
    const compoundMode: string = c.compoundMode ?? '2';
    const count: number = block.numberOfExercises || 8;
    const formats: string[] = (c.formats?.length ? c.formats : ALL_FORMATS) as string[];

    const ladder = ladderFor(measure);
    let units: Unit[] = ladder.filter(u => (c.units ?? ladder.map(x => x.key)).includes(u.key));
    if (units.length < 2) units = ladder;
    const fOf = (k: string) => units.find(u => u.key === k)?.factor ?? ladder.find(u => u.key === k)?.factor ?? 1;

    // Standard formats use ONE unit per factor (the square — listed before its are-alias in
    // LADDERS), so a compound never shows a unit and its alias together (m² + ca).
    const seenF = new Set<number>();
    const gridUnits = units.filter(u => seenF.has(u.factor) ? false : (seenF.add(u.factor), true));

    // Are-stelsel: ha/a/ca are equal-factor aliases of hm²/dam²/m². Used only by the are formats.
    const areMode: string = c.areMode ?? 'samengesteld';
    const AREL = [{ key: 'ha', factor: 1e10 }, { key: 'a', factor: 1e8 }, { key: 'ca', factor: 1e6 }];
    const sqHigh = ladder.filter(u => u.factor >= 1e6 && !['ha', 'a', 'ca'].includes(u.key)); // km²,hm²,dam²,m²

    // A strictly-descending pair (big.factor > small.factor) — skips equal-factor aliases.
    const pickPair = (): [Unit, Unit] => {
        for (let t = 0; t < 60; t++) {
            const i = Math.floor(Math.random() * (gridUnits.length - 1));
            const j = i + 1 + Math.floor(Math.random() * (gridUnits.length - 1 - i));
            if (gridUnits[i].factor > gridUnits[j].factor) return [gridUnits[i], gridUnits[j]];
        }
        for (let i = 0; i < gridUnits.length; i++) for (let j = i + 1; j < gridUnits.length; j++) if (gridUnits[i].factor > gridUnits[j].factor) return [gridUnits[i], gridUnits[j]];
        return [gridUnits[0], gridUnits[gridUnits.length - 1]];
    };

    // "Volledig": a contiguous run of enabled units down to the lowest enabled unit (the given
    // unit), top coeff 1..max, every lower coeff 0..ratio-1. ≥3 units when ≥3 are enabled.
    const buildRun = (max: number): { run: HerleidingPart[]; bottomKey: string; baseInBottom: number } => {
        const eIdx = gridUnits.length - 1;
        const maxTop = Math.max(0, eIdx - (gridUnits.length >= 3 ? 2 : 1));
        const tIdx = Math.floor(Math.random() * (maxTop + 1));
        const run: HerleidingPart[] = [];
        for (let i = tIdx; i <= eIdx; i++) {
            const value = i === tIdx ? ri(max) : Math.floor(Math.random() * (gridUnits[i - 1].factor / gridUnits[i].factor));
            run.push({ key: gridUnits[i].key, value });
        }
        const bottom = gridUnits[eIdx];
        const baseInBottom = run.reduce((s, p) => s + p.value * (fOf(p.key) / bottom.factor), 0);
        return { run, bottomKey: bottom.key, baseInBottom };
    };

    const build = (format: string): HerleidingExercise | null => {
        // Square ⟷ are conversions (oppervlakte). 'enkel' = single-unit swap; 'samengesteld' =
        // are-compound (ha/a/ca, ×100 steps) ⟷ a single m² value.
        if (format === 'vierkant-are' || format === 'are-vierkant') {
            if (areMode === 'enkel') {
                const T = pick(AREL);
                const vT = ri(maxEnkel);
                const S = pick(sqHigh.filter(s => s.factor <= T.factor));   // square ≤ are factor → integer
                const sq = { key: S.key, value: vT * (T.factor / S.factor) };
                const are = { key: T.key, value: vT };
                return format === 'vierkant-are' ? mk(format, [sq], [are], 'number') : mk(format, [are], [sq], 'number');
            }
            const top = Math.floor(Math.random() * AREL.length);
            const run: HerleidingPart[] = [];
            for (let i = top; i <= AREL.length - 1; i++) run.push({ key: AREL[i].key, value: i === top ? ri(maxSam) : Math.floor(Math.random() * 100) });
            if (run.length < 2) return null;                                 // need a real compound
            const baseCa = run.reduce((s, p) => s + p.value * (fOf(p.key) / 1e6), 0); // ca == m²
            const sq = { key: 'm²', value: baseCa };
            return format === 'vierkant-are' ? mk(format, [sq], run, 'number') : mk(format, run, [sq], 'number');
        }
        if (format === 'enkel-getal') {
            const [big, small] = pickPair();
            const coeff = ri(maxEnkel);
            return mk(format, [{ key: big.key, value: coeff }], [{ key: small.key, value: coeff * (big.factor / small.factor) }], 'number');
        }
        if (format === 'enkel-eenheid') {
            const [big, small] = pickPair();
            const coeff = ri(maxEnkel);
            const smallVal = coeff * (big.factor / small.factor);
            return Math.random() < 0.5
                ? mk(format, [{ key: big.key, value: coeff }], [{ key: small.key, value: smallVal }], 'unit')
                : mk(format, [{ key: small.key, value: smallVal }], [{ key: big.key, value: coeff }], 'unit');
        }
        if (format === 'samengesteld-enkel') {
            if (compoundMode === 'volledig') {
                const { run, bottomKey, baseInBottom } = buildRun(maxSam);
                if (run.length < 2) return null;
                return mk(format, run, [{ key: bottomKey, value: baseInBottom }], 'number');
            }
            const [big, small] = pickPair();
            const ratio = big.factor / small.factor;
            const c1 = ri(maxSam);
            const c2 = ri(Math.min(maxSam, ratio - 1));
            return mk(format, [{ key: big.key, value: c1 }, { key: small.key, value: c2 }], [{ key: small.key, value: c1 * ratio + c2 }], 'number');
        }
        // enkel-samengesteld
        if (compoundMode === 'volledig') {
            const { run, bottomKey, baseInBottom } = buildRun(maxSam);
            if (run.length < 2) return null;
            return mk(format, [{ key: bottomKey, value: baseInBottom }], run, 'number');
        }
        const [A, B] = pickPair();
        const lowers = gridUnits.filter(u => u.factor <= B.factor);
        const C = pick(lowers);
        const cA = ri(maxSam);
        const cB = ri(Math.min(maxSam, A.factor / B.factor - 1));
        const fromVal = cA * (A.factor / C.factor) + cB * (B.factor / C.factor);
        return mk(format, [{ key: C.key, value: fromVal }], [{ key: A.key, value: cA }, { key: B.key, value: cB }], 'number');
    };

    // Guard against float rounding: every value + the base must stay an exact safe integer
    // (oppervlakte factors get huge — km² × big coeff can exceed MAX_SAFE_INTEGER).
    const baseOf = (parts: HerleidingPart[]) => parts.reduce((s, p) => s + p.value * fOf(p.key), 0);
    const isExact = (ex: HerleidingExercise) => {
        const all = ex.fromParts.concat(ex.toParts);
        if (all.some(p => !Number.isInteger(p.value) || Math.abs(p.value) > Number.MAX_SAFE_INTEGER)) return false;
        const bF = baseOf(ex.fromParts);
        return bF <= Number.MAX_SAFE_INTEGER && bF === baseOf(ex.toParts);
    };

    const out: HerleidingExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < MAX_ATTEMPTS) {
        attempts++;
        const ex = build(pick(formats));
        if (!ex || !isExact(ex)) continue;
        const key = `${ex.format}|${ex.fromParts.map(p => p.key + p.value).join(',')}=${ex.toParts.map(p => p.key + p.value).join(',')}|${ex.blank}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(ex);
    }
    return out;
}

function mk(format: string, fromParts: HerleidingPart[], toParts: HerleidingPart[], blank: 'number' | 'unit'): HerleidingExercise {
    return { id: `herl-${Math.random().toString(36).slice(2, 9)}`, format: format as HerleidingExercise['format'], fromParts, toParts, blank, isManuallyEdited: false };
}

// After a teacher edits a SHOWN field, restore the equation invariant base(from) === base(to)
// by recomputing the blanked answer side. Returns a patched copy (isManuallyEdited).
export function recomputeHerleiding(measure: string, ex: HerleidingExercise): HerleidingExercise {
    const ladder = ladderFor(measure);
    const f = (k: string) => ladder.find(u => u.key === k)?.factor ?? 1;
    const base = ex.fromParts.reduce((s, p) => s + p.value * f(p.key), 0);

    let toParts: HerleidingPart[];
    if (ex.blank === 'number') {
        if (ex.toParts.length === 1) {
            toParts = [{ key: ex.toParts[0].key, value: round6(base / f(ex.toParts[0].key)) }];
        } else {
            let rem = base;
            toParts = ex.toParts.map((p, i) => {
                const fac = f(p.key);
                if (i < ex.toParts.length - 1) { const v = Math.floor(rem / fac); rem -= v * fac; return { key: p.key, value: v }; }
                return { key: p.key, value: round6(rem / fac) };
            });
        }
    } else {
        // blank unit: number given, find the unit whose factor matches base/number.
        const target = base / ex.toParts[0].value;
        const match = ladder.find(u => u.factor === target);
        toParts = [{ key: match ? match.key : ex.toParts[0].key, value: ex.toParts[0].value }];
    }
    return { ...ex, toParts, isManuallyEdited: true };
}
