import type { MathBlock, VergelijkenExercise, Fraction } from '../math/types';
import { getMaskPlaces } from '../math/mathEngine';

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Number respecting the optional place-value mask. decimalPlaces>0 → decimal (kommagetal);
// empty mask → free number in range.
function buildNumber(maxGetal: number, numberMask: Record<string, boolean>, decimalPlaces: number): number {
    const numberType = decimalPlaces > 0 ? 'decimal' : 'natural';
    const active = getMaskPlaces(maxGetal, numberType, decimalPlaces).filter(p => numberMask[p.key]);
    if (!active.length) {
        const scale = Math.pow(10, decimalPlaces);
        return Number((randInt(1, maxGetal * scale - 1) / scale).toFixed(decimalPlaces));
    }
    let n = 0;
    for (const p of active) n += randInt(1, 9) * p.weight;
    return Number(n.toFixed(decimalPlaces));
}

export function generateVergelijkenExercises(block: MathBlock): VergelijkenExercise[] {
    const subType: string = block.constraints.subType ?? 'getallen';
    const maxGetal: number = block.constraints.maxGetal ?? 1000;
    const numberMask: Record<string, boolean> = block.constraints.numberMask ?? {};
    const decimalPlaces: number = block.constraints.decimalPlaces ?? 0;
    const setSize: number = block.constraints.setSize ?? 4;
    const target: string = block.constraints.chooseTarget ?? 'grootste';
    const count = block.numberOfExercises || 6;
    const out: VergelijkenExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;

    // Representaties: two tienden/honderdsten values, each side rendered in a
    // teacher-chosen representation (breuk / kommagetal / plaatswaarde / woorden).
    // Non-breuk sides honour a place-value mask; a breuk side is a real fraction
    // (teller/noemer getalopbouw). Values are independent — compared numerically.
    const maxDp = Math.min(2, Math.max(1, decimalPlaces || 1));
    const leftRep: string = block.constraints.leftRep ?? 'breuk';
    const rightRep: string = block.constraints.rightRep ?? 'kommagetal';
    const leftMask: Record<string, boolean> = block.constraints.leftMask ?? {};
    const rightMask: Record<string, boolean> = block.constraints.rightMask ?? {};
    const buildRepMasked = (mask: Record<string, boolean>): number => {
        const dp = randInt(1, maxDp);
        const active = getMaskPlaces(maxGetal, 'decimal', dp).filter(p => mask[p.key]);
        if (!active.length) {
            const scale = Math.pow(10, dp);
            return Math.round(randInt(1, Math.max(1, maxGetal * scale - 1))) / scale;
        }
        // Build from the masked decimal places (each digit 1–9 × its weight).
        let n = 0;
        for (const p of active) n += randInt(1, 9) * p.weight;
        return Number(n.toFixed(maxDp));
    };
    // A breuk side → an actual fraction within the teller/noemer caps.
    const buildFrac = (maxN: number, maxD: number): Fraction => {
        const d = randInt(2, Math.max(2, maxD));
        const n = randInt(1, Math.max(1, maxN));
        return { n, d };
    };

    while (out.length < count && attempts < 20000) {
        attempts++;
        if (subType === 'representaties') {
            const buildSide = (rep: string, mask: Record<string, boolean>, fN: number, fD: number): { value: number; frac?: Fraction } => {
                if (rep === 'breuk') { const f = buildFrac(fN, fD); return { value: f.n / f.d, frac: f }; }
                return { value: buildRepMasked(mask) };
            };
            const left = buildSide(leftRep, leftMask, block.constraints.leftFracN ?? 4, block.constraints.leftFracD ?? 8);
            const right = buildSide(rightRep, rightMask, block.constraints.rightFracN ?? 4, block.constraints.rightFracD ?? 8);
            const key = `${left.value}|${left.frac?.n}/${left.frac?.d}|${right.value}|${right.frac?.n}/${right.frac?.d}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: Math.random().toString(36).substring(2, 9), a: left.value, b: right.value, aFrac: left.frac, bFrac: right.frac, isManuallyEdited: false });
        } else if (subType === 'kiezen') {
            const nums = new Set<number>();
            let g = 0;
            while (nums.size < setSize && g++ < setSize * 40) nums.add(buildNumber(maxGetal, numberMask, decimalPlaces));
            if (nums.size < setSize) continue;
            const numbers = [...nums];
            const key = numbers.join(',');
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: Math.random().toString(36).substring(2, 9), numbers, target, isManuallyEdited: false });
        } else {
            const a = buildNumber(maxGetal, numberMask, decimalPlaces);
            // ~15% equal pairs so '=' shows up too
            const b = Math.random() < 0.15 ? a : buildNumber(maxGetal, numberMask, decimalPlaces);
            const key = `${a}|${b}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: Math.random().toString(36).substring(2, 9), a, b, isManuallyEdited: false });
        }
    }
    return out;
}
