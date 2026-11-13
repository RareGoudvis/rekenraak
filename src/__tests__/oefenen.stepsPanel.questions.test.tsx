// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { breukHoeveelheidSteps } from '../services/math/workedSteps';
import StepsPanel from '../oefenen/kiosk/StepsPanel';
import type { FractionExercise } from '../services/math/types';

afterEach(cleanup);

const ex = (numerator: number, denominator: number, total: number): FractionExercise =>
    ({ id: 'x', subType: 'hoeveelheid', numerator, denominator, total, isManuallyEdited: false });

describe('StepsPanel question flow', () => {
    it('shows one question at a time: hint first, the answer on a tap, then the next question', () => {
        render(<StepsPanel lines={breukHoeveelheidSteps(ex(2, 3, 12))!} onNext={() => {}} />);
        fireEvent.click(screen.getByText('Toon de stappen'));
        expect(screen.getByText('Wat is het geheel?')).toBeTruthy();
        expect(screen.queryByText("Welk getal staat na 'van'?")).toBeNull();
        expect(screen.queryByText('In hoeveel gelijke delen verdeel je het geheel?')).toBeNull();
        expect(screen.queryByText('12')).toBeNull();

        fireEvent.click(screen.getByText('Toon het antwoord'));
        expect(screen.getByText('12')).toBeTruthy();
        expect(screen.queryByText("Welk getal staat na 'van'?")).toBeNull();
        expect(screen.getByText('In hoeveel gelijke delen verdeel je het geheel?')).toBeTruthy();
        expect(screen.getByText('Kijk naar de noemer.')).toBeTruthy();

        for (let i = 0; i < 3; i++) fireEvent.click(screen.getByText('Toon het antwoord'));
        expect(screen.getByText('12 : 3 = 4')).toBeTruthy();
        // The word "keer" sits in its own .step-word span, so match the element's whole text.
        expect(screen.getByText((_, el) => el?.textContent === '2 keer, 2 × 4 = 8' && !Array.from(el.children).some(c => c.textContent === '2 keer, 2 × 4 = 8'))).toBeTruthy();
        expect(screen.queryByText('Toon het antwoord')).toBeNull();
        expect(screen.getByText(/Klaar!/)).toBeTruthy();
    });
});
