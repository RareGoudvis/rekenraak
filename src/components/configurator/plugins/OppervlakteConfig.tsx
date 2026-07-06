import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const ROOSTER_SHAPES = [
    { key: 'rechthoek', label: 'Rechthoek' },
    { key: 'vierkant', label: 'Vierkant' },
    { key: 'l-figuur', label: 'L-figuur' },
];
const BEREKEN_SHAPES = [
    { key: 'rechthoek', label: 'Rechthoek' },
    { key: 'vierkant', label: 'Vierkant' },
    { key: 'rechthoekige-driehoek', label: 'Rechth. driehoek' },
];

export default function OppervlakteConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const subType: string = c.subType ?? 'berekenen';
    const isRooster = subType === 'rooster';
    const shapes: string[] = c.shapes ?? ['rechthoek', 'vierkant'];
    const minLength: number = c.minLength ?? 2;
    const maxLength: number = c.maxLength ?? 8;
    const askOmtrek: boolean = c.askOmtrek ?? false;
    const scaffoldFormule: boolean = c.scaffoldFormule ?? true;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleShape = (k: string) => {
        const next = shapes.includes(k) ? shapes.filter(x => x !== k) : [...shapes, k];
        if (next.length) set('shapes', next);   // keep ≥1
    };
    const pool = isRooster ? ROOSTER_SHAPES : BEREKEN_SHAPES;

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Figuren:" info={isRooster ? 'Figuren op het 1 cm-rooster; hokjes tellen geeft de oppervlakte.' : 'Figuren met zijden op ware grootte; oppervlakte via de formule.'} />
                <div style={styles.buttonGroup}>
                    {pool.map(s => (
                        <button key={s.key} onClick={() => toggleShape(s.key)} style={styles.pill(shapes.includes(s.key))}>{s.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <label style={styles.label}>Zijden van {minLength} tot {maxLength} cm</label>
                <input type="range" min="1" max="6" step="1" value={minLength}
                    onChange={(e) => set('minLength', Math.min(Number(e.target.value), maxLength - 1))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                <input type="range" min="3" max="10" step="1" value={maxLength}
                    onChange={(e) => set('maxLength', Math.max(Number(e.target.value), minLength + 1))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                <p style={styles.hint}>Figuren staan op ware grootte op het blad.</p>
            </div>

            {!isRooster && (
                <>
                    <div style={styles.onOffRow}>
                        <SettingLabel text="Formule-hulp" info="Toont 'opp = ___ × ___ = ___' in plaats van één antwoordlijn." />
                        <button onClick={() => set('scaffoldFormule', !scaffoldFormule)} style={styles.onOffBtn(scaffoldFormule)}>{scaffoldFormule ? 'Aan' : 'Uit'}</button>
                    </div>
                    <div style={styles.onOffRow}>
                        <SettingLabel text="Ook omtrek vragen" info="Voegt onder elke figuur een tweede vraag naar de omtrek toe." />
                        <button onClick={() => set('askOmtrek', !askOmtrek)} style={styles.onOffBtn(askOmtrek)}>{askOmtrek ? 'Aan' : 'Uit'}</button>
                    </div>
                </>
            )}
        </div>
    );
}
