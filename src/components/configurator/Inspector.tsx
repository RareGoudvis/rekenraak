import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useWorksheetStore, DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type HeaderField } from '../../store/useWorksheetStore';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { DENOMINATION_CATALOGUE, denominationLabel } from '../../services/geld/geldGenerator';
import { regenerateBlock } from '../../services/generateDispatch';
import { recomputeSplitsenExercise } from '../../services/splitsen/splitsenGenerator';
import { formatMathNumber } from '../../services/math/formatters';

const HR_STD_TYPES = ['optellen', 'aftrekken', 'vermenigvuldigen', 'delen'];
const isHrStd = (typeId: string) => HR_STD_TYPES.some(t => typeId.includes(t));

const FIELD_RANGE: Record<HeaderField, { min: number; max: number; label: string }> = {
    naam:   { min: 100, max: 500, label: 'Naam' },
    klas:   { min: 60,  max: 300, label: 'Klas' },
    nummer: { min: 50,  max: 200, label: 'Nummer' },
    datum:  { min: 80,  max: 500, label: 'Datum' },
};

export default function Inspector() {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [hoveredField, setHoveredField] = useState<HeaderField | null>(null);

    const activeBlockId = useWorksheetStore((state) => state.activeBlockId);
    const activeBlock = useWorksheetStore((state) => state.blocks.find(b => b.id === activeBlockId));
    const locked = useWorksheetStore((state) => !!state.curriculum?.locked);

    const headerData = useWorksheetStore((state) => state.header);
    const footerData = useWorksheetStore((state) => state.footer);
    const docSettings = useWorksheetStore((state) => state.docSettings);
    const updateHeader = useWorksheetStore((state) => state.updateHeader);
    const updateFooter = useWorksheetStore((state) => state.updateFooter);
    const updateDocSettings = useWorksheetStore((state) => state.updateDocSettings);

    const updateBlockInstruction = useWorksheetStore((state) => state.updateBlockInstruction);
    const updateBlockLayout = useWorksheetStore((state) => state.updateBlockLayout);
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const setExercises = useWorksheetStore((state) => state.setExercises);
    const patchExercise = useWorksheetStore((state) => state.patchExercise);

    const handleGenerate = () => {
        if (!activeBlock) return;
        regenerateBlock(activeBlock, setExercises);
    };

    // No block selected or document → document settings
    if (!activeBlock) {
        return (
            <aside style={S.sidebar}>

                {/* ── Werkbundel instellingen ── */}
                <div style={S.card}>
                    <h4 style={S.cardTitle}>Werkbundel</h4>
                    <div style={S.col}>
                        <label style={S.label}>Documenttitel</label>
                        <input style={S.input} value={headerData.titel || ''} onChange={(e) => updateHeader({ titel: e.target.value })} placeholder="Bv. Herhalingstoets" />

                        <label style={{ ...S.label, marginTop: '12px' }}>Koptekst stijl</label>
                        <div style={S.btnGroup}>
                            {(['geen', 'kader'] as const).map((s) => (
                                <button key={s} onClick={() => updateDocSettings({ headerStyle: s })} style={S.radioBtn(docSettings.headerStyle === s)}>
                                    {s === 'geen' ? 'Geen' : 'Kader'}
                                </button>
                            ))}
                        </div>

                        <label style={{ ...S.label, marginTop: '12px' }}>Titel positie</label>
                        <div style={S.btnGroup}>
                            {(['left', 'center', 'right'] as const).map((p) => (
                                <button key={p} onClick={() => updateDocSettings({ titlePosition: p })} style={S.radioBtn((docSettings.titlePosition ?? 'center') === p)}>
                                    {p === 'left' ? 'Links' : p === 'center' ? 'Midden' : 'Rechts'}
                                </button>
                            ))}
                        </div>

                        {(docSettings.titlePosition === 'left' || docSettings.titlePosition === 'right') && (
                            <>
                                <label style={{ ...S.label, marginTop: '12px' }}>Marge titel–velden: {docSettings.titleFieldsGap ?? 16}px</label>
                                <input type="range" min="4" max="64" step="2"
                                    value={docSettings.titleFieldsGap ?? 16}
                                    onChange={(e) => updateDocSettings({ titleFieldsGap: Number(e.target.value) })}
                                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                            </>
                        )}

                        <label style={{ ...S.label, marginTop: '12px' }}>Ruimte onder koptekst: {docSettings.headerContentGap ?? 12}px</label>
                        <input type="range" min="0" max="60" step="2"
                            value={docSettings.headerContentGap ?? 12}
                            onChange={(e) => updateDocSettings({ headerContentGap: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />

                        <label style={{ ...S.label, marginTop: '12px' }}>Ruimte tussen oefenreeksen: {docSettings.blockSpacing ?? 12}px</label>
                        <input type="range" min="4" max="48" step="2"
                            value={docSettings.blockSpacing ?? 12}
                            onChange={(e) => updateDocSettings({ blockSpacing: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />

                        <label style={{ ...S.label, marginTop: '12px' }}>Koptekst velden</label>
                        {(() => {
                            const order = headerData.fieldOrder ?? DEFAULT_FIELD_ORDER;
                            const widths = headerData.fieldWidths ?? DEFAULT_FIELD_WIDTHS;
                            const moveField = (field: HeaderField, dir: -1 | 1) => {
                                const idx = order.indexOf(field);
                                if (idx === -1) return;
                                const newIdx = idx + dir;
                                if (newIdx < 0 || newIdx >= order.length) return;
                                const next = [...order];
                                [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
                                updateHeader({ fieldOrder: next });
                            };
                            const setFieldWidth = (field: HeaderField, w: number) => {
                                updateHeader({ fieldWidths: { ...DEFAULT_FIELD_WIDTHS, ...widths, [field]: w } });
                            };
                            const toggleField = (field: HeaderField) => updateHeader({ [field]: !headerData[field] } as Partial<typeof headerData>);
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                    {order.map((field, idx) => {
                                        const range = FIELD_RANGE[field];
                                        const w = widths[field] ?? DEFAULT_FIELD_WIDTHS[field];
                                        const enabled = headerData[field] as boolean;
                                        const hovered = hoveredField === field;
                                        return (
                                            <div
                                                key={field}
                                                onMouseEnter={() => setHoveredField(field)}
                                                onMouseLeave={() => setHoveredField(null)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    padding: '4px 6px', borderRadius: '6px',
                                                    backgroundColor: hovered ? 'var(--bg-input)' : 'transparent',
                                                    transition: 'background-color 0.15s',
                                                }}
                                            >
                                                <label style={{ ...S.checkboxLabel, minWidth: '70px', flexShrink: 0 }}>
                                                    <input type="checkbox" checked={enabled} onChange={() => toggleField(field)} style={S.checkbox} />
                                                    {range.label}
                                                </label>
                                                <input
                                                    type="range" min={range.min} max={range.max} step={5}
                                                    value={w}
                                                    disabled={!enabled}
                                                    onChange={(e) => setFieldWidth(field, Number(e.target.value))}
                                                    style={{ flex: 1, accentColor: 'var(--accent-purple)', cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.4 }}
                                                />
                                                <span style={{ minWidth: '40px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>{w}px</span>
                                                <div style={{
                                                    display: 'flex', gap: '2px', flexShrink: 0,
                                                    opacity: hovered ? 1 : 0,
                                                    pointerEvents: hovered ? 'auto' : 'none',
                                                    transition: 'opacity 0.15s',
                                                }}>
                                                    <button onClick={() => moveField(field, -1)} disabled={idx === 0} title="Veld omhoog" aria-label="Veld omhoog" style={miniMoveBtn(idx === 0)}>
                                                        <ArrowUp size={12} />
                                                    </button>
                                                    <button onClick={() => moveField(field, 1)} disabled={idx === order.length - 1} title="Veld omlaag" aria-label="Veld omlaag" style={miniMoveBtn(idx === order.length - 1)}>
                                                        <ArrowDown size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        <label style={{ ...S.checkboxLabel, marginTop: '12px' }}>
                            <input type="checkbox" checked={!!headerData.repeatHeader} onChange={(e) => updateHeader({ repeatHeader: e.target.checked })} style={S.checkbox} />
                            Koptekst op elke pagina herhalen
                        </label>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '2px 0 0 24px' }}>Enkel bij afdrukken: de naamvelden komen bovenaan elke pagina.</p>
                    </div>
                </div>

                {/* ── Opdrachtinstellingen ── */}
                <div style={S.card}>
                    <h4 style={S.cardTitle}>Opdrachtinstellingen</h4>
                    <div style={S.col}>
                        <label style={S.checkboxLabel}><input type="checkbox" checked={docSettings.showScores} onChange={(e) => updateDocSettings({ showScores: e.target.checked })} style={S.checkbox} /> Scores tonen</label>
                        <label style={S.checkboxLabel}><input type="checkbox" checked={docSettings.showDividers} onChange={(e) => updateDocSettings({ showDividers: e.target.checked })} style={S.checkbox} /> Scheidingslijn tussen oefeningen</label>
                        <label style={S.checkboxLabel}><input type="checkbox" checked={docSettings.numberBlocks} onChange={(e) => updateDocSettings({ numberBlocks: e.target.checked })} style={S.checkbox} /> Opdrachten nummeren</label>

                        <label style={{ ...S.label, marginTop: '10px' }}>Opdracht stijl</label>
                        <div style={S.btnGroup}>
                            {(['regular', 'underlined', 'boxed'] as const).map((s) => (
                                <button key={s} onClick={() => updateDocSettings({ opdrachtTitelStyle: s })} style={S.radioBtn(docSettings.opdrachtTitelStyle === s)}>
                                    {s === 'regular' ? 'Normaal' : s === 'underlined' ? 'Onderstreept' : 'Kader'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Voettekst ── */}
                <div style={S.card}>
                    <h4 style={S.cardTitle}>Voettekst</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 8px' }}>Voettekst wordt zichtbaar bij afdrukken.</p>
                    <div style={S.col}>
                        <label style={S.footerGroupLabel}>Links</label>
                        <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={S.checkboxLabel}><input type="checkbox" checked={footerData.showSchool} onChange={(e) => updateFooter({ showSchool: e.target.checked })} style={S.checkbox} /> School</label>
                            {footerData.showSchool && <input style={{ ...S.input, marginBottom: '4px' }} value={footerData.school || ''} onChange={(e) => updateFooter({ school: e.target.value })} placeholder="Bv. VBS De Vlinder" />}
                            <label style={S.checkboxLabel}><input type="checkbox" checked={footerData.showKlas} onChange={(e) => updateFooter({ showKlas: e.target.checked })} style={S.checkbox} /> Klas</label>
                            {footerData.showKlas && <input style={{ ...S.input, marginBottom: '4px' }} value={footerData.klas || ''} onChange={(e) => updateFooter({ klas: e.target.value })} placeholder="Bv. L3a" />}
                            <label style={S.checkboxLabel}><input type="checkbox" checked={footerData.showLeerkracht} onChange={(e) => updateFooter({ showLeerkracht: e.target.checked })} style={S.checkbox} /> Leerkracht</label>
                            {footerData.showLeerkracht && <input style={{ ...S.input, marginBottom: '4px' }} value={footerData.leerkracht || ''} onChange={(e) => updateFooter({ leerkracht: e.target.value })} placeholder="Bv. Meester Ruben" />}
                        </div>

                        <label style={{ ...S.footerGroupLabel, marginTop: '10px' }}>Rechts</label>
                        <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={S.checkboxLabel}><input type="checkbox" checked={footerData.showCenterText} onChange={(e) => updateFooter({ showCenterText: e.target.checked })} style={S.checkbox} /> Vrije tekst</label>
                            {footerData.showCenterText && <input style={S.input} value={footerData.centerText || ''} onChange={(e) => updateFooter({ centerText: e.target.value })} placeholder="Voettekst rechts" />}
                        </div>
                    </div>
                </div>
            </aside>
        );
    }

    const c = activeBlock.constraints;
    const subType: string = c.subType ?? '';
    const updateConstraint = (key: string, value: unknown) =>
        updateBlockSettings(activeBlock.id, { constraints: { ...c, [key]: value } });

    return (
        <aside style={S.sidebar}>

            {locked && (
                <div style={S.lockBanner}>
                    🔒 Vergrendeld curriculum — je kan enkel het aantal aanpassen en opnieuw genereren.
                </div>
            )}

            {/* ── 1. Opdrachtblok ── */}
            {(() => {
                const aantal = activeBlock.numberOfExercises || 10;
                const scoreMax = Math.max(1, aantal * 2);   // Score caps at 2 points per exercise
                const sliderStyle = (on: boolean): React.CSSProperties => ({ width: '100%', accentColor: 'var(--accent-purple)', cursor: on ? 'pointer' : 'not-allowed', opacity: on ? 1 : 0.5 });
                return (
                    <div style={S.card}>
                        <h4 style={S.cardTitle}>Opdrachtblok</h4>
                        <div style={S.col}>
                            <label style={S.label}>Instructie</label>
                            <input
                                style={S.input}
                                value={activeBlock.instructionText || ''}
                                onChange={(e) => updateBlockInstruction(activeBlock.id, e.target.value)}
                                placeholder="Los op."
                                disabled={locked}
                            />

                            <label style={{ ...S.label, marginTop: '14px' }}>Score ({activeBlock.totalPoints || 0})</label>
                            <input
                                type="range" min="0" max={scoreMax} step="0.5"
                                value={Math.min(activeBlock.totalPoints || 0, scoreMax)}
                                disabled={locked}
                                onChange={(e) => updateBlockSettings(activeBlock.id, { totalPoints: Number(e.target.value) })}
                                style={sliderStyle(!locked)}
                            />

                            <label style={{ ...S.label, marginTop: '14px' }}>Aantal oefeningen ({aantal})</label>
                            <input
                                type="range" min="1" max="20" step="1"
                                value={aantal}
                                onChange={(e) => {
                                    const next = Number(e.target.value);
                                    // Clamp Score so it never exceeds the new 2×aantal ceiling.
                                    const cappedPoints = Math.min(activeBlock.totalPoints || 0, next * 2);
                                    updateBlockSettings(activeBlock.id, { numberOfExercises: next, totalPoints: cappedPoints });
                                }}
                                style={sliderStyle(true)}
                            />

                            {!locked && !activeBlock.typeId.startsWith('cijferen-') && (
                                <>
                                    <label style={{ ...S.label, marginTop: '14px' }}>Witruimte ({activeBlock.verticalSpacing || 14}px)</label>
                                    <input
                                        type="range" min="8" max="40"
                                        value={activeBlock.verticalSpacing || 14}
                                        onChange={(e) => updateBlockSettings(activeBlock.id, { verticalSpacing: Number(e.target.value) })}
                                        style={sliderStyle(true)}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* ── 2. Engine (pill box) ── */}
            <div style={S.engineCard}>
                <div style={S.engineHeader}>
                    <span style={S.engineLabel}>Engine</span>
                    <button onClick={handleGenerate} style={S.generateBtn}>✨ Genereer</button>
                </div>
                <div style={S.engineBody}>
                    {locked ? (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                            Instellingen zijn vergrendeld. Klik op ✨ Genereer voor nieuwe getallen.
                        </p>
                    ) : (() => {
                        // Registry decides which config plugin this typeId mounts.
                        const Config = EXERCISE_UI[activeBlock.typeId]?.Config;
                        return Config ? <Config block={activeBlock} /> : null;
                    })()}
                </div>
            </div>

            {/* ── 3. Differentiatie ── */}
            {!locked && (
            <div style={S.card}>
                <h4 style={S.cardTitle}>Differentiatie</h4>
                <div style={S.col}>
                    <label style={S.label}>Instructie prefix</label>
                    <div style={S.btnGroup}>
                        {(['geen', 'mag', 'moet', 'plus', 'aangepast'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => updateBlockSettings(activeBlock.id, { instructionMode: activeBlock.instructionMode === mode ? 'geen' : mode })}
                                style={S.radioBtn(activeBlock.instructionMode === mode)}
                                title={mode === 'plus' ? 'Plusoefening' : mode === 'aangepast' ? 'Aangepaste tekst' : undefined}
                            >
                                {mode === 'plus' ? '★' : mode === 'geen' ? '—' : mode === 'aangepast' ? 'A' : mode.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {activeBlock.instructionMode === 'aangepast' && (
                        <div style={{ marginTop: '8px' }}>
                            <label style={S.label}>Aangepaste tekst</label>
                            <input
                                style={S.input}
                                value={activeBlock.customInstructionText || ''}
                                onChange={(e) => updateBlockSettings(activeBlock.id, { customInstructionText: e.target.value })}
                                placeholder="Bv. Probeer:"
                            />
                        </div>
                    )}

                    {/* ── Niveau (hoeveelheid-abstract only) ── */}
                    {subType === 'hoeveelheid-abstract' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Niveau</label>
                            <div style={S.btnGroup}>
                                {([1, 2, 3] as const).map((n) => (
                                    <button key={n} onClick={() => updateConstraint('level', n)} style={S.radioBtn((c.level ?? 1) === n)}>
                                        N{n}
                                    </button>
                                ))}
                            </div>
                            {(c.level ?? 1) === 3 && (
                                <div style={{ marginTop: '8px' }}>
                                    <label style={S.label}>Max. getal (N3)</label>
                                    <input
                                        type="number" min="100" step="100"
                                        style={S.input}
                                        value={c.maxAbstractN3 ?? 1000}
                                        onChange={(e) => updateConstraint('maxAbstractN3', Number(e.target.value))}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Scaffolding (herkennen) ── */}
                    {subType === 'herkennen' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {([
                                    { val: 'fraction-questions', label: 'Breukvragen' },
                                    { val: 'phrase',             label: 'Zin invullen' },
                                    { val: 'blank-fraction',     label: 'Blanco breuk' },
                                    { val: 'blank-line',         label: 'Blanco lijn' },
                                ] as const).map(({ val, label }) => (
                                    <button key={val} onClick={() => updateConstraint('answerFormat', val)}
                                        style={{ ...S.radioBtn((c.answerFormat ?? 'fraction-questions') === val), justifyContent: 'flex-start', textAlign: 'left' }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Scaffolding (hoeveelheid concreet) ── */}
                    {subType === 'hoeveelheid' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {([
                                    { val: 'met-hulp',        label: 'Met hulplijnen' },
                                    { val: 'met-breukvragen', label: 'Met breukvragen' },
                                    { val: 'zonder-hulp',     label: 'Zonder hulp' },
                                ] as const).map(({ val, label }) => (
                                    <button key={val} onClick={() => updateConstraint('answerFormat', val)}
                                        style={{ ...S.radioBtn((c.answerFormat ?? 'met-hulp') === val), justifyContent: 'flex-start', textAlign: 'left' }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Scaffolding (hoeveelheid-rechthoek) ── */}
                    {subType === 'hoeveelheid-rechthoek' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div style={S.btnGroup}>
                                <button onClick={() => updateConstraint('answerFormat', 'met-berekening')} style={S.radioBtn((c.answerFormat ?? 'met-berekening') === 'met-berekening')}>Met lijnen</button>
                                <button onClick={() => updateConstraint('answerFormat', 'zonder-berekening')} style={S.radioBtn((c.answerFormat ?? 'met-berekening') === 'zonder-berekening')}>Zonder lijnen</button>
                            </div>
                        </>
                    )}

                    {/* ── Scaffolding (lijnstuk / hoeveelheid-abstract) ── */}
                    {(subType === 'lijnstuk' || subType === 'hoeveelheid-abstract') && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {([
                                    { val: 'berekeningslijnen', label: 'Berekeningslijnen' },
                                    { val: 'structuurlijnen',   label: 'Structuurlijnen' },
                                    { val: 'blanco',            label: 'Blanco' },
                                ] as const).map(({ val, label }) => (
                                    <button key={val} onClick={() => updateConstraint('answerMode', val)}
                                        style={{ ...S.radioBtn((c.answerMode ?? 'berekeningslijnen') === val), justifyContent: 'flex-start', textAlign: 'left' }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Moeilijkheidsgraad (rational optellen/aftrekken) ── */}
                    {(activeBlock.typeId.includes('optellen') || activeBlock.typeId.includes('aftrekken')) && !activeBlock.typeId.startsWith('cijferen-') && c.numberType === 'rational' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Moeilijkheidsgraad</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {([
                                    { val: 'same',       label: 'Gelijknamige breuken' },
                                    { val: 'one_step',   label: 'Ongelijknamige breuken (eenvoudig)' },
                                    { val: 'multi_step', label: 'Ongelijknamige breuken (moeilijk)' },
                                ] as const).map(({ val, label }) => (
                                    <button key={val}
                                        onClick={() => updateConstraint('fractionDifficulty', val)}
                                        style={{ ...S.radioBtn((c.fractionDifficulty ?? 'same') === val), justifyContent: 'flex-start', textAlign: 'left' }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── Scaffolding (cijferen: Structuur+Getallen / Enkel Structuur / Enkel Ruitjes) ── */}
                    {activeBlock.typeId.startsWith('cijferen-') && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {([
                                    { level: 1, label: 'Structuur en ingevulde getallen' },
                                    { level: 2, label: 'Structuur zonder getallen' },
                                    { level: 3, label: 'Lege ruitjes' },
                                ] as const).map(({ level, label }) => {
                                    const isActive = (c.scaffolding ?? 3) === level;
                                    return (
                                        <button
                                            key={level}
                                            onClick={() => updateBlockSettings(activeBlock.id, { constraints: { ...c, scaffolding: level } })}
                                            style={{
                                                ...S.radioBtn(isActive),
                                                justifyContent: 'flex-start', padding: '7px 12px',
                                                color: isActive ? 'white' : 'var(--text-main)',
                                            }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ── Q/R-vak toggle (cijferen delen only) ── */}
                    {activeBlock.typeId.startsWith('cijferen-') && c.operator === ':' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Q/R-vak</label>
                            <label style={S.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={c.showQR !== false}
                                    onChange={(e) => updateConstraint('showQR', e.target.checked)}
                                    style={S.checkbox}
                                />
                                Toon Q/R-vak
                            </label>
                        </>
                    )}

                    {/* ── Scaffolding (hr-std: Kort / Lang / Stappen) ── */}
                    {isHrStd(activeBlock.typeId) && !activeBlock.typeId.startsWith('cijferen-') && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div style={S.btnGroup}>
                                <button onClick={() => updateBlockLayout(activeBlock.id, 'inline-short')} style={S.radioBtn((activeBlock.layoutPreset ?? 'inline-short') === 'inline-short')}>Kort</button>
                                <button onClick={() => updateBlockLayout(activeBlock.id, 'inline-long')}  style={S.radioBtn((activeBlock.layoutPreset ?? 'inline-short') === 'inline-long')}>Lang</button>
                                <button onClick={() => updateBlockLayout(activeBlock.id, 'stepped')}      style={S.radioBtn((activeBlock.layoutPreset ?? 'inline-short') === 'stepped')}>Stappen</button>
                            </div>
                            {(activeBlock.layoutPreset ?? 'inline-short') === 'stepped' && (
                                <div style={{ marginTop: '8px' }}>
                                    <label style={S.label}>Antal stappenlijnen: {activeBlock.steppedLines ?? 3}</label>
                                    <input
                                        type="range" min="1" max="10" step="1"
                                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                                        value={activeBlock.steppedLines ?? 3}
                                        onChange={(e) => updateBlockLayout(activeBlock.id, 'stepped', Number(e.target.value))}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Scaffolding (geld-teruggeven) ── */}
                    {activeBlock.typeId === 'geld-teruggeven' && (() => {
                        const scaffolding: string = c.scaffolding ?? 'ingevuld';
                        return (
                            <>
                                <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {([
                                        { value: 'ingevuld',            label: 'Ingevuld' },
                                        { value: 'basis',               label: 'Basis' },
                                        { value: 'structuur',           label: 'Structuur' },
                                        { value: 'rechthoek',           label: 'Lege ruimte' },
                                        { value: 'leeg',                label: 'Geen' },
                                    ] as const).map(opt => (
                                        <button key={opt.value}
                                            onClick={() => updateConstraint('scaffolding', opt.value)}
                                            style={{ ...S.radioBtn(scaffolding === opt.value), justifyContent: 'flex-start', textAlign: 'left' }}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </>
                        );
                    })()}

                    {/* ── Scaffolding (mab-herkennen + mab-tekenen) ── */}
                    {(activeBlock.typeId === 'mab-herkennen' || activeBlock.typeId === 'mab-tekenen') && (() => {
                        // Back-compat: blocks saved before the rename used `showBox: boolean`.
                        const scaff: string = c.scaffolding ?? (c.showBox === false ? 'geen' : 'positietabel');
                        const isHerkennen = activeBlock.typeId === 'mab-herkennen';
                        return (
                            <>
                                <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                                <div style={S.btnGroup}>
                                    <button onClick={() => updateConstraint('scaffolding', 'positietabel')} style={S.radioBtn(scaff === 'positietabel')}>Positietabel</button>
                                    <button onClick={() => updateConstraint('scaffolding', 'kader')}        style={S.radioBtn(scaff === 'kader')}>Kader</button>
                                    {isHerkennen && (
                                        <button onClick={() => updateConstraint('scaffolding', 'geen')} style={S.radioBtn(scaff === 'geen')}>Geen</button>
                                    )}
                                </div>
                            </>
                        );
                    })()}

                    {/* ── Geld-specific differentiatie (herkennen + tekenen only) ── */}
                    {(activeBlock.typeId === 'geld-herkennen' || activeBlock.typeId === 'geld-tekenen') && (() => {
                        const isGeldHerkennen = activeBlock.typeId === 'geld-herkennen';
                        const gFormat: string = c.format ?? 'euros';
                        const gScaffolding: string = c.scaffolding ?? (isGeldHerkennen ? 'invullen' : 'eenvoudig');
                        const gShowVoorbeelden: boolean = c.showVoorbeelden ?? false;
                        const gVoorbeeldTypes: number[] = c.voorbeeldTypes ?? [];
                        const gAllowedDenominations: number[] = c.allowedDenominations ?? [];

                        const toggleVoorbeeld = (valueCents: number) => {
                            const next = gVoorbeeldTypes.includes(valueCents)
                                ? gVoorbeeldTypes.filter(v => v !== valueCents)
                                : [...gVoorbeeldTypes, valueCents];
                            updateConstraint('voorbeeldTypes', next);
                        };

                        return (
                            <>
                                <label style={{ ...S.label, marginTop: '12px' }}>Opmaak</label>
                                <div style={S.btnGroup}>
                                    <button style={S.radioBtn(gFormat === 'euros')} onClick={() => updateConstraint('format', 'euros')}>Euro's (xx)</button>
                                    <button style={S.radioBtn(gFormat === 'decimaal')} onClick={() => updateConstraint('format', 'decimaal')}>Decimaal (xx,xx)</button>
                                </div>

                                {isGeldHerkennen && (
                                    <>
                                        <label style={{ ...S.label, marginTop: '12px' }}>Antwoord</label>
                                        <div style={S.btnGroup}>
                                            <button style={S.radioBtn(gScaffolding === 'invullen')} onClick={() => updateConstraint('scaffolding', 'invullen')}>
                                                {gFormat === 'decimaal' ? 'Invullen (€__,__)' : 'Invullen (€___)'}
                                            </button>
                                            <button style={S.radioBtn(gScaffolding === 'zelf-schrijven')} onClick={() => updateConstraint('scaffolding', 'zelf-schrijven')}>Zelf schrijven</button>
                                        </div>
                                    </>
                                )}

                                {!isGeldHerkennen && (
                                    <>
                                        <label style={{ ...S.label, marginTop: '12px' }}>Tekenvak</label>
                                        <div style={S.btnGroup}>
                                            <button style={S.radioBtn(gScaffolding === 'eenvoudig')} onClick={() => updateConstraint('scaffolding', 'eenvoudig')}>Eenvoudig</button>
                                            <button style={S.radioBtn(gScaffolding === 'verdeeld')} onClick={() => updateConstraint('scaffolding', 'verdeeld')}>Verdeeld (€ / cent)</button>
                                        </div>
                                    </>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                                    <label style={{ ...S.label, marginBottom: 0 }}>Voorbeelden tonen</label>
                                    <input type="checkbox" checked={gShowVoorbeelden} onChange={e => updateConstraint('showVoorbeelden', e.target.checked)} style={S.checkbox} />
                                </div>
                                {gShowVoorbeelden && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                        {DENOMINATION_CATALOGUE.filter(d => gAllowedDenominations.includes(d.valueCents)).map(d => {
                                            const active = gVoorbeeldTypes.includes(d.valueCents);
                                            return (
                                                <span key={d.valueCents} onClick={() => toggleVoorbeeld(d.valueCents)}
                                                    style={{
                                                        padding: '4px 8px', fontSize: '11px', borderRadius: '12px', cursor: 'pointer',
                                                        border: '1px solid var(--border-color)',
                                                        backgroundColor: active ? 'var(--accent-purple)' : 'var(--bg-input)',
                                                        color: active ? 'white' : 'var(--text-muted)',
                                                        fontWeight: active ? 'bold' : 'normal',
                                                        userSelect: 'none',
                                                    }}>
                                                    {denominationLabel(d.valueCents)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
            )}

            {/* ── 4. Geavanceerd (accordion) ── */}
            {!locked && (activeBlock.typeId.startsWith('cijferen-') || activeBlock.typeId.startsWith('geld-') || activeBlock.typeId === 'mab-herkennen' || activeBlock.typeId === 'mab-tekenen' || activeBlock.typeId === 'splitsen') && (
                <div style={S.advancedWrap}>
                    <button style={S.advancedToggle} onClick={() => setAdvancedOpen(!advancedOpen)}>
                        <span>Geavanceerd</span>
                        <span style={{ fontSize: '14px', transform: advancedOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
                    </button>
                    {advancedOpen && (
                        <div style={{ ...S.card, marginTop: '8px' }}>
                            <div style={S.col}>
                                {activeBlock.typeId === 'splitsen' && (
                                    <>
                                        <label style={S.label}>Getallen (typ zelf een getal)</label>
                                        {(activeBlock.splitsenExercises || []).map((ex, i) => (
                                            <input
                                                key={ex.id}
                                                style={{ ...S.input, marginBottom: '4px' }}
                                                defaultValue={formatMathNumber(ex.total)}
                                                onBlur={(e) => {
                                                    const v = Number(e.target.value.replace(',', '.').trim());
                                                    if (Number.isFinite(v)) patchExercise(activeBlock.id, 'splitsenExercises', ex.id, recomputeSplitsenExercise(activeBlock, ex, v));
                                                }}
                                                placeholder={`Getal ${i + 1}`}
                                            />
                                        ))}
                                        {(activeBlock.splitsenExercises || []).length === 0 && (
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Genereer eerst oefeningen.</p>
                                        )}
                                    </>
                                )}
                                {activeBlock.typeId.startsWith('cijferen-') && (
                                    <>
                                        <label style={S.label}>Ruitjesgrootte: {c.gridCellSize || 25}pt (~{Math.round((c.gridCellSize || 25) / 2.835)}mm)</label>
                                        <input
                                            type="range" min="16" max="32" step="2"
                                            value={c.gridCellSize || 25}
                                            onChange={(e) => updateConstraint('gridCellSize', Number(e.target.value))}
                                            style={{ width: '100%', accentColor: 'var(--accent-bewerkingen)', cursor: 'pointer' }}
                                        />
                                        <label style={{ ...S.label, marginTop: '10px' }}>Extra kolommen: {c.extraCols || 0}</label>
                                        <input
                                            type="range" min="0" max="6" step="1"
                                            value={c.extraCols || 0}
                                            onChange={(e) => updateConstraint('extraCols', Number(e.target.value))}
                                            style={{ width: '100%', accentColor: 'var(--accent-bewerkingen)', cursor: 'pointer' }}
                                        />
                                        <label style={{ ...S.label, marginTop: '10px' }}>Extra rijen: {c.extraRows || 0}</label>
                                        <input
                                            type="range" min="0" max="10" step="1"
                                            value={c.extraRows || 0}
                                            onChange={(e) => updateConstraint('extraRows', Number(e.target.value))}
                                            style={{ width: '100%', accentColor: 'var(--accent-bewerkingen)', cursor: 'pointer' }}
                                        />
                                    </>
                                )}
                                {(activeBlock.typeId === 'mab-herkennen' || activeBlock.typeId === 'mab-tekenen') && (() => {
                                    const perRow       = (c.exercisesPerRow ?? 3) as number;
                                    const boxHeight    = (c.boxHeight       ?? 60) as number;
                                    const answerHeight = (c.answerHeight    ?? 36) as number;
                                    return (
                                        <>
                                            <label style={S.label}>Oefeningen per rij ({perRow})</label>
                                            <input
                                                type="range" min={1} max={4} value={perRow}
                                                onChange={e => updateConstraint('exercisesPerRow', Number(e.target.value))}
                                                style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                                            />
                                            <label style={{ ...S.label, marginTop: '10px' }}>Tekenvak hoogte ({boxHeight}px)</label>
                                            <input
                                                type="range" min={40} max={200} step={5} value={boxHeight}
                                                onChange={e => updateConstraint('boxHeight', Number(e.target.value))}
                                                style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                                            />
                                            <label style={{ ...S.label, marginTop: '10px' }}>Antwoordlijn hoogte ({answerHeight}px)</label>
                                            <input
                                                type="range" min={20} max={80} step={2} value={answerHeight}
                                                onChange={e => updateConstraint('answerHeight', Number(e.target.value))}
                                                style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                                            />
                                        </>
                                    );
                                })()}
                                {activeBlock.typeId.startsWith('geld-') && activeBlock.typeId !== 'geld-teruggeven' && (() => {
                                    const isGeldHerkennen = activeBlock.typeId === 'geld-herkennen';
                                    const currentPerRow = (c.exercisesPerRow ?? 4) as number;
                                    const boxHeight = (c.boxHeight ?? 80) as number;
                                    return (
                                        <>
                                            <label style={S.label}>Oefeningen per rij ({currentPerRow})</label>
                                            <input
                                                type="range" min={1} max={4}
                                                value={currentPerRow}
                                                onChange={e => updateConstraint('exercisesPerRow', Number(e.target.value))}
                                                style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                                            />
                                            {!isGeldHerkennen && (
                                                <>
                                                    <label style={{ ...S.label, marginTop: '10px' }}>Hoogte tekenvak ({boxHeight}px)</label>
                                                    <input
                                                        type="range" min={40} max={160}
                                                        value={boxHeight}
                                                        onChange={e => updateConstraint('boxHeight', Number(e.target.value))}
                                                        style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                                                    />
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
}

const S = {
    sidebar: { width: '380px', minWidth: '380px', backgroundColor: 'var(--bg-dark)', borderLeft: '1px solid var(--border-color)', height: '100%', boxSizing: 'border-box', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' } as React.CSSProperties,
    lockBanner: { padding: '10px 12px', fontSize: '12px', lineHeight: 1.4, color: 'var(--text-main)', background: 'rgba(172,41,233,0.10)', border: '1px solid var(--accent-purple)', borderRadius: '8px' } as React.CSSProperties,
    card: { backgroundColor: 'var(--bg-panel)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' } as React.CSSProperties,
    cardTitle: { color: 'var(--accent-purple)', margin: '0 0 14px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 } as React.CSSProperties,
    col: { display: 'flex', flexDirection: 'column', gap: '4px' } as React.CSSProperties,
    row: { display: 'flex', gap: '12px', alignItems: 'flex-end' } as React.CSSProperties,
    label: { display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 } as React.CSSProperties,
    footerGroupLabel: { display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' } as React.CSSProperties,
    input: { width: '100%', padding: '9px 10px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', fontSize: '13px' } as React.CSSProperties,
    select: { width: '100%', padding: '9px 10px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', outline: 'none', fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)' } as React.CSSProperties,
    checkboxGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: '4px' } as React.CSSProperties,
    checkbox: { accentColor: 'var(--accent-purple)', width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 } as React.CSSProperties,
    btnGroup: { display: 'flex', gap: '3px', backgroundColor: 'var(--bg-input)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' } as React.CSSProperties,
    radioBtn: (active: boolean): React.CSSProperties => ({ padding: '6px 10px', fontSize: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: active ? 'var(--accent-purple)' : 'transparent', color: active ? 'white' : 'var(--text-muted)', fontWeight: active ? 'bold' : 'normal', flex: 1, whiteSpace: 'nowrap' }),

    engineCard: { backgroundColor: 'var(--bg-panel)', borderRadius: '10px', border: '1px solid rgba(172,41,233,0.35)' } as React.CSSProperties,
    engineHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: 'rgba(172,41,233,0.08)', borderBottom: '1px solid rgba(172,41,233,0.2)', borderRadius: '10px 10px 0 0' } as React.CSSProperties,
    engineLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--accent-purple)' } as React.CSSProperties,
    engineBody: { padding: '14px 16px', maxHeight: '520px', overflowY: 'auto' } as React.CSSProperties,
    generateBtn: { padding: '6px 14px', backgroundColor: 'var(--accent-purple)', border: 'none', color: 'white', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' } as React.CSSProperties,

    advancedWrap: { marginBottom: '8px' } as React.CSSProperties,
    advancedToggle: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' } as React.CSSProperties,
};

const miniMoveBtn = (disabled: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '22px', height: '22px',
    background: 'var(--bg-input)', border: '1px solid var(--border-color)',
    borderRadius: '4px', color: 'var(--text-main)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    padding: 0,
});
