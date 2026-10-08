// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, within, act } from '@testing-library/react';
import OefenBuilderModal from '../components/oefenen/OefenBuilderModal';
import OefenShareModal from '../components/oefenen/OefenShareModal';
import { buildSessie, listOefenLeaves, normaliseWeights, rowsFromSessie, type BuilderRow, type BuilderSettings } from '../components/oefenen/oefenBuild';
import { loadOefenSessies } from '../services/persistence';
import { useWorksheetStore } from '../store/useWorksheetStore';
import type { OefenSessie } from '../services/oefenen/types';
import { decodeSessie } from '../services/oefenen/session';

// The previews lazy-mount on scroll and measure with ResizeObserver; jsdom has neither.
class VisibleObserver {
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) { this.cb = cb; }
    observe(el: Element) { this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
    unobserve() { }
    disconnect() { }
}
class NoopResize { observe() { } unobserve() { } disconnect() { } }
const g = globalThis as unknown as Record<string, unknown>;
g.IntersectionObserver = VisibleObserver;
g.ResizeObserver = NoopResize;

beforeEach(() => {
    localStorage.clear();
    // jsdom has no 2d canvas; the QR only needs a context that swallows fillRect.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), fillStyle: '' } as unknown as CanvasRenderingContext2D);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); useWorksheetStore.getState().clearDraftBlocks(); });

const leaf = (id: string) => {
    const l = listOefenLeaves().find(x => x.id === id);
    if (!l) throw new Error(`leaf ${id} is not kiosk-capable`);
    return l;
};
// The left-hand button for a leaf: its label plus the "1×" counter once added.
// The footer button is the last "Delen": a hr-std leaf is called Delen too.
const footerBtn = (name: string) => screen.getAllByRole('button', { name }).at(-1) as HTMLButtonElement;
const addBtn = (id: string) => screen.getByRole('button', { name: (name: string) => name.replace(/\d+×$/, '') === leaf(id).label });
const settings: BuilderSettings = { id: 'sess1', createdAt: 1, title: ' Tafels ', mode: 'willekeurig', allowRepeatType: true, timerMin: 15, testMode: true, statsLocked: true };

describe('normaliseWeights', () => {
    test('whole percentages that sum to exactly 100', () => {
        expect(normaliseWeights([30, 10])).toEqual([75, 25]);
        const three = normaliseWeights([1, 1, 1]);
        expect(three.reduce((a, b) => a + b, 0)).toBe(100);
        expect(normaliseWeights([0, 0])).toEqual([50, 50]);
        expect(normaliseWeights([])).toEqual([]);
    });
});

describe('buildSessie', () => {
    const rows: BuilderRow[] = [
        { key: 'a', leaf: leaf('procenten-nemen'), constraints: { subType: 'nemen' }, limit: 10, weight: 30 },
        { key: 'b', leaf: leaf('hr-std-optellen-nat'), constraints: { numberType: 'natural' }, weight: 10 },
    ];

    test('two rows become a valid session: weights normalised, limit, flags, frozen instruction', () => {
        const { sessie, excluded } = buildSessie(rows, settings);
        expect(excluded).toEqual([]);
        expect(sessie).toMatchObject({ v: 1, id: 'sess1', title: 'Tafels', mode: 'willekeurig', allowRepeatType: true, timerMin: 15, testMode: true, statsLocked: true });
        expect(sessie.types.map(t => t.weight)).toEqual([75, 25]);
        expect(sessie.types[0]).toMatchObject({ typeId: 'procenten', leafId: 'procenten-nemen', limit: 10 });
        expect(sessie.types[1].limit).toBeUndefined();
        expect(typeof sessie.types[0].instruction).toBe('string');
        expect(() => JSON.stringify(sessie)).not.toThrow();
    });

    test('afwisselen never allows a repeat; an empty timer and title are left out', () => {
        const { sessie } = buildSessie(rows, { ...settings, mode: 'afwisselen', timerMin: undefined, title: '  ' });
        expect(sessie.allowRepeatType).toBe(false);
        expect('timerMin' in sessie).toBe(false);
        expect('title' in sessie).toBe(false);
    });

    test('a row the kiosk cannot check is excluded and does not take weight', () => {
        // Starts as a supported 'simpel' leaf; the teacher then flips it to the rooster the kiosk cannot check.
        const rooster: BuilderRow = { key: 'c', leaf: leaf('afronden-nat-simpel'), constraints: { subType: 'rooster' }, weight: 80 };
        const { sessie, excluded } = buildSessie([...rows, rooster], settings);
        expect(excluded.map(r => r.key)).toEqual(['c']);
        expect(sessie.types).toHaveLength(2);
        expect(sessie.types.map(t => t.weight)).toEqual([75, 25]);
    });

    test('rowsFromSessie reopens what buildSessie shipped', () => {
        const { sessie } = buildSessie(rows, settings);
        const back = rowsFromSessie(sessie);
        expect(back.map(r => r.leaf.id)).toEqual(['procenten-nemen', 'hr-std-optellen-nat']);
        expect(back[0].limit).toBe(10);
    });
});

describe('OefenBuilderModal', () => {
    test('adds two rows, sets willekeurig + timer, and shares a link that decodes to that session', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        expect(screen.getByText('2 soorten in de sessie')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Willekeurig' }));
        fireEvent.click(screen.getByRole('button', { name: '15 min' }));
        // Willekeurig reveals the chance sliders, each showing its normalised share.
        expect(screen.getAllByText(/^Kans: 50%$/)).toHaveLength(2);

        fireEvent.click(footerBtn('Delen'));
        const link = screen.getByRole('link').getAttribute('href')!;
        expect(link).toMatch(/\/oefenen\.html#oefen=/);
        const sessie = decodeSessie(link.split('#oefen=')[1]);
        expect(sessie.types.map(t => t.leafId)).toEqual(['procenten-nemen', 'hr-std-optellen-nat']);
        expect(sessie).toMatchObject({ mode: 'willekeurig', timerMin: 15, testMode: false, statsLocked: false });
    });

    test('a row with settings the kiosk cannot check shows a hint and keeps Delen off', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('afronden-nat-simpel'));
        expect(screen.queryByRole('status')).toBeNull();
        act(() => {
            const draft = useWorksheetStore.getState().draftBlocks[0];
            useWorksheetStore.getState().updateBlockSettings(draft.id, { constraints: { ...draft.constraints, subType: 'rooster' } });
        });
        expect(screen.getByRole('status').textContent).toMatch(/komt niet in de link/);
        expect(footerBtn('Delen').disabled).toBe(true);
    });

    test('Opslaan puts the session in the library under its title; reopening keeps the id', () => {
        const first = render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.change(screen.getByLabelText('Titel'), { target: { value: 'Procenten' } });
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        const saved = loadOefenSessies();
        expect(saved).toHaveLength(1);
        expect(saved[0].name).toBe('Procenten');
        first.unmount();

        render(<OefenBuilderModal onClose={() => { }} initial={saved[0].sessie} />);
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        expect(loadOefenSessies()).toHaveLength(1);
        expect(within(screen.getByLabelText('Instellingen van de sessie')).getByLabelText('Titel')).toBeTruthy();
    });
});

describe('OefenShareModal', () => {
    const small: OefenSessie = {
        v: 1, id: 'x', title: 'Klein', createdAt: 1, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false,
        types: [{ typeId: 'procenten', leafId: 'procenten-nemen', label: 'Percent', constraints: { subType: 'nemen' }, weight: 100 }],
    };

    test('shows the link and a QR for a normal session', () => {
        render(<OefenShareModal sessie={small} onClose={() => { }} />);
        const a = screen.getByRole('link');
        expect(a.getAttribute('href')).toContain('#oefen=');
        expect(a.getAttribute('target')).toBe('_blank');
        expect(screen.getByText('Klein')).toBeTruthy();
        expect(screen.queryByRole('textbox')).toBeNull();
        expect(screen.getByText(/^QR-versie \d+ · \d+×\d+ blokjes$/)).toBeTruthy();
        expect(screen.queryByText(/Grote QR/)).toBeNull();
        expect(screen.getByRole('img', { name: /QR-code/ })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: /Groot tonen/ }));
        expect(screen.getAllByRole('img', { name: /QR-code/ })).toHaveLength(2);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.getAllByRole('img', { name: /QR-code/ })).toHaveLength(1);
    });

    test('a QR past version 25 gets the "show it big or share the link" note', () => {
        // ~1.5 kB of incompressible hex lands around version 33.
        const noise = Array.from({ length: 3000 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        render(<OefenShareModal sessie={{ ...small, types: [{ ...small.types[0], constraints: { noise } }] }} onClose={() => { }} />);
        expect(screen.getByRole('note').textContent).toBe('Grote QR: toon hem groot op het bord of deel de link.');
    });

    test('Afdrukken (A5) prints only the A5 QR sheet and cleans up afterwards', async () => {
        const print = vi.spyOn(window, 'print').mockImplementation(() => { });
        render(<OefenShareModal sessie={small} onClose={() => { }} />);
        fireEvent.click(screen.getByRole('button', { name: /Afdrukken \(A5\)/ }));
        const sheet = document.querySelector('.oefen-qr-print')!;
        expect(sheet.textContent).toContain('Klein');
        expect(sheet.textContent).toContain('Scan met je toestel');
        expect(document.getElementById('oefen-qr-print-style')!.textContent).toMatch(/@page \{ size: A5/);
        await act(() => new Promise(r => setTimeout(r, 50)));
        expect(print).toHaveBeenCalledTimes(1);
        act(() => { window.dispatchEvent(new Event('afterprint')); });
        expect(document.querySelector('.oefen-qr-print')).toBeNull();
        expect(document.getElementById('oefen-qr-print-style')).toBeNull();
    });

    test('a session too big for a link shows a note instead of a link', () => {
        // Random hex does not compress, so this reliably overshoots the 30 kB link limit.
        const noise = Array.from({ length: 40000 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        render(<OefenShareModal sessie={{ ...small, types: [{ ...small.types[0], constraints: { noise } }] }} onClose={() => { }} />);
        expect(screen.getByRole('status').textContent).toMatch(/te groot voor een deelbare link/);
        expect(screen.queryByRole('link')).toBeNull();
    });
});
