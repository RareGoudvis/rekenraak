// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import TopBar from '../components/layout/TopBar';

// jsdom has no layout, so the three zone columns get the widths a real 1920 px window
// measured (Playwright, 2026-10-09): [left group, centre track, right group] per stage.
const ZONE_WIDTHS: Record<number, [number, number, number]> = {
    0: [393, 321, 498],
    1: [138, 149, 226],
    2: [138, 0, 226],
    3: [54, 0, 226],
};
let barWidth = 0;

// Shadowing on HTMLElement.prototype leaves jsdom's own Element.prototype getters intact.
const proto = HTMLElement.prototype;

beforeAll(() => {
    Object.defineProperty(proto, 'scrollWidth', {
        configurable: true,
        get(this: HTMLElement) {
            const row = this.parentElement;
            const bar = row?.parentElement;
            if (!row || !bar?.classList.contains('topbar')) return 0;
            const idx = Array.from(row.children).indexOf(this);
            return ZONE_WIDTHS[Number(bar.dataset.stage)]?.[idx] ?? 0;
        },
    });
    Object.defineProperty(proto, 'clientWidth', {
        configurable: true,
        get(this: HTMLElement) { return this.classList.contains('topbar') ? barWidth : 0; },
    });
});
afterAll(() => {
    delete (proto as unknown as Record<string, unknown>).scrollWidth;
    delete (proto as unknown as Record<string, unknown>).clientWidth;
});
afterEach(cleanup);

const stageAt = (width: number) => {
    barWidth = width;
    const { container } = render(<TopBar onPrint={() => {}} onOpenHelp={() => {}} />);
    return Number((container.querySelector('.topbar') as HTMLElement).dataset.stage);
};

describe('TopBar shedding vs the centred name track', () => {
    // Why: the name track sits dead centre between two equal columns, so the wider group
    // needs its width on BOTH sides. Summing the three columns kept stage 0 at 1920 px
    // while the right group ran over "Automatisch bewaard".
    test('a bar where the summed columns fit but the wide right group cannot sit beside a centred name sheds', () => {
        expect(stageAt(1268)).toBe(1);
    });

    test('a bar wide enough for the centred layout keeps every label', () => {
        expect(stageAt(2000)).toBe(0);
    });
});
