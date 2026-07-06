import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { targetsFor } from '../../../services/afronden/afrondenGenerator';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const NAT_PRESETS = [100, 1000, 10000, 100000];
const DEC_PRESETS = [10, 100, 1000];
const OPS: { key: string; label: string }[] = [
    { key: '+', label: '+' }, { key: '-', label: '−' }, { key: 'x', label: '×' }, { key: ':', label: ':' },
];

export default function SchattendConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const operators: string[] = c.operators ?? ['+', '-'];
    const numberType: string = c.numberType ?? 'natural';
    const isDecimal = numberType === 'decimal';
    const maxGetal = c.maxGetal ?? (isDecimal ? 100 : 1000);
    const roundTargets: string[] = c.roundTargets ?? (isDecimal ? ['E'] : ['H']);
    const scaffolding: string = c.scaffolding ?? 'tussenstappen';

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleIn = (key: string, list: unknown[], v: unknown) => {
        const next = list.includes(v) ? list.filter(x => x !== v) : [...list, v];
        if (next.length) set(key, next);   // keep ≥1
    };
    const usableTargets = targetsFor(numberType).filter(t => isDecimal || t.weight < maxGetal);

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Bewerkingen:" info="Welke bewerkingen geschat worden. Bij × en : blijft één factor klein." />
                <div style={styles.buttonGroup}>
                    {OPS.map(op => (
                        <button key={op.key} onClick={() => toggleIn('operators', operators, op.key)} style={styles.pill(operators.includes(op.key))}>{op.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste getal in de oefening." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={(isDecimal ? DEC_PRESETS : NAT_PRESETS).map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum getal"
                />
            </div>

            <div style={styles.section}>
                <SettingLabel text="Afronden op:" info="Op welke positie de getallen eerst afgerond worden." />
                <div style={styles.buttonGroup}>
                    {usableTargets.map(t => (
                        <button key={t.key} onClick={() => toggleIn('roundTargets', roundTargets, t.key)} style={styles.pill(roundTargets.includes(t.key))}>op {t.label}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Ondersteuning:" info="Met tussenstappen schrijft de leerling eerst de afgeronde getallen op." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('scaffolding', 'tussenstappen')} style={styles.radioBtn(scaffolding === 'tussenstappen')}>Met tussenstappen</button>
                    <button onClick={() => set('scaffolding', 'enkel-schatting')} style={styles.radioBtn(scaffolding === 'enkel-schatting')}>Enkel schatting</button>
                </div>
            </div>
        </div>
    );
}
