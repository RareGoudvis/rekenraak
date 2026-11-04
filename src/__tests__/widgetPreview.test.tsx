// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import WidgetPreview from '../board/components/WidgetPreview';
import { TOOL_CATALOG } from '../board/toolCatalog';

describe('WidgetPreview', () => {
    beforeEach(() => {
        vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
        vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
        vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
    });
    afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

    const withKind = TOOL_CATALOG.filter(t => t.kind !== 'afbeelding-picker' && t.kind !== 'geld-palet');

    test.each(withKind.map(t => [t.id, t] as const))('%s mounts as a chromeless, inert preview', (_id, t) => {
        const { container } = render(<WidgetPreview kind={t.kind as never} props={t.props} />);
        const box = container.querySelector('[data-widget-preview]')!;
        expect(box).not.toBeNull();
        expect(box.getAttribute('aria-hidden')).toBe('true');
        expect(container.querySelector('[data-card-bar]')).toBeNull();
        expect(container.querySelector('[data-card-title]')).toBeNull();
    });
});
