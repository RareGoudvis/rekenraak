import type { MathBlock, ProcentExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';

export default function ProcentenViewer({ block, showSolutions }: Props) {
    const exercises: ProcentExercise[] = block.procentExercises || [];
    const subType: string = block.constraints.subType ?? 'nemen';
    const scaffold: boolean = block.constraints.scaffold ?? false;
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const blank = (val: number | string, width: number) => showSolutions
        ? <span style={{ color: SOL, minWidth: `${width}px`, textAlign: 'center', display: 'inline-block' }}>{val}</span>
        : <span style={{ borderBottom: '1.5px solid #000', minWidth: `${width}px`, height: '15px', display: 'inline-block' }} />;

    return (
        <FragmentableGrid
            cols={scaffold ? 1 : 2}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: '16px' }}>
                        {subType === 'welk-percent'
                            ? <>
                                <span>{formatMathNumber(ex.answer)} van de {formatMathNumber(ex.base)} =</span>
                                {blank(formatMathNumber(ex.percent), 56)}
                                <span>%</span>
                            </>
                            : <>
                                <span>{formatMathNumber(ex.percent)} % van {formatMathNumber(ex.base)} =</span>
                                {blank(formatMathNumber(ex.answer), 70)}
                            </>}
                    </div>
                    {scaffold && subType === 'nemen' && (ex.percent % 10 === 0 ? ex.base % 10 === 0 : ex.base % 100 === 0) && (
                        // Tussenstap via 10 % / 1 % — the leerplan mental-math route.
                        // Only shown when the intermediate value is a whole number.
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: '13px', color: '#555', paddingLeft: '16px' }}>
                            <span>{ex.percent % 10 === 0 ? '10' : '1'} % van {formatMathNumber(ex.base)} =</span>
                            {blank(formatMathNumber(ex.percent % 10 === 0 ? ex.base / 10 : ex.base / 100), 56)}
                        </div>
                    )}
                </div>
            ))}
        />
    );
}
