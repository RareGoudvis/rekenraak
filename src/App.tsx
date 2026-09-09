import { useState, useRef, useEffect, useMemo } from 'react';
import { useWorksheetStore } from './store/useWorksheetStore';
import Sidebar from './components/layout/sidebar';
import PageSheet from './components/layout/PageSheet';
import { packPages, pageIndexByBlock, type PackedBlock } from './services/layout/pagePacker';
import type { FooterSlot } from './services/math/types';
import Inspector from './components/configurator/Inspector';
import TopBar from './components/layout/TopBar';
import { EXERCISE_UI } from './config/exerciseUI';
import { ScaledBlock } from './components/viewer/ScaledBlock';
import MijnBladenView from './components/library/MijnBladenView';
import BibliotheekView from './components/library/BibliotheekView';
import HelpModal from './components/layout/HelpModal';
import TourOverlay from './components/onboarding/TourOverlay';
import IconButton from './components/ui/IconButton';
import { ArrowUp, ArrowDown, Lock, LockOpen as Unlock, Copy, Trash as Trash2, ArrowElbowDownRight as CornerDownRight, Hand, ListChecks, SlidersHorizontal, Printer, Flask } from '@phosphor-icons/react';
import { usePrint } from './hooks/usePrint';
import { styles } from './styles/appStyles';
import { overlayRegionStyle } from './services/regionStyle';
import { loadAutosave, decodeShareHash, RELEASE_SEEN_KEY, TRYOUT_SEEN_KEY } from './services/persistence';
import { DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type HeaderField } from './store/useWorksheetStore';
import { RELEASE_VERSION, TRYOUT_TYPE_IDS } from './config/version';
import type { MathBlock } from './services/math/types';

// Click-to-edit the opdracht title directly on the A4 preview (mirrors the
// OrdenenViewer inline-edit pattern). Commit on blur/Enter, Esc cancels; frozen
// in locked (curriculum) mode. The index prefix stays non-editable.
function EditableInstruction({ block, prefix }: { block: MathBlock; prefix: string }) {
  const updateBlockInstruction = useWorksheetStore((s) => s.updateBlockInstruction);
  const locked = useWorksheetStore((s) => !!s.curriculum?.locked);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  if (editing && !locked) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
        {prefix && <span style={styles.instructionDisplay}>{prefix}</span>}
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { updateBlockInstruction(block.id, text); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(false); }}
          style={{ ...styles.instructionDisplay, border: '1px solid var(--accent)', borderRadius: '4px', padding: '0 4px', background: 'transparent', outline: 'none', minWidth: '180px' }}
        />
      </span>
    );
  }
  return (
    <span
      onClick={locked ? undefined : (e) => { e.stopPropagation(); setText(block.instructionText || ''); setEditing(true); }}
      title={locked ? undefined : 'Klik om aan te passen'}
      style={{ ...styles.instructionDisplay, cursor: locked ? 'default' : 'text' }}
    >
      {prefix}{block.instructionText || ''}
    </span>
  );
}

export default function App() {
  const a4Ref = useRef<HTMLDivElement>(null);
  // Sheet zoom-to-fit. The panels no longer collapse, so on a narrow laptop the sheet is
  // what gives way: it scales down to whatever width is left instead of hiding a panel.
  // Floored at 55% — below that the preview stops being readable and shrinking further
  // would trade one unusable state for another.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sheetZoom, setSheetZoom] = useState(1);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const SHEET_PX = 920;      // .print-area-shell maxWidth
    const SIDE_PAD = 96;       // .print-scroll horizontal padding
    const fit = () => {
      const avail = el.clientWidth - SIDE_PAD;
      setSheetZoom(Math.max(0.55, Math.min(1, avail / SHEET_PX)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { handlePrint } = usePrint();

  const blocks = useWorksheetStore((state) => state.blocks);
  const headerData = useWorksheetStore((state) => state.header);
  const footerData = useWorksheetStore((state) => state.footer);
  const docSettings = useWorksheetStore((state) => state.docSettings);
  const showSolutions = useWorksheetStore((state) => state.showSolutions);
  const activeSelectionId = useWorksheetStore((state) => state.activeBlockId);
  const view = useWorksheetStore((state) => state.view);
  const setBlockPages = useWorksheetStore((state) => state.setBlockPages);

  const removeBlock = useWorksheetStore((state) => state.removeBlock);
  const moveBlockUp = useWorksheetStore((state) => state.moveBlockUp);
  const moveBlockDown = useWorksheetStore((state) => state.moveBlockDown);
  const setActiveSelection = useWorksheetStore((state) => state.setActiveSelection);
  const toggleBlockLock = useWorksheetStore((state) => state.toggleBlockLock);
  const duplicateBlock = useWorksheetStore((state) => state.duplicateBlock);
  const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
  const loadWorksheet = useWorksheetStore((state) => state.loadWorksheet);

  const [helpOpen, setHelpOpen] = useState(false);
  // First-run interactive tour (replaces the old AlphaPopup). Shown once; replayable from Help.
  const [tourOpen, setTourOpen] = useState<boolean>(() => {
    try { return !localStorage.getItem('rekenraak_tour_seen_v1'); } catch { return false; }
  });
  const closeTour = () => {
    try { localStorage.setItem('rekenraak_tour_seen_v1', '1'); } catch { /* ignore */ }
    setTourOpen(false);
  };
  const [releaseBannerVisible, setReleaseBannerVisible] = useState(false);
  // "Nog in proef" notice for the July exercise types. Dismissal is per browser and sticky;
  // the banner itself only renders while such a block is actually on the sheet.
  const [tryoutDismissed, setTryoutDismissed] = useState(() => {
    try { return localStorage.getItem(TRYOUT_SEEN_KEY) === '1'; } catch { return false; }
  });

  // Boot-time hooks: share-link, autosave-restore offer, release-banner check.
  // Each runs exactly once. Order matters — a shared link wins over an autosave.
  useEffect(() => {
    // 1. Shared link in URL hash.
    const shared = decodeShareHash(window.location.hash);
    if (shared) {
      const isTemplate = shared.mode === 'template';
      const isCurriculum = !!shared.curriculum?.locked;
      const msg = isCurriculum
        ? 'Vergrendelde werkbundel laden? Je kan enkel oefeningen uit de gekozen lijst toevoegen, het aantal aanpassen en opnieuw genereren. Huidige werkbundel wordt vervangen.'
        : isTemplate
        ? 'Sjabloon gedeeld via link laden? Bevat enkel instellingen — klik daarna op "Genereer alles" om oefeningen te maken. Huidige werkbundel wordt vervangen.'
        : 'Werkbundel gedeeld via link laden? Huidige werkbundel wordt vervangen.';
      if (window.confirm(msg)) {
        loadWorksheet(shared);
      }
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }
    // 2. Auto-resume: silently restore the last session on a fresh tab so the user
    // picks up where they left off. "Nieuw blad" (TopBar) clears it to start over.
    const auto = loadAutosave();
    if (auto && useWorksheetStore.getState().blocks.length === 0) {
      loadWorksheet(auto.payload);
    }
    // 3. Release banner: shown until user dismisses this exact version.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time boot init
      if (localStorage.getItem(RELEASE_SEEN_KEY) !== RELEASE_VERSION) setReleaseBannerVisible(true);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser tab title follows the worksheet title.
  useEffect(() => {
    const t = headerData?.titel?.trim();
    document.title = t ? `${t} — Rekenraak` : 'Rekenraak';
  }, [headerData?.titel]);

  const dismissTryoutBanner = () => {
    try { localStorage.setItem(TRYOUT_SEEN_KEY, '1'); } catch { /* ignore */ }
    setTryoutDismissed(true);
  };

  const dismissReleaseBanner = () => {
    try { localStorage.setItem(RELEASE_SEEN_KEY, RELEASE_VERSION); } catch { /* ignore */ }
    setReleaseBannerVisible(false);
  };

  const totalScore = blocks.reduce((sum, block) => sum + (block.totalPoints || 0), 0);


  // Name-field row (Naam/Klas/Nr/Datum). Reused by the page-1 body header and the
  // optional repeating print header (.print-repeat-fields). Null if no field is enabled.
  const renderFields = (align: 'left' | 'right' = 'left', subset?: HeaderField[]) => {
    const order: HeaderField[] = headerData?.fieldOrder ?? DEFAULT_FIELD_ORDER;
    const widths = headerData?.fieldWidths ?? DEFAULT_FIELD_WIDTHS;
    const LABELS: Record<HeaderField, string> = { naam: 'Naam:', klas: 'Klas:', nummer: 'Nr:', datum: 'Datum:' };
    const visibleFields = subset ?? order.filter(f => headerData?.[f]);
    if (visibleFields.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', rowGap: '8px', width: '100%', justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {visibleFields.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'flex-end', width: `${widths[f] ?? DEFAULT_FIELD_WIDTHS[f]}px` }}>
            <span style={styles.sheetHeaderLabel}>{LABELS[f]}</span>
            <div style={styles.sheetHeaderLine}></div>
          </div>
        ))}
      </div>
    );
  };

  // Printable width of a grid cell, in px. The page body is 794px minus 2x16mm of side
  // padding, split over 6 column units, minus the gaps a spanning cell does NOT get.
  // Without this the viewers keep assuming a full-width 625px and lay out grids that
  // overflow their cell — the exact failure phase B exists to prevent.
  const cellWidthPx = (units: number) => {
    const CONTENT = 674;                       // 794 - 2 * 16mm at 96dpi
    const gap = docSettings.blockSpacing ?? 12;
    const unit = (CONTENT - 5 * gap) / 6;      // 6 units, 5 gaps between them
    return Math.floor(unit * units + gap * (units - 1));
  };

  // Pagination is now BUDGETED by the packer, not measured from the DOM: the page count
  // is known before anything renders, which is what makes the page markers trustworthy.
  const packedPages = useMemo(
    () => packPages(blocks, { blockSpacingPx: docSettings.blockSpacing ?? 12 }),
    [blocks, docSettings.blockSpacing],
  );
  // Opdracht numbering runs across pages and counts exercise blocks only, so inserting a
  // separator never renumbers the exercises after it.
  const blockOrder = useMemo(() => {
    const m: Record<string, number> = {};
    let n = 0;
    blocks.forEach((b) => { if (!b.typeId.startsWith('layout-')) n += 1; m[b.id] = n; });
    return m;
  }, [blocks]);

  // Per-block page index for the Overzicht markers. It used to be MEASURED from the DOM
  // against a fixed 1044px page height; now it is simply what the packer decided, so the
  // markers agree with the pages on screen instead of approximating them.
  useEffect(() => {
    setBlockPages(pageIndexByBlock(packedPages));
  }, [packedPages, setBlockPages]);

  // ── Page chrome, rendered per page instead of once per sheet ──────────────
  const renderHeaderRegion = () => (
    <>
          {/* ── HEADER ── (enum base style + optional style-builder overlay; custom wins) */}
          <div style={overlayRegionStyle({
            display: 'flex', flexDirection: 'column', width: '100%', padding: '12px', boxSizing: 'border-box',
            // 'onderstreept' = one line under the whole header (separates it from the body);
            // 'kader' = full box. All-longhand borders avoid the shorthand/longhand React warning.
            borderRadius: docSettings.headerStyle === 'onderstreept' ? 0 : '6px',
            borderStyle: 'solid',
            borderWidth: docSettings.headerStyle === 'kader' ? '1.5px' : '1px',
            borderColor: docSettings.headerStyle === 'kader' ? '#000' : 'transparent',
            borderBottomWidth: (docSettings.headerStyle === 'kader' || docSettings.headerStyle === 'onderstreept') ? '1.5px' : '1px',
            borderBottomColor: (docSettings.headerStyle === 'kader' || docSettings.headerStyle === 'onderstreept') ? '#000' : 'transparent',
          }, docSettings.headerCustom)}>
            {(() => {
              const showScore = docSettings.showScores && totalScore > 0;
              const hasTitle = !!headerData?.titel;
              const gap = docSettings.titleFieldsGap ?? 16;
              // Wrapped so print CSS can hide this page-1 copy when repeatHeader moves the strip to .print-thead.
              // Fields align opposite the title: title-left → fields flush right, title-right → fields left.
              const fieldsRowAligned = (align: 'left' | 'right') => {
                const f = renderFields(align);
                return f ? <div className="print-body-fields">{f}</div> : null;
              };
              const titleScore = (align: 'left' | 'right') => (hasTitle || showScore) ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start', justifyContent: (hasTitle && showScore) ? 'space-between' : (!showScore) ? 'center' : 'flex-end', flexShrink: 0, gridColumn: align === 'right' ? '2' : '1', gridRow: '1' }}>
                  {hasTitle && <h1 style={{ margin: 0, fontSize: '22px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold', textAlign: align }}>{headerData!.titel}</h1>}
                  {showScore && <div style={styles.scoreBox}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
                </div>
              ) : null;
              if (docSettings.titlePosition === 'right') {
                const fr = fieldsRowAligned('left');
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: `${gap}px`, rowGap: '8px' }}>
                    {fr && <div style={{ gridColumn: '1', gridRow: '1', display: 'flex', alignItems: 'flex-end' }}>{fr}</div>}
                    {titleScore('right')}
                  </div>
                );
              }
              if (docSettings.titlePosition === 'left') {
                // Fields hug the sheet's right edge as a block with a straight LEFT edge
                // (left-aligned rows inside a right-pushed fit-content wrapper) — plain
                // renderFields('right') right-justified each wrapped row raggedly.
                const fr = renderFields('left');
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: `${gap}px`, rowGap: '8px' }}>
                    {titleScore('left')}
                    {fr && (
                      <div style={{ gridColumn: '2', gridRow: '1', display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                        <div className="print-body-fields" style={{ width: 'fit-content', maxWidth: '100%' }}>{fr}</div>
                      </div>
                    )}
                  </div>
                );
              }
              // center
              const order: HeaderField[] = headerData?.fieldOrder ?? DEFAULT_FIELD_ORDER;
              const fWidths = headerData?.fieldWidths ?? DEFAULT_FIELD_WIDTHS;
              const visible = order.filter(f => headerData?.[f]);
              const wOf = (f: HeaderField) => fWidths[f] ?? DEFAULT_FIELD_WIDTHS[f];
              const rowW = (fs: HeaderField[]) => fs.reduce((s, f) => s + wOf(f), 0) + Math.max(0, fs.length - 1) * 16;
              // When score is shown it claims the right side, so all fields go left; otherwise
              // split the fields half/half to flank the centred title (Naam left, Datum right).
              const splitIdx = showScore ? visible.length : Math.ceil(visible.length / 2);
              const leftFs = visible.slice(0, splitIdx);
              const rightFs = showScore ? [] : visible.slice(splitIdx);
              const titleW = hasTitle ? (headerData!.titel.length * 15 + 24) : 0;   // ~15px/char Azeret 24px bold + slack
              const rightW = showScore ? 160 : rowW(rightFs);
              // Inline-flank only if the whole thing comfortably fits one A4 line (~760px usable);
              // otherwise fall back to the stacked layout (fields row on top, title beneath).
              const inlineFlank = hasTitle && visible.length > 0 && (rowW(leftFs) + titleW + rightW + 2 * gap) <= 760;

              if (inlineFlank) {
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', columnGap: `${gap}px`, alignItems: 'flex-end' }}>
                    {/* Left fields hug the title (right-aligned); columnGap is the small margin. */}
                    <div className="print-body-fields" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', minWidth: 0 }}>{renderFields('right', leftFs)}</div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap' }}>{headerData!.titel}</h1>
                    <div className="print-body-fields" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', minWidth: 0 }}>
                      {showScore ? <div style={styles.scoreBox}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div> : renderFields('left', rightFs)}
                    </div>
                  </div>
                );
              }

              const centerFields = fieldsRowAligned('left');
              return (
                <>
                  {/* Name fields + Score share the top row so the Score box sits at the
                      Naam/Klas height (not floating below); the centered title drops beneath. */}
                  {(centerFields || showScore) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: `${gap}px` }}>
                      <div style={{ minWidth: 0 }}>{centerFields}</div>
                      {showScore && <div style={{ ...styles.scoreBox, flexShrink: 0 }}>Score: &nbsp; &nbsp; &nbsp; / {totalScore}</div>}
                    </div>
                  )}
                  {hasTitle && <h1 style={{ margin: '8px 0 0', fontSize: '24px', fontFamily: 'Azeret Mono, monospace', fontWeight: 'bold', textAlign: 'center' }}>{headerData!.titel}</h1>}
                </>
              );
            })()}
          </div>

    </>
  );

  // Footer is three slots. The left one always carries the credit and takes no setting;
  // the other two are free. Page numbers are only possible at all because the packer knows
  // the index and the total — the browser cannot count pages from HTML.
  const footerSlotText = (slot: FooterSlot | undefined, pageIndex: number, pageCount: number): string => {
    switch (slot) {
      case 'vrije-tekst':  return footerData?.centerText ?? '';
      case 'paginanummer': {
        const fmt = footerData?.pageFormat ?? 'lang';
        if (fmt === 'cijfer') return String(pageIndex + 1);
        if (fmt === 'kort') return `${pageIndex + 1} / ${pageCount}`;
        return `Pagina ${pageIndex + 1} van ${pageCount}`;
      }
      case 'school':     return footerData?.school || '';
      case 'klas':       return footerData?.klas || '';
      case 'leerkracht': return footerData?.leerkracht || '';
      case 'datum':      return new Date().toLocaleDateString('nl-BE');
      default:           return '';
    }
  };

  const renderFooterRegion = (pageIndex: number, pageCount: number) => {
    // Old worksheets have no slots; derive something sensible from the v2 fields so a
    // saved sheet keeps looking like itself.
    const centerSlot: FooterSlot = footerData?.slotCenter
      ?? (footerData?.showCenterText ? 'vrije-tekst' : 'leeg');
    const rightSlot: FooterSlot = footerData?.slotRight
      ?? (footerData?.showPagina ? 'paginanummer'
        : footerData?.showSchool ? 'school'
        : footerData?.showKlas ? 'klas'
        : footerData?.showLeerkracht ? 'leerkracht' : 'leeg');
    const right = rightSlot === 'vrije-tekst' ? (footerData?.rightText ?? '') : footerSlotText(rightSlot, pageIndex, pageCount);
    return (
            <div className="print-tfoot-inner" style={overlayRegionStyle({
              borderTopStyle: 'solid',
              borderTopWidth: docSettings.footerStyle === 'kader' ? '1.5px' : '1px',
              borderTopColor: docSettings.footerStyle === 'lijn' ? '#ccc'
                : docSettings.footerStyle === 'kader' ? '#000' : 'transparent',
              ...(docSettings.footerStyle === 'kader'
                ? { borderStyle: 'solid', borderWidth: '1.5px', borderColor: '#000', padding: '6px 10px', borderRadius: '6px' }
                : {}),
            }, docSettings.footerCustom)}>
              <span className="footer-credit">Gemaakt met RekenRaak.be</span>
              <span>{footerSlotText(centerSlot, pageIndex, pageCount)}</span>
              <span>{right}</span>
            </div>
    );
  };

  // One block in a page-grid cell. `index` counts across the whole worksheet so the
  // opdracht numbering keeps running across pages.
  const renderBlock = (item: PackedBlock, index: number) => {
    const block = item.block;
    // Sheet furniture (a rule, writing lines, a grid) is not an opdracht: it gets no
    // title row and takes no number, so the opdracht numbering skips over it.
    const isFurniture = block.typeId.startsWith('layout-');

              const isActive = block.id === activeSelectionId;
              // dividers between blocks come from the page grid gap now
      const isNotLastBlock = false;

              return (
                <div key={block.id} id={`block-${block.id}`} className={`print-block${block.pageBreakBefore ? ' page-break-before' : ''}${isActive ? ' is-active' : ''}`} onClick={(e) => { e.stopPropagation(); setActiveSelection(block.id); }} style={styles.blockContainer(isActive, isNotLastBlock, docSettings.showDividers, docSettings.blockSpacing ?? 12)}>
                  {/* Controls render for every block but stay hidden until the block is hovered or
                      active (CSS in index.css) — discoverable without selecting, no App re-render. */}
                  <div className="no-print block-controls" style={styles.blockControls} onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        icon={block.locked ? Lock : Unlock}
                        label={block.locked ? 'Ontgrendel (massa-regeneratie zal dit blok wel vernieuwen)' : 'Vergrendel (massa-regeneratie laat dit blok ongemoeid)'}
                        onClick={() => toggleBlockLock(block.id)}
                        variant={block.locked ? 'active' : 'neutral'}
                        size={16}
                      />
                      <IconButton icon={Copy} label="Blok dupliceren" onClick={() => duplicateBlock(block.id)} size={16} />
                      <IconButton
                        icon={CornerDownRight}
                        label={block.pageBreakBefore ? 'Begin niet op nieuwe pagina' : 'Begin op nieuwe pagina (bij afdrukken)'}
                        onClick={() => updateBlockSettings(block.id, { pageBreakBefore: !block.pageBreakBefore })}
                        variant={block.pageBreakBefore ? 'active' : 'neutral'}
                        size={16}
                      />
                      {index > 0 && (
                        <IconButton icon={ArrowUp} label="Blok omhoog" onClick={() => moveBlockUp(block.id)} size={16} />
                      )}
                      {index < blocks.length - 1 && (
                        <IconButton icon={ArrowDown} label="Blok omlaag" onClick={() => moveBlockDown(block.id)} size={16} />
                      )}
                      {/* Delete sits apart at the bottom, behind a divider, to avoid mis-clicks. */}
                      <div style={styles.blockControlsDivider} />
                      <IconButton icon={Trash2} label="Blok verwijderen" onClick={() => removeBlock(block.id)} variant="danger" size={16} />
                    </div>

                  {block.pageBreakBefore && (
                    <div className="no-print" style={{ fontSize: '10px', color: 'var(--accent-purple)', fontFamily: 'Azeret Mono, monospace', marginBottom: '6px', letterSpacing: '0.5px' }}>↡ nieuwe pagina</div>
                  )}

                  {/* Body zoom: scales the opdracht-titel + exercise viewer together (text AND
                      its coupled SVG/boxes), auto-fitting to width so a wide block can't clip in
                      print. Per-block override wins over the global default; block chrome
                      (controls/spacing/dividers/page-break) stays outside, unscaled. */}
                  <ScaledBlock
                    scale={block.constraints?.bodyFontScale ?? docSettings.bodyFontScale ?? 1}
                    availableWidthPx={cellWidthPx(item.width)}
                  >
                  {!isFurniture && <div className="print-opdracht" style={overlayRegionStyle({
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px',
                    ...(docSettings.opdrachtTitelStyle === 'boxed' ? { border: '1.5px solid #000', padding: '4px 8px', borderRadius: '3px' } : {}),
                    ...(docSettings.opdrachtTitelStyle === 'underlined' ? { borderBottom: '2px solid #000', paddingBottom: '4px' } : {}),
                  }, docSettings.titelCustom)}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
                      {(() => {
                        // The prefix marks differentiatie (MAG/MOET/★ or custom text).
                        const mode = block.instructionMode;
                        const label = mode === 'mag' ? 'MAG' : mode === 'moet' ? 'MOET' : mode === 'plus' ? '★'
                          : mode === 'aangepast' ? (block.customInstructionText || '') : '';
                        if (!label) return null;
                        // Inside a Kader titel the pill's own border would double the frame —
                        // render it as plain bold text + a vertical rule instead.
                        const boxed = docSettings.opdrachtTitelStyle === 'boxed';
                        if (boxed) return (
                          <>
                            <span style={{ fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>{label}</span>
                            <span style={{ width: '1.5px', alignSelf: 'stretch', background: '#000' }} />
                          </>
                        );
                        return <span style={styles.badge(mode as 'mag' | 'moet' | 'plus' | 'aangepast')}>{label}</span>;
                      })()}
                      {block.locked && (
                        <span className="no-print" title="Vergrendeld" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--accent-purple)' }}>
                          <Lock size={14} />
                        </span>
                      )}
                      <EditableInstruction block={block} prefix={docSettings.numberBlocks ? `${index}. ` : ''} />
                    </div>
                    {docSettings.showScores && (block.totalPoints || 0) > 0 && <div style={styles.pointsText}>__ / {block.totalPoints}</div>}
                  </div>}

                  {(() => {
                    // Registry decides which viewer renders this typeId.
                    const Viewer = EXERCISE_UI[block.typeId]?.Viewer;
                    return Viewer ? <Viewer block={block} showSolutions={showSolutions} /> : null;
                  })()}
                  </ScaledBlock>
                </div>
              );
  };


  return (
    <>
    <div className="mobile-block">
      <video className="mobile-block-demo" src="/rekenraak-demo.mp4" autoPlay loop muted playsInline />
      <span className="mobile-block-title">RekenRaak werkt op een groot scherm</span>
      <span>Hiermee maak je werkbladen op A4-formaat — daarvoor staan het blad én alle instellingen naast elkaar. Open de tool op een computer, laptop of tablet om aan de slag te gaan.</span>
      <span className="mobile-block-hint">Tip: draai je tablet in liggende stand (landscape).</span>
    </div>
    {tourOpen && <TourOverlay onClose={closeTour} />}
    <div className="print-root" style={styles.appShell}>
      {/* FULL-WIDTH TOP BAR — spans the window; the three panels sit directly underneath it. */}
      <div className="no-print" onClick={(e) => e.stopPropagation()}>
        <TopBar onPrint={handlePrint} onOpenHelp={() => setHelpOpen(true)} />
      </div>

      <div className="print-body-row" style={styles.appBody}>
      {/* LEFT — the exercise palette. Panels no longer collapse to a hover flyout below
          1800px: teachers on 14" laptops got stuck in it even with the pin, so the sheet
          absorbs a narrow window by zooming instead (see sheetZoom above). */}
      <div className="no-print" style={{ display: 'flex', height: '100%', flex: '0 0 auto' }}>
        <Sidebar />
      </div>

      {/* CENTRAL WORK AREA */}
      <main className="print-main" style={styles.mainContent} onClick={() => setActiveSelection('document')}>

        {/* Scroll container holds the banners + sheet (the topbar is now a sibling above).
            Padding ≥ the sheet's shadow reach (--shadow-3 = 48px blur): overflowY:auto forces
            overflow-x to compute as auto too, so without this the side/bottom shadow is clipped. */}
        <div ref={scrollRef} className="print-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 48px 48px' }}>

        {releaseBannerVisible && (
          <div className="no-print" onClick={(e) => e.stopPropagation()} style={bannerStyles.release}>
            <Hand size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>Welkom bij Rekenraak! Stel links je oefenblad samen, pas het rechts aan en druk af als PDF. Nieuw hier? <button onClick={() => setHelpOpen(true)} style={bannerStyles.inlineLink}>Lees de uitleg</button>.</span>
            <button onClick={dismissReleaseBanner} style={bannerStyles.bannerClose} title="Verbergen">×</button>
          </div>
        )}

        {!tryoutDismissed && blocks.some(b => TRYOUT_TYPE_IDS.has(b.typeId)) && (
          <div className="no-print" onClick={(e) => e.stopPropagation()} style={bannerStyles.release}>
            <Flask size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>Enkele oefeningen op dit blad zijn nieuw en nog in proef. Kijk het afgedrukte blad even na voor je het uitdeelt.</span>
            <button onClick={dismissTryoutBanner} style={bannerStyles.bannerClose} title="Verbergen">×</button>
          </div>
        )}

        <div ref={a4Ref} className="print-area-shell" style={{ zoom: sheetZoom }}>

          {packedPages.map((page, pi) => (
            <PageSheet
              key={pi}
              index={pi}
              total={packedPages.length}
              contentGap={docSettings.headerContentGap ?? 12}
              blockSpacing={docSettings.blockSpacing ?? 12}
              onBackgroundClick={() => setActiveSelection('document')}
              header={pi === 0
                ? renderHeaderRegion()
                : (headerData?.repeatHeader ? <div className="print-repeat-fields">{renderFields()}</div> : null)}
              footer={renderFooterRegion(pi, packedPages.length)}
            >
              {blocks.length === 0 && pi === 0 && (
                <div className="no-print" style={{ ...styles.heroEmpty, gridColumn: 'span 6' }}>
                  <h1 style={styles.heroTitle}>RekenRaak — gratis werkbladgenerator voor wiskunde in het lager onderwijs</h1>
                  <p style={styles.heroPitch}>
                    Stel in enkele minuten een eigen wiskundewerkblad samen voor het lager onderwijs —
                    kies oefeningen, regel de moeilijkheidsgraad en druk af of bewaar als pdf.
                  </p>
                  <ul style={styles.heroBullets}>
                    <li style={styles.heroBullet}><ListChecks size={20} color="var(--accent)" weight="bold" />Kies oefeningen</li>
                    <li style={styles.heroBullet}><SlidersHorizontal size={20} color="var(--accent)" weight="bold" />Stel de moeilijkheidsgraad in</li>
                    <li style={styles.heroBullet}><Printer size={20} color="var(--accent)" weight="bold" />Druk af of bewaar als pdf</li>
                  </ul>
                  <p style={styles.heroHint}>Voeg links een oefening toe om te beginnen.</p>
                </div>
              )}
              {page.rows.flatMap((row) => row.items).map((item) => (
                <div key={item.block.id} style={{ gridColumn: `span ${item.width}`, minWidth: 0 }}>
                  {renderBlock(item, blockOrder[item.block.id] ?? 0)}
                </div>
              ))}
            </PageSheet>
          ))}
        </div>
        </div>
      </main>

      {/* RIGHT — block settings. Always visible, like the palette: hiding either one is
          what got teachers stuck. */}
      <div className="no-print" style={{ display: 'flex', height: '100%', flex: '0 0 auto' }}>
        <Inspector />
      </div>

      </div>
    </div>
    {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onStartTour={() => { setHelpOpen(false); setTourOpen(true); }} />}
    {/* Full-screen library overlays — editor stays mounted underneath (preserves scroll). */}
    {view === 'mijn-bladen' && <MijnBladenView />}
    {view === 'bibliotheek' && <BibliotheekView />}
    </>
  );
}

const bannerStyles = {
  autosave: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 16px', marginBottom: '12px',
    backgroundColor: 'rgba(155, 48, 255, 0.10)',
    border: '1px solid var(--accent-purple)',
    borderRadius: '8px',
    fontSize: '13px', color: 'var(--text-main)',
    fontFamily: "'Azeret Mono', monospace",
  } as React.CSSProperties,
  release: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '8px 16px', marginBottom: '12px',
    backgroundColor: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    fontSize: '12px', color: 'var(--text-muted)',
    fontFamily: "'Azeret Mono', monospace",
  } as React.CSSProperties,
  bannerPrimary: {
    padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
    border: 'none', backgroundColor: 'var(--accent-purple)', color: '#fff',
  } as React.CSSProperties,
  bannerSecondary: {
    padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
    border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-main)',
  } as React.CSSProperties,
  bannerClose: {
    marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)',
    fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  } as React.CSSProperties,
  inlineLink: {
    background: 'none', border: 'none', padding: 0, color: 'var(--accent-purple)',
    textDecoration: 'underline', cursor: 'pointer', font: 'inherit',
  } as React.CSSProperties,
};
