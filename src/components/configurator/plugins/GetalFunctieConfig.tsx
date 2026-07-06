import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const FUNCTIES = [
    { key: 'hoeveelheid', label: 'Hoeveelheid' },
    { key: 'rang', label: 'Rangorde' },
    { key: 'maat', label: 'Maat' },
    { key: 'code', label: 'Code' },
];

export default function GetalFunctieConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const functies: string[] = c.functies ?? ['hoeveelheid', 'rang', 'maat', 'code'];
    const answerMode: string = c.answerMode ?? 'aankruisen';

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleFunctie = (k: string) => {
        const next = functies.includes(k) ? functies.filter(x => x !== k) : [...functies, k];
        // ≥2 nodig: één kolom aankruisen is geen oefening.
        if (next.length >= 2) set('functies', next);
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Functies:" info="Welke getalfuncties voorkomen (hoeveelheidsgetal, rangordegetal, maatgetal, codegetal). Minstens twee." />
                <div style={styles.buttonGroup}>
                    {FUNCTIES.map(f => (
                        <button key={f.key} onClick={() => toggleFunctie(f.key)} style={styles.pill(functies.includes(f.key))}>{f.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Antwoordvorm:" info="Aankruisen in een tabel of de functienaam zelf schrijven." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('answerMode', 'aankruisen')} style={styles.radioBtn(answerMode === 'aankruisen')}>Aankruisen</button>
                    <button onClick={() => set('answerMode', 'schrijven')} style={styles.radioBtn(answerMode === 'schrijven')}>Schrijven</button>
                </div>
            </div>
        </div>
    );
}
