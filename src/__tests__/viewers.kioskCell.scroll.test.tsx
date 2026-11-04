// @vitest-environment jsdom
import { test, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import KioskCell from '../components/viewer/KioskCell';
import { EMPTY_INTERACTION, ViewerInteractionProvider } from '../components/viewer/ViewerInteractionContext';

afterEach(() => {
    cleanup();
    delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
});

const card = (children: ReactNode) => (
    <ViewerInteractionProvider value={{ kind: 'fill-cells', state: EMPTY_INTERACTION, activeCell: 'a', set: () => { }, focusCell: () => { } }}>
        {children}
    </ViewerInteractionProvider>
);

// A fitted card clips with overflow:hidden; scrolling it against a stale fit cropped the verliefde harten to their right half.
test('the active cell is not scrolled into view on a card that fits', () => {
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    render(card(<div className="kiosk-card-body"><KioskCell cellKey="a" /></div>));
    expect(spy).not.toHaveBeenCalled();
});

test('the active cell is scrolled into view inside a scrolling card', () => {
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    render(card(<div className="kiosk-card-body" data-kiosk-scroll=""><KioskCell cellKey="a" /></div>));
    expect(spy).toHaveBeenCalledTimes(1);
});
