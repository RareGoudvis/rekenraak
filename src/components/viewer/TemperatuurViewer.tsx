import type { MathBlock, TemperatuurExercise } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const MAX_T = 30;

// Vertical thermometer. `fillTo` = temp the mercury rises to (null = empty tube).
function Thermometer({ minT, fillTo }: { minT: number; fillTo: number | null }) {
    const DEG = 4;                       // px per degree
    const top = 14;                      // y of MAX_T
    const tubeBottom = top + (MAX_T - minT) * DEG;
    const bulbCY = tubeBottom + 16;
    const cx = 22;
    const tubeW = 12;
    const y = (t: number) => top + (MAX_T - t) * DEG;
    const W = 76;
    const H = bulbCY + 22;

    const ticks: number[] = [];
    for (let t = minT; t <= MAX_T; t += 5) ticks.push(t);

    return (
        <svg width={W} height={H} style={{ display: 'block', fontFamily: mono }}>
            {/* tube outline */}
            <rect x={cx - tubeW / 2} y={top} width={tubeW} height={tubeBottom - top} rx={tubeW / 2} fill="#fff" stroke="#000" strokeWidth="1.5" />
            {/* bulb */}
            <circle cx={cx} cy={bulbCY} r="14" fill={fillTo === null ? '#fff' : '#e11d48'} stroke="#000" strokeWidth="1.5" />
            {/* mercury */}
            {fillTo !== null && (
                <rect x={cx - tubeW / 2 + 2} y={y(fillTo)} width={tubeW - 4} height={tubeBottom - y(fillTo)} fill="#e11d48" />
            )}
            {/* scale */}
            {ticks.map(t => (
                <g key={t}>
                    <line x1={cx + tubeW / 2} y1={y(t)} x2={cx + tubeW / 2 + 6} y2={y(t)} stroke="#000" strokeWidth="1" />
                    <text x={cx + tubeW / 2 + 9} y={y(t) + 4} fontSize="10" fill="#000">{t}</text>
                </g>
            ))}
        </svg>
    );
}

export default function TemperatuurViewer({ block, showSolutions }: Props) {
    const exercises = block.temperatuurExercises || [];
    const includeNegatives = !!block.constraints.includeNegatives;
    const minT = includeNegatives ? -20 : 0;
    const perRow: number = block.constraints.perRow ?? 4;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    return (
        <FragmentableGrid
            cols={perRow}
            columnGap={gap}
            rowGap={gap}
            items={exercises.map((ex: TemperatuurExercise) => {
                const isKleuren = ex.variant === 'kleuren';
                // kleuren: tube empty (solution fills it). aflezen: tube pre-filled, pupil reads it.
                const fillTo = isKleuren ? (showSolutions ? ex.celsius : null) : ex.celsius;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontFamily: mono, fontSize: '15px' }}>
                        {isKleuren && <div style={{ fontWeight: 'bold' }}>Kleur tot {ex.celsius} °C</div>}
                        <Thermometer minT={minT} fillTo={fillTo} />
                        {!isKleuren && (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                                {showSolutions
                                    ? <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{ex.celsius}</span>
                                    : <span style={{ borderBottom: '1.5px solid #000', width: '40px', height: '18px', display: 'inline-block' }} />}
                                <span>°C</span>
                            </div>
                        )}
                    </div>
                );
            })}
        />
    );
}
