// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider, ScaffoldProvider } from '../components/viewer/BlockWidthContext';
import type { MabPlace } from '../components/viewer/MabBlocksSVG';
import { kioskCellBox, kioskMabLayout } from '../components/viewer/mabKioskLayout';
import type { MathBlock } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';

// Call 10: the Oefenmodus card (ScaffoldProvider false) hides the sheet's working scaffold the
// kiosk never asks for (tussenstap blanks, calc rows, a sprong diagram, a writing line), while the
// sheet keeps drawing it. Each case counts a scaffold marker on the sheet and on the card.

afterEach(cleanup);

function blockOf(leafId: string, extra: Record<string, unknown> = {}): MathBlock {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    const def = REGISTRY[leaf.typeId];
    const block = makeBlock(leaf.typeId, { constraints: { ...leaf.defaultConstraints, ...extra }, block: { numberOfExercises: 1 } });
    (block as unknown as Record<string, unknown>)[def.exerciseField] = def.generate(block).slice(0, 1);
    return block;
}

function html(block: MathBlock, card: boolean): HTMLElement {
    const { Viewer } = EXERCISE_UI[block.typeId];
    const view = <Viewer block={block} showSolutions={false} />;
    const { container } = render(<BlockWidthProvider value={340}>{card ? <ScaffoldProvider value={false}>{view}</ScaffoldProvider> : view}</BlockWidthProvider>);
    return container;
}

// A drawn write-on line: an empty element whose bottom border is its only border.
const lines = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('div, span')]
    .filter(el => /solid/.test(el.style.borderBottom) && !el.style.borderTop && !el.style.border && el.children.length === 0 && !el.textContent?.trim()).length;
const count = (root: HTMLElement, s: string) => (root.textContent ?? '').split(s).length - 1;

type Case = [string, string, Record<string, unknown>, (root: HTMLElement) => number, number];

const CASES: Case[] = [
    // tussenstap: "a ≈ __ op __ ≈ __" → only the estimate's "≈ __" is left.
    ['schattend tussenstap', 'schattend-nat', { scaffolding: 'tussenstappen' }, r => count(r, '≈'), 1],
    ['geld-teruggeven sprong diagram', 'geld-teruggeven', { scaffolding: 'ingevuld' }, r => r.querySelectorAll('svg').length, 0],
    ['geld-teruggeven "euro en cent"', 'geld-teruggeven', {}, r => count(r, 'euro en'), 0],
    ['breuken-hoeveelheid met-hulp ": × =" rows', 'breuken-hoeveelheid', { answerFormat: 'met-hulp' }, r => count(r, '×') + count(r, ':'), 0],
    ['breuken-hoeveelheid met-breukvragen', 'breuken-hoeveelheid', { answerFormat: 'met-breukvragen' }, r => count(r, '×') + count(r, 'Hoe groot'), 0],
    ['breuken-hoeveelheid zonder-hulp working lines', 'breuken-hoeveelheid', { answerFormat: 'zonder-hulp' }, lines, 1],
    ['breuken-hoeveelheid-abstract calc row', 'breuken-hoeveelheid', { subType: 'hoeveelheid-abstract' }, r => count(r, '×') + count(r, ':'), 0],
    // Kiosk triage 2026-10-10: the breuk is typed in the answer panel (fraction input), not under the figure.
    ['breuken-herkennen questions', 'breuken-herkennen', {}, r => count(r, 'gelijke delen'), 0],
    ['breuken-herkennen phrase', 'breuken-herkennen', { answerFormat: 'phrase' }, r => count(r, 'gekleurd'), 0],
    // The kiosk has no cells for the negenproef cross nor the controle line: the pupil only taps juist / fout.
    ['controleren negenproef cross', 'controleren-negenproef', {}, r => r.querySelectorAll('svg').length, 0],
    ['controleren omgekeerde controle line', 'controleren-omgekeerde', {}, r => count(r, 'controle:'), 0],
    ['oppervlakte berekenen "opp = __ × __"', 'oppervlakte-berekenen', { scaffoldFormule: true }, r => count(r, '×'), 0],
    ['klok lezen writing line', 'klok-analoog-lezen', {}, lines, 0],
    ['vormleer herkennen writing line', 'vormleer-hoeken-herkennen', {}, lines, 0],
    ['vormleer vierhoeken writing line', 'vormleer-vierhoeken', {}, lines, 0],
    ['mab herkennen writing line', 'mab-herkennen', {}, lines, 0],
];

describe('the kiosk card hides the scaffold the kiosk does not ask (call 10)', () => {
    test.each(CASES)('%s', (_name, leafId, extra, measure, onCard) => {
        const block = blockOf(leafId, extra);
        const sheet = measure(html(block, false));
        cleanup();
        const card = measure(html(block, true));
        expect(card).toBe(onCard);
        // The sheet still draws it.
        expect(sheet).toBeGreaterThan(onCard);
    });
});

// Classroom note (2026-10-09): pupils read the symbolic duizendtal stamp (four squares) as four
// hundreds. The card draws it as one labelled cube; the sheet keeps the stamp.
describe('the kiosk card draws a duizendtal as a labelled cube', () => {
    test.each(['symbolic', 'mab-bw', 'mab-color'])('%s', (mabStyle) => {
        const block = blockOf('mab-herkennen', { maxNumber: 1000, mabStyle });
        (block as unknown as { mabExercises: unknown[] }).mabExercises = [{ id: 'm', value: 1000, thousands: 1, hundreds: 0, tens: 0, units: 0, isManuallyEdited: false }];
        const sheet = html(block, false);
        expect(sheet.querySelector('[data-mab-thousand]')).toBeNull();
        expect(sheet.textContent).not.toContain('1000');
        cleanup();
        const card = html(block, true);
        const cube = card.querySelectorAll('[data-mab-thousand]');
        expect(cube).toHaveLength(1);
        expect(cube[0].textContent).toBe('1000');
    });
});

// Triage 2026-10-11 (pupil play misread 2 vs 3 tens): the card draws tens in groups of five with a
// gap (MAB convention) and lays hundreds in rows from the bottom; the sheet keeps its plain stack.
describe('the kiosk card groups MAB tens in fives and lays hundreds as a block', () => {
    const withDigits = (hundreds: number, tens: number, units: number) => {
        const block = blockOf('mab-herkennen', { maxNumber: 1000, mabStyle: 'symbolic' });
        (block as unknown as { mabExercises: unknown[] }).mabExercises = [{ id: 'm', value: hundreds * 100 + tens * 10 + units, thousands: 0, hundreds, tens, units, isManuallyEdited: false }];
        return block;
    };
    const groups = (root: HTMLElement) => [...root.querySelectorAll('[data-mab-tens-group]')].map(g => g.children.length);

    test.each([[2, [2]], [5, [5]], [8, [5, 3]], [9, [5, 4]]] as const)('%i tens -> groups %j on the card, none on the sheet', (tens, want) => {
        const block = withDigits(1, tens, 0);
        expect(groups(html(block, false))).toEqual([]);
        cleanup();
        expect(groups(html(block, true))).toEqual(want);
    });

    test('five hundreds fill the bottom row of three first, the sheet keeps its column-first grid', () => {
        const rowsOf = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('[data-mab-hundred]')].map(c => Number(c.getAttribute('data-row')));
        const block = withDigits(5, 0, 0);
        expect(rowsOf(html(block, false))).toEqual([]);
        cleanup();
        const rows = rowsOf(html(block, true));
        const bottom = Math.max(...rows);
        expect(rows.filter(r => r === bottom)).toHaveLength(3);
        expect(rows.filter(r => r < bottom)).toHaveLength(2);
    });
});

// Triage M2b (classroom: pupils could not count the pieces): on the card each place draws at a size
// derived from its cell's box, so the figure grows with the card and always stays inside the cell.
describe('the kiosk card scales MAB pieces with the place cell', () => {
    const PLACES: MabPlace[] = ['thousands', 'hundreds', 'tens', 'units'];
    const bbox = (rs: { x: number; y: number; w: number; h: number }[]) => ({
        x0: Math.min(...rs.map(r => r.x)), y0: Math.min(...rs.map(r => r.y)),
        x1: Math.max(...rs.map(r => r.x + r.w)), y1: Math.max(...rs.map(r => r.y + r.h)),
    });

    test('the cell box grows with the card width', () => {
        expect(kioskCellBox(680, 4).w).toBeGreaterThan(kioskCellBox(340, 4).w * 1.9);
    });

    test.each(PLACES)('%s: piece size doubles with the cell', (place) => {
        const small = kioskMabLayout(place, 9, 82, 107).size, big = kioskMabLayout(place, 9, 164, 214).size;
        expect(big / small).toBeCloseTo(2, 1);
    });

    test('a flat is a real figure, not a speck, at the 4-place cell on a 1.6x card', () => {
        const { w, h } = kioskCellBox(340, 4);
        expect(kioskMabLayout('hundreds', 5, w, h).size * 1.6).toBeGreaterThanOrEqual(30);
        expect(kioskMabLayout('units', 1, w, h).size * 1.6).toBeGreaterThanOrEqual(16);
    });

    test.each([[0, 3, 0], [5, 2, 1], [3, 8, 9], [9, 9, 9]])('%iH %iT %iE stays inside its cell', (h, t, e) => {
        for (const places of [3, 4]) {
            const cell = kioskCellBox(340, places);
            for (const [place, n] of [['hundreds', h], ['tens', t], ['units', e]] as const) {
                if (n === 0) continue;
                const b = bbox(kioskMabLayout(place, n, cell.w, cell.h).pieces);
                expect(b.x0).toBeGreaterThanOrEqual(0); expect(b.y0).toBeGreaterThanOrEqual(0);
                expect(b.x1).toBeLessThanOrEqual(cell.w); expect(b.y1).toBeLessThanOrEqual(cell.h);
            }
        }
    });

    test('the nine-piece figure fills about 80 % of the cell in its limiting direction', () => {
        const cell = kioskCellBox(340, 4);
        for (const place of ['hundreds', 'tens', 'units'] as const) {
            const b = bbox(kioskMabLayout(place, 9, cell.w, cell.h).pieces);
            const fill = Math.max((b.x1 - b.x0) / cell.w, (b.y1 - b.y0) / cell.h);
            expect(fill).toBeGreaterThan(0.6); expect(fill).toBeLessThanOrEqual(0.801);
        }
    });

    test('tens are upright rods in groups of five, units rows of five', () => {
        const cell = kioskCellBox(340, 4);
        const tens = kioskMabLayout('tens', 8, cell.w, cell.h).pieces;
        expect(tens[0].h).toBeGreaterThan(tens[0].w);
        expect(tens[5].x - (tens[4].x + tens[4].w)).toBeGreaterThan(tens[1].x - (tens[0].x + tens[0].w));
        const units = kioskMabLayout('units', 7, cell.w, cell.h).pieces;
        expect(units.filter(u => u.y === units[0].y)).toHaveLength(5);
    });

    test.each([['symbolic'], ['mab-bw']])('%s: the rendered card draws SVG columns from the cell box', (mabStyle) => {
        const block = withDigits(mabStyle, 5, 2, 1);
        const card = html(block, true);
        const cols = [...card.querySelectorAll<SVGElement>('[data-mab-kiosk-col]')];
        expect(cols.map(c => c.getAttribute('data-mab-kiosk-col'))).toEqual(['hundreds', 'tens', 'units']);
        const cell = kioskCellBox(340, 3);
        for (const c of cols) { expect(c.getAttribute('width')).toBe(String(cell.w)); expect(c.getAttribute('height')).toBe(String(cell.h)); }
        cleanup();
        expect(html(block, false).querySelector('[data-mab-kiosk-col]')).toBeNull();
    });

    function withDigits(mabStyle: string, hundreds: number, tens: number, units: number) {
        const block = blockOf('mab-herkennen', { maxNumber: 999, mabStyle });
        (block as unknown as { mabExercises: unknown[] }).mabExercises = [{ id: 'm', value: hundreds * 100 + tens * 10 + units, thousands: 0, hundreds, tens, units, isManuallyEdited: false }];
        return block;
    }
});
