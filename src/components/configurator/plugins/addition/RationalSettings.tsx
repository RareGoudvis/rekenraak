import { useConstraints } from '../../useConstraints';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import SettingLabel from '../SettingLabel';
import Switch from '../../../ui/Switch';
import { F } from '../shared/fieldStyles';
import BreukenSettings, { type MixedMode } from '../shared/BreukenSettings';
import type { AddSubConstraints } from '../../../../services/math/constraintTypes';

interface Props { block: MathBlock; }

// 'one_step' = ongelijknamig with one noemer a multiple of the other; 'multi_step' = free noemers.
const DIFFICULTY = [
    { val: 'same',       label: 'Gelijknamig' },
    { val: 'one_step',   label: 'Ongelijknamig (eenvoudig)' },
    { val: 'multi_step', label: 'Ongelijknamig (moeilijk)' },
] as const;

// + − with breuken: the shared Breuken block per breuk. A gemengd operand is a separate draw in the
// generator (a whole 1..3 plus a proper part), so each breuk offers geen / alleen, not "ook".
export default function RationalSettings({ block }: Props) {
    const [c, patch] = useConstraints<AddSubConstraints>(block);
    const {
        mixedNumber1 = false, mixedNumber2 = false,
        maxNumerator1 = 10, maxDenominator1 = 10,
        maxNumerator2 = 10, maxDenominator2 = 10,
        linkFractions = true,
        fractionDifficulty = 'same',
    } = c;

    const mixedRow = (i: 1 | 2, on: boolean) => ({
        label: `Breuk ${i} als gemengd getal`,
        value: (on ? 'all' : 'none') as MixedMode,
        options: ['none', 'all'] as const,
        onChange: (m: MixedMode) => patch(i === 1 ? { mixedNumber1: m === 'all' } : { mixedNumber2: m === 'all' }),
    });

    const caps = (i: 1 | 2) => {
        const n = i === 1 ? maxNumerator1 : maxNumerator2;
        const d = i === 1 ? maxDenominator1 : maxDenominator2;
        // Linked: one pair of caps writes both breuken.
        const setN = (v: number) => patch(linkFractions ? { maxNumerator1: v, maxNumerator2: v } : i === 1 ? { maxNumerator1: v } : { maxNumerator2: v });
        const setD = (v: number) => patch(linkFractions ? { maxDenominator1: v, maxDenominator2: v } : i === 1 ? { maxDenominator1: v } : { maxDenominator2: v });
        return { noemer: { shape: 'max' as const, value: d, onChange: setD }, teller: { value: n, onChange: setN } };
    };

    return (
        <div style={styles.section}>
            {linkFractions ? (
                <BreukenSettings {...caps(1)} mixed={[mixedRow(1, mixedNumber1), mixedRow(2, mixedNumber2)]} />
            ) : (
                <>
                    <BreukenSettings {...caps(1)} title="Breuk 1" mixed={mixedRow(1, mixedNumber1)} />
                    <BreukenSettings {...caps(2)} title="Breuk 2" mixed={mixedRow(2, mixedNumber2)} />
                </>
            )}
            <div style={{ ...F.switchRow, marginBottom: 'var(--sp-4)' }}>
                <span style={F.switchText}>Zelfde grenzen voor beide breuken</span>
                <Switch checked={linkFractions} onChange={(v) => patch(v ? { linkFractions: true, maxNumerator2: maxNumerator1, maxDenominator2: maxDenominator1 } : { linkFractions: false })} aria-label="Zelfde grenzen voor beide breuken" />
            </div>
            <SettingLabel text="Noemers" info="Gelijknamige breuken, of ongelijknamige: eenvoudig (de ene noemer is een veelvoud van de andere) of moeilijk." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {DIFFICULTY.map(({ val, label }) => (
                    <button key={val} type="button" onClick={() => patch({ fractionDifficulty: val })} aria-pressed={fractionDifficulty === val}
                        style={{ ...styles.radioBtn(fractionDifficulty === val), justifyContent: 'flex-start', textAlign: 'left' }}>
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
