// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import TutorApp from '../tutor/TutorApp';
import { encodeTutorPage, TUTOR_HASH_PREFIX } from '../services/oefenen/tutorPayload';
import { makeBlock } from './helpers/makeBlock';
import type { Equation } from '../services/math/types';

// Part E: the stappenhulp page from a sheet's QR hash: menu → one sum → steps on request.

const eq = (a: number, b: number): Equation => ({ id: 'x', operands: [a, b], operator: '+', answer: a + b, isManuallyEdited: false });

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

    test('a broken QR says so in Dutch and offers the scanner', () => {
        window.location.hash = '#t=!!!';
        render(<TutorApp />);
        expect(screen.getByRole('alert').textContent).toMatch(/QR-code/);
        expect(screen.getByRole('button', { name: 'Scan je blad' })).toBeTruthy();
    });
});
