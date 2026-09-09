import type { MathBlock, SchattendExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { targetsFor, roundTo } from '../../services/afronden/afrondenGenerator';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const OP_GLYPH: Record<string, string> = { '+': '+', '-': '−', 'x': '×', ':': ':' };

export default function SchattendViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const exercises: SchattendExercise[] = block.schattendExercises || [];
    const numberType: string = block.constraints.numberType ?? 'natural';
    const scaffolding: string = block.constraints.scaffolding ?? 'tussenstappen';
    const gap = block.verticalSpacing || 14;
    const all = targetsFor(numberType);

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const blank = (val: number, width: number) => showSolutions
        ? <span style={{ color: SOL, minWidth: `${width}px`, textAlign: 'center' }}>{formatMathNumber(val)}</span>
        : <span style={{ borderBottom: '1.5px solid #000', minWidth: `${width}px`, height: '15px', display: 'inline-block' }} />;

    return (
        <FragmentableGrid
            cols={scaffolding === 'tussenstappen' ? 1 : fitCols(availableWidth, 250, 2)}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => {
                const t = all.find(x => x.key === ex.targetKey) ?? all[0];
                const ra = roundTo(ex.a, t.weight);
                // ×/: keep the small factor as-is; +/− round both operands.
                const roundsB = ex.operator === '+' || ex.operator === '-';
                const rb = roundsB ? roundTo(ex.b, t.weight) : ex.b;
                const estimate = ex.operator === '+' ? ra + rb
                    : ex.operator === '-' ? ra - rb
                    : ex.operator === 'x' ? Number((ra * rb).toFixed(6))
                    : Number((ra / rb).toFixed(6));
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: '16px', flexWrap: 'nowrap' }}>
                        {/* Compact target prefix + fixed-width expression column keep ≈ and blanks aligned. */}
                        <span style={{ fontSize: '12px', color: '#555', minWidth: '30px' }}>({t.key})</span>
                        <span style={{ minWidth: '128px', textAlign: 'right' }}>{formatMathNumber(ex.a)} {OP_GLYPH[ex.operator]} {formatMathNumber(ex.b)}</span>
                        <span>≈</span>
                        {scaffolding === 'tussenstappen' && (
                            <>
                                {blank(ra, 60)}
                                <span>{OP_GLYPH[ex.operator]}</span>
                                {roundsB ? blank(rb, 60) : <span style={{ minWidth: '32px', textAlign: 'center', display: 'inline-block' }}>{formatMathNumber(ex.b)}</span>}
                                <span>≈</span>
                            </>
                        )}
                        {blank(estimate, 70)}
                    </div>
                );
            })}
        />
    );
}
