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

// Eigenschappen columns per classify axis (leerplan formulations).
const EIGENSCHAP_COLS: Record<string, { label: string; test: (c: string) => boolean }[]> = {
    'driehoeken-hoeken': [
        { label: 'alle hoeken scherp', test: c => c === 'scherphoekig' },
        { label: 'één rechte hoek', test: c => c === 'rechthoekig' },
        { label: 'één stompe hoek', test: c => c === 'stomphoekig' },
    ],
    'driehoeken-zijden': [
        { label: '3 gelijke zijden', test: c => c === 'gelijkzijdig' },
        { label: 'juist 2 gelijke zijden', test: c => c === 'gelijkbenig' },
        { label: 'geen gelijke zijden', test: c => c === 'ongelijkzijdig' },
    ],
    'vierhoeken': [
        { label: '4 rechte hoeken', test: c => c === 'vierkant' || c === 'rechthoek' },
        { label: '4 gelijke zijden', test: c => c === 'vierkant' || c === 'ruit' },
        { label: '2 paar evenwijdige zijden', test: c => c !== 'trapezium' },
    ],
};

const rot = (p: MeetPoint, deg: number): MeetPoint => {
    const r = (deg * Math.PI) / 180;
    return { x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r) };
};

// ── figure mini (driehoeken/vierhoeken) with equal-side ticks + right-angle marks ──
function FigureSVG({ ex, size, showMarks }: { ex: VormleerExercise; size: number; showMarks: boolean }) {
    const scale = 0.55;   // minis: ~55% of true size so a row of them fits
    const raw = (ex.points ?? []).map(p => rot(p, ex.rotation ?? 0)).map(p => ({ x: p.x * CM * scale, y: -p.y * CM * scale }));
    const minX = Math.min(...raw.map(p => p.x)), minY = Math.min(...raw.map(p => p.y));
    const w = Math.max(...raw.map(p => p.x)) - minX, h = Math.max(...raw.map(p => p.y)) - minY;
    const ox = (size - w) / 2 - minX, oy = (size - h) / 2 - minY;
    const pts = raw.map(p => ({ x: p.x + ox, y: p.y + oy }));
    const sides = ex.sides ?? [];

    const marks: React.ReactNode[] = [];
    if (showMarks) {
        // Equal-side tick marks: sides with (rounded) equal length share a tick count.
        const groups = new Map<number, number>();
        sides.forEach(s => { const k = Math.round(s * 10); if (!groups.has(k)) groups.set(k, groups.size + 1); });
        // Only mark groups that actually contain ≥2 sides.
        const counts = new Map<number, number>();
        sides.forEach(s => { const k = Math.round(s * 10); counts.set(k, (counts.get(k) ?? 0) + 1); });
        pts.forEach((a, i) => {
            const b = pts[(i + 1) % pts.length];
            const k = Math.round((sides[i] ?? 0) * 10);
            if ((counts.get(k) ?? 0) < 2) return;
            const n = groups.get(k) ?? 1;
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
            const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;   // along the side
            const nx = -uy, ny = ux;                                 // perpendicular
            for (let t = 0; t < n; t++) {
                const off = (t - (n - 1) / 2) * 5;
                marks.push(
                    <line key={`tick${i}-${t}`}
                        x1={mid.x + ux * off - nx * 4} y1={mid.y + uy * off - ny * 4}
                        x2={mid.x + ux * off + nx * 4} y2={mid.y + uy * off + ny * 4}
                        stroke="#000" strokeWidth={1.4} />
                );
            }
        });
        // Right-angle squares at ~90° corners.
        pts.forEach((p, i) => {
            const prev = pts[(i - 1 + pts.length) % pts.length];
            const next = pts[(i + 1) % pts.length];
            const v1 = { x: prev.x - p.x, y: prev.y - p.y }, v2 = { x: next.x - p.x, y: next.y - p.y };
            const l1 = Math.hypot(v1.x, v1.y) || 1, l2 = Math.hypot(v2.x, v2.y) || 1;
            const cos = (v1.x * v2.x + v1.y * v2.y) / (l1 * l2);
            if (Math.abs(cos) > 0.05) return;
            const s = 8;
            const u1 = { x: (v1.x / l1) * s, y: (v1.y / l1) * s }, u2 = { x: (v2.x / l2) * s, y: (v2.y / l2) * s };
            marks.push(
                <polyline key={`ra${i}`}
                    points={`${p.x + u1.x},${p.y + u1.y} ${p.x + u1.x + u2.x},${p.y + u1.y + u2.y} ${p.x + u2.x},${p.y + u2.y}`}
                    fill="none" stroke="#000" strokeWidth={1.2} />
            );
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
        parts.push(line(A, B, 'l'), arrow(A, -ux, -uy, 'a1'), arrow(B, ux, uy, 'a2'), text({ x: cx, y: cy }, (labels[0] ?? 'a').toLowerCase(), 't'));
    } else if (ex.concept === 'halfrechte') {
        parts.push(line(A, B, 'l'), dot(A, 'd'), arrow(B, ux, uy, 'a'), text(A, labels[0] ?? 'A', 't1'), text(B, labels[1] ?? 'B', 't2'));
    } else if (ex.concept === 'lijnstuk') {
        parts.push(line(A, B, 'l'), dot(A, 'd1'), dot(B, 'd2'), text(A, labels[0] ?? 'A', 't1'), text(B, labels[1] ?? 'B', 't2'));
    } else {
        // Pairs: evenwijdig / snijdend / loodrecht — two full lines with arrowheads.
        const off = 14;
        const nx = -uy * off, ny = ux * off;
        if (ex.concept === 'evenwijdig') {
            const A2 = { x: A.x + nx, y: A.y + ny }, B2 = { x: B.x + nx, y: B.y + ny };
            const A1 = { x: A.x - nx, y: A.y - ny }, B1 = { x: B.x - nx, y: B.y - ny };
            parts.push(line(A1, B1, 'l1'), line(A2, B2, 'l2'),
                arrow(A1, -ux, -uy, 'a1'), arrow(B1, ux, uy, 'a2'), arrow(A2, -ux, -uy, 'a3'), arrow(B2, ux, uy, 'a4'));
        } else {
            const cross = ex.concept === 'loodrecht' ? 90 : 55;
            const ang2 = ang + (cross * Math.PI) / 180;
            const vx = Math.cos(ang2), vy = Math.sin(ang2);
            const C = { x: cx - half * vx, y: cy - half * vy }, D = { x: cx + half * vx, y: cy + half * vy };
            parts.push(line(A, B, 'l1'), line(C, D, 'l2'),
                arrow(A, -ux, -uy, 'a1'), arrow(B, ux, uy, 'a2'), arrow(C, -vx, -vy, 'a3'), arrow(D, vx, vy, 'a4'));
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
    const showMarks: boolean = c.showMarks ?? true;
    const showBoog: boolean = c.showBoog ?? true;
    const raster: boolean = c.raster ?? true;
    const boxH: number = c.boxHeight ?? 4;   // tekenen box height in cm
    const perRow: number = c.exercisesPerRow ?? 3;
    const classify: string = c.classify ?? 'vierhoeken';
    const concepts: string[] = c.concepts ?? [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const mini = (ex: VormleerExercise, size: number) =>
        ex.kind === 'figuur' ? <FigureSVG ex={ex} size={size} showMarks={showMarks} />
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
        const cols = EIGENSCHAP_COLS[classify] ?? EIGENSCHAP_COLS['vierhoeken'];
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
                                    {showSolutions && col.test(ex.concept) ? '✕' : ''}
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
