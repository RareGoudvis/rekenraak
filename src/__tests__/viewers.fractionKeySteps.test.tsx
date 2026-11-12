// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';
import type { FractionExercise } from '../services/math/types';

afterEach(cleanup);

// Breuk van een hoeveelheid, zonder hulp: the key's working rows carry the calculation only when the teacher switched it on.
function keyText(extra: Record<string, unknown>, showSolutions = true): string {
    const constraints = { subType: 'hoeveelheid', answerFormat: 'zonder-hulp', maxDenominator: 5, maxTotal: 20, ...extra };
    const block = makeBlock('breuken', { constraints, leafId: 'breuken-hoeveelheid' });
    const ex: FractionExercise = { id: 'x', subType: 'hoeveelheid', numerator: 2, denominator: 3, total: 12, objectShape: 'circle', isManuallyEdited: false };
    (block as unknown as Record<string, unknown>)[REGISTRY['breuken'].exerciseField] = [ex];
    const { Viewer } = EXERCISE_UI['breuken'];
    const { container } = render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><Viewer block={block} showSolutions={showSolutions} /></BlockWidthProvider>);
    return container.textContent ?? '';
}

describe('hoeveelheid key with steps', () => {
    test('on: the compact calculation lines show, without the questions', () => {
        const t = keyText({ solutionSteps: 'basis' });
        expect(t).toContain('12 : 3 = 4');
        expect(t).toContain('2 × 4 = 8');
        expect(t).not.toContain('Hoeveel is één deel?');
    });
    test('off, absent or the pupil sheet: byte-for-byte the old rows', () => {
        expect(keyText({})).not.toContain('12 : 3');
        expect(keyText({ solutionSteps: 'uit' })).not.toContain('12 : 3');
        expect(keyText({ solutionSteps: 'basis' }, false)).not.toContain('12 : 3');
    });
});
