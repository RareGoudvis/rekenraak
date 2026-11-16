// @vitest-environment jsdom
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, screen, fireEvent, within } from '@testing-library/react';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { useSpelStore } from '../oefenen/spelen/useSpelStore';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { COMBO_TOPIC_ID } from '../config/eenvoudig/nav';
import { LEERJAREN } from '../config/gradePresets';
import { GRADE_KEY } from '../oefenen/zelf/zelfGrade';
import { zelfTopicLabel } from '../oefenen/zelf/zelfLabels';
import { buildZelfSessie, choicesFor, numberKindOf, usableVariants, zelfMaxOf, zelfRangeButtons, zelfUsable } from '../oefenen/zelf/zelfSessie';
import { choiceCanPlay, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { skinsFor } from '../oefenen/spelen/accepts';
import { SKINS } from '../oefenen/spelen/skins/registry';
import { topicGameOf } from '../oefenen/zelf/topicGames';
import { resetKiosk } from './helpers/oefenKiosk';

const MIX = COMBO_TOPIC_ID;
const labels = (g: (typeof LEERJAREN)[number], range?: number) => choicesFor(data, g, MIX, range).map(c => c.label);
const topicOf = (id: string) => data.types.find(t => t.vars.some(v => v.id === id))!;

let data: EenvoudigData;
beforeAll(async () => { data = await loadEenvoudigData(); });

describe('Door elkaar (the Combinatie topic in Zelf oefenen)', () => {
    test('leerjaar 1 has none; 2 has + en −; 3 adds × en :; 4 to 6 add the kommagetal mixes their cards have', () => {
        expect(zelfUsable(data, 1).has(MIX)).toBe(false);
        // The teacher's Oefenmodus sidebar lists card topics only: never the mix.
        for (const g of LEERJAREN) expect(usableVariants(data, g).has(MIX)).toBe(false);
        expect(zelfUsable(data, 2).has(MIX)).toBe(true);
        expect(labels(2)).toEqual(['+ en −']);
        expect(labels(3)).toEqual(['+ en −', '× en :', 'Alles door elkaar']);
        // Leerjaar 4 divides no kommagetallen yet (only × has them): no × en : met kommagetallen there.
        expect(labels(4)).toEqual(['+ en −', '× en :', '+ en − met kommagetallen', 'Alles door elkaar']);
        for (const g of [5, 6] as const) {
            expect(labels(g), `L${g}`).toEqual(['+ en −', '× en :', '+ en − met kommagetallen', '× en : met kommagetallen', 'Alles door elkaar']);
        }
        expect(zelfTopicLabel({ id: MIX, label: 'Combinatie' })).toBe('Door elkaar');
    });

    test('every mix holds both of its operations, one number kind, no breuken, procent or met rest', () => {
        for (const g of LEERJAREN) for (const c of choicesFor(data, g, MIX)) {
            const topics = new Set(c.vars.map(v => topicOf(v.id).topic));
            if (c.label.startsWith('+')) expect([...topics].sort()).toEqual(['Hoofdrekenen · Aftrekken', 'Hoofdrekenen · Optellen']);
            if (c.label.startsWith('×')) expect([...topics].sort()).toEqual(['Hoofdrekenen · Delen', 'Hoofdrekenen · Vermenigvuldigen']);
            const kinds = new Set(c.vars.map(v => numberKindOf(topicOf(v.id), v)));
            if (c.label !== 'Alles door elkaar') expect([...kinds], `L${g} ${c.label}`).toEqual([c.label.includes('komma') ? 'komma' : 'other']);
            for (const v of c.vars) {
                expect(v.leafId, v.id).not.toMatch(/-rat$/);
                expect(v.ov?.multiplicationMode, v.id).not.toBe('met_rest');
                expect(v.lj, v.id).toBeLessThanOrEqual(g);
            }
        }
    });

    test('a mix is the cards of its topics in the same range; the range picker follows the topics', () => {
        const plus = choicesFor(data, 2, MIX)[0];
        const own = (t: string) => choicesFor(data, 2, t).find(c => c.label === 'Alles door elkaar')!.vars;
        expect(new Set(plus.vars)).toEqual(new Set([...own('Hoofdrekenen · Optellen'), ...own('Hoofdrekenen · Aftrekken')]));
        expect(zelfMaxOf(data, MIX, 2, 100)).toBe(100);
        // Leerjaar 4: × has 100 000 cards, so the mix asks Tot hoeveel?
        expect(zelfRangeButtons(data, MIX, 4)).toEqual([10000, 100000]);
        expect(choicesFor(data, 4, MIX, 100000).find(c => c.label === '× en :')!.vars.some(v => topicOf(v.id).max === 100000)).toBe(true);
    });

    test('the session mixes the operations; the games take + en − and × en :', () => {
        const plus = choicesFor(data, 2, MIX)[0];
        const s = buildZelfSessie(plus, { kind: 'count', n: 10 }, 0, 2);
        expect(new Set(s.types.map(t => t.leafId))).toEqual(new Set(['hr-std-optellen-nat', 'hr-std-aftrekken-nat']));
        expect(s.mode).toBe('willekeurig');
        expect(choiceCanPlay(plus, 2)).toBe(true);
        const keypad = skinsFor(SKINS, spelContentOf(plus, 2)!).filter(k => k.meta.input === 'keypad');
        expect(keypad.length).toBeGreaterThan(0);
        for (const g of [3, 5] as const) {
            const times = choicesFor(data, g, MIX).find(c => c.label === '× en :')!;
            expect(choiceCanPlay(times, g), `L${g}`).toBe(true);
            expect(spelContentOf(times, g)!.ops).toEqual(expect.arrayContaining(['x', ':']));
        }
        expect(topicGameOf(data, 2, MIX)).not.toBeNull();
    });
});

describe('Door elkaar on the screen', () => {
    beforeEach(() => {
        resetKiosk();
        useOefenStore.setState({ fixed: null });
        useSpelStore.getState().otherGame();
        useSpelStore.getState().takePickerAt();
        vi.spyOn(console, 'error').mockImplementation(() => { });
        window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener: () => { }, removeEventListener: () => { } })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => { cleanup(); vi.restoreAllMocks(); });

    test('a Door elkaar card under Hoofdrekenen; leerjaar 5 offers × en : and starts a mixed run', async () => {
        localStorage.setItem(GRADE_KEY, '5');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        fireEvent.click(within(screen.getByRole('region', { name: 'Hoofdrekenen' })).getByRole('button', { name: 'Door elkaar' }));
        expect(screen.getByRole('heading', { name: 'Door elkaar' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: '× en :' }));
        fireEvent.click(screen.getByRole('button', { name: /Begin met oefenen/ }));
        const leaves = new Set(useOefenStore.getState().sessie!.types.map(t => t.leafId));
        expect(leaves).toEqual(new Set(['hr-std-vermenigvuldigen-nat', 'hr-std-delen-nat']));
    });

    test('leerjaar 1 has no Door elkaar card', async () => {
        localStorage.setItem(GRADE_KEY, '1');
        render(<OefenApp />);
        await screen.findByRole('heading', { name: 'Wat wil je oefenen?' });
        expect(within(screen.getByRole('region', { name: 'Hoofdrekenen' })).queryByRole('button', { name: 'Door elkaar' })).toBeNull();
    });
});
