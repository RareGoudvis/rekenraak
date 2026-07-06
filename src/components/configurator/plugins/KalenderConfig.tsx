import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { MONTH_NAMES } from '../../../services/kalender/kalenderGenerator';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const QUESTION_TYPES = [
    { key: 'dag-van-datum', label: 'Dag bij datum' },
    { key: 'datum-van-dag', label: 'Datum bij dag' },
    { key: 'tellen', label: 'Dagen tellen' },
];

export default function KalenderConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const subType: string = c.subType ?? 'maandrooster';
    const questionTypes: string[] = c.questionTypes ?? ['dag-van-datum', 'datum-van-dag', 'tellen'];
    const questionCount: number = c.questionCount ?? 5;
    const month: string | number = c.month ?? 'random';

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleQ = (k: string) => {
        const next = questionTypes.includes(k) ? questionTypes.filter(x => x !== k) : [...questionTypes, k];
        if (next.length) set('questionTypes', next);   // keep ≥1
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Maand:" info="Vast of elke keer een andere maand." />
                <PopupSelect
                    value={month}
                    options={[
                        { value: 'random', label: 'Willekeurig' },
                        ...MONTH_NAMES.map((m, i) => ({ value: i, label: m })),
                    ]}
                    onChange={(v) => set('month', v)}
                    ariaLabel="Maand"
                />
            </div>

            {subType === 'maandrooster' && (
                <>
                    <div style={styles.section}>
                        <SettingLabel text="Vraagtypes:" info="Welke soorten vragen onder het rooster staan." />
                        <div style={styles.buttonGroup}>
                            {QUESTION_TYPES.map(q => (
                                <button key={q.key} onClick={() => toggleQ(q.key)} style={styles.pill(questionTypes.includes(q.key))}>{q.label}</button>
                            ))}
                        </div>
                    </div>
                    <div style={styles.section}>
                        <label style={styles.label}>Aantal vragen per rooster: {questionCount}</label>
                        <input type="range" min="3" max="8" step="1" value={questionCount}
                            onChange={(e) => set('questionCount', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                        <p style={styles.hint}>"Aantal oefeningen" bepaalt hoeveel roosters je krijgt.</p>
                    </div>
                </>
            )}
        </div>
    );
}
