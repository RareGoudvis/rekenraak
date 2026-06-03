import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import FractionMaxField from './FractionMaxField';

interface Props {
    block: MathBlock;
}

export default function BreukBewerkConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const {
        subType = 'gemengd',
        direction = 'naar-gemengd',
        minDenominator = 2,
        maxDenominator = 10,
        maxNumerator = 10,
        tablesOnly = true,
        allowIrreducible = false,
        targetDen = '',
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    const setMany = (updates: Record<string, unknown>) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, ...updates } });

    return (
        <div style={styles.container}>
            {/* GEMENGD — conversion direction */}
            {subType === 'gemengd' && (
                <div style={styles.section}>
                    <label style={styles.label}>Richting:</label>
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('direction', 'naar-gemengd')} style={styles.radioBtn(direction === 'naar-gemengd')}>Breuk → gemengd</button>
                        <button onClick={() => set('direction', 'naar-breuk')} style={styles.radioBtn(direction === 'naar-breuk')}>Gemengd → breuk</button>
                        <button onClick={() => set('direction', 'beide')} style={styles.radioBtn(direction === 'beide')}>Beide</button>
                    </div>
                </div>
            )}

            {/* VEREENVOUDIGEN — quick presets + irreducible toggle */}
            {subType === 'vereenvoudigen' && (
                <>
                    <div style={styles.section}>
                        <label style={styles.label}>Voorinstelling:</label>
                        <div style={styles.buttonGroup}>
                            <button onClick={() => setMany({ maxNumerator: 20, maxDenominator: 24, tablesOnly: true })} style={styles.radioBtn(tablesOnly)}>Binnen de maaltafels</button>
                            <button onClick={() => setMany({ maxNumerator: 60, maxDenominator: 100, tablesOnly: false })} style={styles.radioBtn(!tablesOnly)}>Grotere breuken</button>
                        </div>
                    </div>
                    <div style={styles.section}>
                        <div style={styles.onOffRow}>
                            <span style={styles.onOffLabel}>Ook niet-vereenvoudigbare breuken</span>
                            <button onClick={() => set('allowIrreducible', !allowIrreducible)} style={styles.onOffBtn(allowIrreducible)}>{allowIrreducible ? 'Aan' : 'Uit'}</button>
                        </div>
                    </div>
                </>
            )}

            {/* SPECIFIEKE GETALOPBOUW — fraction teller/noemer caps (gemengd + vereenvoudigen) */}
            {(subType === 'gemengd' || subType === 'vereenvoudigen') && (
                <div style={styles.section}>
                    <label style={styles.label}>Specifieke getalopbouw:</label>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <FractionMaxField
                            label="Breuk"
                            numerator={maxNumerator}
                            denominator={maxDenominator}
                            onNumerator={(v) => set('maxNumerator', v)}
                            onDenominator={(v) => set('maxDenominator', v)}
                        />
                    </div>
                </div>
            )}

            {/* GELIJKNAMIG — input denominator range + optional fixed target denominator */}
            {subType === 'gelijknamig' && (
                <>
                    <div style={styles.section}>
                        <label style={styles.label}>Noemer (gegeven breuken):</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>van</span>
                            <input type="number" min={2} max={maxDenominator} value={minDenominator}
                                onChange={(e) => set('minDenominator', Math.max(2, Math.min(Number(e.target.value), maxDenominator)))}
                                style={inputStyle} />
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>tot</span>
                            <input type="number" min={minDenominator} max={20} value={maxDenominator}
                                onChange={(e) => set('maxDenominator', Math.max(minDenominator, Math.min(Number(e.target.value), 20)))}
                                style={inputStyle} />
                        </div>
                    </div>
                    <div style={styles.section}>
                        <label style={styles.label}>Doelnoemer (leeg = automatisch KGV):</label>
                        <input type="number" min={2} max={100} value={targetDen}
                            placeholder="bv. 12"
                            onChange={(e) => set('targetDen', e.target.value === '' ? '' : Math.max(2, Number(e.target.value)))}
                            style={{ ...inputStyle, width: '90px' }} />
                    </div>
                </>
            )}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '64px', padding: '8px 10px', backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)', borderRadius: '6px',
    color: 'var(--text-main)', outline: 'none', fontSize: '13px', boxSizing: 'border-box',
};
