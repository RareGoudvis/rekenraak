import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    block: MathBlock;
}

// Omtrek shape keys, grouped for the UI (stored flat in constraints.shapes).
const SHAPE_GROUPS: Array<{ title: string; items: Array<{ key: string; label: string }> }> = [
    { title: 'Driehoek', items: [{ key: 'driehoek', label: 'Driehoek' }] },
    { title: 'Vierhoeken', items: [
        { key: 'vierkant', label: 'Vierkant' }, { key: 'rechthoek', label: 'Rechthoek' },
        { key: 'ruit', label: 'Ruit' }, { key: 'parallellogram', label: 'Parallellogram' },
        { key: 'trapezium', label: 'Trapezium' }, { key: 'vierhoek', label: 'Vierhoek' },
    ] },
    { title: 'Veelhoeken', items: [
        { key: 'vijfhoek', label: 'Vijfhoek' }, { key: 'zeshoek', label: 'Zeshoek' },
        { key: 'zevenhoek', label: 'Zevenhoek' }, { key: 'achthoek', label: 'Achthoek' },
    ] },
    { title: 'Cirkel', items: [{ key: 'cirkel', label: 'Cirkel' }] },
];

export default function MetenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const {
        measureModel = 'meten',
        precision = 'cm',
        minLength = 3,
        maxLength = 10,
        maxCorners = 0,
        shapes = ['driehoek', 'rechthoek', 'vierkant'],
    } = block.constraints;

    const isOmtrek = block.typeId === 'omtrek';
    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    const toggleShape = (k: string) => {
        const has = shapes.includes(k);
        const next = has ? shapes.filter((s: string) => s !== k) : [...shapes, k];
        set('shapes', next.length ? next : shapes);   // keep ≥1
    };

    return (
        <div style={styles.container}>
            {/* MEET-MODEL — lengte: meten/juist-fout · omtrek: op-schaal/gegeven */}
            <div style={styles.section}>
                <label style={styles.label}>{isOmtrek ? 'Lengtes:' : 'Soort:'}</label>
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('measureModel', 'meten')} style={styles.radioBtn(measureModel === 'meten')}>{isOmtrek ? 'Op schaal (meten)' : 'Meten (schrijven)'}</button>
                    <button onClick={() => set('measureModel', 'gegeven')} style={styles.radioBtn(measureModel === 'gegeven')}>{isOmtrek ? 'Gegeven' : 'Juist of fout'}</button>
                </div>
            </div>

            {/* PRECISION — only meaningful for measuring */}
            {measureModel === 'meten' && (
                <div style={styles.section}>
                    <label style={styles.label}>Nauwkeurigheid:</label>
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('precision', 'cm')} style={styles.radioBtn(precision === 'cm')}>Hele cm</button>
                        <button onClick={() => set('precision', 'mm')} style={styles.radioBtn(precision === 'mm')}>Mm-nauwkeurig</button>
                    </div>
                </div>
            )}

            {/* LENGTH RANGE */}
            <div style={styles.section}>
                <label style={styles.label}>{isOmtrek ? 'Lengte per zijde (cm):' : 'Lengte (cm):'}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>van</span>
                    <input type="number" min={1} max={maxLength} value={minLength}
                        onChange={(e) => set('minLength', Math.max(1, Math.min(Number(e.target.value), maxLength)))}
                        style={inputStyle} />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>tot</span>
                    <input type="number" min={minLength} max={20} value={maxLength}
                        onChange={(e) => set('maxLength', Math.max(minLength, Math.min(Number(e.target.value), 20)))}
                        style={inputStyle} />
                </div>
            </div>

            {/* LENGTE METEN — number of corners */}
            {!isOmtrek && (
                <div style={styles.section}>
                    <label style={styles.label}>Aantal hoeken: {maxCorners}</label>
                    <input type="range" min="0" max="4" step="1" value={maxCorners}
                        onChange={(e) => set('maxCorners', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                </div>
            )}

            {/* OMTREK — shape selection */}
            {isOmtrek && SHAPE_GROUPS.map(group => (
                <div key={group.title} style={styles.section}>
                    <label style={styles.label}>{group.title}:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {group.items.map(o => (
                            <button key={o.key} onClick={() => toggleShape(o.key)} style={styles.pill(shapes.includes(o.key))}>{o.label}</button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '64px', padding: '8px 10px', backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)', borderRadius: '6px',
    color: 'var(--text-main)', outline: 'none', fontSize: '13px', boxSizing: 'border-box',
};
