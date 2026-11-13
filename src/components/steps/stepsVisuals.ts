import { createElement, type ReactNode } from 'react';
import type { StepLine } from '../../services/math/workedSteps';
import type { StepsVisual, StepsVisualContext } from './stepsVisual';

// The steps visual registry; a type's visual is one file in ./visuals (contract: stepsVisual.ts).
// Every .ts file in ./visuals exporting `visual` registers itself, so adding a type never edits a shared list.
const modules = import.meta.glob<{ visual: StepsVisual }>('./visuals/*.ts', { eager: true });

export const STEPS_VISUALS: readonly StepsVisual[] = Object.values(modules).map(m => m.visual).filter(Boolean);

const byType = new Map(STEPS_VISUALS.flatMap(v => v.typeIds.map(t => [t, v] as const)));

// `slot` says where Oefenmodus draws it (StepsVisual.kioskSlot); absent = 'panel', and the stappenhulp always gets 'panel'.
export type RenderStepsVisual = ((revealed: number) => ReactNode) & { slot?: 'panel' | 'card' };

// The slot's renderer for one exercise, or undefined when its type has no visual there.
export function stepsVisualFor(typeIds: string | readonly string[], data: unknown, lines: StepLine[], where: 'kiosk' | 'tutor', ctx: StepsVisualContext = {}): RenderStepsVisual | undefined {
    const visual = (typeof typeIds === 'string' ? [typeIds] : typeIds).map(t => byType.get(t)).find(Boolean);
    if (!visual || (where === 'kiosk' && visual.kiosk === false)) return undefined;
    if (visual.applies && !visual.applies(data, lines, ctx)) return undefined;
    const render = (revealed: number) => createElement('div', { className: 'steps-visual' }, createElement(visual.Visual, { data, lines, revealed }));
    return Object.assign(render, { slot: where === 'kiosk' ? visual.kioskSlot ?? 'panel' : 'panel' } as const);
}
