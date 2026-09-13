import type { VormleerElement, MeetPoint } from '../math/types';

// Where every stroke, dot, arrowhead and NAME of a punt-lijn scenario lands inside a
// square figure box. The viewer draws exactly what this returns, and the unit test
// checks exactly this — so "no label sits on a line" is one fact, not two guesses.

export interface Seg { a: MeetPoint; b: MeetPoint }
export interface Rect { x: number; y: number; w: number; h: number }
export interface LabelBox { text: string; cx: number; cy: number; rect: Rect }
export interface DrawnElement { el: VormleerElement; pts: MeetPoint[] }
export interface ScenarioDrawing {
    elements: DrawnElement[];
    labels: LabelBox[];
    segs: Seg[];
}

// Clearance a label keeps from anything already drawn, in viewBox units.
const CLEAR = 4;
const DOT_R = 3.5;
const ARROW_R = 7.5;       // the arrowhead is wider than the stroke it caps
// Candidate rings: as close to the anchor as the drawing allows, then further out.
const RINGS = [11, 16, 21];
// Eight compass directions; a label is placed at one of them around its anchor.
const COMPASS: MeetPoint[] = [
    { x: 0, y: -1 }, { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 },
    { x: 0, y: 1 }, { x: -1, y: 1 }, { x: -1, y: 0 }, { x: -1, y: -1 },
].map(d => ({ x: d.x / Math.hypot(d.x, d.y), y: d.y / Math.hypot(d.x, d.y) }));

const dist = (a: MeetPoint, b: MeetPoint) => Math.hypot(a.x - b.x, a.y - b.y);

// Distance from p to segment ab (0 when p lies on it).
function pointSegDist(p: MeetPoint, a: MeetPoint, b: MeetPoint): number {
    const vx = b.x - a.x, vy = b.y - a.y;
    const len2 = vx * vx + vy * vy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
    return dist(p, { x: a.x + vx * t, y: a.y + vy * t });
}

function segsCross(a: MeetPoint, b: MeetPoint, c: MeetPoint, d: MeetPoint): boolean {
    const side = (p: MeetPoint, q: MeetPoint, r: MeetPoint) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    const d1 = side(a, b, c), d2 = side(a, b, d), d3 = side(c, d, a), d4 = side(c, d, b);
    return d1 !== d2 && d3 !== d4;
}

function segSegDist(a: MeetPoint, b: MeetPoint, c: MeetPoint, d: MeetPoint): number {
    if (segsCross(a, b, c, d)) return 0;
    return Math.min(pointSegDist(a, c, d), pointSegDist(b, c, d), pointSegDist(c, a, b), pointSegDist(d, a, b));
}

const corners = (r: Rect): MeetPoint[] => [
    { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h },
];
const edges = (r: Rect): Seg[] => {
    const c = corners(r);
    return c.map((p, i) => ({ a: p, b: c[(i + 1) % 4] }));
};

const rectHasPoint = (r: Rect, p: MeetPoint) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/** Distance from a label box to a drawn stroke; 0 when they touch or overlap. */
export function rectSegDist(r: Rect, s: Seg): number {
    if (rectHasPoint(r, s.a) || rectHasPoint(r, s.b)) return 0;
    return Math.min(...edges(r).map(e => segSegDist(e.a, e.b, s.a, s.b)));
}

/** Distance from a label box to a point marker; 0 when the point is inside the box. */
export function rectPointDist(r: Rect, p: MeetPoint): number {
    if (rectHasPoint(r, p)) return 0;
    return Math.min(...edges(r).map(e => pointSegDist(p, e.a, e.b)));
}

/** Gap between two label boxes; 0 when they overlap. */
export function rectRectDist(a: Rect, b: Rect): number {
    const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
    return Math.hypot(dx, dy);
}

const boxFor = (text: string, cx: number, cy: number, fs: number): Rect => {
    // Azeret Mono is monospace: ~0.6 em per glyph, and a bracket/letter box is ~1.05 em tall.
    const w = Math.max(1, text.length) * fs * 0.6 + 2;
    const h = fs * 1.05;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
};

interface Obstacles { segs: Seg[]; dots: MeetPoint[]; arrows: MeetPoint[]; placed: Rect[] }

// How much room a box has: the smallest gap to anything already on the figure.
// Negative-free — 0 means touching, which is already a reject.
function clearance(r: Rect, o: Obstacles): number {
    let min = Infinity;
    for (const s of o.segs) min = Math.min(min, rectSegDist(r, s));
    for (const p of o.dots) min = Math.min(min, rectPointDist(r, p) - DOT_R);
    for (const p of o.arrows) min = Math.min(min, rectPointDist(r, p) - ARROW_R);
    for (const b of o.placed) min = Math.min(min, rectRectDist(r, b));
    return min;
}

// Directions tried in order: the one pointing away from the rest of the figure first,
// then the remaining compass points by how close they are to it.
function directions(pref: MeetPoint): MeetPoint[] {
    const l = Math.hypot(pref.x, pref.y) || 1;
    const u = { x: pref.x / l, y: pref.y / l };
    return [...COMPASS].sort((a, b) => (b.x * u.x + b.y * u.y) - (a.x * u.x + a.y * u.y));
}

function place(text: string, anchors: Array<{ p: MeetPoint; pref: MeetPoint }>, size: number, fs: number, o: Obstacles): LabelBox {
    let best: { box: LabelBox; score: number } | null = null;
    for (const ring of RINGS) {
        for (const anchor of anchors) {
            for (const d of directions(anchor.pref)) {
                const cx = anchor.p.x + d.x * ring, cy = anchor.p.y + d.y * ring;
                const rect = boxFor(text, cx, cy, fs);
                // A label that leaves the figure box would be clipped on paper.
                const inside = rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= size && rect.y + rect.h <= size;
                const score = Math.min(clearance(rect, o), inside ? Infinity : -1);
                if (score >= CLEAR) return { text, cx, cy, rect };
                if (!best || score > best.score) best = { box: { text, cx, cy, rect }, score };
            }
        }
    }
    return best!.box;
}

/**
 * Maps a scenario's normalised (0..1, y down) geometry into a `size`×`size` viewBox and
 * picks a non-overlapping spot for every name. `fs` is the label font size in viewBox units.
 */
export function layoutScenario(elements: VormleerElement[], size: number, fs: number): ScenarioDrawing {
    // Margin for the names, which hang outside the drawing itself.
    const pad = size * 0.17;
    const S = size - pad * 2;
    const at = (p: MeetPoint): MeetPoint => ({ x: pad + p.x * S, y: pad + p.y * S });

    const drawn: DrawnElement[] = elements.map(el => ({ el, pts: el.pts.map(at) }));
    const segs: Seg[] = [];
    const dots: MeetPoint[] = [];
    const arrows: MeetPoint[] = [];
    for (const { el, pts } of drawn) {
        if (el.type === 'punt') { dots.push(pts[0]); continue; }
        segs.push({ a: pts[0], b: pts[1] });
        if (el.type === 'halfrechte') { dots.push(pts[0]); arrows.push(pts[1]); }
        else if (el.type === 'lijnstuk') { dots.push(pts[0], pts[1]); }
    }

    const placed: Rect[] = [];
    const o: Obstacles = { segs, dots, arrows, placed };
    const labels: LabelBox[] = [];
    const add = (text: string, anchors: Array<{ p: MeetPoint; pref: MeetPoint }>) => {
        const box = place(text, anchors, size, fs, o);
        labels.push(box);
        placed.push(box.rect);
    };

    // Points first: they are the most cramped anchors (they sit ON another element),
    // so they get the pick of the free space before the line names claim any.
    for (const { el, pts } of drawn) {
        if (el.type !== 'punt') continue;
        add(el.name, [{ p: pts[0], pref: { x: 0, y: -1 } }]);
    }
    for (const { el, pts } of drawn) {
        if (el.type === 'punt') continue;
        const [a, b] = pts;
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
        if (el.type === 'rechte') {
            // A rechte's name goes past the end of its stroke — either end, whichever is free.
            add(el.name, [
                { p: b, pref: u },
                { p: a, pref: { x: -u.x, y: -u.y } },
            ]);
        } else {
            // Endpoint letters point away from their own stroke.
            add(el.name[0], [{ p: a, pref: { x: -u.x, y: -u.y } }]);
            if (el.name[1]) add(el.name[1], [{ p: b, pref: u }]);
        }
    }
    return { elements: drawn, labels, segs };
}
