import { useConstraints } from '../../useConstraints';
import { useHiddenControls } from '../../ConstraintScope';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';
import PopupSelect from '../../../ui/PopupSelect';
import { useMaxPresets } from '../../useMaxPresets';
import SettingLabel from '../SettingLabel';
import type { MulDivConstraints } from '../../../../services/math/constraintTypes';

interface Props { block: MathBlock; isDivision?: boolean; }

export default function DecimalSettings({ block, isDivision = false }: Props) {
    // Standaardwaarden instellen (voor de zekerheid)
    const [c, patch] = useConstraints<MulDivConstraints>(block);
    // Shared keys (maxGetal) are rendered by the gemengd panel instead; empty outside it.
    const hidden = useHiddenControls();
    const range = useMaxPresets(block);
    const { maxGetal = 100, decimalPlaces = 2, operand1Mask = {}, operand2Mask = {}, decimalTimesDecimal = false } = c;
    // × by default keeps factor 2 whole (minimumdoelen 2.2): its mask offers no places behind the comma.
    const factor2Whole = !isDivision && !decimalTimesDecimal;

    // Stuur decimalPlaces mee, zodat de maskers dynamisch inkrimpen!
    const availablePlaces = getMaskPlaces(maxGetal, 'decimal', decimalPlaces);
    const factor2Places = factor2Whole ? availablePlaces.filter(p => p.weight >= 1) : availablePlaces;

    const updateConstraint = (key: string, value: unknown) => {
        patch({ [key]: value } as Partial<MulDivConstraints>);
    };

    const handleMaskToggle = (operand: 1 | 2, place: string) => {
        const key = operand === 1 ? 'operand1Mask' : 'operand2Mask';
        const currentMask = c[key] ?? {};
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
            {range && !hidden.has('maxGetal') && <div style={styles.section}>
                <SettingLabel text="Maximum uitkomst:" info="Het grootste antwoord dat mag voorkomen." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={range.presets.map(val => ({ value: val, label: `Tot ${val}` }))}
                    onChange={(val) => updateConstraint('maxGetal', val)}
                    ariaLabel="Maximum uitkomst"
                />
            </div>}

            {/* KOMMAGETAL × KOMMAGETAL — off: a kommagetal times a natural number (3 × 0,4) */}
            {!isDivision && <div style={styles.section}>
                <div style={styles.onOffRow}>
                    <span style={styles.onOffLabel}>Kommagetal × kommagetal</span>
                    <button onClick={() => updateConstraint('decimalTimesDecimal', !decimalTimesDecimal)} style={styles.onOffBtn(decimalTimesDecimal)}
                        aria-pressed={decimalTimesDecimal} title="Uit: een kommagetal maal een natuurlijk getal (3 × 0,4).">
                        {decimalTimesDecimal ? 'AAN' : 'UIT'}
                    </button>
                </div>
            </div>}

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
                        {factor2Places.map(place => (
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
