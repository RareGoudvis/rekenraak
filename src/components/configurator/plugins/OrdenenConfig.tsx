import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { formatSignedInt } from '../../../services/math/formatters';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import { presetLabel } from '../../../config/numberRanges';
import { useMaxPresets } from '../useMaxPresets';
import SettingLabel from './SettingLabel';
import BreukenSettings from './shared/BreukenSettings';
import { ordenenMixedMode } from '../../../services/ordenen/ordenenGenerator';
import type { OrdenenConstraints } from '../../../services/math/constraintTypes';

interface Props {
    block: MathBlock;
}

const OPERATORS = [
    { val: 'oplopend', label: 'Oplopend (<)' },
    { val: 'aflopend', label: 'Aflopend (>)' },
    { val: 'beide', label: 'Beide' },
];

export default function OrdenenConfig({ block }: Props) {
    const [c, patch] = useConstraints<OrdenenConstraints>(block);
    const range = useMaxPresets(block);
    const {
        count = 3,
        operatorMode = 'oplopend',
        maxGetal = 100,
        numberType = 'natural',
        numberMask = {},
        decimalPlaces = 1,
        minGetal,
        minDenominator = 2,
        maxDenominator = 10,
        unitFractionsOnly = false,
    } = c;
    const mixedMode = ordenenMixedMode(c);

    const set = (key: string, value: unknown) =>
        patch({ [key]: value } as Partial<OrdenenConstraints>);

    const maskPlaces = getMaskPlaces(maxGetal, numberType === 'decimal' ? 'decimal' : 'natural', numberType === 'decimal' ? decimalPlaces : 0);
    const toggleMask = (k: string) => set('numberMask', { ...(numberMask || {}), [k]: !numberMask?.[k] });
    const lowerBound = minGetal ?? -maxGetal;

    return (
        <div style={styles.container}>
            {/* OPERATOR */}
            <div style={styles.section}>
                <SettingLabel text="Volgorde:" info="Of de reeksen oplopend, aflopend of door elkaar staan." />
                <div style={styles.buttonGroup}>
                    {OPERATORS.map(o => (
                        <button key={o.val} onClick={() => set('operatorMode', o.val)} aria-pressed={operatorMode === o.val} style={styles.radioBtn(operatorMode === o.val)}>
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* COUNT — up to 8 */}
            <div style={styles.section}>
                <label style={styles.label}>Aantal getallen per reeks: {count}</label>
                <input
                    type="range" min="2" max="8" step="1"
                    value={count}
                    onChange={(e) => set('count', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                />
            </div>

            {/* MAX — natural/decimal/geheel only (rationals use denominators) */}
            {range && (
                <div style={styles.section}>
                    <SettingLabel text="Maximum getal:" info="Het grootste getal dat in de reeksen mag voorkomen." />
                    <PopupSelect
                        clampToLowest
                        value={maxGetal}
                        options={range.presets.map(v => ({ value: v, label: presetLabel(v) }))}
                        onChange={(v) => set('maxGetal', v)}
                        ariaLabel="Maximum getal"
                    />
                </div>
            )}

            {/* GEHELE GETALLEN — lower bound slider, down to -maxGetal */}
            {numberType === 'geheel' && (
                <div style={styles.section}>
                    <label style={styles.label}>Ondergrens: {formatSignedInt(lowerBound)}</label>
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

            {/* DECIMALEN — decimal depth (tienden/honderdsten/duizendsten) */}
            {numberType === 'decimal' && (
                <div style={styles.section}>
                    <SettingLabel text="Decimalen:" info="Aantal decimalen achter de komma." />
                    <PopupSelect
                        value={decimalPlaces}
                        options={[1, 2, 3].map(v => ({ value: v, label: String(v) }))}
                        onChange={(v) => set('decimalPlaces', v)}
                        ariaLabel="Decimalen"
                    />
                </div>
            )}

            {/* SPECIFIEKE GETALOPBOUW — masks for natural + decimal */}
            {(numberType === 'natural' || numberType === 'decimal') && (
                <div style={styles.section}>
                    <SettingLabel text="Specifieke getalopbouw:" info="Kies welke posities een cijfer mogen bevatten. Leeg = vrij." />
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {maskPlaces.map(p => (
                            <button key={p.key} onClick={() => toggleMask(p.key)} aria-pressed={!!numberMask?.[p.key]} style={styles.maskBtn(!!numberMask?.[p.key])}>{p.key}</button>
                        ))}
                    </div>
                    <p style={styles.hint}>Leeg = vrije opbouw.</p>
                </div>
            )}

            {/* RATIONALE GETALLEN — the shared Breuken block */}
            {numberType === 'rational' && (
                <div style={styles.section}>
                    <BreukenSettings
                        noemer={{ shape: 'range', min: minDenominator, max: maxDenominator, onChange: (min, max) => patch({ minDenominator: min, maxDenominator: max }) }}
                        // A teller-1 breuk can be drawn either way, so Stambreuken stays lit; Echte off = only stambreuken.
                        kinds={[
                            { kind: 'stam', on: true, locked: true },
                            { kind: 'echt', on: !unitFractionsOnly, onToggle: (v) => set('unitFractionsOnly', !v) },
                        ]}
                        kindsHint="Zet Echte breuken uit voor enkel stambreuken (teller = 1)."
                        mixed={{ value: mixedMode, onChange: (m) => patch({ mixedMode: m, allowMixed: m === 'all' }) }}
                    />
                </div>
            )}
        </div>
    );
}

// ── Differentiatie: underline blank vs. bordered box for the answer.
// Mounted by Inspector through EXERCISE_UI['ordenen'].StyleConfig.
export function OrdenenStyleConfig({ block }: Props) {
    const [c, patch] = useConstraints<OrdenenConstraints>(block);
    const answerStyle = c.answerStyle ?? 'lijn';
    return (
        <div style={{ ...styles.section, marginTop: '12px' }}>
            <SettingLabel text="Antwoordstijl:" info="Hoe het antwoordvak getoond wordt: een lijn om op te schrijven, of een vak eromheen." />
            <div className="seg-group">
                <button className="seg-btn" aria-pressed={answerStyle === 'lijn'} onClick={() => patch({ answerStyle: 'lijn' })}>Lijn</button>
                <button className="seg-btn" aria-pressed={answerStyle === 'vak'} onClick={() => patch({ answerStyle: 'vak' })}>Vak</button>
            </div>
        </div>
    );
}
