// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import SheetHeader from '../components/sheet/SheetHeader';
import SheetFooter from '../components/sheet/SheetFooter';
import { useWorksheetStore } from '../store/useWorksheetStore';
import type { DocSettings } from '../store/useWorksheetStore';

// Switching Blad › koptekst / voettekst style at runtime logged React's "Updating a style
// property during rerender … when a conflicting property is set": the header mixed border
// shorthands with border-bottom longhands and the footer spread `borderStyle` over
// `borderTopStyle`. A rerender through every style pair must stay silent.

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const base = (): DocSettings => useWorksheetStore.getState().docSettings;
const conflicts = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.map(c => c.map(String).join(' ')).filter(m => /style property during rerender/.test(m));
// jsdom reports colours as rgb().
const BLACK = 'rgb(0, 0, 0)';

describe('sheet chrome: border styles switch without conflicting shorthands', () => {
    const header = ['geen', 'onderstreept', 'kader'] as const;
    const footer = ['geen', 'lijn', 'kader'] as const;
    const custom = [undefined, { borderBox: true }, { borderBottom: true, borderWidth: 2 }];

    test.each(header.flatMap(a => header.filter(b => b !== a).map(b => [a, b])))('header %s → %s', (a, b) => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        for (const c of custom) {
            const { rerender } = render(<SheetHeader header={undefined} totalScore={0} docSettings={{ ...base(), headerStyle: a, headerCustom: c }} />);
            rerender(<SheetHeader header={undefined} totalScore={0} docSettings={{ ...base(), headerStyle: b, headerCustom: c }} />);
            cleanup();
        }
        expect(conflicts(spy)).toEqual([]);
    });

    test.each(footer.flatMap(a => footer.filter(b => b !== a).map(b => [a, b])))('footer %s → %s', (a, b) => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        for (const c of custom) {
            const { rerender } = render(<SheetFooter footer={undefined} pageIndex={0} pageCount={1} docSettings={{ ...base(), footerStyle: a, footerCustom: c }} />);
            rerender(<SheetFooter footer={undefined} pageIndex={0} pageCount={1} docSettings={{ ...base(), footerStyle: b, footerCustom: c }} />);
            cleanup();
        }
        expect(conflicts(spy)).toEqual([]);
    });

    test('the kader header still draws a 1.5px black box and onderstreept only its bottom rule', () => {
        const box = render(<SheetHeader header={undefined} totalScore={0} docSettings={{ ...base(), headerStyle: 'kader' }} />).container.firstElementChild as HTMLElement;
        expect([box.style.borderTopWidth, box.style.borderLeftWidth, box.style.borderBottomWidth]).toEqual(['1.5px', '1.5px', '1.5px']);
        expect(box.style.borderTopColor).toBe(BLACK);
        cleanup();
        const rule = render(<SheetHeader header={undefined} totalScore={0} docSettings={{ ...base(), headerStyle: 'onderstreept' }} />).container.firstElementChild as HTMLElement;
        expect(rule.style.borderTopColor).toBe('transparent');
        expect([rule.style.borderBottomWidth, rule.style.borderBottomColor]).toEqual(['1.5px', BLACK]);
    });
});
