// Which pills a quick-block row really offers for one block: a pill must never write a value
// the block's other settings rule out (a mask HTE − TE under "Tot welk getal? 100" gives nothing).

import { REGISTRY } from './exerciseRegistry';
import type { QuickOption, QuickPills } from './quickSettings';
import type { MathBlock } from '../services/math/types';

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Fixed seed: the same block always shows the same pills, in the app and in the sweep test.
function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// True when the block, with this one value written, still generates at least one exercise.
export function yieldsExercises(block: MathBlock, key: string, value: unknown): boolean {
    const row = REGISTRY[block.typeId];
    if (!row || row.isFurniture) return true;
    const probe = { ...block, numberOfExercises: 1, constraints: { ...(block.constraints ?? {}), [key]: value } } as MathBlock;
    const real = Math.random;
    Math.random = seeded(1);
    try {
        return row.generate(probe).length > 0;
    } catch {
        return false;
    } finally {
        Math.random = real;
    }
}

// The row's own option rules first, then the generator; the value the block holds now always stays.
export function offeredOptions(block: MathBlock, spec: QuickPills): QuickOption[] {
    const c = (block.constraints ?? {}) as Record<string, unknown>;
    const current = c[spec.key] ?? spec.fallback;
    return spec.options.filter(o => sameValue(current, o.value)
        || ((!o.when || o.when(c)) && yieldsExercises(block, spec.key, o.value)));
}
