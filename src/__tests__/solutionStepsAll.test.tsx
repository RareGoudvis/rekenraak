// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { makeBlock, generateFor } from './helpers/makeBlock';
import MathBlockRenderer from '../components/viewer/MathBlockRenderer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { effectiveSolutionSteps } from '../services/stepsAvailability';
import { encodeShareLink, decodeShareHash, parseWorksheetFile, saveAutosave, loadAutosave, WORKSHEET_FORMAT_VERSION, type SerialisableState } from '../services/persistence';
import { useWorksheetStore, type DocSettings } from '../store/useWorksheetStore';
import { DEFAULT_BASE } from '../config/baseSettings';
import type { Equation, FractionExercise, MathBlock } from '../services/math/types';
import { EXERCISE_UI } from '../config/exerciseUI';

// Sheet-wide "Tussenstappen in de oplossingen": docSettings.solutionStepsAll fills in for every
// block without its own solutionSteps, and a block's own choice (even 'uit') always wins.

const initialDoc = useWorksheetStore.getState().docSettings;
afterEach(() => { cleanup(); useWorksheetStore.setState({ docSettings: initialDoc }); });

const eq = (id: string, a: number, b: number): Equation =>
    ({ id, operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false } as Equation);
const optellen = (id: string, solutionSteps?: string): MathBlock => ({
    ...makeBlock('hr-std-optellen', { id, constraints: { maxGetal: 1000, ...(solutionSteps ? { solutionSteps } : {}) } }),
    exercises: [eq('a', 475, 368)],
});

describe('effectiveSolutionSteps', () => {
    test('absent everywhere = uit', () => {
        expect(effectiveSolutionSteps(optellen('a'), {})).toBe('uit');
        expect(effectiveSolutionSteps(optellen('a'), undefined)).toBe('uit');
    });
    test('the sheet value fills in for a block without its own', () => {
        expect(effectiveSolutionSteps(optellen('a'), { solutionStepsAll: 'basis' })).toBe('basis');
        expect(effectiveSolutionSteps(optellen('a'), { solutionStepsAll: 'alle' })).toBe('alle');
    });
    test("the block's own level wins, also its own uit", () => {
        expect(effectiveSolutionSteps(optellen('a', 'uit'), { solutionStepsAll: 'alle' })).toBe('uit');
        expect(effectiveSolutionSteps(optellen('a', 'alle'), { solutionStepsAll: 'basis' })).toBe('alle');
    });
    test('a block whose type has no steps stays uit', () => {
        const splitsen = makeBlock('splitsen', { id: 's' });
        (splitsen as unknown as Record<string, unknown>).splitsenExercises = generateFor(splitsen);
        expect(effectiveSolutionSteps(splitsen, { solutionStepsAll: 'basis' })).toBe('uit');
    });
});

describe('persistence', () => {
    const g = globalThis as unknown as Record<string, unknown>;
    if (!g.location) g.location = { origin: 'https://rekenraak.test', pathname: '/' };
    const state = (docSettings: DocSettings): SerialisableState => ({
        blocks: [optellen('a')],
        header: useWorksheetStore.getState().header,
        footer: useWorksheetStore.getState().footer,
        docSettings,
        baseSettings: { ...DEFAULT_BASE },
    });

    test('share link and autosave keep the sheet-wide level', () => {
        const s = state({ ...initialDoc, solutionStepsAll: 'basis' });
        const link = encodeShareLink(s)!;
        expect(decodeShareHash(link.slice(link.indexOf('#')))?.docSettings.solutionStepsAll).toBe('basis');
        expect(saveAutosave(s)).toBe(true);
        expect(loadAutosave()?.payload.docSettings.solutionStepsAll).toBe('basis');
    });

    test('an old file without the key loads unchanged (= uit)', () => {
        const old = { version: WORKSHEET_FORMAT_VERSION, exportedAt: '', mode: 'full', blocks: [optellen('a')], header: state(initialDoc).header, footer: state(initialDoc).footer, docSettings: { ...initialDoc } };
        const file = parseWorksheetFile(JSON.stringify(old));
        expect('solutionStepsAll' in file.docSettings).toBe(false);
        expect(effectiveSolutionSteps(file.blocks[0], file.docSettings)).toBe('uit');
    });
});

describe('answer key render', () => {
    const keyText = (b: MathBlock) => (render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><MathBlockRenderer block={b} showSolutions /></BlockWidthProvider>,
    ).container.textContent ?? '').replace(/\s+/g, ' ');

    test("sheet-wide basis shows steps on a block without its own; the block's own uit wins", () => {
        useWorksheetStore.setState({ docSettings: { ...initialDoc, solutionStepsAll: 'basis' } });
        expect(keyText(optellen('a'))).toContain('=(475 + 300) + 60 + 8');
        cleanup();
        expect(keyText(optellen('b', 'uit'))).not.toContain('475 + 300');
    });

    test('without the sheet value the key is byte-for-byte the old one', () => {
        const before = render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><MathBlockRenderer block={optellen('a')} showSolutions /></BlockWidthProvider>).container.innerHTML;
        expect(before).not.toContain('475 + 300');
    });

    test('the breuk hoeveelheid key follows the sheet value too', () => {
        useWorksheetStore.setState({ docSettings: { ...initialDoc, solutionStepsAll: 'alle' } });
        const block = makeBlock('breuken', { constraints: { subType: 'hoeveelheid', answerFormat: 'zonder-hulp', maxDenominator: 5, maxTotal: 20 }, leafId: 'breuken-hoeveelheid' });
        const ex: FractionExercise = { id: 'x', subType: 'hoeveelheid', numerator: 2, denominator: 3, total: 12, objectShape: 'circle', isManuallyEdited: false };
        (block as unknown as Record<string, unknown>).fractionExercises = [ex];
        const { Viewer } = EXERCISE_UI['breuken'];
        const { container } = render(<BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}><Viewer block={block} showSolutions /></BlockWidthProvider>);
        expect(container.textContent).toContain('12 : 3 = 4');
    });
});
