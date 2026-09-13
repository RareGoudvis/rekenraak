import type { MathBlock, GeldExercise } from '../../services/math/types';
import { formatAmount } from '../../services/geld/geldGenerator';
import { VoorbeeldenBar } from './GeldViewer';
import FragmentableGrid from './FragmentableGrid';
import type { GeldConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';
import { fitCols, useBlockWidth } from './BlockWidthContext';

// 132px = 35mm at 96dpi (1cm ≈ 37.8px) — the narrowest a draw-the-amount box can go and
// still be usable (owner review R3); + 16px for the cell's own 8px side padding.
const ITEM_MIN_PX = 132 + 16;

// Sizes below are factors of the sheet tokens (--sheet-size-math), not fixed px

// ── Per-exercise cell ─────────────────────────────────────────────────────────

function TekenenCell({ ex, block, showSolutions }: { ex: GeldExercise; block: MathBlock; showSolutions: boolean }) {
    const c = block.constraints as GeldConstraints;
    const format: string = c.format ?? 'euros';
    const scaffolding: string = c.scaffolding ?? 'eenvoudig';
    const boxHeight: number = c.boxHeight ?? 80;

    const amountText = formatAmount(ex.amountCents, format);

    const drawingBox = scaffolding === 'verdeeld' ? (
        <div style={{ width: '100%', height: `${boxHeight}px`, border: '2px solid #000', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, borderBottom: '1.5px solid #000', display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
                <span style={{ fontSize: 'calc(var(--sheet-size-math) * 0.58)', color: '#999', fontFamily: "'Azeret Mono', monospace" }}>€</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
                <span style={{ fontSize: 'calc(var(--sheet-size-math) * 0.58)', color: '#999', fontFamily: "'Azeret Mono', monospace" }}>cent</span>
            </div>
        </div>
    ) : (
        <div style={{ width: '100%', height: `${boxHeight}px`, border: '2px solid #000', boxSizing: 'border-box' }} />
    );

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', boxSizing: 'border-box' }}>
            <div style={{ fontSize: 'calc(var(--sheet-size-math) * 1)', fontFamily: "'Azeret Mono', monospace", textAlign: 'center', color: '#000' }}>
                {amountText}
            </div>
            {drawingBox}
            {showSolutions && (
                <div style={{ ...solutionText, fontSize: 'calc(var(--sheet-size-math) * 0.64)', fontFamily: "'Azeret Mono', monospace", textAlign: 'center' }}>
                    {amountText}
                </div>
            )}
        </div>
    );
}

// ── Main viewer ───────────────────────────────────────────────────────────────

interface Props { block: MathBlock; showSolutions: boolean; }

export default function GeldTekenenViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const exercises: GeldExercise[] = block.geldExercises || [];
    const gap: number = block.verticalSpacing || 14;
    const c = block.constraints as GeldConstraints;
    const allowedDenominations: number[] = c.allowedDenominations ?? [];
    const voorbeeldTypes: number[] = c.voorbeeldTypes ?? [];
    const showVoorbeelden: boolean = c.showVoorbeelden ?? false;
    const exercisesPerRow: number | null = c.exercisesPerRow ?? null;
    // 3-up at full width (was a flat 4 that ignored the column, so a ½ block squeezed the
    // draw box to ~17mm — owner review R3); fitCols narrows further for a half/quarter.
    const perRow = fitCols(availableWidth, ITEM_MIN_PX, exercisesPerRow ?? 3, gap);

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    return (
        <div>
            {showVoorbeelden && voorbeeldTypes.length > 0 && (
                <VoorbeeldenBar allowedDenominations={allowedDenominations} voorbeeldTypes={voorbeeldTypes} />
            )}
            <FragmentableGrid
                cols={perRow}
                columnGap={gap}
                rowGap={gap}
                items={exercises.map(ex => (
                    <TekenenCell key={ex.id} ex={ex} block={block} showSolutions={showSolutions} />
                ))}
            />
        </div>
    );
}
