import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import { presetLabel } from '../../../config/numberRanges';
import { useMaxPresets } from '../useMaxPresets';
import SettingLabel from './SettingLabel';
import type { PlaatswaardeConstraints } from '../../../services/math/constraintTypes';

interface Props { block: MathBlock; }

export default function PlaatswaardeConfig({ block }: Props) {
    const [c, patch] = useConstraints<PlaatswaardeConstraints>(block);
    const range = useMaxPresets(block);
    const { maxGetal = 1000, numberMask = {}, decimalPlaces = 0 } = c;

    const set = (key: string, value: unknown) =>
        patch({ [key]: value } as Partial<PlaatswaardeConstraints>);

    const toggleMask = (k: string) => set('numberMask', { ...numberMask, [k]: !numberMask[k] });
    const places = getMaskPlaces(maxGetal, decimalPlaces > 0 ? 'decimal' : 'natural', decimalPlaces);

    // subType (view) is chosen by the sidebar leaf — not repeated here; plaats / omcirkelen pick how
    // the pupil answers (in the digits' order the place is only counted along, owner 2026-10-10).
    const asksPlace = c.subType === 'plaats' || c.subType === 'omcirkelen';
    return (
        <div style={styles.container}>
            {asksPlace && <div style={styles.section}>
                <SettingLabel text="Antwoord:" info="Plaats: de leerling noemt de plaats van het onderstreepte cijfer (H, T, E op volgorde of door elkaar). Waarde: de leerling schrijft wat het cijfer waard is (128 → 20)." />
                <PopupSelect
                    value={c.plaatsAnswer ?? 'plaats'}
                    options={[
                        { value: 'plaats', label: 'Plaats (op volgorde)' },
                        { value: 'plaats-shuffle', label: 'Plaats (door elkaar)' },
                        { value: 'waarde', label: 'Waarde van het cijfer' },
                    ]}
                    onChange={(v) => set('plaatsAnswer', v)}
                    ariaLabel="Antwoord"
                />
            </div>}

            {range && <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste getal dat in de oefeningen mag voorkomen." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={range.presets.map(v => ({ value: v, label: presetLabel(v) }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum getal"
                />
            </div>}

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
                        <button key={p.key} onClick={() => toggleMask(p.key)} aria-pressed={!!numberMask[p.key]} style={styles.maskBtn(!!numberMask[p.key])} title={p.label}>{p.key}</button>
                    ))}
                </div>
                <p style={styles.hint}>Leeg = vrije opbouw.</p>
            </div>
        </div>
    );
}
