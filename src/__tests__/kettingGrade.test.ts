import { describe, test, expect } from 'vitest';
import { seedLeafConstraints } from '../config/baseSettings';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { DEFAULT_BASE } from '../config/baseSettings';
import { GRADE_PRESETS, type Leerjaar } from '../config/gradePresets';
import type { PatroonExercise } from '../services/math/types';

// Owner decision 2026-10-10 (10B): "Tussenresultaten tonen" is on for leerjaar 1-2 and off from 3,
// set by the grade seed (not the registry default) so a kiosk row carries the teacher's setting.
const LEAF = 'patronen-kettingsommen';

describe('kettingsommen: tussenresultaten per leerjaar', () => {
    test.each<[Leerjaar | null, boolean]>([[1, true], [2, true], [3, false], [4, false], [5, false], [6, false], [null, false]])('leerjaar %s → %s', (grade, on) => {
        const seeded = seedLeafConstraints(LEAF, grade)!;
        expect(!!seeded.constraints.showIntermediates).toBe(on);
        const block = makeBlock(seeded.typeId, {
            constraints: { ...seeded.constraints }, grade, leafId: LEAF,
            base: grade == null ? DEFAULT_BASE : { ...DEFAULT_BASE, ...GRADE_PRESETS[grade] },
        });
        for (const ex of generateFor(block) as PatroonExercise[]) {
            // On: only the end is blank; off: every value after the start is.
            const blanks = ex.blankMask.filter(Boolean).length;
            expect(blanks).toBe(on ? 1 : ex.values.length - 1);
        }
    });
    test('a teacher choice in the leaf override still wins', () => {
        expect(seedLeafConstraints(LEAF, 2, { showIntermediates: false })!.constraints.showIntermediates).toBe(false);
    });
});
