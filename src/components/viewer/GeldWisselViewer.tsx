import type { MathBlock, GeldWisselExercise } from '../../services/math/types';
import { Bill, LaidMoney } from './GeldViewer';
import { useViewerInteraction, type BuildEntry } from './ViewerInteractionContext';
import FragmentableGrid from './FragmentableGrid';
import type { GeldWisselConstraints } from '../../services/math/constraintTypes';
import { fitCols, useBlockWidth, useSheetSizePx } from './BlockWidthContext';
import { DENOMINATION_CATALOGUE } from '../../services/geld/geldGenerator';
import { solutionText } from './solutionStyle';

// Size below is a factor of the sheet token (--sheet-size-math), not a fixed px
const PX_PER_EM_AT_DEFAULT = 17.33;
// Bill + '=' + a legible draw box (~35mm), plus gaps — the minimum cell a wissel exercise
// needs; scaled with the math token since the bill figure itself is `em`-sized (GeldViewer).
const ITEM_MIN_PX_AT_DEFAULT = 200;

// The key shows one model exchange, largest smaller money first (€5 → €2 + €2 + €1); any other
// make-up is right too. SYNC: kioskDescriptors wisselMoney (the tray holds the money below the bill).
function modelExchange(bill: number): BuildEntry[] {
    const parts: BuildEntry[] = [];
    let rest = bill;
    for (const { valueCents } of DENOMINATION_CATALOGUE) {
        if (valueCents >= bill || rest < valueCents) continue;
        parts.push({ key: String(valueCents), count: Math.floor(rest / valueCents) });
        rest %= valueCents;
    }
    return rest === 0 ? parts : [];
}

const pieceLabel = (cents: number) => (cents >= 100 ? `€ ${cents / 100}` : `${cents} cent`);

// laid = the money a pupil laid from the kiosk tray (Oefenmodus build); null on the sheet.
function WisselCell({ ex, boxHeight, laid, showSolutions }: { ex: GeldWisselExercise; boxHeight: number; laid: readonly BuildEntry[] | null; showSolutions: boolean }) {
    const key = showSolutions && !laid ? modelExchange(ex.billValueCents) : [];
    return (
        <div className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', boxSizing: 'border-box' }}>
            <div style={{ flexShrink: 0 }}>
                <Bill valueCents={ex.billValueCents} />
            </div>
            <div style={{ fontSize: 'calc(var(--sheet-size-math) * 1.38)', fontWeight: 'bold', fontFamily: "'Azeret Mono', monospace", flexShrink: 0 }}>
                =
            </div>
            {laid ? (
                <div style={{ flex: 1, minHeight: `${boxHeight}px`, border: '2px solid #000', boxSizing: 'border-box', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LaidMoney build={laid} />
                </div>
            ) : key.length ? (
                <div style={{ flex: 1, minHeight: `${boxHeight}px`, border: '2px solid #000', boxSizing: 'border-box', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <LaidMoney build={key} />
                    <div data-wissel-key="" style={{ ...solutionText, fontSize: 'calc(var(--sheet-size-math) * 0.64)', fontFamily: "'Azeret Mono', monospace", textAlign: 'center', paddingBottom: '4px' }}>
                        {key.flatMap(b => Array.from({ length: b.count }, () => pieceLabel(Number(b.key)))).join(' + ')}
                    </div>
                </div>
            ) : (
                <div style={{ flex: 1, height: `${boxHeight}px`, border: '2px solid #000', boxSizing: 'border-box', borderRadius: '6px' }} />
            )}
        </div>
    );
}

interface Props { block: MathBlock; showSolutions: boolean; }

export default function GeldWisselViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const ia = useViewerInteraction();
    const laid = ia?.kind === 'build' ? ia.state.build : null;
    const exercises: GeldWisselExercise[] = block.geldWisselExercises || [];
    const gap: number = block.verticalSpacing || 14;
    const c = block.constraints as GeldWisselConstraints;
    const exercisesPerRow: number = c.exercisesPerRow ?? 2;
    const boxHeight: number = c.boxHeight ?? 100;
    const itemMinPx = ITEM_MIN_PX_AT_DEFAULT * (useSheetSizePx('math') / PX_PER_EM_AT_DEFAULT);
    // Was a flat exercisesPerRow that ignored the column and squeezed 2-up into a half —
    // fitCols drops to 1-up there, keeping exercisesPerRow as the full-width preference (owner review R3).
    const cols = fitCols(availableWidth, itemMinPx, exercisesPerRow, gap);

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    return (
        <FragmentableGrid
            cols={cols}
            columnGap={gap}
            rowGap={gap}
            items={exercises.map(ex => (
                <WisselCell key={ex.id} ex={ex} boxHeight={boxHeight} laid={laid} showSolutions={showSolutions} />
            ))}
        />
    );
}
