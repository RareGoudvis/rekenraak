// @vitest-environment jsdom
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { makeBlock } from './helpers/makeBlock';
import type { ConfigComponent } from '../config/exerciseUI';
import type { Equation, FractionExercise, MathBlock } from '../services/math/types';

// The inspector groups a family's rows by what they change: Config = what is practised,
// StyleConfig = how it stands on the sheet, SolutionConfig = only the answer key.
// These pin which slot each moved row now lives in.

afterEach(cleanup);
class NoopObserver { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal('IntersectionObserver', NoopObserver);

const textOf = (Comp: ConfigComponent | undefined, block: MathBlock): string => {
    if (!Comp) return '';
    const { container, unmount } = render(<Comp block={block} />);
    const t = container.textContent ?? '';
    unmount();
    return t;
};

const withExercises = (block: MathBlock, list: unknown[]): MathBlock => {
    (block as unknown as Record<string, unknown>)[REGISTRY[block.typeId].exerciseField] = list;
    return block;
};

describe('verbetersleutel rows live in SolutionConfig', () => {
    const eq = { id: 'a', operands: [475, 368], operator: '+', answer: 843, isManuallyEdited: false } as Equation;

    test.each(['hr-std-optellen', 'hr-std-gemengd'])('%s: steps row out of StyleConfig, into SolutionConfig', (typeId) => {
        const block = withExercises(makeBlock(typeId, { id: 'b', constraints: { maxGetal: 1000 } }), [eq]);
        const ui = EXERCISE_UI[typeId];
        expect(textOf(ui.StyleConfig, block)).not.toContain('Stappen in de verbetersleutel');
        expect(textOf(ui.SolutionConfig, block)).toContain('Stappen in de verbetersleutel');
    });

    test('hoofdrekenen without steps on the block: SolutionConfig renders nothing', () => {
        const block = withExercises(makeBlock('hr-std-optellen', { id: 'b' }), []);
        expect(textOf(EXERCISE_UI['hr-std-optellen'].SolutionConfig, block)).toBe('');
    });

    test('breuken hoeveelheid zonder hulp: steps row in SolutionConfig only', () => {
        const ex: FractionExercise = { id: 'x', subType: 'hoeveelheid', numerator: 2, denominator: 3, total: 12, objectShape: 'circle', isManuallyEdited: false };
        const ui = EXERCISE_UI['breuken'];
        const on = withExercises(makeBlock('breuken', { id: 'b', leafId: 'breuken-hoeveelheid', constraints: { subType: 'hoeveelheid', answerFormat: 'zonder-hulp' } }), [ex]);
        expect(textOf(ui.StyleConfig, on)).not.toContain('Stappen in de verbetersleutel');
        expect(textOf(ui.SolutionConfig, on)).toContain('Stappen in de verbetersleutel');
        const metHulp = withExercises(makeBlock('breuken', { id: 'b', leafId: 'breuken-hoeveelheid', constraints: { subType: 'hoeveelheid', answerFormat: 'met-hulp' } }), [ex]);
        expect(textOf(ui.SolutionConfig, metHulp)).toBe('');
    });
});

// [typeId, constraints, the row's label] — the row left Config for StyleConfig.
const MOVED: [string, Record<string, unknown>, string][] = [
    ['breuken', { subType: 'kleuren', shapes: ['circle'] }, 'Vaste grootte'],
    ['geld-herkennen', {}, 'Geldlayout'],
    ['splitsen', { layout: 'basic' }, 'Rijen per box'],
    ['splitsen', { layout: 'basic' }, 'Rijhoogte'],
    ['temperatuur', { variant: 'kleuren' }, 'Per rij'],
    ['weegschaal', {}, 'Weegschalen per rij'],
    ['weegschaal', {}, 'Grootte wijzerplaat'],
    ['vormleer-hoeken', { kind: 'hoek', mode: 'herkennen' }, 'Figuren per rij'],
    ['deelbaarheid-kleuren', { viewMode: 'strip', rasterVorm: 'lijn' }, 'Getallen per rij'],
    ['deelbaarheid-kleuren', { viewMode: 'strip', rasterVorm: 'rechthoek' }, 'Kolommen'],
    ['even-oneven', { subType: 'rooster' }, 'Getallen per rij'],
    ['schattend', {}, 'Antwoordlijn'],
];

describe('sheet-layout rows live in StyleConfig', () => {
    test.each(MOVED)('%s %j: %s', (typeId, constraints, label) => {
        const block = makeBlock(typeId, { id: 'b', constraints });
        const ui = EXERCISE_UI[typeId];
        expect(textOf(ui.Config, block)).not.toContain(label);
        expect(textOf(ui.StyleConfig, block)).toContain(label);
    });

    test('the conditions moved along: no row where the old Config showed none', () => {
        expect(textOf(EXERCISE_UI['temperatuur'].StyleConfig, makeBlock('temperatuur', { id: 'b', constraints: { variant: 'verschil' } }))).toBe('');
        expect(textOf(EXERCISE_UI['splitsen'].StyleConfig, makeBlock('splitsen', { id: 'b', constraints: { layout: 'splitsboom' } }))).toBe('');
        expect(textOf(EXERCISE_UI['vormleer-punt-lijn'].StyleConfig, makeBlock('vormleer-punt-lijn', { id: 'b', constraints: { kind: 'punt-lijn' } }))).toBe('');
        expect(textOf(EXERCISE_UI['geld-tekenen'].StyleConfig, makeBlock('geld-tekenen', { id: 'b' }))).not.toContain('Geldlayout');
    });
});
