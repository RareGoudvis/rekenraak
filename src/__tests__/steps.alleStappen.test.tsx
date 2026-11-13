// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import StepsPanel from '../oefenen/kiosk/StepsPanel';
import StepsView from '../tutor/StepsView';
import { stepLineText, workedSteps } from '../services/math/workedSteps';
import { formatMathNumber } from '../services/math/formatters';
import type { Equation } from '../services/math/types';

// Owner (2026-11-13): "Alle stappen" pressed after a step is already out shows the whole solution at once,
// the optional in-between lines included, in Oefenmodus and the stappenhulp alike.

afterEach(cleanup);

const eq: Equation = { id: 'x', operands: [7, 389], operator: 'x', answer: 2723, isManuallyEdited: false };
const lines = workedSteps(eq)!;
const all = lines.map(l => stepLineText(l, formatMathNumber));
const listed = (container: HTMLElement, sel: string) => [...container.querySelectorAll(`${sel} li`)].map(li => li.textContent);

describe('Alle stappen shows every step', () => {
    it('has optional lines to show', () => {
        expect(lines.some(l => !l.basis)).toBe(true);
    });

    it('Oefenmodus: after one step, Alle shows all lines; off again keeps the Basis lines', () => {
        const { container } = render(<StepsPanel lines={lines} onNext={() => {}} />);
        fireEvent.click(screen.getByText('Toon de stappen'));
        expect(listed(container, '.kiosk-steps-lines')).toHaveLength(1);
        fireEvent.click(screen.getByText('Alle stappen: uit'));
        expect(listed(container, '.kiosk-steps-lines')).toEqual(all);
        expect(screen.getByText(/Klaar!/)).toBeTruthy();
        fireEvent.click(screen.getByText('Alle stappen: aan'));
        expect(listed(container, '.kiosk-steps-lines')).toEqual(lines.filter(l => l.basis).map(l => stepLineText(l, formatMathNumber)));
    });

    it('stappenhulp: the same', () => {
        const { container } = render(<StepsView sum="7 × 389" lines={lines} />);
        fireEvent.click(screen.getByText('Toon de eerste stap'));
        fireEvent.click(screen.getByText('Alle stappen: uit'));
        expect(listed(container, '.tutor-lines')).toEqual(all);
    });
});
