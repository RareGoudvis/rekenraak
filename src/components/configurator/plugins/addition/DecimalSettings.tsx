import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import { getMaskPlaces } from '../../../../services/math/mathEngine';
import type { MathBlock, ConstraintType } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';

interface Props { block: MathBlock; }

export default function DecimalSettings({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { maxGetal = 100, decimalPlaces = 2, bridges = {} } = block.constraints;

    // Mask and bridge places that match the chosen number of decimal places
    const maskPlaces = getMaskPlaces(maxGetal, 'decimal', decimalPlaces);
    const bridgePlaces = maskPlaces.filter(p => p.weight < maxGetal);
    const maxPresets = [10, 100, 1000];

    const toggleMask = (operand: 'operand1Mask' | 'operand2Mask', posKey: string) => {
        const currentMask = block.constraints[operand] || {};
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [operand]: { ...currentMask, [posKey]: !currentMask[posKey] } } });
    };

    return (
        <div>
            <div style={styles.section}>
                <label style={styles.label}>Aantal cijfers na de komma:</label>
                <div style={styles.buttonGroup}>
                    {[1, 2, 3].map(num => (
                        <button key={num} onClick={() => updateBlockSettings(block.id, { constraints: { ...block.constraints, decimalPlaces: num } })} style={styles.radioBtn(decimalPlaces === num)}>{num}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <label style={styles.label}>Maximum uitkomst:</label>
                <div style={styles.buttonGroup}>
                    {maxPresets.map(val => (
                        <button key={val} onClick={() => updateBlockSettings(block.id, { constraints: { ...block.constraints, maxGetal: val } })} style={styles.radioBtn(maxGetal === val)}>Tot {val.toLocaleString('nl-BE')}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <label style={styles.groupLabel}>Specifieke getalopbouw</label>
                {(['operand1Mask', 'operand2Mask'] as const).map((op, idx) => (
                    <div key={op} style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', width: '50px' }}>Getal {idx + 1}:</span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {maskPlaces.map(p => (
                                <button key={p.key} onClick={() => toggleMask(op, p.key)} style={styles.maskBtn(block.constraints[op]?.[p.key])}>{p.key}</button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div>
                <label style={styles.groupLabel}>Bruginstellingen</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    {bridgePlaces.map((place) => (
                        <div key={place.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', width: '40px' }}>{place.key}:</span>
                            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                                {(['FORBIDDEN', 'FREE', 'REQUIRED'] as ConstraintType[]).map((opt) => (
                                    <button key={opt} onClick={() => updateBlockSettings(block.id, { constraints: { ...block.constraints, bridges: { ...bridges, [place.key]: opt } } })} style={styles.bridgeBtn((bridges[place.key] || 'FREE') === opt)}>
                                        {opt === 'FORBIDDEN' ? 'GEEN' : opt === 'FREE' ? 'MAG' : 'MOET'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}