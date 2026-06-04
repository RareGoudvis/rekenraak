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

    // Haal de juiste arrays op (Zijn al gesorteerd Groot -> Klein!)
    const maskPlaces = getMaskPlaces(maxGetal, 'natural');
    const bridgePlaces = getBridgePlaces(maxGetal, 'natural');
    const maxPresets = [10, 20, 100, 1000, 10000, 100000, 1000000];

    const toggleMask = (operand: 'operand1Mask' | 'operand2Mask', posKey: string) => {
        const currentMask = block.constraints[operand] || {};
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [operand]: { ...currentMask, [posKey]: !currentMask[posKey] } } });
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
                {(['operand1Mask', 'operand2Mask'] as const).map((op, idx) => (
                    <div key={op} style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
                        <span style={{ fontSize: 'var(--text-xs)', width: '50px' }}>Getal {idx + 1}:</span>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {maskPlaces.map(p => (
                                <button key={p.key} onClick={() => toggleMask(op, p.key)} style={styles.maskBtn(block.constraints[op]?.[p.key])}>{p.key}</button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

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