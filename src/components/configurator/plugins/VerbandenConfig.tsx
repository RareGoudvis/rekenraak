import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const DENOMINATORS = [2, 4, 5, 8, 10, 20, 25, 100];
const REPS = [
    { key: 'breuk', label: 'Breuk' },
    { key: 'decimaal', label: 'Kommagetal' },
    { key: 'procent', label: 'Procent' },
];

export default function VerbandenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const reps: string[] = c.reps ?? ['breuk', 'decimaal', 'procent'];
    const denominators: number[] = c.denominators ?? [2, 4, 5, 10, 100];
    const given: string = c.given ?? 'random';

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleRep = (k: string) => {
        const next = reps.includes(k) ? reps.filter(x => x !== k) : [...reps, k];
        if (next.length >= 2) set('reps', next);   // need ≥2 to have something to fill in
    };
    const toggleDen = (d: number) => {
        const next = denominators.includes(d) ? denominators.filter(x => x !== d) : [...denominators, d];
        if (next.length) set('denominators', next);
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Voorstellingen:" info="Welke schrijfwijzen in de oefening voorkomen (minstens twee)." />
                <div style={styles.buttonGroup}>
                    {REPS.map(r => (
                        <button key={r.key} onClick={() => toggleRep(r.key)} style={styles.pill(reps.includes(r.key))}>{r.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Noemers:" info="Alleen noemers met een exacte komma- en procentwaarde. Bij 8 verschijnen halve procenten (12,5 %)." />
                <div style={styles.buttonGroup}>
                    {DENOMINATORS.map(d => (
                        <button key={d} onClick={() => toggleDen(d)} style={styles.pill(denominators.includes(d))}>{d}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Gegeven voorstelling:" info="Welke schrijfwijze al ingevuld staat." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('given', 'random')} style={styles.radioBtn(given === 'random')}>Willekeurig</button>
                    {REPS.filter(r => reps.includes(r.key)).map(r => (
                        <button key={r.key} onClick={() => set('given', r.key)} style={styles.radioBtn(given === r.key)}>{r.label}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}
