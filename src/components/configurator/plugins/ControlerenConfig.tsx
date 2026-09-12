import { useConstraints } from '../useConstraints';
import { F } from './shared/fieldStyles';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import SettingLabel from './SettingLabel';
import type { ControlerenConstraints } from '../../../services/math/constraintTypes';

interface Props { block: MathBlock; }

export default function ControlerenConfig({ block }: Props) {
    const [c, patch] = useConstraints<ControlerenConstraints>(block);
    const subType: string = c.subType ?? 'negenproef';
    const operators: string[] = c.operators ?? ['+', '-'];
    const maxGetal = c.maxGetal ?? 1000;
    const foutAandeel: string = c.foutAandeel ?? 'helft';
    const showKruis: boolean = c.showKruis ?? true;

    const set = (key: keyof ControlerenConstraints, value: unknown) => patch({ [key]: value } as Partial<ControlerenConstraints>);
    const toggleOp = (op: string) => {
        const next = operators.includes(op) ? operators.filter(x => x !== op) : [...operators, op];
        if (next.length) set('operators', next);   // keep ≥1
    };

    return (
        <div style={styles.container}>
            {subType === 'omgekeerde' && (
                <div style={styles.section}>
                    <SettingLabel text="Bewerkingen:" info="Optellen wordt gecontroleerd met aftrekken en omgekeerd." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => toggleOp('+')} style={styles.pill(operators.includes('+'))}>+</button>
                        <button onClick={() => toggleOp('-')} style={styles.pill(operators.includes('-'))}>−</button>
                    </div>
                </div>
            )}

            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Grootte van de te controleren bewerking." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={[1000, 10000].map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxGetal', v)}
                    ariaLabel="Maximum getal"
                />
            </div>

            <div style={styles.section}>
                <SettingLabel text="Foute uitkomsten:" info="Hoeveel rijen een bewust fout antwoord tonen. Fouten zijn altijd betrapbaar met de proef." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('foutAandeel', 'geen')} style={styles.radioBtn(foutAandeel === 'geen')}>Geen</button>
                    <button onClick={() => set('foutAandeel', 'helft')} style={styles.radioBtn(foutAandeel === 'helft')}>De helft</button>
                    <button onClick={() => set('foutAandeel', 'alles')} style={styles.radioBtn(foutAandeel === 'alles')}>Alles</button>
                </div>
            </div>

            {subType === 'negenproef' && (
                <div style={styles.onOffRow}>
                    <SettingLabel text="Kruis afdrukken" info="Drukt het lege negenproef-kruis af; uit = de leerling tekent het zelf." />
                    <button onClick={() => set('showKruis', !showKruis)} style={styles.onOffBtn(showKruis)}>{showKruis ? 'Aan' : 'Uit'}</button>
                </div>
            )}
        </div>
    );
}

// ── Differentiatie: how much of the check line is already printed (omgekeerde only).
// Mounted by Inspector through EXERCISE_UI['controleren'].StyleConfig.
export function ControlerenStyleConfig({ block }: Props) {
    const [c, patch] = useConstraints<ControlerenConstraints>(block);
    if (c.subType !== 'omgekeerde') return null;
    return (
        <>
            <label style={{ ...F.label, marginTop: '12px' }}>Controlelijn</label>
            <div className="seg-group">
                {([
                    { key: 'niets', label: 'Leeg' },
                    { key: 'teken', label: 'Bewerkingsteken' },
                    { key: 'alles', label: 'Ook getallen' },
                ] as const).map(({ key, label }) => (
                    <button key={key} className="seg-btn" aria-pressed={(c.prefill ?? 'niets') === key}
                        onClick={() => patch({ prefill: key })}>
                        {label}
                    </button>
                ))}
            </div>
        </>
    );
}
