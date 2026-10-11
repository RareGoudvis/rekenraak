import type { MathBlock, VergelijkenExercise, Fraction } from '../math/types';
import { getMaskPlaces } from '../math/mathEngine';
import type { VergelijkenConstraints } from '../math/constraintTypes';

// Representaties: the share of equal pairs, so "=" is a real answer (getallen uses ~15 %).
const EQUAL_SHARE = 0.2;

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Number respecting the optional place-value mask. decimalPlaces>0 → decimal (kommagetal);
// empty mask → free number in range.
function buildNumber(maxGetal: number, numberMask: Record<string, boolean>, decimalPlaces: number): number {
    const numberType = decimalPlaces > 0 ? 'decimal' : 'natural';
    const active = getMaskPlaces(maxGetal, numberType, decimalPlaces).filter(p => numberMask[p.key]);
    const scale = Math.pow(10, decimalPlaces);
    const freeNumber = () => Number((randInt(1, maxGetal * scale - 1) / scale).toFixed(decimalPlaces));
    if (!active.length) return freeNumber();
    // A masked place can carry digit 1-9, so a top place at/near maxGetal can overshoot
    // (mask {D} at maxGetal 1000 → 1000-9000). Retry until in range; only an impossible
    // mask (min masked value already > maxGetal) falls back to a free in-range number.
    for (let tries = 0; tries < 200; tries++) {
        let n = 0;
        for (const p of active) n += randInt(1, 9) * p.weight;
        const v = Number(n.toFixed(decimalPlaces));
        if (v <= maxGetal) return v;
    }
    return freeNumber();
}

export function generateVergelijkenExercises(block: MathBlock): VergelijkenExercise[] {
    const c = block.constraints as VergelijkenConstraints;
    const subType: string = c.subType ?? 'getallen';
    const maxGetal: number = c.maxGetal ?? 1000;
    const numberMask: Record<string, boolean> = c.numberMask ?? {};
    const decimalPlaces: number = c.decimalPlaces ?? 0;
    const setSize: number = c.setSize ?? 3;
    const target: string = c.chooseTarget ?? 'grootste';
    const count = block.numberOfExercises || 6;
    const out: VergelijkenExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    let setMisses = 0;

    // Representaties: two tienden/honderdsten values, each side rendered in a
    // teacher-chosen representation (breuk / kommagetal / plaatswaarde / woorden).
    // Non-breuk sides honour a place-value mask; a breuk side is a real fraction
    // (teller/noemer getalopbouw). Values are independent — compared numerically.
    const maxDp = Math.min(2, Math.max(1, decimalPlaces || 1));
    const leftRep: string = c.leftRep ?? 'breuk';
    const rightRep: string = c.rightRep ?? 'kommagetal';
    const leftMask: Record<string, boolean> = c.leftMask ?? {};
    const rightMask: Record<string, boolean> = c.rightMask ?? {};
    const buildRepMasked = (mask: Record<string, boolean>): number => {
        const dp = randInt(1, maxDp);
        const active = getMaskPlaces(maxGetal, 'decimal', dp).filter(p => mask[p.key]);
        if (!active.length) {
            const scale = Math.pow(10, dp);
            return Math.round(randInt(1, Math.max(1, maxGetal * scale - 1))) / scale;
        }
        // Build from the masked decimal places (each digit 1–9 × its weight). The top place
        // can weigh as much as maxGetal, so retry until the value fits (same rule as buildNumber).
        for (let tries = 0; tries < 200; tries++) {
            let n = 0;
            for (const p of active) n += randInt(1, 9) * p.weight;
            const v = Number(n.toFixed(maxDp));
            if (v <= maxGetal) return v;
        }
        // Impossible mask (smallest masked value already > maxGetal): free in-range number.
        const scale = Math.pow(10, dp);
        return Math.round(randInt(1, Math.max(1, maxGetal * scale - 1))) / scale;
    };
    // The decimals a non-whole value needs within maxDp (0,4 → 1; 1/3 or 2 → null).
    const decimalsOf = (v: number): number | null => {
        for (let dp = 1; dp <= maxDp; dp++) {
            const scaled = v * 10 ** dp;
            if (Math.abs(scaled - Math.round(scaled)) < 1e-9) return Number.isInteger(Math.round(v * 1e9) / 1e9) ? null : dp;
        }
        return null;
    };
    // A kommagetal near `anchor`: its exact value (when `equal` and it has one), else the same whole
    // part with other decimals, never a whole number.
    const nearValue = (anchor: number, equal: boolean): number => {
        const dpEq = decimalsOf(anchor);
        if (equal && dpEq !== null) return Number(anchor.toFixed(dpEq));
        const dp = randInt(1, maxDp);
        const scale = 10 ** dp;
        // An anchor at the max itself (a masked 10 at max 10) gets its partner just under it.
        const whole = Math.min(Math.floor(anchor + 1e-9), Math.max(0, Math.ceil(maxGetal) - 1));
        let v = whole + 1 / scale;
        for (let t = 0; t < 20; t++) {
            v = Number((whole + randInt(1, scale - 1) / scale).toFixed(dp));
            if (Math.abs(v - anchor) > 1e-9) break;
        }
        return v;
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
            let left: { value: number; frac?: Fraction }, right: { value: number; frac?: Fraction };
            if (leftRep === 'breuk' && rightRep === 'breuk') {
                // Two breuken under the same teller/noemer caps already share one range.
                left = buildSide(leftRep, leftMask, c.leftFracN ?? 4, c.leftFracD ?? 8);
                right = buildSide(rightRep, rightMask, c.rightFracN ?? 4, c.rightFracD ?? 8);
            } else {
                // Independent sides put a breuk under 2 against 0,1–9,9: "<" nearly always (kiosk triage
                // 2026-10-10). The breuk side (else the left) is the anchor; the other side gets its whole
                // part, and EQUAL_SHARE of the pairs its exact value, so <, = and > all occur.
                const anchorLeft = leftRep === 'breuk' || rightRep !== 'breuk';
                const drawAnchor = () => (anchorLeft
                    ? buildSide(leftRep, leftMask, c.leftFracN ?? 4, c.leftFracD ?? 8)
                    : buildSide(rightRep, rightMask, c.rightFracN ?? 4, c.rightFracD ?? 8));
                const equal = Math.random() < EQUAL_SHARE;
                let anchor = drawAnchor();
                // An equal pair needs an anchor with a tienden / honderdsten form (2/5, not 1/3).
                for (let t = 0; equal && t < 40 && decimalsOf(anchor.value) === null; t++) anchor = drawAnchor();
                const otherMask = anchorLeft ? rightMask : leftMask;
                // A teacher's getalopbouw on the other side still decides its digits.
                const other = { value: Object.values(otherMask).some(Boolean) ? buildRepMasked(otherMask) : nearValue(anchor.value, equal) };
                [left, right] = anchorLeft ? [anchor, other] : [other, anchor];
            }
            const key = `${left.value}|${left.frac?.n}/${left.frac?.d}|${right.value}|${right.frac?.n}/${right.frac?.d}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: Math.random().toString(36).substring(2, 9), a: left.value, b: right.value, aFrac: left.frac, bFrac: right.frac, isManuallyEdited: false });
        } else if (subType === 'kiezen') {
            const nums = new Set<number>();
            let g = 0;
            while (nums.size < setSize && g++ < setSize * 40) nums.add(buildNumber(maxGetal, numberMask, decimalPlaces));
            if (nums.size < setSize) {
                // A mask with fewer numbers than setSize (top place at the max: only 1 000 000) never fills a set; stop, don't spin 20 000 times.
                if (++setMisses >= 50) break;
                continue;
            }
            setMisses = 0;
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
