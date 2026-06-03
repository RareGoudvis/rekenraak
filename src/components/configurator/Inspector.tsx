import { useState } from 'react';
import { ArrowUp, ArrowDown, Sparkle as Sparkles } from '@phosphor-icons/react';
import IconButton from '../ui/IconButton';
import { useWorksheetStore, DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type HeaderField } from '../../store/useWorksheetStore';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { DENOMINATION_CATALOGUE, denominationLabel } from '../../services/geld/geldGenerator';
import { regenerateBlock } from '../../services/generateDispatch';
import { recomputeSplitsenExercise } from '../../services/splitsen/splitsenGenerator';
import { formatMathNumber } from '../../services/math/formatters';
import Switch from '../ui/Switch';

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
            <aside data-tour="inspector" style={S.sidebar}>

                {/* ── Werkbundel instellingen ── */}
                <div style={S.card}>
                    <h4 style={S.cardTitle}>Werkbundel</h4>
                    <div style={S.col}>
                        <label style={S.label}>Documenttitel</label>
                        <input style={S.input} value={headerData.titel || ''} onChange={(e) => updateHeader({ titel: e.target.value })} placeholder="Bv. Herhalingstoets" />

                        <label style={{ ...S.label, marginTop: '12px' }}>Koptekst stijl</label>
                        <div className="seg-group">
                            {(['geen', 'onderstreept', 'kader'] as const).map((s) => (
                                <button key={s} onClick={() => updateDocSettings({ headerStyle: s })} className="seg-btn" aria-pressed={docSettings.headerStyle === s}>
                                    {s === 'geen' ? 'Geen' : s === 'onderstreept' ? 'Onderstreept' : 'Kader'}
                                </button>
                            ))}
                        </div>

                        <label style={{ ...S.label, marginTop: '12px' }}>Titel positie</label>
                        <div className="seg-group">
                            {(['left', 'center', 'right'] as const).map((p) => (
                                <button key={p} onClick={() => updateDocSettings({ titlePosition: p })} className="seg-btn" aria-pressed={(docSettings.titlePosition ?? 'center') === p}>
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
                        <div style={S.switchRow}><span style={S.switchText}>Scores tonen</span><Switch checked={docSettings.showScores} onChange={(v) => updateDocSettings({ showScores: v })} aria-label="Scores tonen" /></div>
                        <div style={S.switchRow}><span style={S.switchText}>Scheidingslijn tussen oefeningen</span><Switch checked={docSettings.showDividers} onChange={(v) => updateDocSettings({ showDividers: v })} aria-label="Scheidingslijn tussen oefeningen" /></div>
                        <div style={S.switchRow}><span style={S.switchText}>Opdrachten nummeren</span><Switch checked={docSettings.numberBlocks} onChange={(v) => updateDocSettings({ numberBlocks: v })} aria-label="Opdrachten nummeren" /></div>

                        <label style={{ ...S.label, marginTop: '10px' }}>Opdracht stijl</label>
                        <div className="seg-group">
                            {(['regular', 'underlined', 'boxed'] as const).map((s) => (
                                <button key={s} onClick={() => updateDocSettings({ opdrachtTitelStyle: s })} className="seg-btn" aria-pressed={docSettings.opdrachtTitelStyle === s}>
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
    // subType-keyed Differentiatie blocks below are fraction-only; scope to 'breuken'
    // so e.g. romeinse-cijfers (subType 'herkennen') doesn't inherit fraction scaffolding.
    const subType: string = activeBlock.typeId === 'breuken' ? (c.subType ?? '') : '';
    const updateConstraint = (key: string, value: unknown) =>
        updateBlockSettings(activeBlock.id, { constraints: { ...c, [key]: value } });

    return (
        <aside data-tour="inspector" style={S.sidebar}>

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

            {/* ── 2. Oefeningen — exercise-type settings + the Genereer CTA (shared
                   primary IconButton); same card chrome as every other section. ── */}
            <div style={S.card}>
                <div style={S.engineHeader}>
                    <h4 style={{ ...S.cardTitle, margin: 0 }}>Oefeningen</h4>
                    <IconButton icon={Sparkles} label="Genereer oefeningen" visibleLabel="Genereer" variant="primary" onClick={handleGenerate} dataTour="generate-block" />
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
                    <div className="seg-group">
                        {(['geen', 'mag', 'moet', 'plus', 'aangepast'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => updateBlockSettings(activeBlock.id, { instructionMode: activeBlock.instructionMode === mode ? 'geen' : mode })}
                                className="seg-btn" aria-pressed={activeBlock.instructionMode === mode}
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

                    {/* ── Hulptabel (herleidingen) — a conversion-table scaffold ── */}
                    {activeBlock.typeId === 'herleidingen' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Hulptabel</label>
                            <div className="seg-group">
                                {([['geen', 'Geen'], ['tabel-headers', 'Met hoofding'], ['tabel-blanco', 'Blanco']] as const).map(([v, lbl]) => (
                                    <button key={v} className="seg-btn" aria-pressed={(c.scaffolding ?? 'geen') === v} onClick={() => updateConstraint('scaffolding', v)}>{lbl}</button>
                                ))}
                            </div>
                            {(c.scaffolding ?? 'geen') !== 'geen' && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '10px' }}>
                                        <span style={S.checkboxLabel as React.CSSProperties}>Oefening links tonen</span>
                                        <Switch checked={!!c.tablePrompt} onChange={(v) => updateConstraint('tablePrompt', v)} aria-label="Oefening links tonen" />
                                    </div>
                                    <label style={{ ...S.label, marginTop: '10px' }}>Antwoord rechts</label>
                                    <div className="seg-group">
                                        {([['blank', 'Blanco'], ['filled', 'Ingevuld'], ['hidden', 'Verborgen']] as const).map(([v, lbl]) => (
                                            <button key={v} className="seg-btn" aria-pressed={(c.tableAnswer ?? 'blank') === v} onClick={() => updateConstraint('tableAnswer', v)}>{lbl}</button>
                                        ))}
                                    </div>
                                    <label style={{ ...S.label, marginTop: '10px' }}>Celbreedte: {c.tableCellW ?? 60}px</label>
                                    <input type="range" min={40} max={120} step={5} value={c.tableCellW ?? 60} onChange={(e) => updateConstraint('tableCellW', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                                    <label style={{ ...S.label, marginTop: '10px' }}>Celhoogte: {c.tableCellH ?? 30}px</label>
                                    <input type="range" min={24} max={60} step={2} value={c.tableCellH ?? 30} onChange={(e) => updateConstraint('tableCellH', Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                                </>
                            )}
                        </>
                    )}

                    {/* ── Niveau (hoeveelheid-abstract only) — with example range per level ── */}
                    {subType === 'hoeveelheid-abstract' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Niveau</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {([
                                    { n: 1, hint: 'Kleine getallen (× 1 – 10), bv. ⅗ van 30' },
                                    { n: 2, hint: 'Tientallen (× 10 – 100), bv. ⅗ van 300' },
                                    { n: 3, hint: 'Tot het ingestelde maximum' },
                                ] as const).map(({ n, hint }) => {
                                    const isActive = (c.level ?? 1) === n;
                                    return (
                                        <button key={n} onClick={() => updateConstraint('level', n)}
                                            style={{ ...S.radioBtn(isActive), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: '7px 12px' }}>
                                            <span style={{ fontWeight: 'bold' }}>N{n}</span>
                                            <span style={{ fontSize: '10px', opacity: 0.8 }}>{hint}</span>
                                        </button>
                                    );
                                })}
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

                            {/* Groepering — makkelijker groeperen helpt starters de delen zien */}
                            <label style={{ ...S.label, marginTop: '12px' }}>Groepering</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {([
                                    { val: 'standaard',    label: 'Standaard',          hint: 'Rijen van 10' },
                                    { val: 'gebalanceerd', label: 'Gelijke rijen',      hint: 'Evenveel per rij (18 → 2×9)' },
                                    { val: 'per-deel',     label: 'Per breukdeel',      hint: 'Elke rij = één gelijk deel' },
                                ] as const).map(({ val, label, hint }) => {
                                    const isActive = (c.groupingMode ?? 'standaard') === val;
                                    return (
                                        <button key={val} onClick={() => updateConstraint('groupingMode', val)}
                                            style={{ ...S.radioBtn(isActive), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: '7px 12px' }}>
                                            <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{label}</span>
                                            <span style={{ fontSize: '10px', opacity: 0.8 }}>{hint}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ── Scaffolding (hoeveelheid-rechthoek) ── */}
                    {subType === 'hoeveelheid-rechthoek' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div className="seg-group">
                                <button onClick={() => updateConstraint('answerFormat', 'met-berekening')} className="seg-btn" aria-pressed={(c.answerFormat ?? 'met-berekening') === 'met-berekening'}>Met lijnen</button>
                                <button onClick={() => updateConstraint('answerFormat', 'zonder-berekening')} className="seg-btn" aria-pressed={(c.answerFormat ?? 'met-berekening') === 'zonder-berekening'}>Zonder lijnen</button>
                            </div>
                        </>
                    )}

                    {/* ── Scaffolding (lijnstuk / hoeveelheid-abstract) — with example line layout ── */}
                    {(subType === 'lijnstuk' || subType === 'hoeveelheid-abstract') && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {([
                                    { val: 'berekeningslijnen', label: 'Berekeningslijnen', hint: '___ : ___ = ___  en  ___ × ___ = ___' },
                                    { val: 'structuurlijnen',   label: 'Structuurlijnen',   hint: '___ : ___ = ___   /   ___ × ___ = ___' },
                                    { val: 'blanco',            label: 'Blanco',            hint: '2 lege lijnen' },
                                ] as const).map(({ val, label, hint }) => {
                                    const isActive = (c.answerMode ?? 'berekeningslijnen') === val;
                                    return (
                                        <button key={val} onClick={() => updateConstraint('answerMode', val)}
                                            style={{ ...S.radioBtn(isActive), display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', padding: '7px 12px' }}>
                                            <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{label}</span>
                                            <span style={{ fontSize: '10px', opacity: 0.8, fontFamily: 'Azeret Mono, monospace' }}>{hint}</span>
                                        </button>
                                    );
                                })}
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
                    {/* Puntoefeningen (a + . = c) staan per definitie op één korte lijn — geen layoutkeuze. */}
                    {isHrStd(activeBlock.typeId) && !activeBlock.typeId.startsWith('cijferen-') && activeBlock.constraints.equationType !== 'puntoefening' && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div className="seg-group">
                                <button onClick={() => updateBlockLayout(activeBlock.id, 'inline-short')} className="seg-btn" aria-pressed={(activeBlock.layoutPreset ?? 'inline-short') === 'inline-short'}>Kort</button>
                                <button onClick={() => updateBlockLayout(activeBlock.id, 'inline-long')}  className="seg-btn" aria-pressed={(activeBlock.layoutPreset ?? 'inline-short') === 'inline-long'}>Lang</button>
                                <button onClick={() => updateBlockLayout(activeBlock.id, 'stepped')}      className="seg-btn" aria-pressed={(activeBlock.layoutPreset ?? 'inline-short') === 'stepped'}>Stappen</button>
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
                                <div className="seg-group">
                                    <button onClick={() => updateConstraint('scaffolding', 'positietabel')} className="seg-btn" aria-pressed={scaff === 'positietabel'}>Positietabel</button>
                                    <button onClick={() => updateConstraint('scaffolding', 'kader')}        className="seg-btn" aria-pressed={scaff === 'kader'}>Kader</button>
                                    {isHerkennen && (
                                        <button onClick={() => updateConstraint('scaffolding', 'geen')} className="seg-btn" aria-pressed={scaff === 'geen'}>Geen</button>
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
                                <div className="seg-group">
                                    <button className="seg-btn" aria-pressed={gFormat === 'euros'} onClick={() => updateConstraint('format', 'euros')}>Euro's (xx)</button>
                                    <button className="seg-btn" aria-pressed={gFormat === 'decimaal'} onClick={() => updateConstraint('format', 'decimaal')}>Decimaal (xx,xx)</button>
                                </div>

                                {isGeldHerkennen && (
                                    <>
                                        <label style={{ ...S.label, marginTop: '12px' }}>Antwoord</label>
                                        <div className="seg-group">
                                            <button className="seg-btn" aria-pressed={gScaffolding === 'invullen'} onClick={() => updateConstraint('scaffolding', 'invullen')}>
                                                {gFormat === 'decimaal' ? 'Invullen (€__,__)' : 'Invullen (€___)'}
                                            </button>
                                            <button className="seg-btn" aria-pressed={gScaffolding === 'zelf-schrijven'} onClick={() => updateConstraint('scaffolding', 'zelf-schrijven')}>Zelf schrijven</button>
                                        </div>
                                    </>
                                )}

                                {!isGeldHerkennen && (
                                    <>
                                        <label style={{ ...S.label, marginTop: '12px' }}>Tekenvak</label>
                                        <div className="seg-group">
                                            <button className="seg-btn" aria-pressed={gScaffolding === 'eenvoudig'} onClick={() => updateConstraint('scaffolding', 'eenvoudig')}>Eenvoudig</button>
                                            <button className="seg-btn" aria-pressed={gScaffolding === 'verdeeld'} onClick={() => updateConstraint('scaffolding', 'verdeeld')}>Verdeeld (€ / cent)</button>
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

                    {/* ── Getallenrijen: frame toggle ── */}
                    {activeBlock.typeId === 'getallenrijen' && (
                        <div style={{ ...S.switchRow, marginTop: '12px' }}>
                            <span style={S.switchText}>Kader tonen</span>
                            <Switch checked={c.showFrame !== false} onChange={(v) => updateConstraint('showFrame', v)} aria-label="Kader tonen" />
                        </div>
                    )}

                    {/* ── Getalpatronen: arrow + operator scaffolds ── */}
                    {activeBlock.typeId === 'getalpatronen' && (() => {
                        const maxOps = Math.max(0, (c.ticks ?? 6) - 1);
                        const operatorsShown = Math.min(c.operatorsShown ?? 0, maxOps);
                        return (
                            <>
                                <div style={{ ...S.switchRow, marginTop: '12px' }}>
                                    <span style={S.switchText}>Pijl + schrijflijn</span>
                                    <Switch checked={!!c.showArrows} onChange={(v) => updateConstraint('showArrows', v)} aria-label="Pijl + schrijflijn" />
                                </div>
                                <div style={S.switchRow}>
                                    <span style={S.switchText}>Operatoren invullen</span>
                                    <Switch checked={!!c.showOperators} onChange={(v) => updateConstraint('showOperators', v)} aria-label="Operatoren invullen" />
                                </div>
                                {c.showOperators && (
                                    <>
                                        <label style={{ ...S.label, marginTop: '8px' }}>Aantal ingevuld: {operatorsShown}</label>
                                        <input type="range" min={0} max={maxOps} step={1} value={operatorsShown}
                                            onChange={(e) => updateConstraint('operatorsShown', Number(e.target.value))}
                                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                                        <label style={{ ...S.label, marginTop: '8px' }}>Operatorweergave</label>
                                        <div className="seg-group">
                                            <button className="seg-btn" aria-pressed={(c.operatorStyle ?? 'symbol') === 'symbol'} onClick={() => updateConstraint('operatorStyle', 'symbol')}>Enkel teken</button>
                                            <button className="seg-btn" aria-pressed={(c.operatorStyle ?? 'symbol') === 'full'} onClick={() => updateConstraint('operatorStyle', 'full')}>Volledig</button>
                                        </div>
                                    </>
                                )}
                            </>
                        );
                    })()}

                    {/* ── Meten (lengte-meten + omtrek): scaffold + answer style ── */}
                    {(activeBlock.typeId === 'lengte-meten' || activeBlock.typeId === 'omtrek') && (() => {
                        const isOmtrek = activeBlock.typeId === 'omtrek';
                        // The lengte juist/fout variant has no writing line, so answer options don't apply.
                        const showAnswerOpts = isOmtrek || (c.measureModel ?? 'meten') === 'meten';
                        if (!showAnswerOpts) return null;
                        return (
                            <>
                                {isOmtrek && (
                                    <div style={{ ...S.switchRow, marginTop: '12px' }}>
                                        <span style={S.switchText}>___ cm bij elke zijde</span>
                                        <Switch checked={!!c.perSideScaffold} onChange={(v) => updateConstraint('perSideScaffold', v)} aria-label="___ cm bij elke zijde" />
                                    </div>
                                )}
                                <label style={{ ...S.label, marginTop: '12px' }}>Antwoord</label>
                                <div className="seg-group">
                                    <button className="seg-btn" aria-pressed={(c.answerMode ?? 'single') === 'single'} onClick={() => updateConstraint('answerMode', 'single')}>Eén lijn</button>
                                    <button className="seg-btn" aria-pressed={(c.answerMode ?? 'single') === 'sum'} onClick={() => updateConstraint('answerMode', 'sum')}>Som van zijden</button>
                                </div>
                                <label style={{ ...S.label, marginTop: '12px' }}>Antwoordeenheid</label>
                                <div className="seg-group">
                                    <button className="seg-btn" aria-pressed={(c.answerUnit ?? 'cm') === 'cm'} onClick={() => updateConstraint('answerUnit', 'cm')}>Met cm</button>
                                    <button className="seg-btn" aria-pressed={(c.answerUnit ?? 'cm') === 'plain'} onClick={() => updateConstraint('answerUnit', 'plain')}>Enkel lijn</button>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </div>
            )}

            {/* ── 4. Geavanceerd (accordion) ── */}
            {!locked && (activeBlock.typeId.startsWith('cijferen-') || activeBlock.typeId.startsWith('geld-') || activeBlock.typeId === 'mab-herkennen' || activeBlock.typeId === 'mab-tekenen' || activeBlock.typeId === 'splitsen' || activeBlock.typeId === 'herleidingen' || (activeBlock.typeId === 'breuken' && ((subType === 'kleuren' || subType === 'herkennen') && (Array.isArray(c.shapes) ? c.shapes.length === 1 : true) && c.staticSize || subType === 'hoeveelheid-rechthoek'))) && (
                <div style={S.advancedWrap}>
                    <button style={S.advancedToggle} onClick={() => setAdvancedOpen(!advancedOpen)}>
                        <span>Geavanceerd</span>
                        <span style={{ fontSize: '14px', transform: advancedOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
                    </button>
                    {advancedOpen && (
                        <div style={{ ...S.card, marginTop: '8px' }}>
                            <div style={S.col}>
                                {activeBlock.typeId === 'herleidingen' && (
                                    <>
                                        <label style={S.label}>Uitlijning</label>
                                        <div className="seg-group">
                                            {([['uitlijnen', 'Uitgelijnd'], ['compact', 'Kort getal links']] as const).map(([v, lbl]) => (
                                                <button key={v} className="seg-btn" aria-pressed={(c.herleidingLayout ?? 'uitlijnen') === v} onClick={() => updateConstraint('herleidingLayout', v)}>{lbl}</button>
                                            ))}
                                        </div>
                                    </>
                                )}
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
                                    const boxHeight    = (c.boxHeight       ?? 70) as number;
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
                                {/* ── Breuken: vaste vormgrootte (kleuren/herkennen) ── */}
                                {activeBlock.typeId === 'breuken' && (subType === 'kleuren' || subType === 'herkennen') && c.staticSize && (() => {
                                    const shape: string = Array.isArray(c.shapes) && c.shapes.length ? c.shapes[0] : (c.shape ?? 'rectangle');
                                    if (shape === 'circle') {
                                        return (
                                            <>
                                                <label style={S.label}>Diameter cirkel: {c.staticDiam ?? 4} cm</label>
                                                <input type="range" min={1} max={10} step={0.5} value={c.staticDiam ?? 4}
                                                    onChange={e => updateConstraint('staticDiam', Number(e.target.value))}
                                                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                                            </>
                                        );
                                    }
                                    if (shape === 'square') {
                                        return (
                                            <>
                                                <label style={S.label}>Zijde vierkant: {c.staticSide ?? 4} cm</label>
                                                <input type="range" min={1} max={10} step={0.5} value={c.staticSide ?? 4}
                                                    onChange={e => updateConstraint('staticSide', Number(e.target.value))}
                                                    style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                                            </>
                                        );
                                    }
                                    return (
                                        <>
                                            <label style={S.label}>Breedte rechthoek: {c.staticW ?? 4} cm</label>
                                            <input type="range" min={1} max={12} step={0.5} value={c.staticW ?? 4}
                                                onChange={e => updateConstraint('staticW', Number(e.target.value))}
                                                style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                                            <label style={{ ...S.label, marginTop: '10px' }}>Hoogte rechthoek: {c.staticH ?? 3} cm</label>
                                            <input type="range" min={1} max={10} step={0.5} value={c.staticH ?? 3}
                                                onChange={e => updateConstraint('staticH', Number(e.target.value))}
                                                style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                                        </>
                                    );
                                })()}
                                {/* ── Breuken: tekenvak (schematisch / hoeveelheid-rechthoek) ── */}
                                {activeBlock.typeId === 'breuken' && subType === 'hoeveelheid-rechthoek' && (
                                    <>
                                        <label style={S.label}>Breedte tekenvak: {c.drawBoxW ? `${c.drawBoxW} cm` : 'volledig'}</label>
                                        <input type="range" min={0} max={16} step={0.5} value={c.drawBoxW ?? 0}
                                            onChange={e => updateConstraint('drawBoxW', Number(e.target.value))}
                                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                                        <label style={{ ...S.label, marginTop: '10px' }}>Hoogte tekenvak: {c.drawBoxH ?? 3} cm</label>
                                        <input type="range" min={1} max={12} step={0.5} value={c.drawBoxH ?? 3}
                                            onChange={e => updateConstraint('drawBoxH', Number(e.target.value))}
                                            style={{ width: '100%', accentColor: 'var(--accent-purple)', cursor: 'pointer' }} />
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
}

const S = {
    sidebar: { width: '380px', minWidth: '380px', backgroundColor: 'var(--bg-base)', borderLeft: '1px solid var(--separator)', height: '100%', boxSizing: 'border-box', overflowY: 'auto', padding: '0 var(--sp-5) var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' } as React.CSSProperties,
    lockBanner: { padding: 'var(--sp-3)', fontSize: 'var(--text-sm)', lineHeight: 1.4, color: 'var(--text-main)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)' } as React.CSSProperties,
    card: { backgroundColor: 'var(--bg-surface)', padding: 'var(--sp-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)', boxShadow: 'var(--shadow-1)' } as React.CSSProperties,
    // Section title: calm, sentence-case, weight-driven (not tiny UPPERCASE tracked).
    cardTitle: { color: 'var(--text-main)', margin: '0 0 var(--sp-3) 0', fontSize: 'var(--text-md)', fontWeight: 600, letterSpacing: '-0.01em' } as React.CSSProperties,
    col: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    row: { display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-end' } as React.CSSProperties,
    label: { display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)', fontWeight: 500 } as React.CSSProperties,
    footerGroupLabel: { display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-main)', marginBottom: 'var(--sp-2)', fontWeight: 600 } as React.CSSProperties,
    input: { width: '100%', padding: '9px 10px', backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    select: { width: '100%', padding: '9px 10px', backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', outline: 'none', fontSize: 'var(--text-sm)', cursor: 'pointer' } as React.CSSProperties,
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-main)' } as React.CSSProperties,
    switchRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', padding: '3px 0' } as React.CSSProperties,
    switchText: { fontSize: 'var(--text-sm)', color: 'var(--text-main)' } as React.CSSProperties,
    checkboxGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2) var(--sp-3)', marginTop: 'var(--sp-1)' } as React.CSSProperties,
    checkbox: { accentColor: 'var(--accent)', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 } as React.CSSProperties,
    // Segmented control: neutral track, selected segment = accent-soft tint + accent
    // text + accent ring (the one canonical selected look — same as sharedPluginStyles).
    // radioBtn = the separated bordered-button style; still used for the vertical list-row
    // selectors (level/scaffolding lists). True segmented groups use .seg-group/.seg-btn.
    radioBtn: (active: boolean): React.CSSProperties => ({ padding: '6px 10px', fontSize: 'var(--text-sm)', border: `1px solid ${active ? 'var(--accent)' : 'var(--separator)'}`, borderRadius: 'var(--radius-xs)', cursor: 'pointer', backgroundColor: active ? 'var(--accent-soft)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-muted)', fontWeight: active ? 600 : 500, flex: 1, whiteSpace: 'nowrap', transition: 'background-color var(--dur) var(--ease-out), color var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out)' }),

    // Engine header: title row with the Genereer CTA on the right (plain card chrome).
    engineHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' } as React.CSSProperties,
    engineBody: {} as React.CSSProperties,

    advancedWrap: { marginBottom: 'var(--sp-2)' } as React.CSSProperties,
    advancedToggle: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-3) var(--sp-4)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: 600 } as React.CSSProperties,
};

const miniMoveBtn = (disabled: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '22px', height: '22px',
    background: 'var(--bg-surface-2)', border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-xs)', color: 'var(--text-main)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    padding: 0,
});
