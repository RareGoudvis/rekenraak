import { useWorksheetStore } from '../../../store/useWorksheetStore';
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
    const updateBlockSettings = useWorksheetStore((s) => s.updateBlockSettings);
    const c = block.constraints as CijferConstraints;
    const isDecimal = c.numberType === 'decimal';
    const isDivision = c.operator === ':';
    const isAddition = c.operator === '+';
    const isSubtraction = c.operator === '-';
    const hasBridges = isAddition || isSubtraction;
    const n = isAddition ? Math.min(Math.max(2, c.numberOfTerms || 2), 4) : 2;

    const set = (key: keyof CijferConstraints, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    const setBridge = (placeKey: string, value: ConstraintType) => {
        const cur = c.bridges || {};
        set('bridges', { ...cur, [placeKey]: value });
    };

    const setMask = (maskKey: string, placeKey: string, value: boolean) => {
        const cur = (block.constraints[maskKey] || {}) as Record<string, boolean>;
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
                        const mask = (block.constraints[maskKey] || {}) as Record<string, boolean>;
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
