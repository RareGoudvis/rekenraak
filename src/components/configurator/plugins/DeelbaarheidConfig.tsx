import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    block: MathBlock;
}

const DIVISOR_OPTIONS = [2, 3, 4, 5, 6, 9, 10, 25, 50, 100];
const MAX_PRESETS = [100, 1000, 10000, 100000];

export default function DeelbaarheidConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const {
        layout = 'tabel',
        divisors = [2, 5, 10],
        maxGetal = 1000,
        base = 9,
        terms = 6,
        givenCount = 2,
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    const toggleDivisor = (d: number) => {
        const next = divisors.includes(d) ? divisors.filter((x: number) => x !== d) : [...divisors, d].sort((a, b) => a - b);
        if (next.length > 0) set('divisors', next);
    };

    return (
        <div style={styles.container}>
            {/* LAYOUT */}
            <div style={styles.section}>
                <label style={styles.label}>Lay-out:</label>
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('layout', 'tabel')} style={styles.radioBtn(layout === 'tabel')}>Tabel</button>
                    <button onClick={() => set('layout', 'veelvouden')} style={styles.radioBtn(layout === 'veelvouden')}>Veelvouden</button>
                </div>
            </div>

            {layout === 'tabel' ? (
                <>
                    <div style={styles.section}>
                        <label style={styles.label}>Deelbaar door:</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {DIVISOR_OPTIONS.map(d => (
                                <button key={d} onClick={() => toggleDivisor(d)} style={styles.radioBtn(divisors.includes(d))}>{d}</button>
                            ))}
                        </div>
                    </div>
                    <div style={styles.section}>
                        <label style={styles.label}>Maximum getal:</label>
                        <div style={styles.buttonGroup}>
                            {MAX_PRESETS.map(val => (
                                <button key={val} onClick={() => set('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>Tot {val.toLocaleString('nl-BE')}</button>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div style={styles.section}>
                        <label style={styles.label}>Veelvouden van: {base}</label>
                        <input type="range" min="2" max="25" step="1" value={base}
                            onChange={(e) => set('base', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                    <div style={styles.section}>
                        <label style={styles.label}>Aantal getallen: {terms}</label>
                        <input type="range" min="4" max="12" step="1" value={terms}
                            onChange={(e) => set('terms', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                    <div style={styles.section}>
                        <label style={styles.label}>Reeds ingevuld: {givenCount}</label>
                        <input type="range" min="1" max={Math.max(1, terms - 1)} step="1" value={givenCount}
                            onChange={(e) => set('givenCount', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                </>
            )}
        </div>
    );
}
