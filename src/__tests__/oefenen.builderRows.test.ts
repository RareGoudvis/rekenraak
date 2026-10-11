import { describe, test, expect } from 'vitest';
import { buildSessie, listOefenLeaves, rowLabelOf, type BuilderSettings } from '../components/oefenen/oefenBuild';
import { decodeSessie, encodeSessie } from '../services/oefenen/session';

// Triage calls 2026-10-11 (M1): what a builder row is called.

const SETTINGS: BuilderSettings = { id: 'rows', createdAt: 0, title: '', mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false };
const leaf = (id: string) => listOefenLeaves().find(l => l.id === id)!;

describe('item 3: the row label follows plaatsAnswer', () => {
    const WAARDE = 'Plaatswaarde benoemen · waarde van cijfer';
    test.each<[string, string, string]>([
        ['plaatswaarde-plaats', 'waarde', WAARDE],
        ['plaatswaarde-plaats', 'plaats-shuffle', 'Plaatswaarde benoemen · plaats benoemen (door elkaar)'],
        ['plaatswaarde-plaats', 'plaats', 'Plaatswaarde benoemen · plaats benoemen'],
        ['plaatswaarde-omcirkelen', 'waarde', WAARDE],
        ['plaatswaarde-omcirkelen', 'plaats-shuffle', 'Plaatswaarde benoemen · plaats omcirkelen (door elkaar)'],
        ['plaatswaarde-omcirkelen', 'plaats', 'Plaatswaarde benoemen · plaats omcirkelen'],
    ])('%s + %s → %s, in the builder, the link and the pupil\'s stats', (id, plaatsAnswer, want) => {
        const l = leaf(id);
        const row = { key: 'r0', leaf: l, constraints: { ...l.constraints, plaatsAnswer }, weight: 50 };
        expect(rowLabelOf(row)).toBe(want);
        const { sessie } = buildSessie([row], SETTINGS);
        expect(sessie.types[0].label).toBe(want);
        expect(decodeSessie(encodeSessie(sessie)!).types[0].label).toBe(want);
    });

    test('a new plaats row starts on waarde (kioskSeed) and is named so', () => {
        const l = leaf('plaatswaarde-plaats');
        expect(rowLabelOf({ leaf: l, constraints: l.constraints })).toBe(WAARDE);
    });

    test('the waarde leaf, the tabel and every other leaf keep their own label', () => {
        for (const l of listOefenLeaves().filter(x => x.id !== 'plaatswaarde-plaats' && x.id !== 'plaatswaarde-omcirkelen')) {
            expect(rowLabelOf({ leaf: l, constraints: l.constraints }), l.id).toBe(l.label);
        }
    });
});
