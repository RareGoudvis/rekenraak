import type { MathBlock, GetallenasExercise, Fraction } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const isFrac = (v: number | Fraction): v is Fraction => typeof v !== 'number';

function Cell({ value, blank, showSolutions }: { value: number | Fraction; blank: boolean; showSolutions: boolean }) {
    const color = blank && showSolutions ? SOL : undefined;
    const content = isFrac(value)
        ? <VerticalFraction value={value} color={color} fontSize={15} mono />
        : <span style={{ color: color ?? 'inherit', fontWeight: 'normal' }}>{formatMathNumber(value)}</span>;

    // Filled cell shows the value; blank shows a dotted writing line (or red solution).
    return (
        <span style={{ flex: 1, minWidth: '44px', display: 'inline-flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {blank
                ? (showSolutions ? content : <span style={{ borderBottom: '2px dotted #000', display: 'inline-block', minWidth: '42px', height: '1.15em' }} />)
                : content}
        </span>
    );
}

export default function GetallenrijenViewer({ block, showSolutions }: Props) {
    const exercises: GetallenasExercise[] = block.getallenasExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 8}
            items={exercises.map(ex => {
                const vals = ex.values ?? [];
                return (
                    <div key={ex.id} className="print-exercise" style={{
                        border: '1.5px solid #000', borderRadius: '22px', padding: '10px 22px',
                        display: 'flex', alignItems: 'center', gap: '14px', fontFamily: mono, fontSize: '18px',
                    }}>
                        {vals.map((v, i) => (
                            <Cell key={i} value={v} blank={ex.blankMask[i]} showSolutions={showSolutions} />
                        ))}
                    </div>
                );
            })}
        />
    );
}
