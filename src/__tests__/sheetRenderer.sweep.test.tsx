// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { makeBlock } from './helpers/makeBlock';
import MathBlockRenderer from '../components/viewer/MathBlockRenderer';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import FractionViewer from '../components/viewer/FractionViewer';
import ClockViewer from '../components/viewer/ClockViewer';
import OrdenenViewer from '../components/viewer/OrdenenViewer';
import CijferViewer from '../components/viewer/CijferViewer';
import { SOL } from '../components/viewer/solutionStyle';
import type { Equation, FractionExercise, MathBlock } from '../services/math/types';

// Clean sweep S2: sheet-renderer fixes, each one a repro from BUGS.md.

afterEach(cleanup);

const eq = (id: string, a: number, b: number, operator: '+' | '-'): Equation => ({
    id, operands: [a, b], operator, answer: operator === '+' ? a + b : a - b, isManuallyEdited: false,
});

function renderHr(block: MathBlock, showSolutions: boolean) {
    return render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <MathBlockRenderer block={block} showSolutions={showSolutions} />
        </BlockWidthProvider>,
    ).container;
}

// The tussenstap row is the one that starts "= <first operand> −/+".
const tussenstappen = (container: HTMLElement): string[] =>
    Array.from(container.querySelectorAll<HTMLElement>('div'))
        .filter(d => d.style.whiteSpace === 'nowrap' && d.children.length === 6)
        .map(d => (d.textContent ?? '').replace(/\s+/g, ' ').trim());

describe('compenseren tussenstap follows the exercise, not the stored preset', () => {
    // The relax ladder dropped the preset ("versoepeld: strategie"): the block still says
    // compenseren, but these exercises were drawn plain.
    const block = (exercises: Equation[]): MathBlock => ({
        ...makeBlock('hr-std-aftrekken', { id: 'comp', constraints: { numberType: 'natural', preset: 'compenseren', maxGetal: 1000 } }),
        exercises,
    });

    test('a plain exercise under a dropped preset gets no scaffold (385 − 30, 230 − 14)', () => {
        const c = renderHr(block([eq('a', 385, 30, '-'), eq('b', 230, 14, '-')]), true);
        expect(tussenstappen(c)).toEqual([]);
    });

    test('a compenseren-shaped exercise keeps its tussenstap (385 − 29 = 385 − 30 + 1)', () => {
        const c = renderHr(block([eq('a', 385, 29, '-'), eq('b', 512, 98, '-'), eq('c', 47, 18, '+')]), true);
        expect(tussenstappen(c)).toEqual(['=385−30+1', '=512−100+2', '=47+20−2']);
    });

    test('the scaffold hides with the setting off', () => {
        const b = block([eq('a', 385, 29, '-')]);
        const c = renderHr({ ...b, constraints: { ...b.constraints, compenserenScaffold: 'geen' } }, true);
        expect(tussenstappen(c)).toEqual([]);
    });
});

describe('breuken-kleuren answer key colours the parts', () => {
    const ex: FractionExercise = {
        id: 'k1', subType: 'kleuren', numerator: 3, denominator: 5, shape: 'rectangle',
        coloredIndices: [0, 2, 4], gridRows: 1, gridCols: 5, isManuallyEdited: false,
    };
    const block: MathBlock = {
        ...makeBlock('breuken', { id: 'kl', constraints: { subType: 'kleuren' } }),
        fractionExercises: [ex],
    };
    const filled = (container: HTMLElement) =>
        Array.from(container.querySelectorAll('rect')).filter(r => !['white', 'none', null].includes(r.getAttribute('fill'))).length;
    const renderKl = (showSolutions: boolean) => render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <FractionViewer block={block} showSolutions={showSolutions} />
        </BlockWidthProvider>,
    ).container;

    test('Oplossingen aan: the numerator parts are filled; uit: none', () => {
        expect(filled(renderKl(true))).toBe(3);
        cleanup();
        expect(filled(renderKl(false))).toBe(0);
    });
});

describe('klok tekenen key: the hands the pupil draws are in the solution red', () => {
    const clockBlock = (handChoice: 'uur' | 'minuut' | 'beide', exerciseMode: 'tekenen' | 'lezen' = 'tekenen'): MathBlock => ({
        ...makeBlock('klok-kloklezen', { id: 'kt', constraints: { clockType: 'analoog', exerciseMode, handChoice } }),
        clockExercises: [{
            id: 'c1', hours: 3, minutes: 15, timeText: 'kwart over 3', digitalText: '03:15',
            exerciseMode, clockType: 'analoog', is24hour: false, handChoice, isManuallyEdited: false,
        }],
    });
    // Hands are the round-capped lines; the ticks are butt-capped.
    const hands = (container: HTMLElement) =>
        Array.from(container.querySelectorAll('line[stroke-linecap="round"]')).map(l => l.getAttribute('stroke'));
    const renderClock = (b: MathBlock, showSolutions: boolean) => render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <ClockViewer block={b} showSolutions={showSolutions} />
        </BlockWidthProvider>,
    ).container;

    test('beide: both hands red in the key, none drawn without it', () => {
        expect(hands(renderClock(clockBlock('beide'), true))).toEqual([SOL, SOL]);
        cleanup();
        expect(hands(renderClock(clockBlock('beide'), false))).toEqual([]);
    });

    test('minuut asked: the given hour hand stays black, the minute hand is red', () => {
        expect(hands(renderClock(clockBlock('minuut'), true))).toEqual(['#000', SOL]);
        cleanup();
        expect(hands(renderClock(clockBlock('minuut'), false))).toEqual(['#000']);
    });

    test('uur asked: the given minute hand stays black, the hour hand is red', () => {
        expect(hands(renderClock(clockBlock('uur'), true))).toEqual([SOL, '#000']);
    });

    test('klok lezen: the printed clock is the question, its hands stay black', () => {
        expect(hands(renderClock(clockBlock('beide', 'lezen'), true))).toEqual(['#000', '#000']);
    });
});

describe('ordenen prints numbers like every other viewer', () => {
    const ordBlock = (numberType: string, display: number[]): MathBlock => ({
        ...makeBlock('ordenen', { id: 'or', constraints: { numberType, maxGetal: 100000 } }),
        ordenenExercises: [{ id: 'o1', display, values: [...display].sort((a, b) => a - b), operator: '<', isManuallyEdited: false }],
    });
    const textOf = (b: MathBlock, showSolutions: boolean) => render(
        <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
            <OrdenenViewer block={b} showSolutions={showSolutions} />
        </BlockWidthProvider>,
    ).container.textContent ?? '';

    test('thousands take a space, never a dot (97 055, 9 705,494)', () => {
        const t = textOf(ordBlock('decimal', [97055, 9705.494, 12.5]), true);
        expect(t).toContain('97 055');
        expect(t).toContain('9 705,494');
        expect(t).not.toMatch(/\d\.\d/);
    });

    test('decimal numbers are listed with ";" so the list comma never reads as a decimal comma', () => {
        const t = textOf(ordBlock('decimal', [970.55, 902.86, 12.5]), false);
        expect(t).toContain('970,55;');
        expect(t).not.toMatch(/\d,\d+,/);
    });

    test('whole numbers keep the comma list', () => {
        expect(textOf(ordBlock('natural', [345, 12, 7000]), false)).toContain('345,12,7 000');
    });
});

describe('cijferen delen-dec q/r box: the rest is exact, never rounded to the quotient\'s decimals', () => {
    const qrText = (operands: number[], answer: number, remainder: number) => {
        const block: MathBlock = {
            ...makeBlock('cijferen-delen-dec', { id: 'cd', constraints: { operator: ':', numberType: 'decimal', decimalPlaces: 2 } }),
            numberOfExercises: 1,
            cijferExercises: [{ id: 'd1', operands, operator: ':', answer, remainder, isManuallyEdited: false, decimalPlaces: 2 }],
        };
        const c = render(
            <BlockWidthProvider value={FULL_BLOCK_WIDTH_PX}>
                <CijferViewer block={block} showSolutions />
            </BlockWidthProvider>,
        ).container;
        const r = Array.from(c.querySelectorAll('span')).find(s => /^r\s/.test(s.textContent ?? ''));
        return (r?.textContent ?? '').replace(/^r\s+/, '');
    };

    // 1 : 0,07 = 14,28 r 0,0004 (100 − 99,96 at 4 decimals); the old box printed "0,00".
    test('up to 2·dp decimals', () => expect(qrText([1, 0.07], 14.28, 0.0004)).toBe('0,0004'));
    // 495 : 80 = 6,18 r 0,6: trailing zeros trimmed.
    test('trailing zeros trimmed', () => expect(qrText([495, 80], 6.18, 0.6)).toBe('0,6'));
    // 1 234 567,5 : 500 000 = 2,46 r 4 567,5
    test('a big rest keeps its thousands space', () => expect(qrText([1234567.5, 500000], 2.46, 4567.5)).toBe('4 567,5'));
    test('no rest prints 0', () => expect(qrText([10, 4], 2.5, 0)).toBe('0'));
});
