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
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    return (
        <div style={styles.container}>
            {/* VARIANT */}
            <div style={styles.section}>
                <label style={styles.label}>Variant:</label>
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('variant', 'kleuren')} style={styles.radioBtn(variant === 'kleuren')}>Meter kleuren</button>
                    <button onClick={() => set('variant', 'aflezen')} style={styles.radioBtn(variant === 'aflezen')}>Meter aflezen</button>
                </div>
            </div>

            {/* NEGATIVES */}
            <div style={styles.section}>
                <label style={styles.label}>Negatieve temperaturen:</label>
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('includeNegatives', false)} style={styles.radioBtn(!includeNegatives)}>Nee (0…30°)</button>
                    <button onClick={() => set('includeNegatives', true)} style={styles.radioBtn(includeNegatives)}>Ja (−20…30°)</button>
                </div>
            </div>

            {/* PER ROW */}
            <div style={styles.section}>
                <label style={styles.label}>Per rij: {perRow}</label>
                <input type="range" min="2" max="6" step="1" value={perRow}
                    onChange={(e) => set('perRow', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            </div>
        </div>
    );
}
