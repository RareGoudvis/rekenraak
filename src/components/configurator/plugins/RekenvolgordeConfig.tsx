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
    const haakjesMode: string = c.haakjesMode ?? 'MAG';
    const opsCount: number = c.opsCount ?? 2;
    const maxGetal = c.maxGetal ?? 100;

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
                <SettingLabel text="Aantal bewerkingen:" info="Bij 3–4 bewerkingen zit er altijd een handig paar in (150 + 50, 750 − 250, 4 × 25)." />
                <div style={styles.buttonGroup}>
                    {[2, 3, 4].map(n => (
                        <button key={n} onClick={() => set('opsCount', n)} style={styles.radioBtn(opsCount === n)}>{n}</button>
                    ))}
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

            <div style={styles.section}>
                <SettingLabel text="Haakjes:" info="Geen = nooit haakjes · Mag = bij ongeveer de helft · Moet = bij elke oefening. Haakjes veranderen altijd echt de uitkomst." />
                <div style={styles.buttonGroup}>
                    {(['GEEN', 'MAG', 'MOET'] as const).map(m => (
                        <button key={m} onClick={() => set('haakjesMode', m)} style={styles.bridgeBtn(haakjesMode === m)}>{m}</button>
                    ))}
                </div>
            </div>
        </div>
    );
}
