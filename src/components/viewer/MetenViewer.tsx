import type { MathBlock, MeetExercise, MeetPoint } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const CM = 37.8;            // 1 cm at 96dpi — keeps the drawing genuinely to scale
const OFFSET = 22;          // how far side labels sit outside the figure
const A4_CONTENT_PX = 625;  // print-fit content width (see CijferViewer) — decides 1 vs 2 columns
const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const round1 = (v: number) => Math.round(v * 10) / 10;
const fmt = (v: number) => formatMathNumber(round1(v));

interface Geom { w: number; h: number; pts: MeetPoint[]; isCircle: boolean; rpx: number; }
function geomOf(ex: MeetExercise): Geom {
    if (ex.kind === 'cirkel') {
        const rpx = (ex.radius ?? 1) * CM;
        return { w: 2 * rpx, h: 2 * rpx, pts: [], isCircle: true, rpx };
    }
    const raw = (ex.points ?? []).map(p => ({ x: p.x * CM, y: p.y * CM }));
    const minX = Math.min(...raw.map(p => p.x)), minY = Math.min(...raw.map(p => p.y));
    const maxX = Math.max(...raw.map(p => p.x)), maxY = Math.max(...raw.map(p => p.y));
    return { w: maxX - minX, h: maxY - minY, pts: raw.map(p => ({ x: p.x - minX, y: p.y - minY })), isCircle: false, rpx: 0 };
}

// Outward label point + the outward normal (so labels can anchor away from the figure).
function sideLabelPos(a: MeetPoint, b: MeetPoint, centroid: MeetPoint, off = OFFSET): { x: number; y: number; nx: number; ny: number } {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
    if ((mid.x - centroid.x) * nx + (mid.y - centroid.y) * ny < 0) { nx = -nx; ny = -ny; }
    return { x: mid.x + nx * off, y: mid.y + ny * off, nx, ny };
}
// Anchor the label so its text grows away from the figure (never overlaps it).
const anchor = (nx: number, ny: number): string => {
    const tx = nx > 0.3 ? '0' : nx < -0.3 ? '-100%' : '-50%';
    const ty = ny > 0.3 ? '0' : ny < -0.3 ? '-100%' : '-50%';
    return `translate(${tx}, ${ty})`;
};

export default function MetenViewer({ block, showSolutions }: Props) {
    const exercises: MeetExercise[] = block.meetExercises || [];
    const gap = block.verticalSpacing || 14;
    const measureModel: string = block.constraints.measureModel ?? 'meten';
    const perSideScaffold: boolean = block.constraints.perSideScaffold ?? false;
    const answerMode: string = block.constraints.answerMode ?? 'single';
    const answerUnit: string = block.constraints.answerUnit ?? 'cm';
    const labeled = measureModel === 'gegeven';
    const isJuistFout = block.typeId === 'lengte-meten' && labeled;
    // Per-side scaffold only applies to omtrek shapes (a single line's "per side" = the answer).
    const sideScaffold = perSideScaffold && block.typeId === 'omtrek';

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const ansBlank = (sol: number | null, width = 80) => (
        <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '3px' }}>
            {sol !== null ? <span style={{ color: SOL }}>{fmt(sol)}</span>
                : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: `${width}px`, height: '18px' }} />}
            {answerUnit === 'cm' && <span>cm</span>}
        </span>
    );
    const scaffoldBlank = (sol: number | null) => (
        <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '3px' }}>
            {sol !== null ? <span style={{ color: SOL }}>{fmt(sol)}</span>
                : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '38px', height: '15px' }} />}
            <span>cm</span>
        </span>
    );

    const geoms = exercises.map(geomOf);
    // Wider padding when scaffold blanks sit beside the figure, so they don't bleed out.
    const pad = sideScaffold ? 64 : 42;
    const bottomExtra = sideScaffold ? 18 : 0;
    const figH = Math.max(...geoms.map(g => g.h)) + 2 * pad + bottomExtra;
    const maxW = Math.max(...geoms.map(g => g.w)) + 2 * pad;
    const columnGap = gap + 10;
    // Two columns only when two items (plus the gap) actually fit the printable width.
    const cols = maxW * 2 + columnGap <= A4_CONTENT_PX ? 2 : 1;

    return (
        <FragmentableGrid
            cols={cols}
            columnGap={columnGap}
            rowGap={gap + 8}
            items={exercises.map((ex, idx) => {
                const g = geoms[idx];
                const right = cols === 2 && idx % 2 === 1;   // mirror the second column
                const yOff = pad + ((figH - bottomExtra) - 2 * pad - g.h) / 2;
                const W = g.w + 2 * pad;
                const sides = ex.sides ?? [];

                const cs = g.pts.map(p => ({ x: pad + p.x, y: yOff + p.y }));
                const centroid = g.isCircle
                    ? { x: pad + g.rpx, y: yOff + g.rpx }
                    : { x: cs.reduce((a, p) => a + p.x, 0) / cs.length, y: cs.reduce((a, p) => a + p.y, 0) / cs.length };
                const closed = ex.kind === 'veelhoek';

                // Side labels / scaffolds — polygons (+ circle d-label); never for a plain line.
                const labels: React.ReactNode[] = [];
                if (closed) {
                    for (let i = 0; i < cs.length; i++) {
                        const pos = sideLabelPos(cs[i], cs[(i + 1) % cs.length], centroid);
                        let content: React.ReactNode = null;
                        if (labeled) content = <span>{fmt(sides[i])} cm</span>;
                        else if (sideScaffold) content = scaffoldBlank(showSolutions ? sides[i] : null);
                        if (content) labels.push(
                            <div key={i} style={{ position: 'absolute', left: pos.x, top: pos.y, transform: anchor(pos.nx, pos.ny), fontFamily: mono, fontSize: '12px', whiteSpace: 'nowrap' }}>{content}</div>
                        );
                    }
                } else if (g.isCircle && (labeled || sideScaffold)) {
                    const d = (ex.radius ?? 0) * 2;
                    labels.push(
                        <div key="d" style={{ position: 'absolute', left: centroid.x, top: centroid.y + 16, transform: 'translate(-50%,-50%)', fontFamily: mono, fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {labeled ? <span>d = {fmt(d)} cm</span> : <span style={{ display: 'inline-flex', gap: '3px' }}>d = {scaffoldBlank(showSolutions ? d : null)}</span>}
                        </div>
                    );
                }

                // Answer area.
                let answer: React.ReactNode;
                if (isJuistFout) {
                    const correctWord = ex.claimCorrect ? 'juist' : 'fout';
                    const circle = (word: string) => {
                        const ring = showSolutions && word === correctWord;
                        return <span style={{ padding: '2px 10px', borderRadius: '50%', border: ring ? `2px solid ${SOL}` : '2px solid transparent', color: ring ? SOL : 'inherit' }}>{word}</span>;
                    };
                    answer = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontFamily: mono, fontSize: '15px' }}>
                            <span>Lengte = {fmt(ex.claim ?? 0)} cm</span>
                            <span style={{ display: 'inline-flex', gap: '10px' }}>{circle('juist')}{circle('fout')}</span>
                        </div>
                    );
                } else if (g.isCircle || answerMode === 'single') {
                    answer = ansBlank(showSolutions ? ex.perimeter : null, 90);
                } else {
                    answer = (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', flexWrap: 'wrap', fontFamily: mono, fontSize: '14px', justifyContent: right ? 'flex-end' : 'flex-start' }}>
                            {sides.map((s, i) => (
                                <span key={i} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '4px' }}>
                                    {i > 0 && <span>+</span>}
                                    {ansBlank(showSolutions ? s : null, 40)}
                                </span>
                            ))}
                            <span>=</span>
                            {ansBlank(showSolutions ? ex.perimeter : null, 56)}
                        </div>
                    );
                }

                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: right ? 'flex-end' : 'flex-start', justifySelf: right ? 'end' : 'start', fontFamily: mono, fontSize: '15px' }}>
                        <div style={{ position: 'relative', width: `${W}px`, height: `${figH}px` }}>
                            <svg width={W} height={figH} style={{ display: 'block', overflow: 'visible' }}>
                                {g.isCircle ? (
                                    <>
                                        <circle cx={centroid.x} cy={centroid.y} r={g.rpx} fill="none" stroke="#000" strokeWidth={2} />
                                        <circle cx={centroid.x} cy={centroid.y} r={2.5} fill="#000" />
                                    </>
                                ) : (
                                    closed
                                        ? <polygon points={cs.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#000" strokeWidth={2} />
                                        : <polyline points={cs.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#000" strokeWidth={2} />
                                )}
                            </svg>
                            {labels}
                        </div>
                        {answer}
                    </div>
                );
            })}
        />
    );
}
