// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import MabSteps from '../components/steps/visuals/MabSteps';
import { mabOnlyPlan, mabPlan } from '../services/steps/mabSteps';
import { workedSteps } from '../services/math/workedSteps';
import type { Equation } from '../services/math/types';

// Owner 2026-11-14: E cubes in a kwadraatbeeld (1 3 5 7 9 over 2 4 6 8 10) and the second term's cubes in a
// second colour, so 3 + 4 shows the 3 and the 4 inside the 7.

afterEach(cleanup);

const eq = (a: number, b: number, op: '+' | '-' = '+'): Equation =>
    ({ id: 'e', operands: [a, b], operator: op, answer: op === '+' ? a + b : a - b, isManuallyEdited: false });

describe('second colour', () => {
    test('3 + 4: the four joining cubes are the second term, and stay so in the answer', () => {
        const plan = mabOnlyPlan(eq(3, 4))!;
        const [joined, together] = plan.stages;
        expect(joined!.clusters[0].second![0]).toEqual([false, false, false, true, true, true, true]);
        expect(together!.clusters[0].second![0]).toEqual([false, false, false, true, true, true, true]);
        expect(together!.clusters[0].pieces[0].every(s => s === 'have')).toBe(true);
    });

    test('8 + 5 with steps: the pieces still being added are the second term, the 8 is not', () => {
        const e = eq(8, 5);
        const plan = mabPlan(e, workedSteps(e)!)!;
        const first = plan.stages[0]!.clusters[0];
        first.pieces[0].forEach((s, i) => expect(first.second![0][i]).toBe(s === 'now' || s === 'wait'));
        expect(first.second![0].filter(x => !x)).toHaveLength(8);
    });

    test('a − sum has no second colour', () => {
        const plan = mabOnlyPlan(eq(7, 3, '-'))!;
        for (const s of plan.stages) expect(s?.clusters.every(c => !c.second?.[0]?.some(Boolean))).toBe(true);
    });
});

describe('kwadraatbeeld', () => {
    test('cubes fill in pairs, column by column: 1 and 2 stacked, 3 to the right of 1', () => {
        const { container } = render(<MabSteps data={eq(3, 4)} lines={[]} revealed={3} />);
        const cubes = [...container.querySelectorAll('.sv-mab-p.is-p0 rect')].map(r => ({ x: Number(r.getAttribute('x')), y: Number(r.getAttribute('y')) }));
        expect(cubes).toHaveLength(7);
        expect(cubes[1].x).toBe(cubes[0].x);
        expect(cubes[1].y).toBeGreaterThan(cubes[0].y);
        expect(cubes[2].x).toBeGreaterThan(cubes[0].x);
        expect(cubes[2].y).toBe(cubes[0].y);
        // 7 cubes: 4 columns, top row 1 3 5 7, bottom row 2 4 6.
        expect(new Set(cubes.map(c => c.x)).size).toBe(4);
        expect(container.querySelectorAll('.sv-mab-p.is-p0.is-b')).toHaveLength(4);
    });

    test('more than ten cubes start a second 2 × 5 block underneath', () => {
        const e = eq(9, 9);
        const { container } = render(<MabSteps data={e} lines={workedSteps(e)!} revealed={0} />);
        const ys = [...container.querySelectorAll('.sv-mab-p.is-p0 rect')].map(r => Number(r.getAttribute('y')));
        expect(ys).toHaveLength(18);
        expect(new Set(ys.slice(0, 10)).size).toBe(2);
        expect(Math.min(...ys.slice(10))).toBeGreaterThan(Math.max(...ys.slice(0, 10)));
    });
});
