import { useState } from 'react';
import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS = [20, 100, 1000, 10000, 100000];
const STEP_PRESETS = [1, 2, 5, 10, 25, 50, 100];
const DECIMAL_STEPS = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.5, 1];
const FRACTION_STEPS = [2, 3, 4, 5, 8, 10];   // denominator d → step 1/d

export default function GetallenasConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const {
        maxGetal = 100,
        step = 5,
        direction = 'right',
        hardMode = false,
        ticks = 6,
        numberType = 'natural',
        fractionStep = 4,
        minGetal,
        allowMixed = true,
        gelijknamig = false,
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    const isRational = numberType === 'rational';
    const isDecimal = numberType === 'decimal';
    const lowerBound = minGetal ?? -maxGetal;

    // Custom decimal step text — validated before committing.
    const [customStep, setCustomStep] = useState('');
    const customNum = Number(customStep.replace(',', '.'));
    const customValid = customStep.trim() !== '' && Number.isFinite(customNum) && customNum > 0;
    const commitCustom = () => { if (customValid) set('step', customNum); };

    return (
        <div style={styles.container}>
            {/* DIRECTION */}
            <div style={styles.section}>
                <SettingLabel text="Richting van de pijl:" info="Loopt de getallenas stijgend, dalend of beide." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('direction', 'right')} style={styles.radioBtn(direction === 'right')}>→ Stijgend</button>
                    <button onClick={() => set('direction', 'left')} style={styles.radioBtn(direction === 'left')}>← Dalend</button>
                    <button onClick={() => set('direction', 'beide')} style={styles.radioBtn(direction === 'beide')}>Beide</button>
                </div>
            </div>

            {/* HARD MODE */}
            <div style={styles.section}>
                <SettingLabel text="Moeilijkheid:" info="Makkelijk plaatst ronde getallen, moeilijk niet." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('hardMode', false)} style={styles.radioBtn(!hardMode)}>Makkelijk</button>
                    <button onClick={() => set('hardMode', true)} style={styles.radioBtn(hardMode)}>Moeilijk</button>
                </div>
            </div>

            {/* STEP — preset set depends on numberType */}
            <div style={styles.section}>
                <SettingLabel text="Sprong:" info="De afstand tussen twee streepjes op de as." />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {isRational
                        ? FRACTION_STEPS.map(d => (
                            <button key={d} onClick={() => set('fractionStep', d)} style={styles.radioBtn(fractionStep === d)}>1/{d}</button>
                        ))
                        : (isDecimal ? DECIMAL_STEPS : STEP_PRESETS).map(s => (
                            <button key={s} onClick={() => set('step', s)} style={styles.radioBtn(step === s)}>+{s.toLocaleString('nl-BE')}</button>
                        ))}
                </div>
                {isDecimal && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Eigen sprong:</span>
                        <input
                            value={customStep}
                            onChange={(e) => setCustomStep(e.target.value)}
                            onBlur={commitCustom}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitCustom(); }}
                            placeholder="bv. 0,005"
                            style={{ width: '90px', padding: '6px 8px', backgroundColor: 'var(--bg-input)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '13px', border: `1px solid ${customStep && !customValid ? '#e11d48' : 'var(--border-color)'}` }}
                        />
                        <button onClick={commitCustom} disabled={!customValid} style={{ ...styles.radioBtn(false), opacity: customValid ? 1 : 0.5, cursor: customValid ? 'pointer' : 'not-allowed', flex: '0 0 auto' }}>Zet</button>
                    </div>
                )}
            </div>

            {/* MAX — not for rationals (range driven by step + ticks) */}
            {!isRational && (
                <div style={styles.section}>
                    <SettingLabel text="Maximum getal:" info="Het grootste getal op de getallenas." />
                    <PopupSelect
                        clampToLowest
                        value={maxGetal}
                        options={MAX_PRESETS.map(val => ({ value: val, label: `Tot ${val.toLocaleString('nl-BE')}` }))}
                        onChange={(val) => set('maxGetal', val)}
                        ariaLabel="Maximum getal"
                    />
                </div>
            )}

            {/* GEHELE GETALLEN — lower bound */}
            {numberType === 'geheel' && (
                <div style={styles.section}>
                    <SettingLabel text={`Ondergrens: ${lowerBound.toLocaleString('nl-BE')}`} info="Het kleinste (negatieve) getal op de as." />
                    <input
                        type="range" min={-maxGetal} max={0} step={Math.max(1, Math.round(maxGetal / 100))}
                        value={lowerBound}
                        onChange={(e) => set('minGetal', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                    />
                </div>
            )}

            {/* RATIONALE GETALLEN — fraction display toggles */}
            {isRational && (
                <div style={styles.section}>
                    <SettingLabel text="Breuken:" info="Weergave-opties voor breuken op de as." />
                    <div style={styles.onOffRow}>
                        <span style={styles.onOffLabel}>Gemengde getallen (1 1/4 i.p.v. 5/4)</span>
                        <button onClick={() => set('allowMixed', !allowMixed)} style={styles.onOffBtn(allowMixed)}>{allowMixed ? 'Aan' : 'Uit'}</button>
                    </div>
                    <div style={styles.onOffRow}>
                        <span style={styles.onOffLabel}>Gelijknamige breuken (niet vereenvoudigen)</span>
                        <button onClick={() => set('gelijknamig', !gelijknamig)} style={styles.onOffBtn(gelijknamig)}>{gelijknamig ? 'Aan' : 'Uit'}</button>
                    </div>
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
