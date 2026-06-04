import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS = [20, 100, 1000, 10000, 100000];
const OPERATORS = [
    { val: 'oplopend', label: 'Oplopend (<)' },
    { val: 'aflopend', label: 'Aflopend (>)' },
    { val: 'beide', label: 'Beide' },
];

const numInput: React.CSSProperties = { width: '70px', padding: '6px 8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '13px' };

export default function OrdenenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

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
        allowMixed = false,
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

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
                        <button key={o.val} onClick={() => set('operatorMode', o.val)} style={styles.radioBtn(operatorMode === o.val)}>
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
            {numberType !== 'rational' && (
                <div style={styles.section}>
                    <SettingLabel text="Maximum getal:" info="Het grootste getal dat in de reeksen mag voorkomen." />
                    <PopupSelect
                        clampToLowest
                        value={maxGetal}
                        options={MAX_PRESETS.map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                        onChange={(v) => set('maxGetal', v)}
                        ariaLabel="Maximum getal"
                    />
                </div>
            )}

            {/* GEHELE GETALLEN — lower bound slider, down to -maxGetal */}
            {numberType === 'geheel' && (
                <div style={styles.section}>
                    <label style={styles.label}>Ondergrens: {lowerBound.toLocaleString('nl-BE')}</label>
                    <input
                        type="range" min={-maxGetal} max={0} step={Math.max(1, Math.round(maxGetal / 100))}
                        value={lowerBound}
                        onChange={(e) => set('minGetal', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                    />
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
                            <button key={p.key} onClick={() => toggleMask(p.key)} style={styles.maskBtn(!!numberMask?.[p.key])}>{p.key}</button>
                        ))}
                    </div>
                    <p style={styles.hint}>Leeg = vrije opbouw.</p>
                </div>
            )}

            {/* RATIONALE GETALLEN — denominator range + stambreuk / gemengd */}
            {numberType === 'rational' && (
                <div style={styles.section}>
                    <SettingLabel text="Specifieke getalopbouw:" info="Stel het bereik van de noemers en het soort breuken in." />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Noemer van</span>
                        <input type="number" min={2} max={20} value={minDenominator} onChange={(e) => set('minDenominator', Math.max(2, Number(e.target.value)))} style={numInput} />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>tot</span>
                        <input type="number" min={2} max={20} value={maxDenominator} onChange={(e) => set('maxDenominator', Math.max(2, Number(e.target.value)))} style={numInput} />
                    </div>
                    <div style={{ ...styles.onOffRow, marginTop: '8px' }}>
                        <span style={styles.onOffLabel}>Enkel stambreuken (teller = 1)</span>
                        <button onClick={() => set('unitFractionsOnly', !unitFractionsOnly)} style={styles.onOffBtn(unitFractionsOnly)}>{unitFractionsOnly ? 'Aan' : 'Uit'}</button>
                    </div>
                    <div style={styles.onOffRow}>
                        <span style={styles.onOffLabel}>Gemengde getallen (bv. 1 1/4)</span>
                        <button onClick={() => set('allowMixed', !allowMixed)} style={styles.onOffBtn(allowMixed)}>{allowMixed ? 'Aan' : 'Uit'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
