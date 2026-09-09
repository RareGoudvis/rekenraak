import type { MathBlock, GetallenasExercise, Fraction } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const isFrac = (v: number | Fraction): v is Fraction => typeof v !== 'number';

function label(v: number | Fraction, fontSize: number, color?: string) {
    if (isFrac(v)) return <VerticalFraction value={v} color={color} fontSize={Math.min(13, fontSize)} mono />;
    return <span style={{ fontSize: `${fontSize}px`, fontWeight: 'normal', color: color || '#000', fontFamily: mono, whiteSpace: 'nowrap' }}>{formatMathNumber(v)}</span>;
}

function NumberLine({ ex, showSolutions }: { ex: GetallenasExercise; showSolutions: boolean }) {
    const { tickCount, blankMask, direction } = ex;
    const arrowLeft = direction === 'left';
    // Tick values: precomputed (decimal/rational/geheel) or derived (legacy natural).
    const values: (number | Fraction)[] = ex.values && ex.values.length
        ? ex.values
        : Array.from({ length: tickCount }, (_, i) => (arrowLeft ? ex.start - i * ex.step : ex.start + i * ex.step));
    const hasFrac = values.some(isFrac);

    // Fit the axis to the printable width: shrink the classic 96px tick gap when many
    // ticks won't fit, and step the label font down until neighbouring labels can't
    // collide (mono advance ≈ 0.62em). Big maxGetal + 10 ticks used to run off-page.
    const A4_CONTENT_PX = 625;
    const pad = 24;
    const gap = Math.min(96, Math.floor((A4_CONTENT_PX - 2 * pad) / Math.max(1, tickCount - 1)));
    const labelChars = Math.max(1, ...values.map(v => (isFrac(v) ? 3 : formatMathNumber(v).length)));
    let fontSize = 15;
    while (fontSize > 11 && labelChars * fontSize * 0.62 + 12 > gap) fontSize -= 2;

    const W = pad * 2 + gap * (tickCount - 1);
    const axisY = 30;
    const H = hasFrac ? 88 : 70;
    const tickX = (i: number) => pad + i * gap;

    return (
        <div style={{ position: 'relative', width: W, height: H, fontFamily: mono }}>
            <svg width={W} height={H} style={{ display: 'block', position: 'absolute', inset: 0 }}>
                <line x1={pad - 12} y1={axisY} x2={W - pad + 12} y2={axisY} stroke="#000" strokeWidth="1.5" />
                {arrowLeft
                    ? <polygon points={`${pad - 12},${axisY} ${pad - 4},${axisY - 5} ${pad - 4},${axisY + 5}`} fill="#000" />
                    : <polygon points={`${W - pad + 12},${axisY} ${W - pad + 4},${axisY - 5} ${W - pad + 4},${axisY + 5}`} fill="#000" />}
                {Array.from({ length: tickCount }, (_, i) => {
                    const x = tickX(i);
                    return <line key={i} x1={x} y1={axisY - 7} x2={x} y2={axisY + 7} stroke="#000" strokeWidth="1.5" />;
                })}
            </svg>
            {/* HTML label layer (so fractions can render vertically) */}
            {values.map((v, i) => {
                const blank = blankMask[i];
                return (
                    <div key={i} style={{ position: 'absolute', left: tickX(i), top: axisY + 12, transform: 'translateX(-50%)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                        {blank
                            ? (showSolutions ? label(v, fontSize, '#e11d48') : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: `${Math.min(32, gap - 10)}px`, height: '16px' }} />)
                            : label(v, fontSize)}
                    </div>
                );
            })}
        </div>
    );
}

export default function GetallenasViewer({ block, showSolutions }: Props) {
    const exercises = block.getallenasExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het paneel links)</div>;
    }

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 10}
            items={exercises.map((ex) => (
                <div key={ex.id} className="print-exercise">
                    <NumberLine ex={ex} showSolutions={showSolutions} />
                </div>
            ))}
        />
    );
}
