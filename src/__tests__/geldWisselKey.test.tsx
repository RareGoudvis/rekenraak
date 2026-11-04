// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import GeldWisselViewer from '../components/viewer/GeldWisselViewer';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { makeBlock, generateFor } from './helpers/makeBlock';
import type { MathBlock } from '../services/math/types';

// geld-wissel's key (sheet Oplossingen and the board 👁): the draw box shows one model exchange,
// smaller money that adds up to the shown bill, with the sum written in solution red.

afterEach(cleanup);

const BILLS = [500, 1000, 2000, 5000, 10000, 20000, 50000, 200, 100, 50, 20, 10];

function wisselBlock(bill: number): MathBlock {
    const block = makeBlock('geld-wissel', { constraints: { exerciseBills: [bill] } });
    block.geldWisselExercises = (generateFor(block) as MathBlock['geldWisselExercises'])!.slice(0, 1);
    return block;
}

const show = (block: MathBlock, showSolutions: boolean) => render(
    <BlockWidthProvider value={628}><GeldWisselViewer block={block} showSolutions={showSolutions} /></BlockWidthProvider>,
);

// "€ 2 + € 2 + 50 cent" → [200, 200, 50]
function partsOf(text: string): number[] {
    return text.split('+').map(s => s.trim()).map(s => {
        const euro = /^€ (\d+)$/.exec(s);
        if (euro) return Number(euro[1]) * 100;
        const cent = /^(\d+) cent$/.exec(s);
        if (cent) return Number(cent[1]);
        throw new Error(`unreadable part "${s}"`);
    });
}

describe('geld-wissel answer key', () => {
    test.each(BILLS)('bill %i cents: a model exchange in smaller money, sum in red', (bill) => {
        const block = wisselBlock(bill);
        const off = show(block, false);
        const offSvgs = off.container.querySelectorAll('svg').length;
        expect(off.container.querySelector('[data-wissel-key]')).toBeNull();
        off.unmount();

        const on = show(block, true);
        const key = on.container.querySelector<HTMLElement>('[data-wissel-key]');
        expect(key).not.toBeNull();
        expect(key!.style.color).toBe('var(--ink-solution)');
        const parts = partsOf(key!.textContent ?? '');
        expect(parts.reduce((s, v) => s + v, 0)).toBe(bill);
        for (const v of parts) expect(v).toBeLessThan(bill);
        // One drawn coin / bill per part, next to the shown bill.
        expect(on.container.querySelectorAll('svg').length).toBe(offSvgs + parts.length);
    });

    test('a 5 cent piece has nothing smaller: no key, no crash', () => {
        const on = show(wisselBlock(5), true);
        expect(on.container.querySelector('[data-wissel-key]')).toBeNull();
    });
});
