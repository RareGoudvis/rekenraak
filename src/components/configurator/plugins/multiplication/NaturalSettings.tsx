import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';
import PopupSelect from '../../../ui/PopupSelect';
import SettingLabel from '../SettingLabel';

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
                    <SettingLabel text={isDivision ? 'Selecteer delers:' : 'Selecteer tafels:'} info={isDivision ? 'Kies de deeltafels die in de oefeningen mogen voorkomen.' : 'Kies de tafels die in de oefeningen mogen voorkomen.'} />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                        {AVAILABLE_TABLES.map(t => (
                            <button key={t} onClick={() => toggleTable(t)} style={styles.maskBtn(selectedTables.includes(t))}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <SettingLabel text={isDivision ? 'Quotiënt tot:' : 'Vermenigvuldig tot:'} info={isDivision ? 'Tot welk veelvoud van de tafel je deelt (bv. tot 10× of 20×).' : 'Tot welk veelvoud van de tafel je vermenigvuldigt (bv. tot 10× of 20×).'} />
                    <PopupSelect
                        value={tableLimit}
                        options={[10, 20].map(val => ({ value: val, label: `Tot ${val}×` }))}
                        onChange={(val) => updateConstraint('tableLimit', val)}
                        ariaLabel={isDivision ? 'Quotiënt tot' : 'Vermenigvuldig tot'}
                    />
                </div>
            )}

            {/* DELEN MET REST (alleen voor deling) */}
            {isDivision && multiplicationMode === 'met_rest' && (
                <div style={{ padding: 'var(--sp-4)', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)' }}>
                    <SettingLabel text="Selecteer delers:" info="Kies de delers die in de oefeningen met rest mogen voorkomen." />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                        {MET_REST_TABLES.map(t => (
                            <button key={t} onClick={() => toggleTable(t)} style={styles.maskBtn(selectedTables.includes(t))}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <SettingLabel text="Niveau:" info="Moeilijkheidsgraad van de deling met rest (zie voorbeeld per niveau)." />
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
                            <SettingLabel text={isDivision ? 'Maximum deeltal:' : 'Maximum uitkomst:'} info={isDivision ? 'Het grootste deeltal (het getal dat gedeeld wordt).' : 'Het grootste antwoord dat mag voorkomen.'} />
                            <PopupSelect
                                clampToLowest
                                value={maxGetal}
                                options={[1000, 10000, 100000, 1000000].map(val => ({ value: val, label: `Tot ${val.toLocaleString('nl-BE')}` }))}
                                onChange={(val) => updateConstraint('maxGetal', val)}
                                ariaLabel={isDivision ? 'Maximum deeltal' : 'Maximum uitkomst'}
                            />
                        </div>

                        {/* Niveau-presets voor deling */}
                        {isDivision && (
                            <div style={styles.section}>
                                <SettingLabel text="Niveau preset (deler = 1 cijfer):" info="Kies een kant-en-klaar niveau voor delingen met een deler van 1 cijfer." />
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
                                <SettingLabel text="Specifieke getalopbouw" info="Kies welke posities een cijfer mogen bevatten. Leeg = vrij." />

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
