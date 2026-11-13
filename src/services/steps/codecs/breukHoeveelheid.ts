import { breukHoeveelheidSteps } from '../../math/workedSteps';
import type { FractionExercise } from '../../math/types';
import { defineCodec } from '../tutorCodec';

// Breuk van een hoeveelheid (t/n van g) as [t, n, g]; before the codecs it travelled as ['h', t, n, g],
// which tutorPayload still decodes into this codec.
const MAX = 100_000;
const whole = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX;

export const codec = defineCodec<FractionExercise>({
    id: 'h',
    typeIds: ['breuken'],
    what: 'breuk',
    out(ex) {
        const f = ex as FractionExercise | undefined;
        return f?.subType === 'hoeveelheid' && [f.numerator, f.denominator, f.total].every(whole) ? [f.numerator, f.denominator, f.total] : null;
    },
    in(wire) {
        if (!Array.isArray(wire) || wire.length !== 3 || !wire.every(whole)) return null;
        const [t, n, g] = wire as number[];
        return { id: '', subType: 'hoeveelheid', numerator: t, denominator: n, total: g, isManuallyEdited: false };
    },
    steps: breukHoeveelheidSteps,
    sum: ex => [{ t: 'frac', n: ex.numerator, d: ex.denominator }, { t: 'word', w: ' van ' }, { t: 'num', v: ex.total ?? 0 }],
});
