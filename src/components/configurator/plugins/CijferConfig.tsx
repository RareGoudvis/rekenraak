import { useConstraints } from '../useConstraints';
import { F } from './shared/fieldStyles';
import type { MathBlock, ConstraintType } from '../../../services/math/types';
import type { CijferConstraints } from '../../../services/math/types';
import { getMaskPlaces, getBridgePlaces } from '../../../services/math/mathEngine';
import { sharedPluginStyles as styles } from './sharedPluginStyles';
import PopupSelect from '../../ui/PopupSelect';
import BridgeControl from '../BridgeControl';
import SettingLabel from './SettingLabel';

interface Props {
    block: MathBlock;
}

const MAX_RANGES = [20, 100, 1_000, 10_000, 100_000, 1_000_000, 1_000_000_000];

export default function CijferConfig({ block }: Props) {
    const [c, patch] = useConstraints<CijferConstraints>(block);
    const isDecimal = c.numberType === 'decimal';
    const isDivision = c.operator === ':';
    const isAddition = c.operator === '+';
    const isSubtraction = c.operator === '-';
    const hasBridges = isAddition || isSubtraction;
    const n = isAddition ? Math.min(Math.max(2, c.numberOfTerms || 2), 4) : 2;

    const set = (key: keyof CijferConstraints, value: unknown) => patch({ [key]: value } as Partial<CijferConstraints>);
    const setBridge = (placeKey: string, value: ConstraintType) => {
        const cur = c.bridges || {};
        set('bridges', { ...cur, [placeKey]: value });
    };

    const setMask = (maskKey: string, placeKey: string, value: boolean) => {
        const cur = (c[maskKey as keyof CijferConstraints] || {}) as Record<string, boolean>;
        set(maskKey as keyof CijferConstraints, { ...cur, [placeKey]: value });
    };

    const maskPlaces = getMaskPlaces(c.maxRange || 1000, c.numberType === 'decimal' ? 'decimal' : 'natural', isDecimal ? (c.decimalPlaces || 2) : 0);
    const bridgePlaces = getBridgePlaces(c.maxRange || 1000, c.numberType === 'decimal' ? 'decimal' : 'natural');
    const maskKeys = ['operand0Mask', 'operand1Mask', 'operand2Mask', 'operand3Mask'];

    return (
        <div style={styles.container}>

            {/* MAXIMUM BEREIK */}
            <div style={styles.section}>
                <SettingLabel text="Maximum getal:" info="Het grootste getal dat in de oefeningen mag voorkomen." />
                <PopupSelect
                    clampToLowest
                    value={c.maxRange}
                    options={MAX_RANGES.map(v => ({ value: v, label: `Tot ${v.toLocaleString('nl-BE')}` }))}
                    onChange={(v) => set('maxRange', v)}
                    ariaLabel="Maximum getal"
                />
            </div>

            {/* DECIMAL PLACES */}
            {isDecimal && (
                <div style={styles.section}>
                    <SettingLabel text="Cijfers na de komma:" info="Aantal decimalen achter de komma." />
                    <PopupSelect
                        value={c.decimalPlaces ?? 2}
                        options={[1, 2, 3].map(v => ({ value: v, label: String(v) }))}
                        onChange={(v) => set('decimalPlaces', v)}
                        ariaLabel="Cijfers na de komma"
                    />
                </div>
            )}

            {/* MET REST */}
            {isDivision && !isDecimal && (
                <div style={styles.section}>
                    <SettingLabel text="Uitkomst:" info="Of de deling exact opgaat of een rest mag overhouden." />
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('withRemainder', false)} style={styles.radioBtn(!c.withRemainder)}>Exact</button>
                        <button onClick={() => set('withRemainder', true)} style={styles.radioBtn(!!c.withRemainder)}>Met rest</button>
                    </div>
                </div>
            )}

            {/* SCHATTING */}
            <div style={styles.section}>
                <SettingLabel text="Voorafgaande schatting:" info="Voeg een schattingsregel toe vóór de berekening." />
                <div style={styles.buttonGroup}>
                    <button onClick={() => set('withEstimation', false)} style={styles.radioBtn(!c.withEstimation)}>Geen</button>
                    <button onClick={() => set('withEstimation', true)} style={styles.radioBtn(!!c.withEstimation)}>Toevoegen</button>
                </div>
            </div>

            {/* AANTAL GETALLEN (optellen only) */}
            {isAddition && (
                <div style={styles.section}>
                    <label style={styles.label}>Aantal getallen: {n}</label>
                    <input
                        type="range" min="2" max="4" step="1"
                        value={n}
                        onChange={(e) => set('numberOfTerms', Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                </div>
            )}

            {/* SPECIFIEKE GETALOPBOUW — getalopbouw precedes bruggen (canonical order) */}
            {maskPlaces.length > 0 && (
                <div style={styles.section}>
                    <SettingLabel text="Specifieke getalopbouw" info="Kies welke posities een cijfer mogen bevatten. Leeg = vrij." />
                    {Array.from({ length: n }, (_, i) => {
                        const maskKey = maskKeys[i];
                        const mask = (c[maskKey as keyof CijferConstraints] || {}) as Record<string, boolean>;
                        return (
                            <div key={i} style={{ marginBottom: '8px' }}>
                                <label style={{ ...styles.label, fontSize: 'var(--text-xs)', marginBottom: '4px' }}>Getal {i + 1}:</label>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {maskPlaces.map(p => (
                                        <button key={p.key} onClick={() => setMask(maskKey, p.key, !mask[p.key])} style={styles.maskBtn(!!mask[p.key])}>
                                            {p.key}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Divider between the getalopbouw and bruggen groups — only when both render. */}
            {maskPlaces.length > 0 && hasBridges && bridgePlaces.length > 0 && <hr style={styles.divider} />}

            {/* BRUGINSTELLINGEN (+ and - only) */}
            {hasBridges && bridgePlaces.length > 0 && (
                <div style={styles.section}>
                    <SettingLabel text="Bruginstellingen" info="Per positie: brug (overdracht) mag, moet of niet." />
                    <BridgeControl
                        places={bridgePlaces}
                        bridges={(c.bridges || {}) as Record<string, ConstraintType>}
                        onChange={(key, val) => setBridge(key, val)}
                    />
                </div>
            )}

        </div>
    );
}

// ── Differentiatie: how much of the column structure is printed, plus the two
// check/answer boxes. Mounted by Inspector through EXERCISE_UI[typeId].StyleConfig.
export function CijferStyleConfig({ block }: Props) {
    const [c, patch] = useConstraints<CijferConstraints>(block);
    return (
        <>
            {/* ── Scaffolding (Structuur+Getallen / Enkel Structuur / Enkel Ruitjes) ── */}
            <label style={{ ...F.label, marginTop: '12px' }}>Scaffolding</label>
            <div style={F.optionCol}>
                {([
                    { level: 1, label: 'Structuur en ingevulde getallen' },
                    { level: 2, label: 'Structuur zonder getallen' },
                    { level: 3, label: 'Lege ruitjes' },
                ] as const).map(({ level, label }) => {
                    const isActive = (c.scaffolding ?? 3) === level;
                    return (
                        <button
                            key={level}
                            onClick={() => patch({ scaffolding: level })}
                            style={{
                                ...F.radioBtn(isActive),
                                justifyContent: 'flex-start', padding: '7px 12px',
                                color: isActive ? 'white' : 'var(--text-main)',
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* ── Controleer met omgekeerde bewerking ── */}
            {(c.operator === '+' || c.operator === '-') && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Controleren</label>
                    <label style={F.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={!!c.omgekeerdeControle}
                            onChange={(e) => patch({ omgekeerdeControle: e.target.checked })}
                            style={F.checkbox}
                        />
                        Controlelijn (omgekeerde bewerking)
                    </label>
                </>
            )}

            {/* ── Q/R-vak toggle (delen only) ── */}
            {c.operator === ':' && (
                <>
                    <label style={{ ...F.label, marginTop: '12px' }}>Q/R-vak</label>
                    <label style={F.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={c.showQR !== false}
                            onChange={(e) => patch({ showQR: e.target.checked })}
                            style={F.checkbox}
                        />
                        Toon Q/R-vak
                    </label>
                </>
            )}
        </>
    );
}

// ── Geavanceerd: the printed squared-paper grid the columns are written on.
export function CijferAdvancedConfig({ block }: Props) {
    const [c, patch] = useConstraints<CijferConstraints>(block);
    const slider = { width: '100%', accentColor: 'var(--accent-bewerkingen)', cursor: 'pointer' };
    return (
        <>
            {/* 25pt ≈ 9mm: the ruitjes are printed at a real-world size, so the label says both. */}
            <label style={F.label}>Ruitjesgrootte: {c.gridCellSize || 25}pt (~{Math.round((c.gridCellSize || 25) / 2.835)}mm)</label>
            <input
                type="range" min="16" max="32" step="2"
                value={c.gridCellSize || 25}
                onChange={(e) => patch({ gridCellSize: Number(e.target.value) })}
                style={slider}
            />
            <label style={{ ...F.label, marginTop: '10px' }}>Extra kolommen: {c.extraCols || 0}</label>
            <input
                type="range" min="0" max="6" step="1"
                value={c.extraCols || 0}
                onChange={(e) => patch({ extraCols: Number(e.target.value) })}
                style={slider}
            />
            <label style={{ ...F.label, marginTop: '10px' }}>Extra rijen: {c.extraRows || 0}</label>
            <input
                type="range" min="0" max="10" step="1"
                value={c.extraRows || 0}
                onChange={(e) => patch({ extraRows: Number(e.target.value) })}
                style={slider}
            />
        </>
    );
}
