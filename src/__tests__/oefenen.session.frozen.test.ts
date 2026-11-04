import { describe, test, expect, vi, afterEach } from 'vitest';
import { REGISTRY } from '../config/exerciseRegistry';
import { LEAF_BY_ID, flattenLeaves } from '../config/appstructure';
import { buildSessie, listOefenLeaves } from '../components/oefenen/oefenBuild';
import { decodeSessie, encodeSessie } from '../services/oefenen/session';
import FIXTURE from './fixtures/oefenen/links-2026-10-09.json';

// O14 (audit D4): a later release that changes a default must not change what an old link means.
const drift = vi.hoisted(() => ({ label: false }));
vi.mock('../services/oefenen/kiosk', async (importOriginal) => {
    const m = await importOriginal<typeof import('../services/oefenen/kiosk')>();
    return { ...m, kioskLabelOf: (id: string) => (drift.label ? `Nieuwe naam ${id}` : m.kioskLabelOf(id)) };
});

type Restore = () => void;
const restores: Restore[] = [];
afterEach(() => { while (restores.length) restores.pop()!(); drift.label = false; });

function set<T extends object, K extends keyof T>(o: T, k: K, v: T[K]) {
    const had = Object.prototype.hasOwnProperty.call(o, k);
    const old = o[k];
    o[k] = v;
    restores.push(() => { if (had) o[k] = old; else delete o[k]; });
}

// Everything the audit changed, plus a label, a plain instruction and settings-dependent ones.
function changeEveryDefault({ kiezenFn = true } = {}) {
    for (const typeId of ['hr-std-optellen', 'vergelijken', 'mab-herkennen']) {
        const def = REGISTRY[typeId];
        const orig = def.defaultConstraints;
        set(def, 'defaultConstraints', ((t: string) => ({ ...(orig(t) as object), bridges: { E: 'REQUIRED' }, operand2Mask: { E: true }, newKey: 'x', setSize: 9 })) as typeof orig);
    }
    // In place, as an edit to appstructure.ts would land in every leaf map.
    set(flattenLeaves().find(l => l.id === 'hr-std-optellen-nat')!.defaultConstraints!, 'numberType', 'decimal');
    set(LEAF_BY_ID['hr-std-optellen-nat'], 'instruction', 'Tel op.');
    set(LEAF_BY_ID['getalbegrip-ordenen-rat'], 'instruction', () => 'Orden.');
    if (kiezenFn) set(LEAF_BY_ID['vergelijken-kiezen'], 'instruction', () => 'Kies.');
    drift.label = true;
}

const hashOf = (link: string) => link.slice(link.indexOf('#'));

describe('O14: old links keep their meaning when the defaults change', () => {
    test.each(FIXTURE.map(f => [f.name, f] as const))('%s', (_name, f) => {
        changeEveryDefault({ kiezenFn: false });
        expect(JSON.stringify(decodeSessie(hashOf(f.link)))).toBe(JSON.stringify(f.decoded));
    });

    test('a link made now survives a changed instruction function (vergelijken kleinste)', () => {
        const leaf = listOefenLeaves().find(l => l.id === 'vergelijken-kiezen')!;
        const constraints = { ...(REGISTRY[leaf.typeId].defaultConstraints(leaf.typeId) as Record<string, unknown>), ...leaf.constraints, chooseTarget: 'kleinste' };
        const { sessie } = buildSessie([{ key: 'a', leaf, constraints, weight: 1 }], {
            id: 'abc', createdAt: 0, title: '', mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false,
        });
        expect(sessie.types[0].instruction).toBe('Omcirkel het kleinste getal.');
        const data = encodeSessie(sessie)!;
        changeEveryDefault();
        expect(decodeSessie(data).types[0].instruction).toBe('Omcirkel het kleinste getal.');
        expect(decodeSessie(data).types[0].constraints).toEqual(JSON.parse(JSON.stringify(constraints)));
    });

    // Residual: a link made BEFORE the snapshot left a settings-dependent instruction on changed
    // settings to the live function (it carries no text), so only that one line can still move.
    test('a pre-snapshot link re-resolves only a settings-dependent instruction on changed settings', () => {
        const f = FIXTURE.find(x => x.name === 'changed constraints + custom label')!;
        changeEveryDefault();
        const s = decodeSessie(hashOf(f.link));
        expect(s.types[1].instruction).toBe('Kies.');
        expect(JSON.stringify({ ...s, types: [s.types[0], { ...s.types[1], instruction: f.decoded.types[1].instruction }] })).toBe(JSON.stringify(f.decoded));
    });
});
