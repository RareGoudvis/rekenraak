import type { AfrondenExercise } from '../../../services/math/types';
import { defineStepsVisual } from '../stepsVisual';
import AfrondenLine from './AfrondenLine';

export const visual = defineStepsVisual<AfrondenExercise>({ typeIds: ['afronden'], Visual: AfrondenLine });
