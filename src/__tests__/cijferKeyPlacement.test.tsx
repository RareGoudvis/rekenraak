// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import { cijferFill } from './helpers/fillCells';
import CijferViewer from '../components/viewer/CijferViewer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { cijferCheck, cijferKioskGrid, kioskMulRows } from '../services/cijferen/cijferCells';
import type { CijferExercise, MathBlock } from '../services/math/types';
import { divideToDecimals } from '../services/cijferen/cijferGenerator';

// WHERE the answer key's red digits sit, not just which: a carry over the column it goes INTO
// (where a pupil writes it), and the partial products units-first, both as the kiosk reads them.

afterEach(cleanup);

function exOf(operator: CijferExercise['operator'], operands: number[], answer: number, dp = 0): CijferExercise {
    return { id: 'ex1', operands, operator, answer, remainder: 0, isManuallyEdited: false, decimalPlaces: dp };
}

function renderKey(typeId: string, ex: CijferExercise, scaffolding: number): HTMLElement {
    const block: MathBlock = {
        ...makeBlock(typeId, { id: 'b1', constraints: { operator: ex.operator, numberType: ex.decimalPlaces ? 'decimal' : 'natural', decimalPlaces: ex.decimalPlaces || 2, scaffolding } }),
        numberOfExercises: 1,
        cijferExercises: [ex],
    };
    return render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <CijferViewer block={block} showSolutions />
        </BlockWidthProvider>,
    ).container;
}

interface RedDigit { char: string; col: number; row: number; small: boolean }

// The red grid digits with their grid column / row (one DC is one cell wide and tall).
function redDigits(container: HTMLElement): RedDigit[] {
    const els = Array.from(container.querySelectorAll<HTMLElement>('div[style*="--ink-solution"]')).filter(el => el.style.position === 'absolute');
    const cell = Math.max(...els.map(el => parseFloat(el.style.width)));
    return els.map(el => ({
        char: el.textContent ?? '',
        col: Math.round(parseFloat(el.style.left) / cell),
        row: Math.round(parseFloat(el.style.top) / cell),
        small: parseFloat(el.style.fontSize) < cell * 0.6,
    }));
}

const ADD_CASES: Array<[string, CijferExercise]> = [
    ['525 + 445', exOf('+', [525, 445], 970)],
    ['999 + 1', exOf('+', [999, 1], 1000)],
    ['486 + 275 + 139', exOf('+', [486, 275, 139], 900)],
    ['12,50 + 3,75', exOf('+', [12.5, 3.75], 16.25, 2)],
    ['7,8 + 5,46', exOf('+', [7.8, 5.46], 13.26, 2)],
];

describe('cijferen optellen key: the carry sits over the column it goes into', () => {
    for (const scaffolding of [1, 2, 3]) {
        test(`525 + 445, scaffolding ${scaffolding}: the 1 is over the T (grid col 2), not the E`, () => {
            const carries = redDigits(renderKey('cijferen-optellen-nat', ADD_CASES[0][1], scaffolding)).filter(d => d.small);
            expect(carries.map(d => [d.char, d.col])).toEqual([['1', 2]]);
        });
    }

    for (const [name, ex] of ADD_CASES) {
        test(`${name}: the sheet's carries are the kiosk's carry cells`, () => {
            const dp = ex.decimalPlaces ?? 0;
            const sheet = redDigits(renderKey(ex.decimalPlaces ? 'cijferen-optellen-dec' : 'cijferen-optellen-nat', ex, 1))
                .filter(d => d.small).map(d => `${d.col}:${d.char}`).sort();
            const { cells } = cijferKioskGrid(ex, dp);
            const { wants } = cijferCheck(ex, dp, true);
            const kiosk = cells.map((c, i) => ({ c, want: wants[i] }))
                .filter(({ c, want }) => c.role === 'carry' && !want.startsWith('|'))
                .map(({ c, want }) => `${c.col}:${want}`).sort();
            expect(sheet).toEqual(kiosk);
        });
    }
});

// The red full-size rows of a multiplication key, top to bottom, each read left to right.
function keyRows(container: HTMLElement): string[] {
    const rows = new Map<number, RedDigit[]>();
    for (const d of redDigits(container).filter(d => !d.small)) rows.set(d.row, [...(rows.get(d.row) ?? []), d]);
    return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, ds]) => ds.sort((a, b) => a.col - b.col).map(d => d.char).join(''));
}

describe('cijferen vermenigvuldigen key: partial products units-first', () => {
    const ex = exOf('x', [1246, 73], 90958);
    for (const scaffolding of [1, 2, 3]) {
        test(`1246 × 73, scaffolding ${scaffolding}: 3738 above 87220 above 90958`, () => {
            expect(keyRows(renderKey('cijferen-vermenigvuldigen-nat', ex, scaffolding))).toEqual(['3738', '87220', '90958']);
        });
    }

    test('three-digit multiplier: 214 × 365 stacks × 5, × 60, × 300', () => {
        expect(keyRows(renderKey('cijferen-vermenigvuldigen-nat', exOf('x', [214, 365], 78110), 1))).toEqual(['1070', '12840', '64200', '78110']);
    });

    test('the kiosk fill writes the same row order (p0 = the units product, top)', () => {
        const keys = cijferKioskGrid(ex, 0).cells.map(c => c.key);
        const { answer } = cijferFill(ex, keys);
        const row = (r: number) => keys.filter(k => k.startsWith(`p${r}_`)).sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1])).map(k => answer[k]).join('');
        expect(kioskMulRows(2).ppRows).toBe(2);
        expect([row(0), row(1)]).toEqual(['3738', '87220']);
    });
});

// The printed top row of a staartdeling (dividend | divisor), digits and commas left to right.
function divisionTopRow(container: HTMLElement): string {
    return Array.from(container.querySelectorAll<HTMLElement>('div'))
        .filter(el => el.style.position === 'absolute' && parseFloat(el.style.top) === 0 && /^[\d,]$/.test(el.textContent ?? ''))
        .sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left))
        .map(el => el.textContent).join('');
}

describe('cijferen delen-dec: the grid writes the numbers as they are, never rounded', () => {
    const cases: Array<[number, number, string]> = [
        [336.6, 0.7, '336,60|0,7'],
        [336.6, 0.3, '336,60|0,3'],
        [12.25, 0.25, '12,25|0,25'],
        [742, 0.1, '742,00|0,1'],
        [86.5, 7, '86,50|7'],
    ];
    for (const [a, b, want] of cases) {
        test(`${a} : ${b} prints ${want}`, () => {
            const { quotient, remainder } = divideToDecimals(a, b, 2);
            const container = renderKey('cijferen-delen-dec', { ...exOf(':', [a, b], quotient, 2), remainder }, 1);
            expect(divisionTopRow(container)).toBe(want.replace('|', ''));
        });
    }
});

describe('cijferen delen-dec key: the quotient row fits the shifted dividend (O25)', () => {
    test('742,4 : 0,7 = 1060,57 draws six quotient digits in the kiosk card\'s columns', () => {
        const { quotient, remainder } = divideToDecimals(742.4, 0.7, 2);
        const ex = { ...exOf(':', [742.4, 0.7], quotient, 2), remainder };
        const container = renderKey('cijferen-delen-dec', ex, 1);
        const q = redDigits(container).filter(d => d.row === 1 && !d.small).sort((a, b) => a.col - b.col);
        expect(q.map(d => d.char).join('')).toBe('106057');
        // Every quotient digit inside the grid: the svg is one px wider than its columns.
        const cell = parseFloat((container.querySelector('div[style*="--ink-solution"]') as HTMLElement).style.width);
        const gridCols = Math.floor(Number(container.querySelector('svg')!.getAttribute('width')) / cell);
        expect(Math.max(...q.map(d => d.col))).toBeLessThan(gridCols);
        const kioskCols = cijferKioskGrid(ex, 2).cells.filter(c => c.role === 'quotient').map(c => c.col);
        expect(q.map(d => d.col)).toEqual(kioskCols);
    });
});
