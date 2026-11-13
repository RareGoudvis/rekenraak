import { createContext, useContext, type KeyboardEvent } from 'react';

// Oefenmodus Phase C: the pupil answers ON the exercise (tap a number, fill a cell, order
// chips). The sheet, thumbnails and previews have no provider, so the context is null there
// and every helper below returns nothing: a viewer renders byte-identical DOM on paper
// (viewers.interaction.test.tsx + the visual gate prove it). Only the kiosk card provides it.

// tap = pick one part · tap-multi = toggle any number of parts · fill-cells = type into the
// viewer's own blanks · order = tap parts in sequence (1st, 2nd, …) · build = lay pieces from
// the kiosk's tray (coins, MAB blocks); the viewer only draws what was laid · drag = move a handle
// on an SVG figure (a clock hand, the mercury, a needle) with the pointer or the arrow keys (kioskDrag.ts).
export type InteractionKind = 'tap' | 'tap-multi' | 'fill-cells' | 'order' | 'build' | 'drag';

// build: how many of one tray piece the pupil laid. Entries keep the order they were first laid in.
export interface BuildEntry {
    key: string;
    count: number;
}

export interface InteractionState {
    // tap / tap-multi: the keys of the picked parts (tap holds at most one).
    selected: string[];
    // fill-cells: what the pupil typed per cell key.
    cells: Record<string, string>;
    // order: keys in the sequence the pupil tapped them.
    order: string[];
    // build: the pieces laid from the tray (no zero counts).
    build: BuildEntry[];
    // fill-cells: marks a keypad action key left on parts of the card, by part key (cijferen
    // Lenen: 'lent' / 'got' per exchanged column). Absent = none; the answer never reads them.
    marks?: Record<string, string>;
    // drag: the value each handle stands on (handle key → value); absent = nothing dragged yet.
    drag?: Record<string, number>;
    // groups: the pupil's own groups of the card's objects (breuk van een hoeveelheid); absent = none yet.
    groups?: GroupWork;
}

// The pupil builds groups by tapping objects, then colours whole groups. Built in the order made,
// never sorted, so a group keeps its number (and colour) while the pupil works.
export interface GroupWork {
    // Object keys per group; only the active group may be empty (a new one, or all its objects taken out).
    members: string[][];
    // The group a tap on an object goes into; null = none picked (a tap on a free object starts one).
    active: number | null;
    // 'group' = a tap puts an object in (or takes it out of) a group; 'colour' = a tap fills or clears its whole group.
    mode: 'group' | 'colour';
    // Indices into `members` that are coloured.
    colored: number[];
}

export const EMPTY_GROUPS: GroupWork = { members: [], active: null, mode: 'group', colored: [] };

const groupsOf = (state: InteractionState): GroupWork => state.groups ?? EMPTY_GROUPS;

/** The index of the group holding object `key`, or -1. */
export const groupOf = (work: GroupWork, key: string): number => work.members.findIndex(m => m.includes(key));

// Empty groups other than the active one go and the numbers close up (1..n), so the pupil never
// meets a stray empty "Groepje 5"; active and colour follow their group.
function compacted(work: GroupWork): GroupWork {
    const keep = work.members.flatMap((m, g) => (m.length || g === work.active ? [g] : []));
    if (keep.length === work.members.length) return work;
    const at = (g: number) => keep.indexOf(g);
    return {
        ...work,
        members: keep.map(g => work.members[g]),
        active: work.active === null ? null : at(work.active),
        colored: work.colored.filter(g => keep.includes(g)).map(at),
    };
}

const withGroups = (state: InteractionState, work: GroupWork): InteractionState => ({ ...state, groups: compacted(work) });

/** The state after tapping object `key`. 'group' mode: a free object joins the active group (none picked: it starts a new one), an object of the active group leaves it, an object of another group moves to the active group (none picked: its group becomes the active one). 'colour' mode: its group is filled or cleared. */
export function groupTapped(state: InteractionState, key: string): InteractionState {
    const work = groupsOf(state);
    const at = groupOf(work, key);
    if (work.mode === 'colour') {
        if (at < 0) return state;
        const colored = work.colored.includes(at) ? work.colored.filter(g => g !== at) : [...work.colored, at];
        return { ...state, groups: { ...work, colored } };
    }
    if (at >= 0 && work.active === null) return withGroups(state, { ...work, active: at });
    if (at >= 0 && at === work.active) return withGroups(state, { ...work, members: work.members.map((m, g) => (g === at ? m.filter(k => k !== key) : m)) });
    const active = work.active ?? work.members.length;
    const members = (active < work.members.length ? work.members : [...work.members, []])
        .map((m, g) => (g === active ? [...m, key] : g === at ? m.filter(k => k !== key) : m));
    return withGroups(state, { ...work, members, active });
}

/** A group chip tapped: that group takes the next taps (an empty group left behind goes). */
export function groupChosen(state: InteractionState, group: number): InteractionState {
    const work = groupsOf(state);
    if (group < 0 || group >= work.members.length) return state;
    return withGroups(state, { ...work, mode: 'group', active: group });
}

/** "Nieuw groepje": a new empty group takes the next taps (an empty active group is reused). */
export function groupStarted(state: InteractionState): InteractionState {
    const work = groupsOf(state);
    if (work.mode === 'group' && work.active !== null && work.members[work.active]?.length === 0) return state;
    return withGroups(state, { ...work, mode: 'group', members: [...work.members, []], active: work.members.length });
}

/** "Klaar met groepjes": empty groups go (their numbers close up), and taps now colour whole groups. */
export function groupsDone(state: InteractionState): InteractionState {
    return { ...state, groups: { ...compacted({ ...groupsOf(state), active: null }), mode: 'colour' } };
}

/** Back from colouring to building: no group picked until the pupil taps a chip or an object. */
export function groupsEdited(state: InteractionState): InteractionState {
    return { ...state, groups: { ...groupsOf(state), mode: 'group', active: null } };
}

/** "Opnieuw": every group and colour gone (typed cells stay). */
export function groupsCleared(state: InteractionState): InteractionState {
    return { ...state, groups: undefined };
}

export const EMPTY_INTERACTION: InteractionState = { selected: [], cells: {}, order: [], build: [] };

/** How many of piece `key` are laid. */
export const builtCount = (state: InteractionState, key: string): number => state.build.find(b => b.key === key)?.count ?? 0;

/** The state after laying one more (`delta` 1) or taking one back (-1) of piece `key`, never past 0 or `max`. */
export function built(state: InteractionState, key: string, delta: number, max = Infinity): InteractionState {
    const count = Math.max(0, Math.min(max, builtCount(state, key) + delta));
    const has = state.build.some(b => b.key === key);
    const build = has ? state.build.map(b => (b.key === key ? { key, count } : b)) : [...state.build, { key, count }];
    return { ...state, build: build.filter(b => b.count > 0) };
}

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
    // A checked answer marked this cell wrong (marks[key] = 'wrong'); typing in it clears the mark.
    'data-kiosk-wrong'?: 'true';
    onChange(e: { target: { value: string } }): void;
    onFocus(): void;
}

// Keeps what a cell may hold: digits, a comma (a '.' types as ','), a minus, a fraction slash.
const cellText = (raw: string) => raw.replace(/\./g, ',').replace(/[^\d,\-−/]/g, '').slice(0, 12);

/** Props for the `<input>` a viewer draws in place of a blank in the kiosk; `{}` on the sheet. `label` names the cell for a screen reader. */
export function cellProps(ctx: ViewerInteraction | null, key: string, label = 'Vul in'): CellDomProps | Record<string, never> {
    if (!ctx || ctx.kind !== 'fill-cells') return {};
    return {
        value: ctx.state.cells[key] ?? '',
        // The kiosk keypad is the touch input (like its own number fields); a physical keyboard still types.
        inputMode: 'none',
        autoComplete: 'off',
        'aria-label': label,
        'data-kiosk-key': key,
        'data-kiosk-cell': 'true',
        ...(ctx.activeCell === key && { 'data-kiosk-active': 'true' as const }),
        ...(ctx.state.marks?.[key] === 'wrong' && { 'data-kiosk-wrong': 'true' as const }),
        onChange: (e) => (ctx.typeCell
            ? ctx.typeCell(key, e.target.value)
            : ctx.set({ ...ctx.state, cells: { ...ctx.state.cells, [key]: cellText(e.target.value) } })),
        onFocus: () => ctx.focusCell?.(key),
    };
}

// Group tints in kiosk.css (--kiosk-group-0 …); past the last one they repeat, the number inside tells groups apart.
export const GROUP_TINTS = 6;

export interface GroupPartDomProps {
    role: 'button';
    tabIndex: number;
    'aria-label': string;
    'data-kiosk-key': string;
    'data-kiosk-obj': 'true';
    'data-kiosk-group'?: number;
    'data-kiosk-colored'?: 'true';
    onClick(): void;
    onKeyDown(e: KeyboardEvent): void;
}

/** DOM props for one object the pupil groups and colours (breuk van een hoeveelheid); `{}` without a context. `label` is its spoken name. */
export function groupPartProps(ctx: ViewerInteraction | null, key: string, label: string): GroupPartDomProps | Record<string, never> {
    if (!ctx) return {};
    const work = groupsOf(ctx.state);
    const at = groupOf(work, key);
    const tap = () => ctx.set(groupTapped(ctx.state, key));
    const colored = at >= 0 && work.colored.includes(at);
    return {
        role: 'button',
        tabIndex: 0,
        'aria-label': at < 0 ? label : `${label}, groepje ${at + 1}${colored ? ', gekleurd' : ''}`,
        'data-kiosk-key': key,
        'data-kiosk-obj': 'true',
        ...(at >= 0 && { 'data-kiosk-group': at % GROUP_TINTS }),
        ...(colored && { 'data-kiosk-colored': 'true' as const }),
        onClick: tap,
        onKeyDown: (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            // As interactionProps: the kiosk's window handler must not read this Enter as Controleer.
            e.preventDefault();
            tap();
        },
    };
}

/** `data-kiosk-borrowed` on a printed digit whose column was exchanged by the kiosk's Lenen key (kiosk.css strikes it); `{}` on the sheet. */
export function borrowedProps(ctx: ViewerInteraction | null, key: string): { 'data-kiosk-borrowed'?: 'true' } {
    return ctx?.state.marks?.[key] ? { 'data-kiosk-borrowed': 'true' } : {};
}
