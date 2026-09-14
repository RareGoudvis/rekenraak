import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import { F } from './fieldStyles';
import type { MathBlock } from '../../../../services/math/types';

/**
 * Weergave row: print '1)' or 'a)' in front of every exercise, or nothing. Writes a
 * top-level block field (not a constraint) — see MathBlock.itemNumbering.
 */
export default function ItemNumberingRow({ block }: { block: MathBlock }) {
    const updateBlockSettings = useWorksheetStore((s) => s.updateBlockSettings);
    const current = block.itemNumbering ?? 'geen';
    return (
        <>
            <label style={{ ...F.label, marginTop: '12px' }}>Nummering</label>
            <div className="seg-group">
                {([
                    { key: 'geen', label: 'Geen' },
                    { key: 'cijfer', label: '1)' },
                    { key: 'letter', label: 'a)' },
                ] as const).map(({ key, label }) => (
                    <button key={key} className="seg-btn" aria-pressed={current === key}
                        onClick={() => updateBlockSettings(block.id, { itemNumbering: key })}>
                        {label}
                    </button>
                ))}
            </div>
        </>
    );
}
