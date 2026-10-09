// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import TopBar from '../components/layout/TopBar';
import { useWorksheetStore } from '../store/useWorksheetStore';

// jsdom has no layout, so the three zone columns get the widths a real 1920 px window
// measured (Playwright, 2026-10-09): [left group, name track, right group] per stage.
const ZONE_WIDTHS: Record<number, [number, number, number]> = {
    0: [393, 321, 498],
    1: [138, 149, 226],
    2: [138, 0, 226],
    3: [54, 0, 226],
};
// What --sp-5 (bar side padding) and --sp-3 (zone gap) resolve to; jsdom leaves var() unresolved.
const BAR_PADDING = '20px';
const ZONE_GAP = '12px';
let barWidth = 0;

// Shadowing on HTMLElement.prototype leaves jsdom's own Element.prototype getters intact.
const proto = HTMLElement.prototype;
const isBar = (el: Element) => el.classList.contains('topbar');
const isZoneRow = (el: Element) => !!el.parentElement && isBar(el.parentElement) && el.children.length === 3;

beforeAll(() => {
    Object.defineProperty(proto, 'scrollWidth', {
        configurable: true,
        get(this: HTMLElement) {
            const row = this.parentElement;
            const bar = row?.parentElement;
            if (!row || !bar || !isBar(bar)) return 0;
            const idx = Array.from(row.children).indexOf(this);
            const w = ZONE_WIDTHS[Number(bar.dataset.stage)]?.[idx] ?? 0;
            // A long sheet name widens the name track by what its 320 px cap allows.
            return idx === 1 && w > 0 && (this.textContent ?? '').length > 30 ? w + 180 : w;
        },
    });
    Object.defineProperty(proto, 'clientWidth', {
        configurable: true,
        get(this: HTMLElement) { return isBar(this) ? barWidth : 0; },
    });
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => {
        const cs = real(el, pseudo);
        return new Proxy(cs, {
            get(target, key) {
                if (isBar(el) && (key === 'paddingLeft' || key === 'paddingRight')) return BAR_PADDING;
                if (isZoneRow(el) && key === 'columnGap') return ZONE_GAP;
                const v = Reflect.get(target, key, target);
                return typeof v === 'function' ? v.bind(target) : v;
            },
        });
    });
});
afterAll(() => {
    delete (proto as unknown as Record<string, unknown>).scrollWidth;
    delete (proto as unknown as Record<string, unknown>).clientWidth;
    vi.restoreAllMocks();
});
afterEach(() => { cleanup(); useWorksheetStore.getState().updateHeader({ titel: '' }); });

// barWidth = the bar's clientWidth (padding included) a real window of that size gives.
const stageAt = (width: number) => {
    barWidth = width;
    const { container } = render(<TopBar onPrint={() => {}} onOpenHelp={() => {}} />);
    return Number((container.querySelector('.topbar') as HTMLElement).dataset.stage);
};

describe('TopBar shedding', () => {
    // Why: the bar's padding is not room the row gets; counting it kept stage 0 at 1920 px
    // while the right group ran over "Automatisch bewaard".
    test('1920 px window: the full labels do not fit the inner width, so it sheds to icons', () => {
        expect(stageAt(1268)).toBe(1);
    });

    // Why: the name centres in the space the groups leave, not dead centre of the bar, so
    // a 1280 px laptop keeps it in the row instead of on a second line.
    test('1280 px window: icon-only buttons and the name share one row', () => {
        expect(stageAt(628)).toBe(1);
    });

    // Why: renaming the sheet widens only the name column; the stretched row never resizes,
    // so without a re-measure the long name ran under the buttons.
    test('a rename that no longer fits moves the name to the second line', () => {
        expect(stageAt(628)).toBe(1);
        act(() => { useWorksheetStore.getState().updateHeader({ titel: 'Herhalingsbundel tafels en deeltafels' }); });
        expect(Number((document.querySelector('.topbar') as HTMLElement).dataset.stage)).toBe(2);
    });

    test('a bar wide enough for everything keeps every label', () => {
        expect(stageAt(2000)).toBe(0);
    });
});
