import { REGISTRY } from '../config/exerciseRegistry';
import { seedConstraints, type BaseSettings } from '../config/baseSettings';
import type { Leerjaar } from '../config/gradePresets';
import type { MathBlock } from '../services/math/types';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { rndId } from './boardTypes';

export interface BoardSeed {
    // The catalog variant's leaf constraints and its leaf id, exactly what a sidebar click passes.
    override?: Record<string, unknown>;
    leafId?: string;
    base: BaseSettings;
    grade: Leerjaar | null;
}

// The worksheet's Basisinstellingen and leerjaar, resolved the way addBlockFromType does,
// so a board widget starts from the same numbers as the sidebar block the teacher knows.
export function sheetSeedContext(): Pick<BoardSeed, 'base' | 'grade'> {
    const ws = useWorksheetStore.getState();
    return { base: ws.baseSettings, grade: ws.curriculum?.locked ? null : ws.selectedGrade };
}

// MathBlock factory for board widgets. Same registry contract and seed as the worksheet,
// but board-tuned defaults: no opdracht-titel, no score, and a lower exercise
// count (a board widget teaches a handful of exercises, not a full page).
export function makeBoardBlock(typeId: string, seed: BoardSeed): MathBlock | null {
    const def = REGISTRY[typeId];
    if (!def) return null;
    const block: MathBlock = {
        id: `bw-${rndId()}`,
        typeId,
        leafId: seed.leafId,
        instructionText: '',
        instructionMode: 'geen',
        layoutPreset: 'inline-short',
        steppedLines: 3,
        numberOfExercises: Math.min(def.defaultCount, 6),
        totalPoints: 0,
        verticalSpacing: 14,
        constraints: seedConstraints({ typeId, base: seed.base, override: seed.override, grade: seed.grade, leafId: seed.leafId }) as MathBlock['constraints'],
        exercises: [],
    };
    return regenerateBoardBlock(block);
}

// Generate directly against the registry — board blocks never live in the
// worksheet store, so we write the exercise field ourselves instead of going
// through setExercises.
export function regenerateBoardBlock(block: MathBlock): MathBlock {
    const def = REGISTRY[block.typeId];
    if (!def) return block;
    return { ...block, [def.exerciseField]: def.generate(block) };
}
