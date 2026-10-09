// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import MijnBladenView from '../components/library/MijnBladenView';
import { loadOefenSessies, saveOefenSessie } from '../services/persistence';
import type { OefenSessie } from '../services/oefenen/types';

const sessie: OefenSessie = {
    v: 1, id: 'a', title: 'Tafels', createdAt: 1, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false,
    types: [{ typeId: 'procenten', leafId: 'procenten-nemen', label: 'Percent', constraints: {}, weight: 100 }],
};

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

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
