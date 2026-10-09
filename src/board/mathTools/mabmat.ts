import type { BoardWidget } from '../boardTypes';
import { formatMathNumber } from '../../services/math/formatters';
import { isObj, num, int, oneOf, bool, color } from './shared';

// ── MAB-mat ──────────────────────────────────────────────────────────────────
export type MabKey = 'd' | 'h' | 't' | 'e';
export const MAB_KEYS: readonly MabKey[] = ['d', 'h', 't', 'e'];
export const MAB_VALUE: Record<MabKey, number> = { d: 1000, h: 100, t: 10, e: 1 };
export const MAB_LABEL: Record<MabKey, string> = { d: 'D', h: 'H', t: 'T', e: 'E' };
// Highest count a column draws legibly (2 full tens of blocks).
export const MAB_MAX = 20;
export interface MabMatProps {
    places: MabKey[];
    mabStyle: 'mab-color' | 'mab-bw' | 'symbolic';
    colorScheme: 'standaard' | 'eigen';
    placeColors: Record<MabKey, string>;
    counts: Record<MabKey, number>;
    showButtons: boolean;
    showWissel: boolean;             // inwissel / ontbind buttons under the columns
    tapAdds: boolean;                // tap a column = one block more
    autoWissel: boolean;             // the 10th block exchanges itself for one of the next place
    showTotal: boolean;
    expanded: 'geen' | 'plaatsen' | 'waarden';
    size: number;                    // glyph scale (1 = today)
}
// Same hues as MabBlocksSVG's mab-color fills, so 'eigen' starts from what the teacher saw.
export const MAB_DEFAULT_COLORS: Record<MabKey, string> = { d: '#3b82f6', h: '#ef4444', t: '#22c55e', e: '#fbbf24' };

export function mabmatProps(widget: BoardWidget): MabMatProps {
    const p = widget.props ?? {};
    const picked = Array.isArray(p.places) ? p.places : MAB_KEYS;
    const places = MAB_KEYS.filter(k => picked.includes(k));
    const pc = isObj(p.placeColors) ? p.placeColors : {};
    return {
        places: places.length ? places : [...MAB_KEYS],
        mabStyle: oneOf(p.mabStyle, ['mab-color', 'mab-bw', 'symbolic'] as const, 'mab-color'),
        colorScheme: oneOf(p.colorScheme, ['standaard', 'eigen'] as const, 'standaard'),
        placeColors: Object.fromEntries(MAB_KEYS.map(k => [k, color(pc[k], MAB_DEFAULT_COLORS[k])])) as Record<MabKey, string>,
        counts: Object.fromEntries(MAB_KEYS.map(k => [k, int(p[k], 0, 0, MAB_MAX)])) as Record<MabKey, number>,
        showButtons: bool(p.showButtons, true),
        showWissel: bool(p.showWissel, false),
        tapAdds: bool(p.tapAdds, false),
        autoWissel: bool(p.autoWissel, false),
        showTotal: p.showTotal === true,
        expanded: oneOf(p.expanded, ['geen', 'plaatsen', 'waarden'] as const, 'geen'),
        size: Math.min(2, Math.max(0.6, num(p.size, 1))),
    };
}

// 10 of a place → 1 of the next one up ("inwisselen"); null when it cannot.
export function wisselUp(counts: Record<MabKey, number>, key: MabKey): Record<MabKey, number> | null {
    const i = MAB_KEYS.indexOf(key);
    if (i <= 0 || counts[key] < 10 || counts[MAB_KEYS[i - 1]] >= MAB_MAX) return null;
    return { ...counts, [key]: counts[key] - 10, [MAB_KEYS[i - 1]]: counts[MAB_KEYS[i - 1]] + 1 };
}
// 1 of a place → 10 of the next one down ("ontbinden").
export function wisselDown(counts: Record<MabKey, number>, key: MabKey): Record<MabKey, number> | null {
    const i = MAB_KEYS.indexOf(key);
    if (i >= MAB_KEYS.length - 1 || counts[key] < 1 || counts[MAB_KEYS[i + 1]] + 10 > MAB_MAX) return null;
    return { ...counts, [key]: counts[key] - 1, [MAB_KEYS[i + 1]]: counts[MAB_KEYS[i + 1]] + 10 };
}

// "1 D + 2 H + 3 T" or "1000 + 200 + 30"; zero places are left out.
export function expandedForm(counts: Record<MabKey, number>, mode: 'plaatsen' | 'waarden'): string {
    const parts = MAB_KEYS.filter(k => counts[k] > 0)
        .map(k => (mode === 'plaatsen' ? `${counts[k]} ${MAB_LABEL[k]}` : formatMathNumber(counts[k] * MAB_VALUE[k])));
    return parts.length ? parts.join(' + ') : '0';
}
