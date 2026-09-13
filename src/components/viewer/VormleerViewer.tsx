import type { MathBlock, VormleerExercise, MeetPoint } from '../../services/math/types';
import { CONCEPT_NAMES, elementName } from '../../services/vormleer/vormleerGenerator';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, useSheetSizePx } from './BlockWidthContext';
import type { VormleerConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// SYNC: same to-scale convention as MetenViewer (1 cm ≈ 37.8 px), scaled down for minis.
const CM = 37.8;
const mono = "'Azeret Mono', monospace";
const SALMON = '#f4cbb8';
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.

// 13pt (the --sheet-size-math default) is 17.33 CSS px, so a figure sized `px / 17.33` of
// the token reproduces today's pixels exactly and then follows the Lettergrootte slider.
// SYNC: same divisor in every viewer.
const PX_PER_EM_AT_DEFAULT = 17.33;
const mathPx = (px: number) => `calc(var(--sheet-size-math) * ${(px / PX_PER_EM_AT_DEFAULT).toFixed(3)})`;

// A mini keeps `size` as its viewBox geometry; only the rendered box follows the token.
// `toScale` minis (the tekenen raster box) must stay in real cm px instead — a figure the
// pupil measures against a 1 cm grid may not grow with the font.
const svgBox = (size: number, toScale: boolean) =>
    toScale ? { width: size, height: size } : { width: mathPx(size), height: mathPx(size) };

// Eigenschappen columns. Triangles are classified GEOMETRICALLY (sides/angles from the
// drawn figure) so a gelijkbenige driehoek also ticks its hoek-column when both axes
// are on the sheet; vierhoeken tick by concept.
type EigCol = { label: string; test: (ex: VormleerExercise) => boolean };

// Count side-length groups with ≥2 members (0.05 cm tolerance).
function equalSideGroups(sides: number[]): number[] {
    const counts = new Map<number, number>();
    sides.forEach(s => { const k = Math.round(s * 20); counts.set(k, (counts.get(k) ?? 0) + 1); });
    return [...counts.values()];
}

// Largest interior angle in degrees, from the polygon points.
function maxAngleDeg(pts: MeetPoint[]): number {
    let max = 0;
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i], a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length];
        const v1 = { x: a.x - p.x, y: a.y - p.y }, v2 = { x: b.x - p.x, y: b.y - p.y };
        const cos = (v1.x * v2.x + v1.y * v2.y) / ((Math.hypot(v1.x, v1.y) || 1) * (Math.hypot(v2.x, v2.y) || 1));
        max = Math.max(max, (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI);
    }
    return max;
}

const HOEK_COLS: EigCol[] = [
    { label: 'alle hoeken scherp', test: ex => maxAngleDeg(ex.points ?? []) < 88 },
    { label: 'één rechte hoek', test: ex => Math.abs(maxAngleDeg(ex.points ?? []) - 90) <= 2 },
    { label: 'één stompe hoek', test: ex => maxAngleDeg(ex.points ?? []) > 92 },
];
const ZIJDEN_COLS: EigCol[] = [
    { label: '3 gelijke zijden', test: ex => equalSideGroups(ex.sides ?? []).some(n => n === 3) },
    { label: 'juist 2 gelijke zijden', test: ex => equalSideGroups(ex.sides ?? []).some(n => n === 2) && !equalSideGroups(ex.sides ?? []).some(n => n === 3) },
    { label: 'geen gelijke zijden', test: ex => equalSideGroups(ex.sides ?? []).every(n => n === 1) },
];
const VIERHOEK_COLS: EigCol[] = [
    { label: '4 rechte hoeken', test: ex => ex.concept === 'vierkant' || ex.concept === 'rechthoek' },
    { label: '4 gelijke zijden', test: ex => ex.concept === 'vierkant' || ex.concept === 'ruit' },
    { label: '2 paar evenwijdige zijden', test: ex => ex.concept !== 'trapezium' },
];

const HOEK_CONCEPTS = ['scherphoekig', 'rechthoekig', 'stomphoekig'];
const ZIJDEN_CONCEPTS = ['gelijkzijdig', 'gelijkbenig', 'ongelijkzijdig'];

// Columns follow the axes of the ENABLED concepts (hoeken / zijden / both / vierhoeken).
function eigenschapCols(classify: string, concepts: string[]): EigCol[] {
    if (classify === 'vierhoeken') return VIERHOEK_COLS;
    const cols: EigCol[] = [];
    if (concepts.some(k => HOEK_CONCEPTS.includes(k)) || !concepts.length) cols.push(...HOEK_COLS);
    if (concepts.some(k => ZIJDEN_CONCEPTS.includes(k))) cols.push(...ZIJDEN_COLS);
    return cols.length ? cols : HOEK_COLS;
}

const rot = (p: MeetPoint, deg: number): MeetPoint => {
    const r = (deg * Math.PI) / 180;
    return { x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r) };
};

// ── figure mini (driehoeken/vierhoeken) with per-notation marks ──────────────
interface FigureMarks { equalSides: boolean; rightAngles: boolean; parallel: boolean; rightAngleStyle: string; }

function FigureSVG({ ex, size, marks: opt, toScale }: { ex: VormleerExercise; size: number; marks: FigureMarks; toScale: boolean }) {
    const scale = 0.55;   // minis: ~55% of true size so a row of them fits
    const margin = 6;
    const unfitted = (ex.points ?? []).map(p => rot(p, ex.rotation ?? 0)).map(p => ({ x: p.x * CM * scale, y: -p.y * CM * scale }));
    const preMinX = Math.min(...unfitted.map(p => p.x)), preMinY = Math.min(...unfitted.map(p => p.y));
    const preW = Math.max(...unfitted.map(p => p.x)) - preMinX, preH = Math.max(...unfitted.map(p => p.y)) - preMinY;
    // A rotated vierhoek's bounding box can exceed `size` even at scale 0.55 — fit it down
    // rather than let the polygon spill into the neighbouring table cell.
    const fit = Math.min(1, (size - margin * 2) / (preW || 1), (size - margin * 2) / (preH || 1));
    const raw = unfitted.map(p => ({ x: p.x * fit, y: p.y * fit }));
    const minX = preMinX * fit, minY = preMinY * fit;
    const w = preW * fit, h = preH * fit;
    const ox = (size - w) / 2 - minX, oy = (size - h) / 2 - minY;
    const pts = raw.map(p => ({ x: p.x + ox, y: p.y + oy }));
    const sides = ex.sides ?? [];

    const marks: React.ReactNode[] = [];
    // Per-side unit vectors, reused by all three notations.
    const sideGeom = pts.map((a, i) => {
        const b = pts[(i + 1) % pts.length];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        return { a, b, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ux: (b.x - a.x) / len, uy: (b.y - a.y) / len };
    });

    if (opt.equalSides) {
        // Equal-side tick marks: sides with (rounded) equal length share a tick count.
        const groups = new Map<number, number>();
        sides.forEach(s => { const k = Math.round(s * 10); if (!groups.has(k)) groups.set(k, groups.size + 1); });
        const counts = new Map<number, number>();
        sides.forEach(s => { const k = Math.round(s * 10); counts.set(k, (counts.get(k) ?? 0) + 1); });
        sideGeom.forEach((g, i) => {
            const k = Math.round((sides[i] ?? 0) * 10);
            if ((counts.get(k) ?? 0) < 2) return;
            const n = groups.get(k) ?? 1;
            const nx = -g.uy, ny = g.ux;
            for (let t = 0; t < n; t++) {
                const off = (t - (n - 1) / 2) * 5;
                marks.push(
                    <line key={`tick${i}-${t}`}
                        x1={g.mid.x + g.ux * off - nx * 4} y1={g.mid.y + g.uy * off - ny * 4}
                        x2={g.mid.x + g.ux * off + nx * 4} y2={g.mid.y + g.uy * off + ny * 4}
                        stroke="#000" strokeWidth={1.4} />
                );
            }
        });
    }

    if (opt.parallel) {
        // Parallel-pair chevrons: pair 1 = single >, pair 2 = double >>, pointing along the side.
        const used = new Set<number>();
        let pairNo = 0;
        for (let i = 0; i < sideGeom.length; i++) {
            if (used.has(i)) continue;
            for (let j = i + 1; j < sideGeom.length; j++) {
                if (used.has(j)) continue;
                const cross = sideGeom[i].ux * sideGeom[j].uy - sideGeom[i].uy * sideGeom[j].ux;
                if (Math.abs(cross) > 0.06) continue;
                used.add(i); used.add(j);
                pairNo++;
                [i, j].forEach(s => {
                    const g = sideGeom[s];
                    // Chevrons point in one consistent direction per pair.
                    const dir = s === i ? 1 : (sideGeom[i].ux * g.ux + sideGeom[i].uy * g.uy) >= 0 ? 1 : -1;
                    const nx = -g.uy, ny = g.ux;
                    for (let t = 0; t < pairNo; t++) {
                        const off = (t - (pairNo - 1) / 2) * 6;
                        const cx = g.mid.x + g.ux * off, cy = g.mid.y + g.uy * off;
                        marks.push(
                            <polyline key={`par${s}-${t}`}
                                points={`${cx - dir * g.ux * 4 + nx * 4},${cy - dir * g.uy * 4 + ny * 4} ${cx + dir * g.ux * 4},${cy + dir * g.uy * 4} ${cx - dir * g.ux * 4 - nx * 4},${cy - dir * g.uy * 4 - ny * 4}`}
                                fill="none" stroke="#000" strokeWidth={1.3} />
                        );
                    }
                });
                break;
            }
        }
    }

    if (opt.rightAngles) {
        pts.forEach((p, i) => {
            const prev = pts[(i - 1 + pts.length) % pts.length];
            const next = pts[(i + 1) % pts.length];
            const v1 = { x: prev.x - p.x, y: prev.y - p.y }, v2 = { x: next.x - p.x, y: next.y - p.y };
            const l1 = Math.hypot(v1.x, v1.y) || 1, l2 = Math.hypot(v2.x, v2.y) || 1;
            const cos = (v1.x * v2.x + v1.y * v2.y) / (l1 * l2);
            if (Math.abs(cos) > 0.05) return;
            const s = 8;
            const u1 = { x: (v1.x / l1) * s, y: (v1.y / l1) * s }, u2 = { x: (v2.x / l2) * s, y: (v2.y / l2) * s };
            if (opt.rightAngleStyle === 'haakje') {
                // Bare L-corner just inside the vertex (Ruben's preferred notation).
                const c = { x: p.x + (u1.x + u2.x) * 0.45, y: p.y + (u1.y + u2.y) * 0.45 };
                marks.push(
                    <polyline key={`ra${i}`}
                        points={`${c.x + u1.x * 0.6},${c.y + u1.y * 0.6} ${c.x},${c.y} ${c.x + u2.x * 0.6},${c.y + u2.y * 0.6}`}
                        fill="none" stroke="#000" strokeWidth={1.2} />
                );
            } else {
                marks.push(
                    <polyline key={`ra${i}`}
                        points={`${p.x + u1.x},${p.y + u1.y} ${p.x + u1.x + u2.x},${p.y + u1.y + u2.y} ${p.x + u2.x},${p.y + u2.y}`}
                        fill="none" stroke="#000" strokeWidth={1.2} />
                );
            }
        });
    }

    return (
        <svg {...svgBox(size, toScale)} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
            <polygon points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#000" strokeWidth={1.8} />
            {marks}
        </svg>
    );
}

// ── hoek mini: two rays + arc (square marker for a right angle) ──────────────
function HoekSVG({ ex, size, showBoog, toScale }: { ex: VormleerExercise; size: number; showBoog: boolean; toScale: boolean }) {
    // 'Hoeken benoemen': three letters with the vertex in the middle (hoek ABC). The
    // generator only writes three labels when the toggle is on, so length is the switch.
    const names = (ex.labels ?? []).length === 3 ? ex.labels! : null;
    // Named angles pull in and re-centre: the letters hang past the ray ends, and a
    // rotated arm would otherwise push its letter outside the tekenvak.
    const cx = size * (names ? 0.46 : 0.4), cy = size * (names ? 0.56 : 0.62);
    const rayLen = size * (names ? 0.36 : 0.44);
    const base = ex.rotation ?? 0;
    const a1 = (base * Math.PI) / 180;
    const a2 = ((base - (ex.angleDeg ?? 45)) * Math.PI) / 180;   // open counterclockwise (upward on screen)
    const end1 = { x: cx + rayLen * Math.cos(a1), y: cy + rayLen * Math.sin(a1) };
    const end2 = { x: cx + rayLen * Math.cos(a2), y: cy + rayLen * Math.sin(a2) };
    const marker: React.ReactNode = !showBoog ? null : (ex.angleDeg === 90
        ? (() => {
            const s = 12;
            const u1 = { x: Math.cos(a1) * s, y: Math.sin(a1) * s }, u2 = { x: Math.cos(a2) * s, y: Math.sin(a2) * s };
            return <polyline points={`${cx + u1.x},${cy + u1.y} ${cx + u1.x + u2.x},${cy + u1.y + u2.y} ${cx + u2.x},${cy + u2.y}`} fill="none" stroke="currentColor" strokeWidth={1.2} />;
        })()
        : (() => {
            const r = 16;
            const large = (ex.angleDeg ?? 0) > 180 ? 1 : 0;
            return <path d={`M ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 ${large} 0 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)}`} fill="none" stroke="currentColor" strokeWidth={1.2} />;
        })());
    const fs = 0.62 * PX_PER_EM_AT_DEFAULT;
    // The arc (r 16) and the right-angle square (12) both sit around the vertex, so the
    // vertex letter goes the OTHER way along the bisector and the arm letters a little
    // past their ray ends — otherwise B lands on top of its own boog.
    const bisector = (a1 + a2) / 2;
    const glyph = (x: number, y: number, s: string, key: string) =>
        <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontFamily={mono} fontStyle="italic" fill="currentColor">{s}</text>;
    const nameAt = (p: MeetPoint, s: string, key: string) => {
        const dx = p.x - cx, dy = p.y - cy, l = Math.hypot(dx, dy) || 1;
        return glyph(p.x + (dx / l) * 13, p.y + (dy / l) * 13, s, key);
    };
    return (
        <svg {...svgBox(size, toScale)} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
            <line x1={cx} y1={cy} x2={end1.x} y2={end1.y} stroke="currentColor" strokeWidth={1.8} />
            <line x1={cx} y1={cy} x2={end2.x} y2={end2.y} stroke="currentColor" strokeWidth={1.8} />
            {marker}
            <circle cx={cx} cy={cy} r={2} fill="currentColor" />
            {names && [
                nameAt(end1, names[0], 'n0'),
                glyph(cx - Math.cos(bisector) * 22, cy - Math.sin(bisector) * 22, names[1], 'n1'),
                nameAt(end2, names[2], 'n2'),
            ]}
        </svg>
    );
}

// ── punt-lijn scenario: every element of the scenario, each carrying its name ──
// Geometry arrives normalised (0..1, y down) from the generator, so this only scales.
function ScenarioSVG({ ex, size, toScale }: { ex: VormleerExercise; size: number; toScale: boolean }) {
    // The letters sit OUTSIDE the figure, so the drawing keeps a margin all round.
    const pad = size * 0.14;
    const S = size - pad * 2;
    const at = (p: MeetPoint): MeetPoint => ({ x: pad + p.x * S, y: pad + p.y * S });
    const mid = { x: size / 2, y: size / 2 };
    // Plain viewBox units: the SVG element itself already follows --sheet-size-math.
    const fs = 0.62 * PX_PER_EM_AT_DEFAULT;
    const label = (p: MeetPoint, s: string, key: string, away: MeetPoint = mid) => {
        const dx = p.x - away.x, dy = p.y - away.y;
        const l = Math.hypot(dx, dy) || 1;
        const d = Math.max(9, fs * 0.75);
        return (
            <text key={key} x={p.x + (dx / l) * d} y={p.y + (dy / l) * d} textAnchor="middle"
                dominantBaseline="central" fontSize={fs} fontFamily={mono} fontStyle="italic" fill="currentColor">{s}</text>
        );
    };
    const parts: React.ReactNode[] = [];
    (ex.elements ?? []).forEach((el, i) => {
        if (el.type === 'punt') {
            const p = at(el.pts[0]);
            parts.push(<circle key={`d${i}`} cx={p.x} cy={p.y} r={2.8} fill="currentColor" />);
            parts.push(label(p, el.name, `n${i}`, { x: p.x, y: p.y + 10 }));
            return;
        }
        const a = at(el.pts[0]), b = at(el.pts[1]);
        parts.push(<line key={`l${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeWidth={1.8} />);
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
        if (el.type === 'rechte') {
            // A rechte carries no arrowheads (Flemish notation): the lowercase name at one
            // end is what identifies it.
            parts.push(label({ x: b.x + ux * 6, y: b.y + uy * 6 }, el.name, `n${i}`, a));
        } else {
            parts.push(<circle key={`a${i}`} cx={a.x} cy={a.y} r={2.5} fill="currentColor" />);
            if (el.type === 'halfrechte') {
                const s = 7, nx = -uy, ny = ux;
                parts.push(<polyline key={`ar${i}`} fill="none" stroke="currentColor" strokeWidth={1.5}
                    points={`${b.x - ux * s + nx * s * 0.6},${b.y - uy * s + ny * s * 0.6} ${b.x},${b.y} ${b.x - ux * s - nx * s * 0.6},${b.y - uy * s - ny * s * 0.6}`} />);
            } else {
                parts.push(<circle key={`b${i}`} cx={b.x} cy={b.y} r={2.5} fill="currentColor" />);
            }
            parts.push(label(a, el.name[0], `n${i}a`, b), label(b, el.name[1] ?? '', `n${i}b`, a));
        }
    });
    return <svg {...svgBox(size, toScale)} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>{parts}</svg>;
}

// ── punt-lijn mini: dot / line / half-line / segment / pair variants ─────────
// LEGACY: only sheets saved before the scenario model reach this; new punt-lijn
// exercises all carry `elements` and go through ScenarioSVG.
function PuntLijnSVG({ ex, size, toScale }: { ex: VormleerExercise; size: number; toScale: boolean }) {
    const cx = size / 2, cy = size / 2;
    const half = size * 0.4;
    const ang = ((ex.rotation ?? 0) * Math.PI) / 180;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const A = { x: cx - half * ux, y: cy - half * uy };
    const B = { x: cx + half * ux, y: cy + half * uy };
    const labels = ex.labels ?? [];
    // Niveau 2/3 relation drawings carry line-name labels the plain herkennen pairs don't.
    const showRelationLabels = !!ex.relations;

    const arrow = (tip: MeetPoint, dirX: number, dirY: number, key: string) => {
        const s = 7;
        const nx = -dirY, ny = dirX;
        return <polyline key={key} points={`${tip.x - dirX * s + nx * s * 0.6},${tip.y - dirY * s + ny * s * 0.6} ${tip.x},${tip.y} ${tip.x - dirX * s - nx * s * 0.6},${tip.y - dirY * s - ny * s * 0.6}`} fill="none" stroke="#000" strokeWidth={1.5} />;
    };
    const dot = (p: MeetPoint, key: string) => <circle key={key} cx={p.x} cy={p.y} r={2.5} fill="#000" />;
    const text = (p: MeetPoint, s: string, key: string, dy = -8) =>
        <text key={key} x={p.x} y={p.y + dy} textAnchor="middle" fontSize={0.7 * PX_PER_EM_AT_DEFAULT} fontFamily={mono} fontStyle="italic">{s}</text>;

    const parts: React.ReactNode[] = [];
    const line = (a: MeetPoint, b: MeetPoint, key: string, dash = false) =>
        <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#000" strokeWidth={1.8} strokeDasharray={dash ? '4 3' : undefined} />;

    if (ex.concept === 'punt') {
        parts.push(dot({ x: cx, y: cy }, 'p'), text({ x: cx, y: cy }, labels[0] ?? 'A', 't'));
    } else if (ex.concept === 'rechte') {
        // A rechte carries no arrowheads (Flemish notation) — a plain line plus its
        // lowercase name. The dots on the ends are what mark a lijnstuk instead.
        parts.push(line(A, B, 'l'), text({ x: cx, y: cy }, (labels[0] ?? 'a').toLowerCase(), 't'));
    } else if (ex.concept === 'halfrechte') {
        parts.push(line(A, B, 'l'), dot(A, 'd'), arrow(B, ux, uy, 'a'), text(A, labels[0] ?? 'A', 't1'), text(B, labels[1] ?? 'B', 't2'));
    } else if (ex.concept === 'lijnstuk') {
        parts.push(line(A, B, 'l'), dot(A, 'd1'), dot(B, 'd2'), text(A, labels[0] ?? 'A', 't1'), text(B, labels[1] ?? 'B', 't2'));
    } else if (ex.concept === 'ligt-op') {
        // Niveau 2/3: a lijnstuk [CD] plus a loose point A, on the segment or offset from it.
        const nx = -uy, ny = ux;
        const t = ex.pointT ?? 0.5, off = (ex.pointOffset ?? 0) * half;
        const P = { x: A.x + (B.x - A.x) * t + nx * off, y: A.y + (B.y - A.y) * t + ny * off };
        parts.push(line(A, B, 'l'), dot(A, 'd1'), dot(B, 'd2'), text(A, labels[0] ?? 'C', 't1'), text(B, labels[1] ?? 'D', 't2'));
        parts.push(dot(P, 'dp'), text(P, labels[2] ?? 'A', 'tp', off <= 0 ? 12 : -8));
    } else {
        // Pairs: evenwijdig / snijdend / loodrecht — two rechten, so no arrowheads either.
        const off = 14;
        const nx = -uy * off, ny = ux * off;
        if (ex.concept === 'evenwijdig') {
            const A2 = { x: A.x + nx, y: A.y + ny }, B2 = { x: B.x + nx, y: B.y + ny };
            const A1 = { x: A.x - nx, y: A.y - ny }, B1 = { x: B.x - nx, y: B.y - ny };
            parts.push(line(A1, B1, 'l1'), line(A2, B2, 'l2'));
            if (showRelationLabels) parts.push(text(A1, (labels[0] ?? 'a').toLowerCase(), 't1', -6), text(A2, (labels[1] ?? 'b').toLowerCase(), 't2', 16));
        } else {
            const cross = ex.concept === 'loodrecht' ? 90 : 55;
            const ang2 = ang + (cross * Math.PI) / 180;
            const vx = Math.cos(ang2), vy = Math.sin(ang2);
            const C = { x: cx - half * vx, y: cy - half * vy }, D = { x: cx + half * vx, y: cy + half * vy };
            parts.push(line(A, B, 'l1'), line(C, D, 'l2'));
            if (ex.concept === 'loodrecht') {
                const s = 9;
                parts.push(<polyline key="ra" points={`${cx + ux * s},${cy + uy * s} ${cx + ux * s + vx * s},${cy + uy * s + vy * s} ${cx + vx * s},${cy + vy * s}`} fill="none" stroke="#000" strokeWidth={1.2} />);
            }
            if (showRelationLabels) {
                parts.push(text(A, (labels[0] ?? 'a').toLowerCase(), 't1'), text(C, (labels[1] ?? 'b').toLowerCase(), 't2'));
                if (ex.concept === 'snijdend') parts.push(dot({ x: cx, y: cy }, 'dx'), text({ x: cx, y: cy }, labels[2] ?? 'S', 'tx', 14));
            }
        }
    }
    return <svg {...svgBox(size, toScale)} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>{parts}</svg>;
}

// ── hoek meten: to-scale drawing (legs ≥ 5 cm) with a small measuring arc ─────
// Legs at real cm size can't rotate freely and still fit two-per-row (a wide angle
// already spans most of a diameter), so the angle opens around a fixed diagonal
// bisector and the SVG is sized to the exact bounding box of that one angle —
// tight for a narrow angle, up to ~legPx*1.7 square for the widest (160°).
const HOEK_METEN_LEG_PX = 5 * CM;
// Tuned so the widest case (160° at max ±8° rotation jitter) still fits two boxes across
// a full-width sheet (see the vormleer viewer report: fitCols needs the box ≤ ~335px).
const HOEK_METEN_PAD = 18;

// Shared by the SVG and by the column-count estimate below (the widest case: a
// 160° angle at max rotation jitter needs the biggest bounding box).
function hoekMetenGeom(angleDeg: number, rotation: number) {
    const legPx = HOEK_METEN_LEG_PX;
    const bisector = -45 + rotation;
    const half = angleDeg / 2;
    const a1 = ((bisector - half) * Math.PI) / 180;
    const a2 = ((bisector + half) * Math.PI) / 180;
    const e1 = { x: legPx * Math.cos(a1), y: legPx * Math.sin(a1) };
    const e2 = { x: legPx * Math.cos(a2), y: legPx * Math.sin(a2) };
    const minX = Math.min(0, e1.x, e2.x), maxX = Math.max(0, e1.x, e2.x);
    const minY = Math.min(0, e1.y, e2.y), maxY = Math.max(0, e1.y, e2.y);
    return { a1, a2, e1, e2, minX, maxX, minY, maxY, w: maxX - minX + HOEK_METEN_PAD * 2, h: maxY - minY + HOEK_METEN_PAD * 2 };
}

function HoekMetenSVG({ ex, raster, hulplijn }: { ex: VormleerExercise; raster: boolean; hulplijn: boolean }) {
    const legPx = HOEK_METEN_LEG_PX;
    const pad = HOEK_METEN_PAD;
    const angleDeg = ex.angleDeg ?? 45;
    const { a1, a2, e1, e2, minX, minY, w, h } = hoekMetenGeom(angleDeg, ex.rotation ?? 0);
    const shift = (p: MeetPoint) => ({ x: p.x - minX + pad, y: p.y - minY + pad });
    const V = shift({ x: 0, y: 0 }), E1 = shift(e1), E2 = shift(e2);
    const r = 24;
    // Grid lines offset from the vertex by whole cm so V always lands on an intersection.
    const grid = raster ? (
        <g stroke="#ccc" strokeWidth={0.6}>
            {Array.from({ length: Math.ceil(w / CM) + 2 }, (_, i) => V.x - Math.ceil(V.x / CM) * CM + i * CM)
                .filter(x => x >= 0 && x <= w).map(x => <line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} />)}
            {Array.from({ length: Math.ceil(h / CM) + 2 }, (_, i) => V.y - Math.ceil(V.y / CM) * CM + i * CM)
                .filter(y => y >= 0 && y <= h).map(y => <line key={`h${y}`} x1={0} y1={y} x2={w} y2={y} />)}
        </g>
    ) : null;
    // Protractor baseline: collinear with leg 1, extended through the vertex both ways.
    const hulp = hulplijn ? <line x1={V.x - legPx * Math.cos(a1)} y1={V.y - legPx * Math.sin(a1)} x2={V.x + legPx * Math.cos(a1)} y2={V.y + legPx * Math.sin(a1)} stroke="#bbb" strokeDasharray="3 3" strokeWidth={1} /> : null;
    return (
        // No enclosing rectangle — the angle stands on its own, Ruben's preference (BUGS.md).
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
            {grid}
            {hulp}
            <line x1={V.x} y1={V.y} x2={E1.x} y2={E1.y} stroke="#000" strokeWidth={2} />
            <line x1={V.x} y1={V.y} x2={E2.x} y2={E2.y} stroke="#000" strokeWidth={2} />
            <path d={`M ${V.x + r * Math.cos(a1)} ${V.y + r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${V.x + r * Math.cos(a2)} ${V.y + r * Math.sin(a2)}`} fill="none" stroke="#000" strokeWidth={1.2} />
            <circle cx={V.x} cy={V.y} r={2.5} fill="#000" />
        </svg>
    );
}

export default function VormleerViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const sheetPx = useSheetSizePx('math');
    const exercises: VormleerExercise[] = block.vormleerExercises || [];
    const c = block.constraints as VormleerConstraints;
    const kind: string = c.kind ?? 'punt-lijn';
    const mode: string = c.mode ?? 'herkennen';
    const answerMode: string = c.answerMode ?? 'woordbank';
    const figMarks: FigureMarks = {
        equalSides: c.showEqualSides ?? c.showMarks ?? true,
        rightAngles: c.showRightAngles ?? c.showMarks ?? true,
        parallel: c.showParallel ?? false,
        rightAngleStyle: c.rightAngleStyle ?? 'vierkantje',
    };
    const showBoog: boolean = c.showBoog ?? true;
    const raster: boolean = c.raster ?? true;
    const boxH: number = c.boxHeight ?? 4;   // tekenen box height in cm
    const perRow: number = c.exercisesPerRow ?? 3;
    const classify: string = c.classify ?? 'vierhoeken';
    const concepts: string[] = c.concepts ?? [];
    const niveau: number = c.niveau ?? 1;
    const showHulplijn: boolean = c.showHulplijn ?? false;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // toScale = drawn against the 1 cm raster (tekenen box) and therefore font-size-proof.
    const mini = (ex: VormleerExercise, size: number, toScale = false) =>
        ex.kind === 'figuur' ? <FigureSVG ex={ex} size={size} marks={figMarks} toScale={toScale} />
            : ex.kind === 'hoek' ? <HoekSVG ex={ex} size={size} showBoog={showBoog} toScale={toScale} />
            : ex.elements?.length ? <ScenarioSVG ex={ex} size={size} toScale={toScale} />
            : <PuntLijnSVG ex={ex} size={size} toScale={toScale} />;
    const tokenRatio = sheetPx / PX_PER_EM_AT_DEFAULT;
    // Scenario exercises (every new punt-lijn one) carry their own sentences; the legacy
    // `relations` branch below only serves sheets saved before the scenario model.
    const isScenario = kind === 'punt-lijn' && exercises.some(ex => !!ex.steps?.length);
    const isRelationMode = kind === 'punt-lijn' && mode === 'herkennen' && niveau >= 2 && !isScenario;

    // Woordbank vocabulary. Niveau ≥ 2 offers the relation words actually used ('snijdt'
    // answers are a point letter read off the drawing, not a word, so they stay out);
    // niveau 1 offers the enabled begrippen plus their horizontale/verticale variants.
    const RELATION_WORDS: Record<string, string[]> = { loodrecht: ['loodrecht'], evenwijdig: ['evenwijdig'], 'ligt-op': ['op', 'niet op'] };
    // A scenario always draws the point ON the element, so 'niet op' would be a bank word
    // that is never an answer — the legacy branch below still offers both.
    const SCENARIO_WORDS: Record<string, string[]> = { ...RELATION_WORDS, 'ligt-op': ['op'] };
    const scenarioBank = () => niveau >= 2
        ? [...new Set(exercises.flatMap(ex => (ex.steps ?? []).flatMap(s => (s.rel ? SCENARIO_WORDS[s.rel] ?? [] : []))))]
        : [...new Set(concepts.flatMap(k => [
            elementName(k),
            ...(c.allowHorizontaal ? [elementName(k, 'horizontaal')] : []),
            ...(c.allowVerticaal ? [elementName(k, 'verticaal')] : []),
        ]))];
    const bankWords = isScenario ? scenarioBank()
        : isRelationMode ? [...new Set(exercises.flatMap(ex => (ex.relations ?? []).flatMap(r => RELATION_WORDS[r.kind] ?? [])))]
        : concepts.map(k => CONCEPT_NAMES[k] ?? k);
    const woordbank = answerMode === 'woordbank' && (mode === 'herkennen' || mode === 'benoemen') && bankWords.length > 0 && (
        <div key="bank" className="print-exercise" style={{ fontSize: 'calc(var(--sheet-size-text) * 0.65)', marginBottom: '6px' }}>
            <strong>Kies uit: </strong>{bankWords.join(' · ')}
        </div>
    );

    // ── HOEKEN METEN: to-scale angle + a "___°" answer line ───────────────────
    if (kind === 'hoek' && mode === 'meten') {
        // to-scale (real cm px, font-size-proof) so no tokenRatio factor — each box is
        // sized tight to its own angle; a 160° angle at max rotation jitter is the widest
        // case, used here only to decide the column count (2 per row at full, 1 at half).
        const worstBox = Math.max(hoekMetenGeom(160, 8).w, hoekMetenGeom(160, -8).w);
        return (
            <FragmentableGrid
                cols={fitCols(availableWidth, worstBox, 2, 18)}
                columnGap={24}
                rowGap={gap + 10}
                alignItems="flex-start"
                items={exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: 'calc(var(--sheet-size-text) * 0.75)' }}>
                        <HoekMetenSVG ex={ex} raster={raster} hulplijn={showHulplijn} />
                        {showSolutions
                            ? <span style={{ ...solutionText, fontFamily: mono, fontWeight: 'bold' }}>{ex.angleDeg}°</span>
                            : <span>_____ °</span>}
                    </div>
                ))}
            />
        );
    }

    // ── PUNT-LIJN HERKENNEN: the labelled scenario + its sentence(s) with blanks ──
    // Niveau 1's single step has an empty before/after, so it renders as the bare naming
    // line under the figure that this leaf has always had.
    if (isScenario && mode === 'herkennen') {
        const figure = niveau >= 2 ? 150 : 115;
        const cols = fitCols(availableWidth, (niveau >= 2 ? 200 : 120) * tokenRatio + 18, niveau >= 2 ? 2 : perRow, 18);
        return (
            <FragmentableGrid
                cols={1}
                columnGap={0}
                rowGap={0}
                items={[
                    ...(woordbank ? [woordbank] : []),
                    <div key="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: `${gap + 8}px 18px` }}>
                        {exercises.map(ex => (
                            <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                {mini(ex, figure)}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: niveau >= 2 ? 'flex-start' : 'center', fontSize: 'calc(var(--sheet-size-text) * 0.7)' }}>
                                    {(ex.steps ?? []).filter(s => s.answer !== undefined).map((s, i) => (
                                        <div key={i}>
                                            {s.before}
                                            {showSolutions
                                                ? <span style={{ ...solutionText, fontFamily: mono, fontWeight: 'bold' }}>{s.answer}</span>
                                                : <span style={{ display: 'inline-block', minWidth: '72px', borderBottom: '1.5px solid #000' }}>&nbsp;</span>}
                                            {s.after}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>,
                ]}
            />
        );
    }

    // ── PUNT-LIJN NIVEAU 2/3 (LEGACY sheets): drawing + fill-in-the-blank sentence(s) ──
    if (isRelationMode) {
        return (
            <FragmentableGrid
                cols={1}
                columnGap={0}
                rowGap={0}
                items={[
                    ...(woordbank ? [woordbank] : []),
                    <div key="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${fitCols(availableWidth, 170 * tokenRatio + 18, 2, 18)}, 1fr)`, gap: `${gap + 10}px 18px` }}>
                        {exercises.map(ex => (
                            <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                {ex.subExercises
                                    ? <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {ex.subExercises.map(sub => <div key={sub.id}>{mini(sub, 120)}</div>)}
                                    </div>
                                    : mini(ex, 140)}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', fontSize: 'calc(var(--sheet-size-text) * 0.7)' }}>
                                    {(ex.relations ?? []).map((r, i) => (
                                        <div key={i}>
                                            {r.before}
                                            {showSolutions
                                                ? <span style={{ ...solutionText, fontFamily: mono, fontWeight: 'bold' }}>{r.answer}</span>
                                                : <span style={{ display: 'inline-block', minWidth: '64px', borderBottom: '1.5px solid #000' }}>&nbsp;</span>}
                                            {r.after}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>,
                ]}
            />
        );
    }

    // ── TEKENEN: instruction + empty (raster) box; solution draws the element red ──
    // Niveau 2/3 (punt-lijn only) reuses the same relation exercises as herkennen —
    // the pupil draws the relation instead of filling in a sentence.
    if (mode === 'tekenen') {
        const boxPx = boxH * CM;
        const drawBox = (target: VormleerExercise) => (
            <div key={target.id} style={{ position: 'relative', width: '100%', maxWidth: '280px', height: `${boxPx}px`, border: '1px solid #000' }}>
                {raster && (
                    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                        {Array.from({ length: Math.ceil(280 / CM) }, (_, i) => <line key={`v${i}`} x1={(i + 1) * CM} y1={0} x2={(i + 1) * CM} y2={boxPx} stroke="#ccc" strokeWidth={0.6} />)}
                        {Array.from({ length: Math.ceil(boxPx / CM) }, (_, i) => <line key={`h${i}`} x1={0} y1={(i + 1) * CM} x2={280} y2={(i + 1) * CM} stroke="#ccc" strokeWidth={0.6} />)}
                    </svg>
                )}
                {showSolutions && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...solutionText }}>
                        {/* Fill the box rather than sit in the middle of it: the solution is what the pupil compares their own drawing with. */}
                        <div style={{ filter: 'none' }}>{mini({ ...target, id: `${target.id}-sol` }, Math.min(boxPx - 6, 150), true)}</div>
                    </div>
                )}
            </div>
        );
        // A hoek gets its three-letter name in the instruction when the generator wrote one.
        const hoekLine = (ex: VormleerExercise) => {
            const names = (ex.labels ?? []).length === 3 ? ex.labels!.join('') : null;
            return <span>Teken: <strong>{CONCEPT_NAMES[ex.concept] ?? ex.concept}</strong>{names ? <> <strong>{names}</strong></> : null}</span>;
        };
        return (
            <FragmentableGrid
                cols={2}
                columnGap={24}
                rowGap={gap + 6}
                alignItems="flex-start"
                items={exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: 'calc(var(--sheet-size-text) * 0.65)' }}>
                        {ex.steps?.length
                            // The scenario: one box, and its steps numbered above it from niveau 3 on.
                            ? <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    {ex.steps.map((s, i) => (
                                        <span key={i}>{ex.steps!.length > 1 ? <strong>{i + 1}. </strong> : null}{s.text}</span>
                                    ))}
                                </div>
                                {drawBox(ex)}
                            </>
                            : ex.subExercises
                            // LEGACY niveau 3: two independent relations, each its own instruction + box.
                            ? ex.subExercises.map(sub => (
                                <div key={sub.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <span>Teken: <strong>{CONCEPT_NAMES[sub.concept] ?? sub.concept}</strong></span>
                                    {drawBox(sub)}
                                </div>
                            ))
                            : <>
                                {hoekLine(ex)}
                                {drawBox(ex)}
                            </>}
                    </div>
                ))}
            />
        );
    }

    // ── EIGENSCHAPPEN: tick-table — figure column + property columns ──────────
    // Column count varies with the ticked concepts (up to 6 for driehoeken): fixed 130px
    // columns need up to 900px, well past the full 688px sheet column (BUGS.md). Both the
    // figure and property column widths are read off the current cell width instead, and
    // when even a narrow column would still overflow, the columns split across stacked
    // mini-tables (each repeating the figure column) rather than clip off the sheet.
    if (mode === 'eigenschappen' && kind === 'figuur') {
        const cols = eigenschapCols(classify, concepts);
        const figColPx = sheetPx * (120 / PX_PER_EM_AT_DEFAULT);
        const PROP_COL_MIN_PX = 60;   // narrowest a two/three-line header still reads at
        const colsPerTable = Math.max(1, Math.min(cols.length, Math.floor((availableWidth - figColPx) / PROP_COL_MIN_PX)));
        const propColPx = Math.max(PROP_COL_MIN_PX, Math.floor((availableWidth - figColPx) / colsPerTable));
        const grid = `${mathPx(120)} repeat(${colsPerTable}, ${propColPx}px)`;
        const cell: React.CSSProperties = {
            border: '1px solid #000', minHeight: '40px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 'calc(var(--sheet-size-text) * 0.6)', boxSizing: 'border-box', padding: '4px 6px', textAlign: 'center',
        };
        const tables: React.ReactNode[] = [];
        for (let i = 0; i < cols.length; i += colsPerTable) {
            const chunk = cols.slice(i, i + colsPerTable);
            tables.push(
                <div key={`head-${i}`} className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content', marginTop: i > 0 ? '10px' : 0 }}>
                    <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>figuur</div>
                    {chunk.map(col => <div key={col.label} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{col.label}</div>)}
                </div>
            );
            tables.push(...exercises.map(ex => (
                <div key={`${ex.id}-${i}`} className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content' }}>
                    <div style={{ ...cell, minHeight: mathPx(86) }}>{mini(ex, 76)}</div>
                    {chunk.map(col => (
                        <div key={col.label} style={{ ...cell, ...solutionText, fontFamily: mono, fontWeight: 'bold', fontSize: 'calc(var(--sheet-size-math) * 0.87)' }}>
                            {showSolutions && col.test(ex) ? '✕' : ''}
                        </div>
                    ))}
                </div>
            )));
        }
        return <FragmentableGrid cols={1} columnGap={0} rowGap={0} items={tables} />;
    }

    // ── HERKENNEN / BENOEMEN: grid of minis + name line beneath ────────────────
    return (
        <FragmentableGrid
            cols={1}
            columnGap={0}
            rowGap={0}
            items={[
                ...(woordbank ? [woordbank] : []),
                <div key="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${fitCols(availableWidth, 110 * tokenRatio + 18, perRow, 18)}, 1fr)`, gap: `${gap + 8}px 18px` }}>
                    {exercises.map(ex => (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            {mini(ex, 110)}
                            {showSolutions
                                ? <span style={{ ...solutionText, fontFamily: mono, fontSize: 'calc(var(--sheet-size-text) * 0.6)', textAlign: 'center' }}>{CONCEPT_NAMES[ex.concept] ?? ex.concept}</span>
                                : <span style={{ borderBottom: '1.5px solid #000', width: '90%', height: '16px' }} />}
                        </div>
                    ))}
                </div>,
            ]}
        />
    );
}
