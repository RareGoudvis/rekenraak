import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const GROOTHEDEN = [
    { key: 'lengte', label: 'Lengte' },
    { key: 'massa', label: 'Massa' },
    { key: 'inhoud', label: 'Inhoud' },
    { key: 'tijd', label: 'Tijd' },
    { key: 'temperatuur', label: 'Temperatuur' },
];

export default function MaateenheidConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const grootheden: string[] = c.grootheden ?? ['lengte', 'massa', 'inhoud'];
    const answerMode: string = c.answerMode ?? 'omcirkelen';
    const subType: string = c.subType ?? 'eenheid';

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleGrootheid = (k: string) => {
        const next = grootheden.includes(k) ? grootheden.filter(x => x !== k) : [...grootheden, k];
        if (next.length) set('grootheden', next);   // keep ≥1
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Grootheden:" info="Waarover de zinnen gaan. Temperatuur kan alleen bij 'Schrijven' (er is maar één eenheid)." />
                <div style={styles.buttonGroup}>
                    {GROOTHEDEN.map(g => (
                        <button key={g.key} onClick={() => toggleGrootheid(g.key)} style={styles.pill(grootheden.includes(g.key))}>{g.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Antwoordvorm:" info="Omcirkelen toont drie keuzes; schrijven laat de leerling de eenheid zelf invullen." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('answerMode', 'omcirkelen')} style={styles.radioBtn(answerMode === 'omcirkelen')}>Omcirkelen</button>
                    <button onClick={() => set('answerMode', 'schrijven')} style={styles.radioBtn(answerMode === 'schrijven')}>Schrijven</button>
                </div>
            </div>

            {answerMode === 'omcirkelen' && (
                <div style={styles.section}>
                    <SettingLabel text="Keuzes tonen als:" info="Alleen de eenheid (m / cm / km) of de volledige meting (2 m / 2 cm / 2 km)." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('subType', 'eenheid')} style={styles.radioBtn(subType === 'eenheid')}>Eenheid</button>
                        <button onClick={() => set('subType', 'schatten')} style={styles.radioBtn(subType === 'schatten')}>Volledige meting</button>
                    </div>
                </div>
            )}
        </div>
    );
}
