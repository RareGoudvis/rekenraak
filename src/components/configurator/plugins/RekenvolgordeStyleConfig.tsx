import { useWorksheetStore } from '../../../store/useWorksheetStore';
import { F } from './shared/fieldStyles';
import ItemNumberingRow from './shared/ItemNumberingRow';
import type { MathBlock } from '../../../services/math/types';

/**
 * The Differentiatie row for rekenvolgorde: the same Kort / Lang / Stappen answer-line
 * choice the hoofdrekenen leaves get (HrStdStyleConfig). Kept as its own small file rather
 * than shared with that one, because HrStdStyleConfig's rows are wrapped in constraint
 * conditions (puntoefening, compenseren) that mean nothing here. Mounted by Inspector
 * through EXERCISE_UI['rekenvolgorde'].StyleConfig.
 */
export default function RekenvolgordeStyleConfig({ block }: { block: MathBlock }) {
    const updateBlockLayout = useWorksheetStore((s) => s.updateBlockLayout);
    const preset = block.layoutPreset ?? 'inline-short';
    return (
        <>
            <ItemNumberingRow block={block} />
            <label style={{ ...F.label, marginTop: '12px' }}>Scaffolding</label>
            <div className="seg-group">
                <button onClick={() => updateBlockLayout(block.id, 'inline-short')} className="seg-btn" aria-pressed={preset === 'inline-short'}>Kort</button>
                <button onClick={() => updateBlockLayout(block.id, 'inline-long')}  className="seg-btn" aria-pressed={preset === 'inline-long'}>Lang</button>
                <button onClick={() => updateBlockLayout(block.id, 'stepped')}      className="seg-btn" aria-pressed={preset === 'stepped'}>Stappen</button>
            </div>
            {preset === 'stepped' && (
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
    );
}
