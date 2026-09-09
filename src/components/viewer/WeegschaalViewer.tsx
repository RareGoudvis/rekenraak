import type { MathBlock, WeegschaalExercise } from '../../services/math/types';
import { formatGewicht } from '../../services/weegschaal/weegschaalGenerator';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';

// Dial geometry mirrors AnalogClockSVG's polar math: ticks around the rim,
// labels at the majors, a red needle from the centre.
function Dial({ grams, bereik, step, showNeedle, needleColor, size }: {
    grams: number; bereik: number; step: number; showNeedle: boolean; needleColor: string; size: number;
}) {
    const cx = size / 2, cy = size / 2;
    const rOuter = size / 2 - 6;
    const ticks: React.ReactNode[] = [];
    const majorEvery = bereik / 10;   // 10 labelled majors round the dial
    const total = bereik / step;
    for (let i = 0; i < total; i++) {
        const value = i * step;
        const isMajor = value % majorEvery === 0;
        // 0 g at the top, clockwise; full range = full turn (kitchen-scale convention).
        const ang = (value / bereik) * 2 * Math.PI - Math.PI / 2;
        const r1 = isMajor ? rOuter - 12 : rOuter - 7;
        ticks.push(
            <line key={i}
                x1={cx + r1 * Math.cos(ang)} y1={cy + r1 * Math.sin(ang)}
                x2={cx + rOuter * Math.cos(ang)} y2={cy + rOuter * Math.sin(ang)}
                stroke="#000" strokeWidth={isMajor ? 1.8 : 1} />
        );
        if (isMajor) {
            const rl = rOuter - 24;
            const label = bereik >= 2000 ? `${value / 1000}`.replace('.', ',') : String(value);
            ticks.push(
                <text key={`t${i}`} x={cx + rl * Math.cos(ang)} y={cy + rl * Math.sin(ang)}
                    textAnchor="middle" dominantBaseline="central" fontSize="11" fontFamily={mono}>{label}</text>
            );
        }
    }
    const needleAng = (grams / bereik) * 2 * Math.PI - Math.PI / 2;
    const rn = rOuter - 16;
    return (
        <svg width={size} height={size}>
            <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#000" strokeWidth={2} />
            {ticks}
            {/* Unit in the dial face; kg dials label in kg to keep numbers readable. */}
            <text x={cx} y={cy + rOuter * 0.45} textAnchor="middle" fontSize="11" fontFamily={mono} fill="#555">
                {bereik >= 2000 ? 'kg' : 'g'}
            </text>
            {showNeedle && (
                <line x1={cx} y1={cy} x2={cx + rn * Math.cos(needleAng)} y2={cy + rn * Math.sin(needleAng)}
                    stroke={needleColor} strokeWidth={2.5} strokeLinecap="round" />
            )}
            <circle cx={cx} cy={cy} r={4} fill="#000" />
        </svg>
    );
}

export default function WeegschaalViewer({ block, showSolutions }: Props) {
    const exercises: WeegschaalExercise[] = block.weegschaalExercises || [];
    const mode: string = block.constraints.mode ?? 'aflezen';
    const bereik: number = block.constraints.bereikGram ?? 1000;
    const step: number = block.constraints.stepGram ?? 50;
    const notatie: string = block.constraints.notatie ?? 'g';
    const perRow: number = block.constraints.exercisesPerRow ?? 2;
    const boxHeight: number = block.constraints.boxHeight ?? 170;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het paneel links)</div>;
    }

    const size = Math.max(120, Math.min(220, boxHeight));

    return (
        <FragmentableGrid
            cols={perRow}
            columnGap={24}
            rowGap={gap + 10}
            alignItems="flex-start"
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {mode === 'aflezen'
                        // aflezen: needle printed black, pupil writes the weight.
                        ? <Dial grams={ex.grams} bereik={bereik} step={step} showNeedle needleColor="#000" size={size} />
                        // tekenen: weight printed, solution needle in red.
                        : <Dial grams={ex.grams} bereik={bereik} step={step} showNeedle={showSolutions} needleColor={SOL} size={size} />}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontFamily: mono, fontSize: '14px' }}>
                        {mode === 'aflezen'
                            ? showSolutions
                                ? <span style={{ color: SOL }}>{formatGewicht(ex.grams, notatie)}</span>
                                : <>
                                    <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '70px', height: '16px' }} />
                                    <span>{notatie === 'g' ? 'g' : notatie === 'kg-komma' ? 'kg' : ''}</span>
                                </>
                            : <span>{formatGewicht(ex.grams, notatie)}</span>}
                    </div>
                </div>
            ))}
        />
    );
}
