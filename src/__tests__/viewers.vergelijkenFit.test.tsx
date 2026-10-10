// @vitest-environment jsdom
import { test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import VergelijkenViewer from '../components/viewer/VergelijkenViewer';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';
import { fitMonoFactor } from '../services/layout/blockLayout';

afterEach(cleanup);

test('fitMonoFactor: 1 while the text fits, a step down (floored) when it does not', () => {
    expect(fitMonoFactor(10, 1, 17.33, 200)).toBe(1);
    expect(fitMonoFactor(10, 1, 17.33, 90)).toBeCloseTo(90 / (10 * 0.65 * 17.33));
    expect(fitMonoFactor(10, 1, 17.33, 10)).toBe(0.7);
});

// pw021: "1H2T7E5t" ran 5-14 px out of its cell at a half / quarter.
test.each([338, 163])('representaties woorden vs plaatswaarde at %ipx: the code never wraps and steps its font down', (width) => {
    const block = makeBlock('vergelijken', { constraints: { subType: 'representaties', leftRep: 'woorden', rightRep: 'plaatswaarde', maxGetal: 1000, decimalPlaces: 3 } });
    block.vergelijkenExercises = [{ id: 'a', a: 127.5, b: 98.25 } as never];
    const { container } = render(<BlockWidthProvider value={width}><VergelijkenViewer block={block} showSolutions={false} /></BlockWidthProvider>);
    const code = [...container.querySelectorAll('span')].find((s) => /^\d[HTEte]/.test(s.textContent ?? '') && s.children.length === 0) as HTMLElement;
    expect(code).toBeTruthy();
    expect(code.style.whiteSpace).toBe('nowrap');
    if (width === 163) expect(code.style.fontSize).toMatch(/em$/);
});
