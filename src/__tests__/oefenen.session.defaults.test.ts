import { describe, test, expect } from 'vitest';
import { DEFAULT_BASE, seedConstraints } from '../config/baseSettings';
import { flattenLeaves } from '../config/appstructure';
import { resolveInstruction } from '../config/instructionPresets';
import type { BlockConstraints } from '../services/math/constraintTypes';
import { KIOSK_LEAF_TABLE_V1, kioskCapableLeaves, kioskLabelOf } from '../services/oefenen/kiosk';
import { KIOSK_DEFAULTS_V1_LEAVES, kioskDefaultV1, type KioskDefault } from '../services/oefenen/kioskDefaults';
import { decodeSessie, encodeSessie } from '../services/oefenen/session';
import FIXTURE from './fixtures/oefenen/links-2026-10-09.json';

// Accepted drift: "leafId.field" pairs whose live default moved after the snapshot on purpose and
// whose new links may keep diffing against V1 (they only get longer). Empty on 2026-10-09.
const ACCEPTED_DRIFT: readonly string[] = [];

const LEAVES = new Map(flattenLeaves().map(l => [l.id, l]));

// What the snapshot would hold if it were taken now (the generator's own recipe).
function liveDefault(leafId: string): KioskDefault {
    const leaf = LEAVES.get(leafId)!;
    const constraints = JSON.parse(JSON.stringify(seedConstraints({
        typeId: leaf.typeId, leafId, base: DEFAULT_BASE, grade: null, override: leaf.defaultConstraints,
    }))) as Record<string, unknown>;
    return {
        typeId: leaf.typeId,
        label: kioskLabelOf(leafId) ?? leaf.label,
        instruction: resolveInstruction(leaf.instruction, leaf.typeId, leaf.label, constraints as BlockConstraints),
        dynInstruction: typeof leaf.instruction === 'function',
        constraints,
    };
}

const hashOf = (link: string) => link.slice(link.indexOf('#'));
const json = (v: unknown): unknown => JSON.parse(JSON.stringify(v));

describe('KIOSK_DEFAULTS_V1 (frozen defaults a link is diffed against)', () => {
    test('every leaf a link can name has a frozen entry (a new kiosk leaf: append its entry)', () => {
        const missing = KIOSK_LEAF_TABLE_V1.filter(id => !kioskDefaultV1(id));
        const hint = missing.map(id => `${id}: ${JSON.stringify(liveDefault(id))}`).join('\n');
        expect(missing, `Append these leaves to LEAVES in kioskDefaults.ts (never edit existing rows):\n${hint}`).toEqual([]);
        expect(KIOSK_DEFAULTS_V1_LEAVES.slice(0, KIOSK_LEAF_TABLE_V1.length)).toEqual(KIOSK_LEAF_TABLE_V1);
        for (const l of kioskCapableLeaves()) expect(kioskDefaultV1(l.id), l.id).toBeDefined();
    });

    test('the live defaults still equal the snapshot (guard: a drift means old links no longer match new ones)', () => {
        const drift: string[] = [];
        for (const id of KIOSK_DEFAULTS_V1_LEAVES) {
            if (!LEAVES.has(id)) { drift.push(`${id}.leaf: gone from APP_STRUCTURE`); continue; }
            const frozen = kioskDefaultV1(id)!;
            const live = liveDefault(id);
            for (const f of ['typeId', 'label', 'instruction', 'dynInstruction'] as const) {
                if (frozen[f] !== live[f]) drift.push(`${id}.${f}: ${JSON.stringify(frozen[f])} → ${JSON.stringify(live[f])}`);
            }
            for (const k of new Set([...Object.keys(frozen.constraints), ...Object.keys(live.constraints)])) {
                const a = JSON.stringify(frozen.constraints[k]), b = JSON.stringify(live.constraints[k]);
                if (a !== b) drift.push(`${id}.${k}: ${a} → ${b}`);
            }
        }
        const unaccepted = drift.filter(d => !ACCEPTED_DRIFT.some(a => d.startsWith(`${a}:`)));
        expect(unaccepted, [
            'Kiosk defaults changed → bump the wire version and add a KIOSK_DEFAULTS_V2 snapshot (session.ts decodes v1 against V1),',
            'or, if new links may keep diffing against V1 (they only grow), list the drift in ACCEPTED_DRIFT here.',
            'Never edit KIOSK_DEFAULTS_V1: old links would decode to other settings.',
        ].join('\n')).toEqual([]);
    });

    test('a frozen entry is a fresh copy (callers may write into it)', () => {
        const a = kioskDefaultV1('hr-std-optellen-nat')!;
        (a.constraints.bridges as Record<string, unknown>).E = 'x';
        expect((kioskDefaultV1('hr-std-optellen-nat')!.constraints.bridges as Record<string, unknown>).E).not.toBe('x');
    });
});

describe('links made on 2026-10-09 (fixture)', () => {
    test.each(FIXTURE.map(f => [f.name, f] as const))('%s decodes byte-identical', (_name, f) => {
        const decoded = decodeSessie(hashOf(f.link));
        expect(json(decoded)).toEqual(f.decoded);
        expect(JSON.stringify(decoded)).toBe(JSON.stringify(f.decoded));
    });
    test('re-encoding the decoded fixture round-trips', () => {
        for (const f of FIXTURE) {
            const s = decodeSessie(hashOf(f.link));
            expect(JSON.stringify(decodeSessie(encodeSessie(s)!))).toBe(JSON.stringify(f.decoded));
        }
    });
});
