import type { FractionExercise } from '../../../services/math/types';
import { defineStepsVisual } from '../stepsVisual';
import HoeveelheidGroups from './HoeveelheidGroups';

// The Oefenmodus card draws the groups itself after a fout (BREUKEN_KIOSK solution), so the panel does not repeat them.
export const visual = defineStepsVisual<FractionExercise>({ typeIds: ['breuken'], Visual: HoeveelheidGroups, kiosk: false });
