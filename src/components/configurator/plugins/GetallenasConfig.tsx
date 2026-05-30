import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS = [20, 100, 1000, 10000, 100000];
const STEP_PRESETS = [1, 2, 5, 10, 25, 50, 100];

export default function GetallenasConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const {
        maxGetal = 100,
        step = 5,
        direction = 'right',
        hardMode = false,
        ticks = 6,
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    return (
        <div style={styles.container}>
            {/* DIRECTION */}
            <div style={styles.section}>
                <label style={styles.label}>Richting van de pijl:</label>
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('direction', 'right')} style={styles.radioBtn(direction === 'right')}>→ Stijgend</button>
                    <button onClick={() => set('direction', 'left')} style={styles.radioBtn(direction === 'left')}>← Dalend</button>
                </div>
            </div>

            {/* HARD MODE */}
            <div style={styles.section}>
                <label style={styles.label}>Moeilijkheid:</label>
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('hardMode', false)} style={styles.radioBtn(!hardMode)}>Makkelijk</button>
                    <button onClick={() => set('hardMode', true)} style={styles.radioBtn(hardMode)}>Moeilijk</button>
                </div>
            </div>

            {/* STEP */}
            <div style={styles.section}>
                <label style={styles.label}>Sprong:</label>
                <div style={styles.buttonGroup}>
                    {STEP_PRESETS.map(s => (
                        <button key={s} onClick={() => set('step', s)} style={styles.radioBtn(step === s)}>+{s}</button>
                    ))}
                </div>
            </div>

            {/* MAX */}
            <div style={styles.section}>
                <label style={styles.label}>Maximum getal:</label>
                <div style={styles.buttonGroup}>
                    {MAX_PRESETS.map(val => (
                        <button key={val} onClick={() => set('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>Tot {val.toLocaleString('nl-BE')}</button>
                    ))}
                </div>
            </div>

            {/* TICKS */}
            <div style={styles.section}>
                <label style={styles.label}>Aantal streepjes: {ticks}</label>
                <input type="range" min="4" max="10" step="1" value={ticks}
                    onChange={(e) => set('ticks', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            </div>
        </div>
    );
}
