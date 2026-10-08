// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, within } from '@testing-library/react';
import Sidebar from '../components/layout/sidebar';
import TopBar from '../components/layout/TopBar';
import { useWorksheetStore } from '../store/useWorksheetStore';

// Oefenmodus and Bordmodus live in a row above the sidebar's wordmark, not in the TopBar:
// in the bar they pushed its stage 0 (all labels) past a 1920 px screen.
const OEFEN = /^Oefenmodus/;
const BORD = /^Bordmodus/;
const sidebar = () => within(document.querySelector('aside') as HTMLElement);

beforeEach(() => {
    localStorage.clear();
    useWorksheetStore.setState({ curriculum: null, view: 'editor', sidebarTab: 'oefeningen' });
});
afterEach(() => { cleanup(); useWorksheetStore.setState({ curriculum: null, view: 'editor' }); });

describe('mode buttons', () => {
    test('the sidebar has both; Oefenmodus opens the builder', () => {
        render(<Sidebar />);
        expect(sidebar().getByRole('button', { name: BORD })).toBeTruthy();
        fireEvent.click(sidebar().getByRole('button', { name: OEFEN }));
        expect(screen.getByRole('dialog', { name: 'Oefenmodus samenstellen' })).toBeTruthy();
    });

    test('Bordmodus switches to the whiteboard view', () => {
        render(<Sidebar />);
        fireEvent.click(sidebar().getByRole('button', { name: BORD }));
        expect(useWorksheetStore.getState().view).toBe('whiteboard');
    });

    test('the Overzicht tab keeps the row', () => {
        useWorksheetStore.setState({ sidebarTab: 'overzicht' });
        render(<Sidebar />);
        expect(sidebar().getByRole('button', { name: OEFEN })).toBeTruthy();
        expect(sidebar().getByRole('button', { name: BORD })).toBeTruthy();
    });

    test('a locked curriculum hides Oefenmodus only', () => {
        useWorksheetStore.setState({ curriculum: { locked: true, allowedTypes: [] } });
        render(<Sidebar />);
        expect(sidebar().queryByRole('button', { name: OEFEN })).toBeNull();
        expect(sidebar().getByRole('button', { name: BORD })).toBeTruthy();
    });

    test('the TopBar has neither, also not in the Meer menu', () => {
        render(<TopBar onPrint={() => { }} />);
        const bar = within(document.querySelector('.topbar') as HTMLElement);
        expect(bar.queryByRole('button', { name: OEFEN })).toBeNull();
        expect(bar.queryByRole('button', { name: BORD })).toBeNull();
        fireEvent.click(bar.getByRole('button', { name: /^Meer/ }));
        expect(bar.queryByText('Oefenmodus')).toBeNull();
        expect(bar.queryByText('Bordmodus')).toBeNull();
    });
});
