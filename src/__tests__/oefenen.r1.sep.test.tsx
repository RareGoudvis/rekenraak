// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { formatMathNumber } from '../services/math/formatters';
import { makeBlock } from './helpers/makeBlock';
// Loading the card module is what the pupil page does; it must narrow the thousands gap.
import '../oefenen/kiosk/ExerciseCard';

afterEach(cleanup);

describe('R1 thousands separator on the kiosk card', () => {
    test('formatMathNumber uses a narrow no-break space once the card is loaded', () => {
        expect(formatMathNumber(7400)).toBe('7 400');
        expect(formatMathNumber(1234567.5)).toBe('1 234 567.5'.replace('.', ','));
    });

    test('a getallenrij card shows "7 400" with U+202F, no plain space', () => {
        const leaf = flattenLeaves().find(l => l.id === 'getalbegrip-getallenrijen-nat')!;
        const block = makeBlock(leaf.typeId, { constraints: leaf.defaultConstraints });
        (block as unknown as Record<string, unknown>)[REGISTRY[leaf.typeId].exerciseField] = [
            { id: 'g', values: [7400, 7500, 7600], blankMask: [false, false, false], isManuallyEdited: false },
        ];
        const { Viewer } = EXERCISE_UI[leaf.typeId];
        const { container } = render(<BlockWidthProvider value={340}><Viewer block={block} showSolutions={false} /></BlockWidthProvider>);
        expect(container.textContent).toContain('7 400');
        expect(container.textContent).not.toContain('7 400');
    });
});
