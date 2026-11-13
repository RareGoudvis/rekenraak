import type { RekenvolgordeExercise } from '../../math/types';
import { isRekenvolgordeTokens, rekenvolgordeSteps, rekenvolgordeValue } from '../rekenvolgordeSteps';
import { defineCodec } from '../tutorCodec';

// Rekenvolgorde as its token list; the answer is worked out again on the tutor page, so a tampered QR can only show a wrong sum, never a wrong "klaar".
export const codec = defineCodec<RekenvolgordeExercise>({
    id: 'rv',
    typeIds: ['rekenvolgorde'],
    what: 'rekensom',
    out(ex) {
        const r = ex as RekenvolgordeExercise | undefined;
        return r && isRekenvolgordeTokens(r.tokens) && rekenvolgordeValue(r.tokens) === r.answer ? r.tokens : null;
    },
    in(wire) {
        if (!isRekenvolgordeTokens(wire)) return null;
        const answer = rekenvolgordeValue(wire);
        return answer === null ? null : { id: '', tokens: wire, answer, firstStep: 0, isManuallyEdited: false };
    },
    steps: rekenvolgordeSteps,
    sum: ex => ex.tokens.map(t => (typeof t === 'number' ? { t: 'num', v: t } : t === '(' ? { t: 'open' } : t === ')' ? { t: 'close' } : { t: 'op', op: t as '+' | '-' | 'x' | ':' })),
});
