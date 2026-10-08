import type { BoardWidget } from '../boardTypes';
import { isObj, finite, int, oneOf, color, isHexColor, TOOL_COLORS } from './shared';

// ── Honderdveld ──────────────────────────────────────────────────────────────
export type HighlightRule = 'even' | 'oneven' | 'veelvoud' | 'eindigt';
export interface HighlightSet { rule: HighlightRule; n: number; color: string; }
// 'cyclus' = the original tap behaviour: each tap steps through the palette, then clears.
export type PaintColor = 'cyclus' | string;
export interface HonderdveldProps {
    start: number;
    count: number;
    cols: number;
    highlights: HighlightSet[];
    tapMode: 'kleuren' | 'verbergen';
    paint: PaintColor;
    marks: Record<string, string>;   // number → colour
    hidden: number[];
}
// Pre-settings boards stored a palette index per cell: 1 yellow, 2 green, 3 blue, 4 red.
export const LEGACY_MARK_CYCLE = ['', '#fde047', '#86efac', '#93c5fd', '#fca5a5'];
export const HONDERDVELD_MAX = 400;

export function honderdveldProps(widget: BoardWidget): HonderdveldProps {
    const p = widget.props ?? {};
    const marks: Record<string, string> = {};
    if (isObj(p.marks)) {
        for (const [k, v] of Object.entries(p.marks)) {
            if (!/^-?\d+$/.test(k)) continue;
            const c = finite(v) ? LEGACY_MARK_CYCLE[v] : v;
            if (isHexColor(c)) marks[k] = c;
        }
    }
    const highlights = Array.isArray(p.highlights)
        ? p.highlights.filter(isObj).map(h => ({
            rule: oneOf(h.rule, ['even', 'oneven', 'veelvoud', 'eindigt'] as const, 'even'),
            n: int(h.n, 2, 0, 100),
            color: color(h.color, TOOL_COLORS[0]),
        })).slice(0, 6)
        : [];
    return {
        start: int(p.start, 1, -100, 1000),
        count: int(p.count, 100, 10, HONDERDVELD_MAX),
        cols: int(p.cols, 10, 2, 20),
        highlights,
        tapMode: oneOf(p.tapMode, ['kleuren', 'verbergen'] as const, 'kleuren'),
        paint: p.paint === 'cyclus' || isHexColor(p.paint) ? p.paint : 'cyclus',
        marks,
        hidden: Array.isArray(p.hidden) ? p.hidden.filter(finite).slice(0, HONDERDVELD_MAX) : [],
    };
}

// Later sets paint over earlier ones, so the list order is the teacher's layering.
export function highlightColor(n: number, sets: HighlightSet[]): string | null {
    let c: string | null = null;
    for (const h of sets) {
        const hit = h.rule === 'even' ? n % 2 === 0
            : h.rule === 'oneven' ? Math.abs(n % 2) === 1
            : h.rule === 'veelvoud' ? h.n > 0 && n % h.n === 0
            : Math.abs(n % 10) === h.n % 10;
        if (hit) c = h.color;
    }
    return c;
}
