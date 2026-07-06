import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const NAT_PRESETS = [100, 1000, 10000, 100000];
const DEC_PRESETS = [10, 100, 1000];

export default function TienvoudConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const operators: string[] = c.operators ?? ['x', ':'];
    const factors: number[] = c.factors ?? [10, 100, 1000];
    const numberType: string = c.numberType ?? 'natural';
    const isDecimal = numberType === 'decimal';
    const maxGetal = c.maxGetal ?? 1000;
    const decimalPlaces = c.decimalPlaces ?? 2;
    const missingFactor: boolean = c.missingFactor ?? false;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleIn = (key: string, list: unknown[], v: unknown) => {
        const next = list.includes(v) ? list.filter(x => x !== v) : [...list, v];
        if (next.length) set(key, next);   // keep ≥1
    };

    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Bewerking:" info="Vermenigvuldigen en/of delen met een tienvoud." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => toggleIn('operators', operators, 'x')} style={styles.pill(operators.includes('x'))}>×</button>
                    <button onClick={() => toggleIn('operators', operators, ':')} style={styles.pill(operators.includes(':'))}>:</button>
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Tienvoud:" info="Met welke factoren gerekend wordt." />
                <div style={styles.buttonGroup}>
                    {[10, 100, 1000].map(f => (
                        <button key={f} onClick={() => toggleIn('factors', factors, f)} style={styles.pill(factors.includes(f))}>{f.toLocaleString('nl-BE')}</button>
                    ))}
                </div>
            </div>

            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste uitgangsgetal." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={(isDecimal ? DEC_PRESETS : NAT_PRESETS).map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum getal"
                />
            </div>

            {isDecimal && (
                <div style={styles.section}>
                    <SettingLabel text="Cijfers na de komma:" info="Aantal decimalen van het uitgangsgetal." />
                    <PopupSelect
                        value={decimalPlaces}
                        options={[1, 2, 3].map(v => ({ value: v, label: String(v) }))}
                        onChange={(v) => set('decimalPlaces', v)}
                        ariaLabel="Cijfers na de komma"
                    />
                </div>
            )}

            <div style={styles.onOffRow}>
                <SettingLabel text="Ontbrekende factor" info="Bij de helft van de oefeningen wordt de factor gevraagd in plaats van het resultaat (34 × ___ = 3 400)." />
                <button onClick={() => set('missingFactor', !missingFactor)} style={styles.onOffBtn(missingFactor)}>{missingFactor ? 'Aan' : 'Uit'}</button>
            </div>
        </div>
    );
}
