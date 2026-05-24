import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';

interface Props { block: MathBlock; }

const AVAILABLE_TABLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 25, 50, 75];

export default function NaturalSettings({ block }: Props) {
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const {
        multiplicationMode = 'tafels',
        selectedTables = [2, 3, 4, 5, 10],
        tableLimit = 10,
        maxGetal = 1000,
        operand1Mask = {},
        operand2Mask = {}
    } = block.constraints;

    const updateConstraint = (key: string, value: any) => {
        updateBlockSettings(block.id, { constraints: { ...block.constraints, [key]: value } });
    };

    const toggleTable = (table: number) => {
        if (selectedTables.includes(table)) {
            updateConstraint('selectedTables', selectedTables.filter((t: number) => t !== table));
        } else {
            updateConstraint('selectedTables', [...selectedTables, table].sort((a, b) => a - b));
        }
    };

    const handleMaskToggle = (operand: 1 | 2, place: string) => {
        const key = operand === 1 ? 'operand1Mask' : 'operand2Mask';
        const currentMask = block.constraints[key] || {};
        updateConstraint(key, { ...currentMask, [place]: !currentMask[place] });
    };

    return (
        <div>
            {/* SUB-MODUS SELECTIE */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button
                    onClick={() => updateConstraint('multiplicationMode', 'tafels')}
                    style={styles.radioBtn(multiplicationMode === 'tafels')}
                >
                    Tafels
                </button>
                <button
                    onClick={() => updateConstraint('multiplicationMode', 'andere')}
                    style={styles.radioBtn(multiplicationMode === 'andere')}
                >
                    Andere
                </button>
            </div>

            {/* SCENARIO A: TAFELS */}
            {multiplicationMode === 'tafels' && (
                <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <label style={styles.label}>Selecteer tafels:</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                        {AVAILABLE_TABLES.map(t => (
                            <button
                                key={t}
                                onClick={() => toggleTable(t)}
                                style={tableBtnStyle(selectedTables.includes(t))}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <label style={styles.label}>Vermenigvuldig tot:</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => updateConstraint('tableLimit', 10)} style={styles.radioBtn(tableLimit === 10)}>Tot 10x</button>
                        <button onClick={() => updateConstraint('tableLimit', 20)} style={styles.radioBtn(tableLimit === 20)}>Tot 20x</button>
                    </div>
                </div>
            )}

            {/* SCENARIO B: ANDERE (SPECIFIEKE OPBOUW) */}
            {/* SCENARIO B: ANDERE (SPECIFIEKE OPBOUW) */}
            {multiplicationMode === 'andere' && (() => {
                // 🔥 Bereken de dynamische maskers gebaseerd op maxGetal
                const availablePlaces = getMaskPlaces(maxGetal, 'natural');

                return (
                    <div>
                        <div style={styles.section}>
                            <label style={styles.label}>Maximum uitkomst:</label>
                            <div style={styles.buttonGroup}>
                                {[1000, 10000, 100000, 1000000].map(val => (
                                    <button key={val} onClick={() => updateConstraint('maxGetal', val)} style={styles.radioBtn(maxGetal === val)}>
                                        Tot {val.toLocaleString('nl-BE')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <h4 style={{ color: 'white', fontSize: '14px', margin: '0 0 16px 0' }}>Specifieke getalopbouw</h4>

                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '60px' }}>Factor 1:</span>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {availablePlaces.map(place => (
                                        <button key={`op1-${place.key}`} onClick={() => handleMaskToggle(1, place.key)} style={maskBtnStyle(operand1Mask[place.key])} title={place.label}>
                                            {place.key}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '60px' }}>Factor 2:</span>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {availablePlaces.map(place => (
                                        <button key={`op2-${place.key}`} onClick={() => handleMaskToggle(2, place.key)} style={maskBtnStyle(operand2Mask[place.key])} title={place.label}>
                                            {place.key}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

const tableBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', border: 'none', cursor: 'pointer',
    backgroundColor: active ? 'var(--accent-purple)' : '#222226',
    color: active ? 'white' : 'var(--text-muted)',
    transition: 'all 0.15s'
});

const maskBtnStyle = (active: boolean): React.CSSProperties => ({
    width: '32px', height: '32px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
    backgroundColor: active ? 'var(--accent-purple)' : '#222226',
    color: active ? 'white' : 'var(--text-muted)', border: 'none'
});