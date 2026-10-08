// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, cleanup, fireEvent, screen } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import {
    EMPTY_INTERACTION, ViewerInteractionProvider, built, builtCount,
    type BuildEntry, type InteractionKind, type InteractionState,
} from '../components/viewer/ViewerInteractionContext';
import type { MathBlock } from '../services/math/types';
import type { KioskPiece, OefenType } from '../services/oefenen/types';
import OefenApp from '../oefenen/OefenApp';
import { currentInput, useOefenStore } from '../oefenen/useOefenStore';
import { kioskFor, kioskInteractOf } from '../services/oefenen/kiosk';
import { makeBlock } from './helpers/makeBlock';
import { hashOf, resetKiosk, starterSessie } from './helpers/oefenKiosk';
import { makeDraftBlock } from '../components/curriculum/draftBlock';

// Phase C3 (Oefenmodus 'build'): the pupil lays coins / MAB blocks from the kiosk tray and the
// card's viewer draws what was laid. Without the build context the viewers stay the sheet's.

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

function oneExercise(typeId: string, constraints?: Record<string, unknown>): MathBlock {
    const def = REGISTRY[typeId];
    const block = makeBlock(typeId, { constraints });
    (block as unknown as Record<string, unknown>)[def.exerciseField] = def.generate(block).slice(0, 1);
    return block;
}

const render340 = (block: MathBlock, ctx: { kind: InteractionKind; state: InteractionState } | null) => {
    const { Viewer } = EXERCISE_UI[block.typeId];
    return render(
        <BlockWidthProvider value={340}>
            <ViewerInteractionProvider value={ctx && { ...ctx, set: () => { } }}><Viewer block={block} showSolutions={false} /></ViewerInteractionProvider>
        </BlockWidthProvider>,
    );
};

describe('built / builtCount', () => {
    test('lay, take back, never below 0 or above max, zero counts drop out', () => {
        let s = built(EMPTY_INTERACTION, 'T', 1, 9);
        s = built(s, 'E', 1, 9);
        s = built(s, 'T', 1, 9);
        expect(s.build).toEqual([{ key: 'T', count: 2 }, { key: 'E', count: 1 }]);
        s = built(s, 'E', -1);
        expect(s.build).toEqual([{ key: 'T', count: 2 }]);
        expect(built(s, 'E', -1).build).toEqual([{ key: 'T', count: 2 }]);
        for (let i = 0; i < 12; i++) s = built(s, 'T', 1, 9);
        expect(builtCount(s, 'T')).toBe(9);
    });
});

describe('viewers draw the laid pieces only under a build context', () => {
    const LAID: Record<string, BuildEntry[]> = {
        'geld-tekenen': [{ key: '200', count: 2 }, { key: '50', count: 1 }, { key: '1000', count: 1 }],
        'geld-wissel': [{ key: '200', count: 2 }, { key: '100', count: 1 }],
        'mab-tekenen': [{ key: 'T', count: 3 }, { key: 'E', count: 4 }],
        'geld-teruggeven': [{ key: '1000', count: 1 }, { key: '20', count: 2 }],
    };
    // geld-teruggeven only lays the change when the sheet has a draw box for it.
    const SETTINGS: Record<string, Record<string, unknown>> = { 'geld-teruggeven': { antwoordType: 'tekenen-schrijven' } };
    test.each(Object.keys(LAID))('%s', (typeId) => {
        const block = oneExercise(typeId, SETTINGS[typeId]);
        const sheet = render340(block, null);
        const sheetHtml = sheet.container.innerHTML;
        const sheetSvgs = sheet.container.querySelectorAll('svg').length;
        sheet.unmount();
        // Another kind of context leaves the viewer as on paper.
        const tap = render340(block, { kind: 'tap', state: { ...EMPTY_INTERACTION, build: LAID[typeId] } });
        expect(tap.container.innerHTML).toBe(sheetHtml);
        tap.unmount();
        const empty = render340(block, { kind: 'build', state: EMPTY_INTERACTION });
        expect(empty.container.querySelectorAll('svg').length).toBe(typeId === 'mab-tekenen' ? 0 : sheetSvgs);
        empty.unmount();
        const laid = render340(block, { kind: 'build', state: { ...EMPTY_INTERACTION, build: LAID[typeId] } });
        const pieces = LAID[typeId].reduce((n, b) => n + b.count, 0);
        expect(laid.container.querySelectorAll('svg').length).toBe(sheetSvgs + pieces);
        // The viewer only draws: the tray is the input, the card has no buttons of its own.
        expect(laid.container.querySelector('[role="button"], button')).toBeNull();
    });

    test('geld-tekenen verdeeld: euros above, cents below', () => {
        const block = oneExercise('geld-tekenen', { scaffolding: 'verdeeld' });
        const { container } = render340(block, { kind: 'build', state: { ...EMPTY_INTERACTION, build: [{ key: '20', count: 2 }, { key: '500', count: 1 }] } });
        const rows = [...container.querySelectorAll('span')].filter(s => s.textContent === '€' || s.textContent === 'cent').map(s => s.parentElement!);
        expect(rows.map(r => r.querySelectorAll('svg').length)).toEqual([1, 2]);
    });
});

// A session row for a sidebar leaf at its sidebar defaults, as the builder makes it.
function leafType(leafId: string, extra: Record<string, unknown> = {}): OefenType {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    const constraints = makeDraftBlock(leaf.typeId, { ...leaf.defaultConstraints, ...extra }).constraints as Record<string, unknown>;
    return { typeId: leaf.typeId, leafId, label: leafId, constraints, limit: 3, weight: 1 };
}

// Largest pieces first within each piece's max: the default trays (every coin, D/H/T/E) make any value this way.
function greedy(target: number, pieces: KioskPiece[]): BuildEntry[] {
    let rest = target;
    const out: BuildEntry[] = [];
    for (const p of [...pieces].sort((a, b) => b.value - a.value)) {
        const count = Math.min(p.max ?? Infinity, Math.floor(rest / p.value));
        if (count > 0) { out.push({ key: p.key, count }); rest -= count * p.value; }
    }
    expect(rest).toBe(0);
    return out;
}

const tile = (key: string) => document.querySelector<HTMLButtonElement>(`[data-tray-key="${key}"]`)!;
const controleer = () => screen.getByRole('button', { name: 'Controleer' }) as HTMLButtonElement;
const wissen = () => screen.getByRole('button', { name: 'Wissen' }) as HTMLButtonElement;
const cardSvgs = (c: HTMLElement) => c.querySelectorAll('.kiosk-card-inner svg').length;

describe('kiosk flow: lay the answer from the tray', () => {
    test.each<[string, Record<string, unknown>]>([
        ['geld-tekenen', {}], ['geld-wissel', {}], ['mab-tekenen', {}], ['geld-teruggeven', { antwoordType: 'tekenen-schrijven' }],
    ])('%s %j: tap tiles, take back, Wissen, juist / fout', (leafId, extra) => {
        st().load(hashOf(starterSessie({ types: [leafType(leafId, extra)], attempts: 2 })));
        st().start();
        const { container } = render(<OefenApp />);
        const cur = st().shown!;
        const typeId = st().sessie!.types[0].typeId;
        const ia = kioskInteractOf(kioskFor(typeId)!, cur.constraints)!;
        const pieces = currentInput(st().sessie, cur)!.pieces!;
        expect(pieces).toEqual(ia.pieces!(cur.exercise, cur.constraints));
        // The tray replaces the keypad; one tile per piece, none of them laid yet.
        expect(screen.queryByRole('group', { name: 'Cijfers' })).toBeNull();
        expect(container.querySelectorAll('[data-tray-key]')).toHaveLength(pieces.length);
        expect(controleer().disabled).toBe(true);
        expect(wissen().disabled).toBe(true);
        const before = cardSvgs(container);

        const right = greedy(Number(ia.answerOf(cur.exercise, cur.constraints)), pieces);
        for (const b of right) for (let i = 0; i < b.count; i++) fireEvent.click(tile(b.key));
        const laidCount = right.reduce((n, b) => n + b.count, 0);
        expect(cardSvgs(container)).toBe(before + laidCount);
        expect(controleer().disabled).toBe(false);
        // The badge shows the count and takes one back; Backspace takes back the newest kind.
        const first = right[0];
        const badge = screen.getByRole('button', { name: `Eén ${pieces.find(p => p.key === first.key)!.label} terugnemen` });
        expect(badge.textContent).toBe(`−${first.count}`);
        fireEvent.click(badge);
        expect(builtCount(st().interaction, first.key)).toBe(first.count - 1);
        fireEvent.click(tile(first.key));
        const newest = st().interaction.build[st().interaction.build.length - 1];
        fireEvent.keyDown(window, { key: 'Backspace' });
        expect(builtCount(st().interaction, newest.key)).toBe(newest.count - 1);
        fireEvent.click(tile(newest.key));
        // Wissen empties the card; lay it again and check.
        fireEvent.click(wissen());
        expect(st().interaction.build).toEqual([]);
        expect(cardSvgs(container)).toBe(before);
        for (const b of right) for (let i = 0; i < b.count; i++) fireEvent.click(tile(b.key));
        fireEvent.click(controleer());
        expect(st().lastCorrect).toBe(true);
        expect(st().run!.stats.perType[0].correct).toBe(1);

        // Next exercise: an empty tray; one piece too many (or, at a full place, too few) is fout,
        // the retry starts empty again. The tray can differ per exercise (the note paid with).
        act(() => st().next());
        expect(st().interaction).toEqual(EMPTY_INTERACTION);
        const nxt = st().shown!;
        const want = Number(ia.answerOf(nxt.exercise, nxt.constraints));
        const nextPieces = ia.pieces!(nxt.exercise, nxt.constraints);
        const smallest = [...nextPieces].sort((a, b) => a.value - b.value)[0].key;
        const layWrong = () => {
            for (const b of greedy(want, nextPieces)) for (let i = 0; i < b.count; i++) fireEvent.click(tile(b.key));
            if (tile(smallest).disabled) fireEvent.click(screen.getAllByRole('button', { name: /terugnemen$/ })[0]);
            else fireEvent.click(tile(smallest));
        };
        layWrong();
        fireEvent.click(controleer());
        expect(st().phase).toBe('retry');
        act(() => st().skipFlash());
        expect(st().interaction.build).toEqual([]);
        layWrong();
        fireEvent.click(controleer());
        expect(st().lastCorrect).toBe(false);
        const err = st().run!.stats.perType[0].errors[0];
        // Stats show money as money (€ 7,05), MAB as the number.
        expect(err.expected).toBe(ia.show ? ia.show(String(want), nxt.exercise, nxt.constraints) : String(want));
        expect(err.given).not.toBe(err.expected);
    });

    test('mab-tekenen: a place stops at nine blocks', () => {
        st().load(hashOf(starterSessie({ types: [leafType('mab-tekenen')] })));
        st().start();
        render(<OefenApp />);
        for (let i = 0; i < 12; i++) fireEvent.click(tile('E'));
        expect(builtCount(st().interaction, 'E')).toBe(9);
        expect(tile('E').disabled).toBe(true);
    });

    test('geld-wissel: the shown note is not in the tray', () => {
        st().load(hashOf(starterSessie({ types: [leafType('geld-wissel', { exerciseBills: [1000] })] })));
        st().start();
        render(<OefenApp />);
        expect(tile('1000')).toBeNull();
        expect([...document.querySelectorAll<HTMLElement>('[data-tray-key]')].map(t => t.dataset.trayKey)).toEqual(['500', '200', '100', '50', '20', '10']);
    });
});

describe('geld-teruggeven stays typed without a draw box', () => {
    test('euro + cent fields and the keypad, no tray', () => {
        st().load(hashOf(starterSessie({ types: [leafType('geld-teruggeven')] })));
        st().start();
        const { container } = render(<OefenApp />);
        expect(currentInput(st().sessie, st().shown)!.kind).toBe('multi-number');
        expect(container.querySelector('[data-tray-key]')).toBeNull();
        expect(screen.getByRole('group', { name: 'Cijfers' })).toBeTruthy();
    });
});
