// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import BreukBewerkViewer from '../components/viewer/BreukBewerkViewer';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { makeBlock, generateFor } from './helpers/makeBlock';
import type { MathBlock } from '../services/math/types';

// gelijknamig rows are ~318 px at the default font (four fractions, two lines, "en", "→") and sit
// 28 px apart: two fit the full sheet (688 px) but not a 628 px board card, which cut the last line.
afterEach(cleanup);

function block(subType: string): MathBlock {
    const b = makeBlock('breuken-bewerken', { constraints: { subType } });
    b.breukBewerkExercises = generateFor(b) as MathBlock['breukBewerkExercises'];
    return b;
}

const colsAt = (b: MathBlock, width: number) => {
    const { container } = render(<BlockWidthProvider value={width}><BreukBewerkViewer block={b} showSolutions={false} /></BlockWidthProvider>);
    const cols = Number(container.querySelector('[data-cols]')!.getAttribute('data-cols'));
    cleanup();
    return cols;
};

describe('breuken-bewerken columns follow the block width', () => {
    test('gelijknamig: 2-up on the full sheet, 1-up in a 628 px board card', () => {
        const b = block('gelijknamig');
        expect(colsAt(b, 688)).toBe(2);
        expect(colsAt(b, 628)).toBe(1);
    });

    test('the narrow subtypes keep 2-up in the card', () => {
        expect(colsAt(block('vereenvoudigen'), 628)).toBe(2);
        expect(colsAt(block('gemengd'), 628)).toBe(2);
    });
});
