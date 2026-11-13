// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import type { FractionExercise } from '../services/math/types';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInputOf, kioskInteractOf } from '../services/oefenen/kiosk';
import { EMPTY_INTERACTION, groupStarted, groupTapped, groupsCleared, groupsDone, groupsEdited, type InteractionState } from '../components/viewer/ViewerInteractionContext';
import { hvGuide, hvNudge, hvReview, hvShow, hvSolution } from '../services/fractions/hoeveelheidGroups';
import { currentInput, useOefenStore, type KioskCurrent } from '../oefenen/useOefenStore';
import OefenApp from '../oefenen/OefenApp';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';

// Breuk van een hoeveelheid in the kiosk (owner design 2026-11-13): the pupil builds equal groups by
// tapping the objects, colours the teller's groups and types the answer; the two working rows are
// optional but checked when filled; a Controleer without groups or colour gets one nudge first.

const d = kioskFor('breuken')!;
const C = { subType: 'hoeveelheid' };
const ia = kioskInteractOf(d, C)!;
const ex = (t: number, n: number, g: number): FractionExercise => ({ id: 'h', subType: 'hoeveelheid', numerator: t, denominator: n, total: g, objectShape: 'circle', isManuallyEdited: false });
const E = ex(3, 4, 28);
const o = (i: number) => `o${i}`;

/** Groups of the given sizes over o0, o1, … (in order), the first `colored` of them coloured. */
function work(sizes: number[], colored: number, cells: Record<string, string> = {}): InteractionState {
    let st: InteractionState = { ...EMPTY_INTERACTION, cells };
    let at = 0;
    sizes.forEach((n, k) => {
        if (k > 0) st = groupStarted(st);
        for (let i = 0; i < n; i++) st = groupTapped(st, o(at++));
    });
    st = groupsDone(st);
    for (let k = 0; k < colored; k++) st = groupTapped(st, o(sizes.slice(0, k).reduce((a, b) => a + b, 0)));
    return st;
}
const given = (st: InteractionState) => ia.fromState(st, E, C);
const ok = (st: InteractionState) => checkAnswer(d, E, C, given(st));

describe('descriptor', () => {
    test('hoeveelheid answers on the card with cells and groups; the other breuken stay as they were', () => {
        expect(kioskInputOf(d, E, C)).toBe('interactive');
        expect(ia.kind).toBe('fill-cells');
        expect(ia.groups).toBe(true);
        expect(kioskInputOf(d, ex(3, 4, 28), { subType: 'hoeveelheid-abstract' })).toBe('number');
        expect(kioskInteractOf(d, { subType: 'kleuren' })!.kind).toBe('tap-multi');
        // The keypad starts in the answer; the rows are scratch, each with its breukvraag.
        expect(ia.cellOf!('a', E, C)).toEqual({ scratch: false, label: 'Hoeveel is 3/4 van 28?' });
        expect(ia.cellOf!('r1', E, C)).toEqual({ scratch: true, label: 'In hoeveel moet je het delen?' });
        expect(currentInput({ types: [{ typeId: 'breuken' }] } as unknown as OefenSessie, { slot: 0, exercise: E, constraints: C } as unknown as KioskCurrent)!.groups).toBe(true);
    });

    test('nothing to check until the answer is typed', () => {
        expect(given(work([7, 7, 7, 7], 3))).toBe('');
    });
});

describe('group work', () => {
    test('a tap joins the active group (the first tap starts one), a second tap takes it out', () => {
        let st = groupTapped(EMPTY_INTERACTION, o(0));
        expect(st.groups).toMatchObject({ members: [[o(0)]], active: 0, mode: 'group' });
        st = groupTapped(st, o(1));
        st = groupTapped(st, o(0));
        expect(st.groups!.members).toEqual([[o(1)]]);
        st = groupStarted(st);
        st = groupTapped(st, o(2));
        expect(st.groups!.members).toEqual([[o(1)], [o(2)]]);
        // An empty active group is reused, not stacked.
        st = groupStarted(groupStarted(st));
        expect(st.groups!.members).toHaveLength(3);
    });

    test('Klaar drops empty groups; colour mode fills or clears a whole group; editing and Opnieuw', () => {
        let st = groupTapped(groupStarted(groupTapped(EMPTY_INTERACTION, o(0))), o(1));
        st = groupStarted(st);
        st = groupsDone(st);
        expect(st.groups).toMatchObject({ members: [[o(0)], [o(1)]], mode: 'colour', active: null });
        st = groupTapped(st, o(1));
        expect(st.groups!.colored).toEqual([1]);
        // A free object does nothing while colouring.
        expect(groupTapped(st, o(9))).toBe(st);
        st = groupTapped(st, o(1));
        expect(st.groups!.colored).toEqual([]);
        st = groupsEdited(st);
        expect(st.groups).toMatchObject({ mode: 'group', active: null });
        expect(groupsCleared({ ...st, cells: { a: '5' } })).toMatchObject({ groups: undefined, cells: { a: '5' } });
    });
});

describe('check', () => {
    test('n equal groups of g/n with t coloured and the right answer: juist, rows left empty', () => {
        expect(ok(work([7, 7, 7, 7], 3, { a: '21' }))).toBe(true);
        expect(ok(work([7, 7, 7, 7], 3, { a: '21', r0: '28', r1: '4', r2: '7', r3: '3', r4: '7', r5: '21' }))).toBe(true);
        // Half a row is fine too: only filled cells count.
        expect(ok(work([7, 7, 7, 7], 3, { a: '21', r0: '28' }))).toBe(true);
    });

    test('groups of other sizes, another count or another colour count: fout', () => {
        expect(ok(work([8, 6, 7, 7], 3, { a: '21' }))).toBe(false);
        expect(ok(work([4, 4, 4, 4, 4, 4, 4], 3, { a: '21' }))).toBe(false);
        expect(ok(work([6, 6, 6, 6], 3, { a: '21' }))).toBe(false);
        expect(ok(work([7, 7, 7, 7], 2, { a: '21' }))).toBe(false);
        expect(ok(work([7, 7, 7, 7], 4, { a: '21' }))).toBe(false);
        expect(ok(work([], 0, { a: '21' }))).toBe(false);
    });

    test('a wrong filled row cell or answer: fout', () => {
        expect(ok(work([7, 7, 7, 7], 3, { a: '21', r2: '6' }))).toBe(false);
        expect(ok(work([7, 7, 7, 7], 3, { a: '21', r5: '20' }))).toBe(false);
        expect(ok(work([7, 7, 7, 7], 3, { a: '20' }))).toBe(false);
    });
});

describe('nudge, review, guide, stats', () => {
    test('nudge: groups first, then colour; none once both are there', () => {
        expect(hvNudge(given({ ...EMPTY_INTERACTION, cells: { a: '21' } }))).toBe('Maak eerst de groepjes en kleur de delen.');
        expect(hvNudge(given(work([7, 7, 7, 7], 0, { a: '21' })))).toBe('Kleur eerst de delen.');
        expect(hvNudge(given(work([8, 6, 7, 7], 1, { a: '21' })))).toBeUndefined();
    });

    test('review: one hint in order (sizes, count, all in a group, colour, answer) and every wrong filled cell marked', () => {
        const r = (st: InteractionState) => hvReview(given(st), E);
        expect(r(work([8, 6, 7, 7], 3, { a: '21' })).hint).toBe('Zijn alle groepjes even groot?');
        expect(r(work([4, 4, 4, 4, 4, 4, 4], 3, { a: '21' })).hint).toBe('Hoeveel groepjes heb je nodig? Kijk naar de noemer.');
        expect(r(work([6, 6, 6, 6], 3, { a: '21' })).hint).toBe('Zitten alle bolletjes in een groepje?');
        expect(r(work([7, 7, 7, 7], 2, { a: '21' })).hint).toBe('Hoeveel groepjes moet je kleuren? Kijk naar de teller.');
        expect(r(work([7, 7, 7, 7], 3, { a: '20' }))).toEqual({ hint: 'Tel de gekleurde bolletjes.', marks: { a: 'wrong' } });
        expect(r(work([7, 7, 7, 7], 3, { a: '21', r1: '4', r2: '6' }))).toEqual({ hint: 'Kijk naar het rode vakje.', marks: { r2: 'wrong' } });
        expect(r(work([8, 6, 7, 7], 3, { a: '21', r2: '6' })).marks).toEqual({ r2: 'wrong' });
    });

    test('guide: once row 1 is filled, make or recheck the groups (the pupil\'s own numbers)', () => {
        expect(hvGuide({ ...EMPTY_INTERACTION, cells: { r0: '28', r1: '4', r2: '7' } }, E)).toBe('Maak nu 4 groepjes van 7 bolletjes.');
        expect(hvGuide(work([7, 7, 7, 7], 0, { r0: '28', r1: '4', r2: '6' }), E)).toBe('Kijk je groepjes na: zitten er 6 bolletjes in elk groepje?');
        expect(hvGuide(work([7, 7, 7, 7], 0, { r0: '28', r1: '4', r2: '7', r3: '3' }), E)).toBe('Tik op een groepje om het te kleuren.');
    });

    test('stats show the answer with the groups behind it', () => {
        expect(hvShow(given(work([8, 6, 7, 7], 3, { a: '21' })))).toBe('21 (4 groepjes, niet even groot, 3 gekleurd)');
        expect(hvShow(ia.answerOf(E, C))).toBe('21 (4 groepjes van 7, 3 gekleurd)');
    });

    test('solution fills in step by step: geheel, delen (the groups), één deel, then colour and row 2', () => {
        expect(hvSolution(E, 0)).toEqual({ ...EMPTY_INTERACTION, cells: {} });
        expect(hvSolution(E, 1).cells).toEqual({ r0: '28' });
        expect(hvSolution(E, 2).groups!.members.map(m => m.length)).toEqual([7, 7, 7, 7]);
        expect(hvSolution(E, 2).groups!.colored).toEqual([]);
        const all = hvSolution(E, Infinity);
        expect(all.groups!.colored).toEqual([0, 1, 2]);
        expect(ok(all)).toBe(true);
    });
});

// ── The kiosk: store flow and the card ──────────────────────────────────────

function hoeveelheidType(): OefenType {
    return { typeId: 'breuken', leafId: 'breuken-hoeveelheid', label: 'Breuk van een hoeveelheid', constraints: { subType: 'hoeveelheid', maxDenominator: 5, maxTotal: 20, answerFormat: 'met-hulp' }, limit: 3, weight: 1 };
}
const st = () => useOefenStore.getState();
// The exercise on the card, swapped for a known one (the generator draws at random).
function onCard(e: FractionExercise) {
    const s = st();
    const shown = { ...s.shown!, exercise: e, exerciseKey: `breuken:${e.numerator}/${e.denominator}/${e.total}` };
    useOefenStore.setState({ shown, run: { ...s.run!, current: shown }, interaction: EMPTY_INTERACTION, activeCell: 'a' });
}
const madeNow = () => st().run!.stats.perType[0]?.made ?? 0;

describe('kiosk store', () => {
    beforeEach(resetKiosk);

    test('one nudge without groups (no attempt); answering again without them counts as fout', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        onCard(ex(1, 3, 12));
        st().setInteraction({ ...EMPTY_INTERACTION, cells: { a: '4' } });
        st().answer();
        expect(st().phase).toBe('exercise');
        expect(st().nudge).toBe('Maak eerst de groepjes en kleur de delen.');
        expect(madeNow()).toBe(0);
        st().answer();
        expect(st().phase).toBe('feedback');
        expect(st().lastCorrect).toBe(false);
        expect(madeNow()).toBe(1);
    });

    test('2 kansen: a wrong row keeps the work with the cell marked; fixing it clears the mark and is juist', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()], attempts: 2 })));
        st().start();
        const e = ex(1, 3, 12);
        onCard(e);
        const solved = hvSolution(e, Infinity);
        st().setInteraction({ ...solved, cells: { ...solved.cells, r2: '3' } });
        st().answer();
        expect(st().phase).toBe('retry');
        expect(st().feedbackHint).toBe('Kijk naar het rode vakje.');
        st().skipFlash();
        expect(st().phase).toBe('exercise');
        expect(st().interaction.groups!.members).toHaveLength(3);
        expect(st().interaction.marks).toEqual({ r2: 'wrong' });
        st().typeCell('r2', '4');
        expect(st().interaction.marks).toEqual({});
        st().answer();
        expect(st().lastCorrect).toBe(true);
    });

    test('testmodus: a wrong answer marks nothing and gives no hint', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()], testMode: true })));
        st().start();
        const e = ex(1, 3, 12);
        onCard(e);
        const solved = hvSolution(e, Infinity);
        st().setInteraction({ ...solved, cells: { ...solved.cells, a: '5' } });
        st().answer();
        expect(st().feedbackHint).toBeNull();
        expect(madeNow()).toBe(1);
    });

    test('steps after a final fout: the card shows the solution as the questions are answered', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()], noSteps: undefined })));
        st().start();
        const e = ex(2, 3, 12);
        onCard(e);
        st().setInteraction({ ...hvSolution(e, Infinity), cells: { a: '9' } });
        st().answer();
        st().skipFlash();
        expect(st().phase).toBe('steps');
        st().showSolution(0);
        expect(st().interaction).toEqual(hvSolution(e, 0));
        st().showSolution(4);
        expect(st().interaction.cells.a).toBe('8');
    });
});

describe('kiosk card: build groups and colour with taps', () => {
    beforeEach(resetKiosk);
    afterEach(cleanup);

    test('Nieuw groepje, taps, Klaar met groepjes, colour, then Controleer is juist', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        onCard(ex(1, 3, 6));
        const { container } = render(<OefenApp />);
        const obj = (i: number) => container.querySelector<HTMLElement>(`.kiosk-card [data-kiosk-obj][data-kiosk-key="o${i}"]`)!;
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-obj]')).toHaveLength(6);
        expect(container.querySelectorAll('.kiosk-card input[data-kiosk-cell]')).toHaveLength(7);
        fireEvent.click(screen.getByRole('button', { name: 'Nieuw groepje' }));
        fireEvent.click(obj(0)); fireEvent.click(obj(1));
        expect(obj(0).getAttribute('data-kiosk-group')).toBe('0');
        expect(screen.getByText('Groepje 1')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Nieuw groepje' }));
        fireEvent.click(obj(2)); fireEvent.click(obj(3));
        fireEvent.click(screen.getByRole('button', { name: 'Nieuw groepje' }));
        fireEvent.click(obj(4)); fireEvent.click(obj(5));
        // A second tap takes an object out again; a third puts it back.
        fireEvent.click(obj(5));
        expect(obj(5).hasAttribute('data-kiosk-group')).toBe(false);
        fireEvent.click(obj(5));
        expect(obj(5).getAttribute('data-kiosk-group')).toBe('2');
        fireEvent.click(screen.getByRole('button', { name: 'Klaar met groepjes' }));
        expect(screen.getByText('Tik op een groepje om het te kleuren.')).toBeTruthy();
        fireEvent.click(obj(3));
        expect(obj(2).getAttribute('data-kiosk-colored')).toBe('true');
        expect(obj(3).getAttribute('data-kiosk-colored')).toBe('true');
        expect(obj(0).hasAttribute('data-kiosk-colored')).toBe(false);
        for (const ch of '2') fireEvent.click(screen.getByRole('button', { name: ch }));
        expect(st().interaction.cells.a).toBe('2');
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        expect(st().lastCorrect).toBe(true);
    });

    test('Controleer without groups shows the nudge in the panel; Opnieuw clears the groups', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        onCard(ex(1, 3, 6));
        const { container } = render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: '2' }));
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        expect(screen.getByRole('status').textContent).toBe('Maak eerst de groepjes en kleur de delen.');
        fireEvent.click(container.querySelector<HTMLElement>('.kiosk-card [data-kiosk-key="o0"]')!);
        fireEvent.click(screen.getByRole('button', { name: 'Opnieuw' }));
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-group]')).toHaveLength(0);
    });
});
