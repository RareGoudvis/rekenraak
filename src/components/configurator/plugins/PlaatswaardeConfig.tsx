import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props { block: MathBlock; }

const MAX_PRESETS = [100, 1000, 10000, 100000, 1000000];

export default function PlaatswaardeConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { maxGetal = 1000, numberMask = {}, decimalPlaces = 0 } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    const toggleMask = (k: string) => set('numberMask', { ...numberMask, [k]: !numberMask[k] });
    const places = getMaskPlaces(maxGetal, decimalPlaces > 0 ? 'decimal' : 'natural', decimalPlaces);

    // subType (view) is chosen by the sidebar leaf — not repeated here.
    return (
        <div style={styles.container}>
            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste getal dat in de oefeningen mag voorkomen." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={MAX_PRESETS.map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum getal"
                />
            </div>

            <div style={styles.section}>
                <SettingLabel text="Decimalen:" info="Aantal decimalen achter de komma." />
                <PopupSelect
                    value={decimalPlaces}
                    options={[0, 1, 2, 3].map(v => ({ value: v, label: v === 0 ? 'Geen' : String(v) }))}
                    onChange={(v) => set('decimalPlaces', v)}
                    ariaLabel="Decimalen"
                />
            </div>

            <div style={styles.section}>
                <SettingLabel text="Specifieke getalopbouw:" info="Kies welke posities een cijfer mogen bevatten. Leeg = vrij." />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {places.map(p => (
                        <button key={p.key} onClick={() => toggleMask(p.key)} style={styles.maskBtn(!!numberMask[p.key])} title={p.label}>{p.key}</button>
                    ))}
                </div>
                <p style={styles.hint}>Leeg = vrije opbouw.</p>
            </div>
        </div>
    );
}
