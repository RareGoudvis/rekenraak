import type { MathBlock, GeldExercise } from '../../services/math/types';
import { formatAmount } from '../../services/geld/geldGenerator';
import { VoorbeeldenBar } from './GeldViewer';
import FragmentableGrid from './FragmentableGrid';

// ── Per-exercise cell ─────────────────────────────────────────────────────────

function TekenenCell({ ex, block, showSolutions }: { ex: GeldExercise; block: MathBlock; showSolutions: boolean }) {
    const format: string = block.constraints.format ?? 'euros';
    const scaffolding: string = block.constraints.scaffolding ?? 'eenvoudig';
    const boxHeight: number = block.constraints.boxHeight ?? 80;

    const amountText = formatAmount(ex.amountCents, format);

    const drawingBox = scaffolding === 'verdeeld' ? (
        <div style={{ width: '100%', height: `${boxHeight}px`, border: '2px solid #000', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, borderBottom: '1.5px solid #000', display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
                <span style={{ fontSize: '10px', color: '#999', fontFamily: "'Azeret Mono', monospace" }}>€</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '4px' }}>
                <span style={{ fontSize: '10px', color: '#999', fontFamily: "'Azeret Mono', monospace" }}>cent</span>
            </div>
        </div>
    ) : (
        <div style={{ width: '100%', height: `${boxHeight}px`, border: '2px solid #000', boxSizing: 'border-box' }} />
    );

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '17px', fontWeight: 'bold', fontFamily: "'Azeret Mono', monospace", textAlign: 'center', color: '#000' }}>
                {amountText}
            </div>
            {drawingBox}
            {showSolutions && (
                <div style={{ fontSize: '11px', color: '#e11d48', fontFamily: "'Azeret Mono', monospace", textAlign: 'center' }}>
                    {amountText}
                </div>
            )}
        </div>
    );
}

// ── Main viewer ───────────────────────────────────────────────────────────────

interface Props { block: MathBlock; showSolutions: boolean; }

export default function GeldTekenenViewer({ block, showSolutions }: Props) {
    const exercises: GeldExercise[] = block.geldExercises || [];
    const gap: number = block.verticalSpacing || 14;
    const allowedDenominations: number[] = block.constraints.allowedDenominations ?? [];
    const voorbeeldTypes: number[] = block.constraints.voorbeeldTypes ?? [];
    const showVoorbeelden: boolean = block.constraints.showVoorbeelden ?? false;
    const exercisesPerRow: number | null = block.constraints.exercisesPerRow ?? null;
    const perRow = exercisesPerRow ?? 4;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Genereer oefeningen via het rechterpaneel)</div>;
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
