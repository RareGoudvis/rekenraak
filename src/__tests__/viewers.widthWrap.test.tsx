// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import { BlockWidthProvider, cellWidthPx, sheetSizePx } from '../components/viewer/BlockWidthContext';
import GetallenasViewer from '../components/viewer/GetallenasViewer';
import EvenOnevenViewer from '../components/viewer/EvenOnevenViewer';
import PatroonViewer from '../components/viewer/PatroonViewer';
import HerleidingenViewer from '../components/viewer/HerleidingenViewer';
import GeldRekenenViewer from '../components/viewer/GeldRekenenViewer';
import DeelbaarheidViewer from '../components/viewer/DeelbaarheidViewer';
import RekenvolgordeViewer from '../components/viewer/RekenvolgordeViewer';
import RomeinseViewer from '../components/viewer/RomeinseViewer';
import ProcentenViewer from '../components/viewer/ProcentenViewer';
import CijferViewer from '../components/viewer/CijferViewer';
import OrdenenViewer from '../components/viewer/OrdenenViewer';
import WeegschaalViewer from '../components/viewer/WeegschaalViewer';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { monoTextPx } from '../services/layout/blockLayout';
import { formatMathNumber } from '../services/math/formatters';
import type { MathBlock, GetallenasExercise, HerleidingExercise } from '../services/math/types';

// Sweep S5 (width & wrap): jsdom has no layout, so these read the px the viewers put in
// their inline styles and check them against the glyph-advance estimate the viewers share.

afterEach(cleanup);

const W = { full: 688, half: cellWidthPx(2, 28), quarter: cellWidthPx(1, 28) };
const at = (width: number, el: ReactElement) => render(<BlockWidthProvider value={width}>{el}</BlockWidthProvider>);
const px = (v: string | undefined) => Number.parseFloat(v ?? '0');

describe('getallenas: the outer tick labels stay inside the axis box', () => {
    const ex = (values: number[]): GetallenasExercise => ({
        id: 'g1', start: values[0], step: values[1] - values[0], tickCount: values.length,
        blankMask: values.map(() => false), direction: 'right', values, numberType: 'natural', isManuallyEdited: false,
    });
    test.each([
        ['six ticks at 1e5', [99_000, 99_200, 99_400, 99_600, 99_800, 100_000]],
        ['ten ticks at 1e5', Array.from({ length: 10 }, (_, i) => 90_000 + i * 1_000)],
    ])('%s', (_n, values) => {
        const block = { id: 'b', typeId: 'getallenas', getallenasExercises: [ex(values)] } as unknown as MathBlock;
        const { container } = at(W.full, <GetallenasViewer block={block} showSolutions={false} />);
        const box = container.querySelector('.print-exercise > div') as HTMLElement;
        const boxW = px(box.style.width);
        expect(boxW).toBeLessThanOrEqual(W.full);
        const labels = [...box.querySelectorAll(':scope > div')] as HTMLElement[];
        for (const l of labels) {
            const span = l.querySelector('span') as HTMLElement;
            const half = monoTextPx(span.textContent!.length, 1, px(span.style.fontSize)) / 2;
            expect(px(l.style.left) - half).toBeGreaterThanOrEqual(0);
            expect(px(l.style.left) + half).toBeLessThanOrEqual(boxW);
        }
    });
});

// `calc(var(--sheet-size-math) * f [- 1px])` at the 13pt default; jsdom does not resolve calc.
const MATH_PX = 17.333;
const mathCalcPx = (css: string) => {
    const m = /^calc\(var\(--sheet-size-math\) \* ([\d.]+)(?: - (\d+)px)?\)$/.exec(css.trim());
    if (!m) throw new Error(`not a math-token length: ${css}`);
    return Number(m[1]) * MATH_PX - Number(m[2] ?? 0);
};

describe('even-oneven rooster: cells hold their number on one line and share borders', () => {
    test.each([[[7, 42, 365]], [[1_234, 9_029, 10_000]]])('%j', (numbers) => {
        const block = { id: 'b', typeId: 'even-oneven', constraints: { subType: 'rooster', perRow: 10 }, evenOnevenExercises: [{ id: 'e', numbers }] } as unknown as MathBlock;
        const { container } = at(W.full, <EvenOnevenViewer block={block} showSolutions={false} />);
        const grid = container.querySelector('.print-exercise') as HTMLElement;
        const cells = [...grid.children] as HTMLElement[];
        const chars = Math.max(...cells.map(c => c.textContent!.length));
        for (const cell of cells) {
            expect(cell.style.whiteSpace).toBe('nowrap');
            // border 2 + a little air around the widest number at the cell's 0.81 factor
            expect(mathCalcPx(cell.style.width)).toBeGreaterThanOrEqual(monoTextPx(chars, 0.81, MATH_PX) + 2);
            expect(cell.style.marginLeft === '' || cell.style.marginLeft === '0px').toBe(true);
        }
        // One track per cell, one px narrower than the cell: neighbours overlap on the shared border.
        const track = /repeat\(\d+, (.+)\)$/.exec(grid.style.gridTemplateColumns)![1];
        expect(mathCalcPx(track)).toBeCloseTo(mathCalcPx(cells[0].style.width) - 1, 3);
    });
});

describe('getalpatronen: terms never break and the row fits its column', () => {
    const block = (values: number[][], c: Record<string, unknown> = {}) => ({
        id: 'b', typeId: 'getalpatronen', constraints: c,
        patroonExercises: values.map((v, i) => ({ id: `p${i}`, values: v, blankMask: v.map((_, j) => j >= v.length - 2), cycle: [{ op: '+', operand: 10 }], isManuallyEdited: false })),
    }) as unknown as MathBlock;
    // The row's own font factor, from the grid's `calc(var(--sheet-size-math) * f)`.
    const factorOf = (el: HTMLElement) => Number(/\* ([\d.]+)\)/.exec(el.style.fontSize)![1]);
    test.each([
        ['five-digit terms, 6 ticks', [[97_055, 97_065, 97_075, 97_085, 97_095, 97_105]], W.full],
        ['four-digit terms, 6 ticks, half', [[9_055, 9_065, 9_075, 9_085, 9_095, 9_105]], W.half],
        ['five-digit terms, 10 ticks', [Array.from({ length: 10 }, (_, i) => 90_005 + 1_000 * i)], W.full],
    ])('%s', (_n, values, width) => {
        const { container } = at(width, <PatroonViewer block={block(values)} showSolutions />);
        const row = container.querySelector('.print-exercise') as HTMLElement;
        const f = factorOf(row);
        const chars = Math.max(...values.flat().map(v => formatMathNumber(v).length));
        const numberCells = [...row.children].filter((_, i) => i % 2 === 0) as HTMLElement[];
        for (const cell of numberCells) expect(cell.style.whiteSpace).toBe('nowrap');
        // Track minimums: every number track holds the widest term at the row's factor ...
        const mins = [...row.style.gridTemplateColumns.matchAll(/minmax\(([\d.]+)px/g)].map(m => Number(m[1]));
        expect(mins.length).toBe(values[0].length * 2 - 1);
        expect(mins[0]).toBeGreaterThanOrEqual(monoTextPx(chars, f, MATH_PX));
        // ... and the whole row, gaps included, fits the column.
        const gaps = (mins.length - 1) * px(row.style.columnGap);
        expect(mins.reduce((a, b) => a + b, 0) + gaps).toBeLessThanOrEqual(width);
    });
    test('negative terms are separated by a semicolon, with a true minus', () => {
        const { container } = at(W.full, <PatroonViewer block={block([[-53, -43, -33, -23]])} showSolutions />);
        const text = container.textContent!;
        expect(text).not.toContain('–');
        expect(text).toContain('−53;');
        expect(text).not.toMatch(/-\d/);
    });
    test('a block without negatives keeps the dash (the plain-dash default)', () => {
        const { container } = at(W.full, <PatroonViewer block={block([[3, 13, 23]])} showSolutions />);
        expect(container.textContent).toContain('–');
    });
});

describe('herleidingen: a number never breaks, the row steps its font to fit', () => {
    const block = (ex: Partial<HerleidingExercise>, c: Record<string, unknown> = {}) => ({
        id: 'b', typeId: 'herleidingen', constraints: { measure: 'oppervlakte', ...c },
        herleidingExercises: [{ id: 'h1', format: 'enkel-getal', isManuallyEdited: false, ...ex }],
    }) as unknown as MathBlock;
    const factorOf = (el: HTMLElement) => Number(/\* ([\d.]+)\)/.exec(el.style.fontSize)![1]);
    // Every number/unit pair sits in one nowrap span; the row wraps between pairs only.
    const pairsNowrap = (root: HTMLElement) => {
        const nums = [...root.querySelectorAll('span')].filter(s => s.children.length === 0 && /^\d{1,3}( \d{3})+$/.test(s.textContent ?? ''));
        expect(nums.length).toBeGreaterThan(0);
        for (const n of nums) expect(n.closest('span[style*="nowrap"]')).not.toBeNull();
    };
    test('the red answer "977 000 445" stays whole', () => {
        const { container } = at(W.full, <HerleidingenViewer block={block({ fromParts: [{ key: 'a', value: 977 }, { key: 'cm²', value: 445 }], toParts: [{ key: 'cm²', value: 977_000_445 }], blank: 'number' })} showSolutions />);
        pairsNowrap(container);
    });
    test.each([[W.full, 0.92], [340, 0.85]])('a long given number on the answer side at %ipx', (width, maxFactor) => {
        const { container } = at(width, <HerleidingenViewer block={block({ fromParts: [{ key: 'ha', value: 24 }], toParts: [{ key: 'dm²', value: 24_000_000_000 }], blank: 'unit' })} showSolutions={false} />);
        pairsNowrap(container);
        const row = container.querySelector('.print-exercise') as HTMLElement;
        expect(factorOf(row)).toBeLessThanOrEqual(maxFactor);
        if (width === W.full) expect(factorOf(row)).toBe(0.92);
    });
});

// Every leaf text node that holds a thousands-grouped number sits under a nowrap element.
const groupedNumbersNowrap = (root: HTMLElement) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let seen = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!/\d{1,3} \d{3}/.test(n.textContent ?? '')) continue;
        seen++;
        expect((n.parentElement as HTMLElement).closest('[style*="nowrap"]'), n.textContent ?? '').not.toBeNull();
    }
    expect(seen).toBeGreaterThan(0);
};

describe('geld-rekenen: amounts never split, columns hold the widest amount', () => {
    const ch = (col: string) => Number(/^([\d.]+)ch$/.exec(col)![1]);
    test.each([
        ['intrest', { subType: 'intrest', capitalCents: 902_860, percent: 2, months: 12 }],
        ['winst / verlies', { subType: 'winst', buyCents: 1_240_400, sellCents: 1_200_000 }],
    ])('%s', (subType, ex) => {
        const block = { id: 'b', typeId: 'geld-rekenen', constraints: { subType: ex.subType }, geldRekenenExercises: [{ id: 'g', isManuallyEdited: false, ...ex }] } as unknown as MathBlock;
        const { container } = at(W.full, <GeldRekenenViewer block={block} showSolutions />);
        groupedNumbersNowrap(container);
        const rows = [...container.querySelectorAll('.print-exercise')] as HTMLElement[];
        const cols = rows[1].style.gridTemplateColumns.split(' ').map(ch);
        [...rows[1].children].forEach((cell, i) => expect(cols[i], `${subType} col ${i}`).toBeGreaterThanOrEqual(cell.textContent!.length + 1));
    });
});

describe('deelbaarheid: numbers print with the thousands space, never split', () => {
    test('tabel at 1e5', () => {
        const block = { id: 'b', typeId: 'deelbaarheid', constraints: { layout: 'tabel', divisors: [2, 3] }, deelbaarheidExercises: [{ id: 'd', number: 70_344, isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = at(W.full, <DeelbaarheidViewer block={block} showSolutions />);
        expect(container.textContent).toContain('70 344');
        groupedNumbersNowrap(container);
        // The number column is sized in `ch` of the grid's own font, which must be the cells' mono.
        const row = container.querySelector('.print-exercise') as HTMLElement;
        expect(row.style.fontFamily).toContain('Azeret Mono');
    });
    test('veelvouden at 1e4', () => {
        const block = { id: 'b', typeId: 'deelbaarheid', constraints: { layout: 'veelvouden' }, deelbaarheidExercises: [{ id: 'd', base: 1_250, sequence: [1_250, 2_500, 3_750, 5_000, 6_250], givenCount: 2, isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = at(W.full, <DeelbaarheidViewer block={block} showSolutions />);
        expect(container.textContent).toContain('1 250');
        groupedNumbersNowrap(container);
    });
    test('tight card at a quarter', () => {
        const block = { id: 'b', typeId: 'deelbaarheid', constraints: { layout: 'tabel', divisors: [2, 3] }, deelbaarheidExercises: [{ id: 'd', number: 70_344, isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = at(W.quarter, <DeelbaarheidViewer block={block} showSolutions />);
        expect(container.textContent).toContain('70 344');
    });
});

describe('rekenvolgorde / romeinse: text columns follow the Cijfers slider', () => {
    const setMathPt = (pt: number) => useWorksheetStore.setState(st => ({ docSettings: { ...st.docSettings, fontSizeMath: pt } }));
    afterEach(() => setMathPt(13));
    test.each([13, 16])('rekenvolgorde expression column at %ipt', (pt) => {
        setMathPt(pt);
        const block = { id: 'b', typeId: 'rekenvolgorde', constraints: {}, layoutPreset: 'inline-short', rekenvolgordeExercises: [{ id: 'r', tokens: ['(', 125, '+', 375, ')', 'x', 4, '-', 1_000], answer: 1_000, firstStep: 500, isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = at(W.full, <RekenvolgordeViewer block={block} showSolutions={false} />);
        const expr = [...container.querySelectorAll('span')].find(sp => sp.style.whiteSpace === 'pre') as HTMLElement;
        expect(px(expr.style.width)).toBeGreaterThanOrEqual(monoTextPx(expr.textContent!.length, 1, sheetSizePx('math', pt)) - 0.5);
    });
    test.each([13, 16])('romeinse prompt column at %ipt', (pt) => {
        setMathPt(pt);
        const block = { id: 'b', typeId: 'romeinse-cijfers', constraints: { subType: 'herkennen' }, romeinseExercises: [{ id: 'r', value: 3_999, roman: 'MMMCMXCIX', isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = at(W.full, <RomeinseViewer block={block} showSolutions />);
        const prompt = [...container.querySelectorAll('span')].find(sp => sp.textContent === 'MMMCMXCIX') as HTMLElement;
        // 1.04 x the token per glyph plus the 1px letter-spacing
        const need = monoTextPx(9, 1.04, sheetSizePx('math', pt)) + 9;
        expect(px(prompt.style.width)).toBeGreaterThanOrEqual(need);
    });
});

describe('narrow cells: an equation never breaks inside its sentence or a number', () => {
    const factorOf = (el: HTMLElement) => Number(/\* ([\d.]+)\)/.exec(el.style.fontSize)![1]);
    test.each([
        ['welk-percent', { percent: 50, base: 904, answer: 452 }, 'van de'],
        ['nemen', { percent: 25, base: 1_240, answer: 310 }, '% van'],
    ])('procenten %s at a quarter', (subType, ex, marker) => {
        const block = { id: 'b', typeId: 'procenten', constraints: { subType }, procentExercises: [{ id: 'p', isManuallyEdited: false, ...ex }] } as unknown as MathBlock;
        const { container } = at(W.quarter, <ProcentenViewer block={block} showSolutions={false} />);
        const prompt = [...container.querySelectorAll('span')].find(sp => sp.textContent!.includes(marker))!;
        expect(prompt.style.whiteSpace).toBe('nowrap');
        const row = prompt.parentElement as HTMLElement;
        // The sentence itself fits the cell at the row's font; the blank may drop below it.
        expect(monoTextPx(prompt.textContent!.length, factorOf(row), MATH_PX)).toBeLessThanOrEqual(W.quarter);
        expect(row.style.flexWrap).toBe('wrap');
    });
    test('procenten keeps the 0.92 sheet size where the line fits', () => {
        const block = { id: 'b', typeId: 'procenten', constraints: { subType: 'nemen' }, procentExercises: [{ id: 'p', percent: 25, base: 1_240, answer: 310, isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = at(W.full, <ProcentenViewer block={block} showSolutions={false} />);
        expect(factorOf(container.querySelector('.print-exercise > div') as HTMLElement)).toBe(0.92);
    });
    test('cijferen: a 4-term header at a quarter breaks between terms only', () => {
        const block = { id: 'b', typeId: 'cijferen-optellen-nat', constraints: { operator: '+', numberType: 'natural', maxRange: 10_000 }, cijferExercises: [{ id: 'c', operands: [3_120, 1_445, 28, 2_906], operator: '+', answer: 7_499, remainder: 0, isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = at(W.quarter, <CijferViewer block={block} showSolutions={false} />);
        expect(container.textContent).toContain('3 120 + 1 445 + 28 + 2 906 =');
        groupedNumbersNowrap(container);
    });
});

describe('ordenen: the key is red AND bold (viewer rule 3)', () => {
    test.each([
        ['natural', [305, 42, 1_250]],
        ['rational', [{ n: 1, d: 4 }, { n: 1, d: 2 }, { n: 3, d: 4 }]],
    ])('%s', (numberType, values) => {
        const block = { id: 'b', typeId: 'ordenen', constraints: { numberType, count: 3 }, ordenenExercises: [{ id: 'o', values, display: values, operator: '<', isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = at(W.full, <OrdenenViewer block={block} showSolutions />);
        const red = [...container.querySelectorAll<HTMLElement>('[style*="--ink-solution"]')];
        expect(red.length).toBeGreaterThan(0);
        for (const el of red) {
            const weight = el.style.fontWeight || (el.closest('[style*="font-weight"]') as HTMLElement | null)?.style.fontWeight;
            expect(weight, el.textContent ?? '').toBe('700');
        }
    });
});

describe('weegschaal: the needle never crosses the label it points at', () => {
    test.each([[700, 1000, 50], [800, 1000, 50], [750, 1000, 50], [3000, 5000, 100], [0, 1000, 50]])('%i g on a %i g dial', (grams, bereik, step) => {
        const block = { id: 'b', typeId: 'weegschaal', constraints: { mode: 'aflezen' }, weegschaalExercises: [{ id: 'w', grams, bereikGram: bereik, stepGram: step, notatie: 'g', mode: 'aflezen', isManuallyEdited: false }] } as unknown as MathBlock;
        const { container } = at(W.full, <WeegschaalViewer block={block} showSolutions={false} />);
        const needle = [...container.querySelectorAll('line')].find(l => l.getAttribute('stroke-width') === '2.5')!;
        const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map(a => Number(needle.getAttribute(a)));
        // Label boxes from the glyph advance at their viewBox font size (+1 unit of air).
        const boxes = [...container.querySelectorAll('text')].filter(t => t.getAttribute('dominant-baseline') === 'central').map(t => {
            const fs = Number(t.getAttribute('font-size'));
            return { x: Number(t.getAttribute('x')), y: Number(t.getAttribute('y')), w: monoTextPx(t.textContent!.length, 1, fs) / 2 + 1, h: fs / 2 + 1 };
        });
        expect(boxes.length).toBe(10);
        for (let k = 0; k <= 100; k++) {
            const x = x1 + (x2 - x1) * k / 100, y = y1 + (y2 - y1) * k / 100;
            for (const b of boxes) expect(Math.abs(x - b.x) < b.w && Math.abs(y - b.y) < b.h, `needle at ${k}% inside label at ${b.x},${b.y}`).toBe(false);
        }
        // ...and it still points: at least half way to the label ring.
        expect(Math.hypot(x2 - x1, y2 - y1)).toBeGreaterThan(Math.hypot(boxes[0].x - x1, boxes[0].y - y1) / 2);
    });
});
