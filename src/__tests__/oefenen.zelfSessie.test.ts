import { describe, test, expect } from 'vitest';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { LEERJAREN } from '../config/gradePresets';
import { MAX_TYPES, parseSessie } from '../services/oefenen/session';
import { kioskSupports } from '../services/oefenen/kiosk';
import { ZELF_COUNTS, ZELF_MINUTES, buildZelfSessie, choicesFor, isZelfSessie, usableVariants, type ZelfMode } from '../oefenen/zelf/zelfSessie';

const MODES: ZelfMode[] = [
    ...ZELF_COUNTS.map(n => ({ kind: 'count', n }) as ZelfMode),
    ...ZELF_MINUTES.map(min => ({ kind: 'timer', min }) as ZelfMode),
];

let data: EenvoudigData;
const topicIds = (g: (typeof LEERJAREN)[number]) => [...usableVariants(data, g).keys()];
const allChoices = () => LEERJAREN.flatMap(g => topicIds(g).flatMap(t => choicesFor(data, g, t).map(c => ({ g, t, c }))));

describe('Zelf oefenen sessie', () => {
    test('every leerjaar x topic has 1 to 6 distinct, short choices', async () => {
        data = await loadEenvoudigData();
        for (const g of LEERJAREN) {
            for (const t of topicIds(g)) {
                const cs = choicesFor(data, g, t);
                expect(cs.length, `${g} ${t}`).toBeGreaterThanOrEqual(1);
                expect(cs.length, `${g} ${t}: ${cs.map(c => c.label).join(' | ')}`).toBeLessThanOrEqual(6);
                expect(new Set(cs.map(c => c.key)).size).toBe(cs.length);
                expect(new Set(cs.map(c => c.label)).size).toBe(cs.length);
                for (const c of cs) { expect(c.label.length).toBeLessThanOrEqual(80); expect(c.vars.length).toBeGreaterThan(0); }
            }
        }
    });

    test('every choice x mode builds a session the kiosk parses', async () => {
        data = await loadEenvoudigData();
        const all = allChoices();
        expect(all.length).toBeGreaterThan(100);
        for (const { c } of all) {
            for (const mode of MODES) {
                const s = buildZelfSessie(c, mode, 0);
                expect(s.id).toMatch(/^zelf-[0-9a-f]{8}$/);
                expect(s.types.length).toBeGreaterThanOrEqual(1);
                expect(s.types.length).toBeLessThanOrEqual(MAX_TYPES);
                for (const ty of s.types) {
                    expect(ty.label.length).toBeLessThanOrEqual(80);
                    expect(kioskSupports(ty.typeId, ty.constraints)).toBe(true);
                }
                expect(s.total).toBe(mode.kind === 'count' ? mode.n : undefined);
                expect(s.timerMin).toBe(mode.kind === 'timer' ? mode.min : undefined);
                // Through JSON like a stored session: the parse is the link's own validation.
                expect(() => parseSessie(JSON.parse(JSON.stringify(s)))).not.toThrow();
                expect(isZelfSessie(s)).toBe(true);
            }
        }
    }, 120_000);

    test('the + and - split puts every variant in the right bucket', async () => {
        data = await loadEenvoudigData();
        let seen = 0;
        for (const g of LEERJAREN) {
            for (const t of topicIds(g).filter(id => /(Optellen|Aftrekken)$/.test(id))) {
                const cs = choicesFor(data, g, t);
                const by = (label: string) => cs.find(c => c.label === label);
                for (const v of by('Zonder brug')?.vars ?? []) { expect(v.l).toMatch(/^(Zonder brug|Geen brug nodig)/); seen++; }
                for (const v of by('Met brug')?.vars ?? []) { expect(v.l).toMatch(/^Brug bij /); seen++; }
                // Both sides or neither: never a lone "Zonder brug".
                expect(!!by('Zonder brug')).toBe(!!by('Met brug'));
                const alles = by('Alles door elkaar');
                if (alles) for (const v of [...(by('Zonder brug')?.vars ?? []), ...(by('Met brug')?.vars ?? [])]) expect(alles.vars).toContain(v);
                // Breuk cards sit in their own choice, never in the brug buckets.
                for (const v of by('Breuken')?.vars ?? []) expect(alles?.vars ?? []).not.toContain(v);
            }
        }
        expect(seen).toBeGreaterThan(20);
        // Leerjaar 3 hoofdrekenen +: "Maakt niet uit" only in Alles; a Brug bij E en T variant is "met".
        const cs = choicesFor(data, 3, 'Hoofdrekenen · Optellen');
        expect(cs.map(c => c.label)).toEqual(['Zonder brug', 'Met brug', 'Alles door elkaar']);
        expect(cs[2].vars.some(v => v.l === 'Maakt niet uit')).toBe(false); // lj 4 variant, not offered in 3
        expect(cs[1].vars.some(v => v.l === 'Brug bij E en T')).toBe(true);
    });

    test('tafels come in bands and a leerjaar sees only what its Op.stap range reaches', async () => {
        data = await loadEenvoudigData();
        expect(choicesFor(data, 4, 'Hoofdrekenen · Maaltafels').map(c => c.label)).toEqual(
            ['Tafel van 1 tot 5', 'Tafel van 6 tot 10', 'Tafel van 11, 12 en 15', 'Alles door elkaar']);
        expect(usableVariants(data, 1).has('Hoofdrekenen · Maaltafels')).toBe(false);
        for (const g of LEERJAREN) for (const cards of usableVariants(data, g).values()) for (const { card, vars } of cards) {
            if (card.grades.length) expect(Math.min(...card.grades)).toBeLessThanOrEqual(g);
            for (const v of vars) expect(v.lj).toBeLessThanOrEqual(g);
        }
    });

    test('a long choice is capped at the session maximum', async () => {
        data = await loadEenvoudigData();
        const big = allChoices().find(x => x.c.vars.length > MAX_TYPES);
        expect(big).toBeTruthy();
        expect(buildZelfSessie(big!.c, MODES[0], 0).types).toHaveLength(MAX_TYPES);
    });

    test('the picked leerjaar rides along for handig rekenen, without changing the id', async () => {
        data = await loadEenvoudigData();
        const c = allChoices()[0].c;
        const six = buildZelfSessie(c, MODES[0], 0, 6);
        expect(six.grade).toBe(6);
        expect(six.id).toBe(buildZelfSessie(c, MODES[0], 0).id);
        expect(buildZelfSessie(c, MODES[0], 0).grade).toBeUndefined();
    });

    test('the id is stable per choice and differs between choices', async () => {
        data = await loadEenvoudigData();
        const [a, b] = allChoices().map(x => x.c);
        const id = (c: typeof a, m: ZelfMode) => buildZelfSessie(c, m, 1).id;
        expect(id(a, MODES[0])).toBe(buildZelfSessie(a, MODES[0], 999).id);
        expect(id(a, MODES[0])).not.toBe(id(a, MODES[1]));
        expect(id(a, MODES[0])).not.toBe(id(b, MODES[0]));
        expect(isZelfSessie({ id: 'abcd1234' })).toBe(false);
    });

    test('topics with nothing usable are left out and every leerjaar offers something', async () => {
        data = await loadEenvoudigData();
        for (const g of LEERJAREN) {
            const topics = usableVariants(data, g);
            expect(topics.size).toBeGreaterThan(3);
            for (const cards of topics.values()) expect(cards.every(c => c.vars.length > 0)).toBe(true);
        }
    });

    test('audit 2026-11-13: Zonder brug only holds variants that promise no brug; procent is decided per variant', async () => {
        data = await loadEenvoudigData();
        for (const { c } of allChoices()) {
            if (c.key === 'zonder') for (const v of c.vars) expect(v.l, v.id).toMatch(/^zonder brug/i);
            if (c.key === 'procent') for (const v of c.vars) expect(`${v.l} ${v.label}`, v.id).not.toMatch(/kommagetal\)?$|naar kommagetal|= \(?kommagetal/i);
        }
    });
});
