import type { MathBlock, ControleExercise } from '../math/types';
import type { ControlerenConstraints } from '../math/constraintTypes';

// Controleren — negenproef (digit-root cross for a worked ×) or omgekeerde bewerking.
// Planted wrong answers must stay CATCHABLE: for negenproef the error may never be
// a multiple of 9, or the proef would wrongly pass.

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

// Negenrest = digit root (mod 9), with 9 shown as 0 per the classic school notation.
export function negenrest(n: number): number {
    return n % 9;
}

export function generateControleExercises(block: MathBlock): ControleExercise[] {
    const c = block.constraints as ControlerenConstraints;
    const subType: string = c.subType ?? 'negenproef';
    const operators: ('+' | '-' | 'x')[] = subType === 'negenproef' ? ['x'] : (c.operators ?? ['+', '-']);
    const maxGetal: number = c.maxGetal ?? 1000;
    // Share of rows with a planted wrong answer: 'geen' | 'helft' | 'alles'.
    const foutAandeel: string = c.foutAandeel ?? 'helft';
    const count = block.numberOfExercises || 4;

    const out: ControleExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const operator = pick(operators);
        let a: number, b: number;
        // The RESULT of the bewerking stays ≤ maxGetal (the picker's promise), so operands are drawn under what is left.
        if (operator === 'x') {
            // Cijferen-style: multi-digit × two-digit; for a tiny max it degrades to a single-digit factor.
            let bLo = 12, bHi = Math.min(99, Math.floor(maxGetal / 10));
            if (bHi < bLo) { bLo = 2; bHi = Math.min(9, Math.floor(maxGetal / 2)); }
            if (bHi < bLo) continue;
            b = randInt(bLo, bHi);
            const aMax = Math.floor(maxGetal / b);
            const aMin = Math.min(aMax, Math.max(bLo === 12 ? 10 : 2, Math.floor(aMax / 4)));
            a = randInt(aMin, aMax);
            // A round first factor (10 × 97) teaches nothing for the proef; redraw while the range has room.
            if (bLo === 12) {
                for (let r = 0; r < 20 && a % 10 === 0; r++) a = randInt(aMin, aMax);
                if (a % 10 === 0) continue;
            }
        } else if (operator === '+') {
            if (maxGetal < 8) continue;
            a = randInt(Math.floor(maxGetal / 4), Math.floor((maxGetal * 3) / 4));
            b = randInt(2, maxGetal - a);
        } else {
            a = randInt(Math.floor(maxGetal / 4), maxGetal);
            b = randInt(2, a - 1);
        }
        const correctAnswer = operator === 'x' ? a * b : operator === '+' ? a + b : a - b;
        const wantWrong = foutAandeel === 'alles' || (foutAandeel === 'helft' && out.length % 2 === 1);
        let shownAnswer = correctAnswer;
        if (wantWrong) {
            // Small plausible slips; reroll until the delta is not ≡ 0 (mod 9).
            for (let t = 0; t < 50; t++) {
                const delta = pick([10, -10, 100, -100, 1, -1, 20, -20]);
                if (delta % 9 === 0) continue;
                if (correctAnswer + delta > 0 && correctAnswer + delta <= maxGetal) { shownAnswer = correctAnswer + delta; break; }
            }
            if (shownAnswer === correctAnswer) continue;
        }
        const key = `${a}${operator}${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ id: Math.random().toString(36).substring(2, 9), a, b, operator, shownAnswer, correctAnswer, isManuallyEdited: false });
    }
    return out;
}
