import { LEAF_BY_ID } from '../../config/appstructure';
import { resolveInstruction } from '../../config/instructionPresets';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import type { MathBlock } from '../../services/math/types';
import { kioskSupports } from '../../services/oefenen/kiosk';
import { sessieRowWire } from '../../services/oefenen/session';
import type { OefenType } from '../../services/oefenen/types';
import { listOefenLeaves, rowLabelOf, rowYields, withKioskSeed, type OefenLeaf } from '../oefenen/oefenBuild';

// The block → Oefenmodus row the stappenhulp QR carries for "Nog meer van deze oefening": the same
// type, leaf and settings a teacher would get by adding this block's settings as a builder row.

let leavesByType: Map<string, OefenLeaf[]> | null = null;
function kioskLeavesOf(typeId: string): OefenLeaf[] {
    if (!leavesByType) {
        leavesByType = new Map();
        for (const l of listOefenLeaves()) leavesByType.set(l.typeId, [...(leavesByType.get(l.typeId) ?? []), l]);
    }
    return leavesByType.get(typeId) ?? [];
}

// The block's own leaf when the kiosk has it, else the type's leaf whose defaults the block still holds (natuurlijk vs kommagetallen).
function leafOf(block: MathBlock): OefenLeaf | null {
    const leaves = kioskLeavesOf(block.typeId);
    const c = block.constraints as Record<string, unknown>;
    const holds = (l: OefenLeaf) => Object.entries(LEAF_BY_ID[l.id]?.defaultConstraints ?? {}).every(([k, v]) => JSON.stringify(c[k]) === JSON.stringify(v));
    return leaves.find(l => l.id === block.leafId) ?? leaves.find(holds) ?? leaves[0] ?? null;
}

/** The block as one Oefenmodus type, or null when the kiosk cannot practise these settings (the builder's two checks). */
export function tutorOefenType(block: MathBlock): OefenType | null {
    const leaf = leafOf(block);
    if (!leaf) return null;
    // The kiosk's own start on top (klok in woorden, plaats shuffled), as a builder row starts.
    const constraints = withKioskSeed(block.typeId, block.constraints as Record<string, unknown>);
    if (!kioskSupports(block.typeId, constraints)) return null;
    const row = { leaf, constraints };
    if (!rowYields(row)) return null;
    return {
        typeId: leaf.typeId, leafId: leaf.id, label: rowLabelOf(row),
        // The kiosk's default opdracht, frozen as buildSessie does (the sheet's own title may say "Schrijf …").
        instruction: resolveInstruction(leaf.instruction, leaf.typeId, LEAF_BY_ID[leaf.id]?.label ?? leaf.label, constraints as BlockConstraints),
        constraints, weight: 100,
    };
}

// Per constraints object: the store swaps it on every edit, so identity = freshness (rowYields draws an exercise).
const rowCache = new WeakMap<object, Map<string, unknown[] | null>>();

/** The block's Oefenmodus wire row for the QR, or null. */
export function tutorOefenRow(block: MathBlock): unknown[] | null {
    const key = `${block.typeId}|${block.leafId ?? ''}`;
    const cached = rowCache.get(block.constraints)?.get(key);
    if (cached !== undefined) return cached;
    const t = tutorOefenType(block);
    const row = t ? sessieRowWire(t) : null;
    const perBlock = rowCache.get(block.constraints) ?? new Map<string, unknown[] | null>();
    perBlock.set(key, row);
    rowCache.set(block.constraints, perBlock);
    return row;
}
