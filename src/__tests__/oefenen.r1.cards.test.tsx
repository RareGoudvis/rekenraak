// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { EMPTY_INTERACTION, ViewerInteractionProvider, type InteractionKind } from '../components/viewer/ViewerInteractionContext';
import type { MathBlock } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';

afterEach(cleanup);

function blockWith(typeId: string, constraints: Record<string, unknown>, patch?: (b: MathBlock) => void): MathBlock {
    const def = REGISTRY[typeId];
    const block = makeBlock(typeId, { constraints });
    (block as unknown as Record<string, unknown>)[def.exerciseField] = def.generate(block);
    patch?.(block);
    return block;
}

function renderCard(block: MathBlock, width = 338, kiosk = true, kind: InteractionKind = 'tap') {
    const { Viewer } = EXERCISE_UI[block.typeId];
    const inner = <Viewer block={block} showSolutions={false} />;
    return render(<BlockWidthProvider value={width}>{kiosk ? <ViewerInteractionProvider value={{ kind, state: EMPTY_INTERACTION, set: () => { } }}>{inner}</ViewerInteractionProvider> : inner}</BlockWidthProvider>);
}

describe('R1 even-oneven-cirkels', () => {
    test.each([3, 8, 7, 1, 10])('the kiosk card draws exactly %i circles', n => {
        const block = blockWith('even-oneven', { subType: 'cirkels' }, b => {
            const ex = b.evenOnevenExercises as unknown as Array<{ number: number }>;
            ex.splice(1);
            ex[0].number = n;
        });
        const { container } = renderCard(block);
        expect(container.querySelectorAll('svg circle')).toHaveLength(n);
    });
});
