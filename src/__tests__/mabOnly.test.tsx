// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { mabOnlyApplies, mabOnlyPlan, mabPlan, type MabPicture, type MabPieceState } from '../services/steps/mabSteps';
import { workedSteps } from '../services/math/workedSteps';
import { mabOnlyFor, stepsFor, stepsOrMabFor } from '../services/stepsAvailability';
import { stepsVisualFor } from '../components/steps/stepsVisuals';
import { listOefenLeaves, rowMayHaveMabOnly, rowMayHaveSteps, seedRowConstraints } from '../components/oefenen/oefenBuild';
import { TUTOR_HASH_PREFIX } from '../services/oefenen/tutorPayload';
import { packText } from '../services/oefenen/packText';
import StepsPanel from '../oefenen/kiosk/StepsPanel';
import TutorApp from '../tutor/TutorApp';
import type { Equation } from '../services/math/types';

// MAB by itself for whole + / − sums without worked steps (3 + 4, 7 − 3), leerjaar 1–3, MAB on, never on a phone.

afterEach(() => { cleanup(); window.location.hash = ''; localStorage.clear(); vi.restoreAllMocks(); });

const eq = (a: number, op: '+' | '-', b: number, extra: Partial<Equation> = {}): Equation =>
    ({ id: 'e', operands: [a, b], operator: op, answer: op === '+' ? a + b : a - b, isManuallyEdited: false, ...extra });
const count = (pic: MabPicture, state: MabPieceState, place: number) => pic.clusters.reduce((s, c) => s + c.pieces[place].filter(x => x === state).length, 0);
const sizes = (pic: MabPicture) => pic.clusters[0].pieces.map(p => p.length);
const LJ2 = { grade: 2 };

describe('mabOnlyPlan: the stages', () => {
    it('the sums have no worked steps, so today they show nothing', () => {
        for (const e of [eq(3, '+', 4), eq(5, '+', 5), eq(8, '+', 2), eq(7, '-', 3)]) expect(workedSteps(e)).toBeNull();
    });

    it('3 + 4: three E, then four E join (heavy), then seven E', () => {
        const plan = mabOnlyPlan(eq(3, '+', 4))!;
        expect(sizes(plan.initial)).toEqual([3, 0, 0, 0]);
        expect(count(plan.initial, 'have', 0)).toBe(3);
        expect(plan.stages).toHaveLength(2);
        const [joined, answer] = plan.stages as MabPicture[];
        expect(count(joined, 'have', 0)).toBe(3);
        expect(count(joined, 'now', 0)).toBe(4);
        expect(joined.captions).toEqual([]);
        expect(sizes(answer)).toEqual([7, 0, 0, 0]);
        expect(count(answer, 'have', 0)).toBe(7);
    });

    it('5 + 5 and 8 + 2: the join, then 10 E wordt 1 T, then one T', () => {
        for (const [a, b] of [[5, 5], [8, 2]]) {
            const plan = mabOnlyPlan(eq(a, '+', b))!;
            expect(plan.stages).toHaveLength(3);
            const [joined, exchange, answer] = plan.stages as MabPicture[];
            expect(count(joined, 'now', 0)).toBe(b);
            expect(joined.clusters[0].rings).toBeUndefined();
            expect(exchange.captions).toEqual(['10 E wordt 1 T']);
            expect(exchange.clusters[0].rings).toEqual([{ place: 0, from: 0 }]);
            expect(count(exchange, 'gain', 1)).toBe(1);
            expect(sizes(answer)).toEqual([0, 1, 0, 0]);
        }
    });

    it('7 − 3: seven E, then three crossed out, then four E', () => {
        const plan = mabOnlyPlan(eq(7, '-', 3))!;
        expect(sizes(plan.initial)).toEqual([7, 0, 0, 0]);
        expect(plan.stages).toHaveLength(2);
        const [take, answer] = plan.stages as MabPicture[];
        expect(count(take, 'gone', 0)).toBe(3);
        expect(count(take, 'have', 0)).toBe(4);
        expect(sizes(answer)).toEqual([4, 0, 0, 0]);
    });

    it('50 − 7: one T opened into 10 E first, then seven crossed out, then 4 T and 3 E', () => {
        expect(workedSteps(eq(50, '-', 7))).toBeNull();
        const [opened, take, answer] = mabOnlyPlan(eq(50, '-', 7))!.stages as MabPicture[];
        expect(opened.captions).toEqual(['1 T wordt 10 E']);
        expect(count(opened, 'gone', 0)).toBe(0);
        expect(count(opened, 'ghost', 1)).toBe(1);
        expect(count(take, 'gone', 0)).toBe(7);
        expect(sizes(answer)).toEqual([3, 4, 0, 0]);
    });

    it('mabPlan with no lines is the picture alone; with lines it is unchanged', () => {
        expect(mabPlan(eq(3, '+', 4), [])).toEqual(mabOnlyPlan(eq(3, '+', 4)));
        const e = eq(475, '+', 368);
        expect(mabPlan(e, workedSteps(e)!)!.initial).not.toEqual(mabOnlyPlan(e)!.initial);
    });

    it('never for ×, :, kommagetallen, puntoefeningen, a preset, a negative answer or above 1000', () => {
        expect(mabOnlyPlan({ ...eq(3, '+', 4), operator: 'x', answer: 12 })).toBeNull();
        expect(mabOnlyPlan(eq(0.3, '+', 0.4))).toBeNull();
        expect(mabOnlyPlan(eq(3, '-', 7))).toBeNull();
        expect(mabOnlyPlan(eq(900, '+', 200))).toBeNull();
        expect(mabOnlyPlan(eq(3, '+', 4, { missingIndex: 1 }))).toBeNull();
        expect(mabOnlyApplies(eq(3, '+', 4), { equationType: 'puntoefening' })).toBe(false);
        expect(mabOnlyApplies(eq(3, '+', 4), { preset: 'compenseren' })).toBe(false);
        expect(mabOnlyApplies(eq(3, '+', 4, { variant: '+:compenseren' }))).toBe(false);
        expect(mabOnlyApplies(eq(3, '+', 4, { variant: '+' }))).toBe(true);
    });
});

describe('who gets it', () => {
    it('leerjaar 1–3 with MAB on: [] (the picture alone); leerjaar 4+, unknown, MAB off: nothing, as today', () => {
        expect(stepsOrMabFor('hr-std-optellen', eq(3, '+', 4), {}, LJ2)).toEqual([]);
        expect(stepsOrMabFor('hr-std-aftrekken', eq(7, '-', 3), {}, { grade: 1 })).toEqual([]);
        expect(stepsOrMabFor('hr-std-gemengd', eq(5, '+', 5), {}, { grade: 3 })).toEqual([]);
        expect(stepsOrMabFor('hr-std-optellen', eq(3, '+', 4), {}, { grade: 4 })).toBeNull();
        expect(stepsOrMabFor('hr-std-optellen', eq(3, '+', 4), {}, {})).toBeNull();
        expect(stepsOrMabFor('hr-std-optellen', eq(3, '+', 4), {}, { grade: 2, noMab: true })).toBeNull();
        expect(stepsOrMabFor('hr-std-optellen', eq(3, '+', 4), { preset: 'tienvoud' }, LJ2)).toBeNull();
    });

    it('never on a phone', () => {
        vi.spyOn(window, 'matchMedia').mockImplementation(q => ({ matches: true, media: q } as MediaQueryList));
        expect(mabOnlyFor('hr-std-optellen', eq(3, '+', 4), {}, LJ2)).toBeNull();
    });

    it('sums with steps keep exactly their steps; the answer key (stepsFor) never changes', () => {
        for (const e of [eq(475, '+', 368), eq(8, '+', 5), eq(53, '-', 7), eq(14, '+', 3)]) {
            expect(stepsOrMabFor('hr-std-optellen', e, {}, LJ2)).toEqual(stepsFor('hr-std-optellen', e, {}));
        }
        expect(stepsFor('hr-std-optellen', eq(3, '+', 4), {})).toBeNull();
    });

    it('the visual counts its stages only when it stands alone', () => {
        expect(stepsVisualFor('hr-std-optellen', eq(5, '+', 5), [], 'kiosk', LJ2)!.stages).toBe(3);
        expect(stepsVisualFor('hr-std-optellen', eq(3, '+', 4), [], 'kiosk', LJ2)!.slot).toBe('card');
        const e = eq(475, '+', 368);
        expect(stepsVisualFor('hr-std-optellen', e, workedSteps(e)!, 'kiosk', LJ2)!.stages).toBeUndefined();
        expect(stepsVisualFor('hr-std-optellen', eq(3, '+', 4), [], 'kiosk', { grade: 5 })).toBeUndefined();
    });

    it('the Oefenmodus builder: a leerjaar 1 row of facts counts as help, rows with steps stay as they were', () => {
        const leaf = listOefenLeaves().find(l => l.id === 'hr-std-optellen-nat')!;
        const facts = { leaf, constraints: { ...seedRowConstraints(leaf, 1), maxGetal: 10 } };
        expect(rowMayHaveMabOnly(facts)).toBe(true);
        expect(rowMayHaveSteps({ leaf, constraints: seedRowConstraints(leaf, 3) })).toBe(true);
        const none = listOefenLeaves().find(l => l.typeId === 'klok-kloklezen')!;
        expect(rowMayHaveMabOnly({ leaf: none, constraints: seedRowConstraints(none, 1) })).toBe(false);
    });
});

describe('the panels', () => {
    it('StepsPanel: no lines, the blocks stage by stage; Alle stappen jumps to the answer', () => {
        const e = eq(3, '+', 4);
        const visual = stepsVisualFor('hr-std-optellen', e, [], 'tutor', LJ2)!;
        const { container } = render(<StepsPanel lines={[]} onNext={() => {}} visual={visual} />);
        expect(screen.getByText('Fout. Wil je het zien met blokjes?')).toBeTruthy();
        fireEvent.click(screen.getByText('Toon de blokjes'));
        expect(container.querySelector('.kiosk-steps-lines')).toBeNull();
        expect(container.querySelectorAll('.sv-mab-p.is-have')).toHaveLength(3);
        fireEvent.click(screen.getByText('Toon de volgende stap'));
        expect(container.querySelectorAll('.sv-mab-p.is-now')).toHaveLength(4);
        fireEvent.click(screen.getByText('Alle stappen'));
        expect(container.querySelectorAll('.sv-mab-p.is-have')).toHaveLength(7);
        expect(container.querySelectorAll('.sv-mab-p.is-now')).toHaveLength(0);
        expect(screen.getByText('Klaar! Kijk nog eens naar je antwoord.')).toBeTruthy();
        expect(screen.queryByText('Alle stappen')).toBeNull();
    });

    it('StepsPanel in a card slot tells the Kiosk the stage', () => {
        const visual = stepsVisualFor('hr-std-aftrekken', eq(7, '-', 3), [], 'kiosk', LJ2)!;
        const seen: (number | null)[] = [];
        render(<StepsPanel lines={[]} onNext={() => {}} visual={visual} onVisual={n => seen.push(n)} startOpen />);
        fireEvent.click(screen.getByText('Toon de volgende stap'));
        fireEvent.click(screen.getByText('Toon de volgende stap'));
        expect(seen.filter(n => n !== null)).toEqual([0, 1, 2]);
        expect(screen.queryByText('Toon de volgende stap')).toBeNull();
    });

    it('the stappenhulp: a fact opens the blocks for leerjaar 2, stays greyed for leerjaar 4', () => {
        const page = (grade: number) => TUTOR_HASH_PREFIX + packText(JSON.stringify([1, [[1, '', null, [[3, 4, '+']]]], grade]));
        window.location.hash = page(2);
        const { container, unmount } = render(<TutorApp />);
        fireEvent.click(screen.getByRole('button', { name: /3/ }));
        expect(container.querySelectorAll('.sv-mab-p.is-have')).toHaveLength(3);
        fireEvent.click(screen.getByRole('button', { name: 'Toon de eerste stap' }));
        expect(container.querySelectorAll('.sv-mab-p.is-now')).toHaveLength(4);
        fireEvent.click(screen.getByRole('button', { name: 'Alle stappen' }));
        expect(container.querySelectorAll('.sv-mab-p.is-have')).toHaveLength(7);
        expect(container.querySelector('.tutor-lines')).toBeNull();
        unmount();
        window.location.hash = page(4);
        render(<TutorApp />);
        expect(screen.getByText('Hiervoor zijn nog geen stappen')).toBeTruthy();
    });
});
