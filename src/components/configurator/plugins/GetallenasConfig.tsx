import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import { formatSignedInt } from '../../../services/math/formatters';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import { presetLabel } from '../../../config/numberRanges';
import { useMaxPresets } from '../useMaxPresets';
import SettingLabel from './SettingLabel';
import BreukenSettings from './shared/BreukenSettings';
import type { GetallenasConstraints } from '../../../services/math/constraintTypes';
import JumpPicker from './shared/JumpPicker';
import { chosenJumps, useSetJumps } from './shared/jumpSelection';

interface Props {
    block: MathBlock;
}

const STEP_PRESETS = [1, 2, 5, 10, 25, 50, 100];
const DECIMAL_STEPS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.5, 1];
const FRACTION_STEPS = [2, 3, 4, 5, 8, 10];   // denominator d → step 1/d

export default function GetallenasConfig({ block }: Props) {
    const [c, patch] = useConstraints<GetallenasConstraints>(block);
    const range = useMaxPresets(block);
    const {
        maxGetal = 100,
        direction = 'right',
        hardMode = false,
        ticks = 6,
        numberType = 'natural',
        fractionStep = 4,
        minGetal,
        allowMixed = true,
        gelijknamig = false,
    } = c;

    const set = (key: string, value: unknown) =>
        patch({ [key]: value } as Partial<GetallenasConstraints>);

    const isRational = numberType === 'rational';
    const isDecimal = numberType === 'decimal';
    const lowerBound = minGetal ?? -maxGetal;

    const chosen = chosenJumps(c);
    const setJumps = useSetJumps(block);

    return (
        <div style={styles.container}>
            {/* DIRECTION */}
            <div style={styles.section}>
                <SettingLabel text="Richting van de pijl:" info="Loopt de getallenas stijgend, dalend of beide." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('direction', 'right')} aria-pressed={direction === 'right'} style={styles.radioBtn(direction === 'right')}>→ Stijgend</button>
                    <button onClick={() => set('direction', 'left')} aria-pressed={direction === 'left'} style={styles.radioBtn(direction === 'left')}>← Dalend</button>
                    <button onClick={() => set('direction', 'beide')} aria-pressed={direction === 'beide'} style={styles.radioBtn(direction === 'beide')}>Beide</button>
                </div>
            </div>

            {/* HARD MODE */}
            <div style={styles.section}>
                <SettingLabel text="Moeilijkheid:" info="Hoe vaak een streepje leeg is: bij Minder lege vakjes ongeveer 4 op de 10, bij Meer lege vakjes ongeveer 6 op de 10. Het eerste streepje blijft altijd ingevuld, er blijven minstens twee ingevuld en minstens één is leeg." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('hardMode', false)} aria-pressed={!hardMode} style={styles.radioBtn(!hardMode)}>Minder lege vakjes</button>
                    <button onClick={() => set('hardMode', true)} aria-pressed={!!hardMode} style={styles.radioBtn(hardMode)}>Meer lege vakjes</button>
                </div>
            </div>

            {/* STEP — natural / decimal; a rational step is the Breuken block's noemer */}
            {!isRational && <div style={styles.section}>
                <SettingLabel text="Sprong:" info="De afstand tussen twee streepjes op de as. Kies je er meer dan één, dan krijgt elke getallenas om beurt een andere sprong." />
                <JumpPicker chosen={chosen} presets={isDecimal ? DECIMAL_STEPS : STEP_PRESETS} onChange={setJumps} withCustom={isDecimal} customPlaceholder="bv. 0,005" />
            </div>}

            {/* RATIONALE GETALLEN — the shared Breuken block: the sprong is the noemer, the rest is notation */}
            {isRational && (
                <div style={styles.section}>
                    <BreukenSettings
                        noemer={{ shape: 'step', value: fractionStep, options: FRACTION_STEPS, onChange: (d) => set('fractionStep', d) }}
                        notation={[
                            { label: 'Schrijf als gemengd getal (1 1/4 i.p.v. 5/4)', on: !!allowMixed, onChange: (v) => set('allowMixed', v) },
                            { label: 'Niet vereenvoudigen (2/4 blijft 2/4)', on: !!gelijknamig, onChange: (v) => set('gelijknamig', v) },
                        ]}
                    />
                </div>
            )}

            {/* MAX — not for rationals (range driven by step + ticks) */}
            {range && (
                <div style={styles.section}>
                    <SettingLabel text="Maximum getal:" info="Het grootste getal op de getallenas." />
                    <PopupSelect
                        clampToLowest
                        value={maxGetal}
                        options={range.presets.map(val => ({ value: val, label: presetLabel(val) }))}
                        onChange={(val) => set('maxGetal', val)}
                        ariaLabel="Maximum getal"
                    />
                </div>
            )}

            {/* GEHELE GETALLEN — lower bound */}
            {numberType === 'geheel' && (
                <div style={styles.section}>
                    <SettingLabel text={`Ondergrens: ${formatSignedInt(lowerBound)}`} info="Het kleinste (negatieve) getal op de as." />
                    <input
                        type="range" min={-maxGetal} max={0} step={Math.max(1, Math.round(maxGetal / 100))}
                        value={lowerBound}
                        onChange={(e) => set('minGetal', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                    />
                    {lowerBound < -maxGetal && (
                        <p style={styles.hint}>{`Ondergrens valt buiten het bereik (${formatSignedInt(-maxGetal)} tot ${formatSignedInt(maxGetal)}). Pas ze aan; nieuwe oefeningen gebruiken anders nog de oude grens.`}</p>
                    )}
                </div>
            )}

            {/* TICKS */}
            <div style={styles.section}>
                <SettingLabel text={`Aantal streepjes: ${ticks}`} info="Hoeveel streepjes de getallenas toont." />
                <input type="range" min="4" max="10" step="1" value={ticks}
                    onChange={(e) => set('ticks', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            </div>
        </div>
    );
}
