import { useConstraints } from '../../useConstraints';
import { useHiddenControls } from '../../ConstraintScope';
import type { MathBlock } from '../../../../services/math/types';
import { sharedPluginStyles as styles } from '../sharedPluginStyles';
import { getMaskPlaces } from '../../../../services/math/mathEngine';
import PopupSelect from '../../../ui/PopupSelect';
import { presetLabel, floorToPreset, metRestLevelFits, clipMetRestLevel, MET_REST_LEVEL_MIN_MAX, TAFEL_LIMITS, TAFEL_FROM, TAFEL_PRODUCT_MAX, effectiveTableFrom } from '../../../../config/numberRanges';
import { REGISTRY } from '../../../../config/exerciseRegistry';
import { useWorksheetStore } from '../../../../store/useWorksheetStore';
import { useMaxPresets } from '../../useMaxPresets';
import SettingLabel from '../SettingLabel';
import type { MulDivConstraints } from '../../../../services/math/constraintTypes';

interface Props { block: MathBlock; isDivision?: boolean; }

const AVAILABLE_TABLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 25, 50, 75];
const MET_REST_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const LEVEL_DESCRIPTIONS: Record<number, string> = {
    1: 'N1 — 360 : 6 = 60  (quotiënt = T)',
    2: 'N2 — 84 : 7 = 12  (TE : E, 2 cijfers)',
    3: 'N3 — 636 : 6 = 106  (quotiënt = H+E)',
    4: 'N4 — 678 : 6 = 113  (quotiënt = H+T+E)',
    5: 'N5 — 396 : 6 = 66  (quotiënt = T+E)',
    6: 'N6 — 711 : 6 = 118,5  (uitkomst max 1 decimaal)',
};
const DIVISION_LEVELS = [1, 2, 3, 4, 5, 6];

export default function NaturalSettings({ block, isDivision = false }: Props) {
    const [c, patch] = useConstraints<MulDivConstraints>(block);
    // Shared keys (maxGetal) are rendered by the gemengd panel instead; empty outside it.
    const hidden = useHiddenControls();
    const range = useMaxPresets(block);
    const baseMaxGetal = useWorksheetStore((s) => s.baseSettings.baseMaxGetal);
    const {
        multiplicationMode = 'tafels',
        selectedTables = [2, 3, 4, 5, 10],
        tableLimit = 10,
        maxGetal = 1000,
        operand1Mask = {},
        operand2Mask = {},
        metRestLevel = 1,
        metRestKladlijn = false,
        divisionLevel = 0,
        divisionLevels,
        tableProductMax = 0,
    } = c;
    // The three × extras act on 2-factor sums only (3-4 factor chains have their own draw).
    const mulExtras = !isDivision && (c.termCount ?? 2) <= 2;
    const tableFrom = effectiveTableFrom(c.tableFrom, tableLimit);
    // Absent keeps each mode's old order, so the switch shows that: tafels mixed (AAN), andere fixed (UIT).
    const swapOn = c.swapFactors ?? multiplicationMode === 'tafels';

    // Multi-select niveaus: array wins; back-compat seed from the old single `divisionLevel`.
    const selectedLevels: number[] = Array.isArray(divisionLevels)
        ? divisionLevels
        : (divisionLevel >= 1 ? [divisionLevel] : []);

    const updateConstraint = (key: string, value: unknown) => {
        patch({ [key]: value } as Partial<MulDivConstraints>);
    };

    const toggleTable = (table: number) => {
        if (selectedTables.includes(table)) {
            const next = selectedTables.filter((t: number) => t !== table);
            // Keep ≥1 of the tables this mode shows (never only 0 as a deler): none left generates no sums.
            const shown = multiplicationMode === 'met_rest' ? MET_REST_TABLES : AVAILABLE_TABLES;
            if (next.some(t => shown.includes(t) && !(isDivision && t === 0))) updateConstraint('selectedTables', next);
        } else {
            updateConstraint('selectedTables', [...selectedTables, table].sort((a: number, b: number) => a - b));
        }
    };

    const handleMaskToggle = (operand: 1 | 2, place: string) => {
        const key = operand === 1 ? 'operand1Mask' : 'operand2Mask';
        const currentMask = c[key] ?? {};
        updateConstraint(key, { ...currentMask, [place]: !currentMask[place] });
    };

    // Toggle a niveau in/out of the multi-select set. Selecting any level clears the masks
    // (niveau presets and masks are mutually exclusive) and the legacy single `divisionLevel`.
    const toggleLevel = (level: number) => {
        const next = selectedLevels.includes(level)
            ? selectedLevels.filter(l => l !== level)
            : [...selectedLevels, level].sort((a, b) => a - b);
        patch({ divisionLevels: next, divisionLevel: 0, operand1Mask: {}, operand2Mask: {} });
    };
    const clearLevels = () => {
        patch({ divisionLevels: [], divisionLevel: 0 });
    };

    // Tafels has no max picker, so its maxGetal is the untouched registry default: entering
    // met rest seeds the deeltal max from the base (the leerjaar) like a new block would.
    // Inside a gemengd tab the shared max belongs to the gemengd panel, so it stays put.
    const enterMetRest = () => {
        if (multiplicationMode === 'met_rest') return;
        const next = { ...c, multiplicationMode: 'met_rest' as const };
        const metRange = hidden.has('maxGetal') ? null : REGISTRY[block.typeId]?.maxPresets?.(next);
        if (!metRange) { patch({ multiplicationMode: 'met_rest' }); return; }
        const seeded = floorToPreset(baseMaxGetal, metRange.presets);
        patch({ multiplicationMode: 'met_rest', [metRange.key]: seeded, metRestLevel: clipMetRestLevel(metRestLevel, seeded) } as Partial<MulDivConstraints>);
    };
    // Deeltafels picks Met rest does not list stay selected (and 0 / 1 make no rest), so they show
    // greyed with a note: tafels [1] alone otherwise left a dead block with no reason on screen.
    const otherPicks = selectedTables.filter(t => !MET_REST_TABLES.includes(t));
    const noRestDeler = !selectedTables.some(t => t > 1);
    // A niveau the deeltal max cannot hold is shown disabled; the stored one is clipped down.
    const activeMetRestLevel = clipMetRestLevel(metRestLevel, maxGetal);
    const blockedMetRestLevels = [1, 2, 3].filter(l => !metRestLevelFits(l, maxGetal));

    return (
        // Wrapper margin (not the inner sectionBox) keeps a gap before whatever
        // settings section the parent config plugin renders next.
        <div style={styles.section}>
            {/* SUB-MODUS SELECTIE */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                    onClick={() => updateConstraint('multiplicationMode', 'tafels')}
                    aria-pressed={multiplicationMode === 'tafels'} style={styles.radioBtn(multiplicationMode === 'tafels')}
                >
                    {isDivision ? 'Deeltafels' : 'Tafels'}
                </button>
                {isDivision && (
                    <button
                        onClick={enterMetRest}
                        title="Niet-opgaande delingen: de deling gaat niet op, er blijft een rest over (52 : 6 = 8 r 4)."
                        aria-pressed={multiplicationMode === 'met_rest'} style={styles.radioBtn(multiplicationMode === 'met_rest')}
                    >
                        Met rest
                    </button>
                )}
                <button
                    onClick={() => updateConstraint('multiplicationMode', 'andere')}
                    aria-pressed={multiplicationMode === 'andere'} style={styles.radioBtn(multiplicationMode === 'andere')}
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
                            <button key={t} onClick={() => toggleTable(t)} aria-pressed={selectedTables.includes(t)} style={styles.maskBtn(selectedTables.includes(t))}>
                                {t}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 0' }}>
                            <SettingLabel text={isDivision ? 'Quotiënt tot:' : 'Vermenigvuldig tot:'} info={isDivision ? 'Tot welk veelvoud van de tafel je deelt (bv. tot 10× of 20×).' : 'Tot welk veelvoud van de tafel je vermenigvuldigt (bv. tot 10× of 20×).'} />
                            <PopupSelect
                                value={tableLimit}
                                options={TAFEL_LIMITS.map(val => ({ value: val, label: `Tot ${val}×` }))}
                                // A "Vanaf" at or past the new "tot" would be ignored; reset it so it cannot return later.
                                onChange={(val) => patch(mulExtras && tableFrom >= val ? { tableLimit: val, tableFrom: 1 } : { tableLimit: val })}
                                ariaLabel={isDivision ? 'Quotiënt tot' : 'Vermenigvuldig tot'}
                            />
                        </div>
                        {mulExtras && (
                            <div style={{ flex: '1 1 0' }}>
                                <SettingLabel text="Vanaf:" info="Het kleinste veelvoud. Vanaf 11× tot 20× geeft 6 × 16 of 7 × 13, maar geen gewone tafelsommen." />
                                <PopupSelect
                                    value={tableFrom}
                                    options={TAFEL_FROM.filter(v => v < tableLimit).map(val => ({ value: val, label: `Vanaf ${val}×` }))}
                                    onChange={(val) => updateConstraint('tableFrom', val)}
                                    ariaLabel="Vanaf"
                                />
                            </div>
                        )}
                    </div>
                    {mulExtras && (
                        <div style={{ marginTop: 'var(--sp-4)' }}>
                            <SettingLabel text="Uitkomst tot:" info="Laat sommen met een grotere uitkomst weg (bij tot 100 valt 9 × 16 = 144 weg)." />
                            <PopupSelect
                                value={tableProductMax > 0 ? tableProductMax : 0}
                                options={[{ value: 0, label: 'Geen' }, ...TAFEL_PRODUCT_MAX.map(val => ({ value: val, label: presetLabel(val) }))]}
                                onChange={(val) => updateConstraint('tableProductMax', val)}
                                ariaLabel="Uitkomst tot"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* DELEN MET REST (alleen voor deling) */}
            {isDivision && multiplicationMode === 'met_rest' && (
                <div style={{ padding: 'var(--sp-4)', backgroundColor: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)' }}>
                    <p style={{ ...styles.hint, marginTop: 0 }}>Niet-opgaande delingen: de deling gaat niet op en er blijft een rest over (52 : 6 = 8 r 4).</p>
                    <SettingLabel text="Selecteer delers:" info="Kies de delers die in de oefeningen met rest mogen voorkomen." />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                        {MET_REST_TABLES.map(t => (
                            <button key={t} onClick={() => toggleTable(t)} aria-pressed={selectedTables.includes(t)} style={styles.maskBtn(selectedTables.includes(t))}>
                                {t}
                            </button>
                        ))}
                        {otherPicks.map(t => (
                            <button key={`other-${t}`} disabled aria-pressed title="Gekozen bij Deeltafels; daar kies je het uit."
                                style={{ ...styles.maskBtn(true), opacity: 0.45, cursor: 'not-allowed' }}>
                                {t}
                            </button>
                        ))}
                    </div>
                    {otherPicks.length > 0 && (
                        <p style={styles.hint}>
                            Ook gekozen bij Deeltafels: {otherPicks.join(', ')}.{otherPicks.some(t => t <= 1) ? ' Delen door 0 of 1 geeft geen rest.' : ''}
                        </p>
                    )}
                    {noRestDeler && <p style={styles.hint}>Kies minstens één deler van 2 tot 12: zonder deler zijn er geen oefeningen.</p>}
                    {range && !hidden.has('maxGetal') && <div style={styles.section}>
                        <SettingLabel text="Maximum deeltal:" info="Het grootste deeltal (het getal dat gedeeld wordt)." />
                        <PopupSelect
                            clampToLowest
                            value={maxGetal}
                            options={range.presets.map(val => ({ value: val, label: presetLabel(val) }))}
                            onChange={(val) => patch({ maxGetal: val, metRestLevel: clipMetRestLevel(metRestLevel, val) })}
                            ariaLabel="Maximum deeltal"
                        />
                    </div>}
                    <SettingLabel text="Niveau:" info="Moeilijkheidsgraad van de deling met rest (zie voorbeeld per niveau)." />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {([
                            { level: 1, label: 'N1', example: 'TE ≤ 10×deler  (Bv. 52 : 6 = 8 r 4)' },
                            { level: 2, label: 'N2', example: 'TE > 10×deler  (Bv. 67 : 6 = 11 r 1)' },
                            { level: 3, label: 'N3', example: 'Driecijferig deeltal  (Bv. 127 : 6 = 21 r 1)' },
                        ] as const).map(({ level, label, example }) => {
                            const fits = metRestLevelFits(level, maxGetal);
                            const isActive = activeMetRestLevel === level;
                            return (
                                <div
                                    key={level}
                                    onClick={fits ? () => updateConstraint('metRestLevel', level) : undefined}
                                    aria-disabled={!fits}
                                    title={fits ? undefined : `Vraagt een maximum deeltal van ${MET_REST_LEVEL_MIN_MAX[level].toLocaleString('nl-BE')}.`}
                                    style={{ ...levelRowStyle(isActive), ...(fits ? {} : { opacity: 0.45, cursor: 'not-allowed' }) }}
                                >
                                    <span style={levelLabelStyle(isActive)}>{label}</span>
                                    <span style={levelExampleStyle}>{example}</span>
                                </div>
                            );
                        })}
                    </div>
                    {blockedMetRestLevels.length > 0 && (
                        <p style={styles.hint}>
                            {blockedMetRestLevels.map(l => `N${l}`).join(' en ')} {blockedMetRestLevels.length > 1 ? 'passen' : 'past'} niet onder het maximum deeltal.
                        </p>
                    )}
                    <div style={{ marginTop: 'var(--sp-4)' }}>
                        <div style={styles.onOffRow}>
                            <SettingLabel text="Kladlijn voor de veelvouden" info="Een lijn naast elke deling. De leerling schrijft er de veelvouden van de deler onder en boven het deeltal (bv. 6 × 9 = 54 · 6 × 10 = 60). Op de correctiesleutel staan ze in het rood." />
                            <button onClick={() => updateConstraint('metRestKladlijn', !metRestKladlijn)} aria-pressed={metRestKladlijn} style={styles.onOffBtn(metRestKladlijn)}>
                                {metRestKladlijn ? 'AAN' : 'UIT'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ANDERE (met maskers + niveau-presets voor deling) */}
            {multiplicationMode === 'andere' && (() => {
                const availablePlaces = getMaskPlaces(maxGetal, 'natural');
                return (
                    <div>
                        {range && !hidden.has('maxGetal') && <div style={styles.section}>
                            <SettingLabel text={isDivision ? 'Maximum deeltal:' : 'Maximum uitkomst:'} info={isDivision ? 'Het grootste deeltal (het getal dat gedeeld wordt).' : 'Het grootste antwoord dat mag voorkomen.'} />
                            <PopupSelect
                                clampToLowest
                                value={maxGetal}
                                options={range.presets.map(val => ({ value: val, label: presetLabel(val) }))}
                                onChange={(val) => updateConstraint('maxGetal', val)}
                                ariaLabel={isDivision ? 'Maximum deeltal' : 'Maximum uitkomst'}
                            />
                        </div>}

                        {/* Niveau-presets voor deling */}
                        {isDivision && (
                            <div style={styles.section}>
                                <SettingLabel text="Niveau preset (deler = 1 cijfer):" info="Kies één of meerdere niveaus; bij meerdere worden de oefeningen gemengd." />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {DIVISION_LEVELS.map(level => {
                                        const isActive = selectedLevels.includes(level);
                                        const [, example] = LEVEL_DESCRIPTIONS[level].split(' — ');
                                        return (
                                            <div key={level} onClick={() => toggleLevel(level)} style={levelRowStyle(isActive)}>
                                                <span style={levelLabelStyle(isActive)}>N{level}</span>
                                                <span style={levelExampleStyle}>{example}</span>
                                            </div>
                                        );
                                    })}
                                    <div onClick={clearLevels} style={levelRowStyle(selectedLevels.length === 0)}>
                                        <span style={levelLabelStyle(selectedLevels.length === 0)}>Vrij</span>
                                        <span style={levelExampleStyle}>Vrij via maskers</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Maskers: verborgen als een niveau-preset actief is */}
                        {(!isDivision || selectedLevels.length === 0) && (
                            <div style={styles.section}>
                                <SettingLabel text="Specifieke getalopbouw" info="Kies welke posities een cijfer mogen bevatten. Leeg = vrij." />

                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', width: '56px', flexShrink: 0 }}>
                                        {isDivision ? 'Deeltal:' : 'Factor 1:'}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {availablePlaces.map(place => (
                                            <button key={`op1-${place.key}`} onClick={() => handleMaskToggle(1, place.key)} aria-pressed={!!operand1Mask[place.key]} style={styles.maskBtn(operand1Mask[place.key])} title={place.label}>
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
                                            <button key={`op2-${place.key}`} onClick={() => handleMaskToggle(2, place.key)} aria-pressed={!!operand2Mask[place.key]} style={styles.maskBtn(operand2Mask[place.key])} title={place.label}>
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

            {/* FACTOREN WISSELEN (× tafels en andere) */}
            {mulExtras && (multiplicationMode === 'tafels' || multiplicationMode === 'andere') && (
                <div style={{ marginTop: 'var(--sp-4)' }}>
                    <div style={styles.onOffRow}>
                        <SettingLabel text="Factoren wisselen" info="AAN: elke som zet een van beide factoren vooraan (79 × 6 of 6 × 79). UIT: een vaste volgorde (bij tafels eerst het veelvoud, dan de tafel: 3 × 7)." />
                        <button onClick={() => updateConstraint('swapFactors', !swapOn)} aria-pressed={swapOn} style={styles.onOffBtn(swapOn)}>
                            {swapOn ? 'AAN' : 'UIT'}
                        </button>
                    </div>
                </div>
            )}
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
