import { useConstraints } from '../useConstraints';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import FractionMaxField from './FractionMaxField';
import BreukenSettings from './shared/BreukenSettings';
import type { BreukBewerkConstraints } from '../../../services/math/constraintTypes';

interface Props {
    block: MathBlock;
}

export default function BreukBewerkConfig({ block }: Props) {
    const [c, patch] = useConstraints<BreukBewerkConstraints>(block);
    const {
        subType = 'gemengd',
        direction = 'naar-gemengd',
        minDenominator = 2,
        maxDenominator = 10,
        maxNumerator = 10,
        tablesOnly = true,
        allowIrreducible = false,
        targetDen = '',
        allowImproper = false,
        denominatorRelation = 'any',
    } = c;
    const multiple = denominatorRelation === 'multiple';

    const set = (key: string, value: unknown) =>
        patch({ [key]: value } as Partial<BreukBewerkConstraints>);

    const improperPills = [
        { kind: 'echt' as const, on: true, locked: true },
        { kind: 'onecht' as const, on: !!allowImproper, onToggle: (v: boolean) => set('allowImproper', v) },
    ];

    if (subType === 'gemengd') {
        return (
            <div style={styles.container}>
                <BreukenSettings
                    // The cap is itself an onechte breuk, so the teller-over-noemer picture says it best.
                    picture={(
                        <>
                            <SettingLabel text="Hoogste teller en noemer" info="De grootste teller en noemer van de breuken." />
                            <FractionMaxField
                                numerator={maxNumerator}
                                denominator={maxDenominator}
                                onNumerator={(v) => set('maxNumerator', v)}
                                onDenominator={(v) => set('maxDenominator', v)}
                            />
                        </>
                    )}
                    kinds={[{ kind: 'onecht', on: true, locked: true }]}
                    mixed={{ value: 'all', options: ['all'], locked: true }}
                    kindsHint="Hoort bij de oefening: een onechte breuk wordt een gemengd getal, of omgekeerd."
                >
                    <div style={styles.section}>
                        <SettingLabel text="Richting:" info="Van breuk naar gemengd getal, omgekeerd, of beide." />
                        <div style={styles.buttonGroup}>
                            <button onClick={() => set('direction', 'naar-gemengd')} aria-pressed={direction === 'naar-gemengd'} style={styles.radioBtn(direction === 'naar-gemengd')}>Breuk → gemengd</button>
                            <button onClick={() => set('direction', 'naar-breuk')} aria-pressed={direction === 'naar-breuk'} style={styles.radioBtn(direction === 'naar-breuk')}>Gemengd → breuk</button>
                            <button onClick={() => set('direction', 'beide')} aria-pressed={direction === 'beide'} style={styles.radioBtn(direction === 'beide')}>Beide</button>
                        </div>
                    </div>
                </BreukenSettings>
            </div>
        );
    }

    if (subType === 'vereenvoudigen') {
        return (
            <div style={styles.container}>
                {/* The presets pick the structure only (tables or not); the caps stay the teacher's own. */}
                <div style={styles.section}>
                    <SettingLabel text="Voorinstelling:" info="Binnen de maaltafels: grondbreuk en factor uit de tafels tot 10 × 10. Grotere breuken: vrije factoren." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('tablesOnly', true)} aria-pressed={!!tablesOnly} style={styles.radioBtn(tablesOnly)}>Binnen de maaltafels</button>
                        {/* Kept its caps: without them "Grotere breuken" at the 10/10 default draws smaller breuken than the tables. */}
                        <button onClick={() => patch({ maxNumerator: 60, maxDenominator: 100, tablesOnly: false })} aria-pressed={!tablesOnly} style={styles.radioBtn(!tablesOnly)}>Grotere breuken</button>
                    </div>
                </div>
                <BreukenSettings
                    noemer={{ shape: 'max', value: maxDenominator, onChange: (v) => set('maxDenominator', v) }}
                    teller={{ value: maxNumerator, onChange: (v) => set('maxNumerator', v) }}
                    capsHint="Bv. noemer 100 geeft breuken als 8/64."
                    kinds={improperPills}
                >
                    <div style={styles.section}>
                        <div style={styles.onOffRow}>
                            <span style={styles.onOffLabel}>Ook niet-vereenvoudigbare breuken</span>
                            <button onClick={() => set('allowIrreducible', !allowIrreducible)} aria-pressed={!!allowIrreducible} style={styles.onOffBtn(allowIrreducible)}>{allowIrreducible ? 'Aan' : 'Uit'}</button>
                        </div>
                    </div>
                </BreukenSettings>
            </div>
        );
    }

    // gelijknamig
    return (
        <div style={styles.container}>
            <BreukenSettings
                noemer={{ shape: 'range', min: minDenominator, max: maxDenominator, onChange: (min, max) => patch({ minDenominator: min, maxDenominator: max }) }}
                kinds={improperPills}
            >
                <div style={styles.section}>
                    <SettingLabel text="Noemers:" info="Willekeurige noemers, of de ene noemer een veelvoud van de andere." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('denominatorRelation', 'any')} aria-pressed={!multiple} style={styles.radioBtn(!multiple)}>Willekeurig</button>
                        <button onClick={() => set('denominatorRelation', 'multiple')} aria-pressed={multiple} style={styles.radioBtn(multiple)}>De ene een veelvoud van de andere</button>
                    </div>
                    <p style={styles.hint}>Veelvoud: bv. 3 en 6, 4 en 12; de gemene noemer is dan de grootste (leerjaar 4).</p>
                </div>
                <div style={styles.section}>
                    <SettingLabel text="Doelnoemer (leeg = automatisch KGV):" info="Vaste gemeenschappelijke noemer; leeg laat het KGV automatisch kiezen." />
                    {/* The multiple pair fixes the common noemer (the larger one), so a doelnoemer has no say. */}
                    <input type="number" min={2} max={100} value={targetDen}
                        placeholder="bv. 12"
                        disabled={multiple}
                        aria-label="Doelnoemer"
                        onChange={(e) => set('targetDen', e.target.value === '' ? '' : Math.max(2, Number(e.target.value)))}
                        style={{ ...inputStyle, width: '90px', opacity: multiple ? 0.5 : 1, cursor: multiple ? 'not-allowed' : undefined }} />
                    {multiple && <p style={styles.hint}>Niet bij veelvoud-noemers.</p>}
                </div>
            </BreukenSettings>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '64px', padding: '8px 10px', backgroundColor: 'var(--bg-surface-2)',
    border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)',
    color: 'var(--text-main)', outline: 'none', fontSize: 'var(--text-sm)', boxSizing: 'border-box',
};
