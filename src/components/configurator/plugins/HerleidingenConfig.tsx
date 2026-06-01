import { useWorksheetStore } from '../../../store/useWorksheetStore';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import { ladderFor } from '../../../services/herleidingen/herleidingenGenerator';
import type { MathBlock } from '../../../services/math/types';

const FORMATS = [
    { key: 'enkel-getal', label: 'Getal invullen' },          // 1 kg = ___ g
    { key: 'enkel-eenheid', label: 'Eenheid invullen' },      // 2 l = 200 ___
    { key: 'samengesteld-enkel', label: 'Samengesteld → enkel' }, // 3 m 6 cm = ___ cm
    { key: 'enkel-samengesteld', label: 'Enkel → samengesteld' }, // 540 cm = ___ m ___ dm
];
const SAM_STOPS = [10, 100, 1000, 10000, 100000, 1000000];

export default function HerleidingenConfig({ block }: { block: MathBlock }) {
    const update = useWorksheetStore(s => s.updateBlockSettings);
    const c = block.constraints;
    const measure: string = c.measure ?? 'lengte';
    const ladder = ladderFor(measure);
    const units: string[] = c.units ?? ladder.map(u => u.key);
    const formats: string[] = c.formats ?? FORMATS.map(f => f.key);
    const maxEnkel: number = c.maxEnkel ?? 100;
    const maxSam: number = c.maxSamengesteld ?? 1000;
    const compoundMode: string = c.compoundMode ?? '2';

    const hasEnkel = formats.some(f => f === 'enkel-getal' || f === 'enkel-eenheid');
    const hasSam = formats.some(f => f === 'samengesteld-enkel' || f === 'enkel-samengesteld');

    const set = (k: string, v: unknown) => update(block.id, { constraints: { ...c, [k]: v } });
    const toggleUnit = (k: string) => { const next = units.includes(k) ? units.filter(x => x !== k) : [...units, k]; if (next.length) set('units', next); };
    const toggleFormat = (k: string) => { const next = formats.includes(k) ? formats.filter(x => x !== k) : [...formats, k]; if (next.length) set('formats', next); };

    // Breakpoint slider — snaps to power-of-10 stops.
    const stopSlider = (key: string, val: number, stops: number[], label: string) => {
        const idx = Math.max(0, stops.indexOf(val));
        return (
            <div style={styles.section}>
                <label style={styles.label}>{label}: {val.toLocaleString('nl-BE')}</label>
                <input type="range" min={0} max={stops.length - 1} step={1} value={idx}
                    onChange={e => set(key, stops[Number(e.target.value)])}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <label style={styles.label}>Maateenheden:</label>
                <div style={styles.buttonGroup}>
                    {ladder.map(u => (
                        <button key={u.key} onClick={() => toggleUnit(u.key)} style={styles.pill(units.includes(u.key))}>{u.key}</button>
                    ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0' }}>Kies minstens twee eenheden.</p>
            </div>

            <div style={styles.section}>
                <label style={styles.groupLabel}>Soorten oefeningen</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {FORMATS.map(f => (
                        <button key={f.key} onClick={() => toggleFormat(f.key)} style={{ ...styles.pill(formats.includes(f.key)), width: '100%', textAlign: 'left' }}>{f.label}</button>
                    ))}
                </div>
            </div>

            {hasEnkel && (
                <div style={styles.section}>
                    <label style={styles.label}>Maximum getal (enkelvoudig): {maxEnkel.toLocaleString('nl-BE')}</label>
                    <input type="range" min={10} max={1000} step={10} value={Math.min(1000, Math.max(10, maxEnkel))}
                        onChange={e => set('maxEnkel', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                </div>
            )}
            {hasSam && stopSlider('maxSamengesteld', maxSam, SAM_STOPS, 'Maximum getal (samengesteld)')}

            {hasSam && (
                <div style={styles.section}>
                    <label style={styles.label}>Samengesteld in:</label>
                    <div className="seg-group">
                        <button className="seg-btn" aria-pressed={compoundMode === '2'} onClick={() => set('compoundMode', '2')}>2 eenheden</button>
                        <button className="seg-btn" aria-pressed={compoundMode === 'volledig'} onClick={() => set('compoundMode', 'volledig')}>Volledig</button>
                    </div>
                </div>
            )}

            <div style={styles.onOffRow}>
                <span style={styles.onOffLabel}>Leerling schrijft de eenheden zelf</span>
                <button onClick={() => set('writeUnits', !c.writeUnits)} style={styles.onOffBtn(!!c.writeUnits)}>{c.writeUnits ? 'Aan' : 'Uit'}</button>
            </div>
        </div>
    );
}
