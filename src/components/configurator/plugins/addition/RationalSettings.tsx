import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';

interface Props { block: MathBlock; }

export default function RationalSettings({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const {
        fractionDifficulty = 'same',
        mixedNumber1 = false, mixedNumber2 = false,
        maxNumerator1 = 10, maxDenominator1 = 10,
        maxNumerator2 = 10, maxDenominator2 = 10,
        linkFractions = true
    } = block.constraints;

    // Helper om constraints te updaten
    const updateConstraint = (updates: any) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, ...updates } });
    };

    // Handler voor de teller/noemer velden. Kijkt of de 'link' aan staat.
    const handleFractionChange = (field: 'N' | 'D', index: 1 | 2, value: number) => {
        const numValue = Math.max(1, value); // Nooit kleiner dan 1
        if (linkFractions) {
            if (field === 'N') updateConstraint({ maxNumerator1: numValue, maxNumerator2: numValue });
            if (field === 'D') updateConstraint({ maxDenominator1: Math.max(2, numValue), maxDenominator2: Math.max(2, numValue) }); // Noemer minstens 2
        } else {
            if (field === 'N' && index === 1) updateConstraint({ maxNumerator1: numValue });
            if (field === 'D' && index === 1) updateConstraint({ maxDenominator1: Math.max(2, numValue) });
            if (field === 'N' && index === 2) updateConstraint({ maxNumerator2: numValue });
            if (field === 'D' && index === 2) updateConstraint({ maxDenominator2: Math.max(2, numValue) });
        }
    };

    return (
        <div>
            {/* 1. MOEILIJKHEIDSGRAAD */}
            <div style={styles.section}>
                <label style={styles.label}>Moeilijkheidsgraad:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button onClick={() => updateConstraint({ fractionDifficulty: 'same' })} style={radioListBtnStyle(fractionDifficulty === 'same')}>Gelijknamige breuken</button>
                    <button onClick={() => updateConstraint({ fractionDifficulty: 'one_step' })} style={radioListBtnStyle(fractionDifficulty === 'one_step')}>Ongelijknamige breuken (eenvoudig)</button>
                    <button onClick={() => updateConstraint({ fractionDifficulty: 'multi_step' })} style={radioListBtnStyle(fractionDifficulty === 'multi_step')}>Ongelijknamige breuken (moeilijk)</button>
                </div>
            </div>

            {/* 2. GEMENGDE GETALLEN PER BREUK */}
            <div style={{ ...styles.section, display: 'flex', gap: '16px' }}>
                <label style={checkboxStyle}>
                    <input type="checkbox" checked={mixedNumber1} onChange={(e) => updateConstraint({ mixedNumber1: e.target.checked })} style={checkboxInputStyle} />
                    Gemengd (Breuk 1)
                </label>
                <label style={checkboxStyle}>
                    <input type="checkbox" checked={mixedNumber2} onChange={(e) => updateConstraint({ mixedNumber2: e.target.checked })} style={checkboxInputStyle} />
                    Gemengd (Breuk 2)
                </label>
            </div>

            {/* 3. VISUELE BREUK INSTELLINGEN (Max Teller / Max Noemer) */}
            <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>

                    {/* BREUK 1 */}
                    <div style={fractionColStyle}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Breuk 1</label>
                        <input type="number" min="1" value={maxNumerator1} onChange={(e) => handleFractionChange('N', 1, Number(e.target.value))} style={numInputStyle} title="Max. Teller" />
                        <hr style={fractionLineStyle} />
                        <input type="number" min="2" value={maxDenominator1} onChange={(e) => handleFractionChange('D', 1, Number(e.target.value))} style={numInputStyle} title="Max. Noemer" />
                    </div>

                    {/* KOPPEL KNOP */}
                    <button
                        onClick={() => updateConstraint({ linkFractions: !linkFractions })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: linkFractions ? 1 : 0.4, transition: 'opacity 0.2s' }}
                        title={linkFractions ? "Ontkoppel breuken" : "Koppel breuken gelijkaardig"}
                    >
                        <span style={{ fontSize: '20px', color: linkFractions ? 'var(--accent-purple)' : 'var(--text-muted)' }}>
                            {linkFractions ? '🔗' : '⛓️‍💥'}
                        </span>
                    </button>

                    {/* BREUK 2 */}
                    <div style={{ ...fractionColStyle, opacity: linkFractions ? 0.6 : 1 }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Breuk 2</label>
                        <input type="number" min="1" value={maxNumerator2} onChange={(e) => handleFractionChange('N', 2, Number(e.target.value))} disabled={linkFractions} style={numInputStyle} title="Max. Teller" />
                        <hr style={fractionLineStyle} />
                        <input type="number" min="2" value={maxDenominator2} onChange={(e) => handleFractionChange('D', 2, Number(e.target.value))} disabled={linkFractions} style={numInputStyle} title="Max. Noemer" />
                    </div>

                </div>
            </div>
        </div>
    );
}

// Lokale stijlen voor deze specifieke UI component
const radioListBtnStyle = (active: boolean): React.CSSProperties => ({ padding: '10px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', border: '1px solid transparent', backgroundColor: active ? 'var(--accent-purple)' : '#222226', color: active ? 'white' : 'var(--text-muted)', fontWeight: active ? 'bold' : 'normal', textAlign: 'left' });
const checkboxStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-main)' };
const checkboxInputStyle: React.CSSProperties = { accentColor: 'var(--accent-purple)', width: '16px', height: '16px' };

const fractionColStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px' };
const numInputStyle: React.CSSProperties = { width: '100%', padding: '8px 0', textAlign: 'center', backgroundColor: '#1a1a1f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', outline: 'none', fontSize: '14px', fontWeight: 'bold' };
const fractionLineStyle: React.CSSProperties = { width: '100%', border: 'none', borderBottom: '2px solid var(--text-muted)', margin: '8px 0' };