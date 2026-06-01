import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock, ConstraintType } from '../../../services/math/types';
import type { CijferConstraints } from '../../../services/math/types';
import { getMaskPlaces, getBridgePlaces } from '../../../services/math/mathEngine';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

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
                <label style={styles.label}>Maximum bereik:</label>
                <div style={styles.buttonGroup}>
                    {MAX_RANGES.map(val => (
                        <button key={val} onClick={() => set('maxRange', val)} style={styles.radioBtn(c.maxRange === val)}>
                            {val.toLocaleString('nl-BE')}
                        </button>
                    ))}
                </div>
            </div>

            {/* DECIMAL PLACES */}
            {isDecimal && (
                <div style={styles.section}>
                    <label style={styles.label}>Cijfers na de komma:</label>
                    <div style={styles.buttonGroup}>
                        {([1, 2, 3] as const).map(dp => (
                            <button key={dp} onClick={() => set('decimalPlaces', dp)} style={styles.radioBtn(c.decimalPlaces === dp)}>{dp}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* MET REST */}
            {isDivision && !isDecimal && (
                <div style={styles.section}>
                    <label style={styles.label}>Uitkomst:</label>
                    <div style={styles.buttonGroup}>
                        <button onClick={() => set('withRemainder', false)} style={styles.radioBtn(!c.withRemainder)}>Exact</button>
                        <button onClick={() => set('withRemainder', true)} style={styles.radioBtn(!!c.withRemainder)}>Met rest</button>
                    </div>
                </div>
            )}

            {/* SCHATTING */}
            <div style={styles.section}>
                <label style={styles.label}>Voorafgaande schatting:</label>
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

            {/* BRUGINSTELLINGEN (+ and - only) */}
            {hasBridges && bridgePlaces.length > 0 && (
                <div style={styles.section}>
                    <label style={styles.groupLabel}>Bruginstellingen</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {bridgePlaces.map((place) => {
                            const cur = (c.bridges || {})[place.key] as ConstraintType | undefined;
                            return (
                                <div key={place.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', width: '28px', flexShrink: 0 }}>{place.key}:</span>
                                    <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                                        {(['FORBIDDEN', 'FREE', 'REQUIRED'] as ConstraintType[]).map(opt => (
                                            <button key={opt} onClick={() => setBridge(place.key, opt)} style={styles.bridgeBtn((cur ?? 'FREE') === opt)}>
                                                {opt === 'FORBIDDEN' ? 'GEEN' : opt === 'FREE' ? 'MAG' : 'MOET'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SPECIFIEKE GETALOPBOUW */}
            {maskPlaces.length > 0 && (
                <div style={styles.section}>
                    <label style={styles.groupLabel}>Specifieke getalopbouw</label>
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

        </div>
    );
}
