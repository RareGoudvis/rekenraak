import { describe, test, expect } from 'vitest';
import { constraintSpaceFor } from '../config/constraintSpace';
import { listOefenLeaves, rowYields, type OefenLeaf } from '../components/oefenen/oefenBuild';
import { nextExercise } from '../services/oefenen/scheduler';
import { OEFEN_VERSION, type OefenSessie, type OefenType } from '../services/oefenen/types';
import { mulberry32 } from './helpers/limitHarness';

// Zero-output sweep: every kiosk-capable leaf × each constraintSpace option on its own (and
// each multi-select emptied) + the pairwise combos the 2026-10-09 beta audit found. A setting
// either gives the kiosk an exercise, or the builder pre-flight (rowYields) flags the row so
// Delen stays off. Every dead setting is pinned in DEAD with where it stands, so a new one
// fails here and needs a decision (keep-one guard, generator fix, or flagged on purpose).

type Variant = { leafId: string; name: string; over: Record<string, unknown> };

// Combos one option at a time cannot reach (O10 list + what the audit's follow-up found).
const COMBOS: Variant[] = [
    ['vergelijken-kiezen', { maxGetal: 100_000_000, numberMask: { HM: true }, setSize: 2, leftRep: 'breuk', rightRep: 'breuk' }],
    ['vergelijken-kiezen', { maxGetal: 1_000_000, numberMask: { M: true }, setSize: 6 }],
    ['patronen-kettingsommen', { ops: [':'], chainLength: 6 }],
    ['patronen-kettingsommen', { ops: [':'], chainLength: 5, maxGetal: 1000 }],
    ['patronen-kettingsommen', { ops: ['x'], chainLength: 5, maxGetal: 20 }],
    ['handig-rekenvolgorde', { operators: [':'], haakjesMode: 'MOET', opsCount: 4, maxGetal: 100 }],
    ['handig-rekenvolgorde', { operators: [':'], haakjesMode: 'GEEN', opsCount: 4, maxGetal: 1000 }],
    ['hr-std-delen-dec', { maxGetal: 1_000_000_000, operandMax: [20, 20, 20, 20] }],
    ['hr-std-vermenigvuldigen-dec', { maxGetal: 1_000_000_000, operandMax: [20, 20, 20, 20] }],
    ['schattend-nat', { operators: ['+'], maxGetal: 10, roundTargets: ['T'] }],
    ['schattend-nat', { operators: ['x'], maxGetal: 10, roundTargets: ['H'] }],
    ['hr-std-aftrekken-rat', { preset: 'compenseren', equationType: 'puntoefening' }],
    ['hr-std-delen-nat', { multiplicationMode: 'tafels', selectedTables: [0] }],
    ['hr-std-delen-nat', { multiplicationMode: 'met_rest', selectedTables: [1] }],
].map(([leafId, over]) => ({ leafId: leafId as string, name: JSON.stringify(over), over: over as Record<string, unknown> }));

// Where each dead setting stands. "unreachable": the builder's config cannot produce it.
// "flagged": a teacher can reach it; the pre-flight shows the red note and blocks Delen.
const DEAD: Record<string, string> = {
    'procenten-nemen percents=[]': 'unreachable: ProcentenConfig keeps ≥1 percent',
    'procenten-welk percents=[]': 'unreachable: ProcentenConfig keeps ≥1 percent',
    'geld-rekenen-korting percents=[]': 'unreachable: GeldRekenenConfig keeps ≥1 percent',
    'geld-rekenen-intrest percents=[]': 'unreachable: GeldRekenenConfig keeps ≥1 percent',
    'hr-std-vermenigvuldigen-nat selectedTables=[]': 'unreachable: NaturalSettings keeps ≥1 tafel',
    'hr-std-delen-nat selectedTables=[]': 'unreachable: NaturalSettings keeps ≥1 deeltafel',
    'hr-std-delen-nat {"multiplicationMode":"tafels","selectedTables":[0]}': 'unreachable: NaturalSettings never leaves 0 as the only deler',
    'geld-teruggeven payWithOptions=[]': 'unreachable: GeldTeruggevenConfig keeps ≥1 biljet',
    'klok-analoog-lezen timeTypes=[]': 'flagged (+ kioskSupports refuses it): ClockConfig lets every tijdstype go',
    'klok-analoog-tekenen timeTypes=[]': 'flagged (+ kioskSupports refuses it): ClockConfig lets every tijdstype go',
    'klok-analoog-omzetten timeTypes=[]': 'flagged (+ kioskSupports refuses it): ClockConfig lets every tijdstype go',
    'klok-digitaal-tekenen timeTypes=[]': 'flagged (+ kioskSupports refuses it): ClockConfig lets every tijdstype go',
    'hr-std-delen-nat {"multiplicationMode":"met_rest","selectedTables":[1]}': 'flagged: tafels [1] then Met rest keeps the hidden 1 (no rest by 1)',
    'vergelijken-kiezen {"maxGetal":100000000,"numberMask":{"HM":true},"setSize":2,"leftRep":"breuk","rightRep":"breuk"}': 'flagged: a mask on the top place allows one number (100 000 000)',
    'vergelijken-kiezen {"maxGetal":1000000,"numberMask":{"M":true},"setSize":6}': 'flagged: a mask on the top place allows one number (1 000 000)',
    'patronen-kettingsommen {"ops":[":"],"chainLength":6}': 'unreachable (KettingConfig offers 3-5 stappen); the generator clamps 6 to 5, dead as below',
    'patronen-kettingsommen {"ops":[":"],"chainLength":5,"maxGetal":1000}': 'flagged: 5 × : needs a start ≥ 32, starts stay ≤ 20 by design (the sheet notes it too)',
    'patronen-kettingsommen {"ops":["x"],"chainLength":5,"maxGetal":20}': 'flagged: 1·2^5 = 32 > 20',
    'handig-rekenvolgorde {"operators":[":"],"haakjesMode":"MOET","opsCount":4,"maxGetal":100}': 'flagged: four whole divisions under the max',
    'handig-rekenvolgorde {"operators":[":"],"haakjesMode":"GEEN","opsCount":4,"maxGetal":1000}': 'flagged: four whole divisions under the max',
    'hr-std-delen-dec {"maxGetal":1000000000,"operandMax":[20,20,20,20]}': 'unreachable: operandMax is an optellen-only control',
    'hr-std-vermenigvuldigen-dec {"maxGetal":1000000000,"operandMax":[20,20,20,20]}': 'unreachable: operandMax is an optellen-only control',
    'schattend-nat {"operators":["+"],"maxGetal":10,"roundTargets":["T"]}': 'unreachable: the natural schattend list starts at 100',
    'schattend-nat {"operators":["x"],"maxGetal":10,"roundTargets":["H"]}': 'unreachable: the natural schattend list starts at 100',
};

const isPlainList = (v: unknown) => Array.isArray(v) && v.every(x => typeof x !== 'object');

function variantsOf(leaf: OefenLeaf): Variant[] {
    const out: Variant[] = [{ leafId: leaf.id, name: 'default', over: {} }];
    for (const [key, options] of Object.entries(constraintSpaceFor(leaf.typeId))) {
        for (const v of options) out.push({ leafId: leaf.id, name: `${key}=${JSON.stringify(v)}`, over: { [key]: v } });
        // A multi-select a teacher can untick to nothing.
        if (options.some(isPlainList)) out.push({ leafId: leaf.id, name: `${key}=[]`, over: { [key]: [] } });
    }
    return out;
}

// The kiosk's own draw, seeded: what a pupil's first exercise of this row would be.
function kioskDraw(leaf: OefenLeaf, constraints: Record<string, unknown>, seed: number): boolean {
    const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints, weight: 100 };
    const s: OefenSessie = { v: OEFEN_VERSION, id: 'sweep', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false };
    return nextExercise(s, type, new Set(), mulberry32(seed)) !== null;
}

describe('oefenmodus zero-output sweep', () => {
    const leaves = listOefenLeaves();
    const byId = new Map(leaves.map(l => [l.id, l]));

    test('every leaf × option (and the audit combos) yields an exercise or is flagged by the pre-flight', () => {
        const all = [...leaves.flatMap(variantsOf), ...COMBOS];
        const dead: string[] = [];
        for (const v of all) {
            const leaf = byId.get(v.leafId);
            if (!leaf) throw new Error(`${v.leafId} is not kiosk-capable`);
            const constraints = { ...leaf.constraints, ...v.over };
            if (kioskDraw(leaf, constraints, 1)) continue;
            const id = `${v.leafId} ${v.name}`;
            dead.push(id);
            // The builder's own call (unseeded, as the modal makes it) must agree: the row is flagged.
            expect(rowYields({ leaf, constraints }), `${id}: pre-flight must flag it`).toBe(false);
        }
        expect(dead.filter(id => !(id in DEAD)), 'new zero-output settings: guard them or pin them in DEAD').toEqual([]);
        expect(Object.keys(DEAD).filter(id => !dead.includes(id)), 'DEAD rows that yield now: drop them').toEqual([]);
    }, 20_000);

    test('a dead top-place mask fails fast (no 20 000-attempt spin), so the pre-flight does not freeze the builder', () => {
        const leaf = byId.get('vergelijken-kiezen')!;
        const t0 = performance.now();
        expect(rowYields({ leaf, constraints: { ...leaf.constraints, maxGetal: 1_000_000, numberMask: { M: true }, setSize: 6 } })).toBe(false);
        expect(performance.now() - t0).toBeLessThan(2000);
    });
});
