// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';
import { SOL_FILL } from '../components/viewer/solutionStyle';

afterEach(cleanup);

// One solution colour: the colouring keys fill with the solution red, never the old light blue.
const LEAVES = [
    'breuken-kleuren', 'breuken-hoeveelheid', 'deelbaarheid-rooster', 'deelbaarheid-kleurraster',
    'even-oneven-rooster', 'even-oneven-cirkels',
];

function html(leafId: string, showSolutions: boolean): string {
    const leaf = flattenLeaves().find((l) => l.id === leafId)!;
    const typeId = leaf.typeId;
    const block = makeBlock(typeId, { constraints: leaf.defaultConstraints, leafId });
    (block as unknown as Record<string, unknown>)[REGISTRY[typeId].exerciseField] = REGISTRY[typeId].generate(block);
    const { Viewer } = EXERCISE_UI[typeId];
    const { container } = render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><Viewer block={block} showSolutions={showSolutions} /></BlockWidthProvider>,
    );
    return container.innerHTML.toLowerCase();
}

describe('colouring keys use the solution red fill', () => {
    test('SOL_FILL is token based', () => {
        expect(SOL_FILL).toContain('var(--ink-solution)');
        expect(SOL_FILL).not.toMatch(/#[0-9a-f]{3,6}/i);
    });
    test.each(LEAVES)('%s: no light blue with solutions on', (leafId) => {
        const out = html(leafId, true);
        expect(out).not.toContain('#93c5fd');
        expect(out).not.toContain('rgb(147, 197, 253)');
    });
});
