import { createElement } from 'react';
import type { GetallenasExercise } from '../../../services/math/types';
import { defineStepsVisual } from '../stepsVisual';
import JumpRow from './JumpRow';

export const visual = defineStepsVisual<GetallenasExercise>({ typeIds: ['getallenas'], Visual: props => createElement(JumpRow, { ...props, look: 'as' }) });
