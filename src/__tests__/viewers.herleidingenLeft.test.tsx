// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import HerleidingenViewer from '../components/viewer/HerleidingenViewer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';
import type { HerleidingExercise } from '../services/math/types';

afterEach(cleanup);

// The left box is sized from a char-count estimate that undershoots a compound given side
// ("856 dm²  36 cm²"), so it overflowed to the LEFT and the Oefenmodus card cropped its first digit.
test('a compound given side can never overflow its left box: the box is at least as wide as its content', () => {
    const block = makeBlock('herleidingen', { constraints: { measure: 'oppervlakte' } });
    block.herleidingExercises = [{
        id: 'h1', format: 'samengesteld-enkel', blank: 'number', isManuallyEdited: false,
        fromParts: [{ value: 856, key: 'dm²' }, { value: 36, key: 'cm²' }],
        toParts: [{ value: 85636, key: 'cm²' }],
    } as unknown as HerleidingExercise];
    const { container } = render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><HerleidingenViewer block={block} showSolutions={false} /></BlockWidthProvider>);
    const left = container.querySelector('.print-exercise')!.firstElementChild as HTMLElement;
    expect(left.textContent).toContain('856');
    expect(left.style.minWidth).toBe('max-content');
});
