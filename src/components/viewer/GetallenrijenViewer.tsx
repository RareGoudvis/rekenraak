import type { MathBlock, GetallenasExercise, Fraction } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';
import { useBlockWidth } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const isFrac = (v: number | Fraction): v is Fraction => typeof v !== 'number';

function Cell({ value, blank, showSolutions, fontSize }: { value: number | Fraction; blank: boolean; showSolutions: boolean; fontSize: number }) {
    const color = blank && showSolutions ? SOL : undefined;
    const content = isFrac(value)
        ? <VerticalFraction value={value} color={color} fontSize={Math.min(15, fontSize)} mono />
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
    const availableWidth = useBlockWidth();
    const exercises: GetallenasExercise[] = block.getallenasExercises || [];
    const gap = block.verticalSpacing || 14;
    const showFrame = block.constraints.showFrame !== false;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het paneel links)</div>;
    }

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 8}
            items={exercises.map(ex => {
                const vals = ex.values ?? [];
                // Shrink the font until all values fit one printable-width pill: cells
                // are at least 44px (or the longest value at ~0.62em/char mono) + 14px gaps.
                const maxChars = Math.max(1, ...vals.map(v => (isFrac(v) ? 3 : formatMathNumber(v).length)));
                let fontSize = 18;
                const rowW = (fs: number) => vals.length * Math.max(44, maxChars * fs * 0.62 + 4) + (vals.length - 1) * 14 + (showFrame ? 47 : 0);
                while (fontSize > 12 && rowW(fontSize) > availableWidth) fontSize -= 1;
                return (
                    <div key={ex.id} className="print-exercise" style={{
                        ...(showFrame ? { border: '1.5px solid #000', borderRadius: '22px', padding: '10px 22px' } : { padding: '6px 0' }),
                        display: 'flex', alignItems: 'center', gap: '14px', fontFamily: mono, fontSize: `${fontSize}px`,
                    }}>
                        {vals.map((v, i) => (
                            <Cell key={i} value={v} blank={ex.blankMask[i]} showSolutions={showSolutions} fontSize={fontSize} />
                        ))}
                    </div>
                );
            })}
        />
    );
}
