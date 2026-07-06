import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import { getMaskPlaces, getBridgePlaces } from '../../../../services/math/mathEngine';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import SettingLabel from '../SettingLabel';
import PopupSelect from '../../../ui/PopupSelect';
import BridgeControl from '../../BridgeControl';

interface Props { block: MathBlock; }

export default function NaturalSettings({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const { maxGetal = 1000, bridges = {} } = block.constraints;
    const termCount: number = Math.min(4, Math.max(2, block.constraints.termCount ?? 2));
    const operandMax: (number | null)[] = block.constraints.operandMax ?? [];

    // Haal de juiste arrays op (Zijn al gesorteerd Groot -> Klein!)
    const maskPlaces = getMaskPlaces(maxGetal, 'natural');
    const bridgePlaces = getBridgePlaces(maxGetal, 'natural');
    const maxPresets = [10, 20, 100, 1000, 10000, 100000, 1000000];

    // Term i mask: legacy operand1/2Mask for 0/1, operandMasks[] beyond (SYNC: maskFor in mathEngine).
    const maskAt = (i: number): Record<string, boolean> =>
        block.constraints.operandMasks?.[i] ?? (i === 0 ? block.constraints.operand1Mask : i === 1 ? block.constraints.operand2Mask : undefined) ?? {};
    const toggleMaskAt = (i: number, posKey: string) => {
        const next = { ...maskAt(i), [posKey]: !maskAt(i)[posKey] };
        if (i <= 1) {
            const key = i === 0 ? 'operand1Mask' : 'operand2Mask';
            updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: next } });
        } else {
            const masks = [...(block.constraints.operandMasks ?? [])];
            masks[i] = next;
            updateBlockSettings(block.id, { constraints: { ...block.constraints, operandMasks: masks } });
        }
    };
    const setOperandMax = (i: number, raw: string) => {
        const v = raw === '' ? null : Math.max(1, Number(raw.replace(/\D/g, '')) || 1);
        const next = [...operandMax];
        next[i] = v;
        updateBlockSettings(block.id, { constraints: { ...block.constraints, operandMax: next } });
    };

    return (
        <div>
            <div style={styles.section}>
                <SettingLabel text="Maximum uitkomst:" info="Het grootste antwoord dat in de oefeningen mag voorkomen." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={maxPresets.map(val => ({ value: val, label: `Tot ${val.toLocaleString('nl-BE')}` }))}
                    onChange={(val) => updateBlockSettings(block.id, { constraints: { ...block.constraints, maxGetal: val } })}
                    ariaLabel="Maximum uitkomst"
                />
            </div>

            <div style={styles.section}>
                <SettingLabel text="Specifieke getalopbouw" info="Kies welke posities (D/H/T/E) een cijfer mogen bevatten. Leeg = vrij." />
                {Array.from({ length: termCount }, (_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', width: '50px' }}>Getal {i + 1}:</span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {maskPlaces.map(p => (
                                <button key={p.key} onClick={() => toggleMaskAt(i, p.key)} style={styles.maskBtn(!!maskAt(i)[p.key])}>{p.key}</button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <details>
                <summary style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 'var(--sp-2)' }}>Geavanceerde opties</summary>
                <div style={styles.section}>
                    <SettingLabel text="Maximum per getal" info="Bovengrens per afzonderlijk getal; leeg = vrij binnen de maximum uitkomst." />
                    {Array.from({ length: termCount }, (_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--sp-2)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', width: '50px' }}>Getal {i + 1}:</span>
                            <input type="text" inputMode="numeric" value={operandMax[i] ?? ''} placeholder="vrij"
                                onChange={(e) => setOperandMax(i, e.target.value)} style={{ ...styles.numInput, width: '90px' }} />
                        </div>
                    ))}
                </div>
            </details>

            <hr style={styles.divider} />

            <div>
                <SettingLabel text="Bruginstellingen" info="Bepaal per positie of er een brug (overdracht) mag, moet of niet mag." />
                <BridgeControl
                    places={bridgePlaces}
                    bridges={bridges}
                    onChange={(key, val) => updateBlockSettings(block.id, { constraints: { ...block.constraints, bridges: { ...bridges, [key]: val } } })}
                />
            </div>
        </div>
    );
}