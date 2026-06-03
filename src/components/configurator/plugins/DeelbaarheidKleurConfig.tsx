import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS = [20, 100, 1000];
const DIVISORS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function DeelbaarheidKleurConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const {
        viewMode = 'strip',
        divisors = [2, 5, 10],
        maxGetal = 100,
        perRow = 10,
        rasterCount = 100,
        rasterCols = 10,
        showRest = false,
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    const toggleDivisor = (d: number) => {
        const has = divisors.includes(d);
        const next = has ? divisors.filter((x: number) => x !== d) : [...divisors, d].sort((a, b) => a - b);
        set('divisors', next.length ? next : divisors);   // keep ≥1
    };

    const isRaster = viewMode === 'raster';

    return (
        <div style={styles.container}>
            {/* VIEW MODE */}
            <div style={styles.section}>
                <label style={styles.label}>Soort:</label>
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('viewMode', 'strip')} style={styles.radioBtn(viewMode === 'strip')}>Rooster</button>
                    <button onClick={() => set('viewMode', 'markeren')} style={styles.radioBtn(viewMode === 'markeren')}>Omcirkelen</button>
                    <button onClick={() => set('viewMode', 'raster')} style={styles.radioBtn(viewMode === 'raster')}>Kleurraster</button>
                </div>
            </div>

            {/* DIVISORS */}
            <div style={styles.section}>
                <label style={styles.label}>Delers:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {DIVISORS.map(d => (
                        <button key={d} onClick={() => toggleDivisor(d)} style={styles.pill(divisors.includes(d))}>{d}</button>
                    ))}
                </div>
            </div>

            {isRaster ? (
                <>
                    <div style={styles.section}>
                        <label style={styles.label}>Maximum getal:</label>
                        <div style={styles.buttonGroup}>
                            {[100, 1000].map(val => (
                                <button key={val} onClick={() => set('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>Tot {val.toLocaleString('nl-BE')}</button>
                            ))}
                        </div>
                    </div>
                    <div style={styles.section}>
                        <label style={styles.label}>Aantal getallen: {rasterCount}</label>
                        <input type="range" min="20" max="120" step="10" value={rasterCount}
                            onChange={(e) => set('rasterCount', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                    <div style={styles.section}>
                        <label style={styles.label}>Kolommen: {rasterCols}</label>
                        <input type="range" min="5" max="12" step="1" value={rasterCols}
                            onChange={(e) => set('rasterCols', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                </>
            ) : (
                <>
                    <div style={styles.section}>
                        <label style={styles.label}>Maximum getal:</label>
                        <div style={styles.buttonGroup}>
                            {MAX_PRESETS.map(val => (
                                <button key={val} onClick={() => set('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>Tot {val.toLocaleString('nl-BE')}</button>
                            ))}
                        </div>
                    </div>
                    <div style={styles.section}>
                        <label style={styles.label}>Getallen per rij: {perRow}</label>
                        <input type="range" min="5" max="14" step="1" value={perRow}
                            onChange={(e) => set('perRow', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                    <div style={styles.section}>
                        <div style={styles.onOffRow}>
                            <span style={styles.onOffLabel}>Rest berekenen</span>
                            <button onClick={() => set('showRest', !showRest)} style={styles.onOffBtn(showRest)}>{showRest ? 'Aan' : 'Uit'}</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
