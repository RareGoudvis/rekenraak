import { describe, test, expect } from 'vitest';
import { buildSessie, filterOefenLeaves, listOefenLeaves, rowLabelOf, rowYields, seedRowConstraints, type BuilderSettings } from '../components/oefenen/oefenBuild';
import { decodeSessie, encodeSessie } from '../services/oefenen/session';
import { kioskSupports } from '../services/oefenen/kiosk';
import { seedLeafConstraints } from '../config/baseSettings';
import { LEERJAREN, leafAllowedForGrade, type Leerjaar } from '../config/gradePresets';
import { APP_STRUCTURE } from '../config/appstructure';

// Triage calls 2026-10-11 (M1): what a builder row is called.

const SETTINGS: BuilderSettings = { id: 'rows', createdAt: 0, title: '', mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false };
const leaf = (id: string) => listOefenLeaves().find(l => l.id === id)!;
// The raw sidebar node of a leaf: what the sidebar's leerjaar filter reads.
const leafNode = (id: string) => APP_STRUCTURE.flatMap(d => d.subdomains.flatMap(s => s.types.flatMap(t => [t, ...(t.children ?? [])]))).find(l => l.id === id)!;

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

    test('a new plaats row starts shuffled (kioskSeed) and is named so', () => {
        const l = leaf('plaatswaarde-plaats');
        expect(rowLabelOf({ leaf: l, constraints: l.constraints })).toBe('Plaatswaarde benoemen · plaats benoemen (door elkaar)');
    });

    test('the waarde leaf, the tabel and every other leaf keep their own label', () => {
        for (const l of listOefenLeaves().filter(x => x.id !== 'plaatswaarde-plaats' && x.id !== 'plaatswaarde-omcirkelen')) {
            expect(rowLabelOf({ leaf: l, constraints: l.constraints }), l.id).toBe(l.label);
        }
    });
});

describe('item 5: × and : with breuken from leerjaar 5', () => {
    const RAT = ['hr-std-vermenigvuldigen-rat', 'hr-std-delen-rat'];
    const shown = (g: Leerjaar) => new Set(filterOefenLeaves(listOefenLeaves(), '', g).map(l => l.id));
    test('hidden at L4 (+ and − with breuken stay), shown at L5', () => {
        for (const id of RAT) {
            expect(shown(4).has(id), `${id} L4`).toBe(false);
            expect(shown(5).has(id), `${id} L5`).toBe(true);
            expect(leafAllowedForGrade(leafNode(id), 4), `${id} sidebar L4`).toBe(false);
            expect(leaf(id).minGrade).toBe(5);
        }
        expect(shown(4).has('hr-std-optellen-rat')).toBe(true);
        expect(shown(4).has('hr-std-aftrekken-rat')).toBe(true);
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
            expect(pw.plaatsAnswer, `L${g}`).toBe('plaats-shuffle');
            expect(pw).toEqual(seedLeafConstraints('plaatswaarde-plaats', g, { plaatsAnswer: 'plaats-shuffle' })!.constraints);
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
