// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';
import { geldMakeUp } from '../services/geld/geldMakeUp';

afterEach(cleanup);

function draw(leafId: string, showSolutions: boolean, patch?: (block: ReturnType<typeof makeBlock>) => void) {
    const leaf = flattenLeaves().find((l) => l.id === leafId)!;
    const block = makeBlock(leaf.typeId, { constraints: leaf.defaultConstraints, leafId });
    (block as unknown as Record<string, unknown>)[REGISTRY[leaf.typeId].exerciseField] = REGISTRY[leaf.typeId].generate(block);
    patch?.(block);
    const { Viewer } = EXERCISE_UI[leaf.typeId];
    return render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><Viewer block={block} showSolutions={showSolutions} /></BlockWidthProvider>).container;
}

describe('klok keys sit in the pupil\'s writing slot', () => {
    test.each(['klok-analoog-lezen', 'klok-analoog-omzetten', 'klok-digitaal-lezen'])('%s: the answer slot has the writing line / box height', (leafId) => {
        const slot = (sol: boolean) => {
            const item = draw(leafId, sol).querySelector('.print-exercise')!;
            cleanup();
            return item.lastElementChild as HTMLElement;
        };
        expect(slot(true).style.height).toBe(slot(false).style.height);
    });
});

describe('geld-teruggeven key', () => {
    test('only the answers are red: the given price and paid amount stay black', () => {
        const c = draw('geld-teruggeven', true, (block) => {
            (block.constraints as Record<string, unknown>).scaffolding = 'ingevuld';
            block.geldTeruggevenExercises = block.geldTeruggevenExercises!.slice(0, 1);
        });
        const texts = [...c.querySelectorAll('svg text')];
        const given = texts.filter((t) => /^€\d+,\d\d$/.test(t.textContent ?? ''));
        expect(given.length).toBe(3);
        const fills = given.map((t) => t.getAttribute('fill'));
        // price + paid amount (black) and the waypoint (red): exactly one red among the three amounts.
        expect(fills.filter((f) => f === '#000').length).toBe(2);
        expect(fills.filter((f) => f === 'var(--ink-solution)').length).toBe(1);
    });
});

describe('geld-tekenen key', () => {
    test('geldMakeUp: an exact make-up with the fewest pieces from the ticked set', () => {
        expect(geldMakeUp(345, [500, 200, 100, 50, 20, 10, 5])).toEqual([
            { key: '200', count: 1 }, { key: '100', count: 1 }, { key: '20', count: 2 }, { key: '5', count: 1 },
        ]);
        expect(geldMakeUp(60, [50, 20])).toEqual([{ key: '20', count: 3 }]);
        expect(geldMakeUp(30, [50, 20])).toEqual([]);
    });
    test('the key draws the coins and notes, the sheet does not', () => {
        const figures = (sol: boolean) => draw('geld-tekenen', sol).querySelectorAll('svg').length;
        expect(figures(true)).toBeGreaterThan(figures(false));
    });
});
