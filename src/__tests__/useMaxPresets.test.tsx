// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { useMaxPresets } from '../components/configurator/useMaxPresets';
import { ConstraintScopeContext, type ConstraintScopeValue } from '../components/configurator/ConstraintScope';
import { RANGES } from '../config/numberRanges';
import { makeBlock } from './helpers/makeBlock';
import type { MathBlock } from '../services/math/types';

// The hook is the configs' only road to a max list, so it must follow every branch the
// registry takes — including a gemengd variant tab, where the plugin belongs to one operator.
function listFor(block: MathBlock, scope?: ConstraintScopeValue) {
    const wrapper = scope
        ? ({ children }: { children: ReactNode }) => (
            <ConstraintScopeContext.Provider value={scope}>{children}</ConstraintScopeContext.Provider>
        )
        : undefined;
    return renderHook(() => useMaxPresets(block), { wrapper }).result.current;
}

const tab = (id: ConstraintScopeValue['path'][1], fixedPreset: ConstraintScopeValue['fixedPreset'] = 'vrij'): ConstraintScopeValue =>
    ({ path: ['perVariant', id], hidden: ['maxGetal', 'numberType'], fixedPreset });

describe('useMaxPresets without a scope', () => {
    test.each<[string, Record<string, unknown>, readonly number[] | null]>([
        ['splitsen', { layout: 'basic' }, RANGES.splitsenBasis],
        ['splitsen', { layout: 'splitsboom' }, RANGES.splitsenBoom],
        ['splitsen', { layout: 'verliefde-harten' }, RANGES.splitsenHarten],
        ['splitsen', { layout: 'positie-tabel' }, RANGES.splitsenTabel],
        ['splitsen', { layout: 'positie-benen' }, RANGES.splitsenPositie],
        ['hr-std-optellen', { numberType: 'natural' }, RANGES.hrNatural],
        ['hr-std-optellen', { numberType: 'decimal' }, RANGES.decimal],
        ['hr-std-optellen', { numberType: 'rational' }, null],
        ['hr-std-vermenigvuldigen', { numberType: 'natural', multiplicationMode: 'tafels' }, null],
        ['hr-std-vermenigvuldigen', { numberType: 'natural', multiplicationMode: 'andere' }, RANGES.hrAndere],
        ['hr-std-delen', { numberType: 'natural', preset: 'tienvoud' }, RANGES.hrTienvoud],
        ['hr-std-gemengd', { numberType: 'decimal' }, RANGES.decimal],
        ['cijferen-delen-dec', { numberType: 'decimal' }, RANGES.cijferDecimal],
        ['deelbaarheid', { layout: 'veelvouden' }, null],
        ['klok-kloklezen', {}, null],
    ])('%s %j', (typeId, constraints, want) => {
        const range = listFor(makeBlock(typeId, { constraints }));
        expect(range?.presets ?? null).toEqual(want);
    });

    test('names the key the list belongs to', () => {
        expect(listFor(makeBlock('cijferen-optellen-nat'))?.key).toBe('maxRange');
        expect(listFor(makeBlock('mab-herkennen'))?.key).toBe('maxNumber');
        expect(listFor(makeBlock('splitsen'))?.key).toBe('maxGetal');
    });
});

describe('useMaxPresets inside a gemengd variant tab', () => {
    const gemengd = (constraints: Record<string, unknown> = {}) =>
        makeBlock('hr-std-gemengd', { constraints: { numberType: 'natural', ...constraints } });

    test('an add/sub tab reads the natural list of its operator', () => {
        expect(listFor(gemengd(), tab('+'))?.presets).toEqual(RANGES.hrNatural);
        expect(listFor(gemengd(), tab('-:compenseren', 'compenseren'))?.presets).toEqual(RANGES.hrNatural);
    });

    test('a tienvoud tab gets the tienvoud list from its fixed oefenvorm', () => {
        expect(listFor(gemengd(), tab('x:tienvoud', 'tienvoud'))?.presets).toEqual(RANGES.hrTienvoud);
        expect(listFor(gemengd(), tab(':tienvoud', 'tienvoud'))?.presets).toEqual(RANGES.hrTienvoud);
    });

    test('a × tab follows its own override bag', () => {
        expect(listFor(gemengd(), tab('x'))).toBeNull();   // tafels: no max picker
        const andere = gemengd({ perVariant: { x: { multiplicationMode: 'andere' } } });
        expect(listFor(andere, tab('x'))?.presets).toEqual(RANGES.hrAndere);
    });

    test('the shared getaltype reaches every tab', () => {
        expect(listFor(gemengd({ numberType: 'decimal' }), tab(':'))?.presets).toEqual(RANGES.decimal);
    });
});
