// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within, act } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { resolveCard } from '../config/eenvoudig/resolveCard';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { RANGE_KEY, TAFELS_KEY, readRange, readTafels } from '../oefenen/zelf/zelfPicks';
import { TAFELS_DEFAULT, ZELF_RANGES, buildZelfSessie, choicesFor, tafelChoice, tafelList, tafelPickOf, tafelsOffer, zelfMaxOf } from '../oefenen/zelf/zelfSessie';
import { nextExercise } from '../services/oefenen/scheduler';
import { skinsFor } from '../oefenen/spelen/accepts';
import { SKINS } from '../oefenen/spelen/skins/registry';
import { spelContentOf } from '../oefenen/spelen/spelQuestion';
import { resetKiosk } from './helpers/oefenKiosk';

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const ids = (cs: { vars: { id: string }[] }[]) => new Set(cs.flatMap(c => c.vars.map(v => v.id)));
const maxOf = (v: { id: string }, data: EenvoudigData) => data.types.find(t => t.vars.some(x => x.id === v.id))?.max;

let data: EenvoudigData;
beforeAll(async () => { data = await loadEenvoudigData(); });
beforeEach(() => {
    resetKiosk();
    useOefenStore.setState({ fixed: null });
    useSpelStore.getState().otherGame();
    useSpelStore.getState().takePickerAt();
    vi.spyOn(console, 'error').mockImplementation(() => { });
    window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener: () => { }, removeEventListener: () => { } })) as unknown as typeof window.matchMedia;
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function openTopic(grade: number, section: string, name: string) {
    localStorage.setItem(GRADE_KEY, String(grade));
    render(<OefenApp />);
    await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
    fireEvent.click(within(screen.getByRole('region', { name: section })).getByRole('button', { name }));
}

describe('Tot hoeveel?', () => {
    test('the ranges per leerjaar', () => {
        expect(ZELF_RANGES).toEqual({ 1: [10, 20], 2: [100], 3: [1000], 4: [10000, 100000], 5: [1000000], 6: [1000000000] });
    });

    test('leerjaar 1: tot 10 and tot 20 give different Optellen cards, each of that range', () => {
        const t10 = choicesFor(data, 1, 'Hoofdrekenen · Optellen', 10);
        const t20 = choicesFor(data, 1, 'Hoofdrekenen · Optellen', 20);
        expect(t10.length).toBeGreaterThan(0);
        for (const v of t10.flatMap(c => c.vars)) expect(maxOf(v, data)).toBe(10);
        for (const v of t20.flatMap(c => c.vars)) expect(maxOf(v, data)).toBe(20);
        expect([...ids(t10)].some(id => ids(t20).has(id))).toBe(false);
        // Brug only exists tot 20; tot 10 keeps its own key, tot 20 the one Eenvoudig always had.
        expect(t20.map(c => c.label)).toEqual(['Zonder brug', 'Met brug', 'Alles door elkaar']);
        expect(t10.every(c => c.key.endsWith('|tot10'))).toBe(true);
        expect(t20.map(c => c.key)).toEqual(choicesFor(data, 1, 'Hoofdrekenen · Optellen').map(c => c.key));
    });

    test('leerjaar 4: tot 100 000 picks the 100 000 cards where a topic has them, else the closest below', () => {
        expect(zelfMaxOf(data, 'Hoofdrekenen · Vermenigvuldigen', 4, 100000)).toBe(100000);
        expect(zelfMaxOf(data, 'Hoofdrekenen · Vermenigvuldigen', 4, 10000)).toBe(10000);
        const big = choicesFor(data, 4, 'Hoofdrekenen · Vermenigvuldigen', 100000);
        expect(big.flatMap(c => c.vars).some(v => maxOf(v, data) === 100000)).toBe(true);
        expect(big.flatMap(c => c.vars).some(v => maxOf(v, data) === 10000)).toBe(false);
        // Optellen has no 100 000 card at leerjaar 4: the 10 000 cards.
        expect(zelfMaxOf(data, 'Hoofdrekenen · Optellen', 4, 100000)).toBe(10000);
        // A range below the leerjaar's own never borrows cards of a later leerjaar (no × 10 at tot 10).
        expect(zelfMaxOf(data, 'Handig rekenen', 1, 10)).toBe(20);
    });

    test('topics without ranges are unchanged', () => {
        for (const [g, topic] of [[2, 'Klok en kalender'], [3, 'Breuken'], [2, 'Geld'], [3, 'Hoofdrekenen · Maaltafels']] as const) {
            expect(zelfMaxOf(data, topic, g, ZELF_RANGES[g][0])).toBeNull();
            expect(choicesFor(data, g, topic, ZELF_RANGES[g][0])).toEqual(choicesFor(data, g, topic));
        }
    });

    test('the screen: leerjaar 1 asks tot 10 or tot 20 (tot 10 first), remembered; leerjaar 2 shows its range; klok nothing', async () => {
        await openTopic(1, 'Hoofdrekenen', 'Optellen');
        const group = screen.getByRole('group', { name: 'Tot hoeveel?' });
        expect(within(group).getByRole('button', { name: 'tot 10' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.queryByRole('button', { name: 'Met brug' })).toBeNull();
        click('tot 20');
        expect(screen.getByRole('button', { name: 'Met brug' })).toBeTruthy();
        expect(readRange(1, [10, 20])).toBe(20);
        expect(JSON.parse(localStorage.getItem(RANGE_KEY)!)).toEqual({ 1: 20 });
        click('Met brug');
        click('Begin met oefenen');
        const types = useOefenStore.getState().sessie!.types;
        expect(types.every(t => (t.constraints as { maxGetal?: number }).maxGetal === 20)).toBe(true);
        // A fresh page on the same device: the kiosk reset clears storage, the remembered range comes back.
        cleanup();
        const kept = localStorage.getItem(RANGE_KEY)!;
        resetKiosk();
        localStorage.setItem(RANGE_KEY, kept);
        await openTopic(1, 'Hoofdrekenen', 'Optellen');
        expect(screen.getByRole('button', { name: 'tot 20' }).getAttribute('aria-pressed')).toBe('true');
        cleanup();
        await openTopic(2, 'Hoofdrekenen', 'Optellen');
        expect(screen.queryByRole('group', { name: 'Tot hoeveel?' })).toBeNull();
        expect(screen.getByText('tot 100')).toBeTruthy();
        cleanup();
        await openTopic(4, 'Hoofdrekenen', 'Vermenigvuldigen');
        expect(screen.getByRole('button', { name: /^tot 10\s000$/ }).getAttribute('aria-pressed')).toBe('true');
        click(/^tot 100\s000$/);
        expect(screen.getByRole('button', { name: /^tot 100\s000$/ }).getAttribute('aria-pressed')).toBe('true');
        cleanup();
        // Optellen at leerjaar 4 has no 100 000 cards: no choice that changes nothing, its range as a label.
        await openTopic(4, 'Hoofdrekenen', 'Optellen');
        expect(screen.queryByRole('group', { name: 'Tot hoeveel?' })).toBeNull();
        expect(screen.getByText(/^tot 10\s000$/)).toBeTruthy();
        cleanup();
        await openTopic(2, 'Meten', 'Klok en kalender');
        expect(screen.queryByText(/^tot /)).toBeNull();
    });

    test('a broken remembered range falls back to the smaller one', () => {
        localStorage.setItem(RANGE_KEY, JSON.stringify({ 1: 15, 4: 'x' }));
        expect(readRange(1, [10, 20])).toBe(10);
        expect(readRange(4, [10000, 100000])).toBe(10000);
        localStorage.setItem(RANGE_KEY, '{kapot');
        expect(readRange(1, [10, 20])).toBe(10);
    });
});

describe('Welke tafels?', () => {
    test('the offer and labels', () => {
        expect(tafelsOffer(2)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(tafelsOffer(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 25, 50, 100]);
        expect(tafelList([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe('1 tot 10');
        expect(tafelList([2, 3, 5])).toBe('2, 3 en 5');
        expect(tafelList([7])).toBe('7');
        expect(tafelChoice(2, 'Hoofdrekenen · Maaltafels', [], 'x')).toBeNull();
    });

    test('the toggles shape selectedTables; Allebei gives × and :; the key brings the pick back', () => {
        const x = tafelChoice(3, 'Hoofdrekenen · Maaltafels', [7, 2, 25], 'x')!;
        expect(x.label).toBe('Tafels van 2, 7 en 25');
        const s = buildZelfSessie(x, { kind: 'count', n: 5 }, 0, 3);
        expect(s.types).toHaveLength(1);
        expect(s.types[0]).toMatchObject({ leafId: 'hr-std-vermenigvuldigen-nat', constraints: { multiplicationMode: 'tafels', selectedTables: [2, 7, 25], tableLimit: 10 } });
        const both = tafelChoice(3, 'Hoofdrekenen · Deeltafels', [4], 'beide')!;
        expect(both.label).toBe('Maal- en deeltafel van 4');
        expect(buildZelfSessie(both, { kind: 'count', n: 5 }, 0, 3).types.map(t => t.leafId)).toEqual(['hr-std-vermenigvuldigen-nat', 'hr-std-delen-nat']);
        expect(tafelPickOf(both)).toEqual({ op: 'beide', tables: [4] });
        expect(tafelPickOf(choicesFor(data, 2, 'Hoofdrekenen · Optellen')[0])).toBeNull();
        // Games still filter on the content: no Honingraat for tafels.
        expect(skinsFor(SKINS, spelContentOf(x, 3)!).map(k => k.meta.id)).not.toContain('honingraat');
    });

    test('the generator makes tafel 25, 50 and 100 sums (25 × 7, 350 : 50)', () => {
        for (const t of [25, 50, 100]) {
            for (const op of ['x', ':'] as const) {
                const c = tafelChoice(3, 'Hoofdrekenen · Maaltafels', [t], op)!;
                const s = buildZelfSessie(c, { kind: 'count', n: 5 }, 0, 3);
                expect(resolveCard(c.vars[0]).constraints).toMatchObject({ selectedTables: [t] });
                const seen = new Set<string>();
                for (let i = 0; i < 6; i++) {
                    const made = nextExercise(s, s.types[0], seen);
                    expect({ t, op, made: !!made }).toEqual({ t, op, made: true });
                    seen.add(made!.key);
                    const ex = made!.exercise as { operands: number[]; answer: number };
                    if (op === 'x') expect(ex.operands).toContain(t);
                    else { expect(ex.operands[1]).toBe(t); expect(ex.operands[0]).toBe(t * ex.answer); }
                }
            }
        }
    });

    test('the screen: 1 to 10 on by default, Alle / Geen, at least one tafel, × / : / both; a game plays the pick', async () => {
        await openTopic(3, 'Hoofdrekenen', 'Maaltafels');
        const chips = within(screen.getByRole('group', { name: 'Welke tafels?' })).getAllByRole('button');
        expect(chips).toHaveLength(18);
        expect(chips.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent)).toEqual(TAFELS_DEFAULT.map(String));
        expect(screen.getByRole('button', { name: 'Maal ×' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.queryByRole('button', { name: 'Tafel van 1 tot 5' })).toBeNull();
        click('Geen');
        expect((screen.getByRole('button', { name: /Begin met oefenen/ }) as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByText('Kies minstens één tafel.')).toBeTruthy();
        expect(screen.queryByRole('region', { name: 'Of speel een spel' })).toBeNull();
        click('Tafel van 25');
        click('Tafel van 7');
        expect(readTafels(3, tafelsOffer(3), TAFELS_DEFAULT)).toEqual([7, 25]);
        expect(JSON.parse(localStorage.getItem(TAFELS_KEY)!)).toEqual({ 3: [7, 25] });
        click('Allebei × en :');
        fireEvent.click(within(screen.getByRole('group', { name: 'Kies een spel' })).getByRole('button', { name: 'Ballonnen' }));
        const st = useSpelStore.getState();
        expect(st.meta!.id).toBe('ballonnen');
        expect(st.from!.choice.key).toBe('3|Hoofdrekenen · Maaltafels|tafels:beide:7,25');
        expect(st.question!.text).toMatch(/[×:]/);
        // Ander spel: back with the same tafels and × en :.
        act(() => useSpelStore.getState().otherGame());
        await screen.findByRole('region', { name: 'Of speel een spel' });
        expect(screen.getByRole('button', { name: 'Allebei × en :' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'Tafel van 25' }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: 'Tafel van 1' }).getAttribute('aria-pressed')).toBe('false');
        click(/Terug/);
        cleanup();
        // Deeltafels start on Deel; Alle switches every tafel on; the session gets them.
        await openTopic(2, 'Hoofdrekenen', 'Deeltafels');
        expect(screen.getByRole('button', { name: 'Deel :' }).getAttribute('aria-pressed')).toBe('true');
        click('Alle');
        click('Begin met oefenen');
        const t = useOefenStore.getState().sessie!.types;
        expect(t).toHaveLength(1);
        expect(t[0]).toMatchObject({ leafId: 'hr-std-delen-nat', constraints: { selectedTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } });
    });
});
