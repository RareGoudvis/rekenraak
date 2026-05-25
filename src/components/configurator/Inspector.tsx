import { useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import AdditionConfig from './plugins/AdditionConfig';
import SubtractionConfig from './plugins/SubtractionConfig';
import MultiplicationConfig from './plugins/MultiplicationConfig';
import DivisionConfig from './plugins/DivisionConfig';
import ClockConfig from './plugins/ClockConfig';
import FractionConfig from './plugins/FractionConfig';
import { generateAdditionExercises, generateSubtractionExercises, generateMultiplicationExercises, generateDivisionExercises } from '../../services/math/mathEngine';
import { generateClockExercises } from '../../services/clock/clockGenerator';
import { generateFractionExercises } from '../../services/fractions/fractionGenerator';

const HR_STD_TYPES = ['optellen', 'aftrekken', 'vermenigvuldigen', 'delen'];
const isHrStd = (typeId: string) => HR_STD_TYPES.some(t => typeId.includes(t));

export default function Inspector() {
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const activeBlockId = useWorksheetStore((state) => state.activeBlockId);
    const activeBlock = useWorksheetStore((state) => state.blocks.find(b => b.id === activeBlockId));

    const headerData = useWorksheetStore((state) => state.header);
    const footerData = useWorksheetStore((state) => state.footer);
    const docSettings = useWorksheetStore((state) => state.docSettings);
    const updateHeader = useWorksheetStore((state) => state.updateHeader);
    const updateFooter = useWorksheetStore((state) => state.updateFooter);
    const updateDocSettings = useWorksheetStore((state) => state.updateDocSettings);

    const updateBlockInstruction = useWorksheetStore((state) => state.updateBlockInstruction);
    const updateBlockLayout = useWorksheetStore((state) => state.updateBlockLayout);
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const setBlockExercises = useWorksheetStore((state) => state.setBlockExercises);
    const setClockExercises = useWorksheetStore((state) => state.setClockExercises);
    const setFractionExercises = useWorksheetStore((state) => state.setFractionExercises);

    const handleGenerate = () => {
        if (!activeBlock) return;
        if (activeBlock.typeId.startsWith('klok-')) {
            setClockExercises(activeBlock.id, generateClockExercises(activeBlock));
        } else if (activeBlock.typeId === 'breuken') {
            setFractionExercises(activeBlock.id, generateFractionExercises(activeBlock));
        } else if (activeBlock.typeId.includes('optellen')) {
            setBlockExercises(activeBlock.id, generateAdditionExercises(activeBlock));
        } else if (activeBlock.typeId.includes('aftrekken')) {
            setBlockExercises(activeBlock.id, generateSubtractionExercises(activeBlock));
        } else if (activeBlock.typeId.includes('vermenigvuldigen')) {
            setBlockExercises(activeBlock.id, generateMultiplicationExercises(activeBlock));
        } else if (activeBlock.typeId.includes('delen')) {
            setBlockExercises(activeBlock.id, generateDivisionExercises(activeBlock));
        }
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

                        <label style={{ ...S.label, marginTop: '12px' }}>Koptekst velden</label>
                        <div style={S.checkboxGrid}>
                            <label style={S.checkboxLabel}><input type="checkbox" checked={headerData.naam} onChange={(e) => updateHeader({ naam: e.target.checked })} style={S.checkbox} /> Naam</label>
                            <label style={S.checkboxLabel}><input type="checkbox" checked={headerData.klas} onChange={(e) => updateHeader({ klas: e.target.checked })} style={S.checkbox} /> Klas</label>
                            <label style={S.checkboxLabel}><input type="checkbox" checked={headerData.nummer} onChange={(e) => updateHeader({ nummer: e.target.checked })} style={S.checkbox} /> Nummer</label>
                            <label style={S.checkboxLabel}><input type="checkbox" checked={headerData.datum} onChange={(e) => updateHeader({ datum: e.target.checked })} style={S.checkbox} /> Datum</label>
                        </div>
                    </div>
                </div>

                {/* ── Opdrachtinstellingen ── */}
                <div style={S.card}>
                    <h4 style={S.cardTitle}>Opdrachtinstellingen</h4>
                    <div style={S.col}>
                        <label style={S.checkboxLabel}><input type="checkbox" checked={docSettings.showScores} onChange={(e) => updateDocSettings({ showScores: e.target.checked })} style={S.checkbox} /> Scores tonen</label>
                        <label style={S.checkboxLabel}><input type="checkbox" checked={docSettings.showDividers} onChange={(e) => updateDocSettings({ showDividers: e.target.checked })} style={S.checkbox} /> Scheidingslijn tussen oefeningen</label>

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

                        <label style={{ ...S.footerGroupLabel, marginTop: '10px' }}>Centraal</label>
                        <div style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={S.checkboxLabel}><input type="checkbox" checked={footerData.showCenterText} onChange={(e) => updateFooter({ showCenterText: e.target.checked })} style={S.checkbox} /> Vrije tekst</label>
                            {footerData.showCenterText && <input style={S.input} value={footerData.centerText || ''} onChange={(e) => updateFooter({ centerText: e.target.value })} placeholder="Centrale voettekst" />}
                        </div>

                        <label style={{ ...S.footerGroupLabel, marginTop: '10px' }}>Rechts</label>
                        <div style={{ paddingLeft: '8px' }}>
                            <label style={S.checkboxLabel}><input type="checkbox" checked={footerData.showPagina} onChange={(e) => updateFooter({ showPagina: e.target.checked })} style={S.checkbox} /> Paginanummering</label>
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

            {/* ── 1. Opdrachtblok ── */}
            <div style={S.card}>
                <h4 style={S.cardTitle}>Opdrachtblok</h4>
                <div style={S.col}>
                    <label style={S.label}>Titel</label>
                    <input
                        style={S.input}
                        value={activeBlock.instructionText || ''}
                        onChange={(e) => updateBlockInstruction(activeBlock.id, e.target.value)}
                        placeholder="Bv. Optellen:"
                    />

                    <div style={S.row}>
                        <div style={{ flex: 1 }}>
                            <label style={{ ...S.label, marginTop: '12px' }}>Oefeningen</label>
                            <input
                                type="number" min="1"
                                style={S.input}
                                value={activeBlock.numberOfExercises || 10}
                                onChange={(e) => updateBlockSettings(activeBlock.id, { numberOfExercises: Number(e.target.value) })}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ ...S.label, marginTop: '12px' }}>Punten</label>
                            <input
                                type="number" step="0.5" min="0"
                                style={S.input}
                                value={activeBlock.totalPoints || 0}
                                onChange={(e) => updateBlockSettings(activeBlock.id, { totalPoints: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                        <label style={S.label}>Spatiëring ({activeBlock.verticalSpacing || 14}px)</label>
                        <input
                            type="range" min="8" max="40"
                            value={activeBlock.verticalSpacing || 14}
                            onChange={(e) => updateBlockSettings(activeBlock.id, { verticalSpacing: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: 'var(--accent-purple)' }}
                        />
                    </div>
                </div>
            </div>

            {/* ── 2. Engine (pill box) ── */}
            <div style={S.engineCard}>
                <div style={S.engineHeader}>
                    <span style={S.engineLabel}>Engine</span>
                    <button onClick={handleGenerate} style={S.generateBtn}>✨ Genereer</button>
                </div>
                <div style={S.engineBody}>
                    {activeBlock.typeId.includes('optellen') && <AdditionConfig block={activeBlock} />}
                    {activeBlock.typeId.includes('aftrekken') && <SubtractionConfig block={activeBlock} />}
                    {activeBlock.typeId.includes('vermenigvuldigen') && <MultiplicationConfig block={activeBlock} />}
                    {activeBlock.typeId.includes('delen') && <DivisionConfig block={activeBlock} />}
                    {activeBlock.typeId.startsWith('klok-') && <ClockConfig block={activeBlock} />}
                    {activeBlock.typeId === 'breuken' && <FractionConfig block={activeBlock} />}
                </div>
            </div>

            {/* ── 3. Differentiatie ── */}
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

                    {/* ── Scaffolding (hr-std: Kort / Lang / Stappen) ── */}
                    {isHrStd(activeBlock.typeId) && (
                        <>
                            <label style={{ ...S.label, marginTop: '12px' }}>Scaffolding</label>
                            <div style={S.btnGroup}>
                                <button onClick={() => updateBlockLayout(activeBlock.id, 'inline-short')} style={S.radioBtn((activeBlock.layoutPreset ?? 'inline-short') === 'inline-short')}>Kort</button>
                                <button onClick={() => updateBlockLayout(activeBlock.id, 'inline-long')}  style={S.radioBtn((activeBlock.layoutPreset ?? 'inline-short') === 'inline-long')}>Lang</button>
                                <button onClick={() => updateBlockLayout(activeBlock.id, 'stepped')}      style={S.radioBtn((activeBlock.layoutPreset ?? 'inline-short') === 'stepped')}>Stappen</button>
                            </div>
                            {(activeBlock.layoutPreset ?? 'inline-short') === 'stepped' && (
                                <div style={{ marginTop: '8px' }}>
                                    <label style={S.label}>Aantal stappenlijnen</label>
                                    <input
                                        type="number" min="1" max="10"
                                        style={S.input}
                                        value={activeBlock.steppedLines ?? 3}
                                        onChange={(e) => updateBlockLayout(activeBlock.id, 'stepped', Number(e.target.value))}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── 4. Advanced (accordion) ── */}
            <div style={S.advancedWrap}>
                <button style={S.advancedToggle} onClick={() => setAdvancedOpen(!advancedOpen)}>
                    <span>Advanced</span>
                    <span style={{ fontSize: '14px', transform: advancedOpen ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
                </button>
                {advancedOpen && (
                    <div style={{ ...S.card, marginTop: '8px', opacity: 0.5 }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>Binnenkort beschikbaar.</p>
                    </div>
                )}
            </div>
        </aside>
    );
}

const S = {
    sidebar: { width: '380px', minWidth: '380px', backgroundColor: 'var(--bg-dark)', borderLeft: '1px solid var(--border-color)', height: '100%', boxSizing: 'border-box', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' } as React.CSSProperties,
    card: { backgroundColor: 'var(--bg-panel)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' } as React.CSSProperties,
    cardTitle: { color: 'var(--accent-purple)', margin: '0 0 14px 0', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 } as React.CSSProperties,
    col: { display: 'flex', flexDirection: 'column', gap: '4px' } as React.CSSProperties,
    row: { display: 'flex', gap: '12px', alignItems: 'flex-end' } as React.CSSProperties,
    label: { display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 } as React.CSSProperties,
    footerGroupLabel: { display: 'block', fontSize: '11px', color: 'var(--text-main)', marginBottom: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' } as React.CSSProperties,
    input: { width: '100%', padding: '9px 10px', backgroundColor: '#1a1a1f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white', outline: 'none', boxSizing: 'border-box', fontSize: '13px' } as React.CSSProperties,
    select: { width: '100%', padding: '9px 10px', backgroundColor: '#1a1a1f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', outline: 'none', fontSize: '13px', cursor: 'pointer' } as React.CSSProperties,
    checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)' } as React.CSSProperties,
    checkboxGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: '4px' } as React.CSSProperties,
    checkbox: { accentColor: 'var(--accent-purple)', width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 } as React.CSSProperties,
    btnGroup: { display: 'flex', gap: '3px', backgroundColor: '#1a1a1f', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' } as React.CSSProperties,
    radioBtn: (active: boolean): React.CSSProperties => ({ padding: '6px 10px', fontSize: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: active ? 'var(--accent-purple)' : 'transparent', color: active ? 'white' : 'var(--text-muted)', fontWeight: active ? 'bold' : 'normal', flex: 1, whiteSpace: 'nowrap' }),

    engineCard: { backgroundColor: 'var(--bg-panel)', borderRadius: '10px', border: '1px solid rgba(172,41,233,0.35)', overflow: 'hidden' } as React.CSSProperties,
    engineHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: 'rgba(172,41,233,0.08)', borderBottom: '1px solid rgba(172,41,233,0.2)' } as React.CSSProperties,
    engineLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: 'var(--accent-purple)' } as React.CSSProperties,
    engineBody: { padding: '14px 16px' } as React.CSSProperties,
    generateBtn: { padding: '6px 14px', backgroundColor: 'var(--accent-purple)', border: 'none', color: 'white', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' } as React.CSSProperties,

    advancedWrap: { marginBottom: '8px' } as React.CSSProperties,
    advancedToggle: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' } as React.CSSProperties,
};
