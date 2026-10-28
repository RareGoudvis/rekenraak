// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock } from './helpers/makeBlock';
import { SheetInk } from './helpers/sheetInk';

// Sheet ink comes from the page: text inherits `color`, SVG figures draw in currentColor.
// A hard-coded black left in a viewer would stay black when a teacher picks another ink,
// so every leaf renders under a blue ink and no rendered element may still paint black.
const BLACK = /^(#000|#000000|black|rgb\(0,\s*0,\s*0\))$/i;

// Deliberate blacks that are not ink: the MAB glyphs (MabBlocksSVG) use '#000' as the
// "default, no tint" sentinel that resolveFill switches on, and MAB colours stay out of the
// ink sweep. Only their SVG paint is exempt; the type's HTML text is still checked.
const SVG_INK_EXEMPT_TYPES = new Set(['mab-herkennen']);

function blackPaint(root: HTMLElement, typeId: string): string[] {
    const hits: string[] = [];
    for (const el of Array.from(root.querySelectorAll('*'))) {
        const isSvg = el instanceof SVGElement;
        if (isSvg && SVG_INK_EXEMPT_TYPES.has(typeId)) continue;
        const style = (el as HTMLElement | SVGElement).style;
        const props: [string, string | null | undefined][] = isSvg
            ? [['fill', el.getAttribute('fill')], ['stroke', el.getAttribute('stroke')], ['style.fill', style?.fill], ['style.stroke', style?.stroke], ['style.color', style?.color]]
            : [['style.color', style?.color]];
        for (const [k, v] of props) {
            if (v && BLACK.test(v.trim())) hits.push(`<${el.tagName.toLowerCase()}> ${k}=${v}`);
        }
    }
    return hits;
}

const leaves = flattenLeaves().map(l => [l.id, l.typeId, l.defaultConstraints ?? {}] as const);

afterEach(() => { cleanup(); });

describe.each(leaves)('%s', (leafId, typeId, constraints) => {
    test.each([false, true])('draws in the inherited ink, showSolutions=%s', (showSolutions) => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const { Viewer } = EXERCISE_UI[typeId];
        const def = REGISTRY[typeId];
        const block = makeBlock(typeId, { constraints, leafId });
        (block as unknown as Record<string, unknown>)[def.exerciseField] = def.generate(block);
        const { container } = render(
            <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
                <SheetInk color="#0000ff"><Viewer block={block} showSolutions={showSolutions} /></SheetInk>
            </BlockWidthProvider>,
        );
        spy.mockRestore();
        expect(blackPaint(container, typeId)).toEqual([]);
    });
});
