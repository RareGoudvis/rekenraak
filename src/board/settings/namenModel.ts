import { useSyncExternalStore } from 'react';
import { NAMES_KEY } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

// ── The class list (app-wide, rekenraak_board_names_v1), shared by namenkiezer + groepjesmaker ──
// Writes go through saveClassList so every widget showing the list re-renders at once.
const listeners = new Set<() => void>();
let snapshot: { raw: string; list: string[] } | null = null;

export function saveClassList(names: string[]): void {
    try { localStorage.setItem(NAMES_KEY, names.join('\n')); } catch { /* quota: the list stays as it was */ }
    listeners.forEach(l => l());
}

function subscribe(l: () => void) {
    listeners.add(l);
    return () => { listeners.delete(l); };
}

// Raw lines (an empty row being typed stays put); readers that draw names run cleanNames.
// Re-reads the key every time (a write from elsewhere is never missed); the array only
// changes identity when the stored text did.
function getSnapshot(): string[] {
    const raw = localStorage.getItem(NAMES_KEY) ?? '';
    if (snapshot?.raw !== raw) snapshot = { raw, list: raw ? raw.split('\n') : [] };
    return snapshot.list;
}

export function useClassList(): string[] {
    return useSyncExternalStore(subscribe, getSnapshot);
}

export const cleanNames = (list: string[]) => list.map(s => s.trim()).filter(Boolean);
export const sortNames = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b, 'nl', { sensitivity: 'base' }));

// ── Namenkiezer props ──
export type NamenSource = 'klas' | 'eigen';
export interface NamenProps {
    source: NamenSource;       // the shared class list, or this card's own list
    names: string[];           // own list (source 'eigen')
    mode: 'een' | 'rad';       // flash a name (today) or spin a wheel
    count: number;             // names per pick, 1-5 ('een' mode)
    noRepeat: boolean;         // skip picked names until everyone had a turn (today's behaviour)
    showPicked: boolean;
    animate: boolean;
    picked: string[];
    current: string[];         // the last pick, kept across a reload
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []);

export function namenProps(widget: BoardWidget): NamenProps {
    const p = widget.props ?? {};
    return {
        source: p.source === 'eigen' ? 'eigen' : 'klas',
        names: strings(p.names),
        mode: p.mode === 'rad' ? 'rad' : 'een',
        count: Number.isInteger(p.count) ? Math.min(5, Math.max(1, p.count as number)) : 1,
        noRepeat: p.noRepeat !== false,
        showPicked: p.showPicked === true,
        animate: p.animate !== false,
        picked: strings(p.picked),
        current: strings(p.current),
    };
}

// The names a pick draws from: the remaining ones when skipping picked names.
export function namePool(all: string[], picked: string[], noRepeat: boolean): string[] {
    if (!noRepeat) return all;
    const left = all.filter(n => !picked.includes(n));
    return left.length ? left : all;
}

// Draws `count` different names; once everyone had a turn the round starts over (today's rule).
export function pickNames(all: string[], picked: string[], count: number, noRepeat: boolean, rnd = Math.random): { chosen: string[]; picked: string[] } {
    if (!all.length) return { chosen: [], picked };
    let done = noRepeat ? picked.filter(n => all.includes(n)) : [];
    let pool = noRepeat ? all.filter(n => !done.includes(n)) : [...all];
    if (pool.length < Math.min(count, all.length)) { done = []; pool = [...all]; }
    const chosen: string[] = [];
    while (chosen.length < count && pool.length) {
        chosen.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    }
    return { chosen, picked: noRepeat ? [...done, ...chosen] : picked };
}
