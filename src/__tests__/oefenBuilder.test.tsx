// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, within, act } from '@testing-library/react';
import OefenWorkspace from '../components/oefenen/OefenWorkspace';
import OefenShareModal from '../components/oefenen/OefenShareModal';
import { buildSessie, filterOefenLeaves, listOefenLeaves, normaliseWeights, rowYields, rowsFromSessie, type BuilderRow, type BuilderSettings } from '../components/oefenen/oefenBuild';
import { kioskSupports } from '../services/oefenen/kiosk';
import { denominationLabel } from '../services/geld/geldGenerator';
import { loadOefenSessies } from '../services/persistence';
import { useWorksheetStore } from '../store/useWorksheetStore';
import type { OefenSessie } from '../services/oefenen/types';
import { decodeSessie } from '../services/oefenen/session';
import { LEERJAREN, leafAllowedForGrade } from '../config/gradePresets';
import { APP_STRUCTURE } from '../config/appstructure';
import { gradeShown, leafBtn as addBtn, pickGrade, queryLeafBtn, searchTree, shownLeafIds, showUitgebreid } from './helpers/oefenSidebar';

// The raw sidebar node of a leaf: what the sidebar's leerjaar filter reads.
const leafNode = (id: string) => APP_STRUCTURE.flatMap(d => d.subdomains.flatMap(s => s.types.flatMap(t => [t, ...(t.children ?? [])]))).find(l => l.id === id)!;

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
// The workspace's Opslaan / Delen sit in its top bar: a hr-std leaf in the catalogue is called Delen too.
const footerBtn = (name: string | RegExp) => within(screen.getByRole('banner')).getByRole('button', { name }) as HTMLButtonElement;
// The inspector: its scope switch, and a section opened by its title (the head's name starts with it).
const inspector = () => within(screen.getByRole('complementary', { name: 'Instellingen' }));
const scopeSessie = () => fireEvent.click(inspector().getByRole('button', { name: 'Hele sessie' }));
const openSection = (title: string) => {
    const head = inspector().getByRole('button', { name: new RegExp(`^${title}`), expanded: false });
    fireEvent.click(head);
};
// Session settings live in the Hele sessie scope, one section open at a time.
const sessieSection = (title: string) => { scopeSessie(); if (inspector().queryByRole('button', { name: new RegExp(`^${title}`), expanded: true }) === null) openSection(title); };
// Select a row by clicking its card (the selected row's settings show in the inspector).
const selectRow = (label: string) => fireEvent.click(within(screen.getByRole('region', { name: label })).getAllByRole('button')[0]);
const rowSection = (title: string) => { if (inspector().queryByRole('button', { name: new RegExp(`^${title}`), expanded: true }) === null) openSection(title); };
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
        // Starts as a supported 'herkennen' leaf; the teacher then flips it to measuring the kiosk cannot check.
        const rooster: BuilderRow = { key: 'c', leaf: leaf('vormleer-hoeken-herkennen'), constraints: { mode: 'meten' }, weight: 80 };
        const { sessie, excluded } = buildSessie([...rows, rooster], settings);
        expect(excluded.map(r => r.key)).toEqual(['c']);
        expect(sessie.types).toHaveLength(2);
        expect(sessie.types.map(t => t.weight)).toEqual([75, 25]);
    });

    test('2 kansen ships attempts 2; 1 kans and testmodus ship nothing (one try)', () => {
        expect(buildSessie(rows, { ...settings, testMode: false, attempts: 2 }).sessie.attempts).toBe(2);
        expect('attempts' in buildSessie(rows, { ...settings, testMode: false, attempts: 1 }).sessie).toBe(false);
        expect('attempts' in buildSessie(rows, { ...settings, testMode: true, attempts: 2 }).sessie).toBe(false);
    });

    test('rowsFromSessie reopens what buildSessie shipped', () => {
        const { sessie } = buildSessie(rows, settings);
        const back = rowsFromSessie(sessie);
        expect(back.map(r => r.leaf.id)).toEqual(['procenten-nemen', 'hr-std-optellen-nat']);
        expect(back[0].limit).toBe(10);
    });
});

describe('Oefenmodus workspace', () => {
    test('adds two rows, sets willekeurig + timer, and shares a link that decodes to that session', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        expect(screen.getByText('2 soorten in de sessie')).toBeTruthy();

        sessieSection('Sessie');
        fireEvent.click(screen.getByRole('button', { name: 'Willekeurig' }));
        sessieSection('Tijd en aantal');
        fireEvent.click(screen.getByRole('button', { name: '15 min' }));
        // Willekeurig puts each card's normalised share on a chip, and the selected row's slider says it too.
        expect(screen.getAllByText(/^Kans 50%$/)).toHaveLength(2);
        selectRow(leaf('procenten-nemen').label);
        expect(screen.getByText('Kans: 50%')).toBeTruthy();

        fireEvent.click(footerBtn('Delen'));
        const link = screen.getByRole('link').getAttribute('href')!;
        expect(link).toMatch(/\/oefenen\.html#oefen=/);
        const sessie = decodeSessie(link.split('#oefen=')[1]);
        expect(sessie.types.map(t => t.leafId)).toEqual(['procenten-nemen', 'hr-std-optellen-nat']);
        expect(sessie).toMatchObject({ mode: 'willekeurig', timerMin: 15, testMode: false, statsLocked: false });
    });

    test('Kansen 1 / 2: 2 goes in the link; testmodus disables it, says why, and ships 1', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        sessieSection('Feedback');
        const kansen = within(screen.getByRole('group', { name: 'Kansen per oefening' }));
        expect(kansen.getByRole('button', { name: '1' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(kansen.getByRole('button', { name: '2' }));
        expect(kansen.getByRole('button', { name: '2' }).getAttribute('aria-pressed')).toBe('true');
        const linkNow = () => {
            fireEvent.click(footerBtn('Delen'));
            const href = screen.getByRole('link').getAttribute('href')!;
            fireEvent.click(screen.getAllByRole('button', { name: 'Sluiten' }).at(-1)!);
            return decodeSessie(href.split('#oefen=')[1]);
        };
        expect(linkNow().attempts).toBe(2);

        fireEvent.click(screen.getByRole('switch', { name: /Testmodus/ }));
        expect((kansen.getByRole('button', { name: '2' }) as HTMLButtonElement).disabled).toBe(true);
        expect(kansen.getByRole('button', { name: '1' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByText(/In testmodus 1 kans/)).toBeTruthy();
        expect(linkNow().attempts).toBeUndefined();

        // Testmodus off again: the teacher's 2 comes back.
        fireEvent.click(screen.getByRole('switch', { name: /Testmodus/ }));
        expect(kansen.getByRole('button', { name: '2' }).getAttribute('aria-pressed')).toBe('true');
    });

    test('testmodus forces "Statistieken pas op het einde" on, disabled, says why; off again restores the choice', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        sessieSection('Feedback');
        const locked = () => screen.getByRole('switch', { name: /Statistieken pas op het einde/ }) as HTMLButtonElement;
        expect(locked().getAttribute('aria-checked')).toBe('false');
        fireEvent.click(screen.getByRole('switch', { name: /Testmodus/ }));
        expect(locked().getAttribute('aria-checked')).toBe('true');
        expect(locked().disabled).toBe(true);
        expect(screen.getByText(/In testmodus zie je de resultaten pas op het einde/)).toBeTruthy();
        fireEvent.click(screen.getByRole('switch', { name: /Testmodus/ }));
        expect(locked().getAttribute('aria-checked')).toBe('false');
        expect(locked().disabled).toBe(false);
    });

    test('a row with settings the kiosk cannot check shows a hint and keeps Delen off', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('vormleer-hoeken-herkennen'));
        expect(screen.queryByRole('status')).toBeNull();
        act(() => {
            const draft = useWorksheetStore.getState().draftBlocks[0];
            useWorksheetStore.getState().updateBlockSettings(draft.id, { constraints: { ...draft.constraints, mode: 'meten' } });
        });
        expect(screen.getByRole('status').textContent).toMatch(/komt niet in de link/);
        expect(footerBtn('Delen').disabled).toBe(true);
    });

    test('Opslaan puts the session in the library under its title; reopening keeps the id', () => {
        const first = render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.change(screen.getByLabelText('Naam van de sessie'), { target: { value: 'Procenten' } });
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        const saved = loadOefenSessies();
        expect(saved).toHaveLength(1);
        expect(saved[0].name).toBe('Procenten');
        first.unmount();

        render(<OefenWorkspace onClose={() => { }} initial={saved[0].sessie} />);
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        expect(loadOefenSessies()).toHaveLength(1);
        // Reopened on Hele sessie > Sessie, with the title in both the top bar and the section.
        expect((inspector().getByLabelText('Titel') as HTMLInputElement).value).toBe('Procenten');
        expect((screen.getByLabelText('Naam van de sessie') as HTMLInputElement).value).toBe('Procenten');
    });

    test('Bewerken: renaming keeps the id; changing a type saves a new id in the same library row', () => {
        const first = render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.change(screen.getByLabelText('Naam van de sessie'), { target: { value: 'Procenten' } });
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        const original = loadOefenSessies()[0].sessie;
        first.unmount();

        const renamed = render(<OefenWorkspace onClose={() => { }} initial={original} />);
        fireEvent.change(inspector().getByLabelText('Titel'), { target: { value: 'Procenten week 2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        expect(loadOefenSessies().map(e => [e.id, e.sessie.id, e.sessie.title])).toEqual([[original.id, original.id, 'Procenten week 2']]);
        renamed.unmount();

        const reopened = loadOefenSessies()[0].sessie;
        render(<OefenWorkspace onClose={() => { }} initial={reopened} />);
        selectRow(reopened.types[0].label);
        rowSection('Hoeveel');
        fireEvent.change(screen.getByLabelText(/^Aantal:/), { target: { value: '12' } });
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        const lib = loadOefenSessies();
        expect(lib).toHaveLength(1);
        expect(lib[0].sessie.id).not.toBe(original.id);
        expect(lib[0].id).toBe(lib[0].sessie.id);
        expect(lib[0].sessie.types[0].limit).toBe(12);
        // The link carries the new id too, so pupils start fresh instead of reopening the old run.
        fireEvent.click(footerBtn('Delen'));
        expect(decodeSessie(screen.getByRole('link').getAttribute('href')!.split('#oefen=')[1]).id).toBe(lib[0].sessie.id);
    });
});

describe('Oefenmodus workspace title', () => {
    test('the library name typed at Opslaan becomes the session title', () => {
        const spy = vi.spyOn(window, 'prompt').mockReturnValue('Week 6 tafels');
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        spy.mockRestore();
        const saved = loadOefenSessies();
        expect(saved[0].name).toBe('Week 6 tafels');
        expect(saved[0].sessie.title).toBe('Week 6 tafels');
        expect((screen.getByLabelText('Naam van de sessie') as HTMLInputElement).value).toBe('Week 6 tafels');
    });
});

describe('Oefenmodus workspace kans slider', () => {
    test('one row: 100 %, slider disabled with a hint; a second row enables both and splits', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        // Afwisselen: the pinned slider is off and says why.
        expect((screen.getByLabelText(/^Kans:/) as HTMLInputElement).disabled).toBe(true);
        expect(screen.getByText('Kans: om de beurt')).toBeTruthy();
        sessieSection('Sessie');
        fireEvent.click(screen.getByRole('button', { name: 'Willekeurig' }));
        selectRow(leaf('procenten-nemen').label);
        const one = screen.getByLabelText(/^Kans:/) as HTMLInputElement;
        expect(one.disabled).toBe(true);
        expect(screen.getByText('Kans: 100%')).toBeTruthy();
        expect(screen.getByText('Voeg een tweede soort toe om de kansen te verdelen.')).toBeTruthy();
        fireEvent.click(addBtn('procenten-welk'));
        // The new row is selected and its slider is live; then the first row's again.
        fireEvent.change(screen.getByLabelText(/^Kans:/), { target: { value: '50' } });
        selectRow(leaf('procenten-nemen').label);
        const first = screen.getByLabelText(/^Kans:/) as HTMLInputElement;
        expect(first.disabled).toBe(false);
        fireEvent.change(first, { target: { value: '100' } });
        expect(screen.getByText('Kans: 67%')).toBeTruthy();
        expect(screen.getByText('Kans 67%')).toBeTruthy();
        expect(screen.getByText('Kans 33%')).toBeTruthy();
        expect(screen.queryByText('Voeg een tweede soort toe om de kansen te verdelen.')).toBeNull();
    });
});

describe('Oefenmodus workspace limit slider', () => {
    test('the right end past 50 means unlimited, other values become the session limit', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        rowSection('Hoeveel');
        const slider = screen.getByLabelText(/^Aantal:/) as HTMLInputElement;
        expect(slider.type).toBe('range');
        expect(slider.min).toBe('1');
        expect(slider.max).toBe('51');
        expect(slider.value).toBe('51');
        expect(screen.getByText('Aantal: onbeperkt')).toBeTruthy();
        fireEvent.change(slider, { target: { value: '12' } });
        expect(screen.getByText('Aantal: 12')).toBeTruthy();
        fireEvent.click(footerBtn('Delen'));
        const link = screen.getByRole('link').getAttribute('href')!;
        expect(decodeSessie(link.split('#oefen=')[1]).types[0].limit).toBe(12);
        cleanup();
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        rowSection('Hoeveel');
        fireEvent.change(screen.getByLabelText(/^Aantal:/), { target: { value: '7' } });
        fireEvent.change(screen.getByLabelText(/^Aantal:/), { target: { value: '51' } });
        expect(screen.getByText('Aantal: onbeperkt')).toBeTruthy();
        fireEvent.click(footerBtn('Delen'));
        expect(decodeSessie(screen.getByRole('link').getAttribute('href')!.split('#oefen=')[1]).types[0].limit).toBeUndefined();
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
        let printed!: () => void;
        const printCalled = new Promise<void>((res) => { printed = res; });
        const print = vi.spyOn(window, 'print').mockImplementation(() => printed());
        render(<OefenShareModal sessie={small} onClose={() => { }} />);
        fireEvent.click(screen.getByRole('button', { name: /Afdrukken \(A5\)/ }));
        const sheet = document.querySelector('.oefen-qr-print')!;
        expect(sheet.textContent).toContain('Klein');
        expect(sheet.textContent).toContain('Scan met je toestel');
        expect(document.getElementById('oefen-qr-print-style')!.textContent).toMatch(/@page \{ size: A5/);
        // Await the print call itself: it lands two animation frames in, and a fixed 50 ms
        // sleep lost that race under full-suite load.
        await act(() => printCalled);
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

describe('Oefenmodus workspace pre-flight (no exercises)', () => {
    const DEAD = 'Deze instellingen leveren geen oefeningen op.';
    // The row's card (its sample and chips) and, once selected, its settings in the inspector.
    const cardOf = (id: string) => within(screen.getByRole('region', { name: leaf(id).label }));
    const rowOf = (id: string) => { selectRow(leaf(id).label); rowSection('Wat oefenen ze'); return inspector(); };

    test('klok lezen with every tijdstype unticked: red note, Delen off; one ticked again clears both', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.click(addBtn('klok-analoog-lezen'));
        expect(screen.queryByText(DEAD)).toBeNull();
        expect(footerBtn('Delen').disabled).toBe(false);

        // Through the row's real ClockConfig checkboxes, the way a teacher gets there.
        const boxes = () => rowOf('klok-analoog-lezen').getAllByRole('checkbox') as HTMLInputElement[];
        for (const box of boxes().filter(b => b.checked)) fireEvent.click(box);
        expect(boxes().every(b => !b.checked)).toBe(true);
        expect(rowOf('klok-analoog-lezen').getByText(DEAD)).toBeTruthy();
        // A healthy second row does not make it shareable: the dead row would end the pupil's run.
        expect(footerBtn('Delen').disabled).toBe(true);

        fireEvent.click(boxes()[0]);
        expect(screen.queryByText(DEAD)).toBeNull();
        expect(footerBtn('Delen').disabled).toBe(false);
    });

    test('a dead row: the preview says so (no "klik Genereer"), Opslaan says it saves anyway and does', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('patronen-kettingsommen'));
        // × five times under 20 (1·2^5 = 32): a setting KettingConfig offers that generates nothing.
        act(() => {
            const st = useWorksheetStore.getState();
            st.setDraftBlocks(st.draftBlocks.map(b => ({ ...b, constraints: { ...b.constraints, ops: ['x'], chainLength: 5, maxGetal: 20 } })));
        });
        expect(rowOf('patronen-kettingsommen').getByText(DEAD)).toBeTruthy();
        expect(cardOf('patronen-kettingsommen').getByText('Geen oefeningen met deze instellingen')).toBeTruthy();
        expect(cardOf('patronen-kettingsommen').getByText('Geen oefeningen')).toBeTruthy();
        expect(screen.queryByText(/klik Genereer/)).toBeNull();
        // Honest, not blocking: the footer says Opslaan keeps it but Delen waits.
        expect(screen.getByRole('note', { name: 'Opslaan zonder delen' }).textContent).toMatch(/opslaan.*delen/i);
        fireEvent.change(screen.getByLabelText('Naam van de sessie'), { target: { value: 'Klok' } });
        fireEvent.click(footerBtn('Opslaan'));
        expect(loadOefenSessies()).toHaveLength(1);
    });

    // The draft block's constraints, read back from the store after each click.
    const draftKey = <T,>(key: string) => useWorksheetStore.getState().draftBlocks[0].constraints[key as never] as T;
    // The tafel buttons come after the term-count row (also 2 / 3 / 4) in the hr config.
    const tableBtn = (id: string, t: number) => rowOf(id).getAllByRole('button', { name: String(t) }).at(-1)!;

    test.each(['hr-std-vermenigvuldigen-nat', 'hr-std-delen-nat'])('%s: the last tafel cannot be unticked', (id) => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn(id));
        for (const t of [...draftKey<number[]>('selectedTables')]) fireEvent.click(tableBtn(id, t));
        expect(draftKey<number[]>('selectedTables')).toHaveLength(1);
        expect(screen.queryByText(DEAD)).toBeNull();
    });

    test('hr-std-delen-nat: 0 alone is no deeltafel, so the last other deler stays', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('hr-std-delen-nat'));
        fireEvent.click(tableBtn('hr-std-delen-nat', 0));
        for (const t of draftKey<number[]>('selectedTables').filter(t => t !== 0)) fireEvent.click(tableBtn('hr-std-delen-nat', t));
        expect(draftKey<number[]>('selectedTables').filter(t => t !== 0)).toHaveLength(1);
        expect(screen.queryByText(DEAD)).toBeNull();
    });

    test('hr-std-delen-nat met rest: the last visible deler cannot be unticked', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('hr-std-delen-nat'));
        fireEvent.click(rowOf('hr-std-delen-nat').getByRole('button', { name: 'Met rest' }));
        for (const t of [...draftKey<number[]>('selectedTables')]) fireEvent.click(tableBtn('hr-std-delen-nat', t));
        expect(draftKey<number[]>('selectedTables')).toHaveLength(1);
        expect(screen.queryByText(DEAD)).toBeNull();
    });

    test('geld-teruggeven: the last "betalen met" biljet cannot be unticked', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('geld-teruggeven'));
        for (const v of [...draftKey<number[]>('payWithOptions')]) fireEvent.click(rowOf('geld-teruggeven').getByText(denominationLabel(v)));
        expect(draftKey<number[]>('payWithOptions')).toHaveLength(1);
        expect(screen.queryByText(DEAD)).toBeNull();
    });

    test('kioskSupports refuses a klok without tijdstypes; rowYields pre-flights one row', () => {
        expect(kioskSupports('klok-kloklezen', { timeTypes: [] })).toBe(false);
        expect(kioskSupports('klok-kloklezen', { timeTypes: ['uren'] })).toBe(true);
        const klok = leaf('klok-analoog-lezen');
        expect(rowYields({ leaf: klok, constraints: { ...klok.constraints, timeTypes: [] } })).toBe(false);
        expect(rowYields({ leaf: klok, constraints: { ...klok.constraints, timeTypes: ['uren'] } })).toBe(true);
    });
});

describe('Oefenmodus workspace catalogue search + leerjaar (O17)', () => {
    afterEach(() => { useWorksheetStore.setState({ selectedGrade: null }); });

    test('search narrows the tree case-insensitively, also on the leaf group; no hit says so', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        const all = shownLeafIds().length;
        searchTree('PERCENT');
        expect(shownLeafIds()).toContain('procenten-nemen');
        expect(shownLeafIds()).not.toContain('breuken-vereenvoudigen');
        expect(shownLeafIds().length).toBeLessThan(all);
        // "Analoge klok" is the parent of "Lezen": the sidebar finds its children by it too.
        searchTree('analoge klok');
        expect(shownLeafIds()).toContain('klok-analoog-lezen');
        searchTree('zzqq');
        expect(shownLeafIds()).toHaveLength(0);
        expect(screen.getByText('Geen oefening gevonden voor "zzqq".')).toBeTruthy();
        searchTree('');
        expect(shownLeafIds().length).toBe(all);
    });

    test('leerjaar: L4 hides a L5 leaf, L5 and Alle show it; the sidebar leerjaar is the start value', () => {
        useWorksheetStore.setState({ selectedGrade: 4 });
        render(<OefenWorkspace onClose={() => { }} />);
        showUitgebreid();
        expect(gradeShown()).toContain('L4');
        expect(queryLeafBtn('procenten-nemen')).toBeNull();
        pickGrade('L5');
        expect(queryLeafBtn('procenten-nemen')).not.toBeNull();
        pickGrade('L1');
        const l1 = shownLeafIds().length;
        pickGrade('Alle');
        expect(shownLeafIds().length).toBeGreaterThan(l1);
        // The builder's own filter never moves the sidebar's leerjaar.
        expect(useWorksheetStore.getState().selectedGrade).toBe(4);
    });

    test('a new row seeds at the sidebar leerjaar; a later leerjaar change seeds only new rows (triage item 4)', () => {
        useWorksheetStore.setState({ selectedGrade: 1 });
        render(<OefenWorkspace onClose={() => { }} />);
        const maxOf = (i: number) => (useWorksheetStore.getState().draftBlocks[i].constraints as Record<string, unknown>).maxGetal;
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        expect(maxOf(0)).toBe(20);
        act(() => { useWorksheetStore.setState({ selectedGrade: 3 }); });
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        expect(maxOf(0)).toBe(20);
        expect(maxOf(1)).toBe(1000);
    });

    test('filterOefenLeaves: same leerjaar rule as the sidebar (leafAllowedForGrade)', () => {
        const all = listOefenLeaves();
        for (const g of LEERJAREN) {
            const kept = new Set(filterOefenLeaves(all, '', g).map(l => l.id));
            for (const l of all) expect(kept.has(l.id), `${l.id} L${g}`).toBe(leafAllowedForGrade(leafNode(l.id), g));
        }
        expect(filterOefenLeaves(all, '  ', null)).toHaveLength(all.length);
    });
});

describe('OefenShareModal summary (O19)', () => {
    const base: OefenSessie = {
        v: 1, id: 'x', title: 'Klein', createdAt: 1, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false,
        types: [{ typeId: 'procenten', leafId: 'procenten-nemen', label: 'Percent', constraints: { subType: 'nemen' }, weight: 100 }],
    };
    const summary = () => screen.getByRole('list', { name: 'Samenvatting van de sessie' });
    const OWN = 'Elk toestel maakt zijn eigen oefeningen: leerlingen krijgen niet dezelfde sommen.';

    test('one unlimited type, no timer: singular, onbeperkt, geen timer, no toets, 1 kans, results always', () => {
        render(<OefenShareModal sessie={base} onClose={() => { }} />);
        const s = within(summary());
        expect(s.getByText('1 soort · onbeperkt')).toBeTruthy();
        expect(s.getByText('Timer: geen')).toBeTruthy();
        expect(s.getByText('Toets: nee')).toBeTruthy();
        expect(s.getByText('Kansen: 1')).toBeTruthy();
        expect(s.getByText('Resultaten: altijd')).toBeTruthy();
        expect(screen.getByText(OWN)).toBeTruthy();
    });

    test('limited types, timer, 2 kansen, results at the end; testmodus forces 1 kans and the end', () => {
        const two: OefenSessie = { ...base, timerMin: 15, attempts: 2, statsLocked: true, types: [{ ...base.types[0], limit: 10 }, { ...base.types[0], limit: 5 }] };
        render(<OefenShareModal sessie={two} onClose={() => { }} />);
        let s = within(summary());
        expect(s.getByText('2 soorten · 15 oefeningen')).toBeTruthy();
        expect(s.getByText('Timer: 15 min')).toBeTruthy();
        expect(s.getByText('Kansen: 2')).toBeTruthy();
        expect(s.getByText('Resultaten: pas op het einde')).toBeTruthy();
        cleanup();
        render(<OefenShareModal sessie={{ ...base, testMode: true, attempts: 2, types: [{ ...base.types[0], limit: 1 }] }} onClose={() => { }} />);
        s = within(summary());
        expect(s.getByText('1 soort · 1 oefening')).toBeTruthy();
        expect(s.getByText('Toets: ja')).toBeTruthy();
        expect(s.getByText('Kansen: 1')).toBeTruthy();
        expect(s.getByText('Resultaten: pas op het einde')).toBeTruthy();
    });
});

describe('exactForm control (O8 builder half)', () => {
    const SAME = 'Gelijkwaardig goedrekenen';
    const EXACT = 'Enkel de gevraagde vorm';
    // A row's Antwoord section, or null when the row has none.
    const antwoordOf = (id: string) => {
        selectRow(leaf(id).label);
        if (!inspector().queryByRole('button', { name: /^Antwoord/ })) return null;
        rowSection('Antwoord');
        return inspector().getByRole('group', { name: 'Antwoord' });
    };
    // The button reads "Opgeslagen" for 2 s after a save.
    const saved = () => { fireEvent.click(screen.getByRole('button', { name: /Opslaan|Opgeslagen/ })); return loadOefenSessies()[0].sessie; };

    test('preselected from the descriptor default; only a change is written to the row', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.change(screen.getByLabelText('Naam van de sessie'), { target: { value: 'Breuken' } });
        fireEvent.click(addBtn('breuken-vereenvoudigen'));
        fireEvent.click(addBtn('procenten-nemen'));
        // A leaf without a breuk answer (no exactFormDefault) gets no control.
        expect(antwoordOf('procenten-nemen')).toBeNull();
        const group = within(antwoordOf('breuken-vereenvoudigen')!);
        expect(group.getByRole('button', { name: EXACT }).getAttribute('aria-pressed')).toBe('true');
        expect(group.getByRole('button', { name: SAME }).getAttribute('aria-pressed')).toBe('false');
        expect('exactForm' in saved().types[0]).toBe(false);

        fireEvent.click(group.getByRole('button', { name: SAME }));
        expect(group.getByRole('button', { name: SAME }).getAttribute('aria-pressed')).toBe('true');
        expect(saved().types[0].exactForm).toBe(false);
        expect('exactForm' in saved().types[1]).toBe(false);

        // Back to the default: the row stores nothing again, so the link stays as short as before.
        fireEvent.click(group.getByRole('button', { name: EXACT }));
        expect('exactForm' in saved().types[0]).toBe(false);
    });

    test('buildSessie ships a row exactForm only where the descriptor has a default; rowsFromSessie reads it back', () => {
        const rows: BuilderRow[] = [
            { key: 'a', leaf: leaf('breuken-vereenvoudigen'), constraints: { ...leaf('breuken-vereenvoudigen').constraints }, weight: 50, exactForm: false },
            { key: 'b', leaf: leaf('procenten-nemen'), constraints: { subType: 'nemen' }, weight: 50, exactForm: true },
        ];
        const { sessie } = buildSessie(rows, settings);
        expect(sessie.types[0].exactForm).toBe(false);
        expect('exactForm' in sessie.types[1]).toBe(false);
        expect(rowsFromSessie(sessie)[0].exactForm).toBe(false);
    });
});

describe('builder stays within the link bounds (item 8)', () => {
    test('20 rows: a catalogue click adds nothing and a note says why; removing one makes room again', () => {
        // Reopened with 20 types: one render instead of 20 adds, each re-rendering every row.
        const type = { typeId: 'procenten', leafId: 'procenten-nemen', label: 'Percent', constraints: { ...leaf('procenten-nemen').constraints }, weight: 5 };
        const full: OefenSessie = { v: 1, id: 'full', title: 'Vol', createdAt: 1, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false, types: Array.from({ length: 20 }, () => ({ ...type })) };
        render(<OefenWorkspace onClose={() => { }} initial={full} />);
        expect(screen.getByText('20 soorten in de sessie')).toBeTruthy();
        expect(screen.getByText('Maximum 20 soorten per sessie.')).toBeTruthy();
        // A full session takes no more rows, from the catalogue nor by Dupliceren.
        fireEvent.click(addBtn('procenten-welk'));
        expect(screen.getByText('20 soorten in de sessie')).toBeTruthy();
        expect(screen.getAllByRole('button', { name: 'Dupliceren' }).every(b => (b as HTMLButtonElement).disabled)).toBe(true);
        fireEvent.click(screen.getAllByRole('button', { name: /Verwijderen/ })[0]);
        expect(screen.queryByText('Maximum 20 soorten per sessie.')).toBeNull();
        fireEvent.click(addBtn('procenten-welk'));
        expect(screen.getByText('20 soorten in de sessie')).toBeTruthy();
    });

    test('the title field takes at most 80 characters (the link refuses longer)', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        expect((screen.getByLabelText('Naam van de sessie') as HTMLInputElement).maxLength).toBe(80);
        expect((inspector().getByLabelText('Titel') as HTMLInputElement).maxLength).toBe(80);
    });
});

describe('klok description says what the kiosk asks (O21)', () => {
    // ClockConfig serves the sheet too, where lezen IS written in words: both answers are named.
    test('analoge klok lezen: in woorden in de oefenmodus; tekenen: wijzers slepen', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('klok-analoog-lezen'));
        fireEvent.click(addBtn('klok-analoog-tekenen'));
        expect(screen.getByText('Analoog · Tijd in woorden → wijzers tekenen op klok (oefenmodus: wijzers slepen)')).toBeTruthy();
        selectRow(leaf('klok-analoog-lezen').label);
        expect(screen.getByText('Analoog · Klok zien → tijd in woorden schrijven (oefenmodus: tijd in woorden)')).toBeTruthy();
    });

    test('the lezen row\'s Antwoord control: in woorden by default, als uu:mm renames the row and the hint follows', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('klok-analoog-lezen'));
        fireEvent.click(addBtn('klok-analoog-tekenen'));
        // Only the lezen row offers it.
        expect(inspector().queryByRole('button', { name: /^Antwoord/ })).toBeNull();
        selectRow(leaf('klok-analoog-lezen').label);
        rowSection('Antwoord');
        const groups = screen.getAllByRole('group', { name: 'Antwoord' });
        expect(groups).toHaveLength(1);
        const woorden = within(groups[0]).getByRole('button', { name: 'In woorden' });
        const digitaal = within(groups[0]).getByRole('button', { name: 'Als uu:mm' });
        expect(woorden.getAttribute('aria-pressed')).toBe('true');
        expect(digitaal.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(digitaal);
        expect(digitaal.getAttribute('aria-pressed')).toBe('true');
        rowSection('Wat oefenen ze');
        expect(screen.getByText('Analoog · Klok zien → tijd in woorden schrijven (oefenmodus: tijd typen als uu:mm)')).toBeTruthy();
        expect(screen.getByRole('region', { name: 'Analoge klok · lezen · uu:mm' })).toBeTruthy();
        expect(useWorksheetStore.getState().draftBlocks[0].constraints).toMatchObject({ klokAnswer: 'digitaal' });
        rowSection('Antwoord');
        fireEvent.click(within(screen.getByRole('group', { name: 'Antwoord' })).getByRole('button', { name: 'In woorden' }));
        expect(screen.getByRole('region', { name: 'Analoge klok · lezen' })).toBeTruthy();
    });
});

describe('Oefenmodus workspace endless-session hint (O18)', () => {
    const ENDLESS = 'Zonder limiet en zonder timer stopt de sessie pas als de leerling zelf op Stoppen tikt.';

    test('an unlimited row without a timer says when the run stops; a timer or limits on every row clear it', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        expect(screen.queryByText(ENDLESS)).toBeNull();
        fireEvent.click(addBtn('procenten-nemen'));
        expect(screen.getByText('Geen limiet')).toBeTruthy();
        sessieSection('Tijd en aantal');
        expect(screen.getByText(ENDLESS)).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: '10 min' }));
        expect(screen.queryByText(ENDLESS)).toBeNull();
        fireEvent.click(within(screen.getByRole('group', { name: 'Tijd' })).getByRole('button', { name: 'Uit' }));
        expect(screen.getByText(ENDLESS)).toBeTruthy();
        selectRow(leaf('procenten-nemen').label);
        rowSection('Hoeveel');
        fireEvent.change(screen.getByLabelText(/^Aantal:/), { target: { value: '12' } });
        sessieSection('Tijd en aantal');
        expect(screen.queryByText(ENDLESS)).toBeNull();
        expect(screen.getByText('12 oefeningen (de som van de limieten).')).toBeTruthy();
        // One unlimited row is enough to make the whole run endless.
        fireEvent.click(addBtn('procenten-welk'));
        sessieSection('Tijd en aantal');
        expect(screen.getByText(ENDLESS)).toBeTruthy();
    });
});
