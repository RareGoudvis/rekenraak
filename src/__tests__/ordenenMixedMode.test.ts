import { describe, test, expect, afterEach } from 'vitest';
import type { OrdenenExercise, Fraction } from '../services/math/types';
import { makeBlock } from './helpers/makeBlock';
import { REGISTRY } from '../config/exerciseRegistry';
import { ordenenMixedMode } from '../services/ordenen/ordenenGenerator';
import { ordenenMaxChars } from '../services/layout/blockLayout';

// Ordenen rat "Gemengde getallen: Geen / Ook / Alleen" (owner call 2026-10-28). A sheet saved
// with the old toggle has only allowMixed: true = alleen, false/absent = geen.

function mulberry32(a: number) {
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const nativeRandom = Math.random;
afterEach(() => { Math.random = nativeRandom; });

function sets(c: Record<string, unknown>, seed = 7): Fraction[][] {
    Math.random = mulberry32(seed);
    const block = makeBlock('ordenen', { constraints: { numberType: 'rational', count: 4, ...c }, block: { numberOfExercises: 30 } });
    return (REGISTRY.ordenen.generate(block) as OrdenenExercise[]).map(e => e.values as Fraction[]);
}
const isMixed = (f: Fraction) => (f.whole ?? 0) > 0;

describe('ordenen gemengde getallen tri-state', () => {
    test('allowMixed back-compat: true reads as alleen, false / absent as geen', () => {
        expect(ordenenMixedMode({ allowMixed: true })).toBe('all');
        expect(ordenenMixedMode({ allowMixed: false })).toBe('none');
        expect(ordenenMixedMode({})).toBe('none');
        expect(ordenenMixedMode({ allowMixed: true, mixedMode: 'some' })).toBe('some');
    });

    test('geen: no whole parts', () => {
        for (const s of sets({ mixedMode: 'none' })) expect(s.some(isMixed)).toBe(false);
    });

    test('alleen: every value is a gemengd getal', () => {
        for (const s of sets({ mixedMode: 'all' })) expect(s.every(isMixed)).toBe(true);
    });

    test('ook: every set mixes gemengde getallen and plain breuken', () => {
        for (const s of sets({ mixedMode: 'some' })) {
            expect(s.some(isMixed)).toBe(true);
            expect(s.some(f => !isMixed(f))).toBe(true);
        }
    });

    test('an old sheet regenerates exactly as before (same random calls)', () => {
        expect(sets({ allowMixed: true }, 3)).toEqual(sets({ allowMixed: true, mixedMode: 'all' }, 3));
        expect(sets({ allowMixed: false }, 3)).toEqual(sets({ mixedMode: 'none' }, 3));
    });

    test('the width estimate counts a whole part under ook', () => {
        const plain = ordenenMaxChars('ordenen', { numberType: 'rational', maxDenominator: 10 });
        expect(ordenenMaxChars('ordenen', { numberType: 'rational', maxDenominator: 10, mixedMode: 'some' })).toBe(plain + 2);
        expect(ordenenMaxChars('ordenen', { numberType: 'rational', maxDenominator: 10, allowMixed: true })).toBe(plain + 2);
    });
});
