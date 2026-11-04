import { describe, test, expect } from 'vitest';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';
import { tierWidthPx, monoTextPx } from '../services/layout/blockLayout';
import { sheetSizePx } from '../components/viewer/BlockWidthContext';
import { CM_PX, MAX_MATH_PX, monoPx, trueTierPx } from '../services/layout/trueSize';
import type { FractionExercise, MeetExercise } from '../services/math/types';

// Owner decision 2026-10-10 (2A): every meten figure prints at TRUE size, so the generator caps
// the drawn span to its column; the viewer never has to scale one down ("niet op ware grootte").

const span = (ex: MeetExercise) => {
    if (ex.kind === 'cirkel') return 2 * (ex.radius ?? 0);
    const xs = (ex.points ?? []).map(p => p.x), ys = (ex.points ?? []).map(p => p.y);
    return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
const dims = (ex: MeetExercise) => { const s = span(ex); return typeof s === 'number' ? { w: s, h: s } : s; };
const noted = (typeId: string, constraints: Record<string, unknown>, count = 200, widthUnits?: 1 | 2 | 4) =>
    REGISTRY[typeId].generateNoted!(makeBlock(typeId, { constraints, block: { numberOfExercises: count, ...(widthUnits && { widthUnits }) } }));

// The viewer's box around a figure (MetenViewer pad) at the largest Cijfers font, 16pt.
const LABEL_PAD = 22 + monoTextPx('99,9 cm'.length, 0.7, sheetSizePx('math', 16)) + 4;
const FULL = tierWidthPx(4);

describe('trueSize copies of the layout numbers', () => {
    test.each([1, 2, 4] as const)('tier %i matches blockLayout tierWidthPx', (w) => expect(trueTierPx(w)).toBe(tierWidthPx(w)));
    test('mono width and the largest font match blockLayout / BlockWidthContext', () => {
        expect(monoPx(7, 0.7, MAX_MATH_PX)).toBeCloseTo(monoTextPx(7, 0.7, sheetSizePx('math', 16)), 9);
    });
});

describe('lengte-meten: every path fits the full column at true size', () => {
    test.each([
        ['meten, 18 cm, 4 hoeken', { measureModel: 'meten', minLength: 3, maxLength: 18, maxCorners: 4 }, 42],
        ['meten, 20 cm straight', { measureModel: 'meten', minLength: 2, maxLength: 20, maxCorners: 0 }, 42],
        ['gegeven, 18 cm, 2 hoeken', { measureModel: 'gegeven', minLength: 3, maxLength: 18, maxCorners: 2 }, LABEL_PAD],
        ['mm, 18 cm, 3 hoeken', { measureModel: 'meten', precision: 'mm', minLength: 2, maxLength: 18, maxCorners: 3 }, 42],
    ])('%s', (_label, c, pad) => {
        const { items, note } = noted('lengte-meten', c);
        expect(items.length).toBe(200);
        for (const ex of items as MeetExercise[]) {
            const { w, h } = dims(ex);
            expect(w * CM_PX + 2 * pad, JSON.stringify(ex.points)).toBeLessThanOrEqual(FULL);
            expect(h * CM_PX + 2 * pad).toBeLessThanOrEqual(FULL);
            for (const s of ex.sides ?? []) expect(s).toBeLessThanOrEqual(c.maxLength);
            expect((ex.sides?.length ?? 1) - 1).toBeLessThanOrEqual(c.maxCorners);
        }
        expect(note).toMatch(/ware grootte/);
    });
    test('the default (3-10 cm, straight) is untouched and says nothing', () => {
        const { items, note } = noted('lengte-meten', {});
        expect(note).toBeNull();
        const lengths = (items as MeetExercise[]).map(ex => ex.perimeter);
        expect(Math.max(...lengths)).toBe(10);
        expect(Math.min(...lengths)).toBe(3);
    });
});

describe('omtrek: every shape fits the full column at true size', () => {
    const ALL = ['driehoek', 'rechthoek', 'vierkant', 'ruit', 'parallellogram', 'trapezium', 'vierhoek', 'vijfhoek', 'zeshoek', 'zevenhoek', 'achthoek', 'cirkel'];
    test.each([
        ['meten', { measureModel: 'meten' }, 42],
        ['gegeven', { measureModel: 'gegeven' }, LABEL_PAD],
        ['per-side blanks', { measureModel: 'meten', perSideScaffold: true }, Math.max(64, 22 + 38 + 3 + monoTextPx(2, 0.7, sheetSizePx('math', 16)) + 4)],
    ])('%s, every shape at 18 cm', (_label, c, pad) => {
        const { items, note } = noted('omtrek', { ...c, shapes: ALL, minLength: 3, maxLength: 18 });
        for (const ex of items as MeetExercise[]) {
            const { w, h } = dims(ex);
            expect(w * CM_PX + 2 * pad, `${ex.shape} ${ex.sides}`).toBeLessThanOrEqual(FULL);
            expect(h * CM_PX + 2 * pad).toBeLessThanOrEqual(FULL);
            for (const s of ex.sides ?? []) expect(s).toBeLessThanOrEqual(18);
        }
        expect(note).toMatch(/ware grootte/);
    });
    test('the default (driehoek / rechthoek / vierkant, 3-10 cm) is untouched and says nothing', () => {
        expect(noted('omtrek', {}).note).toBeNull();
    });
});

describe('breuken lijnstuk: the line fits its own column at true size', () => {
    const lijn = (widthUnits: 1 | 2 | 4, extra: Record<string, unknown> = {}) =>
        noted('breuken', { subType: 'lijnstuk', minLineLength: 4, maxLineLength: 12, ...extra }, 100, widthUnits);
    // A quarter-width lijnstuk prints at a half: its calc rows never fit a quarter.
    test.each([[1, 2], [2, 2], [4, 4]] as const)('width %i (prints at %i)', (w, at) => {
        const { items } = lijn(w);
        for (const ex of items as FractionExercise[]) {
            expect(ex.lineLength! * CM_PX + 16).toBeLessThanOrEqual(tierWidthPx(at));
            // Whole cm per part still.
            expect(ex.lineLength! % ex.denominator).toBe(0);
        }
    });
    test('a half never asks more than the cm it holds, and says so', () => {
        const { items, note } = lijn(2);
        expect(Math.max(...(items as FractionExercise[]).map(ex => ex.lineLength!))).toBeLessThanOrEqual(Math.floor((tierWidthPx(2) - 16) / CM_PX));
        expect(note).toMatch(/ware grootte/);
    });
    test('a minimum the column cannot hold gives way, whole cm per part kept', () => {
        const { items } = noted('breuken', { subType: 'lijnstuk', minLineLength: 10, maxLineLength: 12, minDenominator: 2, maxDenominator: 4 }, 50, 2);
        for (const ex of items as FractionExercise[]) {
            expect(ex.lineLength! * CM_PX + 16).toBeLessThanOrEqual(tierWidthPx(2));
            expect(ex.lineLength! % ex.denominator).toBe(0);
        }
    });
    test('the full width keeps the range: a 12 cm line, no note', () => {
        const { items, note } = lijn(4);
        expect(Math.max(...(items as FractionExercise[]).map(ex => ex.lineLength!))).toBe(12);
        expect(note).toBeNull();
    });
});
