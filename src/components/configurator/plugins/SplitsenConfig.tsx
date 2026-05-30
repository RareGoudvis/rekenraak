import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS = [10, 20, 100, 1000, 10000, 100000, 1000000];
const HEART_PRESETS = [10, 20, 100];

export default function SplitsenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const {
        maxGetal = 10,
        operand1Mask = {},
        operand2Mask = {},
        fixedTotal = null,
        layout = 'basic',
        rowsPerBox = 4,
        rowHeight = 28,
        mathDirection = 'decompose',
    } = block.constraints;

    const isPositie = typeof layout === 'string' && layout.startsWith('positie');
    // Decimals: Rooster (basic) + all place-value layouts (not verliefde harten).
    const decimalsAllowed = layout === 'basic' || (typeof layout === 'string' && layout.startsWith('positie'));
    const decimalPlaces = decimalsAllowed ? Math.min(3, Math.max(0, block.constraints.decimalPlaces ?? 0)) : 0;
    const maskPlaces = decimalPlaces > 0 ? getMaskPlaces(maxGetal, 'decimal', decimalPlaces) : getMaskPlaces(maxGetal, 'natural');

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    // Splitsbenen: which (blankSide, notation) combos are included (≥1). Generator mixes them.
    const benenVariants: string[] = Array.isArray(block.constraints.benenVariants) && block.constraints.benenVariants.length
        ? block.constraints.benenVariants : ['legs-letters'];
    const toggleBenen = (key: string) => {
        const has = benenVariants.includes(key);
        const next = has ? benenVariants.filter(v => v !== key) : [...benenVariants, key];
        set('benenVariants', next.length ? next : benenVariants);   // keep ≥1
    };
    // Plaatswaarden: included notations (letters/expanded).
    const mathForms: string[] = Array.isArray(block.constraints.mathForms) && block.constraints.mathForms.length
        ? block.constraints.mathForms : ['letters'];
    const toggleMathForm = (key: string) => {
        const has = mathForms.includes(key);
        const next = has ? mathForms.filter(v => v !== key) : [...mathForms, key];
        set('mathForms', next.length ? next : mathForms);
    };

    const toggleMask = (posKey: string) => {
        const cur = operand1Mask || {};
        set('operand1Mask', { ...cur, [posKey]: !cur[posKey] });
    };

    const toggleMask2 = (posKey: string) => {
        const cur = operand2Mask || {};
        set('operand2Mask', { ...cur, [posKey]: !cur[posKey] });
    };

    // Layout is fixed by the sidebar leaf; the config only refines that layout.
    const currentLayout = typeof layout === 'string' ? layout : 'basic';
    const maxPresets = isPositie && currentLayout !== 'positie-tabel'
        ? [...MAX_PRESETS, 1000000000]
        : MAX_PRESETS;

    return (
        <div style={styles.container}>

            {/* DECIMALEN — decimal place-values (not positietabel / verliefde harten) */}
            {decimalsAllowed && (
                <div style={styles.section}>
                    <label style={styles.label}>Decimalen:</label>
                    <div style={styles.buttonGroup}>
                        {[0, 1, 2, 3].map(dp => (
                            <button key={dp} onClick={() => set('decimalPlaces', dp)} style={styles.radioBtn(decimalPlaces === dp)}>{dp === 0 ? 'Geen' : dp}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* POSITIE-BENEN — include any of the 4 (benen/getal × 30/3T) combos */}
            {currentLayout === 'positie-benen' && (
                <div style={styles.section}>
                    <label style={styles.label}>Soorten (wat mag voorkomen):</label>
                    {([
                        [{ key: 'legs-letters', label: 'Benen · 3T' }, { key: 'legs-value', label: 'Benen · 30' }],
                        [{ key: 'top-letters', label: 'Getal · 3T' }, { key: 'top-value', label: 'Getal · 30' }],
                    ]).map((row, r) => (
                        <div key={r} style={{ ...styles.buttonGroup, marginBottom: '6px' }}>
                            {row.map(o => (
                                <button key={o.key} onClick={() => toggleBenen(o.key)} style={styles.pill(benenVariants.includes(o.key))}>{o.label}</button>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* POSITIE-MATH — notation (include either/both) + direction */}
            {currentLayout === 'positie-math' && (
                <>
                    <div style={styles.section}>
                        <label style={styles.label}>Notatie (wat mag voorkomen):</label>
                        <div style={styles.buttonGroup}>
                            <button onClick={() => toggleMathForm('letters')} style={styles.pill(mathForms.includes('letters'))}>Letters (7H+9T+2E)</button>
                            <button onClick={() => toggleMathForm('expanded')} style={styles.pill(mathForms.includes('expanded'))}>Uitgebreid (300+70+8)</button>
                        </div>
                    </div>
                    <div style={styles.section}>
                        <label style={styles.label}>Richting:</label>
                        <div style={styles.buttonGroup}>
                            <button onClick={() => set('mathDirection', 'decompose')} style={styles.radioBtn(mathDirection === 'decompose')}>Splitsen (942=…)</button>
                            <button onClick={() => set('mathDirection', 'compose')} style={styles.radioBtn(mathDirection === 'compose')}>Samenstellen (…=942)</button>
                            <button onClick={() => set('mathDirection', 'beide')} style={styles.radioBtn(mathDirection === 'beide')}>Beide</button>
                        </div>
                    </div>
                </>
            )}

            {/* ROWS PER BOX — only for basic */}
            {currentLayout === 'basic' && (
                <div style={styles.section}>
                    <label style={styles.label}>Rijen per box: {rowsPerBox}</label>
                    <input
                        type="range" min="2" max="8" step="1"
                        value={rowsPerBox}
                        onChange={(e) => set('rowsPerBox', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                    />
                </div>
            )}

            {/* ROW HEIGHT — only for basic */}
            {currentLayout === 'basic' && (
                <div style={styles.section}>
                    <label style={styles.label}>Rijhoogte: {rowHeight}px</label>
                    <input
                        type="range" min="22" max="70" step="2"
                        value={rowHeight}
                        onChange={(e) => set('rowHeight', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                    />
                </div>
            )}

            {/* MAXIMUM GETAL */}
            <div style={styles.section}>
                <label style={styles.label}>Maximum getal:</label>
                <div style={styles.buttonGroup}>
                    {(currentLayout === 'verliefde-harten' ? HEART_PRESETS : maxPresets).map(val => (
                        <button
                            key={val}
                            onClick={() => {
                                set('maxGetal', val);
                                if (fixedTotal && fixedTotal > val) set('fixedTotal', null);
                                if (val > 100 && currentLayout === 'verliefde-harten') set('layout', 'basic');
                            }}
                            style={radioBtnStyle(maxGetal === val)}
                        >
                            Tot {val.toLocaleString('nl-BE')}
                        </button>
                    ))}
                </div>
            </div>

            {/* SPECIFIC NUMBER STRUCTURE — place-value layouts (which places the number has) */}
            {isPositie && (
                <div style={styles.section}>
                    <label style={styles.label}>Specifieke getalopbouw:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {maskPlaces.map(p => (
                            <button key={p.key} onClick={() => toggleMask(p.key)} style={maskBtnStyle(operand1Mask?.[p.key])}>{p.key}</button>
                        ))}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0' }}>Leeg = vrije opbouw. Bv. enkel T, E en t.</p>
                </div>
            )}

            {/* FIXED TOTAL OVERRIDE */}
            {!isPositie && (<>
            <div style={styles.section}>
                <label style={styles.label}>Altijd splitsen van:</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="number"
                        min="2"
                        max={maxGetal}
                        value={fixedTotal ?? ''}
                        placeholder={`vrij (max ${maxGetal})`}
                        onChange={(e) => {
                            const v = e.target.value === '' ? null : Math.min(Number(e.target.value), maxGetal);
                            set('fixedTotal', v);
                        }}
                        style={inputStyle}
                    />
                    {fixedTotal && (
                        <button onClick={() => set('fixedTotal', null)} style={clearBtnStyle}>✕</button>
                    )}
                </div>
            </div>

            {/* SPECIFIC NUMBER STRUCTURE — getal 1 (total) */}
            <div style={styles.section}>
                <label style={styles.label}>Specifieke getalopbouw — Getal 1:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {maskPlaces.map(p => (
                        <button
                            key={p.key}
                            onClick={() => toggleMask(p.key)}
                            style={maskBtnStyle(operand1Mask?.[p.key])}
                        >
                            {p.key}
                        </button>
                    ))}
                </div>
            </div>

            {/* SPECIFIC NUMBER STRUCTURE — getal 2 (given part) */}
            <div style={styles.section}>
                <label style={styles.label}>Specifieke getalopbouw — Getal 2:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {maskPlaces.map(p => (
                        <button
                            key={p.key}
                            onClick={() => toggleMask2(p.key)}
                            style={maskBtnStyle(operand2Mask?.[p.key])}
                        >
                            {p.key}
                        </button>
                    ))}
                </div>
            </div>
            </>)}

        </div>
    );
}

const radioBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 10px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer',
    border: '1px solid var(--border-color)',
    backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)',
    color: active ? 'white' : 'var(--text-muted)',
    fontWeight: active ? 'bold' : 'normal',
});

const maskBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '28px', height: '28px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
    borderRadius: '4px', border: '1px solid var(--border-color)',
    backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)',
    color: active ? '#fff' : 'var(--text-muted)',
});

const inputStyle: React.CSSProperties = {
    flex: 1, padding: '8px 10px', backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)', borderRadius: '6px',
    color: 'var(--text-main)', outline: 'none', fontSize: '13px', boxSizing: 'border-box',
};

const clearBtnStyle: React.CSSProperties = {
    padding: '6px 10px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)',
    borderRadius: '4px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px',
};
