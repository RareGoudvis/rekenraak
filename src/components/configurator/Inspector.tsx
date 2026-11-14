import { useMemo, useState, type ReactNode } from 'react';
import { blockHasSteps, blockHasTutorSteps, effectiveSolutionSteps } from '../../services/stepsAvailability';
import { minWidthUnits, pickerMinWidthUnits, tierWidthPx } from '../../services/layout/blockLayout';
import { numberBlocks } from '../../services/layout/blockNumbering';
import { useIntrinsicWidth, useIntrinsicEntries } from '../../hooks/useMeasuredHeights';
import type { FooterSlot, MathBlock } from '../../services/math/types';
import type { BlockConstraints } from '../../services/math/constraintTypes';
import { ArrowUp, ArrowDown, Sparkle as Sparkles, Minus, Plus } from '@phosphor-icons/react';
import IconButton from '../ui/IconButton';
import { useWorksheetStore, DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type HeaderField } from '../../store/useWorksheetStore';
import type { InspectorBlockSection, InspectorBladSection } from '../../store/types';
import { EXERCISE_UI, type ExerciseUIDef, type ConfigComponent } from '../../config/exerciseUI';
import { REGISTRY } from '../../config/exerciseRegistry';
import { LEAF_BY_ID } from '../../config/appstructure';
import { buildCatalog } from '../../config/exerciseCatalog';
import { regenerateBlock } from '../../services/generateDispatch';
import GenerationNote from './GenerationNote';
import { suggestionsFor } from '../../config/instructionPresets';
import { BODY_FONT_PX } from '../../config/printPalette';
import RegionStyleFields, { ResetAllStylesButton } from './RegionStyleFields';
import FontStyleFields from './FontStyleFields';
import InspectorAccordion, { InspectorSection, InspectorStyles } from './InspectorAccordion';
import FontFamilyPicker from './FontFamilyPicker';
import { TEXT_FONT_OPTIONS, MATH_FONT_OPTIONS, type FontOption } from '../../config/fontOptions';
import type { RegionStyle } from '../../store/useWorksheetStore';
import Switch from '../ui/Switch';
import { F } from './plugins/shared/fieldStyles';
import { ANSWER_SPACE_DEFAULT_PX } from '../viewer/BlockWidthContext';
import QuickBlock from './QuickBlock';
import { effectiveSidebarTab } from '../../services/eenvoudigMode';

// The two optional registry slots the Inspector reads besides the configs: a one-line
// "Wat oefenen ze" summary and the Verbetersleutel section body. Both may be absent.
type InspectorUI = ExerciseUIDef & { summary?: (block: MathBlock) => string; SolutionConfig?: ConfigComponent };

const FIELD_RANGE: Record<HeaderField, { min: number; max: number; label: string }> = {
    naam:   { min: 100, max: 500, label: 'Naam' },
    klas:   { min: 60,  max: 300, label: 'Klas' },
    nummer: { min: 50,  max: 200, label: 'Nummer' },
    datum:  { min: 80,  max: 500, label: 'Datum' },
};

const COUNT_MIN = 1;
const COUNT_MAX = 20;
const WIDTH_WORD: Record<number, string> = { 4: 'vol', 2: '½', 1: '¼' };
const PREFIX_WORD = { geen: '', mag: 'MAG', moet: 'MOET', plus: '★', aangepast: '' } as const;
const SIDE_WORD = { left: 'links', center: 'midden', right: 'rechts' } as const;

// "Andika", not "Ubuntu (standaard)" or "Arial (op deze computer)": the summary is one short line.
const fontName = (options: FontOption[], value: string | undefined) =>
    (options.find(o => o.value === value) ?? options[0]).label.replace(/\s*\(.*\)$/, '');
// Joins the summary parts that apply and capitalises the first, so every summary reads as one line.
const summaryOf = (parts: Array<string | null | false | undefined>) => {
    const s = parts.filter(Boolean).join(' · ');
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function Inspector({ embedded = false }: { embedded?: boolean } = {}) {
    const staleBlocks = useWorksheetStore((state) => state.staleBlocks);
    const scope = useWorksheetStore((state) => state.inspectorScope);
    const sections = useWorksheetStore((state) => state.inspectorSections);
    const setInspectorScope = useWorksheetStore((state) => state.setInspectorScope);
    const setInspectorSection = useWorksheetStore((state) => state.setInspectorSection);
    const sidebarTab = useWorksheetStore((state) => state.sidebarTab);
    const [hoveredField, setHoveredField] = useState<HeaderField | null>(null);

    const rootStyle = embedded ? S.embedded : S.sidebar;
    const activeBlockId = useWorksheetStore((state) => state.activeBlockId);
    const activeBlock = useWorksheetStore((state) => state.blocks.find(b => b.id === activeBlockId));
    // How narrow this block's content actually is, as measured on the sheet. Subscribed
    // rather than read once: the measurement lands a frame after the render that caused it,
    // and a stale picker could grey out a width the sheet would now accept.
    const intrinsicWidth = useIntrinsicWidth(activeBlockId ?? '');
    const intrinsicEntries = useIntrinsicEntries(activeBlockId ?? '');
    const blocks = useWorksheetStore((state) => state.blocks);
    const labelByType = useMemo(() => {
        const m: Record<string, string> = {};
        for (const item of buildCatalog()) if (!m[item.typeId]) m[item.typeId] = item.label;
        return m;
    }, []);
    // The scope switch's opdracht number comes from the shared numberBlocks helper, so it cannot drift from the sheet.
    const blockNumber = useMemo(() => (activeBlock ? numberBlocks(blocks)[activeBlock.id] ?? null : null), [activeBlock, blocks]);
    const locked = useWorksheetStore((state) => !!state.curriculum?.locked);

    const headerData = useWorksheetStore((state) => state.header);
    const footerData = useWorksheetStore((state) => state.footer);
    const docSettings = useWorksheetStore((state) => state.docSettings);
    // The stappenhulp QR is only offered while some sum on the sheet has worked steps.
    const anySteps = useMemo(() => blocks.some(blockHasTutorSteps), [blocks]);
    const updateHeader = useWorksheetStore((state) => state.updateHeader);
    const updateFooter = useWorksheetStore((state) => state.updateFooter);
    const updateDocSettings = useWorksheetStore((state) => state.updateDocSettings);

    const updateBlockInstruction = useWorksheetStore((state) => state.updateBlockInstruction);
    const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
    const setExercises = useWorksheetStore((state) => state.setExercises);
    const setGenerationNote = useWorksheetStore((state) => state.setGenerationNote);

    const handleGenerate = () => {
        if (!activeBlock) return;
        regenerateBlock(activeBlock, setExercises, setGenerationNote, docSettings.uniqueExercises ?? true);
    };

    // ── Heel het blad: five sections in page order, each with a summary of its values ──
    const bladOpen = sections.blad;
    const toggleBlad = (id: InspectorBladSection) => setInspectorSection('blad', bladOpen === id ? '' : id);

    const fieldOrder = headerData.fieldOrder ?? DEFAULT_FIELD_ORDER;
    const titlePos = docSettings.titlePosition ?? 'center';
    const shownFields = fieldOrder.filter(f => headerData[f]).map(f => FIELD_RANGE[f].label.toLowerCase()).join(', ');
    const brandSlot = footerData.brandSlot ?? 'left';
    const stepsAll = docSettings.solutionStepsAll ?? 'uit';

    const bladSections: Array<{ id: InspectorBladSection; title: string; summary: string; body: ReactNode }> = [
        {
            id: 'koptekst', title: 'Koptekst',
            summary: summaryOf([
                docSettings.headerStyle === 'onderstreept' ? 'onderstreept' : docSettings.headerStyle === 'kader' ? 'kader' : 'geen rand',
                `titel ${SIDE_WORD[titlePos]}`,
                shownFields || 'geen naamvelden',
            ]),
            body: (<>
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
                        <button key={p} onClick={() => updateDocSettings({ titlePosition: p })} className="seg-btn" aria-pressed={titlePos === p}>
                            {p === 'left' ? 'Links' : p === 'center' ? 'Midden' : 'Rechts'}
                        </button>
                    ))}
                </div>

                <label style={{ ...S.label, marginTop: '12px' }}>Koptekst velden</label>
                {(() => {
                    const order = fieldOrder;
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
                                            aria-label={`Breedte ${range.label}`}
                                            onChange={(e) => setFieldWidth(field, Number(e.target.value))}
                                            style={{ flex: 1, minWidth: 0, accentColor: 'var(--accent-purple)', cursor: enabled ? 'pointer' : 'not-allowed', opacity: enabled ? 1 : 0.4 }}
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
                    <span style={S.switchText}>Naamvelden op elke pagina herhalen</span>
                    <Switch checked={!!headerData.repeatHeader} onChange={(v) => updateHeader({ repeatHeader: v })} aria-label="Naamvelden op elke pagina herhalen" />
                </div>
                <div style={S.switchRow}>
                    <span style={S.switchText}>Titel op elke pagina herhalen</span>
                    <Switch checked={!!headerData.repeatTitle} onChange={(v) => updateHeader({ repeatTitle: v })} aria-label="Titel op elke pagina herhalen" />
                </div>

                {titlePos === 'center' ? (
                    <>
                        <label style={{ ...S.label, marginTop: '12px' }}>Ruimte titel–velden: {docSettings.titleFieldsVerticalGap ?? 8}px</label>
                        <input type="range" min="0" max="40" step="2"
                            value={docSettings.titleFieldsVerticalGap ?? 8}
                            onChange={(e) => updateDocSettings({ titleFieldsVerticalGap: Number(e.target.value) })}
                            style={S.range} />
                    </>
                ) : (
                    <>
                        <label style={{ ...S.label, marginTop: '12px' }}>Marge titel–velden: {docSettings.titleFieldsGap ?? 16}px</label>
                        <input type="range" min="4" max="64" step="2"
                            value={docSettings.titleFieldsGap ?? 16}
                            onChange={(e) => updateDocSettings({ titleFieldsGap: Number(e.target.value) })}
                            style={S.range} />
                    </>
                )}

                <label style={{ ...S.label, marginTop: '12px' }}>Ruimte onder koptekst: {docSettings.headerContentGap ?? 12}px</label>
                <input type="range" min="0" max="60" step="2"
                    value={docSettings.headerContentGap ?? 12}
                    onChange={(e) => updateDocSettings({ headerContentGap: Number(e.target.value) })}
                    style={S.range} />

                <InspectorAccordion title="Vormgeving koptekst" forceOpen={hasStyle(docSettings.headerCustom) || !!docSettings.fontFamilyHeader}>
                    <RegionStyleFields region="header" />
                </InspectorAccordion>

                {/* Naam/Klas/Nr/Datum labels: their own face and style, so the title above
                    (Vormgeving koptekst) can change without the labels following along. */}
                <InspectorAccordion title="Vormgeving veldlabels" forceOpen={hasStyle(docSettings.headerVeldenCustom) || !!docSettings.fontFamilyHeaderVelden}>
                    {(() => {
                        const cur: RegionStyle = docSettings.headerVeldenCustom ?? {};
                        const patch = (p: Partial<RegionStyle>) => updateDocSettings({ headerVeldenCustom: { ...cur, ...p } });
                        return (
                            <FontStyleFields
                                fontFamily={{ label: 'Lettertype', value: docSettings.fontFamilyHeaderVelden, options: TEXT_FONT_OPTIONS, onChange: (v) => updateDocSettings({ fontFamilyHeaderVelden: v }) }}
                                fontSize={{ label: 'Tekengrootte', value: cur.fontSize ?? 13, min: 8, max: 20, onChange: (v) => patch({ fontSize: v }) }}
                                color={cur.color} onColorChange={(v) => patch({ color: v })}
                                background={cur.background} onBackgroundChange={(v) => patch({ background: v })}
                                bold={cur.bold ?? true} onBoldChange={(v) => patch({ bold: v })}
                                italic={cur.italic} onItalicChange={(v) => patch({ italic: v })}
                                underline={cur.underline} onUnderlineChange={(v) => patch({ underline: v })}
                            />
                        );
                    })()}
                </InspectorAccordion>
            </>),
        },
        {
            id: 'opdrachten', title: 'Opdrachten',
            summary: summaryOf([
                docSettings.numberBlocks ? 'genummerd' : 'niet genummerd',
                docSettings.showScores ? 'met scores' : 'geen scores',
                (docSettings.uniqueExercises ?? true) && 'geen dubbele',
                `stijl ${docSettings.opdrachtTitelStyle === 'underlined' ? 'onderstreept' : docSettings.opdrachtTitelStyle === 'boxed' ? 'kader' : 'normaal'}`,
            ]),
            body: (<>
                <div style={S.switchRow}><span style={S.switchText}>Opdrachten nummeren</span><Switch checked={docSettings.numberBlocks} onChange={(v) => updateDocSettings({ numberBlocks: v })} aria-label="Opdrachten nummeren" /></div>
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
                {/* Sheet-wide dedupe: regenerateBlock (generateDispatch.ts) re-rolls a generated
                    block's duplicates away, up to a capped number of top-up rounds. */}
                <div style={S.switchRow}><span style={S.switchText}>Geen dubbele oefeningen</span><Switch checked={docSettings.uniqueExercises ?? true} onChange={(v) => updateDocSettings({ uniqueExercises: v })} aria-label="Geen dubbele oefeningen" /></div>
                <p style={S.hintText}>Elke oefening komt hoogstens één keer voor in een blok; bij kleine reeksen (bv. klok op het uur) blijven herhalingen toegestaan.</p>
                <div style={S.switchRow}><span style={S.switchText}>Opdrachtkleur per domein</span><Switch checked={!!docSettings.domainColors} onChange={(v) => updateDocSettings({ domainColors: v })} aria-label="Opdrachtkleur per domein" /></div>
                <p style={S.hintText}>Elke opdracht-titel krijgt de kleur van zijn domein (getallenkennis, bewerkingen, meten, …), zoals in de meeste methodes.</p>

                <label style={{ ...S.label, marginTop: '10px' }}>Ruimte tussen oefenreeksen: {docSettings.blockSpacing ?? 12}px</label>
                <input type="range" min="4" max="48" step="2"
                    value={docSettings.blockSpacing ?? 12}
                    onChange={(e) => updateDocSettings({ blockSpacing: Number(e.target.value) })}
                    style={S.range} />

                {/* Writing space: the height of ONE answer line, fed onto .print-area-shell as
                    --sheet-answer-h; every answer line in every viewer is a factor of it. */}
                {(() => {
                    const px = docSettings.answerSpace ?? ANSWER_SPACE_DEFAULT_PX;
                    const word = px <= 16 ? 'klein' : px >= 24 ? 'ruim' : 'normaal';
                    return (
                        <>
                            <label style={{ ...S.label, marginTop: '10px' }}>Schrijfruimte: {word} ({px}px)</label>
                            <input type="range" min="14" max="32" step="1"
                                value={px}
                                onChange={(e) => updateDocSettings({ answerSpace: Number(e.target.value) })}
                                style={S.range} />
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

                <InspectorAccordion title="Vormgeving opdracht-titel"
                    forceOpen={hasStyle(docSettings.titelCustom) || !!docSettings.fontFamilyTitel}>
                    <RegionStyleFields region="titel" />
                </InspectorAccordion>
            </>),
        },
        {
            id: 'tekst', title: 'Cijfers en tekst',
            summary: summaryOf([
                `${fontName(MATH_FONT_OPTIONS, docSettings.fontFamilyMath)} ${docSettings.fontSizeMath ?? 13}pt`,
                `${fontName(TEXT_FONT_OPTIONS, docSettings.fontFamilyText)} ${docSettings.fontSizeText ?? 15}pt`,
            ]),
            body: (<>
                {/* Sheet-wide base faces and sizes (pt), fed onto .print-area-shell as CSS tokens.
                    bodyFontScale below is a multiplier on top of the result, not the base. */}
                <label style={S.label}>Lettertype cijfers</label>
                <FontFamilyPicker value={docSettings.fontFamilyMath} options={MATH_FONT_OPTIONS}
                    onChange={(v) => updateDocSettings({ fontFamilyMath: v })} ariaLabel="Lettertype cijfers" />
                <label style={{ ...S.label, marginTop: '10px' }}>Cijfers: {docSettings.fontSizeMath ?? 13}pt</label>
                <input type="range" min={11} max={16} step={1}
                    value={docSettings.fontSizeMath ?? 13}
                    onChange={(e) => updateDocSettings({ fontSizeMath: Number(e.target.value) })}
                    style={S.range} />
                <p style={S.hintText}>Alle getallen en rekenwerk.</p>

                <label style={{ ...S.label, marginTop: '10px' }}>Lettertype tekst</label>
                <FontFamilyPicker value={docSettings.fontFamilyText} options={TEXT_FONT_OPTIONS}
                    onChange={(v) => updateDocSettings({ fontFamilyText: v })} ariaLabel="Lettertype tekst" />
                <label style={{ ...S.label, marginTop: '10px' }}>Opdrachttekst: {docSettings.fontSizeText ?? 15}pt</label>
                <input type="range" min={12} max={18} step={1}
                    value={docSettings.fontSizeText ?? 15}
                    onChange={(e) => updateDocSettings({ fontSizeText: Number(e.target.value) })}
                    style={S.range} />
                <p style={S.hintText}>Opdrachten en woorden.</p>

                {/* Scales every block's exercise body and its opdracht-titel together. Shown in px
                    against the base; stored as a zoom factor. From 16px up, wide blocks auto-shrink. */}
                {(() => {
                    const px = Math.round((docSettings.bodyFontScale ?? 1) * BODY_FONT_PX.base);
                    const bigText = px >= 16;
                    return (
                        <>
                            <label style={{ ...S.label, marginTop: '10px', color: bigText ? 'var(--danger)' : undefined }}>
                                {bigText ? '⚠ ' : ''}Tekstgrootte oefeningen: {px} px
                            </label>
                            <input
                                type="range" min={BODY_FONT_PX.min} max={BODY_FONT_PX.max} step={BODY_FONT_PX.step}
                                value={px}
                                onChange={(e) => updateDocSettings({ bodyFontScale: Number(e.target.value) / BODY_FONT_PX.base })}
                                style={S.range}
                            />
                            {bigText && (
                                <p style={S.hintText}>Grote tekst kan brede oefeningen automatisch verkleinen om op de pagina te passen.</p>
                            )}
                        </>
                    );
                })()}

                {/* docSettings.oefeningenCustom, on every block's ScaledBlock wrapper. */}
                <InspectorAccordion title="Vormgeving oefeningen" forceOpen={hasStyle(docSettings.oefeningenCustom)}>
                    {(() => {
                        const cur: RegionStyle = docSettings.oefeningenCustom ?? {};
                        const patch = (p: Partial<RegionStyle>) => updateDocSettings({ oefeningenCustom: { ...cur, ...p } });
                        return (
                            <FontStyleFields
                                color={cur.color} onColorChange={(v) => patch({ color: v })}
                                background={cur.background} onBackgroundChange={(v) => patch({ background: v })}
                                bold={cur.bold} onBoldChange={(v) => patch({ bold: v })}
                                italic={cur.italic} onItalicChange={(v) => patch({ italic: v })}
                                underline={cur.underline} onUnderlineChange={(v) => patch({ underline: v })}
                            />
                        );
                    })()}
                    <p style={S.hintText}>Geldt voor alle oefeningen. Een opdracht-titel zonder eigen kleur kleurt mee.</p>
                </InspectorAccordion>
            </>),
        },
        {
            id: 'hulp', title: 'Verbetersleutel en hulp',
            summary: summaryOf([
                anySteps && (docSettings.tutorQr ? `stappenhulp-QR${docSettings.tutorQrCaption !== false ? ' met uitleg' : ''}` : 'geen QR'),
                `tussenstappen ${stepsAll}`,
            ]),
            body: (<>
                {anySteps ? (<>
                    <div style={S.switchRow}>
                        <span style={S.switchText}>Stappenhulp-QR onderaan elke pagina</span>
                        <Switch checked={!!docSettings.tutorQr} onChange={(v) => updateDocSettings({ tutorQr: v })} aria-label="Stappenhulp-QR onderaan elke pagina" />
                    </div>
                    <p style={{ ...S.hintText, margin: '0 0 var(--sp-2)' }}>Leerlingen scannen de QR en zien hoe ze elke som van die pagina stap voor stap uitrekenen. Zet dit uit bij een toets: de QR verklapt de antwoorden.</p>
                    {docSettings.tutorQr && (
                        <div style={S.switchRow}>
                            <span style={S.switchText}>Uitleg naast de QR-code</span>
                            <Switch checked={docSettings.tutorQrCaption !== false} onChange={(v) => updateDocSettings({ tutorQrCaption: v })} aria-label="Uitleg naast de QR-code" />
                        </div>
                    )}
                </>) : (
                    <p style={{ ...S.hintText, margin: '0 0 var(--sp-2)' }}>De stappenhulp-QR verschijnt hier zodra er een som met stappen op het blad staat.</p>
                )}
                <label style={{ ...S.label, marginTop: '12px' }}>Tussenstappen voor alle blokken</label>
                <div className="seg-group" role="group" aria-label="Tussenstappen voor alle blokken">
                    {([['uit', 'Uit'], ['basis', 'Basis'], ['alle', 'Alle']] as const).map(([v, l]) => (
                        <button key={v} className="seg-btn" aria-pressed={stepsAll === v} onClick={() => updateDocSettings({ solutionStepsAll: v })}>{l}</button>
                    ))}
                </div>
                <p style={S.hintText}>Per blok kan je het nog apart instellen.</p>
            </>),
        },
        {
            id: 'voettekst', title: 'Voettekst',
            summary: summaryOf([
                docSettings.footerStyle === 'lijn' ? 'lijn' : docSettings.footerStyle === 'kader' ? 'kader' : 'geen rand',
                `RekenRaak ${SIDE_WORD[brandSlot]}`,
            ]),
            body: (<>
                <p style={{ ...S.hintText, margin: '0 0 var(--sp-2)' }}>De voettekst staat onderaan elke pagina.</p>
                <label style={S.label}>Voettekst stijl</label>
                <div className="seg-group" style={{ marginBottom: '12px' }}>
                    {(['geen', 'lijn', 'kader'] as const).map((v) => (
                        <button key={v} onClick={() => updateDocSettings({ footerStyle: v })} className="seg-btn" aria-pressed={(docSettings.footerStyle ?? 'geen') === v}>
                            {v === 'geen' ? 'Geen' : v === 'lijn' ? 'Lijn' : 'Kader'}
                        </button>
                    ))}
                </div>
                {/* The credit always prints — only its position is a choice. Whichever
                    position holds it shows the credit instead of that position's slot. */}
                <label style={S.footerGroupLabel}>Plaats van "Gemaakt met RekenRaak.be"</label>
                <div className="seg-group" style={{ marginBottom: '12px' }}>
                    {([['left', 'Links'], ['center', 'Midden'], ['right', 'Rechts']] as const).map(([v, l]) => (
                        <button key={v} className="seg-btn" aria-pressed={brandSlot === v}
                            onClick={() => updateFooter({ brandSlot: v })}>{l}</button>
                    ))}
                </div>

                {([['slotLeft', 'Links'], ['slotCenter', 'Midden'], ['slotRight', 'Rechts']] as const).map(([key, label]) => {
                    const brandHere = brandSlot === (key === 'slotLeft' ? 'left' : key === 'slotCenter' ? 'center' : 'right');
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
                                aria-label={`Voettekst ${label.toLowerCase()}`}
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

                <InspectorAccordion title="Vormgeving voettekst" forceOpen={hasStyle(docSettings.footerCustom) || !!docSettings.fontFamilyFooter}>
                    <RegionStyleFields region="footer" />
                </InspectorAccordion>
            </>),
        },
    ];

    const bladContent = (<>
        {bladSections.map(s => (
            <InspectorSection key={s.id} title={s.title} summary={s.summary} open={bladOpen === s.id} onToggle={() => toggleBlad(s.id)}>
                {s.body}
            </InspectorSection>
        ))}
        <div style={{ marginTop: 'var(--sp-2)' }}><ResetAllStylesButton /></div>
    </>);

    // ── Opdracht N: the selected block ──
    const hasBlock = !!activeBlock;   // 'document' resolves to no block, as in TopBar
    const shown = hasBlock ? scope : 'blad';
    const isStale = !!activeBlock && !!staleBlocks[activeBlock.id];
    // The family owns its own sections; the registry says which ones this block gets.
    const ui = activeBlock ? EXERCISE_UI[activeBlock.typeId] as InspectorUI | undefined : undefined;
    const isFurniture = !!activeBlock && !!REGISTRY[activeBlock.typeId]?.isFurniture;
    // The quick block belongs to Eenvoudig only, and only for blocks that generate exercises.
    const quickMode = !!activeBlock && !isFurniture && effectiveSidebarTab(sidebarTab, locked) === 'eenvoudig';

    const blockSections: Array<{ id: InspectorBlockSection; title: string; summary: string; body: ReactNode }> = [];
    if (activeBlock) {
        const b = activeBlock;
        const aantal = b.numberOfExercises || 10;
        const scoreMax = Math.max(1, aantal * 2);   // Score caps at 2 points per exercise
        const sliderStyle = (on: boolean): React.CSSProperties => ({ width: '100%', accentColor: 'var(--accent-purple)', cursor: on ? 'pointer' : 'not-allowed', opacity: on ? 1 : 0.5 });
        const Config = ui?.Config;
        const { StyleConfig, AppearanceConfig, AdvancedConfig, advancedApplies, SolutionConfig } = ui ?? {};
        // Two answers off the same measurements (REFLOW RULE in blockLayout): `minW` is what the
        // PACKER will clamp to (active button, "verbreed" hint), `pickerMin` the optimistic floor
        // the buttons are greyed against, so ¼ is reachable from Vol without stepping through ½.
        const iw = intrinsicWidth;
        const minW = minWidthUnits(b, intrinsicEntries);
        const pickerMin = pickerMinWidthUnits(b, intrinsicEntries);
        const curW = Math.max(b.widthUnits ?? 4, minW);
        const tooNarrow = (w: 1 | 2 | 4) => (iw
            ? `Te smal: de inhoud is ${Math.round(iw.px)}px breed, deze kolom biedt ${tierWidthPx(w)}px.`
            : 'Te smal voor dit type bij deze instellingen');
        const spacingApplies = !b.typeId.startsWith('cijferen-');
        const answerOverride: number | undefined = b.constraints?.answerSpace;
        const answerPx = answerOverride ?? docSettings.answerSpace ?? ANSWER_SPACE_DEFAULT_PX;
        const scaleOverride: number | undefined = b.constraints?.bodyFontScale;
        const blockTextPx = Math.round((scaleOverride ?? docSettings.bodyFontScale ?? 1) * BODY_FONT_PX.base);
        const mode = b.instructionMode ?? 'geen';

        if (quickMode) blockSections.push({
            id: 'snel', title: 'Snel aanpassen', summary: 'De instellingen die het meest tellen',
            body: <QuickBlock block={b} />,
        });

        blockSections.push({
            id: 'wat', title: 'Wat oefenen ze',
            summary: ui?.summary?.(b) || (b.leafId && LEAF_BY_ID[b.leafId]?.label) || labelByType[b.typeId] || b.typeId,
            body: (<>
                {locked ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                        Instellingen zijn vergrendeld. Klik op ✨ Genereer voor nieuwe getallen.
                    </p>
                ) : Config ? <Config block={b} /> : null}
                {/* The fold exists when the family registered a body for it; advancedApplies can narrow that. */}
                {!locked && AdvancedConfig && (!advancedApplies || advancedApplies(b)) && (
                    <InspectorAccordion title="Geavanceerd">
                        <div style={S.col}><AdvancedConfig block={b} /></div>
                    </InspectorAccordion>
                )}
            </>),
        });

        blockSections.push({
            id: 'opblad', title: 'Hoe staat het op het blad',
            summary: summaryOf([
                !isFurniture && (b.showInstruction === false ? 'zonder opdrachttekst' : (b.instructionText || '').trim() || 'geen opdrachttekst'),
                !isFurniture && !!b.totalPoints && `score ${b.totalPoints}`,
                `breedte ${WIDTH_WORD[curW] ?? 'vol'}`,
            ]),
            body: (<>
                {/* Sheet furniture has no exercises, so instruction/score do not apply. */}
                {!isFurniture && <>
                    <label style={S.label}>Instructie</label>
                    <input
                        style={S.input}
                        value={b.instructionText || ''}
                        onChange={(e) => updateBlockInstruction(b.id, e.target.value)}
                        placeholder="Los op."
                        aria-label="Instructie"
                        disabled={locked}
                    />
                    {/* Quick-pick standard texts so the titel is one click, not a retype. */}
                    <select
                        style={{ ...S.input, marginTop: '6px', cursor: locked ? 'not-allowed' : 'pointer', color: 'var(--text-muted)' }}
                        value=""
                        disabled={locked}
                        aria-label="Standaardtekst"
                        onChange={(e) => { if (e.target.value) updateBlockInstruction(b.id, e.target.value); }}
                    >
                        <option value="">Standaardtekst…</option>
                        {suggestionsFor(b.typeId, b.leafId, b.constraints as BlockConstraints).map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>

                    {/* The title row is presentation: hiding it leaves the block in the
                        opdracht numbering, so the numbers after it never shift. */}
                    {!locked && (<>
                        <div style={{ ...S.switchRow, marginTop: '12px' }}>
                            <span style={S.switchText}>Opdrachttekst tonen</span>
                            <Switch
                                checked={b.showInstruction !== false}
                                // Turning the title back on also clears skipNumbering: that flag only
                                // means something while the title is hidden, else "0." leaks through.
                                onChange={(v) => updateBlockSettings(b.id, v ? { showInstruction: undefined, skipNumbering: undefined } : { showInstruction: false })}
                                aria-label="Opdrachttekst tonen"
                            />
                        </div>
                        <p style={S.hintText}>Uit: het blok krijgt geen titelregel. De nummering telt het blok standaard nog mee.</p>
                        {/* Only offered once the title row is hidden: a numbered block that shows
                            no number would renumber the whole sheet for nothing. */}
                        {b.showInstruction === false && (<>
                            <div style={{ ...S.switchRow, marginTop: '12px' }}>
                                <span style={S.switchText}>Meetellen in de nummering</span>
                                <Switch
                                    checked={b.skipNumbering !== true}
                                    onChange={(v) => updateBlockSettings(b.id, { skipNumbering: v ? undefined : true })}
                                    aria-label="Meetellen in de nummering"
                                />
                            </div>
                            <p style={S.hintText}>Uit: de volgende opdracht krijgt dit nummer.</p>
                        </>)}
                    </>)}

                    <label style={{ ...S.label, marginTop: '14px' }} htmlFor={`insp-score-${b.id}`}>Score ({b.totalPoints || 0})</label>
                    <input
                        id={`insp-score-${b.id}`}
                        type="range" min="0" max={scoreMax} step="0.5"
                        value={Math.min(b.totalPoints || 0, scoreMax)}
                        disabled={locked}
                        onChange={(e) => updateBlockSettings(b.id, { totalPoints: Number(e.target.value) })}
                        style={sliderStyle(!locked)}
                    />
                </>}

                {/* The page grid is 4 units wide, so a block is a whole, a half or a quarter.
                    Widths narrower than the block's own minimum are disabled, not overridden. */}
                <label style={{ ...S.label, marginTop: isFurniture ? 0 : '14px' }}>Breedte op de pagina</label>
                <div className="seg-group">
                    {([{ w: 4, label: 'Vol' }, { w: 2, label: '½' }, { w: 1, label: '¼' }] as const).map(o => (
                        <button
                            key={o.w}
                            className="seg-btn"
                            aria-pressed={curW === o.w}
                            disabled={locked || o.w < pickerMin}
                            title={o.w < pickerMin ? tooNarrow(o.w) : undefined}
                            onClick={() => updateBlockSettings(b.id, { widthUnits: o.w })}
                        >{o.label}</button>
                    ))}
                </div>
                <p style={S.hintText}>
                    {iw
                        ? `De inhoud is ${Math.round(iw.px)}px breed. Smalst mogelijk: ${pickerMin === 4 ? 'vol' : pickerMin === 2 ? '½' : '¼'}.`
                        : pickerMin === 4
                            ? 'Dit type heeft de volle breedte nodig.'
                            : `Smalst mogelijk bij deze instellingen: ${pickerMin === 2 ? '½' : '¼'}.`}
                </p>
                {/* Same condition the packer calls `promoted`: the chosen width was kept but
                    overridden, so say so rather than let the sheet silently disagree. */}
                {(b.widthUnits ?? 4) < minW && (
                    <p style={S.hintText}>
                        Verbreed naar {minW === 4 ? 'vol' : '½'}: te smal voor deze instellingen.
                    </p>
                )}

                {/* Family rows (registry slots, no typeId branch): how this block's exercises look. */}
                {!locked && StyleConfig && <div style={{ marginTop: 'var(--sp-3)' }}><StyleConfig block={b} /></div>}
                {!locked && !isFurniture && AppearanceConfig && <div style={{ marginTop: 'var(--sp-3)' }}><AppearanceConfig block={b} /></div>}
            </>),
        });

        if (!locked && SolutionConfig) blockSections.push({
            id: 'sleutel', title: 'Verbetersleutel',
            // The level the key prints: the block's own choice, else the sheet-wide one.
            summary: blockHasSteps(b)
                ? `Tussenstappen ${effectiveSolutionSteps(b, docSettings)}${b.constraints?.solutionSteps ? '' : ' (heel het blad)'}`
                : 'Wat de verbetersleutel toont',
            body: <SolutionConfig block={b} />,
        });

        if (!locked) blockSections.push({
            id: 'diff', title: 'Differentiatie',
            summary: mode === 'geen' ? 'Geen label'
                : mode === 'aangepast' ? `Label "${(b.customInstructionText || '').trim() || '…'}"`
                : `Label ${PREFIX_WORD[mode]}`,
            body: (<>
                <label style={S.label}>Instructie prefix</label>
                <div className="seg-group">
                    {(['geen', 'mag', 'moet', 'plus', 'aangepast'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => updateBlockSettings(b.id, { instructionMode: b.instructionMode === m ? 'geen' : m })}
                            className="seg-btn" aria-pressed={b.instructionMode === m}
                            title={m === 'plus' ? 'Plusoefening' : m === 'aangepast' ? 'Aangepaste tekst' : undefined}
                        >
                            {m === 'plus' ? '★' : m === 'geen' ? '—' : m === 'aangepast' ? 'A' : m.toUpperCase()}
                        </button>
                    ))}
                </div>
                {b.instructionMode === 'aangepast' && (
                    <div style={{ marginTop: '8px' }}>
                        <label style={S.label}>Aangepaste tekst</label>
                        <input
                            style={S.input}
                            value={b.customInstructionText || ''}
                            onChange={(e) => updateBlockSettings(b.id, { customInstructionText: e.target.value })}
                            placeholder="Bv. Probeer:"
                            aria-label="Aangepaste tekst"
                        />
                    </div>
                )}
            </>),
        });

        blockSections.push({
            id: 'ruimte', title: 'Grootte en ruimte',
            summary: summaryOf(locked ? [b.constraints?.fitToWidth ? 'verkleind om te passen' : 'Niet verkleind'] : [
                spacingApplies && `witruimte ${b.verticalSpacing || 14}px`,
                `schrijfhoogte ${answerPx}px`,
                `tekst ${blockTextPx}px`,
                (b.constraints?.fitToWidth || b.constraints?.fitToPage) && 'verkleind',
            ]),
            body: (<>
                {!locked && (<>
                    {spacingApplies && (<>
                        <label style={S.label}>Witruimte ({b.verticalSpacing || 14}px)</label>
                        <input
                            type="range" min="8" max="40"
                            value={b.verticalSpacing || 14}
                            aria-label="Witruimte"
                            onChange={(e) => updateBlockSettings(b.id, { verticalSpacing: Number(e.target.value) })}
                            style={sliderStyle(true)}
                        />
                    </>)}

                    {/* Per-block writing space: overrides --sheet-answer-h for this block only
                        (ScaledBlock writes it); falls back to Heel het blad › Opdrachten › Schrijfruimte. */}
                    <OverrideLabel text={`Schrijfhoogte (${answerPx}px)`} follows={answerOverride == null} first={!spacingApplies}
                        onReset={() => updateBlockSettings(b.id, { constraints: { ...b.constraints, answerSpace: undefined } })} />
                    <input
                        type="range" min="14" max="32" step="1"
                        value={answerPx}
                        aria-label="Schrijfhoogte"
                        onChange={(e) => updateBlockSettings(b.id, { constraints: { ...b.constraints, answerSpace: Number(e.target.value) } })}
                        style={sliderStyle(true)}
                    />

                    {/* Per-block text-size override (CSS zoom); falls back to Tekstgrootte oefeningen. */}
                    <OverrideLabel text={`Tekstgrootte blok (${blockTextPx} px)`} follows={scaleOverride == null}
                        onReset={() => updateBlockSettings(b.id, { constraints: { ...b.constraints, bodyFontScale: undefined } })} />
                    <input
                        type="range" min={BODY_FONT_PX.min} max={BODY_FONT_PX.max} step={BODY_FONT_PX.step}
                        value={blockTextPx}
                        aria-label="Tekstgrootte blok"
                        onChange={(e) => updateBlockSettings(b.id, { constraints: { ...b.constraints, bodyFontScale: Number(e.target.value) / BODY_FONT_PX.base } })}
                        style={sliderStyle(true)}
                    />
                </>)}

                {/* The other way out of "it does not fit": shrink instead of widen. Opt-in per
                    block, and still available under a curriculum lock, like the width picker. */}
                <div style={{ ...S.switchRow, marginTop: locked ? 0 : '12px' }}>
                    <span style={S.switchText}>Verklein om in de kolom te passen</span>
                    <Switch
                        checked={b.constraints?.fitToWidth === true}
                        onChange={(v) => updateBlockSettings(b.id, { constraints: { ...b.constraints, fitToWidth: v || undefined } })}
                        aria-label="Verklein om in de kolom te passen"
                    />
                </div>
                <p style={S.hintText}>Uit: een blok dat niet past wordt verbreed. Aan: het blok wordt tot 85 % verkleind.</p>

                {/* Opt-in height back-off (ScaledBlock): only bites on a block taller than a page,
                    shown always since the Inspector cannot see the packer's `spans` flag. */}
                {!locked && (<>
                    <div style={{ ...S.switchRow, marginTop: '12px' }}>
                        <span style={S.switchText}>Verklein om op één pagina te passen</span>
                        <Switch
                            checked={b.constraints?.fitToPage === true}
                            onChange={(v) => updateBlockSettings(b.id, { constraints: { ...b.constraints, fitToPage: v || undefined } })}
                            aria-label="Verklein om op één pagina te passen"
                        />
                    </div>
                    <p style={S.hintText}>Alleen voor blokken die groter zijn dan één pagina.</p>
                </>)}
            </>),
        });
    }

    // Remembered per scope; a remembered section this block does not have falls back to the mode's default.
    const defaultBlockSection: InspectorBlockSection = quickMode ? 'snel' : 'wat';
    const rememberedBlock = sections.block;
    const blockOpen = rememberedBlock === '' ? ''
        : rememberedBlock && blockSections.some(s => s.id === rememberedBlock) ? rememberedBlock
        : defaultBlockSection;
    const toggleBlock = (id: InspectorBlockSection) => setInspectorSection('block', blockOpen === id ? '' : id);

    const setCount = (next: number) => {
        if (!activeBlock) return;
        const n = Math.min(COUNT_MAX, Math.max(COUNT_MIN, next));
        // Clamp Score so it never exceeds the new 2×aantal ceiling.
        updateBlockSettings(activeBlock.id, { numberOfExercises: n, totalPoints: Math.min(activeBlock.totalPoints || 0, n * 2) });
    };
    const aantal = activeBlock?.numberOfExercises || 10;

    // Pinned above the sections so the two things every visit needs never scroll away.
    const pinned = activeBlock && (
        <div style={S.pinned}>
            <div style={S.pinnedRow}>
                {!isFurniture ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0 }}>
                        <span id="insp-count-label" style={S.pinnedLabel}>Aantal oefeningen</span>
                        <div className="insp-stepper" role="group" aria-labelledby="insp-count-label">
                            <button type="button" aria-label="Minder oefeningen" disabled={aantal <= COUNT_MIN} onClick={() => setCount(aantal - 1)}><Minus size={14} /></button>
                            <output aria-live="polite" aria-label="Aantal oefeningen">{aantal}</output>
                            <button type="button" aria-label="Meer oefeningen" disabled={aantal >= COUNT_MAX} onClick={() => setCount(aantal + 1)}><Plus size={14} /></button>
                        </div>
                    </div>
                ) : <span />}
                <IconButton
                    icon={Sparkles}
                    label={isStale ? 'Instellingen gewijzigd — genereer opnieuw' : 'Genereer oefeningen'}
                    visibleLabel={isStale ? 'Genereer •' : 'Genereer'}
                    variant="primary"
                    onClick={handleGenerate}
                    dataTour="generate-block"
                />
            </div>
            {/* It SAYS when the exercises no longer match the settings: the real problem was
                not reaching the button, it was not knowing the sheet had gone stale. */}
            {isStale && (
                <p style={{ ...S.hintText, color: 'var(--accent)', margin: 'var(--sp-2) 0 0' }}>
                    De instellingen zijn gewijzigd. Klik Genereer om de oefeningen bij te werken.
                </p>
            )}
            <GenerationNote note={activeBlock.generationNote} />
        </div>
    );

    const blockContent = (<>
        {locked && (
            <div style={S.lockBanner}>
                🔒 Vergrendeld curriculum — je kan enkel het aantal aanpassen en opnieuw genereren.
            </div>
        )}
        {blockSections.map(s => (
            <InspectorSection key={s.id} title={s.title} summary={s.summary} open={blockOpen === s.id} onToggle={() => toggleBlock(s.id)}>
                {s.body}
            </InspectorSection>
        ))}
    </>);

    const blockScopeLabel = !activeBlock ? 'Opdracht'
        : isFurniture ? 'Bladonderdeel'
        : blockNumber ? `Opdracht ${blockNumber}` : 'Opdracht';

    return (
        <aside data-tour="inspector" className={embedded ? undefined : 'app-panel-right'} style={rootStyle}>
            <InspectorStyles />
            {/* The scope switch says what is being edited before any control (UI-GUIDE rule 1). */}
            <div className="panel-head">
                <div className="seg-group" role="group" aria-label="Wat pas je aan">
                    <button
                        className="seg-btn"
                        aria-pressed={shown === 'block'}
                        disabled={!hasBlock}
                        title={hasBlock ? undefined : 'Kies eerst een opdracht op het blad'}
                        onClick={() => setInspectorScope('block')}
                    >{blockScopeLabel}</button>
                    <button className="seg-btn" aria-pressed={shown === 'blad'} onClick={() => setInspectorScope('blad')}>Heel het blad</button>
                </div>
            </div>
            {shown === 'block' && pinned}
            <div style={S.panelScroll}>
                {shown === 'blad' ? bladContent : blockContent}
            </div>
        </aside>
    );
}

// A per-block override's label: says when it still follows the sheet, offers the way back when not.
function OverrideLabel({ text, follows, onReset, first = false }: { text: string; follows: boolean; onReset: () => void; first?: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: first ? 0 : '10px' }}>
            <label style={{ ...S.label, marginTop: 0 }}>
                {text}{follows ? ' · volgt blad' : ''}
            </label>
            {!follows && (
                <button onClick={onReset} style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: '11px', padding: 0 }}>
                    ↺ volg blad
                </button>
            )}
        </div>
    );
}

// True when a region style carries any explicit value (i.e. differs from the default look)
const hasStyle = (r?: RegionStyle) => !!r && Object.values(r).some((v) => v !== undefined && v !== false && v !== '');

const S = {
    // Embedded in the left panel's Instellingen tab: no own width or edge, just fill the tab.
    embedded: { flex: 1, minHeight: 0, overflowY: 'auto', boxSizing: 'border-box', padding: 'var(--sp-3) var(--sp-4) var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' } as React.CSSProperties,
    sidebar: { width: '366px', minWidth: '366px', backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--separator)', height: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    pinned: { flex: 'none', padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--separator)', background: 'var(--bg-surface)' } as React.CSSProperties,
    pinnedRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)' } as React.CSSProperties,
    pinnedLabel: { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' } as React.CSSProperties,

    panelScroll: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--sp-3) var(--sp-4) var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' } as React.CSSProperties,
    lockBanner: { padding: 'var(--sp-3)', fontSize: 'var(--text-sm)', lineHeight: 1.4, color: 'var(--text-main)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)' } as React.CSSProperties,
    col: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    label: F.label,
    footerGroupLabel: { display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-main)', marginBottom: 'var(--sp-2)', fontWeight: 600 } as React.CSSProperties,
    input: F.input,
    select: { width: '100%', padding: '7px 10px', backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)', color: 'var(--text-main)', outline: 'none', fontSize: 'var(--text-sm)', cursor: 'pointer' } as React.CSSProperties,
    checkboxLabel: F.checkboxLabel,
    switchRow: F.switchRow,
    switchText: F.switchText,
    checkbox: F.checkbox,
    range: { width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' } as React.CSSProperties,
    radioBtn: F.radioBtn,
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

