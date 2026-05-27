import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS: Array<10 | 20 | 100 | 1000> = [10, 20, 100, 1000];
const STYLE_OPTIONS: Array<{ val: 'symbolic' | 'mab-bw' | 'mab-color'; label: string }> = [
    { val: 'symbolic',  label: 'Symbolisch' },
    { val: 'mab-bw',    label: 'MAB (zwart/wit)' },
    { val: 'mab-color', label: 'MAB' },
];

// Per-place mask keys exposed to user, filtered by maxNumber range.
const placeKeysFor = (maxNumber: number): string[] => {
    if (maxNumber >= 1000) return ['D', 'H', 'T', 'E'];
    if (maxNumber >= 100)  return ['H', 'T', 'E'];
    if (maxNumber >= 20)   return ['T', 'E'];
    return ['E'];
};

export default function MabConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const {
        mabStyle: rawMabStyle = 'symbolic',
        maxNumber = 100,
        operand1Mask = {},
    } = block.constraints;
    // Back-compat: blocks saved before the rename used 'realistic'.
    const mabStyle = rawMabStyle === 'realistic' ? 'mab-bw' : rawMabStyle;

    // Mutates one constraint key. Wipes mabExercises so the preview shows the
    // empty-state prompt instead of stale numbers that may violate the new constraint.
    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value }, mabExercises: [] });

    const toggleMask = (k: string) => {
        const cur = operand1Mask || {};
        set('operand1Mask', { ...cur, [k]: !cur[k] });
    };

    const keys = placeKeysFor(maxNumber);

    return (
        <div style={styles.container}>

            {/* STYLE */}
            <div style={styles.section}>
                <label style={styles.label}>Stijl:</label>
                <div style={styles.buttonGroup}>
                    {STYLE_OPTIONS.map(o => (
                        <button key={o.val} onClick={() => set('mabStyle', o.val)} style={styles.radioBtn(mabStyle === o.val)}>
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAX NUMBER */}
            <div style={styles.section}>
                <label style={styles.label}>Maximum getal:</label>
                <div style={styles.buttonGroup}>
                    {MAX_PRESETS.map(v => (
                        <button key={v} onClick={() => {
                            // Drop mask keys that no longer apply to the new range so the
                            // generator doesn't try to satisfy an impossible constraint.
                            const allowed = new Set(placeKeysFor(v));
                            const cleaned: Record<string, boolean> = {};
                            for (const k of Object.keys(operand1Mask || {})) if (allowed.has(k)) cleaned[k] = operand1Mask[k];
                            updateBlockSettings(block.id, {
                                constraints: { ...block.constraints, maxNumber: v, operand1Mask: cleaned },
                                mabExercises: [],
                            });
                        }} style={styles.radioBtn(maxNumber === v)}>
                            Tot {v.toLocaleString('nl-BE')}
                        </button>
                    ))}
                </div>
            </div>

            {/* SPECIFIC NUMBER GENERATOR — mask */}
            <div style={styles.section}>
                <label style={styles.label}>Specifieke getalopbouw:</label>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {keys.map(k => (
                        <button key={k} onClick={() => toggleMask(k)} style={maskBtnStyle(!!operand1Mask?.[k])}>
                            {k}
                        </button>
                    ))}
                </div>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '6px 0 0', fontStyle: 'italic' }}>
                    Aangevinkte posities verplicht ≥ 1.
                </p>
            </div>

        </div>
    );
}

const maskBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '32px', height: '32px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
    borderRadius: '4px', border: '1px solid var(--border-color)',
    backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)',
    color: active ? '#fff' : 'var(--text-muted)',
});
