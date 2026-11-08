import { describe, test, expect } from 'vitest';
import { generateGetallenasExercisesNoted } from '../services/getallenas/getallenasGenerator';
import { generateGetallenrijExercisesNoted } from '../services/getallenrij/getallenrijGenerator';
import { arrangeJumps, distinctJumps, fitPattern } from '../services/getallenas/jumps';
import { numberMatchesMask } from '../services/math/mathEngine';
import { REGISTRY } from '../config/exerciseRegistry';
import { generateForBlock, generateExtra } from '../services/generateDispatch';
import type { GetallenasExercise, MathBlock } from '../services/math/types';

const base = { numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6, numberMask: {}, fractionStep: 4, maxTeller: 25 };
const blk = (typeId: string, c: Record<string, unknown>, n = 8) => ({ typeId, numberOfExercises: n, constraints: { ...base, ...c } } as unknown as MathBlock);
const as = (c: Record<string, unknown>, n?: number) => generateGetallenasExercisesNoted(blk('getallenas', c, n));
const rij = (c: Record<string, unknown>, n?: number) => generateGetallenrijExercisesNoted(blk('getallenrijen', c, n));
const vals = (e: GetallenasExercise) => e.values as number[];
const diffs = (e: GetallenasExercise) => vals(e).slice(1).map((v, i) => Math.round(Math.abs(v - vals(e)[i]) * 1e6) / 1e6);

describe('getallenas with several jumps', () => {
    test('each line uses one jump and neighbours differ', () => {
        const { items } = as({ jumps: [5, 10, 20] });
        items.forEach((e, i) => {
            expect(new Set(diffs(e)).size).toBe(1);
            expect(e.step).toBe([5, 10, 20][i % 3]);
            if (i) expect(e.step).not.toBe(items[i - 1].step);
        });
    });
    test('the fewest ticks any jump needs apply to every line, with one note', () => {
        const { items, note } = as({ jumps: [5, 20], maxGetal: 100, ticks: 8 });
        expect(new Set(items.map(e => e.tickCount)).size).toBe(1);
        expect(items[0].tickCount).toBeLessThan(8);
        expect(note).toMatch(/Sprongen \+5, \+20/);
        for (const e of items) for (const v of vals(e)) expect(v).toBeLessThanOrEqual(100);
    });
    test('jumps that shrink onto each other are deduped after fitting', () => {
        const { items } = as({ jumps: [50, 100], maxGetal: 20, ticks: 6 });
        for (const e of items) expect(vals(e).every(v => v >= 0 && v <= 20)).toBe(true);
        expect(new Set(items.map(e => e.step)).size).toBeLessThanOrEqual(2);
    });
    test('decimal jumps stay exact', () => {
        const { items } = as({ numberType: 'decimal', maxGetal: 10, jumps: [0.1, 0.5], ticks: 5 });
        for (const e of items) for (const d of diffs(e)) expect([0.1, 0.5]).toContain(d);
    });
    test('descending and beide stay inside the range', () => {
        for (const direction of ['left', 'beide']) {
            const { items } = as({ jumps: [5, 10], direction });
            for (const e of items) expect(vals(e).every(v => v >= 0 && v <= 100)).toBe(true);
        }
    });
    test('fewer than 2 distinct jumps, or rational, is not mixed', () => {
        expect(distinctJumps({ jumps: [5, 5] })).toEqual([]);
        expect(distinctJumps({ numberType: 'rational', jumps: [1, 2] })).toEqual([]);
        expect(distinctJumps({ jumps: [5, 0, -3, 10] })).toEqual([5, 10]);
    });
});

describe('getallenrijen', () => {
    test('per-rij rotates like the line', () => {
        const { items } = rij({ jumps: [5, 10] });
        items.forEach((e, i) => { expect(e.step).toBe([5, 10][i % 2]); expect(e.jumps).toBeUndefined(); });
    });
    test('in-rij repeats the pattern; the first jumps+1 cells are given, then blanks', () => {
        const { items } = rij({ jumps: [5, 10], jumpMode: 'in-rij', ticks: 8, maxGetal: 200 }, 20);
        for (const e of items) {
            expect(e.jumps).toEqual([5, 10]);
            expect(e.step).toBe(5);
            expect(diffs(e)).toEqual([5, 10, 5, 10, 5, 10, 5]);
            expect(e.blankMask.slice(0, 3)).toEqual([false, false, false]);
            expect(e.blankMask.some(Boolean)).toBe(true);
            expect(e.start % 5).toBe(0);
        }
    });
    test('in-rij descending subtracts', () => {
        const { items } = rij({ jumps: [5, 10], jumpMode: 'in-rij', direction: 'left' });
        for (const e of items) {
            const v = vals(e);
            expect(v[1] - v[0]).toBe(-5);
            expect(v[2] - v[1]).toBe(-10);
            expect(Math.min(...v)).toBeGreaterThanOrEqual(0);
        }
    });
    test('in-rij with decimal jumps uses the gcd as step', () => {
        const { items } = rij({ numberType: 'decimal', maxGetal: 10, jumps: [0.5, 1.5], jumpMode: 'in-rij', direction: 'beide' }, 12);
        for (const e of items) {
            expect(e.step).toBe(0.5);
            expect(diffs(e).slice(0, 2)).toEqual([0.5, 1.5]);
            expect(Math.round(e.start * 2) / 2).toBe(e.start);
        }
    });
    test('a too-short row trims trailing jumps with a note, never a smaller jump', () => {
        const { items, note } = rij({ jumps: [10, 20, 40], jumpMode: 'in-rij', ticks: 4 });
        expect(note).toMatch(/alleen \+10, \+20/);
        for (const e of items) { expect(e.jumps).toEqual([10, 20]); expect(e.tickCount).toBe(4); }
    });
    test('a row that does not fit the range loses cells down to jumps + 2, then jumps', () => {
        const f = fitPattern(0, 40, [10, 20, 40], 6, 'right', 'vakjes')!;
        expect(f.jumps).toEqual([10, 20]);
        expect(f.ticks).toBe(4);
        expect(f.note).toBeTruthy();
        expect(fitPattern(0, 5, [10, 20], 6, 'right', 'vakjes')).toBeNull();
    });
    test('the first-value mask works with a gcd grid', () => {
        const mask = { E: true, T: true };
        const { items } = rij({ jumps: [5, 10], jumpMode: 'in-rij', numberMask: mask, maxGetal: 1000, ticks: 6 }, 10);
        for (const e of items) expect(numberMatchesMask(e.start, mask, 1000, 'natural', 0)).toBe(true);
    });
    test('the mask anchor cache is not shared across per-rij jumps', () => {
        const mask = { H: true, T: true, E: true };
        const { items } = rij({ jumps: [3, 7], numberMask: mask, maxGetal: 1000, ticks: 5 }, 12);
        for (const e of items) {
            expect(numberMatchesMask(e.start, mask, 1000, 'natural', 0)).toBe(true);
            expect(e.start % e.step).toBe(0);
        }
    });
});

describe('arrange and dispatch', () => {
    const mk = (steps: number[]) => steps.map(step => ({ step }));
    const stepsOf = (xs: unknown[]) => xs.map(x => (x as { step: number }).step);
    test('neighbours are made different, order otherwise stable', () => {
        const b = blk('getallenas', { jumps: [5, 10] });
        expect(stepsOf(arrangeJumps(mk([5, 5, 10, 10, 5]), b))).toEqual([5, 10, 5, 10, 5]);
        expect(stepsOf(arrangeJumps(mk([5, 10, 10]), b, { step: 5 }))).toEqual([10, 5, 10]);
    });
    test('no jumps or in-rij leaves the same array', () => {
        const items = mk([5, 5]);
        expect(arrangeJumps(items, blk('getallenas', {}))).toBe(items);
        expect(arrangeJumps(items, blk('getallenrijen', { jumps: [5, 10], jumpMode: 'in-rij' }))).toBe(items);
    });
    test('unique generation and count top-up keep neighbours different', () => {
        const b = blk('getallenas', { jumps: [5, 10], maxGetal: 1000 }, 6);
        const { items } = generateForBlock(b, true);
        const noNeighbours = (xs: unknown[]) => stepsOf(xs).forEach((s, i, all) => { if (i) expect(s).not.toBe(all[i - 1]); });
        noNeighbours(items);
        noNeighbours(generateExtra(b, items, 11, true).items);
        noNeighbours(generateExtra(b, items, 9, false).items);
    });
});

describe('kiosk', () => {
    const kiosk = REGISTRY['getallenas'].kiosk!;
    test('prepare rotates the jumps per exercise and keeps the whole list', () => {
        const c = { ...base, jumps: [5, 10, 20] };
        const seen = new Set<number>();
        for (const r of [0, 0.4, 0.9]) {
            const p = kiosk.prepare!(c, () => r) as { jumps: number[] };
            expect([...p.jumps].sort((a, b) => a - b)).toEqual([5, 10, 20]);
            seen.add(p.jumps[0]);
        }
        expect(seen.size).toBe(3);
        expect(kiosk.prepare!(base, () => 0.5)).toBe(base);
    });
    test('axisKeys sees a decimal among the jumps', () => {
        expect(kiosk.keys!({ ...base, jumps: [1, 2] })).not.toContain(',');
        expect(kiosk.keys!({ ...base, jumps: [1, 0.5] })).toContain(',');
    });
});
