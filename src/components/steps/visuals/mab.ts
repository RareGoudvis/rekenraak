import type { Equation } from '../../../services/math/types';
import { MAB_TYPE_IDS, mabAllowed, mabPlan } from '../../../services/steps/mabSteps';
import { defineStepsVisual } from '../stepsVisual';
import MabSteps from './MabSteps';

// MAB level A on every hoofdrekenen typeId: leerjaar 1–3, the toggle on, whole numbers up to 1000 (mabSteps.ts).
export const visual = defineStepsVisual<Equation>({
    typeIds: MAB_TYPE_IDS,
    Visual: MabSteps,
    applies: (data, lines, ctx) => mabAllowed(ctx) && mabPlan(data, lines) !== null,
});
