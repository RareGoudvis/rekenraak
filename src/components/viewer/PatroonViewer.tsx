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
    // Any scaffold row above the line → reserve a top slot on every connector so the row
    // stays uniform and the numbers/line stay aligned.
    const stacked = showArrows || showOperators;

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
            items={exercises.map(ex => {
                // Alternating number / connector cells in equal (1fr) columns → all rows align.
                const cells: React.ReactNode[] = [];
                ex.values.forEach((v, i) => {
                    cells.push(
                        <div key={`n${i}`} style={{ textAlign: 'center' }}>
                            {ex.blankMask[i]
                                ? (showSolutions ? <span style={{ color: SOL }}>{formatMathNumber(v)}</span>
                                    : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '46px', height: '18px' }} />)
                                : formatMathNumber(v)}
                        </div>
                    );
                    if (i < ex.values.length - 1) {
                        const filled = showOperators && i < operatorsShown;
                        const top = filled
                            ? <span>{opText(ex, i)}</span>
                            : showArrows
                                ? (showSolutions ? <span style={{ color: SOL }}>{opText(ex, i)}</span>
                                    : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '26px', height: '13px' }} />)
                                : null;
                        cells.push(
                            <div key={`c${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', fontSize: '12px' }}>
                                {stacked && <span style={{ height: '15px', display: 'flex', alignItems: 'flex-end' }}>{top}</span>}
                                <span style={{ fontSize: '16px', lineHeight: 1 }}>{showArrows ? '→' : '–'}</span>
                            </div>
                        );
                    }
                });
                return (
                    <div key={ex.id} className="print-exercise" style={{
                        display: 'grid', gridTemplateColumns: `repeat(${ex.values.length * 2 - 1}, 1fr)`,
                        alignItems: 'end', columnGap: '2px', fontFamily: mono, fontSize: '18px',
                    }}>
                        {cells}
                    </div>
                );
            })}
        />
    );
}
