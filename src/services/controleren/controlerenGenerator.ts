import type { MathBlock, ControleExercise } from '../math/types';

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
    const c = block.constraints;
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
        if (operator === 'x') {
            // Cijferen-style: 3-digit × 2-digit scaled to maxGetal.
            a = randInt(Math.floor(maxGetal / 10), maxGetal);
            b = randInt(12, 99);
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
                if (correctAnswer + delta > 0) { shownAnswer = correctAnswer + delta; break; }
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
