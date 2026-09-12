// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { measureContentWidth } from '../hooks/useShedStages';

// jsdom never computes real layout, so scrollWidth/columnGap have to be stubbed per
// element — this pins down the ONE piece of useShedStages that isn't render/effect
// timing (which needs a real browser; see the Playwright check for Part 7h).

function elWithScrollWidth(px: number): HTMLElement {
    const el = document.createElement('div');
    Object.defineProperty(el, 'scrollWidth', { value: px, configurable: true });
    return el;
}

describe('measureContentWidth', () => {
    it('sums each direct child\'s own scrollWidth plus the gaps between them', () => {
        const parent = document.createElement('div');
        parent.style.columnGap = '10px';
        parent.append(elWithScrollWidth(50), elWithScrollWidth(30), elWithScrollWidth(20));
        // 50 + 30 + 20 + 2 gaps of 10 = 120. Summing children (not parent.scrollWidth)
        // is the whole point: a CSS grid can shrink a child's assigned track below its
        // content without the grid container's own scrollWidth ever reflecting it (see
        // the file header comment on useShedStages.ts) — measureContentWidth exists
        // specifically to see past that.
        expect(measureContentWidth(parent)).toBe(120);
    });

    it('falls back to the element\'s own scrollWidth when it has no children', () => {
        const el = elWithScrollWidth(75);
        expect(measureContentWidth(el)).toBe(75);
    });

    it('treats a missing/zero column-gap as no gap at all', () => {
        const parent = document.createElement('div');
        parent.append(elWithScrollWidth(40), elWithScrollWidth(40));
        expect(measureContentWidth(parent)).toBe(80);
    });
});
