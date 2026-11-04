// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import MabViewer from '../components/viewer/MabViewer';
import { BlockWidthProvider, ScaffoldProvider } from '../components/viewer/BlockWidthContext';
import { kioskCellBox, kioskMabLayout } from '../components/viewer/mabKioskLayout';
import { minWidthUnits } from '../services/layout/blockLayout';
import type { MathBlock, MabExercise } from '../services/math/types';

// MAB to 9 999 (2026-10-28): herkennen, and every sheet above 1000, lays each place in the 2-row
// square pattern; the column is sized from the pattern so nine duizendtallen fit their D column.

afterEach(cleanup);

const PX = 17.33; // em on the sheet at the 13pt default
const emPx = (v: string | null | undefined) => Number.parseFloat(v ?? '0') * PX;
const ex = (value: number): MabExercise => ({
    id: `m${value}`, value, thousands: Math.floor(value / 1000), hundreds: Math.floor(value / 100) % 10,
    tens: Math.floor(value / 10) % 10, units: value % 10, isManuallyEdited: false,
});
const blockOf = (typeId: string, c: Record<string, unknown>, values: number[]) =>
    ({ id: 'b', typeId, constraints: c, mabExercises: values.map(ex) }) as unknown as MathBlock;
const sheet = (block: MathBlock, solutions = false) =>
    render(<BlockWidthProvider value={688}><MabViewer block={block} showSolutions={solutions} /></BlockWidthProvider>).container;
// The drawing row's column track (em), the same for every place.
const colPx = (root: HTMLElement) => {
    const grids = [...root.querySelectorAll<HTMLElement>('.print-exercise div')].filter(d => /em\)$/.test(d.style.gridTemplateColumns));
    return emPx(/,\s*([\d.]+em)\)/.exec(grids[grids.length - 1].style.gridTemplateColumns)![1]);
};

describe('square pattern on the sheet', () => {
    test.each(['symbolic', 'mab-bw', 'mab-color'])('%s 9 999: nine duizendtallen fit the D column', (mabStyle) => {
        const root = sheet(blockOf('mab-herkennen', { maxNumber: 9999, mabStyle }, [9999]));
        const cubes = [...root.querySelectorAll<HTMLElement>('[data-mab-pattern="thousands"]')];
        expect(cubes).toHaveLength(9);
        // Five columns in two rows: squares of four, then one.
        expect(new Set(cubes.map(c => c.style.gridColumn)).size).toBe(5);
        expect(new Set(cubes.map(c => c.style.gridRow)).size).toBe(2);
        // SYNC check between MabViewer's PATTERN_GLYPH and MabBlocksSVG's: the drawn pattern fits the column.
        const svg = cubes[0].querySelector('svg')!;
        const grid = cubes[0].parentElement as HTMLElement;
        const across = 5 * emPx(svg.getAttribute('width')) + 4 * emPx(grid.style.columnGap) + 2 * emPx(cubes[2 * 2].style.marginLeft);
        expect(across).toBeLessThanOrEqual(colPx(root) - 4 + 0.1);
    });

    test('tekenen up to 1000 keeps its stacked layout; above 1000 it uses the pattern', () => {
        expect(sheet(blockOf('mab-tekenen', { maxNumber: 1000, mabStyle: 'mab-bw' }, [999]), true).querySelector('[data-mab-pattern]')).toBeNull();
        cleanup();
        expect(sheet(blockOf('mab-tekenen', { maxNumber: 9999, mabStyle: 'mab-bw' }, [9999]), true).querySelectorAll('[data-mab-pattern]')).toHaveLength(36);
    });

    test('two pieces lie side by side (two stacked rods read as one long rod)', () => {
        const root = sheet(blockOf('mab-herkennen', { maxNumber: 100, mabStyle: 'mab-bw' }, [22]));
        for (const place of ['tens', 'units']) {
            const cells = [...root.querySelectorAll<HTMLElement>(`[data-mab-pattern="${place}"]`)];
            expect(cells.map(c => [c.style.gridColumn, c.style.gridRow])).toEqual([['1', '2'], ['2', '2']]);
        }
    });

    test('the box grows to two rows of cubes at 9 999 (never clips them)', () => {
        const root = sheet(blockOf('mab-herkennen', { maxNumber: 9999, mabStyle: 'mab-bw', boxHeight: 40 }, [9999]));
        const draw = [...root.querySelectorAll<HTMLElement>('.print-exercise div')].find(d => d.style.height && d.style.gridTemplateColumns)!;
        // 2 x 34px cubes + 4px gap + 2 x 2px padding.
        expect(emPx(draw.style.height)).toBeGreaterThanOrEqual(76 - 0.1);
    });

    test('above 1000 the block floors at full width; up to 1000 at a half', () => {
        expect(minWidthUnits(blockOf('mab-herkennen', { maxNumber: 9999 }, []))).toBe(4);
        expect(minWidthUnits(blockOf('mab-tekenen', { maxNumber: 9999 }, []))).toBe(4);
        expect(minWidthUnits(blockOf('mab-herkennen', { maxNumber: 1000 }, []))).toBe(2);
    });
});

describe('the kiosk card at 9 999', () => {
    test('nine cubes fit the card cell and the card never takes the sheet pattern', () => {
        const box = kioskCellBox(340, 4);
        const { pieces } = kioskMabLayout('thousands', 9, box.w, box.h);
        for (const r of pieces) {
            expect(r.x).toBeGreaterThanOrEqual(0);
            expect(r.y).toBeGreaterThanOrEqual(0);
            expect(r.x + r.w).toBeLessThanOrEqual(box.w);
            expect(r.y + r.h).toBeLessThanOrEqual(box.h);
        }
        const block = blockOf('mab-herkennen', { maxNumber: 9999, mabStyle: 'mab-bw' }, [9999]);
        const { container } = render(<BlockWidthProvider value={340}><ScaffoldProvider value={false}><MabViewer block={block} showSolutions={false} /></ScaffoldProvider></BlockWidthProvider>);
        expect(container.querySelector('[data-mab-pattern]')).toBeNull();
        expect(container.querySelectorAll('[data-mab-kiosk-col]')).toHaveLength(4);
    });
});
