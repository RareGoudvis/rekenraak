// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import TutorApp from '../tutor/TutorApp';
import { encodeTutorPage, TUTOR_HASH_PREFIX } from '../services/oefenen/tutorPayload';
import { makeBlock } from './helpers/makeBlock';
import { stepsFor } from '../services/stepsAvailability';
import type { Equation, FractionExercise, MathBlock } from '../services/math/types';

// Part E: the stappenhulp page from a sheet's QR hash: menu → one sum → steps on request.

const eq = (a: number, b: number, operator: Equation['operator'] = '+'): Equation =>
    ({ id: 'x', operands: [a, b], operator, answer: operator === 'x' ? a * b : a + b, isManuallyEdited: false });
const frac = (t: number, n: number, g: number): FractionExercise => ({ id: 'f', subType: 'hoeveelheid', numerator: t, denominator: n, total: g, isManuallyEdited: false });
const hasSteps = (block: MathBlock, ex: unknown) => stepsFor(block.typeId, ex, block.constraints) !== null;

beforeEach(() => {
    localStorage.clear();
    const payload = encodeTutorPage([{ block: { ...makeBlock('hr-std-optellen', { id: 'o' }), exercises: [eq(475, 368), eq(47, 8)], itemNumbering: 'letter' }, n: 1, title: 'Reken uit.' }], () => true)!;
    window.location.hash = TUTOR_HASH_PREFIX + payload;
});
afterEach(() => { cleanup(); window.location.hash = ''; });

describe('stappenhulp', () => {
    test('the menu lists the sums; one without a strategy is greyed out', () => {
        render(<TutorApp />);
        expect(screen.getByText('Opdracht 1 · Reken uit.')).toBeTruthy();
        expect(screen.getByRole('button', { name: /475 \+ 368/ })).toBeTruthy();
        expect(screen.getByText('Hiervoor zijn nog geen stappen')).toBeTruthy();
    });

    test('a sum shows nothing until asked, then one Basis line per tap, Alle adds the rest', () => {
        render(<TutorApp />);
        fireEvent.click(screen.getByRole('button', { name: /475 \+ 368/ }));
        expect(screen.queryByRole('listitem')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Toon de eerste stap' }));
        expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual(['= (475 + 300) + 60 + 8']);
        fireEvent.click(screen.getByRole('button', { name: 'Toon de volgende stap' }));
        fireEvent.click(screen.getByRole('button', { name: 'Alle stappen: uit' }));
        expect(screen.getAllByRole('listitem')).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', { name: 'Toon de volgende stap' }));
        fireEvent.click(screen.getByRole('button', { name: 'Toon de volgende stap' }));
        expect(screen.getByText('Klaar! Vergelijk met jouw blad.')).toBeTruthy();
        expect(screen.getAllByRole('listitem').at(-1)!.textContent).toBe('= 843');
    });

    test('a sum without steps is printed greyed with its numbers and cannot be opened', () => {
        const block = { ...makeBlock('hr-std-optellen', { id: 'o' }), exercises: [eq(117, 646), eq(983, 2)], itemNumbering: 'letter' } as MathBlock;
        window.location.hash = TUTOR_HASH_PREFIX + encodeTutorPage([{ block, n: 1, title: 'Reken uit.' }], hasSteps)!;
        render(<TutorApp />);
        expect(screen.getByRole('button', { name: /117 \+ 646/ })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /983/ })).toBeNull();
        const off = screen.getByText('983 + 2').closest('.tutor-item')!;
        expect(off.classList.contains('is-off')).toBe(true);
        expect(off.textContent).toContain('Hiervoor zijn nog geen stappen');
    });

    test('1/5 van 20 opens the breukvragen: hint first, Toon het antwoord, then the next question', () => {
        const block = { ...makeBlock('breuken', { id: 'b' }), itemNumbering: 'letter' } as MathBlock;
        window.location.hash = TUTOR_HASH_PREFIX + encodeTutorPage([{ block, n: 4, title: 'Bereken de breuk van de hoeveelheid.', exercises: [frac(1, 5, 20), frac(1, 3, 12)] }], hasSteps)!;
        render(<TutorApp />);
        expect(screen.getByText('Opdracht 4 · Bereken de breuk van de hoeveelheid.')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /1 op 5 van 20/ }));
        expect(screen.getByText('Wat is het geheel?')).toBeTruthy();
        expect(screen.queryByText("Welk getal staat na 'van'?")).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Toon het antwoord' }));
        expect(screen.queryByText("Welk getal staat na 'van'?")).toBeNull();
        expect(screen.getByText('In hoeveel gelijke delen verdeel je het geheel?')).toBeTruthy();
        for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: 'Toon het antwoord' }));
        expect(screen.getByText('Klaar! Vergelijk met jouw blad.')).toBeTruthy();
        expect(screen.getAllByRole('listitem').at(-1)!.textContent).toBe('15 van 20 = 4');
    });

    test('a broken QR says so in Dutch and offers the scanner', () => {
        window.location.hash = '#t=!!!';
        render(<TutorApp />);
        expect(screen.getByRole('alert').textContent).toMatch(/QR-code/);
        expect(screen.getByRole('button', { name: 'Scan je blad' })).toBeTruthy();
    });
});
