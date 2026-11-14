// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { useWorksheetStore } from '../store/useWorksheetStore';
import Inspector from '../components/configurator/Inspector';

const reset = () => useWorksheetStore.setState((s) => ({
    activeBlockId: null,
    inspectorScope: 'blad',
    inspectorSections: { block: null, blad: 'opdrachten' },
    docSettings: { ...s.docSettings, titelCustom: undefined, oefeningenCustom: undefined, fontFamilyTitel: undefined },
}));
beforeEach(reset);
afterEach(cleanup);

const header = (name: string) => screen.getByRole('button', { name: new RegExp(name) });

describe('Heel het blad folds', () => {
    test('closed by default, openable by click', () => {
        render(<Inspector />);
        expect(header('Vormgeving opdracht-titel').getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByText('Lettertype titel')).toBeNull();
        fireEvent.click(header('Vormgeving opdracht-titel'));
        expect(header('Vormgeving opdracht-titel').getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('Lettertype titel')).toBeTruthy();
        fireEvent.click(header('Cijfers en tekst'));
        expect(header('Vormgeving oefeningen').getAttribute('aria-expanded')).toBe('false');
    });

    test('open when a value differs from the default', () => {
        useWorksheetStore.setState((s) => ({ docSettings: { ...s.docSettings, titelCustom: { italic: true }, oefeningenCustom: { color: '#ff0000' } } }));
        render(<Inspector />);
        expect(header('Vormgeving opdracht-titel').getAttribute('aria-expanded')).toBe('true');
        fireEvent.click(header('Cijfers en tekst'));
        expect(header('Vormgeving oefeningen').getAttribute('aria-expanded')).toBe('true');
    });
});

describe('Inspector scope and sections', () => {
    test('one section open at a time, remembered per scope', () => {
        render(<Inspector />);
        expect(header('^Opdrachten').getAttribute('aria-expanded')).toBe('true');
        fireEvent.click(header('^Voettekst'));
        expect(header('^Voettekst').getAttribute('aria-expanded')).toBe('true');
        expect(header('^Opdrachten').getAttribute('aria-expanded')).toBe('false');
        expect(useWorksheetStore.getState().inspectorSections.blad).toBe('voettekst');
        fireEvent.click(header('^Voettekst'));
        expect(useWorksheetStore.getState().inspectorSections.blad).toBe('');
    });

    test('without a selection the block option is disabled and Heel het blad shows', () => {
        useWorksheetStore.setState({ inspectorScope: 'block' });
        render(<Inspector />);
        expect((screen.getByRole('button', { name: 'Opdracht' }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByRole('button', { name: 'Heel het blad' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.queryByText('Geen oefening gekozen')).toBeNull();
    });

    test('selecting a block opens its scope with the pinned count and its number', () => {
        useWorksheetStore.getState().clearBlocks();
        useWorksheetStore.setState({ sidebarTab: 'oefeningen', curriculum: null });
        useWorksheetStore.getState().addBlockFromType('hr-std-optellen', 'Optellen');
        useWorksheetStore.getState().setInspectorScope('blad');
        useWorksheetStore.getState().setActiveSelection(useWorksheetStore.getState().blocks[0].id);
        render(<Inspector />);
        expect(screen.getByRole('button', { name: 'Opdracht 1' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'Meer oefeningen' })).toBeTruthy();
        for (const t of ['Wat oefenen ze', 'Hoe staat het op het blad', 'Differentiatie', 'Grootte en ruimte']) expect(header(t)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Heel het blad' }));
        expect(useWorksheetStore.getState().inspectorScope).toBe('blad');
        expect(screen.queryByRole('button', { name: 'Meer oefeningen' })).toBeNull();
    });

    test('a locked curriculum keeps the count, drops the free sections', () => {
        useWorksheetStore.getState().clearBlocks();
        useWorksheetStore.setState({ sidebarTab: 'oefeningen', curriculum: null });
        useWorksheetStore.getState().addBlockFromType('hr-std-optellen', 'Optellen');
        useWorksheetStore.setState({ curriculum: { locked: true, allowedTypes: [{ typeId: 'hr-std-optellen', label: 'Optellen' }] } });
        useWorksheetStore.getState().setActiveSelection(useWorksheetStore.getState().blocks[0].id);
        render(<Inspector />);
        expect(screen.getByText(/Vergrendeld curriculum/)).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Meer oefeningen' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Differentiatie/ })).toBeNull();
        useWorksheetStore.setState({ curriculum: null });
    });

    test('Tussenstappen voor alle blokken writes docSettings.solutionStepsAll', () => {
        useWorksheetStore.setState({ inspectorSections: { block: null, blad: 'hulp' } });
        render(<Inspector />);
        fireEvent.click(screen.getByRole('button', { name: 'Basis' }));
        expect(useWorksheetStore.getState().docSettings.solutionStepsAll).toBe('basis');
    });
});
