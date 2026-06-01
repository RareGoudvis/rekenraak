import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props { block: MathBlock; }

const MAX_PRESETS = [100, 1000, 10000, 100000, 1000000];

export default function PlaatswaardeConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { maxGetal = 1000, numberMask = {}, decimalPlaces = 0 } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    const toggleMask = (k: string) => set('numberMask', { ...numberMask, [k]: !numberMask[k] });
    const places = getMaskPlaces(maxGetal, decimalPlaces > 0 ? 'decimal' : 'natural', decimalPlaces);

    // subType (view) is chosen by the sidebar leaf — not repeated here.
    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <label style={styles.label}>Maximum getal:</label>
                <div style={styles.buttonGroup}>
                    {MAX_PRESETS.map(val => (
                        <button key={val} onClick={() => set('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>Tot {val.toLocaleString('nl-BE')}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <label style={styles.label}>Decimalen:</label>
                <div style={styles.buttonGroup}>
                    {[0, 1, 2, 3].map(dp => (
                        <button key={dp} onClick={() => set('decimalPlaces', dp)} style={styles.radioBtn(decimalPlaces === dp)}>{dp === 0 ? 'Geen' : dp}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <label style={styles.label}>Specifieke getalopbouw:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {places.map(p => (
                        <button key={p.key} onClick={() => toggleMask(p.key)} style={styles.maskBtn(!!numberMask[p.key])} title={p.label}>{p.key}</button>
                    ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0' }}>Leeg = vrije opbouw.</p>
            </div>
        </div>
    );
}
