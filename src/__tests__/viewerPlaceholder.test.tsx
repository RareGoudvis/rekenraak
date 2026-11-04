// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';

// An ungenerated block's "(Nog geen oefeningen — klik Genereer)" is a screen hint: it never
// prints (no-print) and takes the muted text token, never a hex grey.

afterEach(cleanup);

const PLACEHOLDER = '(Nog geen oefeningen — klik Genereer)';

describe('the empty-block placeholder', () => {
    test.each(Object.keys(EXERCISE_UI))('%s: no-print and --text-muted', (typeId) => {
        const { Viewer } = EXERCISE_UI[typeId];
        const { container } = render(
            <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
                <Viewer block={makeBlock(typeId, { id: 'b1' })} showSolutions={false} />
            </BlockWidthProvider>,
        );
        const hint = Array.from(container.querySelectorAll<HTMLElement>('div')).find(el => el.textContent?.trim() === PLACEHOLDER);
        // A viewer that draws something else when empty (a blank grid, a template) has nothing to check.
        if (!hint) return;
        expect(hint.closest('.no-print'), 'prints on paper').not.toBeNull();
        expect(hint.style.color || getComputedStyle(hint).color).toBe('var(--text-muted)');
    });

    test('the cijferen, geld and herleidingen viewers do show it when empty', () => {
        const ids = Object.keys(EXERCISE_UI).filter(t => /^(cijferen-|geld-|herleidingen)/.test(t));
        const shown = ids.filter(typeId => {
            const { Viewer } = EXERCISE_UI[typeId];
            const { container, unmount } = render(
                <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
                    <Viewer block={makeBlock(typeId, { id: 'b1' })} showSolutions={false} />
                </BlockWidthProvider>,
            );
            const has = container.textContent?.includes(PLACEHOLDER) ?? false;
            unmount();
            return has;
        });
        expect(shown.length).toBeGreaterThanOrEqual(8);
    });
});
