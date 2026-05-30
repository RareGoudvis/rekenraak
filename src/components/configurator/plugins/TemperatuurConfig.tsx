import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    block: MathBlock;
}

export default function TemperatuurConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const {
        variant = 'kleuren',
        includeNegatives = false,
        perRow = 4,
        mode1 = 'gekleurd',
        mode2 = 'getal',
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    const MODES = [
        { val: 'gekleurd', label: 'Gekleurd' },
        { val: 'getal', label: 'Getal' },
        { val: 'beide', label: 'Beide' },
    ];

    return (
        <div style={styles.container}>
            {/* Variant comes from the sidebar leaf (Meter kleuren / aflezen / verschil). */}

            {/* VERSCHIL — what's given on each thermometer */}
            {variant === 'verschil' && ([
                { key: 'mode1', label: 'Thermometer 1', value: mode1 },
                { key: 'mode2', label: 'Thermometer 2', value: mode2 },
            ]).map(t => (
                <div key={t.key} style={styles.section}>
                    <label style={styles.label}>{t.label}:</label>
                    <div style={styles.buttonGroup}>
                        {MODES.map(m => (
                            <button key={m.val} onClick={() => set(t.key, m.val)} style={styles.radioBtn(t.value === m.val)}>{m.label}</button>
                        ))}
                    </div>
                </div>
            ))}

            {/* NEGATIVES */}
            <div style={styles.section}>
                <label style={styles.label}>Negatieve temperaturen:</label>
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('includeNegatives', false)} style={styles.radioBtn(!includeNegatives)}>Nee (0…25°)</button>
                    <button onClick={() => set('includeNegatives', true)} style={styles.radioBtn(includeNegatives)}>Ja (−15…25°)</button>
                </div>
            </div>

            {/* PER ROW — not for verschil (always 1 per row) */}
            {variant !== 'verschil' && (
                <div style={styles.section}>
                    <label style={styles.label}>Per rij: {perRow}</label>
                    <input type="range" min="2" max="6" step="1" value={perRow}
                        onChange={(e) => set('perRow', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                </div>
            )}
        </div>
    );
}
