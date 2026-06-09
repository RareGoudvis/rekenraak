import { useState, useRef, useEffect } from 'react';
import { useWorksheetStore } from './store/useWorksheetStore';
import Inspector from './components/configurator/Inspector';
import Sidebar from './components/layout/sidebar';
import TopBar from './components/layout/TopBar';
import PanelShell from './components/layout/PanelShell';
import { EXERCISE_UI } from './config/exerciseUI';
import { ScaledBlock } from './components/viewer/ScaledBlock';
import MijnBladenView from './components/library/MijnBladenView';
import BibliotheekView from './components/library/BibliotheekView';
import HelpModal from './components/layout/HelpModal';
import TourOverlay from './components/onboarding/TourOverlay';
import IconButton from './components/ui/IconButton';
import { ArrowUp, ArrowDown, Lock, LockOpen as Unlock, Copy, Trash as Trash2, ArrowElbowDownRight as CornerDownRight, Hand, ListChecks, SlidersHorizontal, Printer } from '@phosphor-icons/react';
import { usePrint } from './hooks/usePrint';
import { styles } from './styles/appStyles';
import { overlayRegionStyle } from './services/regionStyle';
import { loadAutosave, decodeShareHash, RELEASE_SEEN_KEY } from './services/persistence';
import { DEFAULT_FIELD_ORDER, DEFAULT_FIELD_WIDTHS, type HeaderField } from './store/useWorksheetStore';
import { RELEASE_VERSION } from './config/version';
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
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
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

  const dismissReleaseBanner = () => {
    try { localStorage.setItem(RELEASE_SEEN_KEY, RELEASE_VERSION); } catch { /* ignore */ }
    setReleaseBannerVisible(false);
  };

  const totalScore = blocks.reduce((sum, block) => sum + (block.totalPoints || 0), 0);

  useEffect(() => {
    if (!a4Ref.current) return;
    const PAGE_H = 1044;
    const totalH = a4Ref.current.scrollHeight;
    const breaks: number[] = [];
    let p = PAGE_H;
    while (p < totalH) { breaks.push(p); p += PAGE_H; }
    setPageBreaks(breaks);

    // Per-block page index (for the Overzicht auto page-break markers). Measured in the
    // same coordinate space as the dashed indicators (offset from the sheet top / PAGE_H).
    const a4Top = a4Ref.current.getBoundingClientRect().top;
    const pages: Record<string, number> = {};
    for (const b of blocks) {
      const el = document.getElementById(`block-${b.id}`);
      if (!el) continue;
      const rel = el.getBoundingClientRect().top - a4Top;
      pages[b.id] = Math.max(0, Math.floor(rel / PAGE_H));
    }
    setBlockPages(pages);
  }, [blocks, docSettings, showSolutions, setBlockPages]);

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
      {/* LEFT SIDEBAR — collapses to a hover flyout below 1536px (PanelShell) */}
      <PanelShell side="left" label="Oefeningen"><Sidebar /></PanelShell>

      {/* CENTRAL WORK AREA */}
      <main className="print-main" style={styles.mainContent} onClick={() => setActiveSelection('document')}>

        {/* Scroll container holds the banners + sheet (the topbar is now a sibling above).
            Padding ≥ the sheet's shadow reach (--shadow-3 = 48px blur): overflowY:auto forces
            overflow-x to compute as auto too, so without this the side/bottom shadow is clipped. */}
        <div className="print-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 48px 48px' }}>

        {releaseBannerVisible && (
          <div className="no-print" onClick={(e) => e.stopPropagation()} style={bannerStyles.release}>
            <Hand size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
            <span>Welkom bij Rekenraak! Stel links je oefenblad samen, pas het aan in het rechterpaneel en druk af als PDF. Nieuw hier? <button onClick={() => setHelpOpen(true)} style={bannerStyles.inlineLink}>Lees de uitleg</button>.</span>
            <button onClick={dismissReleaseBanner} style={bannerStyles.bannerClose} title="Verbergen">×</button>
          </div>
        )}

        <div ref={a4Ref} className="print-area-shell" style={styles.a4Sheet}>
          {/* Real <table> markup: Chrome only repeats <thead>/<tfoot> across printed pages
              for true table elements, not for div-based display:table-*-group. */}
          <table className={`print-area${headerData?.repeatHeader ? ' repeat-header' : ''}`}>
          <thead className="print-thead" aria-hidden="true"><tr><td>
            {/* spacer = top margin every page; name strip repeats when repeatHeader is on */}
            <div className="print-thead-spacer" />
            <div className="print-repeat-fields">{renderFields()}</div>
          </td></tr></thead>
          <tbody className="print-body"><tr><td className="print-body-cell">
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
                const fr = fieldsRowAligned('right');
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: `${gap}px`, rowGap: '8px' }}>
                    {titleScore('left')}
                    {fr && <div style={{ gridColumn: '2', gridRow: '1', display: 'flex', alignItems: 'flex-end' }}>{fr}</div>}
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

          {/* ── BLOCKS ── */}
          <div style={{ width: '100%', marginTop: `${docSettings.headerContentGap ?? 12}px` }}>
            {/* Cold-load hero: real visible h1 + intro for first-time visitors and SEO.
                Shows only on an empty sheet; the moment a block is added it's gone.
                no-print keeps it off paper. */}
            {blocks.length === 0 && (
              <div className="no-print" style={styles.heroEmpty}>
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
                <p style={styles.heroHint}>Voeg links een oefening toe om te beginnen — deze tekst verdwijnt zodra je eerste blok op het blad staat.</p>
              </div>
            )}
            {blocks.map((block, index) => {
              const isActive = block.id === activeSelectionId;
              const isNotLastBlock = index < blocks.length - 1;

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
                  <ScaledBlock scale={block.constraints?.bodyFontScale ?? docSettings.bodyFontScale ?? 1}>
                  <div className="print-opdracht" style={overlayRegionStyle({
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
                      <EditableInstruction block={block} prefix={docSettings.numberBlocks ? `${index + 1}. ` : ''} />
                    </div>
                    {docSettings.showScores && (block.totalPoints || 0) > 0 && <div style={styles.pointsText}>__ / {block.totalPoints}</div>}
                  </div>

                  {(() => {
                    // Registry decides which viewer renders this typeId.
                    const Viewer = EXERCISE_UI[block.typeId]?.Viewer;
                    return Viewer ? <Viewer block={block} showSolutions={showSolutions} /> : null;
                  })()}
                  </ScaledBlock>
                </div>
              );
            })}
          </div>

          </td></tr></tbody>
          {/* Print-only running footer (real <tfoot>): repeats every page + reserves its
              height, so content can never overlap it. */}
          <tfoot className="print-tfoot"><tr><td>
            <div className="print-tfoot-inner" style={overlayRegionStyle({}, docSettings.footerCustom)}>
              <span>{[
                footerData?.showSchool ? (footerData.school || 'School') : null,
                footerData?.showKlas ? (footerData.klas || 'Klas') : null,
                footerData?.showLeerkracht ? (footerData.leerkracht || 'Leerkracht') : null,
              ].filter(Boolean).join(' | ')}</span>
              <span>{footerData?.showCenterText ? footerData.centerText : ''}</span>
            </div>
          </td></tr></tfoot>
          </table>

          {/* ── PAGE BREAK INDICATORS ── (table siblings, anchored to the relative shell) */}
          {pageBreaks.map((y) => (
            <div key={y} className="no-print" style={{ position: 'absolute', top: `${y}px`, left: 0, right: 0, borderTop: '2px dashed rgba(220,38,38,0.55)', zIndex: 5, pointerEvents: 'none' }}>
              <span style={{ position: 'absolute', right: '12px', top: '-16px', fontSize: '10px', color: 'rgba(220,38,38,0.6)', fontFamily: 'Azeret Mono, monospace', letterSpacing: '0.5px', userSelect: 'none' }}>— paginaeinde —</span>
            </div>
          ))}
        </div>
        </div>
      </main>

      {/* RIGHT INSPECTOR — collapses to a hover flyout below 1536px (PanelShell) */}
      <PanelShell side="right" label="Instellingen"><Inspector /></PanelShell>
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
