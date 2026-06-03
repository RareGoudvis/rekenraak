import type { MathBlock, VergelijkenExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import type { RepKind } from '../../services/vergelijken/representations';
import RepValue from './RepValue';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';

export default function VergelijkenViewer({ block, showSolutions }: Props) {
    const exercises: VergelijkenExercise[] = block.vergelijkenExercises || [];
    const subType: string = block.constraints.subType ?? 'getallen';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    // ── KIEZEN: circle the largest / smallest ─────────────────────────────────
    if (subType === 'kiezen') {
        return (
            <FragmentableGrid
                cols={1}
                rowGap={gap}
                items={exercises.map(ex => {
                    const nums = ex.numbers || [];
                    const answer = (ex.target ?? 'grootste') === 'kleinste' ? Math.min(...nums) : Math.max(...nums);
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', fontFamily: mono, fontSize: '17px' }}>
                            {nums.map((n, i) => {
                                const isAns = showSolutions && n === answer;
                                return (
                                    <span key={i} style={{
                                        padding: '2px 8px',
                                        border: isAns ? `2px solid ${SOL}` : '2px solid transparent',
                                        borderRadius: '50%',
                                        color: isAns ? SOL : 'inherit',
                                    }}>
                                        {formatMathNumber(n)}
                                    </span>
                                );
                            })}
                        </div>
                    );
                })}
            />
        );
    }

    const op = (a: number, b: number) => (a < b ? '<' : a > b ? '>' : '=');

    // ── REPRESENTATIES: each side in a chosen representation, fill <, > or = ────
    if (subType === 'representaties') {
        const leftRep: RepKind = block.constraints.leftRep ?? 'breuk';
        const rightRep: RepKind = block.constraints.rightRep ?? 'kommagetal';
        return (
            <FragmentableGrid
                cols={2}
                columnGap={24}
                rowGap={gap + 4}
                items={exercises.map(ex => {
                    const a = ex.a ?? 0, b = ex.b ?? 0;
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: mono, fontSize: '18px' }}>
                            <span style={{ minWidth: '80px', display: 'inline-flex', justifyContent: 'flex-end', alignItems: 'center' }}><RepValue value={a} rep={leftRep} frac={ex.aFrac} /></span>
                            <span style={{
                                width: '34px', height: '34px', border: '1px solid #000', borderRadius: '4px',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                color: SOL, fontWeight: 'bold', flexShrink: 0,
                            }}>
                                {showSolutions ? op(a, b) : ''}
                            </span>
                            <span style={{ minWidth: '80px', display: 'inline-flex', alignItems: 'center' }}><RepValue value={b} rep={rightRep} frac={ex.bFrac} /></span>
                        </div>
                    );
                })}
            />
        );
    }

    // ── GETALLEN: fill <, > or = between two numbers ──────────────────────────
    return (
        <FragmentableGrid
            cols={2}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => {
                const a = ex.a ?? 0, b = ex.b ?? 0;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: mono, fontSize: '18px' }}>
                        <span style={{ minWidth: '70px', textAlign: 'right' }}>{formatMathNumber(a)}</span>
                        <span style={{
                            width: '34px', height: '34px', border: '1px solid #000', borderRadius: '4px',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            color: SOL, fontWeight: 'bold',
                        }}>
                            {showSolutions ? op(a, b) : ''}
                        </span>
                        <span style={{ minWidth: '70px' }}>{formatMathNumber(b)}</span>
                    </div>
                );
            })}
        />
    );
}
