// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import Inspector from '../components/configurator/Inspector';

const reset = () => useWorksheetStore.setState((s) => ({
    bladSection: 'opdrachten',
    docSettings: { ...s.docSettings, titelCustom: undefined, oefeningenCustom: undefined, fontFamilyTitel: undefined },
}));
beforeEach(reset);
afterEach(cleanup);

const header = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('Blad > Opdrachten accordions', () => {
    test('closed by default, openable by click', () => {
        render(<Inspector />);
        expect(header('Vormgeving opdracht-titel').getAttribute('aria-expanded')).toBe('false');
        expect(header('Vormgeving oefeningen').getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('Lettertype titel')).toBeNull();
        fireEvent.click(header('Vormgeving opdracht-titel'));
        expect(header('Vormgeving opdracht-titel').getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('Lettertype titel')).toBeTruthy();
    });

    test('open when a value differs from the default', () => {
        useWorksheetStore.setState((s) => ({ docSettings: { ...s.docSettings, titelCustom: { italic: true }, oefeningenCustom: { color: '#ff0000' } } }));
        render(<Inspector />);
        expect(header('Vormgeving opdracht-titel').getAttribute('aria-expanded')).toBe('true');
        expect(header('Vormgeving oefeningen').getAttribute('aria-expanded')).toBe('true');
    });
});
