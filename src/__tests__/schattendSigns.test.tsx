// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { MathBlock, SchattendExercise } from '../services/math/types';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import SchattendViewer from '../components/viewer/SchattendViewer';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';
import { seedLeafConstraints } from '../config/baseSettings';
import { targetsFor, roundTo } from '../services/afronden/afrondenGenerator';

// Schattend: every row is an estimate, so every row reads "≈" (never "=" for some rows and
// "≈" for others, as the 2026-09-27 sweep reported for schattend-nat), and no row is exact.

function mulberry32(a: number) {
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const nativeRandom = Math.random;
afterEach(() => { Math.random = nativeRandom; cleanup(); });

function blocks(leafId: string, extra: Record<string, unknown>): MathBlock[] {
    const seeded = seedLeafConstraints(leafId, null, extra)!;
    return Array.from({ length: 20 }, (_, i) => {
        Math.random = mulberry32(i + 1);
        const block = makeBlock(seeded.typeId, { leafId, constraints: seeded.constraints });
        return { ...block, schattendExercises: REGISTRY.schattend.generate(block) } as MathBlock;
    });
}

describe('schattend: one sign for the estimate in every row', () => {
    test.each<[string, Record<string, unknown>, number]>([
        ['schattend-nat', {}, 2],
        ['schattend-nat', { scaffolding: 'geen' }, 1],
        ['schattend-nat', { operators: ['+', '-', 'x', ':'] }, 2],
        ['schattend-dec', {}, 2],
    ])('%s %j: %i × "≈" per row, no "="', (leafId, extra, signs) => {
        for (const block of blocks(leafId, extra)) {
            const rows = render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><SchattendViewer block={block} showSolutions /></BlockWidthProvider>)
                .container.querySelectorAll('.print-exercise');
            expect(rows.length).toBe((block.schattendExercises ?? []).length);
            for (const row of rows) {
                const text = row.textContent ?? '';
                expect(text, text).not.toContain('=');
                expect(text.split('≈').length - 1, text).toBe(signs);
            }
            cleanup();
        }
    });

    test('no row is exact: at least one operand really rounds', () => {
        for (const block of [...blocks('schattend-nat', { operators: ['+', '-', 'x', ':'] }), ...blocks('schattend-dec', {})]) {
            const all = targetsFor((block.constraints as { numberType?: string }).numberType ?? 'natural');
            for (const ex of (block.schattendExercises ?? []) as SchattendExercise[]) {
                const t = all.find(x => x.key === ex.targetKey)!;
                const roundsB = ex.operator === '+' || ex.operator === '-';
                expect(roundTo(ex.a, t.weight) !== ex.a || (roundsB && roundTo(ex.b, t.weight) !== ex.b), `${ex.a} ${ex.operator} ${ex.b}`).toBe(true);
            }
        }
    });
});
