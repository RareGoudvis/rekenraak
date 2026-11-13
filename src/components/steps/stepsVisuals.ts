import { createElement, type ReactNode } from 'react';
import type { StepLine } from '../../services/math/workedSteps';
import type { StepsVisual } from './stepsVisual';

// The steps visual registry; a type's visual is one file in ./visuals (contract: stepsVisual.ts).
// Every .ts file in ./visuals exporting `visual` registers itself, so adding a type never edits a shared list.
const modules = import.meta.glob<{ visual: StepsVisual }>('./visuals/*.ts', { eager: true });

export const STEPS_VISUALS: readonly StepsVisual[] = Object.values(modules).map(m => m.visual).filter(Boolean);

const byType = new Map(STEPS_VISUALS.flatMap(v => v.typeIds.map(t => [t, v] as const)));

export type RenderStepsVisual = (revealed: number) => ReactNode;

// The slot's renderer for one exercise, or undefined when its type has no visual there.
export function stepsVisualFor(typeIds: string | readonly string[], data: unknown, lines: StepLine[], where: 'kiosk' | 'tutor'): RenderStepsVisual | undefined {
    const visual = (typeof typeIds === 'string' ? [typeIds] : typeIds).map(t => byType.get(t)).find(Boolean);
    if (!visual || (where === 'kiosk' && visual.kiosk === false)) return undefined;
    return revealed => createElement('div', { className: 'steps-visual' }, createElement(visual.Visual, { data, lines, revealed }));
}
