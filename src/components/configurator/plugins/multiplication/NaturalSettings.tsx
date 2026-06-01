import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';

interface Props { block: MathBlock; isDivision?: boolean; }

const AVAILABLE_TABLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 25, 50, 75];
const MET_REST_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const LEVEL_DESCRIPTIONS: Record<number, string> = {
    1: 'N1 — 360 : 6 = 60  (quotiënt = T)',
    2: 'N2 — 636 : 6 = 106  (quotiënt = H+E)',
    3: 'N3 — 678 : 6 = 113  (quotiënt = H+T+E)',
    4: 'N4 — 396 : 6 = 66  (quotiënt = T+E)',
    5: 'N5 — 711 : 6 = 118,5  (uitkomst max 1 decimaal)',
};

export default function NaturalSettings({ block, isDivision = false }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const {
        multiplicationMode = 'tafels',
        selectedTables = [2, 3, 4, 5, 10],
        tableLimit = 10,
        maxGetal = 1000,
        operand1Mask = {},
        operand2Mask = {},
        metRestLevel = 1,
        divisionLevel = 0,
    } = block.constraints;

    const updateConstraint = (key: string, value: unknown) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    };

    const toggleTable = (table: number) => {
        if (selectedTables.includes(table)) {
            updateConstraint('selectedTables', selectedTables.filter((t: number) => t !== table));
        } else {
            updateConstraint('selectedTables', [...selectedTables, table].sort((a: number, b: number) => a - b));
        }
    };

    const handleMaskToggle = (operand: 1 | 2, place: string) => {
        const key = operand === 1 ? 'operand1Mask' : 'operand2Mask';
        const currentMask = block.constraints[key] || {};
        updateConstraint(key, { ...currentMask, [place]: !currentMask[place] });
    };

    const applyLevelPreset = (level: number) => {
        updateBlockSettings(block.id, {
            constraints: { ...block.constraints, divisionLevel: level, operand1Mask: {}, operand2Mask: {} }
        });
    };

    return (
        <div>
            {/* SUB-MODUS SELECTIE */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => updateConstraint('multiplicationMode', 'tafels')}
                    style={styles.radioBtn(multiplicationMode === 'tafels')}
                >
                    {isDivision ? 'Deeltafels' : 'Tafels'}
                </button>
                {isDivision && (
                    <button
                        onClick={() => updateConstraint('multiplicationMode', 'met_rest')}
                        style={styles.radioBtn(multiplicationMode === 'met_rest')}
                    >
                        Met rest
                    </button>
                )}
                <button
                    onClick={() => updateConstraint('multiplicationMode', 'andere')}
                    style={styles.radioBtn(multiplicationMode === 'andere')}
                >
                    Andere
                </button>
            </div>

            {/* TAFELS / DEELTAFELS */}
            {multiplicationMode === 'tafels' && (
                <div style={{ padding: 'var(--sp-4)', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)' }}>
                    <label style={styles.label}>{isDivision ? 'Selecteer delers:' : 'Selecteer tafels:'}</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                        {AVAILABLE_TABLES.map(t => (
                            <button key={t} onClick={() => toggleTable(t)} style={styles.maskBtn(selectedTables.includes(t))}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <label style={styles.label}>{isDivision ? 'Quotiënt tot:' : 'Vermenigvuldig tot:'}</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => updateConstraint('tableLimit', 10)} style={styles.radioBtn(tableLimit === 10)}>Tot 10×</button>
                        <button onClick={() => updateConstraint('tableLimit', 20)} style={styles.radioBtn(tableLimit === 20)}>Tot 20×</button>
                    </div>
                </div>
            )}

            {/* DELEN MET REST (alleen voor deling) */}
            {isDivision && multiplicationMode === 'met_rest' && (
                <div style={{ padding: 'var(--sp-4)', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)' }}>
                    <label style={styles.label}>Selecteer delers:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                        {MET_REST_TABLES.map(t => (
                            <button key={t} onClick={() => toggleTable(t)} style={styles.maskBtn(selectedTables.includes(t))}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <label style={styles.label}>Niveau:</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {([
                            { level: 1, label: 'N1', example: 'TE ≤ 10×deler  (Bv. 52 : 6 = 8 r 4)' },
                            { level: 2, label: 'N2', example: 'TE > 10×deler  (Bv. 67 : 6 = 11 r 1)' },
                            { level: 3, label: 'N3', example: 'Driecijferig deeltal  (Bv. 127 : 6 = 21 r 1)' },
                        ] as const).map(({ level, label, example }) => {
                            const isActive = metRestLevel === level;
                            return (
                                <div key={level} onClick={() => updateConstraint('metRestLevel', level)} style={levelRowStyle(isActive)}>
                                    <span style={levelLabelStyle(isActive)}>{label}</span>
                                    <span style={levelExampleStyle}>{example}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ANDERE (met maskers + niveau-presets voor deling) */}
            {multiplicationMode === 'andere' && (() => {
                const availablePlaces = getMaskPlaces(maxGetal, 'natural');
                return (
                    <div>
                        <div style={styles.section}>
                            <label style={styles.label}>{isDivision ? 'Maximum deeltal:' : 'Maximum uitkomst:'}</label>
                            <div style={styles.buttonGroup}>
                                {[1000, 10000, 100000, 1000000].map(val => (
                                    <button key={val} onClick={() => updateConstraint('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>
                                        Tot {val.toLocaleString('nl-BE')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Niveau-presets voor deling */}
                        {isDivision && (
                            <div style={styles.section}>
                                <label style={styles.label}>Niveau preset (deler = 1 cijfer):</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {[1, 2, 3, 4, 5].map(level => {
                                        const isActive = divisionLevel === level;
                                        const [, example] = LEVEL_DESCRIPTIONS[level].split(' — ');
                                        return (
                                            <div key={level} onClick={() => applyLevelPreset(level)} style={levelRowStyle(isActive)}>
                                                <span style={levelLabelStyle(isActive)}>N{level}</span>
                                                <span style={levelExampleStyle}>{example}</span>
                                            </div>
                                        );
                                    })}
                                    <div onClick={() => applyLevelPreset(0)} style={levelRowStyle(divisionLevel === 0)}>
                                        <span style={levelLabelStyle(divisionLevel === 0)}>Vrij</span>
                                        <span style={levelExampleStyle}>Vrij via maskers</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Maskers: verborgen als een niveau-preset actief is */}
                        {(!isDivision || divisionLevel === 0) && (
                            <div style={styles.section}>
                                <label style={styles.groupLabel}>Specifieke getalopbouw</label>

                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', width: '56px', flexShrink: 0 }}>
                                        {isDivision ? 'Deeltal:' : 'Factor 1:'}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {availablePlaces.map(place => (
                                            <button key={`op1-${place.key}`} onClick={() => handleMaskToggle(1, place.key)} style={styles.maskBtn(operand1Mask[place.key])} title={place.label}>
                                                {place.key}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '56px', flexShrink: 0 }}>
                                        {isDivision ? 'Deler:' : 'Factor 2:'}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {availablePlaces.map(place => (
                                            <button key={`op2-${place.key}`} onClick={() => handleMaskToggle(2, place.key)} style={styles.maskBtn(operand2Mask[place.key])} title={place.label}>
                                                {place.key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}

// Bespoke "list-row selector" (N1–N5 levels) — same tint+ring selected language as
// the shared controls, expressed with tokens (no hardcoded hex).
const levelRowStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', border: `1px solid ${active ? 'var(--accent)' : 'var(--separator)'}`,
    backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-surface-2)',
    transition: 'background-color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out)',
});
const levelLabelStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 'var(--text-sm)', fontWeight: 600, minWidth: '28px', flexShrink: 0,
    color: active ? 'var(--accent)' : 'var(--text-muted)',
});
const levelExampleStyle: React.CSSProperties = {
    fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace',
};
