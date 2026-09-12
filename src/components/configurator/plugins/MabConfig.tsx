import { useWorksheetStore } from '../../../store/useWorksheetStore';
import { useConstraints } from '../useConstraints';
import { F } from './shared/fieldStyles';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import PopupSelect from '../../ui/PopupSelect';
import StylePicker from '../StylePicker';
import type { MabConstraints } from '../../../services/math/constraintTypes';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS: Array<10 | 20 | 100 | 1000> = [10, 20, 100, 1000];
const STYLE_OPTIONS: Array<{ val: 'symbolic' | 'mab-bw' | 'mab-color'; label: string }> = [
    { val: 'symbolic',  label: 'Symbolisch' },
    { val: 'mab-bw',    label: 'MAB (zwart/wit)' },
    { val: 'mab-color', label: 'MAB' },
];

// Per-place mask keys exposed to user, filtered by maxNumber range.
const placeKeysFor = (maxNumber: number): string[] => {
    if (maxNumber >= 1000) return ['D', 'H', 'T', 'E'];
    if (maxNumber >= 100)  return ['H', 'T', 'E'];
    if (maxNumber >= 20)   return ['T', 'E'];
    return ['E'];
};

export default function MabConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const {
        mabStyle: rawMabStyle = 'symbolic',
        maxNumber = 100,
        operand1Mask = {},
    } = block.constraints as MabConstraints;
    // Back-compat: blocks saved before the rename used 'realistic'.
    const mabStyle = rawMabStyle === 'realistic' ? 'mab-bw' : rawMabStyle;

    // Mutates one constraint key. Wipes mabExercises so the preview shows the
    // empty-state prompt instead of stale numbers that may violate the new constraint.
    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value }, mabExercises: [] });

    const toggleMask = (k: string) => {
        const cur = operand1Mask || {};
        set('operand1Mask', { ...cur, [k]: !cur[k] });
    };

    const keys = placeKeysFor(maxNumber);

    return (
        <div style={styles.container}>

            {/* STYLE — visual variant, so a modal card-gallery with live examples. */}
            <div style={styles.section}>
                <SettingLabel text="Stijl:" info="Hoe de oefening getoond wordt (symbolisch of met MAB-blokken)." />
                <StylePicker
                    typeId={block.typeId}
                    value={mabStyle}
                    title="Kies stijl"
                    options={STYLE_OPTIONS.map(o => ({
                        value: o.val,
                        label: o.label,
                        previewConstraints: { ...block.constraints, mabStyle: o.val },
                    }))}
                    onChange={(v) => set('mabStyle', v)}
                />
            </div>

            {/* MAX NUMBER */}
            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste getal dat mag voorkomen." />
                <PopupSelect
                    clampToLowest
                    value={maxNumber}
                    options={MAX_PRESETS.map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => {
                        // Drop mask keys that no longer apply to the new range so the
                        // generator doesn't try to satisfy an impossible constraint.
                        const allowed = new Set(placeKeysFor(v));
                        const cleaned: Record<string, boolean> = {};
                        for (const k of Object.keys(operand1Mask || {})) if (allowed.has(k)) cleaned[k] = operand1Mask[k];
                        updateBlockSettings(block.id, {
                            constraints: { ...block.constraints, maxNumber: v, operand1Mask: cleaned },
                            mabExercises: [],
                        });
                    }}
                    ariaLabel="Maximum getal"
                />
            </div>

            {/* SPECIFIC NUMBER GENERATOR — mask */}
            <div style={styles.section}>
                <SettingLabel text="Specifieke getalopbouw:" info="Kies welke posities een cijfer mogen bevatten. Leeg = vrij." />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {keys.map(k => (
                        <button key={k} onClick={() => toggleMask(k)} style={styles.maskBtn(!!operand1Mask?.[k])}>
                            {k}
                        </button>
                    ))}
                </div>
                <p style={styles.hint}>
                    Aangevinkte posities verplicht ≥ 1.
                </p>
            </div>

        </div>
    );
}

// ── Differentiatie: what the answer is written in (positietabel / kader / niets).
// Mounted by Inspector through EXERCISE_UI[typeId].StyleConfig.
export function MabStyleConfig({ block }: Props) {
    const [c, patch] = useConstraints<MabConstraints>(block);
    // Back-compat: blocks saved before the rename used `showBox: boolean`.
    const scaff: string = c.scaffolding ?? (c.showBox === false ? 'geen' : 'positietabel');
    const isHerkennen = block.typeId === 'mab-herkennen';
    return (
        <>
            <label style={{ ...F.label, marginTop: '12px' }}>Scaffolding</label>
            <div className="seg-group">
                <button onClick={() => patch({ scaffolding: 'positietabel' })} className="seg-btn" aria-pressed={scaff === 'positietabel'}>Positietabel</button>
                <button onClick={() => patch({ scaffolding: 'kader' })}        className="seg-btn" aria-pressed={scaff === 'kader'}>Kader</button>
                {isHerkennen && (
                    <button onClick={() => patch({ scaffolding: 'geen' })} className="seg-btn" aria-pressed={scaff === 'geen'}>Geen</button>
                )}
            </div>
        </>
    );
}

// ── Geavanceerd: the printed geometry of one MAB exercise.
export function MabAdvancedConfig({ block }: Props) {
    const [c, patch] = useConstraints<MabConstraints>(block);
    const perRow       = c.exercisesPerRow ?? 3;
    const boxHeight    = c.boxHeight       ?? 70;
    const answerHeight = c.answerHeight    ?? 36;
    return (
        <>
            <label style={F.label}>Oefeningen per rij ({perRow})</label>
            <input
                type="range" min={1} max={4} value={perRow}
                onChange={e => patch({ exercisesPerRow: Number(e.target.value) })}
                style={F.range}
            />
            <label style={{ ...F.label, marginTop: '10px' }}>Tekenvak hoogte ({boxHeight}px)</label>
            <input
                type="range" min={40} max={200} step={5} value={boxHeight}
                onChange={e => patch({ boxHeight: Number(e.target.value) })}
                style={F.range}
            />
            <label style={{ ...F.label, marginTop: '10px' }}>Antwoordlijn hoogte ({answerHeight}px)</label>
            <input
                type="range" min={20} max={80} step={2} value={answerHeight}
                onChange={e => patch({ answerHeight: Number(e.target.value) })}
                style={F.range}
            />
        </>
    );
}
