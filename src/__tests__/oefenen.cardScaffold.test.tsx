// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider, ScaffoldProvider } from '../components/viewer/BlockWidthContext';
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
