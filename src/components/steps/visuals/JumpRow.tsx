import type { Fraction, GetallenasExercise } from '../../../services/math/types';
import { axisPlan, signedText, valueText, type AxisValue } from '../../../services/steps/getallenasSteps';
import type { StepsVisualProps } from '../stepsVisual';
import { arrowHead } from './svgArrow';
import './jumpRow.css';

const isFrac = (v: AxisValue): v is Fraction => typeof v === 'object' && v !== null;
const PAD = 10;
// Above the cells: the jump arcs and their labels.
const TOP = 50;

// Width in characters a label needs (a breuk: its whole part plus the longer of teller and noemer).
const labelChars = (v: AxisValue) => (isFrac(v) ? (v.whole ? String(v.whole).length + 1 : 0) + Math.max(String(v.n).length, String(v.d).length) : valueText(v).length);

function Label({ v, x, y, className }: { v: AxisValue; x: number; y: number; className?: string }) {
    if (!isFrac(v)) return <text x={x} y={y + 7} textAnchor="middle" className={className}>{valueText(v)}</text>;
    const fw = Math.max(String(v.n).length, String(v.d).length) * 9 + 6;
    const wholeW = v.whole ? String(v.whole).length * 11 + 3 : 0;
    const fx = x + wholeW / 2;
    return (
        <g className={className}>
            {v.whole ? <text x={fx - fw / 2 - 5} y={y + 7} textAnchor="end">{v.whole}</text> : null}
            <text x={fx} y={y - 4} textAnchor="middle" className="sv-jr-frac">{v.n}</text>
            <line x1={fx - fw / 2} y1={y} x2={fx + fw / 2} y2={y} className="sv-jr-bar" />
            <text x={fx} y={y + 15} textAnchor="middle" className="sv-jr-frac">{v.d}</text>
        </g>
    );
}

// The row of a getallenas ('as': a line with ticks) or getallenrij ('rij': vakjes): arcs between neighbours
// that get their jump (+5) once the sprong is found, the next empty place outlined, the empty places
// filling in as their questions are answered.
export default function JumpRow({ data, lines, revealed, look }: StepsVisualProps<GetallenasExercise> & { look: 'as' | 'rij' }) {
    const plan = axisPlan(data);
    if (!plan || lines[0]?.kind !== 'getallenas.sprong') return null;
    const { values, blank, jumps, order } = plan;
    const done = lines.slice(0, revealed).filter(l => l.kind === 'getallenas.vul').map(l => Number(l.mark));
    const filled = new Set(done);
    const latest = lines[revealed - 1]?.kind === 'getallenas.vul' ? done[done.length - 1] : undefined;
    const next = revealed >= 1 ? order[done.length]?.k : undefined;
    const jumpKnown = revealed >= 1;
    const frac = values.some(isFrac);
    const cellW = Math.max(58, Math.max(...values.map(labelChars)) * 12 + 22);
    const cx = (k: number) => PAD + cellW * (k + 0.5);
    const width = PAD * 2 + cellW * values.length;
    const half = frac ? 26 : 21;
    // The cells' centre line: under the arcs (rij), or under the axis with its ticks (as).
    const C = look === 'rij' ? TOP + half + 6 : TOP + 30 + half;
    const height = C + half + 6;
    const arcY = look === 'rij' ? C - half : TOP + 8;
    return (
        <svg className={`sv-jr sv-jr-${look}`} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: `${Math.round(width * 1.15)}px` }}
            role="img" aria-label={values.map((v, k) => (blank[k] && !filled.has(k) ? '…' : valueText(v))).join(', ')}>
            {look === 'as' && (
                <>
                    <line x1={2} y1={TOP + 16} x2={width - 2} y2={TOP + 16} className="sv-jr-axis" />
                    {/* SYNC: GetallenasViewer points the arrow the way the line counts (left on a decreasing line). */}
                    <path d={jumps[0] < 0 ? arrowHead(width, TOP + 16, 2, TOP + 16, 10) : arrowHead(0, TOP + 16, width - 2, TOP + 16, 10)} className="sv-jr-axis" />
                    {values.map((_, k) => <line key={k} x1={cx(k)} y1={TOP + 8} x2={cx(k)} y2={TOP + 24} className="sv-jr-axis" />)}
                </>
            )}
            {jumps.map((j, k) => {
                const x1 = cx(k) + (look === 'rij' ? 8 : 4), x2 = cx(k + 1) - (look === 'rij' ? 8 : 4);
                const peak = arcY - 34;
                return (
                    <g key={k} className={jumpKnown ? 'sv-jr-jump' : 'sv-jr-jump is-unknown'}>
                        <path d={`M${x1},${arcY - 4} Q${(x1 + x2) / 2},${peak} ${x2},${arcY - 4}`} />
                        <path d={arrowHead((x1 + x2) / 2, peak, x2, arcY - 4, 8)} />
                        {jumpKnown && <text x={(x1 + x2) / 2} y={peak + 10} textAnchor="middle">{signedText(j, plan)}</text>}
                    </g>
                );
            })}
            {values.map((v, k) => {
                const open = blank[k] && !filled.has(k);
                const cls = blank[k] ? (k === latest ? 'sv-jr-new' : 'sv-jr-filled') : 'sv-jr-given';
                const boxed = look === 'rij' || blank[k];
                return (
                    <g key={k}>
                        {boxed && <rect x={cx(k) - cellW / 2 + 5} y={C - half} width={cellW - 10} height={half * 2} rx={6}
                            className={`sv-jr-box${blank[k] ? ' is-blank' : ''}${k === next ? ' is-next' : ''}`} />}
                        {!open && <Label v={v} x={cx(k)} y={C} className={cls} />}
                    </g>
                );
            })}
        </svg>
    );
}
