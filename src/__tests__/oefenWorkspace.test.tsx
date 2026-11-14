// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, renderHook, cleanup, fireEvent, screen, within, act } from '@testing-library/react';

// Fixed ids so the link can be compared byte for byte with what the old builder modal made.
vi.mock('../services/oefenen/session', async (orig) => ({ ...(await orig<typeof import('../services/oefenen/session')>()), newSessieId: () => 'fixedid1' }));

import Sidebar from '../components/layout/sidebar';
import OefenmodusView from '../components/oefenen/OefenmodusView';
import OefenWorkspace from '../components/oefenen/OefenWorkspace';
import MijnBladenView from '../components/library/MijnBladenView';
import { listOefenLeaves } from '../components/oefenen/oefenBuild';
import { useOefenBuilder } from '../components/oefenen/useOefenBuilder';
import { decodeSessie } from '../services/oefenen/session';
import { saveOefenSessie } from '../services/persistence';
import type { OefenSessie } from '../services/oefenen/types';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { leafBtn as addBtn } from './helpers/oefenSidebar';

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
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect: vi.fn(), fillStyle: '' } as unknown as CanvasRenderingContext2D);
    useWorksheetStore.setState({ curriculum: null, view: 'editor', selectedGrade: null, oefenInitial: null, oefenReturn: 'editor' });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); useWorksheetStore.getState().clearDraftBlocks(); useWorksheetStore.setState({ view: 'editor' }); });

const label = (id: string) => listOefenLeaves().find(l => l.id === id)!.label;
const bar = () => within(screen.getByRole('banner'));
const inspector = () => within(screen.getByRole('complementary', { name: 'Instellingen' }));
const card = (name: string) => within(screen.getByRole('region', { name }));
const cards = () => within(screen.getByRole('main', { name: 'Sessie' })).queryAllByRole('region').filter(r => r.hasAttribute('aria-current') || r.querySelector('[aria-label="Voorbeeld op het toestel van de leerling"]'));
const section = (title: string) => {
    const open = inspector().queryByRole('button', { name: new RegExp(`^${title}`), expanded: true });
    if (!open) fireEvent.click(inspector().getByRole('button', { name: new RegExp(`^${title}`), expanded: false }));
};
const sessie = (title: string) => { fireEvent.click(inspector().getByRole('button', { name: 'Hele sessie' })); section(title); };
// Delen, read the link, close the share modal again.
function shared(): { href: string; sessie: OefenSessie } {
    fireEvent.click(bar().getByRole('button', { name: 'Delen' }));
    const href = screen.getByRole('link').getAttribute('href')!;
    fireEvent.click(screen.getAllByRole('button', { name: 'Sluiten' }).at(-1)!);
    return { href, sessie: decodeSessie(href.split('#oefen=')[1]) };
}

describe('opening the Oefenmodus workspace', () => {
    test('the sidebar foot button opens the view; "Werkblad" goes back to the editor and drops the drafts', async () => {
        render(<Sidebar />);
        fireEvent.click(screen.getByRole('button', { name: /^Oefenmodus/ }));
        expect(useWorksheetStore.getState().view).toBe('oefenmodus');
        cleanup();
        render(<OefenmodusView />);
        const back = await screen.findByRole('button', { name: 'Werkblad' });
        expect(screen.getByText('Klik links op een oefening om ze aan de sessie toe te voegen.')).toBeTruthy();
        fireEvent.click(addBtn('procenten-nemen'));
        expect(useWorksheetStore.getState().draftBlocks).toHaveLength(1);
        fireEvent.click(back);
        expect(useWorksheetStore.getState().view).toBe('editor');
        cleanup();
        expect(useWorksheetStore.getState().draftBlocks).toHaveLength(0);
    });

    test('Mijn bladen: Bewerken opens the saved session; the back button says Mijn bladen and returns there', async () => {
        const saved: OefenSessie = {
            v: 1, id: 'lib1', title: 'Procenten', createdAt: 60_000, mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false,
            types: [{ typeId: 'procenten', leafId: 'procenten-nemen', label: label('procenten-nemen'), constraints: { ...listOefenLeaves().find(l => l.id === 'procenten-nemen')!.constraints }, weight: 100 }],
        };
        saveOefenSessie(saved, 'Procenten');
        useWorksheetStore.setState({ view: 'mijn-bladen' });
        render(<MijnBladenView />);
        fireEvent.click(screen.getByRole('button', { name: /Bewerken/ }));
        expect(useWorksheetStore.getState()).toMatchObject({ view: 'oefenmodus', oefenReturn: 'mijn-bladen' });
        expect(useWorksheetStore.getState().oefenInitial?.id).toBe('lib1');
        cleanup();
        render(<OefenmodusView />);
        fireEvent.click(await screen.findByRole('button', { name: 'Mijn bladen' }));
        expect(useWorksheetStore.getState().view).toBe('mijn-bladen');
    });
});

describe('the session as cards', () => {
    test('adding a row shows its card with a kiosk sample, selects it and opens Wat oefenen ze', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        expect(inspector().getByRole('button', { name: 'Oefening' }).hasAttribute('disabled')).toBe(true);
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        const c = card(label('hr-std-optellen-nat'));
        expect(c.getByRole('img', { name: 'Voorbeeld op het toestel van de leerling' }).querySelector('.kiosk-card')).toBeTruthy();
        expect(c.getByText('Geen limiet')).toBeTruthy();
        expect(inspector().getByRole('button', { name: 'Oefening 1' }).getAttribute('aria-pressed')).toBe('true');
        expect(inspector().getByRole('button', { name: /^Wat oefenen ze/ }).getAttribute('aria-expanded')).toBe('true');
        expect(screen.getByText('1 soort in de sessie')).toBeTruthy();
    });

    test('clicking a card selects it; Hele sessie and back keep the selection', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        expect(inspector().getByRole('button', { name: 'Oefening 2' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('region', { name: label('procenten-nemen') }));
        expect(inspector().getByRole('button', { name: 'Oefening 1' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(inspector().getByRole('button', { name: 'Hele sessie' }));
        expect(inspector().getByRole('button', { name: /^Sessie/ })).toBeTruthy();
        fireEvent.click(inspector().getByRole('button', { name: 'Oefening 1' }));
        expect(inspector().getByRole('button', { name: /^Wat oefenen ze/ })).toBeTruthy();
    });

    test('a session setting changes the link: testmodus in Hele sessie > Feedback, with its summary', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        expect(shared().sessie.testMode).toBe(false);
        sessie('Feedback');
        fireEvent.click(screen.getByRole('switch', { name: /Testmodus/ }));
        expect(inspector().getByRole('button', { name: /^Feedback/ }).textContent).toMatch(/Testmodus · 1 kans · resultaten op het einde/);
        expect(shared().sessie.testMode).toBe(true);
    });

    test('move down, duplicate and delete: the link follows the cards', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        fireEvent.click(card(label('procenten-nemen')).getByRole('button', { name: 'Omlaag' }));
        expect(shared().sessie.types.map(t => t.leafId)).toEqual(['hr-std-optellen-nat', 'procenten-nemen']);
        // The copy lands right under its source, with the same settings and its own draft.
        fireEvent.click(card(label('hr-std-optellen-nat')).getByRole('button', { name: 'Dupliceren' }));
        expect(useWorksheetStore.getState().draftBlocks).toHaveLength(3);
        const three = shared().sessie.types;
        expect(three.map(t => t.leafId)).toEqual(['hr-std-optellen-nat', 'hr-std-optellen-nat', 'procenten-nemen']);
        expect(three[1].constraints).toEqual(three[0].constraints);
        expect(inspector().getByRole('button', { name: 'Oefening 2' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getAllByRole('button', { name: 'Verwijderen' })[0]);
        expect(shared().sessie.types.map(t => t.leafId)).toEqual(['hr-std-optellen-nat', 'procenten-nemen']);
        expect(cards()).toHaveLength(2);
    });

    test('Ander voorbeeld draws another kiosk exercise for the same settings', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        const sample = () => card(label('hr-std-optellen-nat')).getByRole('img', { name: 'Voorbeeld op het toestel van de leerling' }).innerHTML;
        const before = sample();
        expect(sample()).toBe(before);
        const draftsBefore = useWorksheetStore.getState().draftBlocks[0].constraints;
        let changed = false;
        for (let i = 0; i < 4 && !changed; i++) {
            fireEvent.click(card(label('hr-std-optellen-nat')).getByRole('button', { name: 'Ander voorbeeld' }));
            changed = sample() !== before;
        }
        expect(changed).toBe(true);
        // A new sample never touches the row's settings (so never the link or its id).
        expect(useWorksheetStore.getState().draftBlocks[0].constraints).toBe(draftsBefore);
    });

    test('a dead row: red card, Delen off, Opslaan still on', () => {
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('patronen-kettingsommen'));
        act(() => {
            const st = useWorksheetStore.getState();
            st.setDraftBlocks(st.draftBlocks.map(b => ({ ...b, constraints: { ...b.constraints, ops: ['x'], chainLength: 5, maxGetal: 20 } })));
        });
        expect(card(label('patronen-kettingsommen')).getByText('Geen oefeningen')).toBeTruthy();
        expect((bar().getByRole('button', { name: 'Delen' }) as HTMLButtonElement).disabled).toBe(true);
        expect((bar().getByRole('button', { name: 'Opslaan' }) as HTMLButtonElement).disabled).toBe(false);
        sessie('Delen');
        expect((inspector().getByRole('button', { name: /Link en QR-code/ }) as HTMLButtonElement).disabled).toBe(true);
    });
});

describe('the link is the old builder modal\'s link', () => {
    // Recorded from OefenBuilderModal (rc-oefenen 1b30feb5) with the same clicks, id 'fixedid1' and this clock.
    const GOLDEN = 'http://localhost:3000/oefenen.html#oefen=HWFTCCWDGAIAJPZCV3PMEJ63YFHJOB7EAVBIKQEKHF6JNGYIJQ7JMPRPROKIBN22MZ3RZAY6OKSCREIJO2PPUFXQQXQVZDZ2ONL6GYJHWD2XBY6JDIOYNCXGB2XDUFDFSFTQQSV7O4XKVIC3B25C7SNMXKX6N4ZWTJPCTN2SZJ25XSD32BOQ4AUPP7A7ULY';

    test('three rows, willekeurig, 15 min, 2 kansen, a limit, a weight and klok als uu:mm', () => {
        vi.spyOn(Date, 'now').mockReturnValue(1_790_000_000_000);
        useWorksheetStore.setState({ selectedGrade: 5 });
        render(<OefenWorkspace onClose={() => { }} />);
        fireEvent.click(addBtn('procenten-nemen'));
        fireEvent.click(addBtn('hr-std-optellen-nat'));
        fireEvent.click(addBtn('klok-analoog-lezen'));
        fireEvent.change(screen.getByLabelText('Naam van de sessie'), { target: { value: 'Mix' } });
        sessie('Sessie');
        fireEvent.click(screen.getByRole('button', { name: 'Willekeurig' }));
        sessie('Tijd en aantal');
        fireEvent.click(screen.getByRole('button', { name: '15 min' }));
        sessie('Feedback');
        fireEvent.click(within(screen.getByRole('group', { name: 'Kansen per oefening' })).getByRole('button', { name: '2' }));
        fireEvent.click(screen.getByRole('region', { name: label('procenten-nemen') }));
        section('Hoeveel');
        fireEvent.change(screen.getByLabelText(/^Aantal:/), { target: { value: '12' } });
        fireEvent.click(screen.getByRole('region', { name: label('hr-std-optellen-nat') }));
        fireEvent.change(screen.getByLabelText(/^Kans:/), { target: { value: '80' } });
        fireEvent.click(screen.getByRole('region', { name: label('klok-analoog-lezen') }));
        section('Antwoord');
        fireEvent.click(within(screen.getByRole('group', { name: 'Antwoord' })).getByRole('button', { name: 'Als uu:mm' }));
        expect(shared().href).toBe(GOLDEN);
    });
});

describe('useOefenBuilder.addLeaf (the sidebar contract)', () => {
    test('an Eenvoudig card: its constraints as given (no leerjaar re-seed), its long name cut and kept out of the link', () => {
        useWorksheetStore.setState({ selectedGrade: 1 });
        const { result } = renderHook(() => useOefenBuilder());
        const card = { maxGetal: 1000, numberType: 'natural' };
        const long = 'Optellen tot 1000 '.repeat(8);
        let key: string | null = null;
        act(() => { key = result.current.addLeaf('hr-std-optellen-nat', card, long); });
        expect(useWorksheetStore.getState().draftBlocks[0].constraints).toMatchObject({ maxGetal: 1000 });
        expect(result.current.rows[0].cardLabel).toBe(long.trim().slice(0, 80));
        expect(result.current.sessie.types[0].label).toBe(label('hr-std-optellen-nat'));
        expect(key).toBe(result.current.rows[0].key);
        // A plain leaf click still seeds at the sidebar leerjaar.
        act(() => { result.current.addLeaf('hr-std-optellen-nat'); });
        expect(useWorksheetStore.getState().draftBlocks[1].constraints).toMatchObject({ maxGetal: 20 });
        expect(result.current.addLeaf('not-a-leaf')).toBeNull();
    });

    test('a card counts its own rows; the leaf counts them all; the card id stays out of the link', () => {
        const { result } = renderHook(() => useOefenBuilder());
        const linkBefore = () => JSON.stringify(result.current.sessie.types);
        act(() => { result.current.addLeaf('hr-std-optellen-nat', { maxGetal: 100 }, 'Optellen tot 100', 'var-a'); });
        act(() => { result.current.addLeaf('hr-std-optellen-nat', { maxGetal: 1000 }, 'Optellen tot 1000', 'var-b'); });
        act(() => { result.current.addLeaf('hr-std-optellen-nat'); });
        act(() => { result.current.duplicateRow(result.current.rows[0].key); });
        expect(result.current.countOf('hr-std-optellen-nat')).toBe(4);
        expect(result.current.countOfCard(['var-a'])).toBe(2);
        expect(result.current.countOfCard(['var-b', 'var-c'])).toBe(1);
        expect(result.current.countOfCard(['var-c'])).toBe(0);
        expect(linkBefore()).not.toContain('var-');
    });

    test('full at 20 rows: addLeaf refuses and full is set (the sidebar shows its notice)', () => {
        const { result } = renderHook(() => useOefenBuilder());
        for (let i = 0; i < 20; i++) act(() => { result.current.addLeaf('hr-std-optellen-nat'); });
        expect(result.current.full).toBe(true);
        let key: string | null = 'x';
        act(() => { key = result.current.addLeaf('hr-std-optellen-nat'); });
        expect(key).toBeNull();
        expect(result.current.rows).toHaveLength(20);
    });
});

describe('a full session in the workspace', () => {
    test('the workspace has the full-session notice in its sidebar at 20 rows', () => {
        useWorksheetStore.setState({ view: 'oefenmodus' });
        render(<OefenmodusView />);
        const add = () => fireEvent.click(addBtn('hr-std-optellen-nat'));
        for (let i = 0; i < 20; i++) add();
        const side = within(document.querySelector('aside.oefen-sidebar') as HTMLElement);
        expect(side.getByRole('status').textContent).toMatch(/De sessie is vol/);
    });
});
