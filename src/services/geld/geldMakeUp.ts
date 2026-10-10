import type { BuildEntry } from '../../components/viewer/ViewerInteractionContext';

// A valid make-up of `amountCents` from the ticked denominations, fewest pieces first: the
// geld-tekenen key draws it (the pupil's own drawing may differ, any exact make-up is right).
// DP over units of 5 cents, the smallest coin; unreachable (or non-5 multiple) amounts give [].
export function geldMakeUp(amountCents: number, allowedCents: readonly number[]): BuildEntry[] {
    if (amountCents <= 0 || amountCents % 5 !== 0) return [];
    const coins = [...new Set(allowedCents)].filter(v => v > 0 && v % 5 === 0 && v <= amountCents).sort((a, b) => b - a);
    const target = amountCents / 5;
    const best = new Int32Array(target + 1).fill(-1);
    const via = new Int32Array(target + 1);
    best[0] = 0;
    for (let k = 1; k <= target; k++) {
        for (const v of coins) {
            const from = k - v / 5;
            if (from >= 0 && best[from] >= 0 && (best[k] < 0 || best[from] + 1 < best[k])) { best[k] = best[from] + 1; via[k] = v; }
        }
    }
    if (best[target] < 0) return [];
    const counts = new Map<number, number>();
    for (let k = target; k > 0; k -= via[k] / 5) counts.set(via[k], (counts.get(via[k]) ?? 0) + 1);
    return [...counts].sort((a, b) => b[0] - a[0]).map(([value, count]) => ({ key: String(value), count }));
}
