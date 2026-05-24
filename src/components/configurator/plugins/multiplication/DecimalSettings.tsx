import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';

interface Props { block: MathBlock; }

export default function DecimalSettings({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    // Standaardwaarden instellen (voor de zekerheid)
    const { maxGetal = 100, decimalPlaces = 2, operand1Mask = {}, operand2Mask = {} } = block.constraints;

    // 🔥 Stuur decimalPlaces mee, zodat de maskers dynamisch inkrimpen!
    const availablePlaces = getMaskPlaces(maxGetal, 'decimal', decimalPlaces);

    const updateConstraint = (key: string, value: any) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    };

    const handleMaskToggle = (operand: 1 | 2, place: string) => {
        const key = operand === 1 ? 'operand1Mask' : 'operand2Mask';
        const currentMask = block.constraints[key] || {};
        updateConstraint(key, { ...currentMask, [place]: !currentMask[place] });
    };

    return (
        <div>
            {/* AANTAL DECIMALEN */}
            <div style={styles.section}>
                <label style={styles.label}>Aantal cijfers na de komma (precisie):</label>
                <div style={styles.buttonGroup}>
                    {/* 🔥 Uitgebreid tot 4 decimalen */}
                    {[1, 2, 3, 4].map(val => (
                        <button key={val} onClick={() => updateConstraint('decimalPlaces', val)} style={styles.radioBtn(decimalPlaces === val)}>
                            {val} {val === 1 ? 'cijfer' : 'cijfers'}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAXIMUM UITKOMST */}
            <div style={styles.section}>
                <label style={styles.label}>Maximum uitkomst:</label>
                <div style={styles.buttonGroup}>
                    {[10, 100, 1000].map(val => (
                        <button key={val} onClick={() => updateConstraint('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>
                            Tot {val}
                        </button>
                    ))}
                </div>
            </div>

            {/* SPECIFIEKE GETALOPBOUW */}
            <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ color: 'white', fontSize: '14px', margin: '0 0 16px 0' }}>Specifieke getalopbouw</h4>

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '60px' }}>Factor 1:</span>
                    {/* flexWrap: 'wrap' zorgt dat lange rijen maskers netjes op een nieuwe lijn komen */}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {availablePlaces.map(place => (
                            <button key={`op1-${place.key}`} onClick={() => handleMaskToggle(1, place.key)} style={maskBtnStyle(operand1Mask[place.key])} title={place.label}>
                                {place.key}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '60px' }}>Factor 2:</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {availablePlaces.map(place => (
                            <button key={`op2-${place.key}`} onClick={() => handleMaskToggle(2, place.key)} style={maskBtnStyle(operand2Mask[place.key])} title={place.label}>
                                {place.key}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const maskBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '32px', height: '32px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
    backgroundColor: active ? 'var(--accent-purple)' : '#222226',
    color: active ? 'white' : 'var(--text-muted)', border: 'none'
});