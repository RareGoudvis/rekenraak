import type { ProcentExercise } from '../math/types';
import type { StepLine, StepToken } from '../math/workedSteps';

// Procenten ("25 % van 80"): a mental method per percentage, Op.stap style: 10 % = a tiende, 25 % = a vierde, 50 % = de helft.
// Only "nemen" has a method; "welk percent" and any percentage without a handle return null.

const num = (v: number): StepToken => ({ t: 'num', v });
const word = (w: string): StepToken => ({ t: 'word', w });
const calc = (x: number, o: ':' | 'x', y: number, r: number): StepToken[] => [num(x), { t: 'op', op: o }, num(y), { t: 'eq' }, num(r)];
const line = (kind: string, tokens: StepToken[]): StepLine => ({ kind: `pct.${kind}`, basis: true, aside: true, tokens });

// Fractions a child knows by heart; the value is the number of equal parts.
const DEEL: Record<number, number> = { 1: 100, 20: 5, 25: 4 };

export function procentenSteps(ex: ProcentExercise | undefined, c: Record<string, unknown> = {}): StepLine[] | null {
    if (!ex || (c.subType ?? 'nemen') !== 'nemen') return null;
    const { percent: p, base: b } = ex;
    if (![p, b].every(v => Number.isInteger(v) && v >= 1 && v <= 1_000_000) || p > 100 || (b * p) % 100 !== 0 || ex.answer !== (b * p) / 100) return null;
    const closing = line('klaar', [num(p), word(' % van '), num(b), { t: 'eq' }, num(ex.answer)]);
    if (p === 100) return [line('geheel', [num(100), word(' % is het hele getal')]), closing];
    if (p === 50) return [line('helft', [num(50), word(' % = de helft')]), line('reken', calc(b, ':', 2, b / 2)), closing];
    const n = DEEL[p];
    if (n) {
        return [line('breuk', [num(p), word(' % = '), { t: 'frac', n: 1, d: n }]), line('reken', calc(b, ':', n, b / n)), closing];
    }
    if (p === 75) {
        const part = b / 4;
        return [line('breuk', [num(75), word(' % = '), { t: 'frac', n: 3, d: 4 }]), line('een', calc(b, ':', 4, part)), line('keer', calc(3, 'x', part, 3 * part)), closing];
    }
    const tien = b / 10;
    if (p === 10) return [line('breuk', [num(10), word(' % = '), { t: 'frac', n: 1, d: 10 }]), line('reken', calc(b, ':', 10, tien)), closing];
    if (!Number.isInteger(tien)) return null;
    if (p === 5) return [line('tien', [num(10), word(' % van '), num(b), { t: 'eq' }, ...calc(b, ':', 10, tien)]), line('helft', [num(5), word(' % = de helft van 10 %: '), ...calc(tien, ':', 2, tien / 2)]), closing];
    if (p % 10 === 0) {
        const k = p / 10;
        return [line('tien', [num(10), word(' % van '), num(b), { t: 'eq' }, ...calc(b, ':', 10, tien)]), line('keer', [num(p), word(' % = '), num(k), word(' × 10 %: '), ...calc(k, 'x', tien, k * tien)]), closing];
    }
    return null;
}
