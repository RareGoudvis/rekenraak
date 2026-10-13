// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { constraintSpaceFor } from '../config/constraintSpace';
import { listOefenLeaves, type OefenLeaf } from '../components/oefenen/oefenBuild';
import { nextExercise } from '../services/oefenen/scheduler';
import { kioskFor, kioskInputOf, kioskInteractOf } from '../services/oefenen/kiosk';
import { capOf, sanitizeAnswer, useOefenStore } from '../oefenen/useOefenStore';
import type { KioskInput, OefenType } from '../services/oefenen/types';
import { mulberry32 } from './helpers/limitHarness';
import { rightCells } from './helpers/fillCells';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';

// The kiosk never cuts a typed answer short: 19600/15394639 (delen · kommagetal ÷ breuk) was
// silently clipped to 12 characters. Every breuk-capable leaf at its pickers' tops, 200 seeds:
// each spelling the pupil can type fits the field (or the card's cell) as it is.

const SEEDS = 200;

// The settings that make a breuk answer longest, where the leaf's space has them.
const TOPS: Record<string, unknown> = {
    fractionDifficulty: 'multi_step', mixedNumber1: true, mixedNumber2: true, decimalPlaces: 3,
};
// Settings whose every option changes the answer's shape: crossed with each other (termCount 3-4
// is a breuk chain, which drops fractionMultMode).
const MODES = ['termCount', 'fractionMultMode', 'fractionOrderMode', 'equationType', 'direction', 'linkFractions', 'allowIrreducible', 'tablesOnly'];
// Numeric settings swept at their highest option (maxGetal: the worst a grade seed can hand a rational row).
const MAXED = /^(maxGetal|maxNumerator\d?|maxDenominator\d?)$/;

function variantsOf(leaf: OefenLeaf): Record<string, unknown>[] {
    const space = constraintSpaceFor(leaf.typeId);
    const top: Record<string, unknown> = {};
    for (const [k, opts] of Object.entries(space)) {
        if (k in TOPS) top[k] = TOPS[k];
        else if (MAXED.test(k) && opts.every(o => typeof o === 'number')) top[k] = Math.max(...(opts as number[]));
    }
    let out: Record<string, unknown>[] = [{ ...leaf.constraints, ...top }];
    for (const k of MODES) {
        const opts = space[k];
        if (!opts) continue;
        out = out.flatMap(c => opts.map(o => ({ ...c, [k]: o })));
    }
    return out;
}

const typed = (kind: KioskInput) => kind === 'number' || kind === 'missing-operand' || kind === 'multi-number' || kind === 'number+rest';

describe('typed answer length', () => {
    const leaves = listOefenLeaves().filter(l => variantsOf(l).some(c => kioskFor(l.typeId)?.keys?.(c).includes('/')));

    test('the breuk-capable leaves are found', () => {
        expect(leaves.map(l => l.id)).toEqual(expect.arrayContaining(['hr-std-delen-rat', 'hr-std-optellen-rat', 'breuken-gemengd']));
    });

    test.each(leaves.map(l => [l.id, l] as const))('%s: every typeable spelling survives sanitizeAnswer', (_id, leaf) => {
        const d = kioskFor(leaf.typeId)!;
        const cut: string[] = [];
        let longest = '';
        for (const c of variantsOf(leaf)) {
            const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints: c, weight: 1 };
            const s = starterSessie({ types: [type] });
            for (let seed = 1; seed <= SEEDS; seed++) {
                const made = nextExercise(s, type, new Set(), mulberry32(seed));
                if (!made) break;
                const kind = kioskInputOf(d, made.exercise, made.constraints);
                const cells = kind === 'interactive' && kioskInteractOf(d, made.constraints)?.kind === 'fill-cells';
                if (!typed(kind) && !cells) continue;
                const keys: readonly string[] = d.keys?.(made.constraints) ?? [];
                // A card cell is written as a number field (writeCell); a typed field per its kind.
                const fieldKind: KioskInput = cells ? 'number' : kind;
                const answers = cells ? Object.values(rightCells(leaf.typeId, d, made.exercise, made.constraints)) : d.answerOf(made.exercise, made.constraints);
                const comma = (a: string) => (keys.includes(',') ? a.replace('.', ',') : a);
                // A spelling with a character the keypad lacks (2.5 on a breuk keypad) is another field's business.
                const typeable = (a: string) => [...comma(a)].every(ch => (ch >= '0' && ch <= '9') || keys.includes(ch));
                for (const field of answers) {
                    for (const a of field.split('|').filter(x => x !== '' && typeable(x))) {
                        if (a.length > longest.length) longest = a;
                        if (sanitizeAnswer(a, keys, fieldKind) !== comma(a)) cut.push(`${JSON.stringify(c)} seed ${seed}: '${a}' → '${sanitizeAnswer(a, keys, fieldKind)}'`);
                    }
                }
            }
        }
        expect(cut.slice(0, 5), `${cut.length} answers cut`).toEqual([]);
        expect(longest.length, longest).toBeGreaterThan(0);
    });
});

describe('the field cap', () => {
    beforeEach(resetKiosk);
    const st = () => useOefenStore.getState();

    test('per keys, never per exercise', () => {
        expect(capOf('number', [])).toBe(12);
        expect(capOf('number', [','])).toBe(12);
        expect(capOf('number', ['/', ' '])).toBe(24);
        expect(capOf('missing-operand', ['/'])).toBe(24);
        expect(capOf('text', [])).toBe(24);
        expect(capOf('time', [])).toBe(2);
    });

    test('the report case: 19600/15394639 types whole', () => {
        expect(sanitizeAnswer('19600/15394639', ['/', ' '])).toBe('19600/15394639');
    });

    test('a 13th digit is refused by the keypad, a paste is clamped', () => {
        st().load(hashOf(starterSessie({ types: [{ typeId: 'hr-std-optellen', leafId: 'hr-std-optellen-nat', label: 'Optellen', constraints: { numberType: 'natural', maxGetal: 100 }, weight: 1 }] })));
        st().start();
        for (const k of '123456789012') st().press(k);
        expect(st().input[0]).toBe('123456789012');
        st().press('3');
        expect(st().input[0]).toBe('123456789012');
        st().press('back');
        expect(st().input[0]).toBe('12345678901');
        st().setField(0, '99999999999999');
        expect(st().input[0]).toBe('999999999999');
    });

    test('a breuk field takes 24 characters from the keypad', () => {
        st().load(hashOf(starterSessie({ types: [{ typeId: 'hr-std-delen', leafId: 'hr-std-delen-rat', label: 'Delen', constraints: { numberType: 'rational' }, weight: 1 }] })));
        st().start();
        for (const k of '19600/15394639') st().press(k);
        expect(st().input[0]).toBe('19600/15394639');
        for (const k of '1234567890') st().press(k);
        expect(st().input[0]).toHaveLength(24);
        st().press('1');
        expect(st().input[0]).toHaveLength(24);
    });
});
