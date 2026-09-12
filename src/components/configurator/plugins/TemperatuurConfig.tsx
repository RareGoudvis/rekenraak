import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import type { TemperatuurConstraints } from '../../../services/math/constraintTypes';

interface Props {
    block: MathBlock;
}

export default function TemperatuurConfig({ block }: Props) {
    const [c, patch] = useConstraints<TemperatuurConstraints>(block);
    const {
        variant = 'kleuren',
        includeNegatives = false,
        perRow = 4,
        mode1 = 'gekleurd',
        mode2 = 'getal',
    } = c;

    const set = (key: string, value: unknown) =>
        patch({ [key]: value } as Partial<TemperatuurConstraints>);

    const MODES = [
        { val: 'gekleurd', label: 'Gekleurd' },
        { val: 'getal', label: 'Getal' },
        { val: 'beide', label: 'Beide' },
    ];

    return (
        <div style={styles.container}>
            {/* Variant comes from the sidebar leaf (Meter kleuren / aflezen / verschil). */}

            {/* VERSCHIL — what's given on each thermometer */}
            {variant === 'verschil' && ([
                { key: 'mode1', label: 'Thermometer 1', value: mode1 },
                { key: 'mode2', label: 'Thermometer 2', value: mode2 },
            ]).map(t => (
                <div key={t.key} style={styles.section}>
                    <SettingLabel text={`${t.label}:`} info="Wat er op deze thermometer gegeven is (kleur, getal of beide)." />
                    <div style={styles.buttonGroup}>
                        {MODES.map(m => (
                            <button key={m.val} onClick={() => set(t.key, m.val)} style={styles.radioBtn(t.value === m.val)}>{m.label}</button>
                        ))}
                    </div>
                </div>
            ))}

            {/* NEGATIVES */}
            <div style={styles.section}>
                <SettingLabel text="Negatieve temperaturen:" info="Of er ook temperaturen onder nul mogen voorkomen." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('includeNegatives', false)} style={styles.radioBtn(!includeNegatives)}>Nee (0…25°)</button>
                    <button onClick={() => set('includeNegatives', true)} style={styles.radioBtn(includeNegatives)}>Ja (−15…25°)</button>
                </div>
            </div>

            {/* PER ROW — hidden for verschil (the viewer renders verschil in a fixed 2 columns) */}
            {variant !== 'verschil' && (
                <div style={styles.section}>
                    <SettingLabel text={`Per rij: ${perRow}`} info="Hoeveel thermometers er naast elkaar staan." />
                    <input type="range" min="2" max="4" step="1" value={perRow}
                        onChange={(e) => set('perRow', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                </div>
            )}
        </div>
    );
}
