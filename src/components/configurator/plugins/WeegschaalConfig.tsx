import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { BEREIK_STEPS } from '../../../services/weegschaal/weegschaalGenerator';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

export default function WeegschaalConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const mode: string = c.mode ?? 'aflezen';
    const bereikGram: number = c.bereikGram ?? 1000;
    const allowed = BEREIK_STEPS[bereikGram] ?? [50];
    const stepGram: number = allowed.includes(c.stepGram) ? c.stepGram : allowed[0];
    const notatie: string = c.notatie ?? 'g';
    const perRow: number = c.exercisesPerRow ?? 2;
    const boxHeight: number = c.boxHeight ?? 170;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    // Changing the bereik snaps the step to that dial's coarsest schaalverdeling.
    const setBereik = (v: number) =>
        updateBlockSettings(block.id, { constraints: { ...c, bereikGram: v, stepGram: (BEREIK_STEPS[v] ?? [50])[0] } });

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Opdracht:" info="Wijzer aflezen en het gewicht noteren, of het gewicht krijgen en de wijzer tekenen." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('mode', 'aflezen')} style={styles.radioBtn(mode === 'aflezen')}>Aflezen</button>
                    <button onClick={() => set('mode', 'tekenen')} style={styles.radioBtn(mode === 'tekenen')}>Wijzer tekenen</button>
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Bereik van de weegschaal:" info="Het maximum van de wijzerplaat." />
                <PopupSelect
                    value={bereikGram}
                    options={[
                        { value: 1000, label: 'Tot 1 kg' },
                        { value: 2000, label: 'Tot 2 kg' },
                        { value: 5000, label: 'Tot 5 kg' },
                    ]}
                    onChange={(v) => setBereik(Number(v))}
                    ariaLabel="Bereik"
                />
            </div>

            <div style={styles.section}>
                <SettingLabel text="Schaalverdeling:" info="Afstand tussen twee streepjes op de wijzerplaat." />
                <div style={styles.buttonGroup}>
                    {allowed.map(s => (
                        <button key={s} onClick={() => set('stepGram', s)} style={styles.radioBtn(stepGram === s)}>per {s} g</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Antwoordnotatie:" info="Hoe het gewicht genoteerd wordt: in gram, als kommagetal in kg, of samengesteld." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('notatie', 'g')} style={styles.radioBtn(notatie === 'g')}>g</button>
                    <button onClick={() => set('notatie', 'kg-komma')} style={styles.radioBtn(notatie === 'kg-komma')}>kg (komma)</button>
                    <button onClick={() => set('notatie', 'kg-g')} style={styles.radioBtn(notatie === 'kg-g')}>kg + g</button>
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Weegschalen per rij:" info="Hoeveel wijzerplaten naast elkaar staan." />
                <PopupSelect
                    value={perRow}
                    options={[2, 3].map(v => ({ value: v, label: String(v) }))}
                    onChange={(v) => set('exercisesPerRow', v)}
                    ariaLabel="Per rij"
                />
            </div>

            <div style={styles.section}>
                <label style={styles.label}>Grootte wijzerplaat: {boxHeight}px</label>
                <input type="range" min="120" max="220" step="10" value={boxHeight}
                    onChange={(e) => set('boxHeight', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            </div>
        </div>
    );
}
