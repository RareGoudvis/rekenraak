import { joinNotes } from '../generationNotes';

// Mixed jumps for getallenas / getallenrijen: the helpers both generators share.

export const nl = (x: number) => x.toLocaleString('nl-BE');
export const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
const decimalsOf = (x: number): number => {
    const str = String(x);
    const i = str.indexOf('.');
    return i < 0 ? 0 : str.length - i - 1;
};
const gcdInt = (a: number, b: number): number => (b === 0 ? a : gcdInt(b, a % b));
export const plus = (js: number[]) => js.map(j => `+${nl(j)}`).join(', ');

// The chosen jumps when they are two or more distinct positive numbers; [] means "the one `step`".
export function distinctJumps(c: { numberType?: string; jumps?: number[] }): number[] {
    if (c.numberType === 'rational' || !Array.isArray(c.jumps)) return [];
    const seen = new Set<number>();
    const out: number[] = [];
    for (const j of c.jumps) {
        if (typeof j !== 'number' || !Number.isFinite(j) || j <= 0 || seen.has(r6(j))) continue;
        seen.add(r6(j));
        out.push(j);
    }
    return out.length >= 2 ? out : [];
}

export const rangeText = (lo: number, hi: number) => (lo === 0 ? `tot ${nl(hi)}` : `van ${nl(lo)} tot ${nl(hi)}`);

export type PatternGrid = { g: number; scale: number; aU: number; bU: number; span: number; steps: number[] };

// Anchors (in units of the jumps' gcd, so every cell lands on the same grid) for a row that repeats
// `jumps` over `ticks` cells. Integers throughout so 0,1 + 0,2 never drifts.
export function patternGrid(lo: number, hi: number, jumps: number[], ticks: number, arrowLeft: boolean): PatternGrid {
    const scale = 10 ** Math.max(0, ...jumps.map(decimalsOf), decimalsOf(lo), decimalsOf(hi));
    const sj = jumps.map(j => Math.round(j * scale));
    const gS = sj.reduce(gcdInt);
    const steps: number[] = [];
    let acc = 0;
    for (let k = 0; k < ticks - 1; k++) { acc += sj[k % sj.length]; steps.push(acc); }
    const spanS = acc;
    const loS = Math.round(lo * scale);
    const hiS = Math.round(hi * scale);
    const aU = arrowLeft ? Math.ceil((loS + spanS) / gS) : Math.ceil(loS / gS);
    const bU = arrowLeft ? Math.floor(hiS / gS) : Math.floor((hiS - spanS) / gS);
    return { g: gS / scale, scale, aU, bU, span: spanS / scale, steps: steps.map(s => s / scale) };
}

// A row fits when both directions it may draw have an anchor on the grid.
const patternFits = (lo: number, hi: number, jumps: number[], ticks: number, asc: boolean, desc: boolean): boolean => {
    const ok = (left: boolean) => { const p = patternGrid(lo, hi, jumps, ticks, left); return p.aU <= p.bU; };
    return (!asc || ok(false)) && (!desc || ok(true));
};

export type PatternFit = { jumps: number[]; ticks: number; note: string | null };

// The cells and jumps of an in-rij pattern: fewer cells first (down to jumps + 2, so the opening jumps+1
// cells stay given and one is blank), then fewer trailing jumps. Never a smaller jump instead.
// null = not even two jumps fit.
export function fitPattern(lo: number, hi: number, jumps: number[], ticks: number, directionMode: string, unit: string): PatternFit | null {
    const asc = directionMode !== 'left';
    const desc = directionMode === 'left' || directionMode === 'beide';
    const range = rangeText(lo, hi);
    for (let m = Math.min(jumps.length, ticks - 2); m >= 2; m--) {
        const js = jumps.slice(0, m);
        for (let t = ticks; t >= m + 2; t--) {
            if (!patternFits(lo, hi, js, t, asc, desc)) continue;
            let note: string | null = null;
            if (m < jumps.length) note = `Sprongen ${plus(jumps)} passen niet ${range} in ${ticks} ${unit}: alleen ${plus(js)} gebruikt.`;
            if (t < ticks) note = joinNotes(note, `Patroon ${plus(js)} met ${ticks} ${unit} past niet ${range}: ${t} ${unit} gebruikt.`);
            return { jumps: js, ticks: t, note };
        }
    }
    return null;
}

// Keeps neighbouring lines on different jumps after dedupe / top-up shuffled or appended items (the
// generator's own rotation restarts per call). Greedy and stable: the next item is the first remaining
// one whose jump differs from the previous; same-jump items only end up side by side when nothing else is left.
// `before` is the item already on the sheet in front of these. In-rij rows all share one pattern: untouched.
export function arrangeJumps(items: unknown[], block: { constraints?: unknown }, before?: unknown): unknown[] {
    const c = (block.constraints ?? {}) as { numberType?: string; jumps?: number[]; jumpMode?: string };
    if (items.length < 2 && before === undefined) return items;
    if (distinctJumps(c).length < 2 || c.jumpMode === 'in-rij') return items;
    const stepOf = (ex: unknown) => r6((ex as { step?: number }).step ?? 0);
    const rest = [...items];
    const out: unknown[] = [];
    let prev = before === undefined ? null : stepOf(before);
    while (rest.length) {
        const k = rest.findIndex(ex => stepOf(ex) !== prev);
        const [next] = rest.splice(k < 0 ? 0 : k, 1);
        out.push(next);
        prev = stepOf(next);
    }
    return out;
}
