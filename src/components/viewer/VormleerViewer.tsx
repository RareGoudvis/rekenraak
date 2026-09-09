import type { MathBlock, VormleerExercise, MeetPoint } from '../../services/math/types';
import { CONCEPT_NAMES } from '../../services/vormleer/vormleerGenerator';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// SYNC: same to-scale convention as MetenViewer (1 cm ≈ 37.8 px), scaled down for minis.
const CM = 37.8;
const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';

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

function FigureSVG({ ex, size, marks: opt }: { ex: VormleerExercise; size: number; marks: FigureMarks }) {
    const scale = 0.55;   // minis: ~55% of true size so a row of them fits
    const raw = (ex.points ?? []).map(p => rot(p, ex.rotation ?? 0)).map(p => ({ x: p.x * CM * scale, y: -p.y * CM * scale }));
    const minX = Math.min(...raw.map(p => p.x)), minY = Math.min(...raw.map(p => p.y));
    const w = Math.max(...raw.map(p => p.x)) - minX, h = Math.max(...raw.map(p => p.y)) - minY;
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
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
            <polygon points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#000" strokeWidth={1.8} />
            {marks}
        </svg>
    );
}

// ── hoek mini: two rays + arc (square marker for a right angle) ──────────────
function HoekSVG({ ex, size, showBoog }: { ex: VormleerExercise; size: number; showBoog: boolean }) {
    const cx = size * 0.4, cy = size * 0.62;
    const rayLen = size * 0.44;
    const base = ex.rotation ?? 0;
    const a1 = (base * Math.PI) / 180;
    const a2 = ((base - (ex.angleDeg ?? 45)) * Math.PI) / 180;   // open counterclockwise (upward on screen)
    const end1 = { x: cx + rayLen * Math.cos(a1), y: cy + rayLen * Math.sin(a1) };
    const end2 = { x: cx + rayLen * Math.cos(a2), y: cy + rayLen * Math.sin(a2) };
    const marker: React.ReactNode = !showBoog ? null : (ex.angleDeg === 90
        ? (() => {
            const s = 12;
            const u1 = { x: Math.cos(a1) * s, y: Math.sin(a1) * s }, u2 = { x: Math.cos(a2) * s, y: Math.sin(a2) * s };
            return <polyline points={`${cx + u1.x},${cy + u1.y} ${cx + u1.x + u2.x},${cy + u1.y + u2.y} ${cx + u2.x},${cy + u2.y}`} fill="none" stroke="#000" strokeWidth={1.2} />;
        })()
        : (() => {
            const r = 16;
            const large = (ex.angleDeg ?? 0) > 180 ? 1 : 0;
            return <path d={`M ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)} A ${r} ${r} 0 ${large} 0 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)}`} fill="none" stroke="#000" strokeWidth={1.2} />;
        })());
    return (
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
            <line x1={cx} y1={cy} x2={end1.x} y2={end1.y} stroke="#000" strokeWidth={1.8} />
            <line x1={cx} y1={cy} x2={end2.x} y2={end2.y} stroke="#000" strokeWidth={1.8} />
            {marker}
            <circle cx={cx} cy={cy} r={2} fill="#000" />
        </svg>
    );
}

// ── punt-lijn mini: dot / line / half-line / segment / pair variants ─────────
function PuntLijnSVG({ ex, size }: { ex: VormleerExercise; size: number }) {
    const cx = size / 2, cy = size / 2;
    const half = size * 0.4;
    const ang = ((ex.rotation ?? 0) * Math.PI) / 180;
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const A = { x: cx - half * ux, y: cy - half * uy };
    const B = { x: cx + half * ux, y: cy + half * uy };
    const labels = ex.labels ?? [];

    const arrow = (tip: MeetPoint, dirX: number, dirY: number, key: string) => {
        const s = 7;
        const nx = -dirY, ny = dirX;
        return <polyline key={key} points={`${tip.x - dirX * s + nx * s * 0.6},${tip.y - dirY * s + ny * s * 0.6} ${tip.x},${tip.y} ${tip.x - dirX * s - nx * s * 0.6},${tip.y - dirY * s - ny * s * 0.6}`} fill="none" stroke="#000" strokeWidth={1.5} />;
    };
    const dot = (p: MeetPoint, key: string) => <circle key={key} cx={p.x} cy={p.y} r={2.5} fill="#000" />;
    const text = (p: MeetPoint, s: string, key: string, dy = -8) =>
        <text key={key} x={p.x} y={p.y + dy} textAnchor="middle" fontSize="12" fontFamily={mono} fontStyle="italic">{s}</text>;

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
    } else {
        // Pairs: evenwijdig / snijdend / loodrecht — two rechten, so no arrowheads either.
        const off = 14;
        const nx = -uy * off, ny = ux * off;
        if (ex.concept === 'evenwijdig') {
            const A2 = { x: A.x + nx, y: A.y + ny }, B2 = { x: B.x + nx, y: B.y + ny };
            const A1 = { x: A.x - nx, y: A.y - ny }, B1 = { x: B.x - nx, y: B.y - ny };
            parts.push(line(A1, B1, 'l1'), line(A2, B2, 'l2'));
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
        }
    }
    return <svg width={size} height={size} style={{ overflow: 'visible' }}>{parts}</svg>;
}

export default function VormleerViewer({ block, showSolutions }: Props) {
    const exercises: VormleerExercise[] = block.vormleerExercises || [];
    const c = block.constraints;
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
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const mini = (ex: VormleerExercise, size: number) =>
        ex.kind === 'figuur' ? <FigureSVG ex={ex} size={size} marks={figMarks} />
            : ex.kind === 'hoek' ? <HoekSVG ex={ex} size={size} showBoog={showBoog} />
            : <PuntLijnSVG ex={ex} size={size} />;

    const woordbank = answerMode === 'woordbank' && (mode === 'herkennen' || mode === 'benoemen') && (
        <div key="bank" className="print-exercise" style={{ fontSize: '13px', marginBottom: '6px' }}>
            <strong>Kies uit: </strong>{concepts.map(k => CONCEPT_NAMES[k] ?? k).join(' · ')}
        </div>
    );

    // ── TEKENEN: instruction + empty (raster) box; solution draws the element red ──
    if (mode === 'tekenen') {
        const boxPx = boxH * CM;
        return (
            <FragmentableGrid
                cols={2}
                columnGap={24}
                rowGap={gap + 6}
                alignItems="flex-start"
                items={exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px' }}>
                        <span>Teken: <strong>{CONCEPT_NAMES[ex.concept] ?? ex.concept}</strong></span>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '280px', height: `${boxPx}px`, border: '1px solid #000' }}>
                            {raster && (
                                <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                                    {Array.from({ length: Math.ceil(280 / CM) }, (_, i) => <line key={`v${i}`} x1={(i + 1) * CM} y1={0} x2={(i + 1) * CM} y2={boxPx} stroke="#ccc" strokeWidth={0.6} />)}
                                    {Array.from({ length: Math.ceil(boxPx / CM) }, (_, i) => <line key={`h${i}`} x1={0} y1={(i + 1) * CM} x2={280} y2={(i + 1) * CM} stroke="#ccc" strokeWidth={0.6} />)}
                                </svg>
                            )}
                            {showSolutions && (
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOL }}>
                                    <div style={{ filter: 'none' }}>{mini({ ...ex, id: `${ex.id}-sol` }, Math.min(boxPx, 110))}</div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            />
        );
    }

    // ── EIGENSCHAPPEN: tick-table — figure column + property columns ──────────
    if (mode === 'eigenschappen' && kind === 'figuur') {
        const cols = eigenschapCols(classify, concepts);
        const grid = `120px ${cols.map(() => '130px').join(' ')}`;
        const cell: React.CSSProperties = {
            border: '1px solid #000', minHeight: '40px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '12px', boxSizing: 'border-box', padding: '4px 6px', textAlign: 'center',
        };
        return (
            <FragmentableGrid
                cols={1}
                columnGap={0}
                rowGap={0}
                items={[
                    <div key="head" className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content' }}>
                        <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>figuur</div>
                        {cols.map(col => <div key={col.label} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{col.label}</div>)}
                    </div>,
                    ...exercises.map(ex => (
                        <div key={ex.id} className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content' }}>
                            <div style={{ ...cell, minHeight: '86px' }}>{mini(ex, 76)}</div>
                            {cols.map(col => (
                                <div key={col.label} style={{ ...cell, color: SOL, fontFamily: mono, fontWeight: 'bold', fontSize: '15px' }}>
                                    {showSolutions && col.test(ex) ? '✕' : ''}
                                </div>
                            ))}
                        </div>
                    )),
                ]}
            />
        );
    }

    // ── HERKENNEN / BENOEMEN: grid of minis + name line beneath ────────────────
    return (
        <FragmentableGrid
            cols={1}
            columnGap={0}
            rowGap={0}
            items={[
                ...(woordbank ? [woordbank] : []),
                <div key="grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${perRow}, 1fr)`, gap: `${gap + 8}px 18px` }}>
                    {exercises.map(ex => (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            {mini(ex, 110)}
                            {showSolutions
                                ? <span style={{ color: SOL, fontFamily: mono, fontSize: '12px', textAlign: 'center' }}>{CONCEPT_NAMES[ex.concept] ?? ex.concept}</span>
                                : <span style={{ borderBottom: '1.5px solid #000', width: '90%', height: '16px' }} />}
                        </div>
                    ))}
                </div>,
            ]}
        />
    );
}
