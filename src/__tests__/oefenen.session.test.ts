import { describe, test, expect } from 'vitest';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import { REGISTRY } from '../config/exerciseRegistry';
import { LEAF_BY_ID } from '../config/appstructure';
import { mulberry32 } from './helpers/limitHarness';
import { KIOSK_KEY_TABLE_V1, KIOSK_LEAF_TABLE_V1, kioskCapableLeaves, kioskLabel } from '../services/oefenen/kiosk';
import { flattenLeaves } from '../config/appstructure';
import { buildSessie, listOefenLeaves, type BuilderRow } from '../components/oefenen/oefenBuild';
import { qrMatrixOrNull, qrVersionOf } from '../services/qr';
import {
    MAX_SESSIE_BYTES, decodeSessie, encodeSessie, newSessieId, packWire, parseSessie, sessieLink,
} from '../services/oefenen/session';

const ORIGIN = 'https://www.rekenraak.be';
const MINUTE_AT = 29_333_335 * 60_000;
const leaves = listOefenLeaves();
// What the builder's draft block holds for an untouched leaf (makeDraftBlock).
const draftOf = (leafId: string) => {
    const l = leaves.find(x => x.id === leafId)!;
    return { ...(REGISTRY[l.typeId].defaultConstraints(l.typeId) as Record<string, unknown>), ...l.constraints };
};

// Change every setting a teacher could touch: numbers, flags, masks, arrays.
function customise(c: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(c)) {
        if (k === 'subType' || k === 'numberType') out[k] = v;
        else if (typeof v === 'number') out[k] = v === 1000 ? 100 : v + 3;
        else if (typeof v === 'boolean') out[k] = !v;
        else if (Array.isArray(v)) out[k] = typeof v[0] === 'number' ? [2, 3, 4, 5, 6, 7, 8, 9] : ['E', 'T'];
        else if (k === 'bridges') out[k] = { E: 'REQUIRED', T: 'FORBIDDEN' };
        else if (v && typeof v === 'object') out[k] = { E: true, T: true, H: false };
        else out[k] = v;
    }
    return out;
}

// `changed` settings on the first `changed` keys of each row (0 = defaults, Infinity = all).
function sessieOf(n: number, changed: number, extras = false): OefenSessie {
    const capable = kioskCapableLeaves();
    const rows: BuilderRow[] = Array.from({ length: n }, (_, i) => {
        const leaf = leaves.find(l => l.id === capable[i % capable.length].id)!;
        const draft = draftOf(leaf.id);
        const all = customise(draft);
        const keys = Object.keys(draft).filter(k => all[k] !== draft[k]).slice(0, changed);
        const constraints = { ...draft, ...Object.fromEntries(keys.map(k => [k, all[k]])) };
        return { key: `r${i}`, leaf, constraints, weight: extras ? 10 + i * 7 : 50, ...(extras && { limit: 10 }) };
    });
    return buildSessie(rows, {
        id: 'k3x9q2ab', createdAt: MINUTE_AT, title: extras ? 'Herhaling week 6' : '',
        mode: extras ? 'willekeurig' : 'afwisselen', allowRepeatType: extras, timerMin: extras ? 15 : undefined,
        testMode: extras, statsLocked: extras,
    }).sessie;
}

const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const roundTrip = (s: OefenSessie) => decodeSessie(`#oefen=${encodeSessie(s)}`);
const qrVersion = (s: OefenSessie) => {
    const m = qrMatrixOrNull(sessieLink(s, ORIGIN)!);
    return m ? qrVersionOf(m) : Infinity;
};

describe('codec', () => {
    test('round-trip is lossless for every kiosk leaf at defaults', () => {
        for (const leaf of leaves) {
            const { sessie } = buildSessie([{ key: 'a', leaf, constraints: draftOf(leaf.id), weight: 1 }], {
                id: 'abc', createdAt: MINUTE_AT, title: '', mode: 'afwisselen', allowRepeatType: false, testMode: false, statsLocked: false,
            });
            expect(roundTrip(sessie), leaf.id).toEqual(json(sessie));
        }
    });
    test('round-trip is lossless for every kiosk leaf with every setting changed (masks, arrays)', () => {
        const s = sessieOf(kioskCapableLeaves().length, Infinity, true);
        expect(roundTrip(s)).toEqual(json(s));
    });
    test('removed, unknown, undefined and null settings survive', () => {
        const s = sessieOf(2, 1);
        const c = s.types[0].constraints;
        delete c[Object.keys(c)[0]];
        s.types[0].constraints = { ...c, brandNewKey: { a: [1, 2] }, gone: undefined, nothing: null };
        s.types[1].constraints = { ...s.types[1].constraints, maxGetal: undefined };
        expect(roundTrip(s)).toEqual(json(s));
    });
    test('custom label, custom / absent instruction, uneven weights, limits, unknown leaf, odd createdAt', () => {
        const s = sessieOf(4, 1, true);
        s.types[0] = { ...s.types[0], label: 'Mijn eigen naam', instruction: 'Los op.' };
        delete s.types[1].instruction;
        s.types[2] = { ...s.types[2], weight: 0, limit: 3 };
        // A leaf this version does not know: typeId + label must travel explicitly.
        s.types[3] = { ...s.types[3], leafId: 'oude-leaf', label: 'Oud' } as OefenType;
        s.createdAt = 1_760_000_123_456;
        s.total = 25;
        expect(roundTrip(s)).toEqual(json(s));
    });
    test('the same leaf twice with other settings keeps both', () => {
        const s = sessieOf(2, 0);
        s.types[1] = { ...s.types[0], constraints: customise(s.types[0].constraints) };
        expect(roundTrip(s)).toEqual(json(s));
    });
    test('payload is upper-case base32 (QR alphanumeric) and decodes case-insensitively', () => {
        const data = encodeSessie(sessieOf(4, 2))!;
        expect(data).toMatch(/^[A-Z2-7]+$/);
        expect(decodeSessie(data.toLowerCase())).toEqual(decodeSessie(data));
    });
    test('QR budget: 4 types default ≤ v10, 20 types default ≤ v20, 20 fully customised ≤ v40', () => {
        expect(qrVersion(sessieOf(4, 0))).toBeLessThanOrEqual(10);
        expect(qrVersion(sessieOf(20, 0))).toBeLessThanOrEqual(20);
        expect(qrVersion(sessieOf(20, 1))).toBeLessThanOrEqual(20);
        expect(qrVersion(sessieOf(20, Infinity, true))).toBeLessThanOrEqual(40);
        expect(encodeSessie(sessieOf(20, Infinity, true))!.length).toBeLessThan(MAX_SESSIE_BYTES / 20);
    });
    test('too large → null, no link', () => {
        const s = sessieOf(1, 0);
        // Random text does not compress: ~40 kB of it overruns the cap.
        const rnd = mulberry32(1);
        s.title = Array.from({ length: 40_000 }, () => String.fromCharCode(33 + Math.floor(rnd() * 90))).join('');
        expect(encodeSessie(s)).toBeNull();
        expect(sessieLink(s, 'https://x.be')).toBeNull();
    });
    test('link shape', () => {
        const s = sessieOf(1, 0);
        expect(sessieLink(s, 'https://rekenraak.be/')).toBe(`https://rekenraak.be/oefenen.html#oefen=${encodeSessie(s)}`);
    });
    test('ids are 8 storage-key safe chars and distinct', () => {
        const ids = new Set(Array.from({ length: 200 }, newSessieId));
        expect(ids.size).toBe(200);
        for (const id of ids) expect(id).toMatch(/^[a-z0-9]{8}$/);
    });
});

describe('frozen link tables (append only)', () => {
    // Pinned copies: reordering or deleting an entry would re-point every shared link.
    const LEAVES_V1 = [
        'vergelijken-getallen', 'afronden-nat-simpel', 'afronden-dec-simpel', 'procenten-nemen', 'procenten-welk',
        'hr-std-optellen-nat', 'hr-std-optellen-dec', 'hr-std-aftrekken-nat', 'hr-std-aftrekken-dec',
        'hr-std-vermenigvuldigen-nat', 'hr-std-vermenigvuldigen-dec', 'hr-std-delen-nat', 'hr-std-delen-dec',
        'hr-std-optellen-rat', 'hr-std-aftrekken-rat', 'hr-std-vermenigvuldigen-rat', 'hr-std-delen-rat',
    ];
    const KEYS_V1 = [
        'subType', 'maxGetal', 'numberMask', 'chooseTarget', 'setSize', 'decimalPlaces', 'leftRep', 'rightRep',
        'leftMask', 'rightMask', 'leftFracN', 'leftFracD', 'rightFracN', 'rightFracD', 'numberType', 'roundTargets',
        'roosterSize', 'percents', 'scaffold', 'bridges', 'operand1Mask', 'operand2Mask', 'fractionDifficulty',
        'mixedNumber1', 'mixedNumber2', 'maxNumerator1', 'maxDenominator1', 'maxNumerator2', 'maxDenominator2',
        'linkFractions', 'multiplicationMode', 'selectedTables', 'tableLimit',
    ];
    test('existing entries never move', () => {
        expect(KIOSK_LEAF_TABLE_V1.slice(0, LEAVES_V1.length)).toEqual(LEAVES_V1);
        expect(KIOSK_KEY_TABLE_V1.slice(0, KEYS_V1.length)).toEqual(KEYS_V1);
        expect(new Set(KIOSK_LEAF_TABLE_V1).size).toBe(KIOSK_LEAF_TABLE_V1.length);
        expect(new Set(KIOSK_KEY_TABLE_V1).size).toBe(KIOSK_KEY_TABLE_V1.length);
    });
    test('every kiosk-capable leaf has an index (append new ones at the end)', () => {
        for (const l of kioskCapableLeaves()) expect(KIOSK_LEAF_TABLE_V1, l.id).toContain(l.id);
        for (const id of KIOSK_LEAF_TABLE_V1) expect(LEAF_BY_ID[id], id).toBeDefined();
    });
});

describe('strict decode', () => {
    const wire = (over: (w: unknown[]) => void) => {
        const w: unknown[] = [1, 'abc', MINUTE_AT / 60_000, 0, [[3]]];
        over(w);
        return packWire(w);
    };
    test('a newer version throws in Dutch', () => {
        expect(() => decodeSessie(wire(w => { w[0] = 2; }))).toThrow(/nieuwere versie \(v2\).*Werk de app bij/);
    });
    test.each([
        ['garbage', '#oefen=@@@'],
        ['empty', '#oefen='],
        ['truncated', `#oefen=${packWire([1, 'abc', 1, 0, [[3]]]).slice(0, 12)}`],
        ['not a wire', packWire({ v: 1 })],
        ['no rows', wire(w => { w[4] = []; })],
        ['bad leaf index', wire(w => { w[4] = [[999]]; })],
        ['odd diff', wire(w => { w[4] = [[3, [1]]]; })],
        ['unknown key index', wire(w => { w[4] = [[3, [999, 1]]]; })],
        ['bad flags', wire(w => { w[3] = 'x'; })],
        ['bad id', wire(w => { w[1] = '../x'; })],
        ['bad limit', wire(w => { w[4] = [[3, null, null, 0]]; })],
        ['bad weight', wire(w => { w[4] = [[3, null, -1]]; })],
    ])('%s → Dutch error', (_name, hash) => {
        expect(() => decodeSessie(hash)).toThrow(/oefenlink is ongeldig/);
    });
    test('a type without a kiosk descriptor is refused (ask to update)', () => {
        expect(() => decodeSessie(wire(w => { w[4] = [['kalender-maandrooster']]; }))).toThrow(/niet kent \(.+\).*Werk de app bij/);
    });
    test.each<[string, (s: Record<string, unknown>) => void]>([
        ['no version', s => { delete s.v; }],
        ['old version', s => { s.v = 0; }],
        ['bad id', s => { s.id = '../x'; }],
        ['no types', s => { s.types = []; }],
        ['bad mode', s => { s.mode = 'shuffle'; }],
        ['bad flag', s => { s.testMode = 'ja'; }],
        ['bad timer', s => { s.timerMin = -1; }],
        ['bad total', s => { s.total = 2.5; }],
        ['bad limit', s => { (s.types as Record<string, unknown>[])[0].limit = 0; }],
        ['bad weight', s => { (s.types as Record<string, unknown>[])[0].weight = -1; }],
        ['no constraints', s => { delete (s.types as Record<string, unknown>[])[0].constraints; }],
    ])('parseSessie: %s → throws', (_name, mutate) => {
        const s = json(sessieOf(2, 1, true)) as unknown as Record<string, unknown>;
        mutate(s);
        expect(() => parseSessie(s)).toThrow(/oefenlink/);
    });
    test('unknown extra fields are dropped', () => {
        const s = { ...sessieOf(1, 0), extra: 1 };
        expect(parseSessie(s)).not.toHaveProperty('extra');
    });
});

describe('kioskLabel', () => {
    const label = (id: string) => kioskLabel(flattenLeaves().find(l => l.id === id)!);
    test('drops the parent clutter: name · number kind · detail', () => {
        expect(label('hr-std-optellen-nat')).toBe('Optellen · natuurlijk');
        expect(label('hr-std-delen-dec')).toBe('Delen · decimaal');
        expect(label('hr-std-vermenigvuldigen-rat')).toBe('Vermenigvuldigen · breuken');
        expect(label('afronden-dec-simpel')).toBe('Afronden · decimaal · eenvoudig');
        expect(label('vergelijken-getallen')).toBe('Vergelijken · twee getallen');
        expect(label('procenten-welk')).toBe('Hoeveel procent?');
    });
    test('a leaf shortLabel wins', () => {
        const leaf = { ...flattenLeaves().find(l => l.id === 'procenten-nemen')!, shortLabel: 'Procent nemen' };
        expect(kioskLabel(leaf)).toBe('Procent nemen');
    });
    test('unique over the kiosk-capable leaves (else give one a shortLabel)', () => {
        const labels = kioskCapableLeaves().map(kioskLabel);
        expect(new Set(labels).size).toBe(labels.length);
    });
    test('a builder session ships no labels: they come back from the leaf', () => {
        const s = sessieOf(4, 0);
        expect(s.types.map(t => t.label)).toEqual(s.types.map(t => label(t.leafId)));
        expect(roundTrip(s).types.map(t => t.label)).toEqual(s.types.map(t => t.label));
    });
});
