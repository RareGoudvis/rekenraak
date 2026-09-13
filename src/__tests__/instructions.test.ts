import { describe, test, expect } from 'vitest';
import { flattenLeaves, LEAF_BY_ID } from '../config/appstructure';
import { resolveInstruction } from '../config/instructionPresets';
import { REGISTRY } from '../config/exerciseRegistry';
import { baseApply, DEFAULT_BASE } from '../config/baseSettings';
import { WORKSHEET_TEMPLATES } from '../config/worksheetTemplates';
import type { BlockConstraints } from '../services/math/constraintTypes';

// Same merge order as addBlockFromType: registry defaults → base snapshot → leaf override.
function mergedConstraintsFor(typeId: string, leafDefaults?: Record<string, unknown>): BlockConstraints {
    const def = REGISTRY[typeId];
    const registryDefaults = def ? def.defaultConstraints(typeId) : {};
    const baseSnapshot = def ? baseApply(DEFAULT_BASE, registryDefaults) : {};
    return { ...registryDefaults, ...baseSnapshot, ...(leafDefaults ?? {}) } as BlockConstraints;
}

describe('every sidebar leaf resolves to a real instruction', () => {
    const leaves = flattenLeaves().filter((l) => !l.typeId.startsWith('layout-'));

    test.each(leaves.map((l) => [l.id, l] as const))('%s', (_id, leaf) => {
        const constraints = mergedConstraintsFor(leaf.typeId, leaf.defaultConstraints);
        const line = resolveInstruction(leaf.instruction, leaf.typeId, leaf.label, constraints);
        expect(line.length).toBeGreaterThan(0);
        expect(line.trim().endsWith(':')).toBe(false);
    });
});

describe('LEAF_BY_ID matches flattenLeaves', () => {
    test('every implemented leaf id is in the map with its instruction', () => {
        for (const leaf of flattenLeaves()) {
            expect(LEAF_BY_ID[leaf.id]).toBeDefined();
            expect(LEAF_BY_ID[leaf.id].typeId).toBe(leaf.typeId);
        }
    });
});

// Settings-dependent leaves: exercise every branch, not just the leaf's own default, so a
// teacher who flips the setting still gets a title that matches (never the OTHER branch's
// wording, never empty).
describe('function-valued instructions cover every setting branch', () => {
    const cases: Array<{ leafId: string; overrides: Record<string, unknown>; expectContains: string }> = [
        { leafId: 'getalbegrip-ordenen-nat', overrides: { operatorMode: 'oplopend' }, expectContains: 'klein naar groot' },
        { leafId: 'getalbegrip-ordenen-nat', overrides: { operatorMode: 'aflopend' }, expectContains: 'groot naar klein' },
        { leafId: 'getalbegrip-ordenen-nat', overrides: { operatorMode: 'beide' }, expectContains: 'klein → groot' },
        { leafId: 'breuken-rangschikken', overrides: { operatorMode: 'aflopend' }, expectContains: 'groot naar klein' },
        { leafId: 'vergelijken-kiezen', overrides: { chooseTarget: 'grootste' }, expectContains: 'grootste' },
        { leafId: 'vergelijken-kiezen', overrides: { chooseTarget: 'kleinste' }, expectContains: 'kleinste' },
        { leafId: 'splitsen-plaatswaarden', overrides: { mathDirection: 'decompose' }, expectContains: 'Splits volgens plaatswaarde' },
        { leafId: 'splitsen-plaatswaarden', overrides: { mathDirection: 'compose' }, expectContains: 'Schrijf het getal' },
        { leafId: 'splitsen-benen', overrides: { maxGetal: 1000 }, expectContains: 'Splits in H, T en E.' },
        { leafId: 'splitsen-benen', overrides: { maxGetal: 100 }, expectContains: 'Splits in T en E.' },
        { leafId: 'splitsen-benen', overrides: { maxGetal: 10 }, expectContains: 'Splits in E.' },
        { leafId: 'getalbegrip-functie', overrides: { answerMode: 'aankruisen' }, expectContains: 'Kruis aan' },
        { leafId: 'getalbegrip-functie', overrides: { answerMode: 'schrijven' }, expectContains: 'in de zin' },
        { leafId: 'afronden-nat-rooster', overrides: { roundTargets: ['T', 'H'] }, expectContains: 'T en H' },
        { leafId: 'even-oneven-rooster', overrides: { target: 'even' }, expectContains: 'even getallen' },
        { leafId: 'even-oneven-rooster', overrides: { target: 'oneven' }, expectContains: 'oneven getallen' },
        { leafId: 'deelbaarheid-rooster', overrides: { divisors: [2, 5, 10] }, expectContains: '2, 5 en 10' },
        { leafId: 'schattend-nat', overrides: { scaffolding: 'tussenstappen' }, expectContains: 'Rond af en schat' },
        { leafId: 'schattend-nat', overrides: { scaffolding: 'enkel-schatting' }, expectContains: 'Schat het antwoord' },
        { leafId: 'breuken-gemengd', overrides: { direction: 'naar-gemengd' }, expectContains: 'gemengd getal' },
        { leafId: 'breuken-gemengd', overrides: { direction: 'naar-breuk' }, expectContains: 'als breuk' },
        { leafId: 'vormleer-driehoeken', overrides: { mode: 'herkennen' }, expectContains: 'driehoek' },
        { leafId: 'vormleer-driehoeken', overrides: { mode: 'eigenschappen' }, expectContains: 'eigenschappen' },
        { leafId: 'lengte-meten', overrides: { measureModel: 'meten' }, expectContains: 'Meet' },
        { leafId: 'lengte-meten', overrides: { measureModel: 'gegeven' }, expectContains: 'Juist of fout' },
        { leafId: 'maateenheid-kiezen', overrides: { answerMode: 'omcirkelen' }, expectContains: 'Omcirkel' },
        { leafId: 'maateenheid-kiezen', overrides: { answerMode: 'schrijven' }, expectContains: 'Schrijf' },
    ];

    test.each(cases)('$leafId with $overrides', ({ leafId, overrides, expectContains }) => {
        const leaf = LEAF_BY_ID[leafId];
        expect(leaf).toBeDefined();
        const line = resolveInstruction(leaf.instruction, leaf.typeId, leaf.label, overrides as BlockConstraints);
        expect(line.length).toBeGreaterThan(0);
        expect(line.trim().endsWith(':')).toBe(false);
        expect(line).toContain(expectContains);
    });
});

describe('curated templates never fall back to "<label>:"', () => {
    test('every template block has a real instruction', () => {
        for (const tmpl of WORKSHEET_TEMPLATES) {
            for (const block of tmpl.payload.blocks) {
                if (block.typeId.startsWith('layout-')) continue;
                expect(block.instructionText.length).toBeGreaterThan(0);
                expect(block.instructionText.trim().endsWith(':')).toBe(false);
            }
        }
    });
});
