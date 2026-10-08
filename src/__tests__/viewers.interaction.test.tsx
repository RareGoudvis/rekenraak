// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useState } from 'react';
import { act, render, cleanup, fireEvent, screen } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import {
    EMPTY_INTERACTION, ViewerInteractionProvider, cellProps, interactionProps, toggled,
    type InteractionKind, type InteractionState,
} from '../components/viewer/ViewerInteractionContext';
import KioskCell from '../components/viewer/KioskCell';
import type { MathBlock } from '../services/math/types';
import type { KioskDescriptor } from '../services/oefenen/types';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { kioskFor, kioskInteractOf } from '../services/oefenen/kiosk';
import { makeBlock } from './helpers/makeBlock';
import { hashOf, resetKiosk, starterSessie, tapAnswer } from './helpers/oefenKiosk';
import { makeDraftBlock } from '../components/curriculum/draftBlock';
import { numValue } from '../services/math/answerKeys';
import type { OefenType } from '../services/oefenen/types';
import type { CijferExercise } from '../services/math/types';
import { cijferFill, rightCells } from './helpers/fillCells';

// Phase C (Oefenmodus): viewers answer taps only inside the kiosk's ViewerInteractionContext.
// On the sheet the context is null and a viewer must render exactly what it rendered before
// the mechanism existed: no data-kiosk-*, no role / tabIndex / aria-pressed, no handlers.

const st = () => useOefenStore.getState();
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    resetKiosk();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    cleanup();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
});

function blockFor(typeId: string, constraints?: Record<string, unknown>): MathBlock {
    const def = REGISTRY[typeId];
    const block = makeBlock(typeId, { constraints });
    (block as unknown as Record<string, unknown>)[def.exerciseField] = def.generate(block);
    return block;
}

const KIOSK_MARKS = /data-kiosk-|aria-pressed/;

// Every type at its registry defaults plus every sidebar leaf at its own defaults.
const SHEET_CASES: Array<[string, string, Record<string, unknown> | undefined]> = [
    ...Object.keys(EXERCISE_UI).map(t => [`${t} (defaults)`, t, undefined] as [string, string, undefined]),
    ...flattenLeaves().map(l => [l.id, l.typeId, l.defaultConstraints] as [string, string, Record<string, unknown> | undefined]),
];

describe('the sheet is untouched without the kiosk context', () => {
    test.each(SHEET_CASES)('%s', (_name, typeId, constraints) => {
        const { Viewer } = EXERCISE_UI[typeId];
        const block = blockFor(typeId, constraints);
        const bare = render(<BlockWidthProvider value={338}><Viewer block={block} showSolutions={false} /></BlockWidthProvider>);
        const sheetHtml = bare.container.innerHTML;
        bare.unmount();
        const wrapped = render(
            <BlockWidthProvider value={338}>
                <ViewerInteractionProvider value={null}><Viewer block={block} showSolutions={false} /></ViewerInteractionProvider>
            </BlockWidthProvider>,
        );
        expect(wrapped.container.innerHTML).toBe(sheetHtml);
        expect(KIOSK_MARKS.test(sheetHtml), `${typeId} carries kiosk attributes on the sheet`).toBe(false);
    });
});

describe('helpers', () => {
    test('null context: no props, no cell input, the sheet blank stays', () => {
        expect(interactionProps(null, '0')).toEqual({});
        expect(cellProps(null, 'a')).toEqual({});
        const { container } = render(<KioskCell cellKey="a"><span className="blank">___</span></KioskCell>);
        expect(container.innerHTML).toBe('<span class="blank">___</span>');
    });

    test('a part serves only its own kind of context', () => {
        const ctx = (kind: InteractionKind) => ({ kind, state: EMPTY_INTERACTION, set: () => { } });
        expect(interactionProps(ctx('tap'), '0').role).toBe('button');
        expect(interactionProps(ctx('tap-multi'), '0').role).toBe('button');
        expect(interactionProps(ctx('fill-cells'), '0')).toEqual({});
        expect(interactionProps(ctx('order'), '0')).toEqual({});
        expect(interactionProps(ctx('order'), '0', 'order').role).toBe('button');
        expect(cellProps(ctx('tap'), 'a')).toEqual({});
    });

    test('toggled: tap replaces, tap-multi toggles, order appends and cuts from a re-tapped part', () => {
        const s0 = EMPTY_INTERACTION;
        expect(toggled('tap', toggled('tap', s0, '1'), '2').selected).toEqual(['2']);
        expect(toggled('tap', toggled('tap', s0, '1'), '1').selected).toEqual([]);
        expect(toggled('tap-multi', toggled('tap-multi', s0, '1'), '2').selected).toEqual(['1', '2']);
        expect(toggled('tap-multi', toggled('tap-multi', s0, '1'), '1').selected).toEqual([]);
        const bac = toggled('order', toggled('order', toggled('order', s0, 'b'), 'a'), 'c');
        expect(bac.order).toEqual(['b', 'a', 'c']);
        expect(toggled('order', bac, 'c').order).toEqual(['b', 'a']);
        expect(toggled('order', bac, 'a').order).toEqual(['b']);
        expect(toggled('order', bac, 'b').order).toEqual([]);
    });
});

// A viewer under a live context, the state held in React like the kiosk store holds it.
function Harness({ block, kind, onState }: { block: MathBlock; kind: InteractionKind; onState?: (s: InteractionState) => void }) {
    const [state, setState] = useState<InteractionState>(EMPTY_INTERACTION);
    const [active, setActive] = useState<string | null>(null);
    const { Viewer } = EXERCISE_UI[block.typeId];
    const set = (next: InteractionState) => { setState(next); onState?.(next); };
    return (
        <BlockWidthProvider value={340}>
            <ViewerInteractionProvider value={{ kind, state, set, activeCell: active, focusCell: setActive }}>
                <Viewer block={block} showSolutions={false} />
            </ViewerInteractionProvider>
        </BlockWidthProvider>
    );
}

const parts = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('[data-kiosk-key]')];
const picked = (c: HTMLElement) => parts(c).filter(p => p.getAttribute('aria-pressed') === 'true').map(p => p.dataset.kioskKey);

describe('viewer tap flow (jsdom)', () => {
    test('vergelijken kiezen: one number at a time, keyboard too', () => {
        const block = blockFor('vergelijken', { subType: 'kiezen', setSize: 4 });
        (block.vergelijkenExercises as unknown[]).splice(1);
        let last: InteractionState = EMPTY_INTERACTION;
        const { container } = render(<Harness block={block} kind="tap" onState={s => { last = s; }} />);
        const ps = parts(container);
        expect(ps.map(p => p.dataset.kioskKey)).toEqual(['0', '1', '2', '3']);
        expect(ps.every(p => p.getAttribute('role') === 'button' && p.tabIndex === 0)).toBe(true);
        fireEvent.click(ps[1]);
        expect(picked(container)).toEqual(['1']);
        expect(ps[1].hasAttribute('data-kiosk-selected')).toBe(true);
        fireEvent.click(ps[2]);
        expect(picked(container)).toEqual(['2']);
        fireEvent.keyDown(ps[0], { key: 'Enter' });
        expect(last.selected).toEqual(['0']);
        fireEvent.keyDown(ps[0], { key: ' ' });
        expect(last.selected).toEqual([]);
        fireEvent.keyDown(ps[3], { key: 'a' });
        expect(last.selected).toEqual([]);
    });

    test('even-oneven rooster: toggles any number of cells', () => {
        const block = blockFor('even-oneven', { subType: 'rooster', perRow: 10 });
        (block.evenOnevenExercises as unknown[]).splice(1);
        const { container } = render(<Harness block={block} kind="tap-multi" />);
        const ps = parts(container);
        expect(ps).toHaveLength(10);
        fireEvent.click(ps[0]); fireEvent.click(ps[4]); fireEvent.click(ps[7]);
        expect(picked(container)).toEqual(['0', '4', '7']);
        fireEvent.click(ps[4]);
        expect(picked(container)).toEqual(['0', '7']);
    });

    // Phase C1: one exercise per family, every key the descriptor names is a part on the card,
    // a tap picks exactly that part and the right part answers the descriptor's answer.
    test.each<[string, string, Record<string, unknown>]>([
        ['plaatswaarde omcirkelen', 'plaatswaarde', { subType: 'omcirkelen', maxGetal: 100000 }],
        ['getalfunctie aankruisen', 'getalfunctie', {}],
        ['getalfunctie aankruisen, two columns', 'getalfunctie', { functies: ['maat', 'code'] }],
        ['maateenheid omcirkelen', 'maateenheid', {}],
        ['maateenheid schatten', 'maateenheid', { subType: 'schatten' }],
        ['controleren negenproef', 'controleren', { subType: 'negenproef' }],
        ['controleren omgekeerde', 'controleren', { subType: 'omgekeerde', maxGetal: 1000 }],
    ])('%s: tap one part, the right one answers', (_name, typeId, constraints) => {
        const block = blockFor(typeId, constraints);
        const field = REGISTRY[typeId].exerciseField;
        const list = (block as unknown as Record<string, unknown[]>)[field];
        list.splice(1);
        const ex = list[0];
        const c = block.constraints as Record<string, unknown>;
        const d = kioskFor(typeId)!;
        const ia = d.interact!;
        expect(ia.kind).toBe('tap');
        let last: InteractionState = EMPTY_INTERACTION;
        const { container } = render(<Harness block={block} kind="tap" onState={s => { last = s; }} />);
        const ps = parts(container);
        expect(ps.map(p => p.dataset.kioskKey)).toEqual(ia.keys!(ex, c));
        const want = ia.answerOf(ex, c);
        const right = ps.filter(p => ia.fromState({ ...EMPTY_INTERACTION, selected: [p.dataset.kioskKey!] }, ex, c) === want);
        expect(right.length).toBeGreaterThan(0);
        for (const p of ps) {
            fireEvent.click(p);
            expect(picked(container)).toEqual([p.dataset.kioskKey]);
        }
        // The loop may have ended on the right part: a second tap would take it out again.
        if (picked(container)[0] !== right[0].dataset.kioskKey) fireEvent.click(right[0]);
        expect(ia.fromState(last, ex, c)).toBe(want);
    });

    test.each<[string, Record<string, unknown>]>([
        ['ordenen', { numberType: 'natural', count: 4 }],
        ['breuken-rangschikken', { count: 4 }],
    ])('%s: tap the values in order, a badge per place, a re-tap cuts the tail', (typeId, constraints) => {
        const block = blockFor(typeId, constraints);
        (block.ordenenExercises as unknown[]).splice(1);
        const ex = block.ordenenExercises![0];
        const c = block.constraints as Record<string, unknown>;
        const ia = kioskFor(typeId)!.interact!;
        expect(ia.kind).toBe('order');
        let last: InteractionState = EMPTY_INTERACTION;
        const { container } = render(<Harness block={block} kind="order" onState={s => { last = s; }} />);
        const ps = parts(container);
        expect(ps.map(p => p.dataset.kioskKey)).toEqual(ia.keys!(ex, c));
        expect(ps.every(p => p.getAttribute('role') === 'button')).toBe(true);
        // No sheet editor in the kiosk: a tap orders, it never opens the value's text field.
        fireEvent.click(ps[2]); fireEvent.click(ps[0]);
        expect(last.order).toEqual(['2', '0']);
        expect(ps[2].dataset.kioskOrder).toBe('1');
        expect(ps[0].dataset.kioskOrder).toBe('2');
        expect(ps[1].hasAttribute('data-kiosk-order')).toBe(false);
        expect(container.querySelector('input')).toBeNull();
        expect(ia.fromState(last, ex, c)).toBe('');
        fireEvent.click(ps[2]);
        expect(last.order).toEqual([]);
        expect(ps.some(p => p.hasAttribute('data-kiosk-order'))).toBe(false);
        const sorted = [...ps].sort((a, b) => (numValue(ex.display[Number(a.dataset.kioskKey)]) - numValue(ex.display[Number(b.dataset.kioskKey)])) * (ex.operator === '<' ? 1 : -1));
        sorted.forEach(p => fireEvent.click(p));
        expect(ia.fromState(last, ex, c)).toBe(ia.answerOf(ex, c));
    });

    test('an opted-in viewer under another kind stays plain', () => {
        const block = blockFor('vergelijken', { subType: 'kiezen' });
        const { container } = render(<Harness block={block} kind="fill-cells" />);
        expect(KIOSK_MARKS.test(container.innerHTML)).toBe(false);
    });

    test('KioskCell: an input bound to its cell, focus makes it the keypad target', () => {
        function Cells() {
            const [state, set] = useState<InteractionState>(EMPTY_INTERACTION);
            const [active, setActive] = useState<string | null>(null);
            return (
                <ViewerInteractionProvider value={{ kind: 'fill-cells', state, set, activeCell: active, focusCell: setActive }}>
                    <KioskCell cellKey="a"><span>___</span></KioskCell>
                    <KioskCell cellKey="b"><span>___</span></KioskCell>
                    <output>{JSON.stringify(state.cells)}|{active}</output>
                </ViewerInteractionProvider>
            );
        }
        const { container } = render(<Cells />);
        const [a, b] = [...container.querySelectorAll('input')];
        expect(a.getAttribute('inputmode')).toBe('none');
        fireEvent.focus(b);
        fireEvent.change(b, { target: { value: '1.5x' } });
        expect(container.querySelector('output')!.textContent).toBe('{"b":"1,5"}|b');
        expect(b.hasAttribute('data-kiosk-active')).toBe(true);
        expect(a.hasAttribute('data-kiosk-active')).toBe(false);
    });
});

// The cell inputs on the card, by key.
const cellInputs = (c: HTMLElement) => new Map([...c.querySelectorAll<HTMLInputElement>('input[data-kiosk-cell]')].map(i => [i.dataset.kioskKey!, i]));
const activeInput = (c: HTMLElement) => cellInputs(c).get(st().activeCell!)!;

// A session row for a sidebar leaf at its sidebar defaults, as the builder makes it.
function leafType(leafId: string, extra: Record<string, unknown> = {}): OefenType {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    const constraints = makeDraftBlock(leaf.typeId, { ...leaf.defaultConstraints, ...extra }).constraints as Record<string, unknown>;
    return { typeId: leaf.typeId, leafId, label: leafId, constraints, limit: 3, weight: 1 };
}

const controleer = () => screen.getByRole('button', { name: 'Controleer' }) as HTMLButtonElement;

describe('kiosk flow: answer on the card', () => {
    test('vergelijken kiezen: tap the number, Controleer, juist / fout', () => {
        st().load(hashOf(starterSessie({ types: [leafType('vergelijken-kiezen')] })));
        st().start();
        const { container } = render(<OefenApp />);
        const inner = container.querySelector('.kiosk-card-inner')!;
        expect(inner.hasAttribute('inert')).toBe(false);
        expect(inner.className).toContain('is-interactive');
        expect(screen.queryAllByRole('radio')).toHaveLength(0);
        expect(controleer().disabled).toBe(true);

        const cur = st().shown!;
        const ia = kioskFor('vergelijken')!.interact!;
        const want = ia.answerOf(cur.exercise, cur.constraints);
        const ps = parts(container);
        const right = ps.find(p => ia.fromState({ ...EMPTY_INTERACTION, selected: [p.dataset.kioskKey!] }, cur.exercise, cur.constraints) === want)!;
        fireEvent.click(right);
        expect(controleer().disabled).toBe(false);
        // Enter on a number toggles it; it is not Controleer.
        fireEvent.keyDown(right, { key: 'Enter' });
        expect(st().phase).toBe('exercise');
        expect(st().interaction.selected).toEqual([]);
        fireEvent.keyDown(right, { key: 'Enter' });
        fireEvent.click(controleer());
        expect(st().lastCorrect).toBe(true);
        expect(st().run!.stats.perType[0].correct).toBe(1);

        st().next();
        expect(st().interaction).toEqual(EMPTY_INTERACTION);
        tapAnswer(false);
        st().answer();
        expect(st().lastCorrect).toBe(false);
        const err = st().run!.stats.perType[0].errors[0];
        expect(err.expected).toBe(kioskFor('vergelijken')!.interact!.answerOf(st().shown!.exercise, st().shown!.constraints));
        expect(err.given).not.toBe(err.expected);
    });

    test('even-oneven rooster: every even number, in any order', () => {
        st().load(hashOf(starterSessie({ types: [leafType('even-oneven-rooster')] })));
        st().start();
        const { container } = render(<OefenApp />);
        expect(parts(container)).toHaveLength(10);
        // An empty set may be the answer, so Controleer is on from the start.
        expect(controleer().disabled).toBe(false);
        tapAnswer(true);
        st().setInteraction({ ...st().interaction, selected: [...st().interaction.selected].reverse() });
        fireEvent.click(controleer());
        expect(st().lastCorrect).toBe(true);
        st().next();
        tapAnswer(false);
        st().answer();
        expect(st().lastCorrect).toBe(false);
    });

    test('cijferen: the keypad fills the ruitjes right to left, carries are tapped, Enter checks', () => {
        st().load(hashOf(starterSessie({ types: [leafType('cijferen-optellen-nat', { scaffolding: 3 })] })));
        st().start();
        const { container } = render(<OefenApp />);
        const cur = st().shown!;
        const ia = kioskFor(cur.constraints.operator === '+' ? 'cijferen-optellen-nat' : '')!.interact!;
        const keys = ia.keys!(cur.exercise, cur.constraints);
        const inputs = cellInputs(container);
        expect([...inputs.keys()].sort()).toEqual([...keys].sort());
        // Operands stand in the grid even when the teacher's sheet leaves them out (scaffolding 3).
        expect(container.querySelector('.kiosk-card-inner')!.textContent).toContain(String((cur.exercise as CijferExercise).operands[0] % 10));
        const digits = keys.filter(k => k.startsWith('a'));
        expect(st().activeCell).toBe(digits[0]);
        expect(document.activeElement).toBe(inputs.get(digits[0]));
        expect(controleer().disabled).toBe(true);

        const { answer, scratch } = cijferFill(cur.exercise as CijferExercise, keys);
        // A full ruitje hands the keypad on to the next column.
        st().press(answer[digits[0]]);
        expect(st().activeCell).toBe(digits[1]);
        // Shift+Tab steps back onto the carry above that column; the carry hands back to its digit.
        fireEvent.keyDown(activeInput(container), { key: 'Tab', shiftKey: true });
        expect(st().activeCell).toBe('c' + digits[1].slice(1));
        st().press(scratch[st().activeCell!] || '0');
        expect(st().activeCell).toBe(digits[1]);
        // The rest of the row, each carry written above its column first (the kiosk is strict);
        // the physical keyboard types too.
        digits.forEach((k, i) => {
            if (i === 0) return;
            expect(st().activeCell).toBe(k);
            const carry = scratch['c' + k.slice(1)];
            if (i > 1 && carry) {
                fireEvent.keyDown(activeInput(container), { key: 'Tab', shiftKey: true });
                st().press(carry);
                expect(st().activeCell).toBe(k);
            }
            if (!answer[k]) return;
            if (i % 2) fireEvent.change(activeInput(container), { target: { value: answer[k] } });
            else st().press(answer[k]);
        });
        expect(controleer().disabled).toBe(false);
        // Enter walks the remaining (blank) digit cells and checks after the last one.
        for (let i = 0; i < digits.length && st().phase === 'exercise'; i++) fireEvent.keyDown(activeInput(container), { key: 'Enter' });
        expect(st().phase).toBe('feedback');
        expect(st().lastCorrect).toBe(true);

        st().next();
        const nxt = st().shown!;
        const keys2 = ia.keys!(nxt.exercise, nxt.constraints);
        const right = cijferFill(nxt.exercise as CijferExercise, keys2).answer;
        const units = keys2[0];
        st().setInteraction({ ...EMPTY_INTERACTION, cells: { ...right, [units]: String((Number(right[units]) + 1) % 10) } });
        st().answer();
        expect(st().lastCorrect).toBe(false);
        const err = st().run!.stats.perType[0].errors[0];
        // Strict carries: the expected line names the carries a pupil must write ("380 (onthouden 1)").
        expect(err.expected.split(' (onthouden')[0]).toBe(String((nxt.exercise as CijferExercise).answer));
        expect(err.given).not.toBe(err.expected);
    });

    test('cijferen delen: quotient digits left to right, then the rest', () => {
        st().load(hashOf(starterSessie({ types: [leafType('cijferen-delen-nat')] })));
        st().start();
        const { container } = render(<OefenApp />);
        const cur = st().shown!;
        const ex = cur.exercise as CijferExercise;
        const keys = kioskFor('cijferen-delen-nat')!.interact!.keys!(ex, cur.constraints);
        expect(keys[0]).toBe('q0');
        expect(keys[keys.length - 1]).toBe('r');
        // Written from the left like a pupil does: q0, q1, … then Enter to the rest.
        String(ex.answer).split('').forEach(dg => st().press(dg));
        while (st().activeCell !== 'r') fireEvent.keyDown(activeInput(container), { key: 'Enter' });
        expect(controleer().disabled).toBe(true);
        String(ex.remainder).split('').forEach(dg => st().press(dg));
        fireEvent.keyDown(activeInput(container), { key: 'Enter' });
        expect(st().lastCorrect).toBe(true);
    });

    test('cijferen aftrekken: Lenen exchanges the units, strikes the 5 and 2, then 5 and 3 are juist', () => {
        st().load(hashOf(starterSessie({ types: [leafType('cijferen-aftrekken-nat')] })));
        st().start();
        const exercise: CijferExercise = { id: 'x', operands: [52, 17], operator: '-', answer: 35, remainder: 0, decimalPlaces: 0, isManuallyEdited: false };
        act(() => { useOefenStore.setState({ shown: { ...st().shown!, exercise }, interaction: EMPTY_INTERACTION, activeCell: 'a1' }); });
        const { container } = render(<OefenApp />);
        const lenen = screen.getByRole('button', { name: 'Lenen' });
        // No hint line: the key never tells the pupil where to exchange.
        expect(screen.queryByText(/tik op het vakje/)).toBeNull();
        expect(container.querySelectorAll('[data-kiosk-borrowed]')).toHaveLength(0);
        fireEvent.click(lenen);
        expect(cellInputs(container).get('b0')!.value).toBe('4');
        expect(cellInputs(container).get('b1')!.value).toBe('12');
        expect([...container.querySelectorAll('[data-kiosk-borrowed]')].map(el => el.textContent)).toEqual(['5', '2']);
        // The second press, and the L hotkey in the active cell, change nothing more.
        fireEvent.click(lenen);
        fireEvent.keyDown(activeInput(container), { key: 'l' });
        expect(st().interaction.cells).toEqual({ b0: '4', b1: '12' });
        fireEvent.click(screen.getByRole('button', { name: '5' }));
        fireEvent.click(screen.getByRole('button', { name: '3' }));
        fireEvent.keyDown(activeInput(container), { key: 'Enter' });
        expect(st().lastCorrect).toBe(true);
    });

    test('cijferen aftrekken: the - hotkey in a cell performs Lenen and types nothing', () => {
        st().load(hashOf(starterSessie({ types: [leafType('cijferen-aftrekken-nat')] })));
        st().start();
        const exercise: CijferExercise = { id: 'x', operands: [302, 17], operator: '-', answer: 285, remainder: 0, decimalPlaces: 0, isManuallyEdited: false };
        act(() => { useOefenStore.setState({ shown: { ...st().shown!, exercise }, interaction: EMPTY_INTERACTION, activeCell: 'a2' }); });
        const { container } = render(<OefenApp />);
        const ev = fireEvent.keyDown(activeInput(container), { key: '-' });
        expect(ev).toBe(false);
        expect(st().interaction.cells).toEqual({ b0: '2', b1: '9', b2: '12' });
        expect([...container.querySelectorAll('[data-kiosk-borrowed]')].map(el => el.textContent)).toEqual(['3', '0', '2']);
    });

    // Phase C2: every fill-in family, typed through the keypad cell by cell, checked with Enter.
    test.each<[string, Record<string, unknown>]>([
        ['cijferen-aftrekken-dec', {}], ['cijferen-vermenigvuldigen-nat', {}],
        ['splitsen-basis', {}], ['splitsen-boom', {}], ['splitsen-harten', {}], ['splitsen-positietabel', {}],
        ['afronden-nat-rooster', {}], ['afronden-dec-rooster', {}], ['plaatswaarde-tabel', {}], ['plaatswaarde-tabel', { decimalPlaces: 2 }],
        ['patronen-nat', {}], ['patronen-dec', {}], ['patronen-geh', {}],
        ['getalbegrip-getallenrijen-nat', {}], ['getalbegrip-getallenrijen-rat', {}], ['getalbegrip-getallenrijen-geh', {}],
        ['getalbegrip-getallenassen-nat', {}], ['getalbegrip-getallenassen-dec', {}], ['getalbegrip-getallenassen-rat', {}],
        ['verbanden-tabel', {}], ['verbanden-paren', {}], ['procenten-verbanden', {}],
        ['patronen-kettingsommen', {}], ['patronen-kettingsommen', { blankMiddle: true, chainLength: 6, ops: ['+', '-', 'x', ':'] }],
    ])('fill-cells %s %j: keypad into the cells, Enter checks', (leafId, extra) => {
        st().load(hashOf(starterSessie({ types: [leafType(leafId, extra)] })));
        st().start();
        const { container } = render(<OefenApp />);
        for (const right of [true, false]) {
            const cur = st().shown!;
            const typeId = st().sessie!.types[0].typeId;
            const d = kioskFor(typeId)!;
            const ia = kioskInteractOf(d, cur.constraints)!;
            const keys = ia.keys!(cur.exercise, cur.constraints);
            expect([...cellInputs(container).keys()].sort(), leafId).toEqual([...keys].sort());
            expect(st().activeCell).toBe(keys.find(k => !ia.cellOf?.(k, cur.exercise, cur.constraints)?.scratch));
            const cells = rightCells(typeId, d, cur.exercise, cur.constraints);
            const spoil = keys.find(k => cells[k])!;
            if (!right) cells[spoil] = cells[spoil].replace(/\d(?!.*\d)/, dg => String((Number(dg) + 1) % 10));
            for (const k of keys) {
                if (!cells[k]) continue;
                fireEvent.focus(cellInputs(container).get(k)!);
                for (const ch of cells[k]) st().press(ch);
            }
            for (let i = 0; i <= keys.length && st().phase === 'exercise'; i++) fireEvent.keyDown(activeInput(container), { key: 'Enter' });
            expect(st().phase, leafId).toBe('feedback');
            expect(st().lastCorrect, `${leafId} ${JSON.stringify(cells)}`).toBe(right);
            // act: the next exercise may have another number of cells; the DOM must follow first.
            act(() => st().next());
        }
    });

    test('ordenen: Controleer waits for the whole row, then checks the order', () => {
        st().load(hashOf(starterSessie({ types: [leafType('getalbegrip-ordenen-nat')] })));
        st().start();
        const { container } = render(<OefenApp />);
        const n = parts(container).length;
        expect(n).toBeGreaterThan(1);
        expect(controleer().disabled).toBe(true);
        // Store writes outside a React event: act() lets the card re-render before the asserts.
        act(() => {
            tapAnswer(true);
            st().setInteraction({ ...st().interaction, order: st().interaction.order.slice(0, -1) });
        });
        expect(controleer().disabled).toBe(true);
        act(() => tapAnswer(true));
        expect(controleer().disabled).toBe(false);
        fireEvent.click(controleer());
        expect(st().lastCorrect).toBe(true);
        st().next();
        tapAnswer(false);
        st().answer();
        expect(st().lastCorrect).toBe(false);
    });

    test('a non-interactive card stays inert and has no tappable parts', () => {
        st().load(hashOf(starterSessie({ types: [leafType('even-oneven-cirkels')] })));
        st().start();
        const { container } = render(<OefenApp />);
        expect(container.querySelector('.kiosk-card-inner')!.hasAttribute('inert')).toBe(true);
        expect(parts(container)).toHaveLength(0);
    });

    test('fill-cells: the keypad types into the active cell', () => {
        // No viewer fills cells yet (C2); a stand-in descriptor proves the store routing.
        const def = REGISTRY['even-oneven'];
        const real = def.kiosk;
        const fake: KioskDescriptor = {
            input: 'interactive', keys: () => [','], display: () => '?', answerOf: () => ['12 · 4'],
            interact: {
                kind: 'fill-cells', keys: () => ['a', 'b'], answerOf: () => '12 · 4',
                fromState: s => (s.cells.a && s.cells.b ? `${s.cells.a} · ${s.cells.b}` : ''),
            },
        };
        def.kiosk = fake;
        try {
            st().load(hashOf(starterSessie({ types: [leafType('even-oneven-rooster')] })));
            st().start();
            render(<OefenApp />);
            expect(screen.getByRole('group', { name: 'Cijfers' })).toBeTruthy();
            // The keypad starts in the first cell.
            expect(st().activeCell).toBe('a');
            st().press('1'); st().press('2');
            st().focusCell('b'); st().press('3'); st().press('back'); st().press('x'); st().press('4');
            expect(st().interaction.cells).toEqual({ a: '12', b: '4' });
            st().answer();
            expect(st().lastCorrect).toBe(true);
        } finally {
            def.kiosk = real;
        }
    });
});
