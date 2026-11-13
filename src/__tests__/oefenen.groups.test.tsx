// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, act } from '@testing-library/react';
import type { FractionExercise } from '../services/math/types';
import type { OefenSessie, OefenType } from '../services/oefenen/types';
import { checkAnswer } from '../services/oefenen/check';
import { kioskFor, kioskInputOf, kioskInstructionOf, kioskInteractOf } from '../services/oefenen/kiosk';
import { EMPTY_INTERACTION, groupChosen, groupStarted, groupTapped, groupsCleared, groupsDone, groupsEdited, type InteractionState } from '../components/viewer/ViewerInteractionContext';
import { hvNextStep, hvNudge, hvReview, hvShow, hvSolution } from '../services/fractions/hoeveelheidGroups';
import { currentInput, useOefenStore, type KioskCurrent } from '../oefenen/useOefenStore';
import OefenApp from '../oefenen/OefenApp';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';

// Breuk van een hoeveelheid in the kiosk (owner design 2026-11-13): the pupil builds equal groups by
// tapping the objects, chooses the teller's groups (Groepjes kiezen) and types the answer; the two working rows are
// optional but checked when filled; a Controleer without groups or chosen groups gets one nudge first.

const d = kioskFor('breuken')!;
const C = { subType: 'hoeveelheid' };
const ia = kioskInteractOf(d, C)!;
const ex = (t: number, n: number, g: number): FractionExercise => ({ id: 'h', subType: 'hoeveelheid', numerator: t, denominator: n, total: g, objectShape: 'circle', isManuallyEdited: false });
const E = ex(3, 4, 28);
const o = (i: number) => `o${i}`;

/** Groups of the given sizes over o0, o1, … (in order), the first `colored` of them chosen. */
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

    test('a chip picks a group: free objects join it, its own objects leave it, others move into it', () => {
        // The class case: 2/4 van 28, groups 1-4 partly built, then back to group 1 for one more.
        let st = work([6, 6, 6, 6], 0);
        st = groupsEdited(st);
        st = groupChosen(st, 0);
        expect(st.groups).toMatchObject({ active: 0, mode: 'group' });
        st = groupTapped(st, o(27));
        expect(st.groups!.members[0]).toEqual([o(0), o(1), o(2), o(3), o(4), o(5), o(27)]);
        st = groupTapped(st, o(27));
        expect(st.groups!.members[0]).toHaveLength(6);
        // An object of group 2 moves into the active group 1.
        st = groupTapped(st, o(6));
        expect(st.groups!.members.map(m => m.length)).toEqual([7, 5, 6, 6]);
        expect(st.groups!.active).toBe(0);
        // A chip out of range changes nothing.
        expect(groupChosen(st, 9)).toBe(st);
    });

    test('with no group picked, a tap on a grouped object picks its group', () => {
        let st = groupsEdited(work([2, 2], 0));
        st = groupTapped(st, o(3));
        expect(st.groups).toMatchObject({ active: 1, members: [[o(0), o(1)], [o(2), o(3)]] });
    });

    test('empty groups vanish and the numbers stay 1..n; only the active group may be empty', () => {
        let st = work([1, 2, 2], 0);
        st = groupsEdited(st);
        // Moving group 1's only object into group 3 empties group 1: it goes, 2 and 3 become 1 and 2.
        st = groupChosen(st, 2);
        st = groupTapped(st, o(0));
        expect(st.groups!.members).toEqual([[o(1), o(2)], [o(3), o(4), o(0)]]);
        expect(st.groups!.active).toBe(1);
        // A new group stays while it is active and empty; picking another group drops it.
        st = groupStarted(st);
        expect(st.groups!.members).toHaveLength(3);
        st = groupChosen(st, 0);
        expect(st.groups!.members).toHaveLength(2);
        // Taking the last object out of the active group keeps it (still active) until the pupil moves on.
        st = groupStarted(st);
        st = groupTapped(st, o(5));
        st = groupTapped(st, o(5));
        expect(st.groups!.members).toHaveLength(3);
        st = groupChosen(st, 1);
        expect(st.groups!.members).toHaveLength(2);
        // Colour follows its group when the numbers close up.
        let c = groupsDone(work([1, 2, 2], 0));
        c = groupTapped(c, o(3));
        c = groupChosen(c, 2);
        c = groupTapped(c, o(0));
        expect(c.groups!.colored).toEqual([1]);
    });

    test('Groepjes kiezen drops empty groups; choosing picks or drops a whole group; editing and Opnieuw', () => {
        let st = groupTapped(groupStarted(groupTapped(EMPTY_INTERACTION, o(0))), o(1));
        st = groupStarted(st);
        st = groupsDone(st);
        expect(st.groups).toMatchObject({ members: [[o(0)], [o(1)]], mode: 'colour', active: null });
        st = groupTapped(st, o(1));
        expect(st.groups!.colored).toEqual([1]);
        // A free object does nothing while choosing.
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

describe('nudge, review, tips, stats', () => {
    test('nudge: groups first, then the chosen groups; none once both are there', () => {
        expect(hvNudge(given({ ...EMPTY_INTERACTION, cells: { a: '21' } }), E)).toBe('Maak eerst de groepjes. Kies dan de groepjes voor 3/4.');
        expect(hvNudge(given(work([7, 7, 7, 7], 0, { a: '21' })), E)).toBe('Kies nog de groepjes voor 3/4.');
        expect(hvNudge(given(work([8, 6, 7, 7], 1, { a: '21' })), E)).toBeUndefined();
    });

    test('review: one hint in order (sizes, count, all in a group, colour, answer) and every wrong filled cell marked', () => {
        const r = (st: InteractionState) => hvReview(given(st), E);
        expect(r(work([8, 6, 7, 7], 3, { a: '21' })).hint).toBe('Zijn alle groepjes even groot?');
        expect(r(work([4, 4, 4, 4, 4, 4, 4], 3, { a: '21' })).hint).toBe('Hoeveel groepjes heb je nodig? Kijk naar de noemer.');
        expect(r(work([6, 6, 6, 6], 3, { a: '21' })).hint).toBe('Zitten alle bolletjes in een groepje?');
        expect(r(work([7, 7, 7, 7], 2, { a: '21' })).hint).toBe('Hoeveel groepjes moet je kiezen? Kijk naar de teller.');
        expect(r(work([7, 7, 7, 7], 3, { a: '20' }))).toEqual({ hint: 'Tel de bolletjes in de gekozen groepjes.', marks: { a: 'wrong' } });
        expect(r(work([7, 7, 7, 7], 3, { a: '21', r1: '4', r2: '6' }))).toEqual({ hint: 'Kijk naar het rode vakje.', marks: { r2: 'wrong' } });
        expect(r(work([8, 6, 7, 7], 3, { a: '21', r2: '6' })).marks).toEqual({ r2: 'wrong' });
    });

    test('next step: groups, row 1, groups vs row 1, choose, row 2, answer, Controleer', () => {
        const at = (st: InteractionState) => hvNextStep(E, st);
        const row1 = { r0: '28', r1: '4', r2: '7' }, row2 = { r3: '3', r4: '7', r5: '21' };
        // 1: nothing yet, or groups still being built.
        expect(at(EMPTY_INTERACTION)).toMatchObject({ step: 1, question: 'Hoe maak je gelijke groepjes?' });
        expect(at(EMPTY_INTERACTION).hint).toContain('Kijk naar de noemer');
        expect(at(groupTapped(EMPTY_INTERACTION, o(0))).hint).toContain('Tik op Groepjes kiezen en kies zoveel groepjes als de teller zegt.');
        expect(at(groupsEdited(work([7, 7, 7, 7], 0))).step).toBe(1);
        // 2: row 1, field by field.
        expect(at(work([7, 7, 7, 7], 0))).toMatchObject({ step: 2, question: 'Hoeveel is het geheel?' });
        expect(at(work([7, 7, 7, 7], 0, { r0: '28' }))).toMatchObject({ step: 2, question: 'In hoeveel moet je het delen?', hint: 'Kijk naar de noemer.' });
        expect(at(work([7, 7, 7, 7], 0, { r0: '28', r1: '4' }))).toMatchObject({ step: 2, question: 'Hoeveel is één deel?', hint: 'Deel het geheel door de noemer: 28 : 4.' });
        // 3: the groups against the pupil's own one deel: a wrong row 1 shows the pupil's 6, never the right 7.
        expect(at(work([7, 7, 7, 7], 0, { r0: '28', r1: '4', r2: '6' })).hint).toContain('zitten er 6 bolletjes in elk groepje?');
        expect(at(work([8, 6, 7, 7], 0, row1))).toMatchObject({ step: 3 });
        expect(at(work([8, 6, 7, 7], 0, row1)).hint).toContain('Kijk je groepjes na: zitten er 7 bolletjes in elk groepje?');
        expect(at(work([7, 7, 7], 0, row1)).hint).toContain('je eerste rij zegt 4 groepjes');
        // 4: choose as many groups as the teller says.
        expect(at(work([7, 7, 7, 7], 0, row1))).toMatchObject({ step: 4, question: 'Hoeveel groepjes kies je?' });
        expect(at(work([7, 7, 7, 7], 0, row1)).hint).toContain('Tik op een groepje om het te kiezen');
        expect(at(work([7, 7, 7, 7], 4, row1)).step).toBe(4);
        // 5: row 2, field by field; its sum uses the pupil's own numbers.
        expect(at(work([7, 7, 7, 7], 3, row1))).toMatchObject({ step: 5, question: 'Hoeveel keer moet je dat deel nemen?', hint: 'Kijk naar de teller.' });
        expect(at(work([7, 7, 7, 7], 3, { ...row1, r3: '3', r4: '7' }))).toMatchObject({ step: 5, hint: 'Reken: 3 × 7.' });
        // 6: the answer; 7: Controleer.
        expect(at(work([7, 7, 7, 7], 3, { ...row1, ...row2 }))).toMatchObject({ step: 6, question: 'Hoeveel is 3/4 van 28?' });
        expect(at(work([7, 7, 7, 7], 3, { ...row1, ...row2, a: '21' }))).toEqual({ step: 7, question: 'Klaar?', hint: 'Tik op Controleer.' });
    });

    test('next step: skipped rows are skipped once the answer is typed; the hints never show a right value', () => {
        const at = (st: InteractionState) => hvNextStep(E, st);
        expect(at(work([7, 7, 7, 7], 3, { a: '21' })).step).toBe(7);
        expect(at(work([7, 7, 7, 7], 3, { a: '21', r0: '28' })).step).toBe(7);
        expect(at(work([7, 7, 7, 7], 0, { a: '21' })).step).toBe(4);
        // Without row 1 the groups are checked against the card only.
        expect(at(work([8, 6, 7, 7], 3, { a: '21' })).hint).toContain('zijn ze allemaal even groot?');
        expect(at(work([4, 4, 4, 4, 4, 4, 4], 3, { a: '21' })).hint).toContain('de noemer zegt');
        expect(at(work([6, 6, 6, 6], 3, { a: '21' })).hint).toContain('zitten alle bolletjes in een groepje?');
        // A wrong typed answer still just says Controleer.
        expect(at(work([7, 7, 7, 7], 3, { a: '20' })).step).toBe(7);
        // No hint ever names one deel (7) or the answer (21) the pupil did not type.
        const states = [EMPTY_INTERACTION, work([7, 7, 7, 7], 0), work([8, 6, 7, 7], 0, { r0: '28', r1: '4', r2: '6' }), work([6, 6, 6, 6], 3, { a: '20' }), work([7, 7, 7, 7], 3, { r0: '28', r1: '4', r2: '6' })];
        for (const st of states) expect(`${at(st).question} ${at(st).hint}`).not.toMatch(/\b(7|21)\b/);
        expect(hvNextStep({ ...E, objectShape: 'square' }, EMPTY_INTERACTION).hint).toContain('blokjes');
    });

    test('stats show the answer with the groups behind it', () => {
        expect(hvShow(given(work([8, 6, 7, 7], 3, { a: '21' })))).toBe('21 (4 groepjes, niet even groot, 3 gekozen)');
        expect(hvShow(ia.answerOf(E, C))).toBe('21 (4 groepjes van 7, 3 gekozen)');
    });

    test('solution fills in step by step: geheel, delen (the groups), één deel, then the chosen groups and row 2', () => {
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
        expect(st().nudge).toBe('Maak eerst de groepjes. Kies dan de groepjes voor 1/3.');
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

describe('kiosk card: build groups and choose them with taps', () => {
    beforeEach(resetKiosk);
    afterEach(cleanup);

    test('+ Nieuw groepje, taps, Groepjes kiezen, choose, then Controleer is juist', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        onCard(ex(1, 3, 6));
        const { container } = render(<OefenApp />);
        const obj = (i: number) => container.querySelector<HTMLElement>(`.kiosk-card [data-kiosk-obj][data-kiosk-key="o${i}"]`)!;
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-obj]')).toHaveLength(6);
        expect(container.querySelectorAll('.kiosk-card input[data-kiosk-cell]')).toHaveLength(7);
        fireEvent.click(screen.getByRole('button', { name: '+ Nieuw groepje' }));
        fireEvent.click(obj(0)); fireEvent.click(obj(1));
        expect(obj(0).getAttribute('data-kiosk-group')).toBe('0');
        expect(screen.getByRole('button', { name: 'Groepje 1' }).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: '+ Nieuw groepje' }));
        fireEvent.click(obj(2)); fireEvent.click(obj(3));
        fireEvent.click(screen.getByRole('button', { name: '+ Nieuw groepje' }));
        fireEvent.click(obj(4)); fireEvent.click(obj(5));
        // A second tap takes an object out again; a third puts it back.
        fireEvent.click(obj(5));
        expect(obj(5).hasAttribute('data-kiosk-group')).toBe(false);
        fireEvent.click(obj(5));
        expect(obj(5).getAttribute('data-kiosk-group')).toBe('2');
        const choose = () => screen.getByRole('button', { name: 'Groepjes kiezen' });
        // Every object is in a group and none is chosen yet: the button is primary and pulses, not pressed.
        expect(choose().getAttribute('aria-pressed')).toBe('false');
        expect(choose().className).toContain('kiosk-btn-primary');
        expect(choose().className).toContain('kiosk-steps-pulse');
        fireEvent.click(choose());
        expect(choose().getAttribute('aria-pressed')).toBe('true');
        expect(choose().className).toContain('kiosk-steps-pulse');
        expect(screen.getByRole('button', { name: 'Groepjes aanpassen' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Groepje 1' })).toBeNull();
        fireEvent.click(obj(3));
        expect(obj(2).getAttribute('data-kiosk-colored')).toBe('true');
        expect(obj(3).getAttribute('data-kiosk-colored')).toBe('true');
        expect(obj(0).hasAttribute('data-kiosk-colored')).toBe(false);
        expect(obj(3).getAttribute('aria-label')).toBe('bolletje 4, groepje 2, gekozen');
        // One group chosen: the pulse stops.
        expect(choose().className).not.toContain('kiosk-steps-pulse');
        // Tap again to unchoose, and once more to choose it back.
        fireEvent.click(obj(2));
        expect(obj(2).hasAttribute('data-kiosk-colored')).toBe(false);
        fireEvent.click(obj(2));
        expect(obj(3).getAttribute('data-kiosk-colored')).toBe('true');
        // Groepjes aanpassen: back to grouping, the choice hidden (outlines only) but kept for Groepjes kiezen.
        fireEvent.click(screen.getByRole('button', { name: 'Groepjes aanpassen' }));
        expect(choose().getAttribute('aria-pressed')).toBe('false');
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-colored]')).toHaveLength(0);
        expect(obj(3).getAttribute('data-kiosk-group')).toBe('1');
        fireEvent.click(choose());
        expect(obj(3).getAttribute('data-kiosk-colored')).toBe('true');
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
        expect(screen.getByRole('status').textContent).toBe('Maak eerst de groepjes. Kies dan de groepjes voor 1/3.');
        fireEvent.click(container.querySelector<HTMLElement>('.kiosk-card [data-kiosk-key="o0"]')!);
        fireEvent.click(screen.getByRole('button', { name: 'Opnieuw' }));
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-group]')).toHaveLength(0);
    });

    test('the class case: back to group 1 with its chip and add an object; an empty new group never stays', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        onCard(ex(2, 4, 28));
        const { container } = render(<OefenApp />);
        const obj = (i: number) => container.querySelector<HTMLElement>(`.kiosk-card [data-kiosk-obj][data-kiosk-key="o${i}"]`)!;
        const chip = (n: number) => screen.queryByRole('button', { name: `Groepje ${n}` });
        let at = 0;
        for (let g = 0; g < 4; g++) {
            fireEvent.click(screen.getByRole('button', { name: '+ Nieuw groepje' }));
            for (let i = 0; i < 6; i++) fireEvent.click(obj(at++));
        }
        // "Groepje 5" started by mistake, then the pupil goes back to group 1: 5 vanishes.
        fireEvent.click(screen.getByRole('button', { name: '+ Nieuw groepje' }));
        expect(chip(5)).toBeTruthy();
        fireEvent.click(chip(1)!);
        expect(chip(5)).toBeNull();
        expect(chip(1)!.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(obj(24));
        expect(obj(24).getAttribute('data-kiosk-group')).toBe('0');
        // A tap on group 2's object moves it into group 1; tapping it again takes it out.
        fireEvent.click(obj(6));
        expect(obj(6).getAttribute('data-kiosk-group')).toBe('0');
        fireEvent.click(obj(6));
        expect(obj(6).hasAttribute('data-kiosk-group')).toBe(false);
        expect(st().interaction.groups!.members.map(m => m.length)).toEqual([7, 5, 6, 6]);
    });

    test('one "i" by the rows: its bubble tells the next step, follows the work, and a tap elsewhere closes it', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        onCard(ex(1, 3, 6));
        const { container } = render(<OefenApp />);
        expect(container.querySelectorAll('.kiosk-card .kiosk-hv-info')).toHaveLength(1);
        expect(screen.queryByRole('tooltip')).toBeNull();
        const info = () => screen.getByRole('button', { name: 'Wat moet ik nu doen?' });
        fireEvent.click(info());
        expect(screen.getByRole('tooltip').textContent).toContain('Hoe maak je gelijke groepjes?');
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('tooltip')).toBeNull();
        act(() => st().setInteraction({ ...hvSolution(ex(1, 3, 6), 2), cells: { r0: '6', r1: '3', r2: '3' } }));
        expect(container.querySelectorAll('.kiosk-card .kiosk-hv-info')).toHaveLength(1);
        fireEvent.click(info());
        expect(screen.getByRole('tooltip').textContent).toContain('zitten er 3 bolletjes in elk groepje?');
        // A tap on the bubble closes it (on click, so the tap never falls through to what it covers).
        fireEvent.pointerDown(screen.getByRole('tooltip'));
        expect(screen.queryByRole('tooltip')).toBeTruthy();
        fireEvent.click(screen.getByRole('tooltip'));
        expect(screen.queryByRole('tooltip')).toBeNull();
        // A second tap on the "i" closes it again.
        fireEvent.click(info());
        fireEvent.click(info());
        expect(screen.queryByRole('tooltip')).toBeNull();
    });
});

describe('kiosk card: the choosing step is obvious', () => {
    beforeEach(resetKiosk);
    afterEach(cleanup);

    test('the card instruction names both steps', () => {
        expect(kioskInstructionOf('breuken', ex(2, 4, 28), C, 'Kleur het deel.')).toBe('Maak gelijke groepjes. Kies dan de groepjes voor 2/4.');
    });

    test('Groepjes kiezen is disabled before any group, primary without pulse while objects are still free', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        onCard(ex(1, 3, 6));
        const { container } = render(<OefenApp />);
        const choose = () => screen.getByRole('button', { name: 'Groepjes kiezen' }) as HTMLButtonElement;
        expect(choose().disabled).toBe(true);
        expect(choose().className).not.toContain('kiosk-btn-primary');
        fireEvent.click(container.querySelector<HTMLElement>('.kiosk-card [data-kiosk-key="o0"]')!);
        expect(choose().disabled).toBe(false);
        expect(choose().className).toContain('kiosk-btn-primary');
        expect(choose().className).not.toContain('kiosk-steps-pulse');
    });

    test('while grouping a group is only its outline: chosen groups fill only in Groepjes kiezen', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        onCard(ex(2, 4, 8));
        st().setInteraction(groupsEdited(work([2, 2, 2, 2], 2)));
        const { container } = render(<OefenApp />);
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-group]')).toHaveLength(8);
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-colored]')).toHaveLength(0);
        fireEvent.click(screen.getByRole('button', { name: 'Groepjes kiezen' }));
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-colored]')).toHaveLength(4);
    });

    test('Controleer with groups but none chosen: the nudge asks for the chosen groups, no attempt', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        onCard(ex(2, 4, 8));
        st().setInteraction(work([2, 2, 2, 2], 0, { a: '4' }));
        render(<OefenApp />);
        fireEvent.click(screen.getByRole('button', { name: 'Controleer' }));
        expect(screen.getByRole('status').textContent).toBe('Kies nog de groepjes voor 2/4.');
        expect(madeNow()).toBe(0);
    });

    test('the solution view: the right groups, the teller groups chosen and drawn filled', () => {
        st().load(hashOf(starterSessie({ types: [hoeveelheidType()] })));
        st().start();
        const e = ex(2, 4, 8);
        onCard(e);
        st().setInteraction(hvSolution(e, Infinity));
        const { container } = render(<OefenApp />);
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-group]')).toHaveLength(8);
        expect(container.querySelectorAll('.kiosk-card [data-kiosk-colored]')).toHaveLength(4);
    });
});
