import type { GetallenasExercise } from '../../math/types';
import { axisDecode, axisEncode, axisSum, getallenasSteps } from '../getallenasSteps';
import { defineCodec } from '../tutorCodec';

// A getallenrij travels like a getallenas (axisEncode); its own id so the page draws it as a row of vakjes.
export const codec = defineCodec<GetallenasExercise>({
    id: 'gr',
    typeIds: ['getallenrijen'],
    what: 'getallenrij',
    out: ex => axisEncode(ex as GetallenasExercise | undefined),
    in: axisDecode,
    steps: getallenasSteps,
    sum: axisSum,
});
