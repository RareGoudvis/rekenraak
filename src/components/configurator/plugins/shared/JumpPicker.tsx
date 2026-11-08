import { useState } from 'react';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { r6 } from '../../../../services/getallenas/jumps';
import { addJump, nextJumps } from './jumpSelection';

interface Props {
    chosen: number[];
    presets: number[];
    onChange: (list: number[]) => void;
    withCustom: boolean;
    customPlaceholder: string;
}

// Multi-select jump chips (at least one stays on) plus the optional "Eigen sprong" that adds to the selection.
export default function JumpPicker({ chosen, presets, onChange, withCustom, customPlaceholder }: Props) {
    const [customStep, setCustomStep] = useState('');
    const customNum = Number(customStep.replace(',', '.'));
    const customValid = customStep.trim() !== '' && Number.isFinite(customNum) && customNum > 0;
    const commitCustom = () => {
        if (!customValid) return;
        onChange(addJump(chosen, customNum));
        setCustomStep('');
    };
    const isOn = (s: number) => chosen.some(x => r6(x) === r6(s));
    // Chosen jumps outside the presets (custom ones) get their own chip so they can be switched off again.
    const extras = chosen.filter(s => !presets.some(p => r6(p) === r6(s)));
    return (
        <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[...presets, ...extras].map(s => (
                    <button key={s} onClick={() => onChange(nextJumps(chosen, s))} aria-pressed={isOn(s)} style={styles.radioBtn(isOn(s))}>+{s.toLocaleString('nl-BE')}</button>
                ))}
            </div>
            {withCustom && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Eigen sprong:</span>
                    <input
                        value={customStep}
                        onChange={(e) => setCustomStep(e.target.value)}
                        onBlur={commitCustom}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitCustom(); }}
                        placeholder={customPlaceholder}
                        style={{ width: '90px', padding: '6px 8px', backgroundColor: 'var(--bg-input)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '13px', border: `1px solid ${customStep && !customValid ? '#e11d48' : 'var(--border-color)'}` }}
                    />
                    <button onClick={commitCustom} disabled={!customValid} style={{ ...styles.radioBtn(false), opacity: customValid ? 1 : 0.5, cursor: customValid ? 'pointer' : 'not-allowed', flex: '0 0 auto' }}>Zet</button>
                </div>
            )}
        </>
    );
}
