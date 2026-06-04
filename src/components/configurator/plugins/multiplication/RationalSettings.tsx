import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';
import SettingLabel from '../SettingLabel';

interface Props { block: MathBlock; isDivision?: boolean; }

export default function RationalSettings({ block, isDivision = false }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    // Fallback waarden voor als het blok net nieuw is aangemaakt
    const {
        fractionMultMode = 'fraction_fraction',
        fractionOrderMode = 'AB',
        maxNumerator1 = 10, maxDenominator1 = 10,
        maxNumerator2 = 10, maxDenominator2 = 10,
        linkFractions = true,
        maxGetal = 100, decimalPlaces = 2,
        operand1Mask = {},
        simplifyMaxDenominatorChecked = false,
        simplifyMaxDenominator = 10
    } = block.constraints;

    const updateConstraint = (key: string, value: unknown) => {
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

    const factor1Type = fractionMultMode === 'natural_fraction' ? 'natural' : 'decimal';
    const availablePlaces = getMaskPlaces(maxGetal, factor1Type, decimalPlaces);

    return (
        <div>
            {/* MOEILIJKHEIDSGRAAD (COMBINATIES) */}
            <div style={styles.section}>
                <SettingLabel text="Moeilijkheidsgraad (Combinatie):" info="Welke soorten getallen je combineert (natuurlijk, breuk of kommagetal)." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button onClick={() => updateConstraint('fractionMultMode', 'natural_fraction')} style={radioListBtnStyle(fractionMultMode === 'natural_fraction')}>Natuurlijk getal {isDivision ? '÷' : '×'} Breuk</button>
                    <button onClick={() => updateConstraint('fractionMultMode', 'fraction_fraction')} style={radioListBtnStyle(fractionMultMode === 'fraction_fraction')}>Breuk {isDivision ? '÷' : '×'} Breuk</button>
                    <button onClick={() => updateConstraint('fractionMultMode', 'decimal_fraction')} style={radioListBtnStyle(fractionMultMode === 'decimal_fraction')}>Kommagetal {isDivision ? '÷' : '×'} Breuk</button>
                </div>
            </div>

            {/* VOLGORDE (voor natural_fraction en decimal_fraction) */}
            {fractionMultMode !== 'fraction_fraction' && (() => {
                const sym = isDivision ? '÷' : '×';
                const typeA = fractionMultMode === 'natural_fraction' ? 'Nat. getal' : 'Kommagetal';
                const options: { key: string; label: string }[] = [
                    { key: 'AB', label: `${typeA} ${sym} Breuk` },
                    { key: 'BA', label: `Breuk ${sym} ${typeA}` },
                    { key: 'beide', label: 'Beide' },
                ];
                return (
                    <div style={styles.section}>
                        <SettingLabel text={isDivision ? 'Deeltal / Deler:' : 'Volgorde:'} info="In welke volgorde het getal en de breuk staan." />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {options.map(opt => (
                                <button key={opt.key} onClick={() => updateConstraint('fractionOrderMode', opt.key)} style={radioListBtnStyle(fractionOrderMode === opt.key || (!fractionOrderMode && opt.key === 'AB'))}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* DYNAMISCHE GETALOPBOUW */}
            <div style={styles.section}>
                <SettingLabel text="Specifieke getalopbouw" info="Stel de maximale teller/noemer en de getalopbouw van de factoren in." />

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>

                    {fractionMultMode === 'fraction_fraction' ? (
                        <>
                            <div style={fractionColStyle}>
                                <label style={miniLabelStyle}>Breuk</label>
                                <input type="number" min="1" value={maxNumerator1} onChange={(e) => handleFractionChange('N', 1, Number(e.target.value))} style={numInputStyle} title="Max. Teller" />
                                <hr style={fractionLineStyle} />
                                <input type="number" min="2" value={maxDenominator1} onChange={(e) => handleFractionChange('D', 1, Number(e.target.value))} style={numInputStyle} title="Max. Noemer" />
                            </div>

                            <button
                                onClick={() => updateConstraint('linkFractions', !linkFractions)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: linkFractions ? 1 : 0.4 }}
                            >
                                <span style={{ fontSize: '20px', color: linkFractions ? 'var(--accent)' : 'var(--text-muted)' }}>{linkFractions ? '🔗' : '⛓️‍💥'}</span>
                            </button>

                            <div style={{ ...fractionColStyle, opacity: linkFractions ? 0.6 : 1 }}>
                                <label style={miniLabelStyle}>Breuk</label>
                                <input type="number" min="1" value={maxNumerator2} onChange={(e) => handleFractionChange('N', 2, Number(e.target.value))} disabled={linkFractions} style={numInputStyle} />
                                <hr style={fractionLineStyle} />
                                <input type="number" min="2" value={maxDenominator2} onChange={(e) => handleFractionChange('D', 2, Number(e.target.value))} disabled={linkFractions} style={numInputStyle} />
                            </div>
                        </>
                    ) : (() => {
                        const isBA = fractionOrderMode === 'BA';
                        const natDecLabel = fractionMultMode === 'natural_fraction' ? 'Nat. getal' : 'Kommagetal';
                        const sym = isDivision ? '÷' : '×';

                        const NatDecCol = (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                <label style={miniLabelStyle}>{natDecLabel}</label>
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
                                        <button key={`op1-${place.key}`} onClick={() => handleMaskToggle(place.key)} style={styles.maskBtn(operand1Mask[place.key])} title={place.label}>
                                            {place.key}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );

                        const BreukCol = (
                            <div style={fractionColStyle}>
                                <label style={miniLabelStyle}>Breuk</label>
                                <input type="number" min="1" value={maxNumerator2} onChange={(e) => handleFractionChange('N', 2, Number(e.target.value))} style={numInputStyle} />
                                <hr style={fractionLineStyle} />
                                <input type="number" min="2" value={maxDenominator2} onChange={(e) => handleFractionChange('D', 2, Number(e.target.value))} style={numInputStyle} />
                            </div>
                        );

                        const Op = <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>{sym}</div>;
                        return isBA ? <>{BreukCol}{Op}{NatDecCol}</> : <>{NatDecCol}{Op}{BreukCol}</>;
                    })()}

                </div>
            </div>

            {/* VEREENVOUDIGINGS LIMIET */}
            <div style={{ padding: 'var(--sp-4)', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-main)', fontWeight: 600 }}>
                    <input
                        type="checkbox"
                        checked={simplifyMaxDenominatorChecked}
                        onChange={(e) => updateConstraint('simplifyMaxDenominatorChecked', e.target.checked)}
                        style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                    />
                    Product te vereenvoudigen naar noemer met max.
                </label>

                {simplifyMaxDenominatorChecked && (
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <span>Max. toegelaten eindnoemer:</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{simplifyMaxDenominator}</span>
                        </div>
                        <input
                            type="range" min="2" max="100"
                            value={simplifyMaxDenominator}
                            onChange={(e) => updateConstraint('simplifyMaxDenominator', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent)' }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Thin adapters over the canonical controls (sharedPluginStyles) — same tint+ring
// selected look, just laid out left-aligned (list) / compact (tab).
const radioListBtnStyle = (active: boolean): React.CSSProperties => ({ ...styles.radioBtn(active), flex: 'unset', width: '100%', padding: '10px 12px', textAlign: 'left', justifyContent: 'flex-start' });
const fractionColStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px' };
const numInputStyle: React.CSSProperties = { width: '100%', padding: '8px 0', textAlign: 'center', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none', fontSize: '14px', fontWeight: 'bold' };
const fractionLineStyle: React.CSSProperties = { width: '100%', border: 'none', borderBottom: '2px solid var(--text-muted)', margin: '8px 0' };
// Canonical mask button — matches optellen / splitsen (see UI-GUIDE.md).
const smallTabBtn = (active: boolean): React.CSSProperties => ({ ...styles.maskBtn(active), width: 'auto', height: 'auto', padding: '4px 8px', fontSize: 'var(--text-xs)' });
const miniLabelStyle: React.CSSProperties = { fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' };