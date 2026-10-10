// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import type { HerleidingExercise } from '../services/math/types';
import type { OefenType } from '../services/oefenen/types';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInputOf, kioskSupports } from '../services/oefenen/kiosk';
import { emptyStats, expectedText, recordAnswer } from '../services/oefenen/stats';
import { currentInput, useOefenStore } from '../oefenen/useOefenStore';
import OefenApp from '../oefenen/OefenApp';
import { flattenLeaves } from '../config/appstructure';
import { makeDraftBlock } from '../components/curriculum/draftBlock';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';

// Herleidingen with "eenheden zelf schrijven" (writeUnits, owner 2026-10-09): the pupil types the
// number on the keypad and taps the unit from a row of buttons holding the measure's WHOLE ladder
// (never just the exercise's units, which would hint at the answer). It counts by VALUE: for
// 1 m 20 cm, 120 cm = 12 dm = 1,2 m all count; the given quantity copied back does not.

const d = kioskFor('herleidingen')!;
const ex = (from: Array<[number, string]>, to: Array<[number, string]>, format: HerleidingExercise['format'] = 'enkel-getal'): HerleidingExercise => ({
    id: 'h', format, blank: 'number', isManuallyEdited: false,
    fromParts: from.map(([value, key]) => ({ value, key })), toParts: to.map(([value, key]) => ({ value, key })),
});
const LENGTE = { measure: 'lengte', units: ['m', 'dm', 'cm', 'mm'], writeUnits: true };
const ok = (e: HerleidingExercise, c: Record<string, unknown>, n: string, u: string) => checkAnswer(d, e, c, [n, u]);

describe('descriptor', () => {
    test('writeUnits is served: a number blank becomes number+unit, a unit blank stays a choice', () => {
        expect(kioskSupports('herleidingen', { writeUnits: true })).toBe(true);
        expect(kioskInputOf(d, ex([[3, 'm']], [[300, 'cm']]), LENGTE)).toBe('number+unit');
        expect(kioskInputOf(d, { ...ex([[3, 'm']], [[300, 'cm']]), blank: 'unit' }, LENGTE)).toBe('choice');
        expect(kioskInputOf(d, ex([[3, 'm']], [[300, 'cm']]), { ...LENGTE, writeUnits: false })).toBe('number');
    });

    test.each<[string, string[]]>([
        ['lengte', ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm']],
        ['inhoud', ['kl', 'hl', 'dal', 'l', 'dl', 'cl', 'ml']],
        ['massa', ['kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg']],
        ['oppervlakte', ['km²', 'hm²', 'ha', 'dam²', 'a', 'm²', 'ca', 'dm²', 'cm²', 'mm²']],
    ])('%s: the unit row is the whole ladder, whatever units the teacher ticked', (measure, ladder) => {
        const c = { measure, units: ladder.slice(2, 4), writeUnits: true };
        expect(d.choicesOf!(ex([[3, ladder[2]]], [[30, ladder[3]]]), c)).toEqual(ladder);
    });

    test('answerOf is [number, unit]; a compound answer reads in its largest unit', () => {
        expect(d.answerOf(ex([[3, 'm']], [[300, 'cm']]), LENGTE)).toEqual(['300', 'cm']);
        expect(d.answerOf(ex([[235, 'cm']], [[2, 'm'], [35, 'cm']], 'enkel-samengesteld'), LENGTE)).toEqual(['2,35', 'm']);
        expect(d.keys!(LENGTE)).toEqual([',']);
    });
});

describe('check: the value counts, exact', () => {
    const e = ex([[1, 'm'], [20, 'cm']], [[120, 'cm']], 'samengesteld-enkel');
    test('1 m 20 cm = 120 cm = 12 dm = 1,2 m = 1200 mm', () => {
        for (const [n, u] of [['120', 'cm'], ['12', 'dm'], ['1,2', 'm'], ['1.20', 'm'], ['1200', 'mm'], ['0,0012', 'km'], ['0120', 'cm']]) expect(ok(e, LENGTE, n, u), `${n} ${u}`).toBe(true);
    });
    test('another value, a missing or unknown unit, or no number is wrong', () => {
        for (const [n, u] of [['121', 'cm'], ['12', 'cm'], ['1,2', 'dm'], ['120', ''], ['120', 'l'], ['', 'cm'], ['abc', 'cm']]) expect(ok(e, LENGTE, n, u), `${n} ${u}`).toBe(false);
        expect(checkAnswer(d, e, LENGTE, '120')).toBe(false);
    });
    test('the given quantity copied back is not a herleiding', () => {
        const single = ex([[235, 'cm']], [[2, 'm'], [35, 'cm']], 'enkel-samengesteld');
        expect(ok(single, LENGTE, '235', 'cm')).toBe(false);
        expect(ok(single, LENGTE, '2,35', 'm')).toBe(true);
        expect(ok(single, LENGTE, '2350', 'mm')).toBe(true);
    });
    test('oppervlakte: are units are their squares (1 ha = 1 hm²), big factors stay exact', () => {
        const opp = { measure: 'oppervlakte', units: ['m²', 'a', 'ha'], writeUnits: true };
        const e2 = ex([[3, 'ha']], [[300, 'a']]);
        expect(ok(e2, opp, '300', 'a')).toBe(true);
        expect(ok(e2, opp, '300', 'dam²')).toBe(true);
        expect(ok(e2, opp, '3', 'hm²')).toBe(true);
        expect(ok(e2, opp, '30000', 'm²')).toBe(true);
        expect(ok(e2, opp, '300000000', 'cm²')).toBe(true);
        expect(ok(e2, opp, '30000000000', 'mm²')).toBe(true);
        expect(ok(e2, opp, '30000000001', 'mm²')).toBe(false);
        expect(ok(e2, opp, '0,03', 'km²')).toBe(true);
    });
    test('stats read "120 cm"', () => {
        const row = recordAnswer(emptyStats({ types: [] } as never, 0), 0, 'herleidingen', e, ['12', 'cm'], false, 1, LENGTE, 1).perType[0].errors[0];
        expect(row.given).toBe('12 cm');
        expect(row.expected).toBe('120 cm');
        expect(expectedText(d, e, LENGTE)).toBe('120 cm');
        expect(row.exercise).toBe('1 m 20 cm = ? (getal en eenheid)');
    });
});

function writeUnitsType(): OefenType {
    const leaf = flattenLeaves().find(l => l.id === 'herleidingen-lengte')!;
    const constraints = makeDraftBlock(leaf.typeId, { ...leaf.defaultConstraints, writeUnits: true, formats: ['enkel-getal'] }).constraints as Record<string, unknown>;
    return { typeId: leaf.typeId, leafId: leaf.id, label: 'Herleiden', constraints, limit: 3, weight: 1 };
}

describe('kiosk: keypad number + unit buttons', () => {
    const st = () => useOefenStore.getState();
    beforeEach(resetKiosk);
    afterEach(cleanup);

    test('store: two fields, the keypad types the number, a unit button fills the unit', () => {
        st().load(hashOf(starterSessie({ types: [writeUnitsType()] })));
        st().start();
        const info = currentInput(st().sessie, st().shown)!;
        expect(info.kind).toBe('number+unit');
        expect(info.choices).toEqual(['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm']);
        expect(info.keys).toEqual([',']);
        expect(st().input).toEqual(['', '']);
        const [n, u] = d.answerOf(st().shown!.exercise, st().shown!.constraints);
        for (const ch of n) st().press(ch);
        expect(st().input).toEqual([n, '']);
        st().answer();
        expect(st().phase).toBe('exercise');
        st().choose(u);
        expect(st().input).toEqual([n, u]);
        st().choose('nope');
        expect(st().input).toEqual([n, u]);
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('screen: a number field, the unit row as buttons (no select), the keypad', () => {
        st().load(hashOf(starterSessie({ types: [writeUnitsType()] })));
        st().start();
        const { container } = render(<OefenApp />);
        expect(container.querySelector('select')).toBeNull();
        const group = screen.getByRole('radiogroup', { name: 'Kies de eenheid' });
        const units = [...group.querySelectorAll('button')].map(b => b.textContent);
        expect(units).toEqual(['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm']);
        expect(screen.getByRole('group', { name: 'Cijfers' })).toBeTruthy();
        const [n, u] = d.answerOf(st().shown!.exercise, st().shown!.constraints);
        for (const ch of n) fireEvent.click(screen.getByRole('button', { name: ch === ',' ? ',' : ch }));
        const check = screen.getByRole('button', { name: 'Controleer' }) as HTMLButtonElement;
        expect(check.disabled).toBe(true);
        fireEvent.click(screen.getByRole('radio', { name: u }));
        expect(screen.getByRole('radio', { name: u }).getAttribute('aria-checked')).toBe('true');
        expect(check.disabled).toBe(false);
        fireEvent.click(check);
        expect(st().lastCorrect).toBe(true);
    });
});
