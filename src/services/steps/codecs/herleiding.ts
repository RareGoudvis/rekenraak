import type { HerleidingExercise, HerleidingPart } from '../../math/types';
import { herleidingSteps } from '../herleidingSteps';
import { defineCodec } from '../tutorCodec';

// Herleidingen as ['n' | 'u', [[unit, value], …] given, [[unit, value], …] asked]: n = the number is asked,
// u = the unit. The format follows from the part counts; the steps need nothing else.
type WirePart = [string, number];
const partsOut = (ps: HerleidingPart[]): WirePart[] => ps.map(p => [p.key, p.value]);
const partsIn = (w: unknown): HerleidingPart[] | null => {
    if (!Array.isArray(w) || w.length < 1 || w.length > 7) return null;
    const ok = w.every(p => Array.isArray(p) && p.length === 2 && typeof p[0] === 'string' && p[0].length <= 4 && typeof p[1] === 'number' && Number.isFinite(p[1]));
    return ok ? (w as WirePart[]).map(([key, value]) => ({ key, value })) : null;
};
const formatOf = (from: number, to: number, blank: 'number' | 'unit'): HerleidingExercise['format'] =>
    (from > 1 ? 'samengesteld-enkel' : to > 1 ? 'enkel-samengesteld' : blank === 'unit' ? 'enkel-eenheid' : 'enkel-getal');

export const codec = defineCodec<HerleidingExercise>({
    id: 'hl',
    typeIds: ['herleidingen'],
    what: 'herleiding',
    out(e) {
        const ex = e as HerleidingExercise | undefined;
        if (!ex || herleidingSteps(ex) === null) return null;
        return [ex.blank === 'unit' ? 'u' : 'n', partsOut(ex.fromParts), partsOut(ex.toParts)];
    },
    in(wire) {
        if (!Array.isArray(wire) || wire.length !== 3 || (wire[0] !== 'n' && wire[0] !== 'u')) return null;
        const fromParts = partsIn(wire[1]), toParts = partsIn(wire[2]);
        if (!fromParts || !toParts) return null;
        const blank = wire[0] === 'u' ? 'unit' : 'number';
        const ex: HerleidingExercise = { id: '', format: formatOf(fromParts.length, toParts.length, blank), fromParts, toParts, blank, isManuallyEdited: false };
        return herleidingSteps(ex) ? ex : null;
    },
    steps: herleidingSteps,
    // As printed: the asked number or unit is a "?".
    sum: ex => [
        ...ex.fromParts.flatMap((p, i) => [...(i ? [{ t: 'word', w: ' ' } as const] : []), { t: 'num', v: p.value } as const, { t: 'word', w: ` ${p.key}` } as const]),
        { t: 'eq' },
        ...(ex.blank === 'unit'
            ? [{ t: 'num', v: ex.toParts[0].value } as const, { t: 'word', w: ' ?' } as const]
            : ex.toParts.flatMap((p, i) => [{ t: 'word', w: `${i ? ' ' : ''}? ${p.key}` } as const])),
    ],
});
