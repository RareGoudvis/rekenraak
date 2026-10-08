import type { BoardWidget } from '../boardTypes';
import { isObj, int, oneOf, bool, color } from './shared';

// ── Positietabel ─────────────────────────────────────────────────────────────
export type PlaceGroup = 'miljarden' | 'miljoenen' | 'duizenden' | 'eenheden' | 'decimalen';
export interface PlaceColumn { key: string; label: string; name: string; group: PlaceGroup; exp: number; }
// Keys D/H/T/E/t/h are what boards saved before; 'd' (duizendste) ≠ 'D' (duizendtal).
export const POSITIE_PLAATSEN: readonly PlaceColumn[] = [
    { key: 'Mrd', label: 'Mrd', name: 'miljard', group: 'miljarden', exp: 9 },
    { key: 'HM', label: 'HM', name: 'honderdmiljoen', group: 'miljoenen', exp: 8 },
    { key: 'TM', label: 'TM', name: 'tienmiljoen', group: 'miljoenen', exp: 7 },
    { key: 'M', label: 'M', name: 'miljoen', group: 'miljoenen', exp: 6 },
    { key: 'HD', label: 'HD', name: 'honderdduizend', group: 'duizenden', exp: 5 },
    { key: 'TD', label: 'TD', name: 'tienduizend', group: 'duizenden', exp: 4 },
    { key: 'D', label: 'D', name: 'duizendtal', group: 'duizenden', exp: 3 },
    { key: 'H', label: 'H', name: 'honderdtal', group: 'eenheden', exp: 2 },
    { key: 'T', label: 'T', name: 'tiental', group: 'eenheden', exp: 1 },
    { key: 'E', label: 'E', name: 'eenheid', group: 'eenheden', exp: 0 },
    { key: 't', label: 't', name: 'tiende', group: 'decimalen', exp: -1 },
    { key: 'h', label: 'h', name: 'honderdste', group: 'decimalen', exp: -2 },
    { key: 'd', label: 'd', name: 'duizendste', group: 'decimalen', exp: -3 },
];
export const PLACE_GROUPS: readonly PlaceGroup[] = ['miljarden', 'miljoenen', 'duizenden', 'eenheden', 'decimalen'];
// Salmon = the worksheet place-value header tint; the group tints follow the classic klassen-chart.
export const SALMON = '#f4cbb8';
export const DEFAULT_GROUP_COLORS: Record<PlaceGroup, string> = {
    miljarden: '#d8b4fe', miljoenen: '#93c5fd', duizenden: '#86efac', eenheden: '#fde047', decimalen: '#fca5a5',
};
export interface PositietabelProps {
    columns: string[];         // keys, always in POSITIE_PLAATSEN order
    rows: number;
    header: 'afkorting' | 'naam' | 'beide' | 'geen';
    showGroups: boolean;       // extra row: miljoenen | duizenden | eenheden
    colorMode: 'zalm' | 'groepen' | 'geen';
    groupColors: Record<PlaceGroup, string>;
    number: string;            // pre-filled in row 1 ('' = empty table)
    editable: boolean;         // cells take typed digits
    cells: Record<string, string>;   // `${row}:${key}` → one digit
    digitSize: number;         // px
}
export function positietabelProps(widget: BoardWidget): PositietabelProps {
    const p = widget.props ?? {};
    const picked = Array.isArray(p.columns) ? p.columns.filter((c): c is string => typeof c === 'string') : [];
    const columns = POSITIE_PLAATSEN.filter(k => picked.includes(k.key)).map(k => k.key);
    const gc = isObj(p.groupColors) ? p.groupColors : {};
    const cells: Record<string, string> = {};
    if (isObj(p.cells)) for (const [k, v] of Object.entries(p.cells)) if (typeof v === 'string' && /^\d:\w{1,3}$/.test(k) && v.length <= 2) cells[k] = v;
    return {
        columns: columns.length ? columns : ['H', 'T', 'E'],
        rows: int(p.rows, 3, 1, 8),
        header: oneOf(p.header, ['afkorting', 'naam', 'beide', 'geen'] as const, 'afkorting'),
        showGroups: bool(p.showGroups, false),
        colorMode: oneOf(p.colorMode, ['zalm', 'groepen', 'geen'] as const, 'zalm'),
        groupColors: Object.fromEntries(PLACE_GROUPS.map(g => [g, color(gc[g], DEFAULT_GROUP_COLORS[g])])) as Record<PlaceGroup, string>,
        number: typeof p.number === 'string' && /^\d{0,10}([.,]\d{0,3})?$/.test(p.number.trim()) ? p.number.trim().replace('.', ',') : '',
        editable: bool(p.editable, false),
        cells,
        digitSize: int(p.digitSize, 20, 14, 48),
    };
}

// The digit a pre-filled number puts in one place column ('' when the number has no digit there).
export function digitAt(number: string, exp: number): string {
    if (!number) return '';
    const [intPart, dec = ''] = number.split(',');
    if (exp >= 0) {
        const i = intPart.length - 1 - exp;
        return i >= 0 ? intPart[i] : '';
    }
    return dec[-exp - 1] ?? '';
}
