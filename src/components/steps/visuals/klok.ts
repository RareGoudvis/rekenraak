import type { ClockExercise } from '../../../services/math/types';
import { defineStepsVisual } from '../stepsVisual';
import KlokBloemblaadjes from './KlokBloemblaadjes';

// The Oefenmodus card shows the clock as asked (or empty for tekenen), so the panel draws the counted one.
export const visual = defineStepsVisual<ClockExercise>({ typeIds: ['klok-kloklezen'], Visual: KlokBloemblaadjes });
