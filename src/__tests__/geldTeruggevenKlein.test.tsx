// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock, generateFor } from './helpers/makeBlock';
import { EXERCISE_UI } from '../config/exerciseUI';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import type { GeldTeruggevenExercise, MathBlock } from '../services/math/types';

// Teruggeven 'Tot €1' / 'Tot €2': the price stays under the coin, the key still adds up,
// and a paid amount that IS the next whole euro draws one arc, not two.

function mulberry32(a: number) {
    return () => {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; cleanup(); });

function gen(constraints: Record<string, unknown>, seed: number, count = 6): GeldTeruggevenExercise[] {
    Math.random = mulberry32(seed);
    return generateFor(makeBlock('geld-teruggeven', { constraints, block: { numberOfExercises: count } })) as GeldTeruggevenExercise[];
}

describe('geld-teruggeven small ranges', () => {
    test('Tot €1: prices 0,05–0,95 paid with the €1 coin, one jump', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const exs = gen({ minPriceEuros: 0, maxPriceEuros: 0, payWithOptions: [100], centenDeel: 'vijf' }, seed);
            expect(exs.length).toBe(6);
            for (const ex of exs) {
                expect(ex.priceCents).toBeGreaterThanOrEqual(5);
                expect(ex.priceCents).toBeLessThanOrEqual(95);
                expect(ex.payWithCents).toBe(100);
                expect(ex.waypointCents).toBe(100);
                expect(ex.step2Cents).toBe(0);
                expect(ex.step1Cents + ex.step2Cents).toBe(ex.changeCents);
                expect(ex.changeCents).toBe(100 - ex.priceCents);
            }
        }
    });

    test('Tot €2: prices 0,05–1,95 paid with the €2 coin', () => {
        const seen = new Set<number>();
        for (let seed = 1; seed <= 40; seed++) {
            const exs = gen({ minPriceEuros: 0, maxPriceEuros: 1, payWithOptions: [200], centenDeel: 'tien' }, seed);
            expect(exs.length).toBe(6);
            for (const ex of exs) {
                expect(ex.priceCents).toBeGreaterThanOrEqual(5);
                expect(ex.priceCents).toBeLessThanOrEqual(195);
                expect(ex.payWithCents).toBe(200);
                expect([0, 100]).toContain(ex.step2Cents);
                expect(ex.step1Cents + ex.step2Cents).toBe(200 - ex.priceCents);
                seen.add(ex.step2Cents);
            }
        }
        // both shapes occur: a price under €1 (two jumps) and one above (one jump)
        expect(seen).toEqual(new Set([0, 100]));
    });

    test('a pool with fewer pairs than the count repeats them instead of coming up short', () => {
        // 25-cent prices under €1 paid with €1: exactly three distinct pairs
        const exs = gen({ minPriceEuros: 0, maxPriceEuros: 0, payWithOptions: [100], centenDeel: 'vijfentwintig' }, 7, 8);
        expect(exs.length).toBe(8);
        expect(new Set(exs.map(e => e.priceCents)).size).toBe(3);
        expect(new Set(exs.map(e => e.id)).size).toBe(8);
    });
});

function renderCell(ex: Partial<GeldTeruggevenExercise>, constraints: Record<string, unknown>, showSolutions = false) {
    const { Viewer } = EXERCISE_UI['geld-teruggeven'];
    const block = makeBlock('geld-teruggeven', { constraints }) as MathBlock & { geldTeruggevenExercises: GeldTeruggevenExercise[] };
    block.numberOfExercises = 1;
    block.geldTeruggevenExercises = [{
        id: 'x', priceCents: 35, payWithCents: 100, changeCents: 65, waypointCents: 100, step1Cents: 65, step2Cents: 0,
        isManuallyEdited: false, ...ex,
    } as GeldTeruggevenExercise];
    return render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <Viewer block={block} showSolutions={showSolutions} />
        </BlockWidthProvider>,
    );
}

describe('geld-teruggeven diagram', () => {
    test('paid = next whole euro: one arc, no euro-step label, paid amount at the waypoint', () => {
        for (const scaffolding of ['ingevuld', 'basis', 'structuur']) {
            const { container, unmount } = renderCell({}, { scaffolding }, true);
            const arcs = container.querySelectorAll('svg path[marker-end]');
            expect(arcs.length, scaffolding).toBe(1);
            expect(container.textContent).not.toContain('+ €');
            expect(container.textContent).toContain('+ 65 cent');
            const paid = [...container.querySelectorAll('svg text')].find(t => t.textContent === '€1,00');
            expect(paid?.getAttribute('x'), scaffolding).toBe('173');
            unmount();
        }
    });

    test('paid above the next whole euro keeps both arcs', () => {
        const { container } = renderCell({ priceCents: 935, payWithCents: 2000, changeCents: 1065, waypointCents: 1000, step1Cents: 65, step2Cents: 1000 }, { scaffolding: 'ingevuld' }, true);
        expect(container.querySelectorAll('svg path[marker-end]').length).toBe(2);
        expect(container.textContent).toContain('+ €10');
    });

    test('betalen met tekening draws a coin for €1 / €2 and a bill above', () => {
        const coin = renderCell({}, { betalenMetTekening: true });
        expect(coin.container.querySelector('svg circle')).not.toBeNull();
        coin.unmount();
        const bill = renderCell({ payWithCents: 500, changeCents: 465, step2Cents: 400 }, { betalenMetTekening: true });
        expect(bill.container.querySelector('svg rect')).not.toBeNull();
    });
});
