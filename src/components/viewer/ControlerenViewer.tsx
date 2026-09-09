import type { MathBlock, ControleExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { negenrest } from '../../services/controleren/controlerenGenerator';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const GLYPH: Record<string, string> = { '+': '+', '-': '−', 'x': '×' };
const INVERSE: Record<string, string> = { '+': '−', '-': '+' };

// Negenproef-kruis: rests of the factors top/bottom, product-of-rests' rest left,
// rest of the shown answer right. Proef klopt when left equals right.
function NegenproefKruis({ ex, showSolutions }: { ex: ControleExercise; showSolutions: boolean }) {
    const size = 86;
    const rA = negenrest(ex.a);
    const rB = negenrest(ex.b);
    const rProduct = negenrest(rA * rB);
    const rShown = negenrest(ex.shownAnswer);
    const num = (x: number, y: number, val: number) => showSolutions
        ? <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="15" fontFamily={mono} fill={SOL}>{val}</text>
        : null;
    return (
        <svg width={size} height={size} style={{ flexShrink: 0 }}>
            <line x1={8} y1={8} x2={size - 8} y2={size - 8} stroke="#000" strokeWidth={1.5} />
            <line x1={size - 8} y1={8} x2={8} y2={size - 8} stroke="#000" strokeWidth={1.5} />
            {num(size / 2, 12, rA)}
            {num(size / 2, size - 12, rB)}
            {num(12, size / 2, rProduct)}
            {num(size - 12, size / 2, rShown)}
        </svg>
    );
}

export default function ControlerenViewer({ block, showSolutions }: Props) {
    const exercises: ControleExercise[] = block.controleExercises || [];
    const subType: string = block.constraints.subType ?? 'negenproef';
    const showKruis: boolean = block.constraints.showKruis ?? true;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het paneel links)</div>;
    }

    const juistFout = (ex: ControleExercise) => {
        const correct = ex.shownAnswer === ex.correctAnswer;
        const mark = (label: string, hit: boolean) => (
            <span style={{
                padding: '1px 10px', borderRadius: '10px', fontFamily: mono, fontSize: '13px',
                border: showSolutions && hit ? `2px solid ${SOL}` : '1px solid #999',
                color: showSolutions && hit ? SOL : undefined,
            }}>{label}</span>
        );
        return <span style={{ display: 'inline-flex', gap: '8px' }}>{mark('juist', correct)}{mark('fout', !correct)}</span>;
    };

    // ── NEGENPROEF: worked × + kruis + juist/fout ──────────────────────────────
    if (subType === 'negenproef') {
        return (
            <FragmentableGrid
                cols={2}
                columnGap={28}
                rowGap={gap + 8}
                alignItems="flex-start"
                items={exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontFamily: mono, fontSize: '16px' }}>
                                {formatMathNumber(ex.a)} × {formatMathNumber(ex.b)} = {formatMathNumber(ex.shownAnswer)}
                            </span>
                            {juistFout(ex)}
                        </div>
                        {showKruis && <NegenproefKruis ex={ex} showSolutions={showSolutions} />}
                    </div>
                ))}
            />
        );
    }

    // ── OMGEKEERDE BEWERKING: exercise on top, full write-line for the check below ──
    // prefill: 'niets' = empty line · 'teken' = inverse operator hinted · 'alles' = numbers filled.
    const prefill: string = block.constraints.prefill ?? 'niets';
    return (
        <FragmentableGrid
            cols={1}
            columnGap={24}
            rowGap={gap + 6}
            items={exercises.map(ex => {
                const inv = INVERSE[ex.operator] ?? '−';
                // Inverse check for a op b = r: r − b (bij +) of r + b (bij −) moet a geven.
                const checkVal = ex.operator === '+' ? ex.shownAnswer - ex.b : ex.shownAnswer + ex.b;
                const solution = `${formatMathNumber(ex.shownAnswer)} ${inv} ${formatMathNumber(ex.b)} = ${formatMathNumber(checkVal)}`;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: mono, fontSize: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                            <span>{formatMathNumber(ex.a)} {GLYPH[ex.operator]} {formatMathNumber(ex.b)} = {formatMathNumber(ex.shownAnswer)}</span>
                            {juistFout(ex)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', paddingLeft: '16px' }}>
                            <span style={{ fontSize: '12px', color: '#555' }}>controle:</span>
                            {showSolutions
                                ? <span style={{ color: SOL }}>{solution}</span>
                                : prefill === 'alles'
                                    ? <>
                                        <span>{formatMathNumber(ex.shownAnswer)} {inv} {formatMathNumber(ex.b)} =</span>
                                        <span style={{ borderBottom: '1.5px solid #000', minWidth: '64px', height: '15px', display: 'inline-block' }} />
                                    </>
                                    : prefill === 'teken'
                                        ? <>
                                            <span style={{ borderBottom: '1.5px solid #000', minWidth: '64px', height: '15px', display: 'inline-block' }} />
                                            <span>{inv}</span>
                                            <span style={{ borderBottom: '1.5px solid #000', minWidth: '64px', height: '15px', display: 'inline-block' }} />
                                            <span>=</span>
                                            <span style={{ borderBottom: '1.5px solid #000', minWidth: '64px', height: '15px', display: 'inline-block' }} />
                                        </>
                                        : <span style={{ borderBottom: '1.5px solid #000', flex: 1, height: '15px', display: 'inline-block' }} />}
                        </div>
                    </div>
                );
            })}
        />
    );
}
