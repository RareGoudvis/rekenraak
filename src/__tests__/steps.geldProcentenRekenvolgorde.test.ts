import { describe, expect, it } from 'vitest';
import { REGISTRY } from '../config/exerciseRegistry';
import { codecForType } from '../services/steps/tutorCodecs';
import { stepLineText, stepText, type StepLine } from '../services/math/workedSteps';
import { geldTeruggevenSteps } from '../services/steps/geldTeruggevenSteps';
import { procentenSteps } from '../services/steps/procentenSteps';
import { rekenvolgordeSteps, rekenvolgordeValue } from '../services/steps/rekenvolgordeSteps';
import { generateGeldTeruggevenExercises } from '../services/geld/geldGenerator';
import { generateProcentExercises } from '../services/procenten/procentenGenerator';
import { generateRekenvolgordeExercises } from '../services/rekenvolgorde/rekenvolgordeGenerator';
import { makeBlock } from './helpers/makeBlock';
import type { GeldTeruggevenExercise, MathBlock, ProcentExercise, RekenvolgordeExercise } from '../services/math/types';

const text = (lines: StepLine[] | null) => (lines ?? []).map(l => stepLineText(l));
const geld = (price: number, pay: number): GeldTeruggevenExercise => {
    const wp = Math.ceil(price / 100) * 100;
    return { id: 'g', priceCents: price, payWithCents: pay, changeCents: pay - price, waypointCents: wp, step1Cents: wp - price, step2Cents: pay - wp, isManuallyEdited: false };
};
const pct = (percent: number, base: number): ProcentExercise => ({ id: 'p', percent, base, answer: base * percent / 100, isManuallyEdited: false });
const rv = (tokens: (number | string)[], answer: number): RekenvolgordeExercise => ({ id: 'r', tokens, answer, firstStep: 0, isManuallyEdited: false });
const euros = (c: number) => `${Math.floor(c / 100)}${c % 100 ? ',' + String(c % 100).padStart(2, '0') : ''}`;

describe('geld teruggeven steps', () => {
    it('goes up to ,50, then the round euro, then the euros (owner example)', () => {
        expect(text(geldTeruggevenSteps(geld(340, 1000)))).toEqual([
            '3,40 → 3,50: 0,10', '3,50 → 4: 0,50', '4 → 10: 6', 'samen: 0,10 + 0,50 + 6 = 6,60',
        ]);
    });
    it('skips the ,50 stop above ,50 and the euro jump when paying the next euro', () => {
        expect(text(geldTeruggevenSteps(geld(375, 1000)))).toEqual(['3,75 → 4: 0,25', '4 → 10: 6', 'samen: 0,25 + 6 = 6,25']);
        expect(text(geldTeruggevenSteps(geld(45, 100)))).toEqual(['0,45 → 0,50: 0,05', '0,50 → 1: 0,50', 'samen: 0,05 + 0,50 = 0,55']);
        expect(text(geldTeruggevenSteps(geld(300, 1000)))).toEqual(['3 → 10: 7']);
    });
    it('is null without a payable price', () => {
        expect(geldTeruggevenSteps(geld(1000, 1000))).toBeNull();
        expect(geldTeruggevenSteps(undefined)).toBeNull();
    });
    it('every generated exercise adds up to the change', () => {
        const items = generateGeldTeruggevenExercises({ ...makeBlock('geld-teruggeven'), numberOfExercises: 30 } as MathBlock);
        for (const ex of items) {
            const lines = geldTeruggevenSteps(ex)!;
            expect(lines).not.toBeNull();
            const last = stepLineText(lines[lines.length - 1]);
            expect(last.endsWith(`${lines.length === 1 ? ': ' : '= '}${euros(ex.changeCents)}`)).toBe(true);
        }
    });
});

describe('rekenvolgorde steps', () => {
    it('works haakjes first, then × and :, then + and − (one operation per line)', () => {
        const lines = rekenvolgordeSteps(rv(['(', 4, '+', 2, ')', 'x', 3], 18))!;
        expect(text(lines)).toEqual(['= 6 × 3', '= 18', 'Dus: (4 + 2) × 3 = 18']);
        expect(lines[0].question).toBe('Wat reken je nu uit?');
        expect(lines[0].hint).toBe('Haakjes eerst.');
        expect(lines[2].question).toBeUndefined();
    });
    it('× and : go before + and −, otherwise left to right', () => {
        const a = rekenvolgordeSteps(rv([4, '+', 2, 'x', 3], 10))!;
        expect(a.slice(0, -1).map(l => stepText(l.tokens))).toEqual(['4 + 6', '10']);
        expect(a[0].hint).toBe('× en : gaan voor + en −.');
        const b = rekenvolgordeSteps(rv([20, '-', 5, '+', 3], 18))!;
        expect(b.slice(0, -1).map(l => stepText(l.tokens))).toEqual(['15 + 3', '18']);
        expect(b[0].hint).toBe('Van links naar rechts.');
        const c = rekenvolgordeSteps(rv([24, ':', 4, 'x', 2], 12))!;
        expect(c.slice(0, -1).map(l => stepText(l.tokens))).toEqual(['6 × 2', '12']);
    });
    it('keeps the bracket while it still holds an operation', () => {
        const lines = rekenvolgordeSteps(rv([2, 'x', '(', 3, '+', 4, 'x', 2, ')'], 22))!;
        expect(lines.slice(0, -1).map(l => stepText(l.tokens))).toEqual(['2 × (3 + 8)', '2 × 11', '22']);
    });
    it('is null when the answer or the tokens do not hold', () => {
        expect(rekenvolgordeSteps(rv([4, '+', 2, 'x', 3], 18))).toBeNull();
        expect(rekenvolgordeSteps(rv([7, ':', 2, '+', 1], 4))).toBeNull();
    });
    it('every generated exercise reaches its answer', () => {
        const block = { ...makeBlock('rekenvolgorde', { constraints: { operators: ['+', '-', 'x', ':'], haakjesMode: 'MAG', opsCount: 3, maxGetal: 100, tableLimit: 10 } }), numberOfExercises: 40 } as MathBlock;
        for (const ex of generateRekenvolgordeExercises(block)) {
            expect(rekenvolgordeValue(ex.tokens)).toBe(ex.answer);
            expect(rekenvolgordeSteps(ex)).not.toBeNull();
        }
    });
});

describe('procenten steps', () => {
    it('10 %, 50 %, 25 % and 75 % like the Op.stap examples', () => {
        expect(text(procentenSteps(pct(10, 80)))).toEqual(['10 % = 1/10', '80 : 10 = 8', '10 % van 80 = 8']);
        expect(text(procentenSteps(pct(50, 80)))).toEqual(['50 % = de helft', '80 : 2 = 40', '50 % van 80 = 40']);
        expect(text(procentenSteps(pct(25, 80)))).toEqual(['25 % = 1/4', '80 : 4 = 20', '25 % van 80 = 20']);
        expect(text(procentenSteps(pct(75, 80)))).toEqual(['75 % = 3/4', '80 : 4 = 20', '3 × 20 = 60', '75 % van 80 = 60']);
    });
    it('1 %, 5 %, 20 %, 100 % and other tientallen', () => {
        expect(text(procentenSteps(pct(1, 300)))).toEqual(['1 % = 1/100', '300 : 100 = 3', '1 % van 300 = 3']);
        expect(text(procentenSteps(pct(20, 60)))).toEqual(['20 % = 1/5', '60 : 5 = 12', '20 % van 60 = 12']);
        expect(text(procentenSteps(pct(5, 60)))).toEqual(['10 % van 60 = 60 : 10 = 6', '5 % = de helft van 10 %: 6 : 2 = 3', '5 % van 60 = 3']);
        expect(text(procentenSteps(pct(100, 70)))).toEqual(['100 % is het hele getal', '100 % van 70 = 70']);
        expect(text(procentenSteps(pct(30, 60)))).toEqual(['10 % van 60 = 60 : 10 = 6', '30 % = 3 × 10 %: 3 × 6 = 18', '30 % van 60 = 18']);
    });
    it('is null for welk-percent and shapes without a mental method', () => {
        expect(procentenSteps(pct(25, 80), { subType: 'welk-percent' })).toBeNull();
        expect(procentenSteps(pct(15, 80))).toBeNull();
        expect(procentenSteps(pct(40, 5))).toBeNull();
    });
    it('every generated nemen exercise has steps ending on its answer', () => {
        const block = { ...makeBlock('procenten', { constraints: { subType: 'nemen', percents: [1, 5, 10, 20, 25, 50, 75, 100], maxGetal: 1000, scaffold: false } }), numberOfExercises: 40 } as MathBlock;
        for (const ex of generateProcentExercises(block)) {
            const lines = procentenSteps(ex, block.constraints as Record<string, unknown>);
            expect(lines, `${ex.percent} % van ${ex.base}`).not.toBeNull();
            expect(stepLineText(lines![lines!.length - 1])).toBe(`${ex.percent} % van ${ex.base} = ${ex.answer}`);
        }
    });
});

describe('registry and tutor codecs', () => {
    it('the registry keys give the same lines as the strategies', () => {
        expect(REGISTRY['geld-teruggeven'].steps!(geld(340, 1000), {})).toEqual(geldTeruggevenSteps(geld(340, 1000)));
        expect(REGISTRY['procenten'].steps!(pct(25, 80), { subType: 'nemen' })).toEqual(procentenSteps(pct(25, 80)));
        expect(REGISTRY['rekenvolgorde'].steps!(rv([4, '+', 2, 'x', 3], 10), {})).toEqual(rekenvolgordeSteps(rv([4, '+', 2, 'x', 3], 10)));
    });
    it.each([
        ['geld-teruggeven', geld(340, 1000), {}],
        ['procenten', pct(75, 80), { subType: 'nemen' }],
        ['rekenvolgorde', rv(['(', 4, '+', 2, ')', 'x', 3], 18), {}],
    ] as const)('%s survives out, JSON, in, steps', (typeId, ex, c) => {
        const codec = codecForType(typeId)!;
        const wire = codec.out(ex, c);
        expect(wire).not.toBeNull();
        const data = codec.in(JSON.parse(JSON.stringify(wire)));
        expect(data).not.toBeNull();
        expect(codec.steps(data)).toEqual(REGISTRY[typeId].steps!(ex, c));
        expect(codec.sum(data).length).toBeGreaterThan(0);
    });
    it('codecs refuse broken data and shapes without steps', () => {
        expect(codecForType('procenten')!.out(pct(25, 80), { subType: 'welk-percent' })).toBeNull();
        expect(codecForType('procenten')!.in([25, 7])).toBeNull();
        expect(codecForType('geld-teruggeven')!.in([1000, 340])).toBeNull();
        expect(codecForType('geld-teruggeven')!.in('x')).toBeNull();
        expect(codecForType('rekenvolgorde')!.in([1, 'y', 2])).toBeNull();
        expect(codecForType('rekenvolgorde')!.in([7, ':', 2])).toBeNull();
    });
});
