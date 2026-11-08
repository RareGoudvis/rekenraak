// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, screen, within, act, waitFor } from '@testing-library/react';
import Sidebar from '../components/layout/sidebar';
import EenvoudigPanelHost from '../components/eenvoudig/EenvoudigPanelHost';
import { addCardToSheet } from '../components/eenvoudig/addCard';
import { useEenvoudigUi } from '../components/eenvoudig/useEenvoudigUi';
import {
    COMBO_OPS, activeOps, comboConstraints, comboFromConstraints, newCombo, type ComboOpId, type ComboState,
} from '../components/eenvoudig/comboModel';
import { useWorksheetStore } from '../store/useWorksheetStore';
import { generateMixedOne } from '../services/math/mixedGenerator';
import { generateForBlock } from '../services/generateDispatch';
import { loadEenvoudigData, listCards, kindsOf, rangesOf, type EenvoudigData } from '../config/eenvoudig/cards';
import { EENVOUDIG_NAV, COMBO_TOPIC_ID } from '../config/eenvoudig/nav';
import { resolveCard } from '../config/eenvoudig/resolveCard';
import { LEERJAREN } from '../config/gradePresets';
import type { MathBlock } from '../services/math/types';

let data: EenvoudigData;
const reset = () => useWorksheetStore.setState({ curriculum: null, view: 'editor', sidebarTab: 'eenvoudig', eenvoudigPanel: null, blocks: [], activeBlockId: null });

beforeAll(async () => { data = await loadEenvoudigData(); });
beforeEach(() => {
    localStorage.clear();
    reset();
    vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); reset(); });

describe('topics', () => {
    test('every topic with cards lists cards for some leerjaar, range or kind', () => {
        const empty: string[] = [];
        for (const t of EENVOUDIG_NAV.flatMap(s => s.topics).filter(x => x.hasCards)) {
            const lists = [
                ...LEERJAREN.map(grade => listCards(data, t.id, { grade })),
                ...rangesOf(data, t.id).flatMap(max => LEERJAREN.map(grade => listCards(data, t.id, { grade, max }))),
                ...kindsOf(data, t.id).map(kind => listCards(data, t.id, { grade: 3, kind })),
            ];
            if (!lists.some(l => l.length > 0)) empty.push(t.id);
        }
        expect(empty).toEqual([]);
    });
});

describe('adding a card', () => {
    test('the block equals resolveCard, is selected and closes the panel', () => {
        const x = listCards(data, 'Hoofdrekenen · Optellen', { grade: 3 })[0];
        const v = x.vars[0];
        useWorksheetStore.getState().setEenvoudigPanel({ kind: 'topic', topicId: x.topic });
        addCardToSheet(v);
        const st = useWorksheetStore.getState();
        const r = resolveCard(v);
        expect(st.blocks).toHaveLength(1);
        const b = st.blocks[0];
        expect(b.typeId).toBe(r.typeId);
        expect(b.leafId).toBe(r.leafId);
        expect(b.cardId).toBe(v.id);
        expect(b.numberOfExercises).toBe(r.count);
        expect(b.instructionText).toBe(r.instruction);
        expect(b.constraints).toEqual(r.constraints);
        expect(st.activeBlockId).toBe(b.id);
        expect(st.eenvoudigPanel).toBeNull();
    });

    test('a pill adds its own variant', async () => {
        const x = listCards(data, 'Hoofdrekenen · Optellen', { grade: 3 }).find(c => c.vars.length > 1)!;
        useEenvoudigUi.setState({ grade: 3, max: null, kind: null });
        useWorksheetStore.getState().setEenvoudigPanel({ kind: 'topic', topicId: x.topic });
        render(<EenvoudigPanelHost />);
        await waitFor(() => expect(document.querySelector('button.ez-pill')).toBeTruthy());
        fireEvent.click(document.querySelector('button.ez-pill') as HTMLElement);
        const b = useWorksheetStore.getState().blocks[0];
        expect(x.vars.map(v => v.id)).toContain(b.cardId);
    });
});

describe('sidebar tabs', () => {
    const tabs = () => within(document.querySelector('.panel-head') as HTMLElement).getAllByRole('button').map(b => b.textContent);

    test('three text tabs and the default mode is remembered for Eenvoudig and Uitgebreid only', () => {
        render(<Sidebar />);
        expect(tabs()).toEqual(['Eenvoudig', 'Uitgebreid', 'Werkblad']);
        fireEvent.click(screen.getByRole('button', { name: 'Uitgebreid' }));
        expect(useWorksheetStore.getState().sidebarTab).toBe('oefeningen');
        expect(localStorage.getItem('rekenraak_default_mode_v1')).toBe('oefeningen');
        fireEvent.click(screen.getByRole('button', { name: 'Werkblad' }));
        expect(useWorksheetStore.getState().sidebarTab).toBe('overzicht');
        expect(localStorage.getItem('rekenraak_default_mode_v1')).toBe('oefeningen');
        fireEvent.click(screen.getByRole('button', { name: 'Eenvoudig' }));
        expect(localStorage.getItem('rekenraak_default_mode_v1')).toBe('eenvoudig');
    });

    test('a locked file has no Eenvoudig tab and shows the Uitgebreid pane', () => {
        useWorksheetStore.setState({ curriculum: { locked: true, allowedTypes: [] }, sidebarTab: 'eenvoudig' });
        render(<Sidebar />);
        expect(tabs()).toEqual(['Uitgebreid', 'Werkblad']);
        expect(screen.getByText('Toegestane oefeningen')).toBeTruthy();
    });

    test('a topic row opens the panel and the same row closes it', async () => {
        render(<Sidebar />);
        const row = (await screen.findAllByRole('button', { name: /^Optellen/ }))[0];
        fireEvent.click(row);
        expect(useWorksheetStore.getState().eenvoudigPanel).toEqual({ kind: 'topic', topicId: 'Hoofdrekenen · Optellen' });
        fireEvent.click(screen.getAllByRole('button', { name: /^Optellen/ })[0]);
        expect(useWorksheetStore.getState().eenvoudigPanel).toBeNull();
    });

    test('the panel never prints', async () => {
        useWorksheetStore.getState().setEenvoudigPanel({ kind: 'combo' });
        render(<EenvoudigPanelHost />);
        const drawer = document.querySelector('.ez-drawer') as HTMLElement;
        expect(drawer.classList.contains('no-print')).toBe(true);
        expect(drawer.parentElement).toBe(document.body);
    });
});

describe('combo model', () => {
    const block = (c: Record<string, unknown>): MathBlock => ({
        id: 'x', typeId: 'hr-std-gemengd', instructionText: '', instructionMode: 'geen', showInstruction: false,
        layoutPreset: 'inline-short', steppedLines: 3, numberOfExercises: 10, totalPoints: 0, verticalSpacing: 14,
        constraints: c, exercises: [],
    });
    const allOn = (s: ComboState): ComboState => { COMBO_OPS.forEach(k => { s.ops[k].on = true; }); return s; };

    test.each([1, 3, 5] as const)('every bewerking generates, natural, leerjaar %i', (grade) => {
        const s = allOn(newCombo(grade));
        const c = comboConstraints(s, grade);
        expect(c.variants).toEqual(['+', '-', 'x', ':']);
        for (const k of COMBO_OPS) expect(generateMixedOne(block(c), k), k).not.toBeNull();
    });

    test('free numbers for x and : and a required bridge generate', () => {
        const s = allOn(newCombo(4));
        s.max = 1000;
        s.ops['+'].br = ['E']; s.ops['+'].a = ['T', 'E']; s.ops['+'].b = ['E'];
        s.ops['x'].mode = 'num'; s.ops['x'].a = ['T', 'E']; s.ops['x'].b = ['E'];
        s.ops[':'].mode = 'num';
        const c = comboConstraints(s, 4);
        for (const k of COMBO_OPS) expect(generateMixedOne(block(c), k), k).not.toBeNull();
    });

    test('kommagetallen go through the decimal leaf', () => {
        const s = allOn(newCombo(4, undefined, 'komma'));
        const c = comboConstraints(s, 4);
        expect(c.numberType).toBe('decimal');
        for (const k of COMBO_OPS) expect(generateMixedOne(block(c), k), k).not.toBeNull();
    });

    test('the flyout reads its own constraints back', () => {
        const s = newCombo(3, '+');
        s.ops['+'].a = ['T', 'E']; s.ops['+'].br = ['E'];
        const back = comboFromConstraints(comboConstraints(s, 3), 3)!;
        expect(activeOps(back)).toEqual(['+']);
        expect(back.ops['+'].a.sort()).toEqual(['E', 'T']);
        expect(back.ops['+'].br).toEqual(['E']);
        expect(back.max).toBe(s.max);
    });

    test.each([['Combinatie', undefined, 'combo'], ['Zelf samenstellen', '-' as ComboOpId, 'combo:-']])('%s adds a hr-std-gemengd block with cardId %s', (_n, only, cardId) => {
        useEenvoudigUi.setState({ grade: 3 });
        useWorksheetStore.getState().setEenvoudigPanel({ kind: 'combo', only });
        render(<EenvoudigPanelHost />);
        fireEvent.click(screen.getByRole('button', { name: 'Zet op het blad' }));
        const st = useWorksheetStore.getState();
        expect(st.blocks).toHaveLength(1);
        expect(st.blocks[0].typeId).toBe('hr-std-gemengd');
        expect(st.blocks[0].cardId).toBe(cardId);
        expect(st.blocks[0].exercises.length).toBeGreaterThan(0);
        expect(st.eenvoudigPanel).toBeNull();
        expect(st.activeBlockId).toBe(st.blocks[0].id);
    });

    test('editBlockId edits that block in place', () => {
        useEenvoudigUi.setState({ grade: 3 });
        act(() => { useWorksheetStore.getState().setEenvoudigPanel({ kind: 'combo' }); });
        render(<EenvoudigPanelHost />);
        fireEvent.click(screen.getByRole('button', { name: 'Zet op het blad' }));
        const id = useWorksheetStore.getState().blocks[0].id;
        act(() => { useWorksheetStore.getState().setEenvoudigPanel({ kind: 'combo', editBlockId: id }); });
        // Switch Vermenigvuldigen on in the reopened flyout, then update.
        fireEvent.click(screen.getByRole('button', { name: /Vermenigvuldigen/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Bijwerken' }));
        const after = useWorksheetStore.getState();
        expect(after.blocks).toHaveLength(1);
        expect(after.blocks[0].id).toBe(id);
        expect((after.blocks[0].constraints as { variants: string[] }).variants).toContain('x');
        expect(after.eenvoudigPanel).toBeNull();
        const regenerated = generateForBlock(after.blocks[0], true);
        expect(regenerated.items.length).toBeGreaterThan(0);
    });

    test('the combination topic row exists', () => {
        expect(EENVOUDIG_NAV.some(s => s.topics.some(t => t.id === COMBO_TOPIC_ID))).toBe(true);
    });
});
