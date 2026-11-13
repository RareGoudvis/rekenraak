import type { HerleidingExercise } from '../../../services/math/types';
import { defineStepsVisual } from '../stepsVisual';
import HerleidingsTabel from './HerleidingsTabel';

export const visual = defineStepsVisual<HerleidingExercise>({ typeIds: ['herleidingen'], Visual: HerleidingsTabel });
