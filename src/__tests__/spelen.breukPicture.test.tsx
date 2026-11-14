// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import BreukPicture from '../oefenen/spelen/content/breuken/BreukPicture';
import {
    BREUK_KINDS, BOX, breukAriaLabel, clampBreuk, reepGrid, reepLayout, spotsIn, strookCells, wedgesOf, type Cell,
} from '../oefenen/spelen/content/breuken/breukGeometry';

const DS = Array.from({ length: 11 }, (_, i) => i + 2);
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

function cellsAreEqualAndApart(cells: Cell[], within: Cell) {
    const area = cells[0].w * cells[0].h;
    for (const c of cells) {
        expect(close(c.w * c.h, area)).toBe(true);
        expect(close(c.w, cells[0].w) && close(c.h, cells[0].h)).toBe(true);
        expect(c.x >= within.x - 1e-9 && c.y >= within.y - 1e-9).toBe(true);
        expect(c.x + c.w <= within.x + within.w + 1e-9 && c.y + c.h <= within.y + within.h + 1e-9).toBe(true);
    }
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i], b = cells[j];
        const overlap = a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.y < b.y + b.h - 1e-9 && b.y < a.y + a.h - 1e-9;
        expect(overlap).toBe(false);
    }
}

describe('breuk pictures: equal parts', () => {
    it('round kinds cut 360 degrees into d equal slices, the first from 12 o\'clock', () => {
        for (const d of DS) {
            const ws = wedgesOf(d);
            expect(ws).toHaveLength(d);
            expect(ws[0].start).toBe(0);
            expect(close(ws[d - 1].end, 360)).toBe(true);
            ws.forEach((w, i) => {
                expect(close(w.end - w.start, 360 / d)).toBe(true);
                if (i > 0) expect(close(w.start, ws[i - 1].end)).toBe(true);
            });
        }
    });

    it('every slice gets the same toppings, inside its own slice', () => {
        for (const d of DS) {
            const counts = wedgesOf(d).map(w => {
                const spots = spotsIn(w, [26, 13], 17, 5.5, 4.2);
                for (const s of spots) {
                    // The topping's centre angle lies inside the slice.
                    const deg = ((Math.atan2(s.y - BOX / 2, s.x - BOX / 2) * 180) / Math.PI + 90 + 360) % 360;
                    expect(deg > w.start && deg < w.end).toBe(true);
                }
                return spots.length;
            });
            expect(new Set(counts).size).toBe(1);
            expect(counts[0]).toBeGreaterThan(0);
        }
    });

    it('the reep is a grid of d equal pieces inside its frame, never a lone row past 11', () => {
        for (const d of DS) {
            const { rows, cols } = reepGrid(d);
            expect(rows * cols).toBe(d);
            const { frame, pieces } = reepLayout(d);
            expect(pieces).toHaveLength(d);
            cellsAreEqualAndApart(pieces, frame);
            expect(frame.x >= 0 && frame.x + frame.w <= BOX && frame.y >= 0 && frame.y + frame.h <= BOX).toBe(true);
        }
    });

    it('the strook is d equal squares in the box', () => {
        for (const d of DS) {
            const cells = strookCells(d);
            expect(cells).toHaveLength(d);
            cells.forEach(c => expect(close(c.w, c.h)).toBe(true));
            cellsAreEqualAndApart(cells, { x: 0, y: 0, w: BOX, h: BOX });
        }
    });
});

describe('BreukPicture renders', () => {
    it('d parts, exactly n coloured, for every kind, d and n', () => {
        for (const kind of BREUK_KINDS) for (const d of DS) for (const n of [0, 1, Math.floor(d / 2), d - 1, d]) {
            const { container, unmount } = render(<BreukPicture n={n} d={d} kind={kind} size={120} />);
            const svg = container.querySelector('svg')!;
            expect(svg.getAttribute('role')).toBe('img');
            expect(svg.getAttribute('width')).toBe('120');
            expect(container.querySelectorAll('[data-part]')).toHaveLength(d);
            expect(container.querySelectorAll('[data-part][data-on="true"]')).toHaveLength(n);
            // The coloured parts are the first n.
            const on = [...container.querySelectorAll('[data-part][data-on="true"]')].map(e => Number(e.getAttribute('data-part')));
            expect(on).toEqual(Array.from({ length: n }, (_, i) => i));
            // No text inside the picture.
            expect(container.querySelector('text')).toBeNull();
            expect(svg.textContent).toBe('');
            unmount();
        }
    });

    it('the reep and the round kinds colour only the first n parts', () => {
        const { container } = render(<BreukPicture n={3} d={8} kind="pizza" />);
        expect(container.querySelectorAll('.bp-crust')).toHaveLength(3);
        expect(container.querySelectorAll('.bp-dough')).toHaveLength(5);
        expect(container.querySelectorAll('.bp-cheese')).toHaveLength(3);
        const reep = render(<BreukPicture n={5} d={12} kind="reep" />).container;
        expect(reep.querySelectorAll('.bp-choc')).toHaveLength(5);
        expect(reep.querySelectorAll('.bp-white')).toHaveLength(7);
        const taart = render(<BreukPicture n={2} d={6} kind="taart" />).container;
        expect(taart.querySelectorAll('.bp-icing')).toHaveLength(2);
        expect(taart.querySelectorAll('.bp-sponge')).toHaveLength(4);
    });

    it('speaks the breuk in Dutch', () => {
        const label = (kind: typeof BREUK_KINDS[number], n: number, d: number) =>
            render(<BreukPicture n={n} d={d} kind={kind} />).container.querySelector('svg')!.getAttribute('aria-label');
        expect(label('pizza', 3, 8)).toBe('Pizza in 8 stukken, 3 met beleg');
        expect(label('taart', 1, 4)).toBe('Taart in 4 stukken, 1 met glazuur');
        expect(label('reep', 5, 12)).toBe('Chocoladereep in 12 stukjes, 5 gekleurd');
        expect(label('strook', 2, 3)).toBe('Strook in 3 vakjes, 2 gekleurd');
        expect(label('cirkel', 1, 2)).toBe('Cirkel in 2 delen, 1 gekleurd');
        for (const kind of BREUK_KINDS) expect(breukAriaLabel(kind, 1, 2)).toMatch(/ in 2 .*, 1 /);
    });

    it('clamps odd input instead of breaking', () => {
        expect(clampBreuk(5, 1)).toEqual({ n: 2, d: 2 });
        expect(clampBreuk(-1, 40)).toEqual({ n: 0, d: 12 });
        expect(clampBreuk(2.6, 7.4)).toEqual({ n: 3, d: 7 });
        expect(clampBreuk(NaN, NaN)).toEqual({ n: 0, d: 2 });
        const { container } = render(<BreukPicture n={9} d={30} kind="cirkel" />);
        expect(container.querySelectorAll('[data-part]')).toHaveLength(12);
        expect(container.querySelector('svg')!.getAttribute('aria-label')).toBe('Cirkel in 12 delen, 9 gekleurd');
    });
});
