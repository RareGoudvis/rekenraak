import { describe, test, expect } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import type { OefenSessie } from '../services/oefenen/types';
import { DEFAULT_BASE, seedConstraints } from '../config/baseSettings';
import { LEAF_BY_ID } from '../config/appstructure';
import { mulberry32 } from './helpers/limitHarness';
import { MAX_SESSIE_BYTES, decodeSessie, encodeSessie, newSessieId, parseSessie, sessieLink } from '../services/oefenen/session';

// The four starter types with the full constraint bag a teacher's draft block carries.
const LEAVES = ['hr-std-optellen-nat', 'procenten-nemen', 'afronden-nat-simpel', 'vergelijken-getallen'];

function fullSessie(): OefenSessie {
    return {
        v: 1, id: newSessieId(), title: 'Herhaling week 6', createdAt: 1_760_000_000_000,
        types: LEAVES.map((leafId, i) => {
            const { typeId, label } = LEAF_BY_ID[leafId];
            const constraints = seedConstraints({ typeId, base: DEFAULT_BASE, override: { subType: leafId === 'afronden-nat-simpel' ? 'simpel' : undefined }, leafId });
            return { typeId, leafId, label, instruction: 'Reken uit.', constraints, weight: 25, ...(i % 2 === 0 && { limit: 10 }) };
        }),
        mode: 'willekeurig', allowRepeatType: false, timerMin: 15, testMode: true, statsLocked: true, total: 30,
    };
}

const raw = (obj: unknown) => compressToEncodedURIComponent(JSON.stringify(obj));

describe('codec', () => {
    test('round-trip is lossless', () => {
        const s = fullSessie();
        const data = encodeSessie(s)!;
        expect(decodeSessie(`#oefen=${data}`)).toEqual(JSON.parse(JSON.stringify(s)));
        expect(decodeSessie(data)).toEqual(decodeSessie(`#oefen=${data}`));
    });
    test('four full types stay far below the 30 kB cap', () => {
        const data = encodeSessie(fullSessie())!;
        expect(data.length).toBeLessThan(MAX_SESSIE_BYTES / 6);
    });
    test('too large → null, no link', () => {
        const s = fullSessie();
        // Random text does not compress: ~40 kB of it overruns the cap.
        const rnd = mulberry32(1);
        s.title = Array.from({ length: 40_000 }, () => String.fromCharCode(33 + Math.floor(rnd() * 90))).join('');
        expect(encodeSessie(s)).toBeNull();
        expect(sessieLink(s, 'https://x.be')).toBeNull();
    });
    test('link shape', () => {
        const s = fullSessie();
        expect(sessieLink(s, 'https://rekenraak.be/')).toBe(`https://rekenraak.be/oefenen.html#oefen=${encodeSessie(s)}`);
    });
    test('ids are storage-key safe and distinct', () => {
        const ids = new Set(Array.from({ length: 200 }, newSessieId));
        expect(ids.size).toBe(200);
        for (const id of ids) expect(id).toMatch(/^[a-z0-9_-]{1,40}$/);
    });
});

describe('strict decode', () => {
    test('a newer version throws in Dutch', () => {
        expect(() => decodeSessie(raw({ ...fullSessie(), v: 2 }))).toThrow(/nieuwere versie \(v2\).*Werk de app bij/);
    });
    test.each([
        ['garbage', '#oefen=@@@'],
        ['empty', '#oefen='],
        ['not JSON', compressToEncodedURIComponent('{nope')],
    ])('%s → Dutch error', (_name, hash) => {
        expect(() => decodeSessie(hash)).toThrow(/oefenlink is ongeldig/);
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
    ])('%s → throws', (_name, mutate) => {
        const s = JSON.parse(JSON.stringify(fullSessie())) as Record<string, unknown>;
        mutate(s);
        expect(() => parseSessie(s)).toThrow(/oefenlink/);
    });
    test('a type without a kiosk descriptor is refused (ask to update)', () => {
        const s = JSON.parse(JSON.stringify(fullSessie())) as OefenSessie;
        s.types[0].typeId = 'klok-kloklezen';
        expect(() => parseSessie(s)).toThrow(/niet kent \(klok-kloklezen\)/);
    });
    test('unknown extra fields are dropped', () => {
        const s = { ...fullSessie(), extra: 1 };
        expect(parseSessie(s)).not.toHaveProperty('extra');
    });
});
