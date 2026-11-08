import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import type { MathBlock } from '../../../../services/math/types';
import { distinctJumps, r6 } from '../../../../services/getallenas/jumps';

type JumpBag = { step?: number; jumps?: number[]; numberType?: string };

// The jumps shown as selected: the 2+ distinct `jumps`, else the one `step` (default 5, as the generators read it).
export function chosenJumps(c: JumpBag): number[] {
    const many = distinctJumps(c);
    return many.length ? many : [c.step ?? 5];
}

// Click order is kept: step is the first chosen, and per-rij rotates through the list in that order.
export function nextJumps(current: number[], j: number): number[] {
    const has = current.some(x => r6(x) === r6(j));
    if (!has) return [...current, j];
    return current.length <= 1 ? current : current.filter(x => r6(x) !== r6(j));
}

export const addJump = (current: number[], j: number): number[] =>
    current.some(x => r6(x) === r6(j)) ? current : [...current, j];

// Writes step (always valid) and `jumps` only for 2+; one jump drops both extra keys so single-jump blocks stay byte-identical.
export function applyJumps(constraints: Record<string, unknown>, list: number[]): Record<string, unknown> {
    const { jumps: _jumps, jumpMode, ...rest } = constraints;
    void _jumps;
    if (list.length < 2) return { ...rest, step: list[0] };
    return { ...rest, ...(jumpMode !== undefined ? { jumpMode } : {}), step: list[0], jumps: list };
}

export function useSetJumps(block: MathBlock): (list: number[]) => void {
    const updateBlockSettings = useWorksheetStore((s) => s.updateBlockSettings);
    return (list) => updateBlockSettings(block.id, { constraints: applyJumps(block.constraints as Record<string, unknown>, list) as never });
}
