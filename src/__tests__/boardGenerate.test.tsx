// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { REGISTRY } from '../config/exerciseRegistry';
import { DEFAULT_BASE } from '../config/baseSettings';
import { NAT_CEILING } from '../config/numberRanges';
import { GENERATION_FAILED } from '../services/generateDispatch';
import { makeBoardBlock, regenerateBoardBlock } from '../board/boardBlocks';
import { useBoardStore } from '../board/useBoardStore';
import BoardInspector from '../board/components/BoardInspector';

// The board generates through the sheet's generateForBlock: same ceiling clamp, dedupe,
// generation note and failure guard, and the board inspector shows the note like the Inspector.
const METREST_N3_AT_100 = { numberType: 'natural', multiplicationMode: 'met_rest', maxGetal: 100, metRestLevel: 3 };

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useWorksheetStore.setState({ baseSettings: { ...DEFAULT_BASE }, selectedGrade: null, curriculum: null });
    useWorksheetStore.getState().clearBlocks();
    useBoardStore.getState().resetBoard();
});

const boardDelen = (override: Record<string, unknown>) =>
    makeBoardBlock('hr-std-delen', { override, leafId: 'hr-std-delen-nat', base: DEFAULT_BASE, grade: null })!;

describe('board generation', () => {
    test('a met-rest block at max 100 with N3 carries the same level note as the sheet', () => {
        useWorksheetStore.getState().addBlockFromType('hr-std-delen', 'Natuurlijke getallen', METREST_N3_AT_100, { leafId: 'hr-std-delen-nat' });
        const sheetNote = useWorksheetStore.getState().blocks[0].generationNote;
        expect(sheetNote).toBeTruthy();
        const board = boardDelen(METREST_N3_AT_100);
        expect(board.generationNote).toBe(sheetNote);
        expect(regenerateBoardBlock(board).generationNote).toBe(sheetNote);
    });

    test('the board inspector shows the note in the sheet Inspector\'s box', () => {
        const block = boardDelen(METREST_N3_AT_100);
        const id = useBoardStore.getState().addWidget({ kind: 'exercise', x: 0, y: 0, w: 660, block, showAnswer: false });
        const widget = useBoardStore.getState().pages[0].widgets.find((w) => w.id === id)!;
        const { container } = render(<BoardInspector widget={widget} />);
        const box = container.querySelector('[data-generation-note]');
        expect(box).not.toBeNull();
        expect(box!.textContent).toBe(block.generationNote);
        expect(screen.getByText(block.generationNote!.split(/[:—]/)[0])).toBeTruthy();
    });

    test('a throwing generator leaves a failure note instead of crashing the board', () => {
        const def = REGISTRY['hr-std-delen'];
        vi.spyOn(def, 'generateNoted').mockImplementation(() => { throw new Error('boem'); });
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const block = boardDelen({ numberType: 'natural' });
        expect(block.generationNote).toBe(`${GENERATION_FAILED} boem`);
    });

    test('an old 1e10 max generates under the ceiling and keeps its stored value', () => {
        const block = boardDelen({ numberType: 'natural', multiplicationMode: 'andere', maxGetal: 1e10 });
        expect((block.constraints as Record<string, unknown>).maxGetal).toBe(1e10);
        for (const ex of block.exercises) {
            for (const op of ex.operands) expect(Math.abs(Number(op))).toBeLessThanOrEqual(NAT_CEILING);
        }
        expect(block.exercises.length).toBeGreaterThan(0);
    });
});
