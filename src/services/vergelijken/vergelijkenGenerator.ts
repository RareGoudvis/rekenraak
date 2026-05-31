import type { MathBlock, VergelijkenExercise } from '../math/types';
import { getMaskPlaces } from '../math/mathEngine';

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Number respecting the optional place-value mask; empty mask → free in [1, maxGetal].
function buildNumber(maxGetal: number, numberMask: Record<string, boolean>): number {
    const active = getMaskPlaces(maxGetal, 'natural').filter(p => numberMask[p.key]);
    if (!active.length) return randInt(1, maxGetal);
    let n = 0;
    for (const p of active) n += randInt(1, 9) * p.weight;
    return n > maxGetal ? randInt(1, maxGetal) : n;
}

export function generateVergelijkenExercises(block: MathBlock): VergelijkenExercise[] {
    const subType: string = block.constraints.subType ?? 'getallen';
    const maxGetal: number = block.constraints.maxGetal ?? 1000;
    const numberMask: Record<string, boolean> = block.constraints.numberMask ?? {};
    const setSize: number = block.constraints.setSize ?? 4;
    const target: string = block.constraints.chooseTarget ?? 'grootste';
    const count = block.numberOfExercises || 6;
    const out: VergelijkenExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;

    while (out.length < count && attempts < 20000) {
        attempts++;
        if (subType === 'kiezen') {
            const nums = new Set<number>();
            let g = 0;
            while (nums.size < setSize && g++ < setSize * 40) nums.add(buildNumber(maxGetal, numberMask));
            if (nums.size < setSize) continue;
            const numbers = [...nums];
            const key = numbers.join(',');
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: Math.random().toString(36).substring(2, 9), numbers, target, isManuallyEdited: false });
        } else {
            const a = buildNumber(maxGetal, numberMask);
            // ~15% equal pairs so '=' shows up too
            const b = Math.random() < 0.15 ? a : buildNumber(maxGetal, numberMask);
            const key = `${a}|${b}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: Math.random().toString(36).substring(2, 9), a, b, isManuallyEdited: false });
        }
    }
    return out;
}
