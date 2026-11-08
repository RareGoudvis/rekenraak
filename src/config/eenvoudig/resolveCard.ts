import { flattenLeaves } from '../appstructure';
import { DEFAULT_BASE, seedConstraints, type BaseSettings } from '../baseSettings';
import { GRADE_PRESETS } from '../gradePresets';
import { resolveInstruction } from '../instructionPresets';
import { REGISTRY } from '../exerciseRegistry';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import type { CardVariant } from './cards';

export interface ResolvedCard {
    typeId: string;
    label: string;
    leafId: string;
    instruction: string;
    constraints: Record<string, unknown>;
    count: number;
}

let leaves: Map<string, ReturnType<typeof flattenLeaves>[number]> | null = null;

// A card is the same block for every teacher: it seeds from its OWN leerjaar preset,
// never from the Basisinstellingen or the leerjaar picked in the app.
export function resolveCard(v: CardVariant): ResolvedCard {
    leaves ??= new Map(flattenLeaves().map(l => [l.id, l]));
    const leaf = leaves.get(v.leafId);
    if (!leaf) throw new Error(`Eenvoudig card ${v.id}: unknown leaf ${v.leafId}`);
    const base: BaseSettings = { ...DEFAULT_BASE, ...GRADE_PRESETS[v.lj] };
    const constraints = seedConstraints({
        typeId: leaf.typeId,
        base,
        override: { ...(leaf.defaultConstraints ?? {}), ...v.ov },
        grade: v.lj,
        leafId: leaf.id,
    });
    return {
        typeId: leaf.typeId,
        label: v.label,
        leafId: leaf.id,
        instruction: resolveInstruction(leaf.instruction, leaf.typeId, leaf.label, constraints as BlockConstraints),
        constraints,
        count: v.count ?? leaf.defaultCount ?? REGISTRY[leaf.typeId]?.defaultCount ?? 10,
    };
}
