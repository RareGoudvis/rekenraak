import type { ComponentType } from 'react';
import type { StepLine } from '../../services/math/workedSteps';

// A picture above a type's worked steps (the clock, a getallenas, the groups of t/n van g) that follows
// the steps as the pupil reveals them, in the Oefenmodus steps panel and on the stappenhulp page alike.
// Light on purpose: the tutor bundle imports every visual, so a visual never imports REGISTRY or a generator.
export interface StepsVisualProps<D = unknown> {
    // Oefenmodus: the exercise itself; stappenhulp: what the type's tutor codec decoded (the same shape).
    data: D;
    lines: StepLine[];
    // lines.slice(0, revealed) are shown with their answer (question steps: the questions answered so far).
    revealed: number;
}

// What the page knows about the pupil: the leerjaar (kiosk session, tutor payload) and the MAB toggle.
export interface StepsVisualContext {
    grade?: number;
    noMab?: boolean;
}

export interface StepsVisual<D = unknown> {
    typeIds: readonly string[];
    Visual: ComponentType<StepsVisualProps<D>>;
    // false: the stappenhulp only, because the Oefenmodus card draws this itself (the descriptor's solution).
    kiosk?: boolean;
    // false: no visual for this exercise here, so no empty .steps-visual box either (absent = always applies).
    applies?: (data: D, lines: StepLine[], ctx: StepsVisualContext) => boolean;
    // Oefenmodus: 'card' draws it big under the exercise (the card is idle during the steps), the lines stay in the panel.
    // Absent = 'panel', above the lines. The stappenhulp always draws it above the lines.
    kioskSlot?: 'panel' | 'card';
}

export const defineStepsVisual = <D>(visual: StepsVisual<D>): StepsVisual => visual as unknown as StepsVisual;
