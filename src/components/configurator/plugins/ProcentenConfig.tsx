import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';
import type { ProcentenConstraints } from '../../../services/math/constraintTypes';

interface Props { block: MathBlock; }

const PERCENTS = [1, 5, 10, 20, 25, 50, 75, 100];

export default function ProcentenConfig({ block }: Props) {
    const [c, patch] = useConstraints<ProcentenConstraints>(block);
    const subType: string = c.subType ?? 'nemen';
    const percents: number[] = c.percents ?? [10, 25, 50];
    const maxGetal = c.maxGetal ?? 1000;
    const scaffold: boolean = c.scaffold ?? false;

    const set = (key: keyof ProcentenConstraints, value: unknown) => patch({ [key]: value } as Partial<ProcentenConstraints>);
    const togglePercent = (p: number) => {
        const next = percents.includes(p) ? percents.filter(x => x !== p) : [...percents, p];
        if (next.length) set('percents', next);   // keep ≥1
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Percenten:" info="Welke percenten in de oefeningen voorkomen." />
                <div style={styles.buttonGroup}>
                    {PERCENTS.map(p => (
                        <button key={p} onClick={() => togglePercent(p)} style={styles.pill(percents.includes(p))}>{p} %</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste basisgetal. Antwoorden zijn altijd natuurlijke getallen." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={[100, 1000, 10000].map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum getal"
                />
            </div>

            {subType === 'nemen' && (
                <div style={styles.onOffRow}>
                    <SettingLabel text="Tussenstap 10 % / 1 %" info="Toont een hulplijn die eerst 10 % (of 1 %) laat berekenen." />
                    <button onClick={() => set('scaffold', !scaffold)} style={styles.onOffBtn(scaffold)}>{scaffold ? 'Aan' : 'Uit'}</button>
                </div>
            )}
        </div>
    );
}
