import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const GRANULARITIES = [
    { key: 'heel-uur', label: 'Heel uur' },
    { key: 'kwartier', label: 'Kwartier' },
    { key: 'vijf-min', label: '5 min' },
    { key: 'een-min', label: '1 min' },
];
const BLANKS = [
    { key: 'duur', label: 'Duur' },
    { key: 'einde', label: 'Eindtijd' },
    { key: 'begin', label: 'Begintijd' },
];

export default function TijdsduurConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const granularity: string[] = c.granularity ?? ['kwartier'];
    const blanks: string[] = c.blanks ?? ['duur'];
    const maxDuurMin = c.maxDuurMin ?? 240;
    const overMidnight: boolean = c.overMidnight ?? false;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleIn = (key: string, list: string[], v: string) => {
        const next = list.includes(v) ? list.filter(x => x !== v) : [...list, v];
        if (next.length) set(key, next);   // keep ≥1
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Tijden op:" info="Hoe fijn de klok tikt: hele uren, kwartieren, 5 minuten of 1 minuut." />
                <div style={styles.buttonGroup}>
                    {GRANULARITIES.map(g => (
                        <button key={g.key} onClick={() => toggleIn('granularity', granularity, g.key)} style={styles.pill(granularity.includes(g.key))}>{g.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="In te vullen:" info="Welke kolom leeg blijft (wisselt per rij als er meerdere aanstaan)." />
                <div style={styles.buttonGroup}>
                    {BLANKS.map(b => (
                        <button key={b.key} onClick={() => toggleIn('blanks', blanks, b.key)} style={styles.pill(blanks.includes(b.key))}>{b.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Langste duur:" info="De grootste tijdsduur in de tabel." />
                <PopupSelect
                    clampToLowest
                    value={maxDuurMin}
                    options={[
                        { value: 60, label: 'Tot 1 uur' },
                        { value: 240, label: 'Tot 4 uur' },
                        { value: 720, label: 'Tot 12 uur' },
                    ]}
                    onChange={(v) => set('maxDuurMin', v)}
                    ariaLabel="Langste duur"
                />
            </div>

            <div style={styles.onOffRow}>
                <SettingLabel text="Over middernacht" info="Ook activiteiten die na middernacht eindigen (23:30 → 01:15)." />
                <button onClick={() => set('overMidnight', !overMidnight)} style={styles.onOffBtn(overMidnight)}>{overMidnight ? 'Aan' : 'Uit'}</button>
            </div>
        </div>
    );
}
