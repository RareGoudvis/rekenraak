// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor, act, within } from '@testing-library/react';
import OefenSidebar from '../components/oefenen/OefenSidebar';
import { listOefenLeaves, seedRowConstraints, withKioskSeed } from '../components/oefenen/oefenBuild';
import { useEenvoudigUi } from '../components/eenvoudig/useEenvoudigUi';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { APP_STRUCTURE, flattenLeaves } from '../config/appstructure';
import { loadEenvoudigData, listCards, type EenvoudigData } from '../config/eenvoudig/cards';
import { EENVOUDIG_NAV, COMBO_TOPIC_ID } from '../config/eenvoudig/nav';
import { resolveCard } from '../config/eenvoudig/resolveCard';
import { kioskSupports } from '../services/oefenen/kiosk';
import { usableVariants } from '../oefenen/zelf/zelfSessie';

type Add = [string, Record<string, unknown> | undefined, string | undefined];

let data: EenvoudigData;
beforeAll(async () => { data = await loadEenvoudigData(); });
beforeEach(() => {
    localStorage.clear();
    useWorksheetStore.setState({ curriculum: null, view: 'editor', sidebarTab: 'eenvoudig', eenvoudigPanel: null, selectedGrade: 3 });
    useEenvoudigUi.setState({ grade: 3, max: null, kind: null });
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const aside = () => document.querySelector('aside.oefen-sidebar') as HTMLElement;
const tab = (name: string) => fireEvent.click(within(aside().querySelector('.panel-head') as HTMLElement).getByRole('button', { name }));
// Subdomain rows carry a count badge (three spans); type accordions have two.
const subRows = () => [...aside().querySelectorAll('button.sidebar-row')].filter(b => b.children.length === 3) as HTMLElement[];
const leafButtons = () => [...aside().querySelectorAll('button.sidebar-leaf')] as HTMLElement[];
const kioskIds = () => new Set(listOefenLeaves().filter(l => kioskSupports(l.typeId, l.constraints)).map(l => l.id));

function renderSidebar(isAdded?: (id: string) => number) {
    const onAdd = vi.fn<(...a: Add) => void>();
    render(<OefenSidebar onAdd={onAdd} isAdded={isAdded} />);
    return onAdd;
}

// Opens the subdomain that holds the leaf (its types auto-expand) and returns the leaf's button.
function leafButton(leafId: string): HTMLElement {
    for (const dom of APP_STRUCTURE) for (const sub of dom.subdomains) for (const t of sub.types) {
        const leaf = (t.children ?? [t]).find(l => l.id === leafId);
        if (!leaf) continue;
        const row = [...aside().querySelectorAll('button.sidebar-row')].find(b => b.textContent?.startsWith(sub.label)) as HTMLElement;
        fireEvent.click(row);
        const content = row.nextElementSibling as HTMLElement;
        const scope = t.children ? [...content.querySelectorAll('button.sidebar-row')].find(b => b.textContent?.startsWith(t.label))!.nextElementSibling as HTMLElement : content;
        return [...scope.querySelectorAll('button.sidebar-leaf')].find(b => b.textContent?.startsWith(leaf.label)) as HTMLElement;
    }
    throw new Error(`no leaf ${leafId}`);
}

describe('Uitgebreid', () => {
    test('shows exactly the kiosk-capable leaves, never another one', () => {
        useWorksheetStore.setState({ selectedGrade: null });
        const onAdd = renderSidebar();
        tab('Uitgebreid');
        const rows = subRows().length;
        // Opening each subdomain in turn (one open at a time) and clicking each of its leaves reaches the whole tree.
        for (let i = 0; i < rows; i++) {
            fireEvent.click(subRows()[i]);
            for (const b of leafButtons()) fireEvent.click(b);
            fireEvent.click(subRows()[i]);
        }
        const seen = new Set(onAdd.mock.calls.map(c => c[0]));
        expect(seen).toEqual(kioskIds());
        const nonKiosk = flattenLeaves().filter(l => !kioskIds().has(l.id)).map(l => l.id);
        expect(nonKiosk.length).toBeGreaterThan(0);
        for (const id of nonKiosk) expect(seen.has(id)).toBe(false);
    });

    test('a leaf adds its builder seed at the editor leerjaar with its kiosk label', () => {
        const onAdd = renderSidebar();
        tab('Uitgebreid');
        fireEvent.click(leafButton('hr-std-optellen-nat'));
        const leaf = listOefenLeaves().find(l => l.id === 'hr-std-optellen-nat')!;
        expect(onAdd).toHaveBeenCalledTimes(1);
        expect(onAdd.mock.calls[0]).toEqual(['hr-std-optellen-nat', seedRowConstraints(leaf, 3), leaf.label]);
    });

    test('the count badge shows how often a leaf is in the session', () => {
        renderSidebar(id => (id === 'hr-std-optellen-nat' ? 2 : 0));
        tab('Uitgebreid');
        const btn = leafButton('hr-std-optellen-nat');
        expect(btn.textContent).toContain('2×');
        const others = leafButtons().filter(b => b !== btn);
        expect(others.length).toBeGreaterThan(0);
        for (const b of others) expect(b.textContent).not.toContain('×');
    });
});

describe('Eenvoudig', () => {
    const navRows = () => [...aside().querySelectorAll('.ez-nav button')] as HTMLElement[];
    const openTopic = async (label: string) => {
        fireEvent.click(navRows().find(b => b.textContent?.startsWith(label))!);
        await act(async () => {});
        return document.querySelector('.ez-drawer') as HTMLElement;
    };

    test('only topics with kiosk-usable cards show; no combination builder', async () => {
        renderSidebar();
        await waitFor(() => expect(navRows().length).toBeGreaterThan(0));
        const usable = usableVariants(data, 3);
        const expected = EENVOUDIG_NAV.flatMap(s => s.topics).filter(t => usable.has(t.id)).map(t => t.label);
        expect(navRows().map(b => b.textContent?.replace(/\d+›$/, ''))).toEqual(expected);
        expect(expected).not.toContain(EENVOUDIG_NAV.flatMap(s => s.topics).find(t => t.id === COMBO_TOPIC_ID)!.label);
        expect(expected.length).toBeLessThan(EENVOUDIG_NAV.flatMap(s => s.topics).filter(t => t.hasCards).length);
    });

    test('every card and pill at leerjaar 3 adds a kiosk-capable, yielding variant; no Zelf samenstellen', async () => {
        const onAdd = renderSidebar();
        await waitFor(() => expect(navRows().length).toBeGreaterThan(0));
        const usable = usableVariants(data, 3);
        const usableIds = new Set([...usable.values()].flatMap(l => l.flatMap(c => c.vars.map(v => v.id))));
        const variantsById = new Map([...data.types.flatMap(t => t.vars)].map(v => [v.id, v]));
        let clicks = 0;
        for (const topic of EENVOUDIG_NAV.flatMap(s => s.topics).filter(t => usable.has(t.id))) {
            let drawer = await openTopic(topic.label);
            expect(drawer.querySelector('.ez-tc-own')).toBeNull();
            const n = drawer.querySelectorAll('.ez-tc, button.ez-pill').length;
            for (let i = 0; i < n; i++) {
                const el = drawer.querySelectorAll('.ez-tc, button.ez-pill')[i] as HTMLElement;
                fireEvent.click(el);
                clicks++;
                if (!document.querySelector('.ez-drawer')) drawer = await openTopic(topic.label);
            }
            if (document.querySelector('.ez-drawer')) fireEvent.click(navRows().find(b => b.textContent?.startsWith(topic.label))!);
        }
        expect(clicks).toBeGreaterThan(20);
        for (const [leafId, constraints] of onAdd.mock.calls) {
            const typeId = flattenLeaves().find(l => l.id === leafId)!.typeId;
            expect(kioskSupports(typeId, constraints)).toBe(true);
        }
        // Each payload is one usable variant's own resolved + kiosk-seeded constraints.
        const payloads = new Set(onAdd.mock.calls.map(c => JSON.stringify(c)));
        const fromUsable = new Set([...usableIds].map(id => {
            const r = resolveCard(variantsById.get(id)!);
            return JSON.stringify([r.leafId, withKioskSeed(r.typeId, r.constraints), r.label]);
        }));
        for (const p of payloads) expect(fromUsable.has(p)).toBe(true);
    });

    test('a card at leerjaar 3 adds its own preset with the kiosk start and the card label', async () => {
        const onAdd = renderSidebar();
        await waitFor(() => expect(navRows().length).toBeGreaterThan(0));
        const drawer = await openTopic('Optellen');
        const card = drawer.querySelector('.ez-tc') as HTMLElement;
        const listed = listCards(data, 'Hoofdrekenen · Optellen', { grade: 3 }).find(c => c.name === card.title)!;
        const usableIds = new Set(usableVariants(data, 3).get('Hoofdrekenen · Optellen')!.flatMap(c => c.vars.map(v => v.id)));
        const v = listed.vars.find(x => usableIds.has(x.id))!;
        fireEvent.click(card);
        const r = resolveCard(v);
        expect(onAdd.mock.calls[0]).toEqual([r.leafId, withKioskSeed(r.typeId, r.constraints), r.label]);
        expect(r.constraints).not.toEqual({});
        expect(document.querySelector('.ez-drawer')).toBeNull();
    });
});
