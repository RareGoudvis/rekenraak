import { useConstraints } from '../../useConstraints';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';
import SettingLabel from '../SettingLabel';
import Switch from '../../../ui/Switch';
import { F } from '../shared/fieldStyles';
import BreukenSettings from '../shared/BreukenSettings';
import type { MulDivConstraints } from '../../../../services/math/constraintTypes';

interface Props { block: MathBlock; isDivision?: boolean; }

export default function RationalSettings({ block, isDivision = false }: Props) {

    // Fallback waarden voor als het blok net nieuw is aangemaakt
    const [c, patch] = useConstraints<MulDivConstraints>(block);
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
    } = c;

    const updateConstraint = (key: string, value: unknown) => {
        patch({ [key]: value } as Partial<MulDivConstraints>);
    };

    const isFracFrac = fractionMultMode === 'fraction_fraction';
    // Linked caps only exist when both factors are breuken; otherwise the one breuk is breuk 2.
    const linked = linkFractions && isFracFrac;
    const caps = (i: 1 | 2) => {
        const n = i === 1 ? maxNumerator1 : maxNumerator2;
        const d = i === 1 ? maxDenominator1 : maxDenominator2;
        const setN = (v: number) => patch(linked ? { maxNumerator1: v, maxNumerator2: v } : i === 1 ? { maxNumerator1: v } : { maxNumerator2: v });
        const setD = (v: number) => patch(linked ? { maxDenominator1: v, maxDenominator2: v } : i === 1 ? { maxDenominator1: v } : { maxDenominator2: v });
        return { noemer: { shape: 'max' as const, value: d, onChange: setD }, teller: { value: n, onChange: setN } };
    };

    const handleMaskToggle = (place: string) => {
        const currentMask = operand1Mask || {};
        updateConstraint('operand1Mask', { ...currentMask, [place]: !currentMask[place] });
    };

    const factor1Type = fractionMultMode === 'natural_fraction' ? 'natural' : 'decimal';
    const availablePlaces = getMaskPlaces(maxGetal, factor1Type, decimalPlaces);
    const sym = isDivision ? '÷' : '×';

    return (
        <div>
            {/* COMBINATIE — which kinds of numbers meet */}
            <div style={styles.section}>
                <SettingLabel text="Moeilijkheidsgraad (Combinatie):" info="Welke soorten getallen je combineert (natuurlijk, breuk of kommagetal)." />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button onClick={() => updateConstraint('fractionMultMode', 'natural_fraction')} aria-pressed={fractionMultMode === 'natural_fraction'} style={radioListBtnStyle(fractionMultMode === 'natural_fraction')}>Natuurlijk getal {sym} Breuk</button>
                    <button onClick={() => updateConstraint('fractionMultMode', 'fraction_fraction')} aria-pressed={isFracFrac} style={radioListBtnStyle(isFracFrac)}>Breuk {sym} Breuk</button>
                    <button onClick={() => updateConstraint('fractionMultMode', 'decimal_fraction')} aria-pressed={fractionMultMode === 'decimal_fraction'} style={radioListBtnStyle(fractionMultMode === 'decimal_fraction')}>Kommagetal {sym} Breuk</button>
                </div>
            </div>

            {/* VOLGORDE (voor natural_fraction en decimal_fraction) */}
            {!isFracFrac && (() => {
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
                                <button key={opt.key} onClick={() => updateConstraint('fractionOrderMode', opt.key)} aria-pressed={fractionOrderMode === opt.key || (!fractionOrderMode && opt.key === 'AB')} style={radioListBtnStyle(fractionOrderMode === opt.key || (!fractionOrderMode && opt.key === 'AB'))}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* GETALOPBOUW of the natural / decimal factor */}
            {!isFracFrac && (
                <div style={styles.section}>
                    <SettingLabel text={fractionMultMode === 'natural_fraction' ? 'Natuurlijk getal:' : 'Kommagetal:'} info="Welke posities het getal naast de breuk mag bevatten." />
                    {fractionMultMode === 'decimal_fraction' && (
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                            {[1, 2, 3].map(val => (
                                <button key={val} onClick={() => updateConstraint('decimalPlaces', val)} aria-pressed={decimalPlaces === val} style={smallTabBtn(decimalPlaces === val)}>
                                    {val} dec
                                </button>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {availablePlaces.map(place => (
                            <button key={`op1-${place.key}`} onClick={() => handleMaskToggle(place.key)} aria-pressed={!!operand1Mask[place.key]} style={styles.maskBtn(operand1Mask[place.key])} title={place.label}>
                                {place.key}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* BREUKEN — the shared block; two breuken get "Breuk 1" / "Breuk 2" unless they share caps */}
            <div style={styles.section}>
                {!isFracFrac ? <BreukenSettings {...caps(2)} /> : linked ? <BreukenSettings {...caps(1)} /> : (
                    <>
                        <BreukenSettings {...caps(1)} title="Breuk 1" />
                        <BreukenSettings {...caps(2)} title="Breuk 2" />
                    </>
                )}
                {isFracFrac && (
                    <div style={{ ...F.switchRow, marginBottom: 'var(--sp-4)' }}>
                        <span style={F.switchText}>Zelfde grenzen voor beide breuken</span>
                        <Switch checked={linkFractions} onChange={(v) => patch(v ? { linkFractions: true, maxNumerator2: maxNumerator1, maxDenominator2: maxDenominator1 } : { linkFractions: false })} aria-label="Zelfde grenzen voor beide breuken" />
                    </div>
                )}

                {/* UITKOMST — the answer's noemer after simplifying (× and :) */}
                <div style={styles.onOffRow}>
                    <span style={styles.onOffLabel}>Uitkomst vereenvoudigen tot noemer ≤ {simplifyMaxDenominator}</span>
                    <button type="button" onClick={() => updateConstraint('simplifyMaxDenominatorChecked', !simplifyMaxDenominatorChecked)} aria-pressed={simplifyMaxDenominatorChecked} style={styles.onOffBtn(simplifyMaxDenominatorChecked)}>{simplifyMaxDenominatorChecked ? 'Aan' : 'Uit'}</button>
                </div>
                {simplifyMaxDenominatorChecked && (
                    <div style={{ marginTop: 'var(--sp-2)' }}>
                        <label style={styles.label}>Hoogste noemer van de uitkomst: {simplifyMaxDenominator}</label>
                        <input
                            type="range" min="2" max="100"
                            value={simplifyMaxDenominator}
                            onChange={(e) => updateConstraint('simplifyMaxDenominator', Number(e.target.value))}
                            aria-label="Hoogste noemer van de uitkomst"
                            style={F.range}
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
// Canonical mask button — matches optellen / splitsen (see UI-GUIDE.md).
const smallTabBtn = (active: boolean): React.CSSProperties => ({ ...styles.maskBtn(active), width: 'auto', height: 'auto', padding: '4px 8px', fontSize: 'var(--text-xs)' });
