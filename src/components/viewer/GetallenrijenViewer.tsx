import type { MathBlock, GetallenasExercise, Fraction } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';
import { useBlockWidth, useSheetSizePx } from './BlockWidthContext';
import type { GetallenrijConstraints } from '../../services/math/constraintTypes';
import { SOL } from './solutionStyle';
import { getallenrijFit } from '../../services/layout/blockLayout';
import KioskCell from './KioskCell';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const isFrac = (v: number | Fraction): v is Fraction => typeof v !== 'number';
// SYNC: same convention as GetallenasViewer / ClockViewer / MabViewer.
const PX_PER_EM_AT_DEFAULT = 17.33;

function Cell({ value, blank, showSolutions, fontSize, scale, cellKey, cellMin }: { value: number | Fraction; blank: boolean; showSolutions: boolean; fontSize: number; scale: number; cellKey: string; cellMin: number }) {
    const color = blank && showSolutions ? SOL : undefined;
    const content = isFrac(value)
        ? <VerticalFraction value={value} color={color} fontSize={Math.min(15 * scale, fontSize)} mono />
        : <span style={{ color: color ?? 'inherit', fontWeight: 'normal' }}>{formatMathNumber(value)}</span>;

    // Filled cell shows the value; blank shows a dotted writing line (or red solution).
    return (
        <span style={{ flex: 1, minWidth: `${cellMin}px`, display: 'inline-flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            {blank
                ? (showSolutions ? content : (
                    // Oefenmodus: the blank's cell fills the slot (width 0 + flex keeps the row's even split).
                    <KioskCell cellKey={cellKey} style={{ flex: 1, width: 0, height: 'max(32px, 1.85em)' }}>
                        <span style={{ borderBottom: '2px dotted #000', display: 'inline-block', minWidth: `${Math.max(0, cellMin - 2)}px`, width: cellMin ? undefined : '100%', height: '1.15em' }} />
                    </KioskCell>
                ))
                : content}
        </span>
    );
}

export default function GetallenrijenViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    // Called once here, not per exercise below — a hook inside .map() would change how many
    // times it runs whenever the exercise count changes, which breaks React's hook order.
    const scale = useSheetSizePx('math') / PX_PER_EM_AT_DEFAULT;
    const exercises: GetallenasExercise[] = block.getallenasExercises || [];
    const gap = block.verticalSpacing || 14;
    const c = block.constraints as GetallenrijConstraints;
    const showFrame = c.showFrame !== false;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 8}
            items={exercises.map(ex => {
                const vals = ex.values ?? [];
                // Shrink the font until all values fit one printable-width pill (cells are at least 44px
                // or the longest mono value + 4px), then tighten the pill itself; the ladder follows the
                // math token so it follows the Lettergrootte slider.
                const maxChars = Math.max(1, ...vals.map(v => (isFrac(v) ? 3 : formatMathNumber(v).length)));
                const fit = getallenrijFit(vals.length, maxChars, availableWidth, scale, showFrame);
                const fontSize = fit.fontPx * scale;
                return (
                    <div key={ex.id} className="print-exercise" style={{
                        ...(showFrame ? { border: '1.5px solid #000', borderRadius: '22px', padding: `10px ${fit.padX}px` } : { padding: '6px 0' }),
                        // One pill per row (perRowFull: 1) so it centres rather than hugging
                        // the left edge in a narrow column.
                        display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, gap: `${fit.gapPx}px`, fontFamily: mono, fontSize: `${fontSize}px`,
                    }}>
                        {vals.map((v, i) => (
                            <Cell key={i} value={v} blank={ex.blankMask[i]} showSolutions={showSolutions} fontSize={fontSize} scale={scale} cellKey={`v${i}`} cellMin={fit.cellMin} />
                        ))}
                    </div>
                );
            })}
        />
    );
}
