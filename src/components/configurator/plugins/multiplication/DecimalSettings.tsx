import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';
import PopupSelect from '../../../ui/PopupSelect';
import SettingLabel from '../SettingLabel';

interface Props { block: MathBlock; isDivision?: boolean; }

export default function DecimalSettings({ block, isDivision = false }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    // Standaardwaarden instellen (voor de zekerheid)
    const { maxGetal = 100, decimalPlaces = 2, operand1Mask = {}, operand2Mask = {} } = block.constraints;

    // Stuur decimalPlaces mee, zodat de maskers dynamisch inkrimpen!
    const availablePlaces = getMaskPlaces(maxGetal, 'decimal', decimalPlaces);

    const updateConstraint = (key: string, value: unknown) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    };

    const handleMaskToggle = (operand: 1 | 2, place: string) => {
        const key = operand === 1 ? 'operand1Mask' : 'operand2Mask';
        const currentMask = block.constraints[key] || {};
        updateConstraint(key, { ...currentMask, [place]: !currentMask[place] });
    };

    return (
        <div>
            {/* AANTAL DECIMALEN */}
            <div style={styles.section}>
                <SettingLabel text="Aantal cijfers na de komma (precisie):" info="Aantal decimalen achter de komma." />
                <PopupSelect
                    value={decimalPlaces}
                    options={[1, 2, 3].map(val => ({ value: val, label: String(val) }))}
                    onChange={(val) => updateConstraint('decimalPlaces', val)}
                    ariaLabel="Aantal cijfers na de komma (precisie)"
                />
            </div>

            {/* MAXIMUM UITKOMST */}
            <div style={styles.section}>
                <SettingLabel text="Maximum uitkomst:" info="Het grootste antwoord dat mag voorkomen." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={[10, 100, 1000].map(val => ({ value: val, label: `Tot ${val}` }))}
                    onChange={(val) => updateConstraint('maxGetal', val)}
                    ariaLabel="Maximum uitkomst"
                />
            </div>

            {/* SPECIFIEKE GETALOPBOUW */}
            <div style={styles.section}>
                <SettingLabel text="Specifieke getalopbouw" info="Kies welke posities een cijfer mogen bevatten. Leeg = vrij." />

                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '56px', flexShrink: 0 }}>{isDivision ? 'Deeltal:' : 'Factor 1:'}</span>
                    {/* flexWrap: 'wrap' zorgt dat lange rijen maskers netjes op een nieuwe lijn komen */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {availablePlaces.map(place => (
                            <button key={`op1-${place.key}`} onClick={() => handleMaskToggle(1, place.key)} style={styles.maskBtn(operand1Mask[place.key])} title={place.label}>
                                {place.key}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '56px', flexShrink: 0 }}>{isDivision ? 'Deler:' : 'Factor 2:'}</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {availablePlaces.map(place => (
                            <button key={`op2-${place.key}`} onClick={() => handleMaskToggle(2, place.key)} style={styles.maskBtn(operand2Mask[place.key])} title={place.label}>
                                {place.key}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
