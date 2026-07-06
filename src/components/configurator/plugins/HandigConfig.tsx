import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

export default function HandigConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const subType: string = c.subType ?? 'compenseren';
    const operators: string[] = c.operators ?? ['+'];
    const maxGetal = c.maxGetal ?? 100;
    const distance: number = c.distance ?? 1;
    const scaffolding: string = c.scaffolding ?? 'tussenstap';

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleOp = (op: string) => {
        const next = operators.includes(op) ? operators.filter(x => x !== op) : [...operators, op];
        if (next.length) set('operators', next);   // keep ≥1
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Bewerking:" info="Optellen en/of aftrekken met de handige strategie." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => toggleOp('+')} style={styles.pill(operators.includes('+'))}>+</button>
                    <button onClick={() => toggleOp('-')} style={styles.pill(operators.includes('-'))}>−</button>
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste getal in de oefening." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={[100, 1000].map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum getal"
                />
            </div>

            {subType === 'compenseren' && (
                <div style={styles.section}>
                    <SettingLabel text="Afstand tot het tienvoud:" info="Hoe ver het tweede getal onder het tienvoud ligt (29 = afstand 1, 28 = afstand 2)." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('distance', 1)} style={styles.radioBtn(distance === 1)}>1</button>
                        <button onClick={() => set('distance', 2)} style={styles.radioBtn(distance === 2)}>1 – 2</button>
                    </div>
                </div>
            )}

            <div style={styles.section}>
                <SettingLabel text="Ondersteuning:" info="Tussenstap toont de invulvakjes; voorbeeld werkt de eerste oefening voor." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('scaffolding', 'tussenstap')} style={styles.radioBtn(scaffolding === 'tussenstap')}>Tussenstap invullen</button>
                    <button onClick={() => set('scaffolding', 'voorbeeld')} style={styles.radioBtn(scaffolding === 'voorbeeld')}>Met voorbeeld</button>
                    <button onClick={() => set('scaffolding', 'enkel-antwoord')} style={styles.radioBtn(scaffolding === 'enkel-antwoord')}>Enkel antwoord</button>
                </div>
            </div>
        </div>
    );
}
