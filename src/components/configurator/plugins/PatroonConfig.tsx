import { useWorksheetStore } from '../../../store/useWorksheetStore';
import { useConstraints } from '../useConstraints';
import { F } from './shared/fieldStyles';
import Switch from '../../ui/Switch';
import type { MathBlock } from '../../../services/math/types';
import { getMaskPlaces } from '../../../services/math/mathEngine';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import SettingLabel from './SettingLabel';
import PopupSelect from '../../ui/PopupSelect';
import type { PatroonConstraints } from '../../../services/math/constraintTypes';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS = [20, 100, 1000, 10000, 100000];
const OPS: Array<{ key: string; label: string }> = [
    { key: '+', label: '+' }, { key: '-', label: '−' }, { key: 'x', label: '×' }, { key: ':', label: ':' },
];

export default function PatroonConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const {
        numberType = 'natural',
        maxGetal = 100,
        minGetal,
        ticks = 6,
        steps = 1,
        ops = ['+'],
        opSettings = {},
        maxDecimals = 1,
    } = block.constraints as PatroonConstraints;
    const isDecimal = numberType === 'decimal';
    const dp = isDecimal ? Math.min(3, Math.max(1, maxDecimals)) : 0;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    const lowerBound = minGetal ?? -maxGetal;

    const toggleOp = (op: string) => {
        const has = ops.includes(op);
        const nextOps = has ? ops.filter((o: string) => o !== op) : [...ops, op];
        if (!nextOps.length) return;   // keep ≥1
        const nextSettings = { ...opSettings };
        if (!has && !nextSettings[op]) nextSettings[op] = { max: 10, mask: {} };
        updateBlockSettings(block.id, { constraints: { ...block.constraints, ops: nextOps, opSettings: nextSettings } });
    };
    const setOp = (op: string, patch: Record<string, unknown>) => {
        const cur = opSettings[op] ?? { max: 10, mask: {} };
        set('opSettings', { ...opSettings, [op]: { ...cur, ...patch } });
    };
    const toggleOpMask = (op: string, k: string) => {
        const cur = opSettings[op] ?? { max: 10, mask: {} };
        setOp(op, { mask: { ...cur.mask, [k]: !cur.mask?.[k] } });
    };

    return (
        <div style={styles.container}>
            {/* MAX */}
            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste getal dat in het patroon mag voorkomen." />
                <PopupSelect
                    clampToLowest
                    value={maxGetal}
                    options={MAX_PRESETS.map(val => ({ value: val, label: `Tot ${val.toLocaleString('nl-BE')}` }))}
                    onChange={(val) => set('maxGetal', val)}
                    ariaLabel="Maximum getal"
                />
            </div>

            {/* GEHELE — lower bound */}
            {numberType === 'geheel' && (
                <div style={styles.section}>
                    <SettingLabel text={`Ondergrens: ${lowerBound.toLocaleString('nl-BE')}`} info="Hoe ver het patroon onder nul mag gaan (negatieve getallen)." />
                    <input type="range" min={-maxGetal} max={0} step={Math.max(1, Math.round(maxGetal / 100))}
                        value={lowerBound} onChange={(e) => set('minGetal', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                </div>
            )}

            {/* MAX DECIMALEN — decimal patterns only */}
            {isDecimal && (
                <div style={styles.section}>
                    <SettingLabel text="Max decimalen:" info="Hoeveel cijfers er na de komma mogen staan." />
                    <div style={styles.buttonGroup}>
                        {[1, 2, 3].map(d => (
                            <button key={d} onClick={() => set('maxDecimals', d)} style={styles.radioBtn(dp === d)}>{d}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* STEPS + TICKS */}
            <div style={styles.section}>
                <SettingLabel text={`Stappen in het patroon: ${steps}`} info="Hoeveel reken-stappen het patroon per keer doorloopt." />
                <input type="range" min="1" max="4" step="1" value={steps}
                    onChange={(e) => set('steps', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            </div>
            <div style={styles.section}>
                <SettingLabel text={`Aantal getallen: ${ticks}`} info="Hoeveel getallen er in de reeks getoond worden." />
                <input type="range" min="4" max="10" step="1" value={ticks}
                    onChange={(e) => set('ticks', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
            </div>

            {/* OPERATIONS */}
            <div style={styles.section}>
                <SettingLabel text="Bewerkingen:" info="Welke bewerkingen het patroon mag gebruiken (+ − × :)." />
                <div style={styles.buttonGroup}>
                    {OPS.map(o => (
                        <button key={o.key} onClick={() => toggleOp(o.key)} style={styles.pill(ops.includes(o.key))}>{o.label}</button>
                    ))}
                </div>
            </div>

            {/* PER-OP SETTINGS */}
            {OPS.filter(o => ops.includes(o.key)).map(o => {
                const s = opSettings[o.key] ?? { max: 10, mask: {} };
                const isAddSub = o.key === '+' || o.key === '-';
                // Mask spans the block's full place range (+ decimals) so big/decimal steps can be structured.
                const maskPlaces = getMaskPlaces(maxGetal, isDecimal ? 'decimal' : 'natural', dp);
                return (
                    <div key={o.key} style={{ ...styles.section, paddingLeft: '8px', borderLeft: '2px solid var(--separator)' }}>
                        <SettingLabel text={`${o.label} — ${isAddSub ? 'stap' : (o.key === 'x' ? 'factor' : 'deler')} (max):`} info="De grootste waarde die deze bewerking per stap mag gebruiken." />
                        <input type="number" min={isAddSub ? 1 : 2} max={isAddSub ? 1000 : 12} value={s.max ?? 10}
                            onChange={(e) => setOp(o.key, { max: Math.max(isAddSub ? 1 : 2, Number(e.target.value)) })}
                            style={inputStyle} />
                        {isAddSub && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                {maskPlaces.map(p => (
                                    <button key={p.key} onClick={() => toggleOpMask(o.key, p.key)} style={styles.maskBtn(!!s.mask?.[p.key])} title={p.label}>{p.key}</button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: '80px', padding: '8px 10px', backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)', borderRadius: '6px',
    color: 'var(--text-main)', outline: 'none', fontSize: '13px', boxSizing: 'border-box',
};

// ── Differentiatie: the arrow/operator scaffolds drawn between two terms.
// Mounted by Inspector through EXERCISE_UI['getalpatronen'].StyleConfig.
export function PatroonStyleConfig({ block }: Props) {
    const [c, patch] = useConstraints<PatroonConstraints>(block);
    // One operator sits BETWEEN two terms, so a row of n ticks has n-1 of them.
    const maxOps = Math.max(0, (c.ticks ?? 6) - 1);
    const operatorsShown = Math.min(c.operatorsShown ?? 0, maxOps);
    return (
        <>
            <div style={{ ...F.switchRow, marginTop: '12px' }}>
                <span style={F.switchText}>Pijl + schrijflijn</span>
                <Switch checked={!!c.showArrows} onChange={(v) => patch({ showArrows: v })} aria-label="Pijl + schrijflijn" />
            </div>
            <div style={F.switchRow}>
                <span style={F.switchText}>Operatoren invullen</span>
                <Switch checked={!!c.showOperators} onChange={(v) => patch({ showOperators: v })} aria-label="Operatoren invullen" />
            </div>
            {c.showOperators && (
                <>
                    <label style={{ ...F.label, marginTop: '8px' }}>Aantal ingevuld: {operatorsShown}</label>
                    <input type="range" min={0} max={maxOps} step={1} value={operatorsShown}
                        onChange={(e) => patch({ operatorsShown: Number(e.target.value) })}
                        style={F.range} />
                    <label style={{ ...F.label, marginTop: '8px' }}>Operatorweergave</label>
                    <div className="seg-group">
                        <button className="seg-btn" aria-pressed={(c.operatorStyle ?? 'symbol') === 'symbol'} onClick={() => patch({ operatorStyle: 'symbol' })}>Enkel teken</button>
                        <button className="seg-btn" aria-pressed={(c.operatorStyle ?? 'symbol') === 'full'} onClick={() => patch({ operatorStyle: 'full' })}>Volledig</button>
                    </div>
                </>
            )}
        </>
    );
}
