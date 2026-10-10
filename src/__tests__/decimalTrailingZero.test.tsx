// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { formatMathNumber } from '../services/math/formatters';
import AfrondenViewer from '../components/viewer/AfrondenViewer';
import OrdenenViewer from '../components/viewer/OrdenenViewer';
import type { AfrondenExercise, MathBlock, OrdenenExercise } from '../services/math/types';

// A fixed-decimals block prints every kommagetal with all its decimals: "4,10" beside "70,34",
// never "4,1" (the numbers are floats; their decimalPlaces travel with them to the formatter).

afterEach(cleanup);

test('formatMathNumber pads to the given decimals, exactly', () => {
    expect(formatMathNumber(4.1, 2)).toBe('4,10');
    expect(formatMathNumber(1234.5, 3)).toBe('1 234,500');
    expect(formatMathNumber(0.07, 2)).toBe('0,07');
    expect(formatMathNumber(12, 0)).toBe('12');
    expect(formatMathNumber(4.1)).toBe('4,1');
});

describe('afronden rooster 2 dp', () => {
    test('the generator stamps its decimals on the exercise', () => {
        const ex = generateFor(makeBlock('afronden', { constraints: { subType: 'rooster', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['E', 't'] } })) as AfrondenExercise[];
        for (const e of ex) expect(e.decimalPlaces).toBe(2);
    });
    test('a 4,1 prints as 4,10', () => {
        const block = { id: 'b', typeId: 'afronden', constraints: { subType: 'rooster', numberType: 'decimal', maxGetal: 100, decimalPlaces: 2, roundTargets: ['E', 't'] },
            afrondenExercises: [{ id: 'a', numbers: [4.1, 70.34, 63.8], decimalPlaces: 2, isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = render(<AfrondenViewer block={block} showSolutions={false} />);
        expect(container.textContent).toContain('4,10');
        expect(container.textContent).toContain('63,80');
        expect(container.textContent).toContain('70,34');
    });
});

describe('ordenen decimal', () => {
    test('the generator stamps its decimals on the exercise', () => {
        const ex = generateFor(makeBlock('ordenen', { constraints: { numberType: 'decimal', maxGetal: 1000, decimalPlaces: 2 } })) as OrdenenExercise[];
        for (const e of ex) expect(e.decimalPlaces).toBe(2);
    });
    test('544,3 prints as 544,30 on the sheet and in the key', () => {
        const values = [127.49, 544.3, 200.05];
        const block = { id: 'b', typeId: 'ordenen', constraints: { numberType: 'decimal', maxGetal: 1000, decimalPlaces: 2, count: 3 },
            ordenenExercises: [{ id: 'o', values, display: [544.3, 127.49, 200.05], operator: '<', decimalPlaces: 2, isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = render(<OrdenenViewer block={block} showSolutions />);
        expect(container.textContent).toContain('544,30');
        expect(container.textContent).not.toMatch(/544,3(?!0)/);
    });
});
