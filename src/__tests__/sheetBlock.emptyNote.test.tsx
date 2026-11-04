// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import SheetBlock, { type SheetBlockProps } from '../components/sheet/SheetBlock';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { generateForBlock } from '../services/generateDispatch';
import { makeBlock } from './helpers/makeBlock';
import type { MathBlock } from '../services/math/types';

// [E11] A generate that legitimately returns nothing carries a note; the sheet must show that
// note on screen only and never tell the paper to "klik Genereer".

afterEach(cleanup);

function renderSheetBlock(block: MathBlock) {
    const props: SheetBlockProps = {
        block, index: 1, leftPx: 0, topPx: 0, cellWidthPx: 681, widthUnits: 6, availableWidthPx: 681,
        colGapPx: 0, columnDivider: false, hOverflowPx: 0, isActive: false, isDragging: false,
        showDropZones: false, dropZone: null, dropNoop: false, showSolutions: false,
        docSettings: useWorksheetStore.getState().docSettings,
        blockProps: () => ({ onPointerDown: () => { } }), onFitWidth: () => { }, onWiden: () => { },
    };
    return render(<SheetBlock {...props} />);
}

describe('[E11] empty block with a generation note', () => {
    test('shows the note (screen only) instead of "klik Genereer"', () => {
        const stored = makeBlock('kettingsommen', { constraints: { maxGetal: 20, chainLength: 5, ops: ['x'] } });
        const { items, note } = generateForBlock(stored);
        expect(items).toHaveLength(0);
        const { container } = renderSheetBlock({ ...stored, patroonExercises: items, generationNote: note } as MathBlock);
        expect(container.textContent).not.toContain('klik Genereer');
        const shown = [...container.querySelectorAll('.no-print')].find(el => el.textContent?.includes('Geen kettingsom mogelijk'));
        expect(shown).toBeTruthy();
    });

    test('a block that was never generated keeps its "klik Genereer" prompt', () => {
        const stored = makeBlock('kettingsommen');
        const { container } = renderSheetBlock({ ...stored, patroonExercises: [] } as MathBlock);
        expect(container.textContent).toContain('klik Genereer');
    });
});
