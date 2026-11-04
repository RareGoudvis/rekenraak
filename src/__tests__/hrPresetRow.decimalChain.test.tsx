// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { makeBlock } from './helpers/makeBlock';

// The engine chains × and : on natural numbers only, so decimal ×/: offers no 3/4 picker
// (the report picked 3 factors on kommagetallen and got 2-factor sums).
const NOTE = 'Kettingen van 3 of 4 factoren enkel bij natuurlijke getallen.';

afterEach(cleanup);

function renderConfig(typeId: string, constraints: Record<string, unknown>) {
    const { Config } = EXERCISE_UI[typeId];
    const { container } = render(<Config block={makeBlock(typeId, { id: 'b', constraints })} />);
    const buttons = [...container.querySelectorAll('button')].map(b => (b.textContent ?? '').trim());
    return { hasPicker: ['2', '3', '4'].every(n => buttons.includes(n)), hasNote: (container.textContent ?? '').includes(NOTE) };
}

describe('aantal factoren picker', () => {
    test.each(['hr-std-vermenigvuldigen', 'hr-std-delen'])('%s decimal: note instead of the picker', (typeId) => {
        expect(renderConfig(typeId, { numberType: 'decimal' })).toEqual({ hasPicker: false, hasNote: true });
    });

    test.each(['hr-std-vermenigvuldigen', 'hr-std-delen'])('%s natural: picker, no note', (typeId) => {
        expect(renderConfig(typeId, { numberType: 'natural', multiplicationMode: 'andere' })).toEqual({ hasPicker: true, hasNote: false });
    });

    test.each(['hr-std-optellen', 'hr-std-aftrekken'])('%s decimal keeps its termen picker', (typeId) => {
        expect(renderConfig(typeId, { numberType: 'decimal' })).toEqual({ hasPicker: true, hasNote: false });
    });
});
