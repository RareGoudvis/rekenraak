import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import { useConstraints } from '../../useConstraints';
import { F } from './fieldStyles';
import ItemNumberingRow from './ItemNumberingRow';
import type { MathBlock } from '../../../../services/math/types';
import type { AddSubConstraints } from '../../../../services/math/constraintTypes';

// The Differentiatie rows shared by the four hoofdrekenen leaves, mounted through
// EXERCISE_UI[typeId].StyleConfig. The + − breuk difficulty (gelijknamig / ongelijknamig) is
// content, so it moved to the Oefeningen tab's Breuken block (addition/RationalSettings).
function HrStdStyleConfig({ block }: { block: MathBlock }) {
    const [c, patch] = useConstraints<AddSubConstraints>(block);
    const updateBlockLayout = useWorksheetStore((s) => s.updateBlockLayout);
    return (
        <>
            {/* ── Compenseren-preset: tussenstap aan/uit ── */}
            {c.preset === 'compenseren' && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Compenseren</label>
                    <div className="seg-group">
                        {([
                            { key: 'tussenstap', label: 'Tussenstap invullen' },
                            { key: 'geen', label: 'Enkel antwoord' },
                        ] as const).map(({ key, label }) => (
                            <button key={key} className="seg-btn" aria-pressed={(c.compenserenScaffold ?? 'tussenstap') === key}
                                onClick={() => patch({ compenserenScaffold: key })}>
                                {label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* ── Nummering ── */}
            {/* Outside the puntoefening guard below: those rows get numbered too. */}
            <ItemNumberingRow block={block} />

            {/* ── Scaffolding (Kort / Lang / Stappen) ── */}
            {/* Puntoefeningen (a + . = c) staan per definitie op één korte lijn — geen layoutkeuze. */}
            {c.equationType !== 'puntoefening' && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Scaffolding</label>
                    <div className="seg-group">
                        <button onClick={() => updateBlockLayout(block.id, 'inline-short')} className="seg-btn" aria-pressed={(block.layoutPreset ?? 'inline-short') === 'inline-short'}>Kort</button>
                        <button onClick={() => updateBlockLayout(block.id, 'inline-long')}  className="seg-btn" aria-pressed={(block.layoutPreset ?? 'inline-short') === 'inline-long'}>Lang</button>
                        <button onClick={() => updateBlockLayout(block.id, 'stepped')}      className="seg-btn" aria-pressed={(block.layoutPreset ?? 'inline-short') === 'stepped'}>Stappen</button>
                    </div>
                    {(block.layoutPreset ?? 'inline-short') === 'stepped' && (
                        <div style={{ marginTop: '8px' }}>
                            <label style={F.label}>Aantal stappenlijnen: {block.steppedLines ?? 3}</label>
                            <input
                                type="range" min="1" max="10" step="1"
                                style={F.range}
                                value={block.steppedLines ?? 3}
                                onChange={(e) => updateBlockLayout(block.id, 'stepped', Number(e.target.value))}
                            />
                        </div>
                    )}
                </>
            )}
        </>
    );
}

export function AddSubStyleConfig({ block }: { block: MathBlock }) {
    return <HrStdStyleConfig block={block} />;
}

export function MulDivStyleConfig({ block }: { block: MathBlock }) {
    return <HrStdStyleConfig block={block} />;
}
