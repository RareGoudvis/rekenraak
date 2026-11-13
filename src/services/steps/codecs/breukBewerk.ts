import type { BreukBewerkExercise } from '../../math/types';
import { breukBewerkSteps } from '../breukBewerkSteps';
import { defineCodec } from '../tutorCodec';

// Breuken bewerken: vereenvoudigen as ['v', t, n]; gelijknamig as ['g', t1, n1, t2, n2, common noemer].
// The answers are rebuilt from those numbers, so the steps never trust a hand-typed wire answer.
const MAX = 10_000;
const whole = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX;
const gcd = (x: number, y: number): number => (y ? gcd(y, x % y) : x);
const ex = (subType: BreukBewerkExercise['subType'], inputs: BreukBewerkExercise['inputs'], answers: BreukBewerkExercise['answers']): BreukBewerkExercise =>
    ({ id: '', subType, inputs, answers, isManuallyEdited: false });

export const codec = defineCodec<BreukBewerkExercise>({
    id: 'bb',
    typeIds: ['breuken-bewerken'],
    what: 'breuk',
    out(e) {
        const b = e as BreukBewerkExercise | undefined;
        if (!b || breukBewerkSteps(b) === null) return null;
        if (b.subType === 'vereenvoudigen') return ['v', b.inputs[0].n, b.inputs[0].d];
        return ['g', b.inputs[0].n, b.inputs[0].d, b.inputs[1].n, b.inputs[1].d, b.answers[0].d];
    },
    in(wire) {
        if (!Array.isArray(wire)) return null;
        const [kind, ...v] = wire;
        if (!v.every(whole)) return null;
        if (kind === 'v' && v.length === 2 && v[1] >= 2) {
            const [n, d] = v as number[];
            const g = gcd(n, d);
            const data = ex('vereenvoudigen', [{ n, d }], [{ n: n / g, d: d / g }]);
            return breukBewerkSteps(data) ? data : null;
        }
        if (kind === 'g' && v.length === 5) {
            const [n1, d1, n2, d2, L] = v as number[];
            const data = ex('gelijknamig', [{ n: n1, d: d1 }, { n: n2, d: d2 }], [{ n: n1 * (L / d1), d: L }, { n: n2 * (L / d2), d: L }]);
            return breukBewerkSteps(data) ? data : null;
        }
        return null;
    },
    steps: breukBewerkSteps,
    sum: b => (b.subType === 'gelijknamig'
        ? [{ t: 'frac', n: b.inputs[0].n, d: b.inputs[0].d }, { t: 'word', w: ' en ' }, { t: 'frac', n: b.inputs[1].n, d: b.inputs[1].d }]
        : [{ t: 'frac', n: b.inputs[0].n, d: b.inputs[0].d }]),
});
