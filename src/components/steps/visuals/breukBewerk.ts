import type { BreukBewerkExercise } from '../../../services/math/types';
import { defineStepsVisual } from '../stepsVisual';
import BreukLijsten from './BreukLijsten';

export const visual = defineStepsVisual<BreukBewerkExercise>({ typeIds: ['breuken-bewerken'], Visual: BreukLijsten });
