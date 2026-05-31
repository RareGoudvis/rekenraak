import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { targetsFor } from '../../../services/afronden/afrondenGenerator';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props { block: MathBlock; }

const NAT_PRESETS = [100, 1000, 10000, 100000, 1000000];
const DEC_PRESETS = [10, 100, 1000];

export default function AfrondenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const numberType: string = c.numberType ?? 'natural';
    const isDecimal = numberType === 'decimal';
    const subType: string = c.subType ?? 'rooster';
    const maxGetal = c.maxGetal ?? (isDecimal ? 100 : 1000);
    const numberMask = c.numberMask ?? {};
    const roundTargets: string[] = c.roundTargets ?? (isDecimal ? ['E', 't'] : ['T', 'H']);
    const roosterSize = c.roosterSize ?? 6;
    const decimalPlaces = c.decimalPlaces ?? 2;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleMask = (k: string) => set('numberMask', { ...numberMask, [k]: !numberMask[k] });
    const toggleTarget = (k: string) => {
        const next = roundTargets.includes(k) ? roundTargets.filter((x: string) => x !== k) : [...roundTargets, k];
        if (next.length) set('roundTargets', next);   // keep ≥1
    };
    const places = getMaskPlaces(maxGetal, 'natural');
    const usableTargets = targetsFor(numberType).filter(t => isDecimal || t.weight < maxGetal);

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <label style={styles.label}>Maximum getal:</label>
                <div style={styles.buttonGroup}>
                    {(isDecimal ? DEC_PRESETS : NAT_PRESETS).map(val => (
                        <button key={val} onClick={() => set('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>Tot {val.toLocaleString('nl-BE')}</button>
                    ))}
                </div>
            </div>

            {isDecimal && (
                <div style={styles.section}>
                    <label style={styles.label}>Cijfers na de komma:</label>
                    <div style={styles.buttonGroup}>
                        {[1, 2, 3].map(val => (
                            <button key={val} onClick={() => set('decimalPlaces', val)} style={styles.radioBtn(decimalPlaces === val)}>{val}</button>
                        ))}
                    </div>
                </div>
            )}

            <div style={styles.section}>
                <label style={styles.label}>Afronden op:</label>
                <div style={styles.buttonGroup}>
                    {usableTargets.map(t => (
                        <button key={t.key} onClick={() => toggleTarget(t.key)} style={styles.pill(roundTargets.includes(t.key))}>op {t.label}</button>
                    ))}
                </div>
            </div>

            {subType === 'rooster' && (
                <div style={styles.section}>
                    <label style={styles.label}>Aantal getallen per rooster: {roosterSize}</label>
                    <input type="range" min="3" max="12" step="1" value={roosterSize}
                        onChange={(e) => set('roosterSize', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0' }}>
                        "Aantal oefeningen" bepaalt hoeveel roosters je krijgt.
                    </p>
                </div>
            )}

            {!isDecimal && (
                <div style={styles.section}>
                    <label style={styles.label}>Specifieke getalopbouw:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {places.map(p => (
                            <button key={p.key} onClick={() => toggleMask(p.key)} style={maskBtnStyle(!!numberMask[p.key])} title={p.label}>{p.key}</button>
                        ))}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0' }}>Leeg = vrije opbouw.</p>
                </div>
            )}
        </div>
    );
}

// Canonical mask button — see UI-GUIDE.md.
const maskBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '28px', height: '28px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
    border: '1px solid var(--border-color)',
    backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)',
    color: active ? '#fff' : 'var(--text-muted)',
});
