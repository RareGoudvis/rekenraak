import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props {
    block: MathBlock;
}

const DIVISOR_OPTIONS = [2, 3, 4, 5, 6, 9, 10, 25, 50, 100];
const MAX_PRESETS = [100, 1000, 10000, 100000];

export default function DeelbaarheidConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const {
        layout = 'tabel',
        divisors = [2, 5, 10],
        maxGetal = 1000,
        base = 9,
        terms = 6,
        givenCount = 2,
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    const toggleDivisor = (d: number) => {
        const next = divisors.includes(d) ? divisors.filter((x: number) => x !== d) : [...divisors, d].sort((a, b) => a - b);
        if (next.length > 0) set('divisors', next);
    };

    return (
        <div style={styles.container}>
            {/* Layout is fixed by the sidebar leaf (Tabel / Veelvouden). */}
            {layout === 'tabel' ? (
                <>
                    <div style={styles.section}>
                        <SettingLabel text="Deelbaar door:" info="Welke delers in de oefening gecontroleerd worden." />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {DIVISOR_OPTIONS.map(d => (
                                <button key={d} onClick={() => toggleDivisor(d)} style={styles.radioBtn(divisors.includes(d))}>{d}</button>
                            ))}
                        </div>
                    </div>
                    <div style={styles.section}>
                        <SettingLabel text="Maximum getal:" info="Het grootste getal dat gecontroleerd wordt." />
                        <PopupSelect
                            clampToLowest
                            value={maxGetal}
                            options={MAX_PRESETS.map(val => ({ value: val, label: `Tot ${val.toLocaleString('nl-BE')}` }))}
                            onChange={(val) => set('maxGetal', val)}
                            ariaLabel="Maximum getal"
                        />
                    </div>
                </>
            ) : (
                <>
                    <div style={styles.section}>
                        <SettingLabel text={`Veelvouden van: ${base}`} info="Het getal waarvan de veelvouden gezocht worden." />
                        <input type="range" min="2" max="25" step="1" value={base}
                            onChange={(e) => set('base', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                    <div style={styles.section}>
                        <SettingLabel text={`Aantal getallen: ${terms}`} info="Hoeveel getallen in de reeks staan." />
                        <input type="range" min="4" max="12" step="1" value={terms}
                            onChange={(e) => set('terms', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                    <div style={styles.section}>
                        <SettingLabel text={`Reeds ingevuld: ${givenCount}`} info="Hoeveel getallen al voorgedrukt staan." />
                        <input type="range" min="1" max={Math.max(1, terms - 1)} step="1" value={givenCount}
                            onChange={(e) => set('givenCount', Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                    </div>
                </>
            )}
        </div>
    );
}
