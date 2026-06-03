import type { MathBlock, PatroonExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SYM: Record<string, string> = { '+': '+', '-': '−', x: '×', ':': ':' };

export default function PatroonViewer({ block, showSolutions }: Props) {
    const exercises: PatroonExercise[] = block.patroonExercises || [];
    const gap = block.verticalSpacing || 14;
    const showArrows: boolean = block.constraints.showArrows ?? false;
    const showOperators: boolean = block.constraints.showOperators ?? false;
    const operatorsShown: number = block.constraints.operatorsShown ?? 0;
    const operatorStyle: string = block.constraints.operatorStyle ?? 'symbol';

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const opText = (ex: PatroonExercise, i: number) => {
        const step = ex.cycle[i % ex.cycle.length];
        const sym = SYM[step.op] ?? step.op;
        return operatorStyle === 'full' ? `${sym}${formatMathNumber(step.operand)}` : sym;
    };

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 6}
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '2px', fontFamily: mono, fontSize: '18px' }}>
                    {ex.values.map((v, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            {/* number */}
                            <span style={{ minWidth: '40px', textAlign: 'center', display: 'inline-flex', justifyContent: 'center' }}>
                                {ex.blankMask[i]
                                    ? (showSolutions ? <span style={{ color: SOL }}>{formatMathNumber(v)}</span>
                                        : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '46px', height: '18px' }} />)
                                    : formatMathNumber(v)}
                            </span>
                            {/* connector */}
                            {i < ex.values.length - 1 && (() => {
                                const filled = showOperators && i < operatorsShown;
                                return (
                                    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', minWidth: '34px', fontSize: '12px' }}>
                                        <span style={{ height: '15px', display: 'inline-flex', alignItems: 'flex-end' }}>
                                            {filled ? <span>{opText(ex, i)}</span>
                                                : showArrows
                                                    ? (showSolutions ? <span style={{ color: SOL }}>{opText(ex, i)}</span>
                                                        : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '28px', height: '13px' }} />)
                                                    : null}
                                        </span>
                                        <span style={{ fontSize: '16px', lineHeight: 1 }}>{showArrows ? '→' : '–'}</span>
                                    </span>
                                );
                            })()}
                        </span>
                    ))}
                </div>
            ))}
        />
    );
}
