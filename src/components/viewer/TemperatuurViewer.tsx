import type { MathBlock, TemperatuurExercise, TemperatuurMode } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const MAX_T = 25;          // top labelled tick
const HEAD = 12;           // glass headroom above MAX_T (no ticks)
const SOL = '#e11d48';

// Glass thermometer: rounded tube with a subtle glass gradient, bulb, major (5°) +
// minor (1°) ticks. `fillTo` = temp the mercury rises to (null = empty tube). `uid`
// keeps gradient ids unique when several render on one sheet.
function Thermometer({ minT, fillTo, uid }: { minT: number; fillTo: number | null; uid: string }) {
    const DEG = 4;
    const top = 16;
    const tubeBottom = top + (MAX_T - minT) * DEG;
    const cx = 30;
    const tubeW = 16;
    const bulbR = 17;
    const bulbCY = tubeBottom + bulbR - 2;
    const y = (t: number) => top + (MAX_T - t) * DEG;
    const W = 84;
    const H = bulbCY + bulbR + 6;
    const glass = `glass-${uid}`;
    const merc = `merc-${uid}`;

    const filled = fillTo !== null;
    const ticks: number[] = [];
    for (let t = minT; t <= MAX_T; t++) ticks.push(t);

    return (
        <svg width={W} height={H} style={{ display: 'block', fontFamily: mono }}>
            <defs>
                <linearGradient id={glass} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#dfe7ec" />
                    <stop offset="0.45" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#c4d0d6" />
                </linearGradient>
                <linearGradient id={merc} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#f0577a" />
                    <stop offset="0.5" stopColor="#e11d48" />
                    <stop offset="1" stopColor="#b01539" />
                </linearGradient>
            </defs>

            {/* glass: bulb + tube as one outlined body (tube extends HEAD px above the top tick) */}
            <circle cx={cx} cy={bulbCY} r={bulbR} fill={`url(#${glass})`} stroke="#5b6b73" strokeWidth="1.5" />
            <rect x={cx - tubeW / 2} y={top - HEAD} width={tubeW} height={tubeBottom - (top - HEAD) + 4} rx={tubeW / 2} fill={`url(#${glass})`} stroke="#5b6b73" strokeWidth="1.5" />

            {/* mercury: bulb + column up to fillTo */}
            {filled && <>
                <circle cx={cx} cy={bulbCY} r={bulbR - 4} fill={`url(#${merc})`} />
                <rect x={cx - (tubeW - 6) / 2} y={y(fillTo as number)} width={tubeW - 6} height={tubeBottom - y(fillTo as number) + 4} rx={(tubeW - 6) / 2} fill={`url(#${merc})`} />
            </>}

            {/* ticks: minor every 1°, major + label every 5° */}
            {ticks.map(t => {
                const major = t % 5 === 0;
                const len = major ? 7 : 3;
                return (
                    <g key={t}>
                        <line x1={cx + tubeW / 2} y1={y(t)} x2={cx + tubeW / 2 + len} y2={y(t)} stroke="#5b6b73" strokeWidth={major ? 1.2 : 0.8} />
                        {major && <text x={cx + tubeW / 2 + len + 3} y={y(t) + 3.5} fontSize="9.5" fill="#333">{t}</text>}
                    </g>
                );
            })}
        </svg>
    );
}

const answerLine = (w = 40) => <span style={{ borderBottom: '1.5px solid #000', width: `${w}px`, height: '18px', display: 'inline-block' }} />;

// One thermometer in a verschil exercise, rendered per its given mode.
function VerschilThermo({ minT, temp, mode, showSolutions, uid }: { minT: number; temp: number; mode: TemperatuurMode; showSolutions: boolean; uid: string }) {
    const showNumber = mode === 'getal' || mode === 'beide';
    // getal = empty tube to colour (solution fills it); gekleurd/beide = shown filled.
    const fillTo = mode === 'getal' ? (showSolutions ? temp : null) : temp;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            {showNumber
                ? <div>{temp} °C</div>
                : <div style={{ height: '21px' }} />}
            <Thermometer minT={minT} fillTo={fillTo} uid={uid} />
            {mode === 'gekleurd'
                ? <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px' }}>
                    {showSolutions ? <span style={{ color: SOL }}>{temp}</span> : answerLine(36)}<span>°C</span>
                </div>
                : <div style={{ height: '18px' }} />}
        </div>
    );
}

export default function TemperatuurViewer({ block, showSolutions }: Props) {
    const exercises = block.temperatuurExercises || [];
    const includeNegatives = !!block.constraints.includeNegatives;
    const minT = includeNegatives ? -15 : 0;
    const perRow: number = Math.min(4, block.constraints.perRow ?? 4);
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const isVerschil = exercises[0]?.variant === 'verschil';

    return (
        <FragmentableGrid
            cols={isVerschil ? 2 : perRow}
            columnGap={isVerschil ? gap + 48 : gap}
            rowGap={isVerschil ? gap + 14 : gap}
            items={exercises.map((ex: TemperatuurExercise) => {
                if (ex.variant === 'verschil') {
                    const c2 = ex.celsius2 ?? 0;
                    const diff = Math.abs(ex.celsius - c2);
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontFamily: mono, fontSize: '15px' }}>
                            <div style={{ display: 'flex', gap: '18px' }}>
                                <VerschilThermo minT={minT} temp={ex.celsius} mode={ex.mode1 ?? 'gekleurd'} showSolutions={showSolutions} uid={`${ex.id}-1`} />
                                <VerschilThermo minT={minT} temp={c2} mode={ex.mode2 ?? 'getal'} showSolutions={showSolutions} uid={`${ex.id}-2`} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                                <span>verschil =</span>
                                {showSolutions ? <span style={{ color: SOL }}>{diff}</span> : answerLine(44)}
                                <span>°C</span>
                            </div>
                        </div>
                    );
                }
                const isKleuren = ex.variant === 'kleuren';
                const fillTo = isKleuren ? (showSolutions ? ex.celsius : null) : ex.celsius;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontFamily: mono, fontSize: '15px' }}>
                        {isKleuren && <div>Kleur tot {ex.celsius} °C</div>}
                        <Thermometer minT={minT} fillTo={fillTo} uid={ex.id} />
                        {!isKleuren && (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                                {showSolutions
                                    ? <span style={{ color: SOL }}>{ex.celsius}</span>
                                    : answerLine(40)}
                                <span>°C</span>
                            </div>
                        )}
                    </div>
                );
            })}
        />
    );
}
