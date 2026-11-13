import type { ProcentExercise } from '../../math/types';
import { procentenSteps } from '../procentenSteps';
import { defineCodec } from '../tutorCodec';

// Procenten "nemen" as [percent, base]; "welk percent" has no steps, so it never travels.
const int = (v: unknown, max: number): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= max;

export const codec = defineCodec<ProcentExercise>({
    id: 'pc',
    typeIds: ['procenten'],
    what: 'procentensom',
    out(ex, c) {
        const p = ex as ProcentExercise | undefined;
        return p && (c.subType ?? 'nemen') === 'nemen' && procentenSteps(p) ? [p.percent, p.base] : null;
    },
    in(wire) {
        if (!Array.isArray(wire) || wire.length !== 2 || !int(wire[0], 100) || !int(wire[1], 1_000_000)) return null;
        const [percent, base] = wire as number[];
        if ((base * percent) % 100 !== 0) return null;
        return { id: '', percent, base, answer: (base * percent) / 100, isManuallyEdited: false };
    },
    steps: ex => procentenSteps(ex),
    sum: ex => [{ t: 'num', v: ex.percent }, { t: 'word', w: ' % van ' }, { t: 'num', v: ex.base }],
});
