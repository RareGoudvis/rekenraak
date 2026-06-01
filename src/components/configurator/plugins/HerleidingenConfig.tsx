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

export default function HerleidingenConfig({ block }: { block: MathBlock }) {
    const update = useWorksheetStore(s => s.updateBlockSettings);
    const c = block.constraints;
    const measure: string = c.measure ?? 'lengte';
    const ladder = ladderFor(measure);
    const units: string[] = c.units ?? ladder.map(u => u.key);
    const formats: string[] = c.formats ?? FORMATS.map(f => f.key);
    const max: number = c.maxGetal ?? 9;
    const writeUnits: boolean = !!c.writeUnits;
    const scaffolding: string = c.scaffolding ?? 'geen';

    const set = (k: string, v: unknown) => update(block.id, { constraints: { ...c, [k]: v } });
    const toggleUnit = (k: string) => { const next = units.includes(k) ? units.filter(x => x !== k) : [...units, k]; if (next.length) set('units', next); };
    const toggleFormat = (k: string) => { const next = formats.includes(k) ? formats.filter(x => x !== k) : [...formats, k]; if (next.length) set('formats', next); };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <label style={styles.label}>Eenheden:</label>
                <div style={styles.buttonGroup}>
                    {ladder.map(u => (
                        <button key={u.key} onClick={() => toggleUnit(u.key)} style={styles.pill(units.includes(u.key))}>{u.key}</button>
                    ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0' }}>Kies minstens twee eenheden.</p>
            </div>

            <div style={styles.section}>
                <label style={styles.label}>Maximum getal: {max}</label>
                <input type="range" min={2} max={50} step={1} value={max}
                    onChange={e => set('maxGetal', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
            </div>

            <div style={styles.section}>
                <label style={styles.groupLabel}>Soorten oefeningen</label>
                <div style={styles.buttonGroup}>
                    {FORMATS.map(f => (
                        <button key={f.key} onClick={() => toggleFormat(f.key)} style={styles.pill(formats.includes(f.key))}>{f.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.onOffRow}>
                <span style={styles.onOffLabel}>Leerling schrijft de eenheden zelf</span>
                <button onClick={() => set('writeUnits', !writeUnits)} style={styles.onOffBtn(writeUnits)}>{writeUnits ? 'Aan' : 'Uit'}</button>
            </div>

            <div style={styles.section}>
                <label style={styles.label}>Hulptabel:</label>
                <div className="seg-group">
                    <button className="seg-btn" aria-pressed={scaffolding === 'geen'} onClick={() => set('scaffolding', 'geen')}>Geen</button>
                    <button className="seg-btn" aria-pressed={scaffolding === 'tabel-headers'} onClick={() => set('scaffolding', 'tabel-headers')}>Met hoofding</button>
                    <button className="seg-btn" aria-pressed={scaffolding === 'tabel-blanco'} onClick={() => set('scaffolding', 'tabel-blanco')}>Blanco</button>
                </div>
            </div>
        </div>
    );
}
