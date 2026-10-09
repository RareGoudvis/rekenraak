// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, within, act } from '@testing-library/react';
import OefenBuilderModal from '../components/oefenen/OefenBuilderModal';
import OefenShareModal from '../components/oefenen/OefenShareModal';
import { buildSessie, listOefenLeaves, normaliseWeights, rowYields, rowsFromSessie, type BuilderRow, type BuilderSettings } from '../components/oefenen/oefenBuild';
import { kioskSupports } from '../services/oefenen/kiosk';
import { denominationLabel } from '../services/geld/geldGenerator';
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
// Several leaves share a label ("Natuurlijke getallen" under hoofdrekenen and cijferen):
// the buttons follow the list order, so the leaf's rank among its namesakes picks its button.
const addBtn = (id: string) => {
    const { label } = leaf(id);
    const rank = listOefenLeaves().filter(l => l.label === label).findIndex(l => l.id === id);
    return screen.getAllByRole('button', { name: (name: string) => name.replace(/\d+×$/, '') === label })[rank];
};
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

    test('Kansen 1 / 2: 2 goes in the link; testmodus disables it, says why, and ships 1', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        const kansen = within(screen.getByRole('group', { name: 'Kansen per oefening' }));
        expect(kansen.getByRole('button', { name: '1' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(kansen.getByRole('button', { name: '2' }));
        expect(kansen.getByRole('button', { name: '2' }).getAttribute('aria-pressed')).toBe('true');
        const linkNow = () => {
            fireEvent.click(footerBtn('Delen'));
            const href = screen.getByRole('link').getAttribute('href')!;
            // The share modal's own Sluiten sits on top of the builder's.
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

    test('a row with settings the kiosk cannot check shows a hint and keeps Delen off', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
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

describe('OefenBuilderModal title', () => {
    test('the library name typed at Opslaan becomes the session title', () => {
        const spy = vi.spyOn(window, 'prompt').mockReturnValue('Week 6 tafels');
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));
        spy.mockRestore();
        const saved = loadOefenSessies();
        expect(saved[0].name).toBe('Week 6 tafels');
        expect(saved[0].sessie.title).toBe('Week 6 tafels');
        expect((screen.getByLabelText('Titel') as HTMLInputElement).value).toBe('Week 6 tafels');
    });
});

describe('OefenBuilderModal kans slider', () => {
    test('one row: 100 %, slider disabled with a hint; a second row enables both and splits', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.click(screen.getByRole('button', { name: 'Willekeurig' }));
        const one = screen.getByLabelText(/^Kans:/) as HTMLInputElement;
        expect(one.disabled).toBe(true);
        expect(screen.getByText('Kans: 100%')).toBeTruthy();
        expect(screen.getByText('Voeg een tweede soort toe om de kansen te verdelen.')).toBeTruthy();
        fireEvent.click(addBtn('procenten-welk'));
        const sliders = screen.getAllByLabelText(/^Kans:/) as HTMLInputElement[];
        expect(sliders.every(s => !s.disabled)).toBe(true);
        fireEvent.change(sliders[0], { target: { value: '100' } });
        fireEvent.change(sliders[1], { target: { value: '50' } });
        expect(screen.getByText('Kans: 67%')).toBeTruthy();
        expect(screen.getByText('Kans: 33%')).toBeTruthy();
        expect(screen.queryByText('Voeg een tweede soort toe om de kansen te verdelen.')).toBeNull();
    });
});

describe('OefenBuilderModal limit slider', () => {
    test('the right end past 50 means unlimited, other values become the session limit', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        const slider = screen.getByLabelText(/^Aantal:/) as HTMLInputElement;
        expect(slider.type).toBe('range');
        expect(slider.min).toBe('1');
        expect(slider.max).toBe('51');
        expect(slider.value).toBe('51');
        expect(screen.getByText('Aantal: ∞')).toBeTruthy();
        fireEvent.change(slider, { target: { value: '12' } });
        expect(screen.getByText('Aantal: 12')).toBeTruthy();
        fireEvent.click(footerBtn('Delen'));
        const link = screen.getByRole('link').getAttribute('href')!;
        expect(decodeSessie(link.split('#oefen=')[1]).types[0].limit).toBe(12);
        cleanup();
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.change(screen.getByLabelText(/^Aantal:/), { target: { value: '7' } });
        fireEvent.change(screen.getByLabelText(/^Aantal:/), { target: { value: '51' } });
        expect(screen.getByText('Aantal: ∞')).toBeTruthy();
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

describe('OefenBuilderModal pre-flight (no exercises)', () => {
    const DEAD = 'Deze instellingen leveren geen oefeningen op.';
    const rowOf = (id: string) => within(screen.getByRole('region', { name: leaf(id).label }));

    test('klok lezen with every tijdstype unticked: red note, Delen off; one ticked again clears both', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
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

    // The draft block's constraints, read back from the store after each click.
    const draftKey = <T,>(key: string) => useWorksheetStore.getState().draftBlocks[0].constraints[key as never] as T;
    // The tafel buttons come after the term-count row (also 2 / 3 / 4) in the hr config.
    const tableBtn = (id: string, t: number) => rowOf(id).getAllByRole('button', { name: String(t) }).at(-1)!;

    test.each(['hr-std-vermenigvuldigen-nat', 'hr-std-delen-nat'])('%s: the last tafel cannot be unticked', (id) => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn(id));
        for (const t of [...draftKey<number[]>('selectedTables')]) fireEvent.click(tableBtn(id, t));
        expect(draftKey<number[]>('selectedTables')).toHaveLength(1);
        expect(screen.queryByText(DEAD)).toBeNull();
    });

    test('hr-std-delen-nat: 0 alone is no deeltafel, so the last other deler stays', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('hr-std-delen-nat'));
        fireEvent.click(tableBtn('hr-std-delen-nat', 0));
        for (const t of draftKey<number[]>('selectedTables').filter(t => t !== 0)) fireEvent.click(tableBtn('hr-std-delen-nat', t));
        expect(draftKey<number[]>('selectedTables').filter(t => t !== 0)).toHaveLength(1);
        expect(screen.queryByText(DEAD)).toBeNull();
    });

    test('hr-std-delen-nat met rest: the last visible deler cannot be unticked', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
        fireEvent.click(addBtn('hr-std-delen-nat'));
        fireEvent.click(rowOf('hr-std-delen-nat').getByRole('button', { name: 'Met rest' }));
        for (const t of [...draftKey<number[]>('selectedTables')]) fireEvent.click(tableBtn('hr-std-delen-nat', t));
        expect(draftKey<number[]>('selectedTables')).toHaveLength(1);
        expect(screen.queryByText(DEAD)).toBeNull();
    });

    test('geld-teruggeven: the last "betalen met" biljet cannot be unticked', () => {
        render(<OefenBuilderModal onClose={() => { }} />);
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
