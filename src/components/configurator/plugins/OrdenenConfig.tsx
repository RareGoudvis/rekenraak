import { useWorksheetStore } from '../../../store/useWorksheetStore';
import type { MathBlock } from '../../../services/math/types';
import { sharedPluginStyles as styles } from './sharedPluginStyles';

interface Props {
    block: MathBlock;
}

const MAX_PRESETS = [20, 100, 1000, 10000, 100000];
const OPERATORS = [
    { val: 'oplopend', label: 'Oplopend (<)' },
    { val: 'aflopend', label: 'Aflopend (>)' },
    { val: 'beide', label: 'Beide' },
];

export default function OrdenenConfig({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

    const {
        count = 3,
        operatorMode = 'oplopend',
        maxGetal = 100,
        numberType = 'natural',
    } = block.constraints;

    const set = (key: string, value: unknown) =>
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });

    return (
        <div style={styles.container}>
            {/* OPERATOR */}
            <div style={styles.section}>
                <label style={styles.label}>Volgorde:</label>
                <div style={styles.buttonGroup}>
                    {OPERATORS.map(o => (
                        <button key={o.val} onClick={() => set('operatorMode', o.val)} style={styles.radioBtn(operatorMode === o.val)}>
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* COUNT */}
            <div style={styles.section}>
                <label style={styles.label}>Aantal getallen per reeks: {count}</label>
                <input
                    type="range" min="3" max="5" step="1"
                    value={count}
                    onChange={(e) => set('count', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                />
            </div>

            {/* MAX — natural/decimal/geheel only (rationals use denominators) */}
            {numberType !== 'rational' && (
                <div style={styles.section}>
                    <label style={styles.label}>Maximum getal:</label>
                    <div style={styles.buttonGroup}>
                        {MAX_PRESETS.map(val => (
                            <button key={val} onClick={() => set('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>
                                Tot {val.toLocaleString('nl-BE')}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
