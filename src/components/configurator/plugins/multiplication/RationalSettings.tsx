import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';

interface Props { block: MathBlock; }

export default function RationalSettings({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    // Fallback waarden voor als het blok net nieuw is aangemaakt
    const {
        fractionMultMode = 'fraction_fraction',
        maxNumerator1 = 10, maxDenominator1 = 10,
        maxNumerator2 = 10, maxDenominator2 = 10,
        linkFractions = true,
        maxGetal = 100, decimalPlaces = 2,
        operand1Mask = {},
        simplifyMaxDenominatorChecked = false,
        simplifyMaxDenominator = 10
    } = block.constraints;

    const updateConstraint = (key: string, value: any) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    };

    const handleFractionChange = (field: 'N' | 'D', index: 1 | 2, value: number) => {
        const numValue = Math.max(1, value);
        if (linkFractions && fractionMultMode === 'fraction_fraction') {
            if (field === 'N') { updateConstraint('maxNumerator1', numValue); updateConstraint('maxNumerator2', numValue); }
            if (field === 'D') { updateConstraint('maxDenominator1', Math.max(2, numValue)); updateConstraint('maxDenominator2', Math.max(2, numValue)); }
        } else {
            if (field === 'N' && index === 1) updateConstraint('maxNumerator1', numValue);
            if (field === 'D' && index === 1) updateConstraint('maxDenominator1', Math.max(2, numValue));
            if (field === 'N' && index === 2) updateConstraint('maxNumerator2', numValue);
            if (field === 'D' && index === 2) updateConstraint('maxDenominator2', Math.max(2, numValue));
        }
    };

    const handleMaskToggle = (place: string) => {
        const currentMask = operand1Mask || {};
        updateConstraint('operand1Mask', { ...currentMask, [place]: !currentMask[place] });
    };

    // Bepaal welke maskers getoond moeten worden voor Factor 1
    const factor1Type = fractionMultMode === 'natural_fraction' ? 'natural' : 'decimal';
    const availablePlaces = getMaskPlaces(maxGetal, factor1Type, decimalPlaces);

    return (
        <div>
            {/* MOEILIJKHEIDSGRAAD (COMBINATIES) */}
            <div style={styles.section}>
                <label style={styles.label}>Moeilijkheidsgraad (Combinatie):</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button onClick={() => updateConstraint('fractionMultMode', 'natural_fraction')} style={radioListBtnStyle(fractionMultMode === 'natural_fraction')}>Natuurlijk getal × Breuk</button>
                    <button onClick={() => updateConstraint('fractionMultMode', 'fraction_fraction')} style={radioListBtnStyle(fractionMultMode === 'fraction_fraction')}>Breuk × Breuk</button>
                    <button onClick={() => updateConstraint('fractionMultMode', 'decimal_fraction')} style={radioListBtnStyle(fractionMultMode === 'decimal_fraction')}>Kommagetal × Breuk</button>
                </div>
            </div>

            {/* DYNAMISCHE GETALOPBOUW */}
            <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
                <h4 style={{ color: 'white', fontSize: '14px', margin: '0 0 16px 0' }}>Specifieke getalopbouw</h4>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>

                    {/* FACTOR 1: AFHANKELIJK VAN DE MODUS */}
                    {fractionMultMode === 'fraction_fraction' ? (
                        <div style={fractionColStyle}>
                            <label style={miniLabelStyle}>Factor 1 (Breuk)</label>
                            <input type="number" min="1" value={maxNumerator1} onChange={(e) => handleFractionChange('N', 1, Number(e.target.value))} style={numInputStyle} title="Max. Teller" />
                            <hr style={fractionLineStyle} />
                            <input type="number" min="2" value={maxDenominator1} onChange={(e) => handleFractionChange('D', 1, Number(e.target.value))} style={numInputStyle} title="Max. Noemer" />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                            <label style={miniLabelStyle}>Factor 1 ({fractionMultMode === 'natural_fraction' ? 'Natuurlijk' : 'Decimaal'})</label>

                            {/* Instellingen voor het kommagetal/natuurlijk getal */}
                            {fractionMultMode === 'decimal_fraction' && (
                                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                                    {[1, 2, 3].map(val => (
                                        <button key={val} onClick={() => updateConstraint('decimalPlaces', val)} style={smallTabBtn(decimalPlaces === val)}>
                                            {val} dec
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                {availablePlaces.map(place => (
                                    <button key={`op1-${place.key}`} onClick={() => handleMaskToggle(place.key)} style={maskBtnStyle(operand1Mask[place.key])} title={place.label}>
                                        {place.key}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* KOPPEL KNOP (Enkel bij Breuk x Breuk) */}
                    {fractionMultMode === 'fraction_fraction' && (
                        <button
                            onClick={() => updateConstraint('linkFractions', !linkFractions)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: linkFractions ? 1 : 0.4 }}
                        >
                            <span style={{ fontSize: '20px', color: linkFractions ? 'var(--accent-purple)' : 'var(--text-muted)' }}>{linkFractions ? '🔗' : '⛓️‍💥'}</span>
                        </button>
                    )}
                    {fractionMultMode !== 'fraction_fraction' && <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>×</div>}

                    {/* FACTOR 2: ALTIJD EEN BREUK */}
                    <div style={{ ...fractionColStyle, opacity: (linkFractions && fractionMultMode === 'fraction_fraction') ? 0.6 : 1 }}>
                        <label style={miniLabelStyle}>Factor 2 (Breuk)</label>
                        <input type="number" min="1" value={maxNumerator2} onChange={(e) => handleFractionChange('N', 2, Number(e.target.value))} disabled={linkFractions && fractionMultMode === 'fraction_fraction'} style={numInputStyle} />
                        <hr style={fractionLineStyle} />
                        <input type="number" min="2" value={maxDenominator2} onChange={(e) => handleFractionChange('D', 2, Number(e.target.value))} disabled={linkFractions && fractionMultMode === 'fraction_fraction'} style={numInputStyle} />
                    </div>

                </div>
            </div>

            {/* VEREENVOUDIGINGS LIMIET */}
            <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'white', fontWeight: 'bold' }}>
                    <input
                        type="checkbox"
                        checked={simplifyMaxDenominatorChecked}
                        onChange={(e) => updateConstraint('simplifyMaxDenominatorChecked', e.target.checked)}
                        style={{ accentColor: 'var(--accent-purple)', width: '16px', height: '16px' }}
                    />
                    Product te vereenvoudigen naar noemer met max.
                </label>

                {simplifyMaxDenominatorChecked && (
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <span>Max. toegelaten eindnoemer:</span>
                            <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>{simplifyMaxDenominator}</span>
                        </div>
                        <input
                            type="range" min="2" max="100"
                            value={simplifyMaxDenominator}
                            onChange={(e) => updateConstraint('simplifyMaxDenominator', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)' }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Lokale stijlen
const radioListBtnStyle = (active: boolean): React.CSSProperties => ({ padding: '10px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', backgroundColor: active ? 'var(--accent-purple)' : '#222226', color: active ? 'white' : 'var(--text-muted)', fontWeight: active ? 'bold' : 'normal', textAlign: 'left' });
const fractionColStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px' };
const numInputStyle: React.CSSProperties = { width: '100%', padding: '8px 0', textAlign: 'center', backgroundColor: '#1a1a1f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: 'bold' };
const fractionLineStyle: React.CSSProperties = { width: '100%', border: 'none', borderBottom: '2px solid var(--text-muted)', margin: '8px 0' };
const maskBtnStyle = (active: boolean): React.CSSProperties => ({ width: '28px', height: '28px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', backgroundColor: active ? 'var(--accent-purple)' : '#222226', color: active ? 'white' : 'var(--text-muted)', border: 'none' });
const smallTabBtn = (active: boolean): React.CSSProperties => ({ padding: '4px 8px', fontSize: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: active ? 'var(--accent-purple)' : '#222226', color: active ? 'white' : 'var(--text-muted)' });
const miniLabelStyle: React.CSSProperties = { fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' };