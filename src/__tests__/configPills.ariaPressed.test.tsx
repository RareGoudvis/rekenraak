// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { APP_STRUCTURE } from '../config/appstructure';
import { makeBlock } from './helpers/makeBlock';

// A pill / segment that shows "selected" by styling alone is invisible to a screen reader:
// every such button must also say so with aria-pressed (or an equivalent ARIA state).
// The selected looks in sharedPluginStyles all paint one of these tokens inline.
const SELECTED_MARKERS = ['var(--seg-thumb)', 'var(--accent-soft)', 'background-color: var(--accent)'];
// The bridge arrows cycle three states (geen / mag / moet) and name the state in their aria-label.
const STATE_IN_LABEL = /^Brug bij /;
const ARIA_STATE = ['aria-pressed', 'aria-checked', 'aria-selected', 'aria-current', 'aria-expanded'];

afterEach(cleanup);

// Every leaf, however deep the tree nests it.
interface Leaf { id: string; typeId?: string; defaultConstraints?: Record<string, unknown> }
const leaves: Leaf[] = [];
const walk = (n: unknown): void => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    const o = n as Record<string, unknown>;
    if (typeof o.typeId === 'string' && EXERCISE_UI[o.typeId]) leaves.push(o as unknown as Leaf);
    for (const v of Object.values(o)) if (typeof v === 'object') walk(v);
};
walk(APP_STRUCTURE);

class NoopObserver { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('IntersectionObserver', NoopObserver);

describe('selected-looking Config buttons carry an ARIA state', () => {
    test('the sweep sees every leaf', () => {
        expect(leaves.length).toBeGreaterThan(70);
    });

    test.each(leaves.map(l => [l.id, l.typeId!, l.defaultConstraints] as const))('%s', (_id, typeId, defaults) => {
        const ui = EXERCISE_UI[typeId];
        const block = makeBlock(typeId, { id: 'b', constraints: defaults });
        const bad: string[] = [];
        for (const Comp of [ui.Config, ui.StyleConfig, ui.AdvancedConfig]) {
            if (!Comp) continue;
            const { container, unmount } = render(<Comp block={block} />);
            for (const b of container.querySelectorAll('button')) {
                const style = b.getAttribute('style') ?? '';
                const looksSelected = SELECTED_MARKERS.some(m => style.includes(m));
                if (looksSelected && !STATE_IN_LABEL.test(b.getAttribute('aria-label') ?? '') && !ARIA_STATE.some(a => b.hasAttribute(a))) bad.push((b.textContent ?? '').trim() || b.outerHTML.slice(0, 80));
            }
            unmount();
        }
        expect(bad, `${typeId} buttons styled selected without an ARIA state`).toEqual([]);
    });
});
