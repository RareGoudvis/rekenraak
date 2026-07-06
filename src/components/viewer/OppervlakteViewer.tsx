import type { MathBlock, MeetExercise, MeetPoint } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// SYNC: keep CM/label geometry aligned with MetenViewer (same to-scale convention).
const CM = 37.8;
const A4_CONTENT_PX = 625;
const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const round1 = (v: number) => Math.round(v * 10) / 10;
const fmt = (v: number) => formatMathNumber(round1(v));

function sideLabelPos(a: MeetPoint, b: MeetPoint, centroid: MeetPoint) {
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
    if ((mid.x - centroid.x) * nx + (mid.y - centroid.y) * ny < 0) { nx = -nx; ny = -ny; }
    return { x: mid.x + nx * 20, y: mid.y + ny * 20 };
}

export default function OppervlakteViewer({ block, showSolutions }: Props) {
    const exercises: MeetExercise[] = block.meetExercises || [];
    const subType: string = block.constraints.subType ?? 'berekenen';
    const scaffoldFormule: boolean = block.constraints.scaffoldFormule ?? true;
    const askOmtrek: boolean = block.constraints.askOmtrek ?? false;
    const gap = block.verticalSpacing || 14;
    const isRooster = subType === 'rooster';

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const blank = (sol: string | null, width = 56) => sol !== null
        ? <span style={{ color: SOL }}>{sol}</span>
        : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: `${width}px`, height: '16px' }} />;

    const pad = 40;
    const geoms = exercises.map(ex => {
        const pts = (ex.points ?? []).map(p => ({ x: p.x * CM, y: p.y * CM }));
        const w = Math.max(...pts.map(p => p.x)), h = Math.max(...pts.map(p => p.y));
        return { pts, w, h };
    });
    const figH = Math.max(...geoms.map(g => g.h)) + 2 * pad;
    const maxW = Math.max(...geoms.map(g => g.w)) + 2 * pad;
    const cols = maxW * 2 + gap + 10 <= A4_CONTENT_PX ? 2 : 1;

    return (
        <FragmentableGrid
            cols={cols}
            columnGap={gap + 10}
            rowGap={gap + 8}
            alignItems="flex-start"
            items={exercises.map((ex, idx) => {
                const g = geoms[idx];
                const W = g.w + 2 * pad;
                const cs = g.pts.map(p => ({ x: pad + p.x, y: pad + p.y }));
                const centroid = { x: cs.reduce((a, p) => a + p.x, 0) / cs.length, y: cs.reduce((a, p) => a + p.y, 0) / cs.length };
                const sides = ex.sides ?? [];

                // Grid lines behind the figure (rooster) — clipped to the polygon.
                const clipId = `opp-clip-${ex.id}`;
                const gridLines: React.ReactNode[] = [];
                if (isRooster) {
                    for (let x = 0; x <= Math.ceil(g.w / CM); x++) gridLines.push(<line key={`v${x}`} x1={pad + x * CM} y1={pad} x2={pad + x * CM} y2={pad + g.h} stroke="#999" strokeWidth={0.75} />);
                    for (let y = 0; y <= Math.ceil(g.h / CM); y++) gridLines.push(<line key={`h${y}`} x1={pad} y1={pad + y * CM} x2={pad + g.w} y2={pad + y * CM} stroke="#999" strokeWidth={0.75} />);
                }

                // berekenen: label the defining sides (l × b — skip duplicates & the hypotenuse).
                const labels: React.ReactNode[] = [];
                if (!isRooster) {
                    const labelIdx = ex.shape === 'rechthoekige-driehoek' ? [0, 2] : ex.shape === 'vierkant' ? [0] : [0, 1];
                    labelIdx.forEach(i => {
                        const pos = sideLabelPos(cs[i], cs[(i + 1) % cs.length], centroid);
                        labels.push(
                            <div key={i} style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%,-50%)', fontFamily: mono, fontSize: '12px', whiteSpace: 'nowrap' }}>
                                {fmt(sides[i])} cm
                            </div>
                        );
                    });
                }

                const area = ex.area ?? 0;
                const factors = ex.shape === 'vierkant' ? [sides[0], sides[0]]
                    : ex.shape === 'rechthoekige-driehoek' ? [sides[0], sides[2]]
                    : [sides[0], sides[1]];

                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: mono, fontSize: '14px' }}>
                        <div style={{ position: 'relative', width: `${W}px`, height: `${figH}px` }}>
                            <svg width={W} height={figH} style={{ display: 'block', overflow: 'visible' }}>
                                {isRooster && (
                                    <>
                                        <defs><clipPath id={clipId}><polygon points={cs.map(p => `${p.x},${p.y}`).join(' ')} /></clipPath></defs>
                                        <g clipPath={`url(#${clipId})`}>{gridLines}</g>
                                    </>
                                )}
                                <polygon points={cs.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#000" strokeWidth={2} />
                            </svg>
                            {labels}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                            {isRooster
                                ? <>
                                    <span>oppervlakte =</span>
                                    {blank(showSolutions ? fmt(area) : null)}
                                    <span>cm²</span>
                                </>
                                : scaffoldFormule
                                    ? <>
                                        <span>opp = {ex.shape === 'rechthoekige-driehoek' ? '½ ×' : ''}</span>
                                        {blank(showSolutions ? fmt(factors[0]) : null, 36)}
                                        <span>×</span>
                                        {blank(showSolutions ? fmt(factors[1]) : null, 36)}
                                        <span>=</span>
                                        {blank(showSolutions ? fmt(area) : null, 48)}
                                        <span>cm²</span>
                                    </>
                                    : <>
                                        <span>opp =</span>
                                        {blank(showSolutions ? fmt(area) : null)}
                                        <span>cm²</span>
                                    </>}
                        </div>
                        {askOmtrek && !isRooster && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <span>omtrek =</span>
                                {blank(showSolutions ? fmt(ex.perimeter) : null)}
                                <span>cm</span>
                            </div>
                        )}
                    </div>
                );
            })}
        />
    );
}
