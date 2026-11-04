import type { BoardWidget } from '../boardTypes';
import { isObj, int, oneOf, bool, color, TOOL_COLORS } from './shared';

// ── Breukviz ─────────────────────────────────────────────────────────────────
export type BreukShape = 'cirkel' | 'pizza' | 'rechthoek' | 'strook' | 'getallenlijn';
export interface BreukItem { n: number; d: number; parts: number[] | null; color: string; }
export interface BreukvizProps {
    shape: BreukShape;
    fractions: BreukItem[];          // side by side (vergelijken)
    stambreuk: boolean;
    mixed: boolean;                  // n may pass d: extra wholes are drawn
    labels: boolean;
    labelStyle: 'breuk' | 'gemengd' | 'decimaal';
    equivalent: number;              // 1 = off; k splits every part in k (gelijkwaardige breuk)
}
export const BREUK_MAX_D = 24;
export const BREUK_MAX_WHOLES = 4;
export const BREUK_MAX_ITEMS = 4;

function breukItem(raw: Record<string, unknown>, stambreuk: boolean, mixed: boolean, i: number): BreukItem {
    const d = int(raw.d, 4, 1, BREUK_MAX_D);
    const cap = mixed ? d * BREUK_MAX_WHOLES : d;
    // Tapped parts (indices over all wholes) win over n; n then follows their count.
    const parts = Array.isArray(raw.parts)
        ? [...new Set(raw.parts.filter((x): x is number => Number.isInteger(x) && (x as number) >= 0 && (x as number) < cap))].sort((a, b) => a - b)
        : null;
    const n = stambreuk ? 1 : parts ? parts.length : int(raw.n, 1, 0, cap);
    return { n, d, parts: stambreuk ? null : parts, color: color(raw.color, TOOL_COLORS[2 + i] ?? TOOL_COLORS[2]) };
}

export function breukvizProps(widget: BoardWidget): BreukvizProps {
    const p = widget.props ?? {};
    const stambreuk = p.stambreuk === true;
    const mixed = bool(p.mixed, false);
    // Pre-settings boards: one fraction in top-level n/d, 'lijn' meant the strip.
    const rawItems = Array.isArray(p.fractions) && p.fractions.some(isObj)
        ? p.fractions.filter(isObj).slice(0, BREUK_MAX_ITEMS)
        : [{ n: p.n, d: p.d, color: p.color }];
    const shape = p.shape === 'lijn' ? 'strook' : oneOf(p.shape, ['cirkel', 'pizza', 'rechthoek', 'strook', 'getallenlijn'] as const, 'cirkel');
    return {
        shape,
        fractions: rawItems.map((r, i) => breukItem(r, stambreuk, mixed, i)),
        stambreuk, mixed,
        labels: bool(p.labels, true),
        labelStyle: oneOf(p.labelStyle, ['breuk', 'gemengd', 'decimaal'] as const, 'breuk'),
        equivalent: int(p.equivalent, 1, 1, 6),
    };
}

// Which parts are coloured: the tapped set, else the first n.
export const coloredParts = (f: BreukItem): number[] => f.parts ?? Array.from({ length: f.n }, (_, i) => i);
// Wholes drawn: enough for n, at least one.
export const wholesFor = (f: BreukItem): number => Math.max(1, Math.ceil(f.n / f.d));
