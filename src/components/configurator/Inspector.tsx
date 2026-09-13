import { useMemo, useState } from 'react';
import { minWidthUnits, tierWidthPx } from '../../services/layout/blockLayout';
import { numberBlocks } from '../../services/layout/blockNumbering';
import { useIntrinsicWidth } from '../../hooks/useMeasuredHeights';
import type { FooterSlot } from '../../services/math/types';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import { ArrowUp, ArrowDown, Sparkle as Sparkles, WarningCircle, Info } from '@phosphor-icons/react';
import IconButton from '../ui/IconButton';
import { useWorksheetStore, DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type HeaderField } from '../../store/useWorksheetStore';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { DOMAIN_BY_TYPE } from '../../config/appstructure';
import { buildCatalog } from '../../config/exerciseCatalog';
import { regenerateBlock, GENERATION_FAILED } from '../../services/generateDispatch';
import { suggestionsFor } from '../../config/instructionPresets';
import { BODY_FONT_PX } from '../../config/printPalette';
import RegionStyleFields, { ResetAllStylesButton } from './RegionStyleFields';
import Switch from '../ui/Switch';
import { F } from './plugins/shared/fieldStyles';
import { ANSWER_SPACE_DEFAULT_PX } from '../viewer/BlockWidthContext';

const FIELD_RANGE: Record<HeaderField, { min: number; max: number; label: string }> = {
    naam:   { min: 100, max: 500, label: 'Naam' },
    klas:   { min: 60,  max: 300, label: 'Klas' },
    nummer: { min: 50,  max: 200, label: 'Nummer' },
    datum:  { min: 80,  max: 500, label: 'Datum' },
};

export default function Inspector({ embedded = false }: { embedded?: boolean } = {}) {
    const tab = useWorksheetStore((state) => state.inspectorTab);
    const staleBlocks = useWorksheetStore((state) => state.staleBlocks);
    const setInspectorTab = useWorksheetStore((state) => state.setInspectorTab);
    const bladSection = useWorksheetStore((state) => state.bladSection);
    const setBladSection = useWorksheetStore((state) => state.setBladSection);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [hoveredField, setHoveredField] = useState<HeaderField | null>(null);

    const rootStyle = embedded ? S.embedded : S.sidebar;
    const activeBlockId = useWorksheetStore((state) => state.activeBlockId);
    const activeBlock = useWorksheetStore((state) => state.blocks.find(b => b.id === activeBlockId));
    // How narrow this block's content actually is, as measured on the sheet. Subscribed
    // rather than read once: the measurement lands a frame after the render that caused it,
    // and a stale picker could grey out a width the sheet would now accept.
    const intrinsicWidth = useIntrinsicWidth(activeBlockId ?? '');
    // The chip's subject line: the printed opdracht number and a human label. The number
    // comes from the shared numberBlocks helper, so it cannot drift from the sheet.
    const blocks = useWorksheetStore((state) => state.blocks);
    const labelByType = useMemo(() => {
        const m: Record<string, string> = {};
        for (const item of buildCatalog()) if (!m[item.typeId]) m[item.typeId] = item.label;
        return m;
    }, []);
    const subject = useMemo(() => {
        if (!activeBlock) return null;
        const label = labelByType[activeBlock.typeId]
            || (activeBlock.instructionText || '').replace(/:\s*$/, '').trim()
            || activeBlock.typeId;
        return { number: numberBlocks(blocks)[activeBlock.id] ?? null, label };
    }, [activeBlock, blocks, labelByType]);
    const locked = useWorksheetStore((state) => !!state.curriculum?.locked);

    const headerData = useWorksheetStore((state) => state.header);
    const footerData = useWorksheetStore((state) => state.footer);
    const docSettings = useWorksheetStore((state) => state.docSettings);
    const updateHeader = useWorksheetStore((state) => state.updateHeader);
    const updateFooter = useWorksheetStore((state) => state.updateFooter);
    const updateDocSettings = useWorksheetStore((state) => state.updateDocSettings);

    const updateBlockInstruction = useWorksheetStore((state) => state.updateBlockInstruction);
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const setExercises = useWorksheetStore((state) => state.setExercises);
    const setGenerationNote = useWorksheetStore((state) => state.setGenerationNote);

    const handleGenerate = () => {
        if (!activeBlock) return;
        regenerateBlock(activeBlock, setExercises, setGenerationNote);
    };

    // Document ("Blad") settings. Always reachable from its own tab rather than only by
    // deselecting — a teacher who never deselects never discovered they existed.
    // Blad is three physically separate parts of the page, so it is three sub-tabs
    // named after them rather than one long scroll. The ids stay on the cards so a
    // click on the sheet can still land on the right one.
    const bladPanels = {
        koptekst: (<>
                {/* ── Koptekst — everything printed at the top of the page ── */}
                <div id="blad-koptekst" style={S.card}>
                    <h4 style={S.cardTitle}>Koptekst</h4>
                    <div style={S.col}>
                        <label style={S.label}>Koptekst stijl</label>
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

                        <div style={{ ...S.switchRow, marginTop: '12px' }}>
                            <span style={S.switchText}>Koptekst op elke pagina herhalen</span>
                            <Switch checked={!!headerData.repeatHeader} onChange={(v) => updateHeader({ repeatHeader: v })} aria-label="Koptekst op elke pagina herhalen" />
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '2px 0 0 0' }}>Enkel bij afdrukken: de naamvelden komen bovenaan elke pagina.</p>
                    </div>
                </div>

                <div style={S.card}>
                    <h4 style={S.cardTitle}>Vormgeving koptekst</h4>
                    <RegionStyleFields region="header" />
                </div>
        </>),
        opdrachten: (<>
                {/* ── Opdrachten — how every exercise block is presented ── */}
                <div id="blad-opdrachten" style={S.card}>
                    <h4 style={S.cardTitle}>Opdrachten</h4>
                    <div style={S.col}>
                        <div style={S.switchRow}><span style={S.switchText}>Scores tonen</span><Switch checked={docSettings.showScores} onChange={(v) => updateDocSettings({ showScores: v })} aria-label="Scores tonen" /></div>
                        <div style={S.switchRow}><span style={S.switchText}>Scheidingslijn tussen oefeningen</span><Switch checked={docSettings.showDividers} onChange={(v) => updateDocSettings({ showDividers: v })} aria-label="Scheidingslijn tussen oefeningen" /></div>
                        {/* Only draws where two blocks share a row, so it does nothing on a
                            one-column sheet — hence the hint rather than a disabled switch. */}
                        <div style={S.switchRow}><span style={S.switchText}>Scheidingslijn tussen kolommen</span><Switch checked={!!docSettings.showColumnDividers} onChange={(v) => updateDocSettings({ showColumnDividers: v })} aria-label="Scheidingslijn tussen kolommen" /></div>
                        <p style={S.hintText}>Verschijnt alleen waar twee blokken naast elkaar staan.</p>
                        {/* Skyline vs rows. On (the default) a blok schuift omhoog onder een
                            korter buurblok; off keeps whole rows aligned across the page. */}
                        <div style={S.switchRow}><span style={S.switchText}>Blokken aansluiten</span><Switch checked={(docSettings.packMode ?? 'aansluitend') === 'aansluitend'} onChange={(v) => updateDocSettings({ packMode: v ? 'aansluitend' : 'rijen' })} aria-label="Blokken aansluiten" /></div>
                        <p style={S.hintText}>Blokken schuiven op onder een korter buurblok. Uit: blokken blijven in rijen uitgelijnd.</p>
                        <div style={S.switchRow}><span style={S.switchText}>Opdrachten nummeren</span><Switch checked={docSettings.numberBlocks} onChange={(v) => updateDocSettings({ numberBlocks: v })} aria-label="Opdrachten nummeren" /></div>

                        <label style={{ ...S.label, marginTop: '10px' }}>Ruimte tussen oefenreeksen: {docSettings.blockSpacing ?? 12}px</label>
                        <input type="range" min="4" max="48" step="2"
                            value={docSettings.blockSpacing ?? 12}
                            onChange={(e) => updateDocSettings({ blockSpacing: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />

                        {/* Writing space: the height of ONE answer line, fed onto
                            .print-area-shell as --sheet-answer-h. Every answer line and
                            one-line answer box in every viewer is a factor of it, so this
                            one slider widens them all. Distinct from "Witruimte" per block,
                            which is the gap BETWEEN exercises. */}
                        {(() => {
                            const px = docSettings.answerSpace ?? ANSWER_SPACE_DEFAULT_PX;
                            const word = px <= 16 ? 'klein' : px >= 24 ? 'ruim' : 'normaal';
                            return (
                                <>
                                    <label style={{ ...S.label, marginTop: '10px' }}>Schrijfruimte: {word} ({px}px)</label>
                                    <input type="range" min="14" max="32" step="1"
                                        value={px}
                                        onChange={(e) => updateDocSettings({ answerSpace: Number(e.target.value) })}
                                        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                                    <p style={S.hintText}>Hoe hoog elke antwoordlijn is. Groeit mee met de lettergrootte.</p>
                                </>
                            );
                        })()}

                        <label style={{ ...S.label, marginTop: '12px' }}>Opdracht stijl</label>
                        <div className="seg-group">
                            {(['regular', 'underlined', 'boxed'] as const).map((s) => (
                                <button key={s} onClick={() => updateDocSettings({ opdrachtTitelStyle: s })} className="seg-btn" aria-pressed={docSettings.opdrachtTitelStyle === s}>
                                    {s === 'regular' ? 'Normaal' : s === 'underlined' ? 'Onderstreept' : 'Kader'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={S.card}>
                    <h4 style={S.cardTitle}>Vormgeving opdracht-titel</h4>
                    <RegionStyleFields region="titel" />
                </div>

                <div style={S.card}>
                    <h4 style={S.cardTitle}>Lettergrootte</h4>
                    {/* Sheet-wide base sizes (pt), fed onto .print-area-shell as CSS tokens
                        --sheet-size-math / --sheet-size-text (theme.css). Distinct from the
                        zoom slider below: these are the BASE every viewer px scales from,
                        bodyFontScale is a multiplier on top of the result. */}
                    <div style={S.col}>
                        <label style={S.label}>Cijfers: {docSettings.fontSizeMath ?? 13}pt</label>
                        <input type="range" min={11} max={16} step={1}
                            value={docSettings.fontSizeMath ?? 13}
                            onChange={(e) => updateDocSettings({ fontSizeMath: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                        <p style={S.hintText}>Alle getallen en rekenwerk.</p>

                        <label style={{ ...S.label, marginTop: '10px' }}>Opdrachttekst: {docSettings.fontSizeText ?? 15}pt</label>
                        <input type="range" min={12} max={18} step={1}
                            value={docSettings.fontSizeText ?? 15}
                            onChange={(e) => updateDocSettings({ fontSizeText: Number(e.target.value) })}
                            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                        <p style={S.hintText}>Opdrachten en woorden.</p>
                    </div>
                </div>

                <div style={S.card}>
                    <h4 style={S.cardTitle}>Tekstgrootte oefeningen</h4>
                    {/* Sheet-wide, not per region: scales every block's exercise body and its
                        opdracht-titel together. Shown in px against the base; stored as a zoom
                        factor. From 16px up, wide blocks start getting auto-shrunk to fit. */}
                    {(() => {
                        const px = Math.round((docSettings.bodyFontScale ?? 1) * BODY_FONT_PX.base);
                        const bigText = px >= 16;
                        return (
                            <>
                                <label style={{ ...S.label, color: bigText ? 'var(--danger)' : undefined }}>
                                    {bigText ? '⚠ ' : ''}Tekstgrootte oefeningen: {px} px
                                </label>
                                <input
                                    type="range" min={BODY_FONT_PX.min} max={BODY_FONT_PX.max} step={BODY_FONT_PX.step}
                                    value={px}
                                    onChange={(e) => updateDocSettings({ bodyFontScale: Number(e.target.value) / BODY_FONT_PX.base })}
                                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                                />
                                {bigText && (
                                    <p style={S.hintText}>Grote tekst kan brede oefeningen automatisch verkleinen om op de pagina te passen.</p>
                                )}
                                <div style={{ marginTop: 'var(--sp-4)' }}><ResetAllStylesButton /></div>
                            </>
                        );
                    })()}
                </div>
        </>),
        voettekst: (<>
                {/* ── Voettekst — everything printed at the bottom of the page ── */}
                <div id="blad-voettekst" style={S.card}>
                    <h4 style={S.cardTitle}>Voettekst</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '0 0 8px' }}>De voettekst staat onderaan elke pagina.</p>
                    <label style={S.label}>Voettekst stijl</label>
                    <div className="seg-group" style={{ marginBottom: '12px' }}>
                        {(['geen', 'lijn', 'kader'] as const).map((v) => (
                            <button key={v} onClick={() => updateDocSettings({ footerStyle: v })} className="seg-btn" aria-pressed={(docSettings.footerStyle ?? 'geen') === v}>
                                {v === 'geen' ? 'Geen' : v === 'lijn' ? 'Lijn' : 'Kader'}
                            </button>
                        ))}
                    </div>
                    <div style={S.col}>
                        {/* The credit always prints — only its position is a choice. Whichever
                            position holds it shows the credit instead of that position's slot. */}
                        <label style={S.footerGroupLabel}>Plaats van "Gemaakt met RekenRaak.be"</label>
                        <div className="seg-group" style={{ marginBottom: '12px' }}>
                            {([['left', 'Links'], ['center', 'Midden'], ['right', 'Rechts']] as const).map(([v, l]) => (
                                <button key={v} className="seg-btn" aria-pressed={(footerData.brandSlot ?? 'left') === v}
                                    onClick={() => updateFooter({ brandSlot: v })}>{l}</button>
                            ))}
                        </div>

                        {([['slotLeft', 'Links'], ['slotCenter', 'Midden'], ['slotRight', 'Rechts']] as const).map(([key, label]) => {
                            const brandHere = (footerData.brandSlot ?? 'left') === (key === 'slotLeft' ? 'left' : key === 'slotCenter' ? 'center' : 'right');
                            if (brandHere) return (
                                <div key={key} style={{ marginBottom: '10px' }}>
                                    <label style={S.footerGroupLabel}>{label}</label>
                                    <p style={{ ...S.hintText, margin: 0 }}>Gemaakt met RekenRaak.be</p>
                                </div>
                            );
                            const cur = (footerData[key] ?? 'leeg') as FooterSlot;
                            return (
                                <div key={key} style={{ marginBottom: '10px' }}>
                                    <label style={S.footerGroupLabel}>{label}</label>
                                    <select
                                        style={S.select}
                                        value={cur}
                                        onChange={(e) => updateFooter({ [key]: e.target.value as FooterSlot })}
                                    >
                                        <option value="leeg">Leeg</option>
                                        <option value="vrije-tekst">Vrije tekst</option>
                                        <option value="paginanummer">Paginanummer</option>
                                        <option value="school">School</option>
                                        <option value="klas">Klas</option>
                                        <option value="leerkracht">Leerkracht</option>
                                        <option value="datum">Datum van vandaag</option>
                                    </select>

                                    {cur === 'vrije-tekst' && (
                                        <input
                                            style={{ ...S.input, marginTop: '6px' }}
                                            value={(key === 'slotLeft' ? footerData.leftText : key === 'slotCenter' ? footerData.centerText : footerData.rightText) || ''}
                                            onChange={(e) => updateFooter(key === 'slotLeft'
                                                ? { leftText: e.target.value }
                                                : key === 'slotCenter'
                                                ? { centerText: e.target.value }
                                                : { rightText: e.target.value })}
                                            placeholder="Eigen tekst"
                                        />
                                    )}
                                    {cur === 'school' && (
                                        <input style={{ ...S.input, marginTop: '6px' }} value={footerData.school || ''} onChange={(e) => updateFooter({ school: e.target.value })} placeholder="Bv. VBS De Vlinder" />
                                    )}
                                    {cur === 'klas' && (
                                        <input style={{ ...S.input, marginTop: '6px' }} value={footerData.klas || ''} onChange={(e) => updateFooter({ klas: e.target.value })} placeholder="Bv. L3a" />
                                    )}
                                    {cur === 'leerkracht' && (
                                        <input style={{ ...S.input, marginTop: '6px' }} value={footerData.leerkracht || ''} onChange={(e) => updateFooter({ leerkracht: e.target.value })} placeholder="Bv. Meester Ruben" />
                                    )}
                                    {cur === 'paginanummer' && (
                                        <div className="seg-group" style={{ marginTop: '6px' }}>
                                            {([['lang', 'Pagina 2 van 3'], ['kort', '2 / 3'], ['cijfer', '2']] as const).map(([v, l]) => (
                                                <button key={v} className="seg-btn" aria-pressed={(footerData.pageFormat ?? 'lang') === v} onClick={() => updateFooter({ pageFormat: v })}>{l}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div style={S.card}>
                    <h4 style={S.cardTitle}>Vormgeving voettekst</h4>
                    <RegionStyleFields region="footer" />
                </div>
        </>),
    } as const;

    const docContent = (
            <>
                {/* Inner level: underline tabs, not a second pill group. Two identical
                    segmented controls stacked gave no clue which level you were operating. */}
                <div className="sub-tabs" style={{ marginBottom: 'var(--sp-4)' }}>
                    {([['koptekst', 'Koptekst'], ['opdrachten', 'Opdrachten'], ['voettekst', 'Voettekst']] as const).map(([id, label]) => (
                        <button key={id} className="sub-tab" aria-pressed={bladSection === id} onClick={() => setBladSection(id)}>{label}</button>
                    ))}
                </div>
                {bladPanels[bladSection]}
            </>
    );

    const isStale = !!activeBlock && !!staleBlocks[activeBlock.id];
    // The family owns its own Opmaak sections; the registry says which ones this block gets.
    const ui = activeBlock ? EXERCISE_UI[activeBlock.typeId] : undefined;
    const StyleConfig = ui?.StyleConfig;
    const AdvancedConfig = ui?.AdvancedConfig;
    const advancedApplies = ui?.advancedApplies;

    const blockContent = !activeBlock ? null : (
        <>
            {locked && (
                <div style={S.lockBanner}>
                    🔒 Vergrendeld curriculum — je kan enkel het aantal aanpassen en opnieuw genereren.
                </div>
            )}

            {/* ── Weergave: how the block looks on the sheet ── */}
            {tab === 'weergave' && (<>
            {/* ── 1. Opdrachtblok ── */}
            {(() => {
                // Sheet furniture has no exercises, so instruction/score/aantal do not apply.
                const isFurniture = activeBlock.typeId.startsWith('layout-');
                const aantal = activeBlock.numberOfExercises || 10;
                const scoreMax = Math.max(1, aantal * 2);   // Score caps at 2 points per exercise
                const sliderStyle = (on: boolean): React.CSSProperties => ({ width: '100%', accentColor: 'var(--accent-purple)', cursor: on ? 'pointer' : 'not-allowed', opacity: on ? 1 : 0.5 });
                return (
                    <div style={S.card}>
                        <h4 style={S.cardTitle}>{isFurniture ? 'Bladonderdeel' : 'Opdrachtblok'}</h4>
                        <div style={S.col}>
                            {!isFurniture && <>
                            <label style={S.label}>Instructie</label>
                            <input
                                style={S.input}
                                value={activeBlock.instructionText || ''}
                                onChange={(e) => updateBlockInstruction(activeBlock.id, e.target.value)}
                                placeholder="Los op."
                                disabled={locked}
                            />
                            {/* Quick-pick standard texts so the titel is one click, not a retype. */}
                            <select
                                style={{ ...S.input, marginTop: '6px', cursor: locked ? 'not-allowed' : 'pointer', color: 'var(--text-muted)' }}
                                value=""
                                disabled={locked}
                                onChange={(e) => { if (e.target.value) updateBlockInstruction(activeBlock.id, e.target.value); }}
                            >
                                <option value="">Standaardtekst…</option>
                                {suggestionsFor(activeBlock.typeId, activeBlock.leafId, activeBlock.constraints as BlockConstraints).map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>

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
                            </>}

                            {/* Breedte op de pagina — the page grid is 4 units wide, so a block
                                is a whole, a half or a quarter. Widths narrower than the block's
                                own minimum are disabled rather than silently overridden. */}
                            {(() => {
                                // Same measurement the packer clamps against (see App's
                                // minWidthOf): the picker must never grey out a width the
                                // sheet would in fact accept, and when it does grey one out
                                // it can say in px why.
                                const iw = intrinsicWidth;
                                const min = minWidthUnits(activeBlock, iw && { intrinsicPx: iw.px, atWidth: iw.atWidth });
                                const cur = Math.max(activeBlock.widthUnits ?? 4, min);
                                const OPTIONS: Array<{ w: 1 | 2 | 4; label: string }> = [
                                    { w: 4, label: 'Vol' }, { w: 2, label: '½' }, { w: 1, label: '¼' },
                                ];
                                const tooNarrow = (w: 1 | 2 | 4) => (iw
                                    ? `Te smal: de inhoud is ${Math.round(iw.px)}px breed, deze kolom biedt ${tierWidthPx(w)}px.`
                                    : 'Te smal voor dit type bij deze instellingen');
                                return (
                                    <>
                                        <label style={{ ...S.label, marginTop: '14px' }}>Breedte op de pagina</label>
                                        <div className="seg-group">
                                            {OPTIONS.map(o => (
                                                <button
                                                    key={o.w}
                                                    className="seg-btn"
                                                    aria-pressed={cur === o.w}
                                                    disabled={locked || o.w < min}
                                                    title={o.w < min ? tooNarrow(o.w) : undefined}
                                                    onClick={() => updateBlockSettings(activeBlock.id, { widthUnits: o.w })}
                                                >{o.label}</button>
                                            ))}
                                        </div>
                                        <p style={S.hintText}>
                                            {iw
                                                ? `De inhoud is ${Math.round(iw.px)}px breed. Smalst mogelijk: ${min === 4 ? 'vol' : min === 2 ? '½' : '¼'}.`
                                                : min === 4
                                                    ? 'Dit type heeft de volle breedte nodig.'
                                                    : `Smalst mogelijk bij deze instellingen: ${min === 2 ? '½' : '¼'}.`}
                                        </p>
                                        {/* Same condition the packer calls `promoted`: the chosen
                                            width was kept but overridden, so say so rather than
                                            let the sheet silently disagree with the buttons. */}
                                        {(activeBlock.widthUnits ?? 4) < min && (
                                            <p style={S.hintText}>
                                                Verbreed naar {min === 4 ? 'vol' : '½'}: te smal voor deze instellingen.
                                            </p>
                                        )}

                                        {/* The other way out of "it does not fit": shrink the block
                                            instead of widening it. Opt-in per block and right under the
                                            width picker, because a block that quietly renders smaller
                                            than the identical one beside it is a font-size mismatch on
                                            paper — it has to be a choice the teacher made. Stays
                                            available under a curriculum lock, like the width picker. */}
                                        <div style={{ ...S.switchRow, marginTop: '12px' }}>
                                            <span style={S.switchText}>Verklein om in de kolom te passen</span>
                                            <Switch
                                                checked={activeBlock.constraints?.fitToWidth === true}
                                                onChange={(v) => updateBlockSettings(activeBlock.id, { constraints: { ...activeBlock.constraints, fitToWidth: v || undefined } })}
                                                aria-label="Verklein om in de kolom te passen"
                                            />
                                        </div>
                                        <p style={S.hintText}>Uit: een blok dat niet past wordt verbreed. Aan: het blok wordt tot 85 % verkleind.</p>
                                    </>
                                );
                            })()}

                            {/* Spacing and per-block text size are shown outright: the Weergave
                                tab exists for exactly these, so a disclosure inside it would
                                hide them behind a second click for no reason. */}
                            {!locked && (
                                <>
                                    {(
                                        <>
                                            {!activeBlock.typeId.startsWith('cijferen-') && (
                                                <>
                                                    <label style={{ ...S.label, marginTop: '10px' }}>Witruimte ({activeBlock.verticalSpacing || 14}px)</label>
                                                    <input
                                                        type="range" min="8" max="40"
                                                        value={activeBlock.verticalSpacing || 14}
                                                        onChange={(e) => updateBlockSettings(activeBlock.id, { verticalSpacing: Number(e.target.value) })}
                                                        style={sliderStyle(true)}
                                                    />
                                                </>
                                            )}

                                            {/* Per-block writing space: overrides --sheet-answer-h for this block
                                                only (ScaledBlock writes it). Falls back to Blad › Opdrachten ›
                                                Schrijfruimte when no override is set. */}
                                            {(() => {
                                                const override: number | undefined = activeBlock.constraints?.answerSpace;
                                                const px = override ?? docSettings.answerSpace ?? ANSWER_SPACE_DEFAULT_PX;
                                                return (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                                                            <label style={{ ...S.label, marginTop: 0 }}>
                                                                Schrijfruimte (dit blok) ({px}px){override == null ? ' · volgt blad' : ''}
                                                            </label>
                                                            {override != null && (
                                                                <button
                                                                    onClick={() => updateBlockSettings(activeBlock.id, { constraints: { ...activeBlock.constraints, answerSpace: undefined } })}
                                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: '11px', padding: 0 }}>
                                                                    ↺ volg blad
                                                                </button>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="range" min="14" max="32" step="1"
                                                            value={px}
                                                            onChange={(e) => updateBlockSettings(activeBlock.id, { constraints: { ...activeBlock.constraints, answerSpace: Number(e.target.value) } })}
                                                            style={sliderStyle(true)}
                                                        />
                                                    </>
                                                );
                                            })()}

                                            {/* Per-block text-size override (CSS zoom). Falls back to the global
                                                'Tekstgrootte oefeningen' when no override is set. */}
                                            {(() => {
                                                const override: number | undefined = activeBlock.constraints?.bodyFontScale;
                                                const effective = override ?? docSettings.bodyFontScale ?? 1;
                                                const px = Math.round(effective * BODY_FONT_PX.base);
                                                return (
                                                    <>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                                                            <label style={{ ...S.label, marginTop: 0 }}>
                                                                Tekstgrootte blok ({px} px){override == null ? ' · volgt blad' : ''}
                                                            </label>
                                                            {override != null && (
                                                                <button
                                                                    onClick={() => updateBlockSettings(activeBlock.id, { constraints: { ...activeBlock.constraints, bodyFontScale: undefined } })}
                                                                    style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: '11px', padding: 0 }}>
                                                                    ↺ volg blad
                                                                </button>
                                                            )}
                                                        </div>
                                                        <input
                                                            type="range" min={BODY_FONT_PX.min} max={BODY_FONT_PX.max} step={BODY_FONT_PX.step}
                                                            value={px}
                                                            onChange={(e) => updateBlockSettings(activeBlock.id, { constraints: { ...activeBlock.constraints, bodyFontScale: Number(e.target.value) / BODY_FONT_PX.base } })}
                                                            style={sliderStyle(true)}
                                                        />
                                                    </>
                                                );
                                            })()}

                                            {/* The title row is presentation: hiding it leaves the block in the
                                                opdracht numbering, so the numbers after it never shift.
                                                layout-* furniture has no title row to begin with. */}
                                            {!activeBlock.typeId.startsWith('layout-') && (<>
                                            <div style={{ ...S.switchRow, marginTop: '12px' }}>
                                                <span style={S.switchText}>Opdrachttekst tonen</span>
                                                <Switch
                                                    checked={activeBlock.showInstruction !== false}
                                                    // Turning the title back on also clears skipNumbering: that flag only
                                                    // means something while the title is hidden, else "0." leaks through.
                                                    onChange={(v) => updateBlockSettings(activeBlock.id, v ? { showInstruction: undefined, skipNumbering: undefined } : { showInstruction: false })}
                                                    aria-label="Opdrachttekst tonen"
                                                />
                                            </div>
                                            <p style={S.hintText}>Uit: het blok krijgt geen titelregel. De nummering telt het blok standaard nog mee.</p>
                                            {/* Only offered once the title row is hidden: a numbered block that shows
                                                no number would renumber the whole sheet for nothing. */}
                                            {activeBlock.showInstruction === false && (<>
                                            <div style={{ ...S.switchRow, marginTop: '12px' }}>
                                                <span style={S.switchText}>Meetellen in de nummering</span>
                                                <Switch
                                                    checked={activeBlock.skipNumbering !== true}
                                                    onChange={(v) => updateBlockSettings(activeBlock.id, { skipNumbering: v ? undefined : true })}
                                                    aria-label="Meetellen in de nummering"
                                                />
                                            </div>
                                            <p style={S.hintText}>Uit: de volgende opdracht krijgt dit nummer.</p>
                                            </>)}
                                            </>)}

                                            {/* Opt-in height back-off (ScaledBlock): only bites on a block that is
                                                taller than a page, so it is shown always rather than tied to the
                                                packer's `spans` flag, which the Inspector cannot see. */}
                                            <div style={{ ...S.switchRow, marginTop: '12px' }}>
                                                <span style={S.switchText}>Verklein om op één pagina te passen</span>
                                                <Switch
                                                    checked={activeBlock.constraints?.fitToPage === true}
                                                    onChange={(v) => updateBlockSettings(activeBlock.id, { constraints: { ...activeBlock.constraints, fitToPage: v || undefined } })}
                                                    aria-label="Verklein om op één pagina te passen"
                                                />
                                            </div>
                                            <p style={S.hintText}>Alleen voor blokken die groter zijn dan één pagina.</p>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })()}

            </>)}

            {/* ── Oefening: what the block generates ── */}
            {tab === 'oefening' && (<>
            {/* ── 2. Oefeningen — exercise-type settings + the Genereer CTA (shared
                   primary IconButton); same card chrome as every other section. ── */}
            <div style={S.card}>
                {/* Sticky so it never scrolls out of reach, and it SAYS when the exercises
                    no longer match the settings — the real problem was not reaching the
                    button, it was not knowing the sheet had gone stale. */}
                <div style={{ ...S.engineHeader, position: 'sticky', top: 0, zIndex: 3, background: 'var(--bg-surface)', paddingTop: 'var(--sp-1)' }}>
                    <h4 style={{ ...S.cardTitle, margin: 0 }}>Oefeningen</h4>
                    <IconButton
                        icon={Sparkles}
                        label={isStale ? 'Instellingen gewijzigd — genereer opnieuw' : 'Genereer oefeningen'}
                        visibleLabel={isStale ? 'Genereer •' : 'Genereer'}
                        variant="primary"
                        onClick={handleGenerate}
                        dataTour="generate-block"
                    />
                </div>
                {isStale && (
                    <p style={{ ...S.hintText, color: 'var(--accent)', margin: '0 0 var(--sp-2)' }}>
                        De instellingen zijn gewijzigd. Klik Genereer om de oefeningen bij te werken.
                    </p>
                )}
                {/* What the last generate had to do with these settings: which constraints
                    it relaxed, how many were possible, or that the generator failed outright
                    (that last one is a fault, so it reads as one). */}
                {activeBlock.generationNote && (() => {
                    const note = activeBlock.generationNote;
                    const failed = note.startsWith(GENERATION_FAILED);
                    // Bold only the lead sentence ("Instellingen versoepeld: ...") so the
                    // reason that follows the ':' or '—' still reads as plain explanation.
                    const sepIdx = (() => {
                        const candidates = [note.indexOf(':'), note.indexOf('—')].filter(i => i >= 0);
                        return candidates.length ? Math.min(...candidates) : -1;
                    })();
                    const lead = sepIdx >= 0 ? note.slice(0, sepIdx) : note;
                    const rest = sepIdx >= 0 ? note.slice(sepIdx) : '';
                    const NoteIcon = failed ? WarningCircle : Info;
                    return (
                        <div style={{
                            display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-start',
                            padding: '8px', border: `1px solid ${failed ? 'var(--danger)' : 'var(--accent)'}`,
                            borderRadius: 'var(--radius-sm)', background: failed ? 'var(--danger-soft)' : 'var(--accent-soft)',
                            color: 'var(--text-main)', fontSize: 'var(--text-xs)', margin: '0 0 var(--sp-2)',
                        }}>
                            <NoteIcon size={16} weight="fill" style={{ flexShrink: 0, marginTop: '1px', color: failed ? 'var(--danger)' : 'var(--accent)' }} />
                            <span><strong>{lead}</strong>{rest}</span>
                        </div>
                    );
                })()}
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

                    {/* Everything below the instruction prefix is family business: the registry
                        says which section belongs to this typeId, so the Inspector never branches
                        on one. See EXERCISE_UI[typeId].StyleConfig in exerciseUI.tsx. */}
                    {StyleConfig && <StyleConfig block={activeBlock} />}
                </div>
            </div>
            )}

            {/* ── 4. Geavanceerd (accordion) ── */}
            {/* The accordion exists when the family registered a body for it; some families
                only want it under certain settings, which is what advancedApplies answers. */}
            {!locked && AdvancedConfig && (!advancedApplies || advancedApplies(activeBlock)) && (
                <div style={S.advancedWrap}>
                    <button
                        onClick={() => setAdvancedOpen(!advancedOpen)}
                        style={{ ...S.label, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                        Geavanceerd <span style={{ fontSize: '10px' }}>{advancedOpen ? '▾' : '▸'}</span>
                    </button>
                    {advancedOpen && (
                        <div style={{ ...S.card, marginTop: '8px' }}>
                            <div style={S.col}>
                                <AdvancedConfig block={activeBlock} />
                            </div>
                        </div>
                    )}
                </div>
            )}
            </>)}
        </>
    );

    // Blad is always available; the two block tabs need a selection. Weergave holds how the
    // block LOOKS, Oefening holds what it generates — the split you cannot make while one
    // panel is a single scroll of everything.
    const hasBlock = !!activeBlock;   // 'document' resolves to no block, as in TopBar
    const shown = !hasBlock ? 'blad' : tab;


    return (
        <aside data-tour="inspector" style={rootStyle}>
            {/* Say what is selected before showing controls — otherwise the panel is a
                pile of settings with no stated subject (UI-GUIDE rule 1). */}
            {(() => {
                const domain = activeBlock ? DOMAIN_BY_TYPE[activeBlock.typeId] : undefined;
                const rail = domain ? `var(--domain-${domain.name}-line)` : 'var(--separator)';
                return (
                    <div style={S.subjectChip(rail)}>
                        <span style={S.subjectName}>
                            {activeBlock && subject
                                ? `${subject.number ? `${subject.number}. ` : ''}${subject.label}`
                                : 'Heel het blad'}
                        </span>
                        <span style={S.subjectDomain}>
                            {activeBlock ? (domain?.label ?? 'Bladonderdeel') : 'Geen oefening gekozen'}
                        </span>
                    </div>
                );
            })()}
            <div className="panel-head">
                <div className="seg-group">
                    {([['oefening', 'Oefeningen', hasBlock], ['weergave', 'Opmaak', hasBlock], ['blad', 'Blad', true]] as const).map(([id, label, on]) => (
                        <button
                            key={id}
                            className="seg-btn"
                            aria-pressed={shown === id}
                            disabled={!on}
                            title={on ? undefined : 'Kies eerst een blok op het blad'}
                            onClick={() => setInspectorTab(id)}
                        >{label}</button>
                    ))}
                </div>
            </div>
            <div style={S.panelScroll}>
                {shown === 'blad' ? docContent : blockContent}
            </div>
        </aside>
    );
}

const S = {
    // Embedded in the left panel's Instellingen tab: no own width or edge, just fill the tab.
    embedded: { flex: 1, minHeight: 0, overflowY: 'auto', boxSizing: 'border-box', padding: 'var(--sp-3) var(--sp-4) var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' } as React.CSSProperties,
    sidebar: { width: '366px', minWidth: '366px', backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--separator)', height: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    // "You are editing this" — the same domain rail the sidebar and Overzicht use, so one
    // marker means one thing everywhere. The domain is always named in words (rule 7).
    subjectChip: (rail: string): React.CSSProperties => ({
        flex: 'none', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        padding: '0 var(--sp-4)', height: 'var(--bar-h)',
        borderLeft: `3px solid ${rail}`,
        borderBottom: '1px solid var(--separator)', background: 'var(--bg-surface)',
        minWidth: 0,
    }),
    subjectName: {
        fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
    } as React.CSSProperties,
    subjectDomain: {
        marginLeft: 'auto', flexShrink: 0,
        fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap',
    } as React.CSSProperties,

    panelScroll: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--sp-3) var(--sp-5) var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' } as React.CSSProperties,
    lockBanner: { padding: 'var(--sp-3)', fontSize: 'var(--text-sm)', lineHeight: 1.4, color: 'var(--text-main)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)' } as React.CSSProperties,
    // Flat section (no boxed "pill") — header + content separated by a hairline; reclaims the
    // horizontal space the card border/padding used to eat. Panel bg comes from the frosted aside.
    card: { padding: '0 0 var(--sp-4)', borderBottom: '1px solid var(--separator)' } as React.CSSProperties,
    // Section title: calm, sentence-case, weight-driven (not tiny UPPERCASE tracked).
    cardTitle: { color: 'var(--text-main)', margin: '0 0 var(--sp-3) 0', fontSize: 'var(--text-md)', fontWeight: 600, letterSpacing: '-0.01em' } as React.CSSProperties,
    col: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    row: { display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-end' } as React.CSSProperties,
    label: F.label,
    footerGroupLabel: { display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-main)', marginBottom: 'var(--sp-2)', fontWeight: 600 } as React.CSSProperties,
    input: F.input,
    select: { width: '100%', padding: '7px 10px', backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', outline: 'none', fontSize: 'var(--text-sm)', cursor: 'pointer' } as React.CSSProperties,
    checkboxLabel: F.checkboxLabel,
    switchRow: F.switchRow,
    switchText: F.switchText,
    checkboxGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2) var(--sp-3)', marginTop: 'var(--sp-1)' } as React.CSSProperties,
    checkbox: F.checkbox,
    // Segmented control: neutral track, selected segment = accent-soft tint + accent
    // text + accent ring (the one canonical selected look — same as sharedPluginStyles).
    // radioBtn = the separated bordered-button style; still used for the vertical list-row
    // selectors (level/scaffolding lists). True segmented groups use .seg-group/.seg-btn.
    radioBtn: F.radioBtn,

    // Engine header: title row with the Genereer CTA on the right (plain card chrome).
    engineHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' } as React.CSSProperties,
    engineBody: {} as React.CSSProperties,

    advancedWrap: { marginBottom: 'var(--sp-2)' } as React.CSSProperties,
    hintText: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 'var(--sp-1) 0 0', lineHeight: 1.4 } as React.CSSProperties,
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
