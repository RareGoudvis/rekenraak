// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import SheetBlock, { type SheetBlockProps } from '../components/sheet/SheetBlock';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { makeBlock } from './helpers/makeBlock';
import { DOMAIN_FILL, domainFillOf } from '../config/domainOf';
import type { MathBlock } from '../services/math/types';
import type { DocSettings } from '../store/types';

afterEach(cleanup);

function titleOf(block: MathBlock, ds: Partial<DocSettings>) {
    const props: SheetBlockProps = {
        block, index: 1, leftPx: 0, topPx: 0, cellWidthPx: 681, widthUnits: 6, availableWidthPx: 681,
        colGapPx: 0, columnDivider: false, hOverflowPx: 0, isActive: false, isDragging: false,
        showDropZones: false, dropZone: null, dropNoop: false, showSolutions: false,
        docSettings: { ...useWorksheetStore.getState().docSettings, ...ds },
        blockProps: () => ({ onPointerDown: () => { } }), onFitWidth: () => { }, onWiden: () => { },
    };
    const { container } = render(<SheetBlock {...props} />);
    return { container, title: container.querySelector<HTMLElement>('.print-opdracht') };
}

const meten = () => makeBlock('klok-kloklezen', { leafId: 'klok-analoog-lezen' });
const getal = () => makeBlock('mab-herkennen', { leafId: 'mab-herkennen' });

describe('domainColors', () => {
    test('fills the title by domain', () => {
        const m = titleOf(meten(), { domainColors: true }).title!;
        expect(m.style.background).not.toBe('');
        expect(domainFillOf('klok-analoog-lezen', 'klok-kloklezen')).toBe(DOMAIN_FILL['meten-metend-rekenen']);
        cleanup();
        const g = titleOf(getal(), { domainColors: true }).title!;
        expect(g.style.background).not.toBe('');
        expect(g.style.background).not.toBe(m.style.background);
    });
    test('typeId fallback without leafId; unknown typeId none', () => {
        expect(domainFillOf(undefined, 'klok-kloklezen')).toBe(DOMAIN_FILL['meten-metend-rekenen']);
        expect(domainFillOf(undefined, 'nope')).toBeUndefined();
    });
    test('furniture gets none', () => {
        const { container } = titleOf(makeBlock('layout-sectie', { leafId: 'layout-sectie' }), { domainColors: true });
        expect(container.querySelector('.print-opdracht')).toBeNull();
        expect(domainFillOf('layout-sectie', 'layout-sectie')).toBeUndefined();
    });
    test('explicit titelCustom.background wins', () => {
        const t = titleOf(meten(), { domainColors: true, titelCustom: { background: '#FFFFFF' } }).title!;
        expect(t.style.background).toBe('rgb(255, 255, 255)');
    });
    test('switch off is byte-identical to the default', () => {
        const blk = meten();
        const a = titleOf(blk, {}).container.innerHTML;
        cleanup();
        const b = titleOf(blk, { domainColors: false }).container.innerHTML;
        expect(b).toBe(a);
    });
});
