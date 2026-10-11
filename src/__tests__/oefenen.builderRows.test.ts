import { describe, test, expect } from 'vitest';
import { buildSessie, listOefenLeaves, rowLabelOf, rowYields, seedRowConstraints, type BuilderSettings } from '../components/oefenen/oefenBuild';
import { decodeSessie, encodeSessie } from '../services/oefenen/session';
import { kioskSupports } from '../services/oefenen/kiosk';
import { seedLeafConstraints } from '../config/baseSettings';
import { LEERJAREN, type Leerjaar } from '../config/gradePresets';

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

describe('item 4: a new row seeds from the sidebar leerjaar (the sheet seed path)', () => {
    test.each<[Leerjaar, number]>([[1, 20], [2, 100], [3, 1000]])('Optellen · natuurlijk at L%i starts tot %i', (grade, max) => {
        expect(seedRowConstraints(leaf('hr-std-optellen-nat'), grade).maxGetal).toBe(max);
    });
    test('the seed is a sidebar click at that leerjaar plus the kiosk start (kioskSeed)', () => {
        for (const g of [null, ...LEERJAREN]) {
            expect(seedRowConstraints(leaf('hr-std-aftrekken-nat'), g)).toEqual(seedLeafConstraints('hr-std-aftrekken-nat', g)!.constraints);
            const pw = seedRowConstraints(leaf('plaatswaarde-plaats'), g);
            expect(pw.plaatsAnswer, `L${g}`).toBe('waarde');
            expect(pw).toEqual(seedLeafConstraints('plaatswaarde-plaats', g, { plaatsAnswer: 'waarde' })!.constraints);
        }
    });
    test('every leaf the leerjaar shows seeds a row the kiosk can play', () => {
        for (const g of LEERJAREN) {
            for (const l of listOefenLeaves().filter(x => x.minGrade <= g)) {
                const constraints = seedRowConstraints(l, g);
                expect(kioskSupports(l.typeId, constraints), `${l.id} L${g}`).toBe(true);
                expect(rowYields({ leaf: l, constraints }), `${l.id} L${g}`).toBe(true);
            }
        }
    });
});
