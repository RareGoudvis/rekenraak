// All-pairs (pairwise) combination generator — no dependency.
//
// Exhaustive coverage of N constraint keys is the product of their option counts, which
// for a family like hoofdrekenen is tens of thousands of generator runs. Pairwise keeps
// the property that matters for a bug hunt — every VALUE of every key appears together
// with every value of every OTHER key at least once — at a fraction of the cost
// (roughly the product of the two largest option lists).
//
// Greedy construction: walk the still-uncovered pairs, and for each one grow a full row
// by choosing, per remaining key, the value that covers the most uncovered pairs.

export type Space = Record<string, unknown[]>;
export type Combo = Record<string, unknown>;

const pairKey = (ka: string, ia: number, kb: string, ib: number) => `${ka}=${ia}|${kb}=${ib}`;

export function pairwise(space: Space, cap = Infinity): Combo[] {
    const keys = Object.keys(space).filter(k => (space[k]?.length ?? 0) > 0);
    if (keys.length === 0) return [];
    // One key has no pairs to cover: every value is its own row.
    if (keys.length === 1) return space[keys[0]].slice(0, cap).map(v => ({ [keys[0]]: v }));

    const uncovered = new Set<string>();
    for (let a = 0; a < keys.length; a++) {
        for (let b = a + 1; b < keys.length; b++) {
            for (let i = 0; i < space[keys[a]].length; i++) {
                for (let j = 0; j < space[keys[b]].length; j++) {
                    uncovered.add(pairKey(keys[a], i, keys[b], j));
                }
            }
        }
    }

    const rows: Combo[] = [];

    // How many uncovered pairs a candidate value adds, given the choices made so far.
    const gain = (k: number, v: number, chosen: number[]) => {
        let n = 0;
        for (let o = 0; o < keys.length; o++) {
            if (o === k || chosen[o] < 0) continue;
            const key = o < k ? pairKey(keys[o], chosen[o], keys[k], v) : pairKey(keys[k], v, keys[o], chosen[o]);
            if (uncovered.has(key)) n++;
        }
        return n;
    };

    while (uncovered.size > 0 && rows.length < cap) {
        // Seed the row with one uncovered pair so progress is guaranteed every iteration.
        const seed = uncovered.values().next().value as string;
        const [left, right] = seed.split('|');
        const [ka, ia] = left.split('=');
        const [kb, ib] = right.split('=');

        const chosen = keys.map(() => -1);
        chosen[keys.indexOf(ka)] = Number(ia);
        chosen[keys.indexOf(kb)] = Number(ib);

        for (let k = 0; k < keys.length; k++) {
            if (chosen[k] >= 0) continue;
            let best = 0;
            let bestGain = -1;
            for (let v = 0; v < space[keys[k]].length; v++) {
                const g = gain(k, v, chosen);
                if (g > bestGain) { bestGain = g; best = v; }
            }
            chosen[k] = best;
        }

        for (let a = 0; a < keys.length; a++) {
            for (let b = a + 1; b < keys.length; b++) uncovered.delete(pairKey(keys[a], chosen[a], keys[b], chosen[b]));
        }
        rows.push(Object.fromEntries(keys.map((k, i) => [k, space[k][chosen[i]]])));
    }

    return rows;
}
