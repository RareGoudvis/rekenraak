import { describe, test, expect } from 'vitest';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { LEERJAREN } from '../config/gradePresets';
import { parseSessie } from '../services/oefenen/session';
import { kioskSupports } from '../services/oefenen/kiosk';
import { ZELF_COUNTS, ZELF_MINUTES, buildZelfSessie, isZelfSessie, usableVariants, type ZelfMode } from '../oefenen/zelf/zelfSessie';

const MODES: ZelfMode[] = [
    ...ZELF_COUNTS.map(n => ({ kind: 'count', n }) as ZelfMode),
    ...ZELF_MINUTES.map(min => ({ kind: 'timer', min }) as ZelfMode),
];

let data: EenvoudigData;
const allUsable = () => LEERJAREN.flatMap(g => [...usableVariants(data, g).values()].flatMap(cards => cards.flatMap(c => c.vars)));

describe('Zelf oefenen sessie', () => {
    test('every usable variant x mode builds a session the kiosk parses', async () => {
        data = await loadEenvoudigData();
        const vars = [...new Map(allUsable().map(v => [v.id, v])).values()];
        expect(vars.length).toBeGreaterThan(100);
        for (const v of vars) {
            for (const mode of MODES) {
                const s = buildZelfSessie(v, mode, 0);
                expect(s.id).toMatch(/^zelf-[0-9a-f]{8}$/);
                expect(s.types).toHaveLength(1);
                expect(s.types[0].label.length).toBeLessThanOrEqual(80);
                expect(kioskSupports(s.types[0].typeId, s.types[0].constraints)).toBe(true);
                expect(s.total).toBe(mode.kind === 'count' ? mode.n : undefined);
                expect(s.timerMin).toBe(mode.kind === 'timer' ? mode.min : undefined);
                // Through JSON like a stored session: the parse is the link's own validation.
                expect(() => parseSessie(JSON.parse(JSON.stringify(s)))).not.toThrow();
                expect(isZelfSessie(s)).toBe(true);
            }
        }
    }, 120_000);

    test('the id is stable per choice and differs between choices', async () => {
        data = await loadEenvoudigData();
        const [a, b] = allUsable();
        const id = (v: typeof a, m: ZelfMode) => buildZelfSessie(v, m, 1).id;
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
});
