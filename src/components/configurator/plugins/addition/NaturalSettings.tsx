import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import { getMaskPlaces, getBridgePlaces } from '../../../../services/math/mathEngine';
import type { MathBlock, ConstraintType } from '../../../../services/math/types';

interface Props { block: MathBlock; }

export default function NaturalSettings({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { maxGetal = 1000, bridges = {} } = block.constraints;

    // Haal de juiste arrays op (Zijn al gesorteerd Groot -> Klein!)
    const maskPlaces = getMaskPlaces(maxGetal, 'natural');
    const bridgePlaces = getBridgePlaces(maxGetal, 'natural');
    const maxPresets = [10, 20, 100, 1000, 10000, 100000, 1000000];

    const toggleMask = (operand: 'operand1Mask' | 'operand2Mask', posKey: string) => {
        const currentMask = block.constraints[operand] || {};
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [operand]: { ...currentMask, [posKey]: !currentMask[posKey] } } });
    };

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Maximum uitkomst:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {maxPresets.map(val => (
                        <button key={val} onClick={() => updateBlockSettings(block.id, { constraints: { ...block.constraints, maxGetal: val } })} style={radioBtnStyle(maxGetal === val)}>Tot {val.toLocaleString('nl-BE')}</button>
                    ))}
                </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
                <h4 style={headerStyle}>Specifieke getalopbouw</h4>
                {['operand1Mask', 'operand2Mask'].map((op, idx) => (
                    <div key={op} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', width: '50px' }}>Getal {idx + 1}:</span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {maskPlaces.map(p => (
                                <button key={p.key} onClick={() => toggleMask(op as any, p.key)} style={maskBtnStyle(block.constraints[op]?.[p.key])}>{p.key}</button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div>
                <h4 style={headerStyle}>Bruginstellingen:</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bridgePlaces.map((place) => (
                        <div key={place.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '40px' }}>{place.key}:</span>
                            <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                                {(['FORBIDDEN', 'FREE', 'REQUIRED'] as ConstraintType[]).map((opt) => (
                                    <button key={opt} onClick={() => updateBlockSettings(block.id, { constraints: { ...block.constraints, bridges: { ...bridges, [place.key]: opt } } })} style={bridgeBtnStyle((bridges[place.key] || 'FREE') === opt)}>
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

const labelStyle = { display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' };
const headerStyle = { fontSize: '13px', margin: '0 0 12px 0', color: 'var(--text-main)' };
const radioBtnStyle = (active: boolean) => ({ padding: '6px 10px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', border: '1px solid var(--border-color)', backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)', color: active ? 'white' : 'var(--text-muted)', fontWeight: active ? 'bold' : 'normal' });
const maskBtnStyle = (active: boolean) => ({ width: '28px', height: '28px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)', color: active ? '#fff' : 'var(--text-muted)' });
const bridgeBtnStyle = (active: boolean) => ({ flex: 1, fontSize: '10px', padding: '6px 0', cursor: 'pointer', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)', color: active ? 'white' : 'var(--text-muted)', fontWeight: active ? 'bold' : 'normal' });