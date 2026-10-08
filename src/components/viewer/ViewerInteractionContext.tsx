import { createContext, useContext, type KeyboardEvent } from 'react';

// Oefenmodus Phase C: the pupil answers ON the exercise (tap a number, fill a cell, order
// chips). The sheet, thumbnails and previews have no provider, so the context is null there
// and every helper below returns nothing: a viewer renders byte-identical DOM on paper
// (viewers.interaction.test.tsx + the visual gate prove it). Only the kiosk card provides it.

// tap = pick one part · tap-multi = toggle any number of parts · fill-cells = type into the
// viewer's own blanks · order = tap parts in sequence (1st, 2nd, …).
export type InteractionKind = 'tap' | 'tap-multi' | 'fill-cells' | 'order';

export interface InteractionState {
    // tap / tap-multi: the keys of the picked parts (tap holds at most one).
    selected: string[];
    // fill-cells: what the pupil typed per cell key.
    cells: Record<string, string>;
    // order: keys in the sequence the pupil tapped them.
    order: string[];
}

export const EMPTY_INTERACTION: InteractionState = { selected: [], cells: {}, order: [] };

export interface ViewerInteraction {
    kind: InteractionKind;
    state: InteractionState;
    set(next: InteractionState): void;
    // fill-cells: the cell the keypad types into, and how a tap on a cell makes it active.
    activeCell?: string | null;
    focusCell?(key: string): void;
    // fill-cells: what a physical keyboard typed into a cell (the kiosk sanitises it and may move
    // on to the next cell); absent = the raw text goes straight into the state.
    typeCell?(key: string, raw: string): void;
}

const ViewerInteractionContext = createContext<ViewerInteraction | null>(null);

export const ViewerInteractionProvider = ViewerInteractionContext.Provider;

export function useViewerInteraction(): ViewerInteraction | null {
    return useContext(ViewerInteractionContext);
}

/** The state after tapping `key`: tap replaces, tap-multi toggles, order appends (tapping an ordered part takes it and every later one out). */
export function toggled(kind: InteractionKind, state: InteractionState, key: string): InteractionState {
    if (kind === 'tap') return { ...state, selected: state.selected[0] === key ? [] : [key] };
    if (kind === 'tap-multi') {
        const on = state.selected.includes(key);
        return { ...state, selected: on ? state.selected.filter(k => k !== key) : [...state.selected, key] };
    }
    if (kind === 'order') {
        // The parts after it were placed relative to it, so they go too: the pupil redoes the tail.
        const at = state.order.indexOf(key);
        return { ...state, order: at >= 0 ? state.order.slice(0, at) : [...state.order, key] };
    }
    return state;
}

// What a viewer part serves: 'tap' parts answer tap and tap-multi, 'order' parts answer order.
// A part asked for in another kind of context stays plain, so a viewer can mark its numbers
// once and only the descriptor's kind decides whether they become buttons.
export type InteractionPart = 'tap' | 'order';

const serves = (part: InteractionPart, kind: InteractionKind) =>
    part === 'order' ? kind === 'order' : kind === 'tap' || kind === 'tap-multi';

export interface InteractionDomProps {
    role?: 'button';
    tabIndex?: number;
    'aria-pressed'?: boolean;
    'data-kiosk-key'?: string;
    'data-kiosk-selected'?: 'true';
    'data-kiosk-order'?: number;
    onClick?(): void;
    onKeyDown?(e: KeyboardEvent): void;
}

/** DOM props that make one part of a viewer tappable in the kiosk; `{}` on the sheet. */
export function interactionProps(ctx: ViewerInteraction | null, key: string, part: InteractionPart = 'tap'): InteractionDomProps {
    if (!ctx || !serves(part, ctx.kind)) return {};
    const toggle = () => ctx.set(toggled(ctx.kind, ctx.state, key));
    const at = ctx.state.order.indexOf(key);
    const on = part === 'order' ? at >= 0 : ctx.state.selected.includes(key);
    return {
        role: 'button',
        tabIndex: 0,
        'aria-pressed': on,
        'data-kiosk-key': key,
        ...(on && { 'data-kiosk-selected': 'true' as const }),
        // The kiosk CSS prints this number beside an ordered part (1, 2, 3 …).
        ...(part === 'order' && at >= 0 && { 'data-kiosk-order': at + 1 }),
        onClick: toggle,
        onKeyDown: (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            // preventDefault also tells the kiosk's window key handler this Enter was a tap, not Controleer.
            e.preventDefault();
            toggle();
        },
    };
}

export interface CellDomProps {
    value: string;
    inputMode: 'none';
    autoComplete: 'off';
    'aria-label': string;
    'data-kiosk-key': string;
    'data-kiosk-cell': 'true';
    'data-kiosk-active'?: 'true';
    onChange(e: { target: { value: string } }): void;
    onFocus(): void;
}

// Keeps what a cell may hold: digits, a comma (a '.' types as ','), a minus, a fraction slash.
const cellText = (raw: string) => raw.replace(/\./g, ',').replace(/[^\d,\-−/]/g, '').slice(0, 12);

/** Props for the `<input>` a viewer draws in place of a blank in the kiosk; `{}` on the sheet. */
export function cellProps(ctx: ViewerInteraction | null, key: string): CellDomProps | Record<string, never> {
    if (!ctx || ctx.kind !== 'fill-cells') return {};
    return {
        value: ctx.state.cells[key] ?? '',
        // The kiosk keypad is the touch input (like its own number fields); a physical keyboard still types.
        inputMode: 'none',
        autoComplete: 'off',
        'aria-label': 'Vul in',
        'data-kiosk-key': key,
        'data-kiosk-cell': 'true',
        ...(ctx.activeCell === key && { 'data-kiosk-active': 'true' as const }),
        onChange: (e) => (ctx.typeCell
            ? ctx.typeCell(key, e.target.value)
            : ctx.set({ ...ctx.state, cells: { ...ctx.state.cells, [key]: cellText(e.target.value) } })),
        onFocus: () => ctx.focusCell?.(key),
    };
}
