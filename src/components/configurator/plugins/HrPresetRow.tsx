import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import PopupSelect from '../../ui/PopupSelect';

interface Props {
    block: MathBlock;
    // addsub: Vrij / Compenseren · muldiv: Vrij / Met 10-100-1000
    variant: 'addsub' | 'muldiv';
}

// Top rows of every hoofdrekenen config: Oefenvorm preset + aantal termen/factoren.
// Presets are generator flavours, not separate exercise types (constraints.preset).
export default function HrPresetRow({ block, variant }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const c = block.constraints;
    const preset: string = c.preset ?? 'vrij';
    const termCount: number = Math.min(4, Math.max(2, c.termCount ?? 2));
    const presetDistance: number = c.presetDistance ?? 1;
    const presetFactors: number[] = c.presetFactors ?? [10, 100, 1000];
    const isRest = c.multiplicationMode === 'met_rest';
    const isPreset = preset === 'compenseren' || preset === 'tienvoud';

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...c, [key]: value } });
    const toggleFactor = (f: number) => {
        const next = presetFactors.includes(f) ? presetFactors.filter((x: number) => x !== f) : [...presetFactors, f];
        if (next.length) set('presetFactors', next);   // keep ≥1
    };

    const termLabel = variant === 'muldiv' ? 'Aantal factoren:' : 'Aantal termen:';

    return (
        <>
            <div style={styles.section}>
                <SettingLabel text="Oefenvorm:" info={variant === 'addsub'
                    ? 'Vrij = gewone sommen. Compenseren = het tweede getal ligt net onder een tienvoud (47 + 29).'
                    : 'Vrij = gewone sommen. Met 10, 100, 1000 = kommaverschuiving met een tienvoud.'} />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('preset', 'vrij')} style={styles.radioBtn(!isPreset)}>Vrij</button>
                    {variant === 'addsub'
                        ? <button onClick={() => set('preset', 'compenseren')} style={styles.radioBtn(preset === 'compenseren')}>Compenseren</button>
                        : <button onClick={() => set('preset', 'tienvoud')} style={styles.radioBtn(preset === 'tienvoud')}>Met 10, 100, 1000</button>}
                </div>
            </div>

            {preset === 'compenseren' && variant === 'addsub' && (
                <div style={styles.section}>
                    <SettingLabel text="Afstand tot het tienvoud:" info="29 = afstand 1, 28 = afstand 2." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('presetDistance', 1)} style={styles.radioBtn(presetDistance === 1)}>1</button>
                        <button onClick={() => set('presetDistance', 2)} style={styles.radioBtn(presetDistance === 2)}>1 – 2</button>
                    </div>
                </div>
            )}

            {preset === 'tienvoud' && variant === 'muldiv' && (
                <>
                    <div style={styles.section}>
                        <SettingLabel text="Tienvoud:" info="Met welke factoren gerekend wordt." />
                        <div style={styles.buttonGroup}>
                            {[10, 100, 1000].map(f => (
                                <button key={f} onClick={() => toggleFactor(f)} style={styles.pill(presetFactors.includes(f))}>{f.toLocaleString('nl-BE')}</button>
                            ))}
                        </div>
                    </div>
                    <div style={styles.section}>
                        {/* The sub-config is hidden for this preset, so max getal lives here. */}
                        <SettingLabel text="Maximum getal:" info="Het grootste uitgangsgetal (bij : het quotiënt)." />
                        <PopupSelect
                            clampToLowest
                            value={c.maxGetal ?? 1000}
                            options={[100, 1000, 10000].map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                            onChange={(v) => set('maxGetal', v)}
                            ariaLabel="Maximum getal"
                        />
                    </div>
                </>
            )}

            {/* Presets and met-rest are 2-term by definition — hide the segment there. */}
            {!isPreset && !isRest && (
                <div style={styles.section}>
                    <SettingLabel text={termLabel} info="Kettingen van 3 of 4 getallen in één som (a + b + c = …)." />
                    <div style={styles.buttonGroup}>
                        {[2, 3, 4].map(n => (
                            <button key={n} onClick={() => set('termCount', n)} style={styles.radioBtn(termCount === n)}>{n}</button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
