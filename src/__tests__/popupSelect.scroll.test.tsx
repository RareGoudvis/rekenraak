// @vitest-environment jsdom
import { describe, test, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import PopupSelect from '../components/ui/PopupSelect';
import { NAT_STEPS, presetLabel } from '../config/numberRanges';

// A 10-step max list is taller than the 260px menu, so a selected "Tot 1.000.000.000" sat
// below the fold on open. The menu scrolls itself to it — never the Inspector around it.

const ROW = 32;
const MENU = 260;
const options = NAT_STEPS.map(v => ({ value: v, label: presetLabel(v) }));

// jsdom has no layout: give each option a row-height slot by its index and the menu a height.
const rowIndex = (el: HTMLElement) => (el.parentElement ? [...el.parentElement.children].indexOf(el) : 0);
const saved: Record<string, PropertyDescriptor | undefined> = {};
beforeAll(() => {
    for (const k of ['offsetTop', 'offsetHeight', 'clientHeight']) saved[k] = Object.getOwnPropertyDescriptor(HTMLElement.prototype, k);
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', { configurable: true, get() { return this.getAttribute('role') === 'option' ? 4 + rowIndex(this) * ROW : 0; } });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.getAttribute('role') === 'option' ? ROW : 0; } });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return this.getAttribute('role') === 'listbox' ? MENU : 0; } });
});
afterAll(() => {
    for (const [k, d] of Object.entries(saved)) {
        if (d) Object.defineProperty(HTMLElement.prototype, k, d);
        else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[k];
    }
});
afterEach(cleanup);

function openAt(value: number) {
    render(<PopupSelect value={value} options={options} onChange={() => { }} ariaLabel="Maximum getal" />);
    fireEvent.click(screen.getByRole('button', { name: 'Maximum getal' }));
    return screen.getByRole('listbox');
}

describe('PopupSelect opens on the selected option', () => {
    test('a selection below the fold is centred in the menu', () => {
        const menu = openAt(1_000_000_000);
        const top = 4 + 9 * ROW;
        expect(menu.scrollTop).toBe(top - (MENU - ROW) / 2);
        // …and it is inside the visible band.
        expect(top).toBeGreaterThanOrEqual(menu.scrollTop);
        expect(top + ROW).toBeLessThanOrEqual(menu.scrollTop + MENU);
    });

    test('a selection that is already visible leaves the menu at the top', () => {
        expect(openAt(100).scrollTop).toBe(0);
    });

    test('the page around the menu is not scrolled', () => {
        const spy = vi.fn();
        Element.prototype.scrollIntoView = spy;
        openAt(1_000_000_000);
        expect(spy).not.toHaveBeenCalled();
        delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
    });
});
