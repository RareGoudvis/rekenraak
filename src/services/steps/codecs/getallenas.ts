import type { GetallenasExercise } from '../../math/types';
import { axisDecode, axisEncode, axisSum, getallenasSteps } from '../getallenasSteps';
import { defineCodec } from '../tutorCodec';

// A getallenas as [values, blanks, jumps?] (see axisEncode); its own id so the page draws it as a line.
export const codec = defineCodec<GetallenasExercise>({
    id: 'ga',
    typeIds: ['getallenas'],
    what: 'getallenas',
    out: ex => axisEncode(ex as GetallenasExercise | undefined),
    in: axisDecode,
    steps: getallenasSteps,
    sum: axisSum,
});
