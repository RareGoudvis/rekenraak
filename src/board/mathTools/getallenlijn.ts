import type { BoardWidget } from '../boardTypes';
import { formatMathNumber } from '../../services/math/formatters';
import { isObj, finite, num, int, oneOf, color, INK_COLORS, clean } from './shared';

// ── Getallenlijn ─────────────────────────────────────────────────────────────
export interface NumberLineMarker { value: number; color: string; }
export interface NumberLineJump { from: number; to: number; color: string; }
export type NumberLineType = 'natuurlijk' | 'kommagetal' | 'breuk';
export type NumberLineTap = 'geen' | 'markeren' | 'springen' | 'verbergen';
export interface GetallenlijnProps {
    min: number;
    max: number;
    step: number;              // value distance between two ticks
    labelEvery: number;        // label every n-th tick (1 = every tick)
    labels: 'alles' | 'uiteinden' | 'geen';
    arrows: 'geen' | 'rechts' | 'beide';
    orientation: 'horizontaal' | 'verticaal';
    numberType: NumberLineType;
    fractionDen: number;       // breuk: ticks are labelled k/den
    tapMode: NumberLineTap;
    inkColor: string;          // colour the next marker / jump gets
    markers: NumberLineMarker[];
    jumps: NumberLineJump[];
    hidden: number[];          // tick values whose label is blanked (invul-oefening)
}
// A tick per 6 px is the densest a 600 px line still draws legibly.
export const MAX_TICKS = 101;

export function getallenlijnProps(widget: BoardWidget): GetallenlijnProps {
    const p = widget.props ?? {};
    let min = num(p.min, 0);
    let max = num(p.max, 100);
    if (max === min) max = min + 10;
    if (max < min) [min, max] = [max, min];
    const numberType = oneOf(p.numberType, ['natuurlijk', 'kommagetal', 'breuk'] as const, 'natuurlijk');
    const fractionDen = int(p.fractionDen, 4, 2, 20);
    // Old boards stored a tick count instead of a step; the same ticks follow from it.
    const legacyTicks = int(p.ticks, 11, 2, 21);
    let step = numberType === 'breuk' ? 1 / fractionDen : num(p.step, (max - min) / (legacyTicks - 1));
    if (!(step > 0)) step = (max - min) / 10;
    if ((max - min) / step > MAX_TICKS - 1) step = (max - min) / (MAX_TICKS - 1);
    const list = <T,>(v: unknown, ok: (x: Record<string, unknown>) => T | null): T[] =>
        Array.isArray(v) ? v.map(x => (isObj(x) ? ok(x) : null)).filter((x): x is T => x !== null).slice(0, 60) : [];
    return {
        min, max, step,
        labelEvery: int(p.labelEvery, 1, 1, 20),
        labels: oneOf(p.labels, ['alles', 'uiteinden', 'geen'] as const, 'alles'),
        arrows: oneOf(p.arrows, ['geen', 'rechts', 'beide'] as const, 'rechts'),
        orientation: oneOf(p.orientation, ['horizontaal', 'verticaal'] as const, 'horizontaal'),
        numberType, fractionDen,
        tapMode: oneOf(p.tapMode, ['geen', 'markeren', 'springen', 'verbergen'] as const, 'geen'),
        inkColor: color(p.inkColor, INK_COLORS[0]),
        markers: list(p.markers, m => (finite(m.value) ? { value: m.value, color: color(m.color, INK_COLORS[0]) } : null)),
        jumps: list(p.jumps, j => (finite(j.from) && finite(j.to) && j.from !== j.to ? { from: j.from, to: j.to, color: color(j.color, INK_COLORS[1]) } : null)),
        hidden: Array.isArray(p.hidden) ? p.hidden.filter(finite).slice(0, MAX_TICKS) : [],
    };
}

// Tick values min, min+step, … max (the last tick lands on max even when step does not divide).
export function numberLineTicks(g: GetallenlijnProps): number[] {
    const n = Math.max(1, Math.round((g.max - g.min) / g.step));
    const out: number[] = [];
    for (let i = 0; i <= n && out.length < MAX_TICKS; i++) out.push(clean(Math.min(g.max, g.min + i * g.step)));
    if (out[out.length - 1] !== clean(g.max)) out.push(clean(g.max));
    return out;
}

function decimalsOf(step: number): number {
    const s = String(clean(step));
    return s.includes('.') ? Math.min(3, s.split('.')[1].length) : 0;
}

// Display text of a tick value; a fraction returns [numerator, denominator] for the stacked label.
export function tickLabel(v: number, g: GetallenlijnProps): string | [string, string] {
    if (g.numberType === 'breuk') {
        const k = Math.round(v * g.fractionDen);
        if (k % g.fractionDen === 0) return formatMathNumber(k / g.fractionDen).replace('-', '−');
        return [String(k).replace('-', '−'), String(g.fractionDen)];
    }
    const fixed = g.numberType === 'kommagetal' ? v.toFixed(decimalsOf(g.step)) : String(Math.round(v * 100) / 100);
    return formatMathNumber(fixed).replace('-', '−');
}
