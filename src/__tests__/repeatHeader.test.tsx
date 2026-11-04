// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup, renderHook, act } from '@testing-library/react';
import SheetHeader from '../components/sheet/SheetHeader';
import { useWorksheetStore, type HeaderData } from '../store/useWorksheetStore';
import { useMeasuredHeights } from '../hooks/useMeasuredHeights';
import { packPages } from '../services/layout/pagePacker';
import { makeBlock } from './helpers/makeBlock';

afterEach(cleanup);

const docSettings = () => ({ ...useWorksheetStore.getState().docSettings, showScores: true });
const header = (over: Partial<HeaderData> = {}): HeaderData => ({ ...useWorksheetStore.getState().header, titel: 'Tafels', naam: true, ...over });
const texts = (el: HTMLElement) => ({ title: el.querySelector('h1')?.textContent ?? null, naam: el.textContent?.includes('Naam:') ?? false, score: el.textContent?.includes('Score') ?? false });

describe('continuation pages repeat the title and/or the name fields', () => {
    test('page 1 always draws title, fields and score', () => {
        const { container } = render(<SheetHeader header={header()} docSettings={docSettings()} totalScore={10} />);
        expect(texts(container)).toEqual({ title: 'Tafels', naam: true, score: true });
    });

    test('a continuation page draws nothing unless asked', () => {
        const { container } = render(<SheetHeader header={header()} docSettings={docSettings()} totalScore={10} continuation />);
        expect(container.firstElementChild).toBeNull();
    });

    test.each([
        [{ repeatTitle: true }, { title: 'Tafels', naam: false, score: false }],
        [{ repeatHeader: true }, { title: null, naam: true, score: false }],
        [{ repeatTitle: true, repeatHeader: true }, { title: 'Tafels', naam: true, score: false }],
    ])('%o', (over, want) => {
        const { container } = render(<SheetHeader header={header(over)} docSettings={docSettings()} totalScore={10} continuation />);
        expect(texts(container)).toEqual(want);
    });

    test('a continuation header uses the page-1 header box (same kader)', () => {
        const ds = { ...docSettings(), headerStyle: 'kader' as const };
        const p1 = render(<SheetHeader header={header({ repeatTitle: true })} docSettings={ds} totalScore={0} />).container.firstElementChild as HTMLElement;
        const p2 = render(<SheetHeader header={header({ repeatTitle: true })} docSettings={ds} totalScore={0} continuation />).container.firstElementChild as HTMLElement;
        expect(p2.style.cssText).toBe(p1.style.cssText);
    });

    test('the centred title sits titleFieldsVerticalGap under the fields', () => {
        const { container } = render(<SheetHeader header={header()} docSettings={{ ...docSettings(), titleFieldsVerticalGap: 20 }} totalScore={0} />);
        expect((container.querySelector('h1') as HTMLElement).style.margin).toBe('20px 0px 0px');
    });
});

describe('the continuation-page budget', () => {
    const flush = () => act(async () => { await Promise.resolve(); });

    test('a changed continuation header drops the stale page-2 body and falls back to page 1', async () => {
        const { result, rerender } = renderHook(({ k }) => useMeasuredHeights([], k), { initialProps: { k: 'a' } });
        act(() => { result.current.onBodyMeasure(0, 800); result.current.onBodyMeasure(1, 900); });
        await flush();
        expect(result.current.pageBudgetPx(1)).toBe(900);
        rerender({ k: 'b' });
        await flush();
        expect(result.current.pageBudgetPx(1)).toBe(800);
        act(() => { result.current.onBodyMeasure(1, 850); });
        await flush();
        expect(result.current.pageBudgetPx(1)).toBe(850);
    });

    test('the packer costs a continuation page against its own (shorter) body', () => {
        const blocks = Array.from({ length: 3 }, (_, i) => makeBlock('hr-std-optellen', { id: `b${i}`, block: { widthUnits: 4 } }));
        const opts = { mode: 'rijen' as const, blockSpacingPx: 0, heightPxOf: () => 400 };
        // Page 2 without a repeated header holds two 400px blocks; with a title costing 50px it holds one.
        expect(packPages(blocks, { ...opts, pageBudgetPx: (i: number) => (i === 0 ? 400 : 800) }).map(p => p.blocks.length)).toEqual([1, 2]);
        expect(packPages(blocks, { ...opts, pageBudgetPx: (i: number) => (i === 0 ? 400 : 750) }).map(p => p.blocks.length)).toEqual([1, 1, 1]);
    });
});
