// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import MijnBladenView from '../components/library/MijnBladenView';
import { loadOefenSessies, saveOefenSessie } from '../services/persistence';
import type { OefenSessie } from '../services/oefenen/types';

const sessie: OefenSessie = {
    v: 1, id: 'a', title: 'Tafels', createdAt: 1, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false,
    types: [{ typeId: 'procenten', leafId: 'procenten-nemen', label: 'Percent', constraints: {}, weight: 100 }],
};

beforeEach(() => {
    localStorage.clear();
    // jsdom has no 2d canvas; the share modal's QR only needs a context that swallows fillRect.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), fillStyle: '' } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Mijn bladen › Oefensessies (O20)', () => {
    test('Dupliceren adds a copy row under a new id, named "(kopie)"', () => {
        saveOefenSessie(sessie, 'Tafels week 3');
        render(<MijnBladenView />);
        fireEvent.click(screen.getByRole('button', { name: 'Dupliceren' }));
        expect(screen.getByText('Tafels week 3 (kopie)')).toBeTruthy();
        const ids = loadOefenSessies().map(e => e.id);
        expect(ids).toHaveLength(2);
        expect(new Set(ids).size).toBe(2);
    });
});

describe('Mijn bladen › Oefensessies › Delen runs the builder pre-flight', () => {
    // Kettingsommen × five times under 20 (1·2^5 = 32) generates nothing: the kiosk would end every run on it.
    const dead: OefenSessie = {
        ...sessie, id: 'dead', title: 'Ketting',
        types: [...sessie.types, { typeId: 'kettingsommen', leafId: 'patronen-kettingsommen', label: 'Kettingsommen', constraints: { ops: ['x'], chainLength: 5, maxGetal: 20 }, weight: 50 }],
    };

    test('a session with a dead row: no link, the red note names the row', () => {
        saveOefenSessie(dead, 'Ketting week 2');
        render(<MijnBladenView />);
        fireEvent.click(screen.getByRole('button', { name: 'Delen' }));
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByRole('alert').textContent).toMatch(/Kettingsommen.*levert geen oefeningen op/);
    });

    test('a healthy session opens the share modal', () => {
        saveOefenSessie(sessie, 'Tafels week 3');
        render(<MijnBladenView />);
        fireEvent.click(screen.getByRole('button', { name: 'Delen' }));
        expect(screen.queryByRole('alert')).toBeNull();
        expect((screen.getAllByRole('link') as HTMLAnchorElement[]).some(a => a.href.includes('#oefen='))).toBe(true);
    });
});
