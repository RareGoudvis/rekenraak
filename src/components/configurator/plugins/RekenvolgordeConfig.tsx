import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const OPS = [
    { key: '+', label: '+' }, { key: '-', label: '−' }, { key: 'x', label: '×' }, { key: ':', label: ':' },
];

export default function RekenvolgordeConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const operators: string[] = c.operators ?? ['+', '-', 'x'];
    const haakjes: boolean = c.haakjes ?? true;
    const opsCount: number = c.opsCount ?? 2;
    const maxGetal = c.maxGetal ?? 100;
    const scaffold: boolean = c.scaffold ?? false;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleOp = (op: string) => {
        const next = operators.includes(op) ? operators.filter(x => x !== op) : [...operators, op];
        // Need ≥1 op AND at least one ×/: to make volgorde meaningful.
        if (next.length && next.some(o => o === 'x' || o === ':')) set('operators', next);
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Bewerkingen:" info="Minstens één × of : blijft altijd aan, anders is er geen rekenvolgorde te oefenen." />
                <div style={styles.buttonGroup}>
                    {OPS.map(op => (
                        <button key={op.key} onClick={() => toggleOp(op.key)} style={styles.pill(operators.includes(op.key))}>{op.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Aantal bewerkingen:" info="Twee bewerkingen (drie getallen) of drie bewerkingen (vier getallen)." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('opsCount', 2)} style={styles.radioBtn(opsCount === 2)}>2</button>
                    <button onClick={() => set('opsCount', 3)} style={styles.radioBtn(opsCount === 3)}>3</button>
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Maximum uitkomst:" info="Antwoorden blijven onder dit getal." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={[100, 1000].map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum uitkomst"
                />
            </div>

            <div style={styles.onOffRow}>
                <SettingLabel text="Haakjes" info="Bij de helft van de oefeningen staan haakjes die de volgorde veranderen." />
                <button onClick={() => set('haakjes', !haakjes)} style={styles.onOffBtn(haakjes)}>{haakjes ? 'Aan' : 'Uit'}</button>
            </div>

            <div style={styles.onOffRow}>
                <SettingLabel text="Hulplijn 'eerst:'" info="Toont onder elke oefening een lijntje voor de eerste tussenstap." />
                <button onClick={() => set('scaffold', !scaffold)} style={styles.onOffBtn(scaffold)}>{scaffold ? 'Aan' : 'Uit'}</button>
            </div>
        </div>
    );
}
