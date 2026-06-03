import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS = [20, 100, 1000, 10000, 100000];
const OPS: Array<{ key: string; label: string }> = [
    { key: '+', label: '+' }, { key: '-', label: '−' }, { key: 'x', label: '×' }, { key: ':', label: ':' },
];

export default function PatroonConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const {
        numberType = 'natural',
        maxGetal = 100,
        minGetal,
        ticks = 6,
        steps = 1,
        ops = ['+'],
        opSettings = {},
        maxDecimals = 1,
    } = block.constraints;
    const isDecimal = numberType === 'decimal';
    const dp = isDecimal ? Math.min(3, Math.max(1, maxDecimals)) : 0;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    const lowerBound = minGetal ?? -maxGetal;

    const toggleOp = (op: string) => {
        const has = ops.includes(op);
        const nextOps = has ? ops.filter((o: string) => o !== op) : [...ops, op];
        if (!nextOps.length) return;   // keep ≥1
        const nextSettings = { ...opSettings };
        if (!has && !nextSettings[op]) nextSettings[op] = { max: 10, mask: {} };
        updateBlockSettings(block.id, { constraints: { ...block.constraints, ops: nextOps, opSettings: nextSettings } });
    };
    const setOp = (op: string, patch: Record<string, unknown>) => {
        const cur = opSettings[op] ?? { max: 10, mask: {} };
        set('opSettings', { ...opSettings, [op]: { ...cur, ...patch } });
    };
    const toggleOpMask = (op: string, k: string) => {
        const cur = opSettings[op] ?? { max: 10, mask: {} };
        setOp(op, { mask: { ...cur.mask, [k]: !cur.mask?.[k] } });
    };

    return (
        <div style={styles.container}>
            {/* MAX */}
            <div style={styles.section}>
                <label style={styles.label}>Maximum getal:</label>
                <div style={styles.buttonGroup}>
                    {MAX_PRESETS.map(val => (
                        <button key={val} onClick={() => set('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>Tot {val.toLocaleString('nl-BE')}</button>
                    ))}
                </div>
            </div>

            {/* GEHELE — lower bound */}
            {numberType === 'geheel' && (
                <div style={styles.section}>
                    <label style={styles.label}>Ondergrens: {lowerBound.toLocaleString('nl-BE')}</label>
                    <input type="range" min={-maxGetal} max={0} step={Math.max(1, Math.round(maxGetal / 100))}
                        value={lowerBound} onChange={(e) => set('minGetal', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                </div>
            )}

            {/* MAX DECIMALEN — decimal patterns only */}
            {isDecimal && (
                <div style={styles.section}>
                    <label style={styles.label}>Max decimalen:</label>
                    <div style={styles.buttonGroup}>
                        {[1, 2, 3].map(d => (
                            <button key={d} onClick={() => set('maxDecimals', d)} style={styles.radioBtn(dp === d)}>{d}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEPS + TICKS */}
            <div style={styles.section}>
                <label style={styles.label}>Stappen in het patroon: {steps}</label>
                <input type="range" min="1" max="4" step="1" value={steps}
                    onChange={(e) => set('steps', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            </div>
            <div style={styles.section}>
                <label style={styles.label}>Aantal getallen: {ticks}</label>
                <input type="range" min="4" max="10" step="1" value={ticks}
                    onChange={(e) => set('ticks', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            </div>

            {/* OPERATIONS */}
            <div style={styles.section}>
                <label style={styles.label}>Bewerkingen:</label>
                <div style={styles.buttonGroup}>
                    {OPS.map(o => (
                        <button key={o.key} onClick={() => toggleOp(o.key)} style={styles.pill(ops.includes(o.key))}>{o.label}</button>
                    ))}
                </div>
            </div>

            {/* PER-OP SETTINGS */}
            {OPS.filter(o => ops.includes(o.key)).map(o => {
                const s = opSettings[o.key] ?? { max: 10, mask: {} };
                const isAddSub = o.key === '+' || o.key === '-';
                // Mask spans the block's full place range (+ decimals) so big/decimal steps can be structured.
                const maskPlaces = getMaskPlaces(maxGetal, isDecimal ? 'decimal' : 'natural', dp);
                return (
                    <div key={o.key} style={{ ...styles.section, paddingLeft: '8px', borderLeft: '2px solid var(--separator)' }}>
                        <label style={styles.label}>{o.label} — {isAddSub ? 'stap' : (o.key === 'x' ? 'factor' : 'deler')} (max):</label>
                        <input type="number" min={isAddSub ? 1 : 2} max={isAddSub ? 1000 : 12} value={s.max ?? 10}
                            onChange={(e) => setOp(o.key, { max: Math.max(isAddSub ? 1 : 2, Number(e.target.value)) })}
                            style={inputStyle} />
                        {isAddSub && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                {maskPlaces.map(p => (
                                    <button key={p.key} onClick={() => toggleOpMask(o.key, p.key)} style={styles.maskBtn(!!s.mask?.[p.key])} title={p.label}>{p.key}</button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '80px', padding: '8px 10px', backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)', borderRadius: '6px',
    color: 'var(--text-main)', outline: 'none', fontSize: '13px', boxSizing: 'border-box',
};
