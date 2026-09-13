import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWorksheetStore } from './store/useWorksheetStore';
import Sidebar from './components/layout/sidebar';
import PageSheet, { PAGE_W_PX } from './components/layout/PageSheet';
import { packPages, pageIndexByBlock, type PackedBlock } from './services/layout/pagePacker';
import { minWidthUnits } from './services/layout/blockLayout';
import { numberBlocks } from './services/layout/blockNumbering';
import type { FooterSlot } from './services/math/types';
import Inspector from './components/configurator/Inspector';
import TopBar from './components/layout/TopBar';
import { EXERCISE_UI } from './config/exerciseUI';
import { REGISTRY } from './config/exerciseRegistry';
import PopupSelect from './components/ui/PopupSelect';
import { ScaledBlock } from './components/viewer/ScaledBlock';
import { BlockErrorBoundary } from './components/viewer/BlockErrorBoundary';
import { cellWidthPx } from './components/viewer/BlockWidthContext';
import MijnBladenView from './components/library/MijnBladenView';
import BibliotheekView from './components/library/BibliotheekView';
import HelpModal from './components/layout/HelpModal';
import AboutModal from './components/layout/AboutModal';
import TourOverlay from './components/onboarding/TourOverlay';
import BlockControlsRail from './components/layout/BlockControlsRail';
import { Lock, Hand, ListChecks, SlidersHorizontal, Printer, Flask } from '@phosphor-icons/react';
import { usePrint } from './hooks/usePrint';
import { useMeasuredHeights } from './hooks/useMeasuredHeights';
import { useSheetDnd } from './hooks/useSheetDnd';
import SheetDropZones, { SheetDragHint } from './components/layout/SheetDropZones';
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
      // A Dutch opdracht title is one long compound word often enough
      // ("Vermenigvuldigingsoefeningen:"), and a single token has no break opportunity —
      // in a quarter-width cell it ran straight out of the block. `anywhere` also lets the
      // flex row below it shrink, which is what min-content width is probed against.
      style={{ ...styles.instructionDisplay, cursor: locked ? 'default' : 'text', overflowWrap: 'anywhere', minWidth: 0 }}
    >
      {prefix}{block.instructionText || ''}
    </span>
  );
}

// ── "Blok splitsen" ───────────────────────────────────────────────────────────
// A block that does not fit the rest of a page moves whole to the next one and leaves a
// blank tail. The packer cannot break a block by itself, so the teacher does it: cut
// after exercise N and the first N stay where there is still room.

/** How many exercises this block holds, via the registry's own array field. */
function splittableCount(block: MathBlock): number {
    if (block.typeId.startsWith('layout-')) return 0;      // furniture holds no exercises
    const field = REGISTRY[block.typeId]?.exerciseField;
    if (!field) return 0;
    const items = block[field] as unknown[] | undefined;
    return Array.isArray(items) ? items.length : 0;
}

// Largest N whose leading rows still fit `availablePx`, measured off the rendered cell.
// `.print-row` (FragmentableGrid) is the only place a block really breaks, so the count
// walks whole rows and adds up the exercises in them. Returns null when the DOM says
// nothing useful — one row, no measurement, or everything fits anyway.
//
// All heights come from getBoundingClientRect and are divided back by the sheet zoom:
// offsetHeight inside ScaledBlock's CSS `zoom` is unzoomed local px and would not
// compare with the page box around it.
function fittingSplitIndex(cell: HTMLElement, availablePx: number, count: number, zoom: number): number | null {
    const rows = Array.from(cell.querySelectorAll<HTMLElement>('.print-row'));
    if (rows.length < 2 || !(availablePx > 0)) return null;
    const h = (el: HTMLElement) => el.getBoundingClientRect().height / zoom;
    const rowsTotal = rows.reduce((sum, r) => sum + h(r), 0);
    // Whatever is not an exercise row — the opdracht title, block padding — has to fit too.
    let used = h(cell) - rowsTotal;
    let n = 0;
    for (const row of rows) {
        used += h(row);
        if (used > availablePx) break;
        n += row.children.length || 1;
    }
    return n >= 1 && n < count ? n : null;
}

interface SplitTarget { blockId: string; count: number; suggested: number; x: number; y: number; }

const POPOVER_W = 240;   // SYNC: .split-popover width in index.css

// Tiny popover: pick where to cut, confirm. Positioned next to whatever opened it (the
// scissors control, or the page-tail hint), clamped into the viewport.
function SplitPopover({ target, onSplit, onClose }: { target: SplitTarget; onSplit: (n: number) => void; onClose: () => void }) {
    const [n, setN] = useState(target.suggested);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, [onClose]);

    const options = Array.from({ length: target.count - 1 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
    return (
        <div
            ref={ref}
            className="no-print split-popover"
            style={{
                left: Math.max(8, Math.min(target.x, window.innerWidth - POPOVER_W - 8)),
                top: Math.max(8, Math.min(target.y, window.innerHeight - 150)),
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="split-popover-title">Splitsen na oefening</div>
            <PopupSelect value={n} options={options} onChange={setN} ariaLabel="Splitsen na oefening" />
            <div className="split-popover-actions">
                <button type="button" className="split-popover-cancel" onClick={onClose}>Annuleren</button>
                <button type="button" className="split-popover-confirm" onClick={() => { onSplit(n); onClose(); }}>Splitsen</button>
            </div>
        </div>
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
    // The page is a real A4 at 96dpi now; the old 920px card is gone, and measuring
    // against it made the sheet shrink long before it needed to.
    const SHEET_PX = 794;
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
  // Harness escape hatch: measure a type at a width its tier forbids (scripts/width-matrix.mjs).
  const debugIgnoreMinWidth = useWorksheetStore((state) => state.debugIgnoreMinWidth);

  const removeBlock = useWorksheetStore((state) => state.removeBlock);
  const moveBlockUp = useWorksheetStore((state) => state.moveBlockUp);
  const moveBlockDown = useWorksheetStore((state) => state.moveBlockDown);
  const setActiveSelection = useWorksheetStore((state) => state.setActiveSelection);
  const setInspectorTab = useWorksheetStore((state) => state.setInspectorTab);
  const setBladSection = useWorksheetStore((state) => state.setBladSection);

  // Clicking the header or footer ON the sheet opens its settings: select the document,
  // switch to Blad, and open the sub-tab for the part that was clicked.
  const openBladCard = useCallback((card: 'koptekst' | 'voettekst') => {
    setActiveSelection('document');
    setInspectorTab('blad');
    setBladSection(card);
  }, [setActiveSelection, setInspectorTab, setBladSection]);
  const toggleBlockLock = useWorksheetStore((state) => state.toggleBlockLock);
  const duplicateBlock = useWorksheetStore((state) => state.duplicateBlock);
  const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);
  const loadWorksheet = useWorksheetStore((state) => state.loadWorksheet);

  const [helpOpen, setHelpOpen] = useState(false);
  // Opened from two places (the sidebar wordmark and the Meer menu), so it is mounted
  // once here rather than duplicated in both panels.
  const [aboutOpen, setAboutOpen] = useState(false);
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
  const renderFields = (align: 'left' | 'right' = 'left') => {
    const order: HeaderField[] = headerData?.fieldOrder ?? DEFAULT_FIELD_ORDER;
    const widths = headerData?.fieldWidths ?? DEFAULT_FIELD_WIDTHS;
    const LABELS: Record<HeaderField, string> = { naam: 'Naam:', klas: 'Klas:', nummer: 'Nr:', datum: 'Datum:' };
    const visibleFields = order.filter(f => headerData?.[f]);
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

  // A column rule needs air on both sides or the right-hand block's digits sit flush
  // against it. The COLUMN gap widens by 16px when the rule is on; the ROW gap keeps
  // blockSpacing, so the packer's vertical budget is untouched.
  const colGapPx = (docSettings.blockSpacing ?? 12) + (docSettings.showColumnDividers ? 16 : 0);
  const cellWidth = (units: number) => cellWidthPx(units, colGapPx);

  // Pagination is decided by the packer, which pages a first time on its settings-derived
  // budget and then repacks on the heights the sheet actually rendered. Estimating alone
  // ended pages early (blank tails) or overran them; measuring alone could not run before
  // the first paint.
  const measured = useMeasuredHeights(blocks);
  // Drag a block from its handle onto another block: top half inserts before it, bottom
  // half swaps the two.
  const dnd = useSheetDnd();
  const splitBlock = useWorksheetStore((s) => s.splitBlock);
  const [splitTarget, setSplitTarget] = useState<SplitTarget | null>(null);
  // Drives BlockControlsRail: which block's controls are showing. Hover wins over
  // selection (matches the old CSS :hover-over-:is-active rule) so moving off a selected
  // block onto another one shows THAT block's controls, not two rails at once.
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  // Open the split popover for a block. `availableOverridePx` is the space the block has
  // to fit into; the page-tail hint passes the tail of the PREVIOUS page, because the
  // block it offers to split already sits at the top of the next one.
  const openSplit = useCallback((blockId: string, anchorRect: DOMRect, availableOverridePx?: number) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const count = splittableCount(block);
    if (count < 2) return;
    const cell = document.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
    const sheet = cell?.closest('.page-sheet');
    const body = cell?.closest('.page-sheet-body');
    const zoom = sheet ? (sheet.getBoundingClientRect().width / PAGE_W_PX) || 1 : 1;
    let available = availableOverridePx;
    if (available === undefined && cell && body) {
      available = (body.getBoundingClientRect().bottom - cell.getBoundingClientRect().top) / zoom;
    }
    const fitted = cell && available !== undefined ? fittingSplitIndex(cell, available, count, zoom) : null;
    setSplitTarget({
      blockId, count,
      // No usable measurement (or the block fits as it is): half is the neutral answer.
      suggested: fitted ?? Math.max(1, Math.floor(count / 2)),
      // Left of whatever opened it: the scissors sits in the block-control rail on the
      // block's right edge, and a popover on top of that rail hides the buttons.
      x: anchorRect.left - POPOVER_W - 8, y: anchorRect.bottom + 6,
    });
  }, [blocks]);
  // The oversize banner's "Verklein dit blok": turn the switch on AND take the teacher to
  // it, so the sheet's fix and the Inspector's switch are visibly the same setting.
  // setActiveSelection resets the tab to 'oefening', so the tab is set after it.
  const fitBlockToPage = useCallback((blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    updateBlockSettings(blockId, { constraints: { ...block.constraints, fitToPage: true } });
    setActiveSelection(blockId);
    setInspectorTab('weergave');
  }, [blocks, updateBlockSettings, setActiveSelection, setInspectorTab]);

  const packedPages = useMemo(
    () => packPages(blocks, {
      blockSpacingPx: docSettings.blockSpacing ?? 12,
      heightPxOf: measured.heightPxOf,
      pageBudgetPx: measured.pageBudgetPx,
      // The width clamp is measured too: a block only needs a wider column when its
      // CONTENT does, not because its type once did at default settings.
      minWidthOf: (b) => {
        const w = measured.intrinsicOf(b.id);
        return minWidthUnits(b, w && { intrinsicPx: w.px, atWidth: w.atWidth });
      },
      ignoreMinWidth: debugIgnoreMinWidth,
    }),
    [blocks, docSettings.blockSpacing, measured, debugIgnoreMinWidth],
  );
  // Opdracht numbering runs across pages and counts exercise blocks only, so inserting a
  // separator never renumbers the exercises after it.
  // id -> position in blocks[]. Distinct from blockOrder below, which is the printed
  // opdracht number and deliberately skips layout-* furniture.
  const blockPos = useMemo(() => {
    const m: Record<string, number> = {};
    blocks.forEach((b, i) => { m[b.id] = i; });
    return m;
  }, [blocks]);

  // The single rail mounted below the page stack (outside the packer's clipped body) —
  // hover beats selection, and 'document' (nothing selected) shows no rail at all.
  const visibleBlockId = hoveredBlockId ?? (activeSelectionId && activeSelectionId !== 'document' ? activeSelectionId : null);
  const visibleBlock = visibleBlockId ? blocks.find((b) => b.id === visibleBlockId) : undefined;

  const blockOrder = useMemo(() => numberBlocks(blocks), [blocks]);

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
            // Vertical padding belongs to the BOX, not to the header: with headerStyle
            // 'geen' (the default) there is no border and no rule, so 12px above and below
            // was 24px of paper reserved for a frame nobody asked for. It comes back for
            // 'onderstreept' / 'kader', which do need air inside their line.
            display: 'flex', flexDirection: 'column', width: '100%',
            padding: docSettings.headerStyle === 'geen' ? '0 12px' : '12px',
            boxSizing: 'border-box',
            // The title's size lives HERE, on the region container, because that is what
            // the Blad tab's "Tekengrootte" slider writes to (overlayRegionStyle sets
            // fontSize on this box). An <h1> with its own fontSize simply won out and the
            // slider did nothing. The name fields, the score box and the badge keep their
            // own sizes — only the title inherits. A flanking title is a size smaller than
            // a centred one, which is the one thing the old per-h1 sizes were saying.
            fontSize: (docSettings.titlePosition === 'left' || docSettings.titlePosition === 'right') ? '22px' : '24px',
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
                  {hasTitle && <h1 style={{ margin: 0, fontSize: 'inherit', fontFamily: 'var(--font-sheet-text)', fontWeight: 700, textAlign: align }}>{headerData!.titel}</h1>}
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
              // center — the title ALWAYS sits on its own line under the fields, the way a
              // real worksheet reads; flanking the title with half the fields looked odd.
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
                  {/* The 8px only separates the title from the fields/score row above it;
                      with every field off there is nothing to separate it from and the gap
                      is paper margin pretending to be layout. */}
                  {hasTitle && <h1 style={{ margin: (centerFields || showScore) ? '8px 0 0' : 0, fontSize: 'inherit', fontFamily: 'var(--font-sheet-text)', fontWeight: 700, textAlign: 'center' }}>{headerData!.titel}</h1>}
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
    const leftSlot: FooterSlot = footerData?.slotLeft ?? 'leeg';
    const right = rightSlot === 'vrije-tekst' ? (footerData?.rightText ?? '') : footerSlotText(rightSlot, pageIndex, pageCount);
    const left = leftSlot === 'vrije-tekst' ? (footerData?.leftText ?? '') : footerSlotText(leftSlot, pageIndex, pageCount);
    // The credit always prints; only its position is the teacher's choice. Whichever
    // position holds it shows the credit instead of that position's own slot.
    const brandSlot = footerData?.brandSlot ?? 'left';
    const credit = <span className="footer-credit">Gemaakt met RekenRaak.be</span>;
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
              <span>{brandSlot === 'left' ? credit : left}</span>
              <span>{brandSlot === 'center' ? credit : footerSlotText(centerSlot, pageIndex, pageCount)}</span>
              <span>{brandSlot === 'right' ? credit : right}</span>
            </div>
    );
  };

  // One block in a page-grid cell. `index` counts across the whole worksheet so the
  // opdracht numbering keeps running across pages.
  const renderBlock = (item: PackedBlock, index: number | null) => {
    const block = item.block;
    // Sheet furniture (a rule, writing lines, a grid) is not an opdracht: it gets no
    // title row and takes no number, so the opdracht numbering skips over it.
    const isFurniture = block.typeId.startsWith('layout-');

              const isActive = block.id === activeSelectionId;
              // dividers between blocks come from the page grid gap now
      const isNotLastBlock = false;

              return (
                <div
                  key={block.id}
                  id={`block-${block.id}`}
                  className={`print-block${block.pageBreakBefore ? ' page-break-before' : ''}${isActive ? ' is-active' : ''}${dnd.fromId === block.id ? ' is-dragging' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setActiveSelection(block.id); }}
                  // Controls used to live inside this div and reveal on CSS :hover; they're
                  // portalled out now (BlockControlsRail, rendered once below for whichever
                  // block is hovered or active) so a block at the bottom of the page can't
                  // have its buttons clipped by .page-sheet-body's overflow:hidden.
                  onPointerEnter={() => setHoveredBlockId(block.id)}
                  onPointerLeave={() => setHoveredBlockId((id) => (id === block.id ? null : id))}
                  {...dnd.blockProps(block.id)}
                  style={styles.blockContainer(isActive, isNotLastBlock, docSettings.showDividers)}
                >
                  {/* Only while something is being dragged, and never on the block that
                      is being dragged itself. */}
                  {dnd.fromId !== null && dnd.fromId !== block.id && (
                    <SheetDropZones
                      zone={dnd.overId === block.id ? dnd.zone : null}
                      noop={dnd.zone !== null && dnd.isNoop(block.id, dnd.zone)}
                    />
                  )}

                  {block.pageBreakBefore && (
                    <div className="no-print" style={{ fontSize: '10px', color: 'var(--accent-purple)', fontFamily: 'Azeret Mono, monospace', marginBottom: '6px', letterSpacing: '0.5px' }}>↡ nieuwe pagina</div>
                  )}

                  {/* Body zoom: scales the opdracht-titel + exercise viewer together (text AND
                      its coupled SVG/boxes), auto-fitting to width so a wide block can't clip in
                      print. Per-block override wins over the global default; block chrome
                      (controls/spacing/dividers/page-break) stays outside, unscaled. */}
                  <ScaledBlock
                    scale={block.constraints?.bodyFontScale ?? docSettings.bodyFontScale ?? 1}
                    availableWidthPx={cellWidth(item.width)}
                    fitToPage={block.constraints?.fitToPage === true}
                    fitToWidth={block.constraints?.fitToWidth === true}
                  >
                  {/* showInstruction === false hides the title row the way furniture has none;
                      blockOrder still counts the block unless skipNumbering says otherwise, so
                      the rest of the sheet keeps its numbers. */}
                  {!isFurniture && block.showInstruction !== false && <div className="print-opdracht" style={overlayRegionStyle({
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px',
                    // SYNC with appStyles.instructionDisplay, which inherits it: the size
                    // has to sit on the container the "Tekengrootte" slider writes to.
                    fontSize: 'var(--sheet-size-text)',
                    ...(docSettings.opdrachtTitelStyle === 'boxed' ? { border: '1.5px solid #000', padding: '4px 8px', borderRadius: '3px' } : {}),
                    ...(docSettings.opdrachtTitelStyle === 'underlined' ? { borderBottom: '2px solid #000', paddingBottom: '4px' } : {}),
                  }, docSettings.titelCustom)}>
                    {/* minWidth:0 so the title can actually take the wrap above: a flex
                        item's default min-width is its content, which is exactly the
                        overflow it was supposed to prevent. */}
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: '12px' }}>
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
                            <span style={{ fontWeight: 'bold', fontSize: 'calc(var(--sheet-size-text) * 0.6)', whiteSpace: 'nowrap' }}>{label}</span>
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
                      <EditableInstruction block={block} prefix={docSettings.numberBlocks && index != null ? `${index}. ` : ''} />
                    </div>
                    {docSettings.showScores && (block.totalPoints || 0) > 0 && <div style={styles.pointsText}>__ / {block.totalPoints}</div>}
                  </div>}

                  {(() => {
                    // Registry decides which viewer renders this typeId.
                    const Viewer = EXERCISE_UI[block.typeId]?.Viewer;
                    if (!Viewer) return null;
                    // resetKey = the block's own exercise array reference — regenerateBlock
                    // (Genereer) swaps that reference, which is the teacher's recovery action
                    // after a crash, so it must also clear a tripped boundary.
                    const exerciseField = REGISTRY[block.typeId]?.exerciseField ?? 'exercises';
                    const resetKey = (block as unknown as Record<string, unknown>)[exerciseField];
                    return (
                      <BlockErrorBoundary resetKey={resetKey} label={block.typeId}>
                        <Viewer block={block} showSolutions={showSolutions} />
                      </BlockErrorBoundary>
                    );
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
      <div className="print-body-row" style={styles.appBody}>
      {/* LEFT — the exercise palette, running the FULL height of the window. Its own tab
          strip sits at the top, level with the top bar, so the three columns read as three
          columns rather than as one bar with things under it. Panels no longer collapse to
          a hover flyout: teachers on 14" laptops got stuck in it even with the pin, so a
          narrow window shrinks the sheet instead (see sheetZoom above). */}
      <div className="no-print" style={{ display: 'flex', height: '100%', flex: '0 0 auto' }}>
        <Sidebar onOpenAbout={() => setAboutOpen(true)} />
      </div>

      {/* CENTRE — the top bar belongs to the SHEET, so it spans only this column. */}
      <div style={styles.centreColumn}>
      <div className="no-print" onClick={(e) => e.stopPropagation()}>
        <TopBar onPrint={handlePrint} onOpenHelp={() => setHelpOpen(true)} onOpenAbout={() => setAboutOpen(true)} />
      </div>
      <main className="print-main" style={styles.mainContent} onClick={() => setActiveSelection('document')}>

        {/* Scroll container holds the banners + sheet (the topbar is now a sibling above).
            Padding ≥ the sheet's shadow reach (--shadow-3 = 48px blur): overflowY:auto forces
            overflow-x to compute as auto too, so without this the side/bottom shadow is clipped.
            The TOP is 28px rather than 8px because .page-sheet-tag hangs 20px above the first
            page (plus its ~13px line box) and was clipped to a row of descenders at scroll top.
            The tag is absolutely positioned, so this changes nothing the packer measures. */}
        <div ref={scrollRef} className="print-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 48px 48px' }}>

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

        <div
          ref={a4Ref}
          className="print-area-shell"
          style={{
            zoom: sheetZoom,
            // Cascades to every PageSheet + viewer below it (same DOM on screen and in
            // print, so the print page inherits for free). Only set when the teacher has
            // touched the slider — omitted keys fall back to the CSS token default.
            ...(docSettings.fontSizeMath != null ? { ['--sheet-size-math' as string]: `${docSettings.fontSizeMath}pt` } : {}),
            ...(docSettings.fontSizeText != null ? { ['--sheet-size-text' as string]: `${docSettings.fontSizeText}pt` } : {}),
          }}
        >

          {packedPages.map((page, pi) => (
            <PageSheet
              key={pi}
              index={pi}
              total={packedPages.length}
              contentGap={docSettings.headerContentGap ?? 12}
              blockSpacing={docSettings.blockSpacing ?? 12}
              columnGap={colGapPx}
              onBackgroundClick={() => setActiveSelection('document')}
              onHeaderClick={() => openBladCard('koptekst')}
              onFooterClick={() => openBladCard('voettekst')}
              onBodyMeasure={measured.onBodyMeasure}
              onCellMeasure={measured.onCellMeasure}
              tailRow={page.rows.length + 1}
              onSplitNext={(() => {
                // Only offer the split when there IS a next page whose first block can be
                // cut — otherwise the blank tail is simply the end of the worksheet.
                const next = packedPages[pi + 1]?.rows[0]?.items[0]?.block;
                if (!next || splittableCount(next) < 2) return undefined;
                return (tailPx: number, anchorRect: DOMRect) => openSplit(next.id, anchorRect, tailPx);
              })()}
              onFitBlock={fitBlockToPage}
              onSplitBlock={(blockId, anchor) => openSplit(blockId, anchor)}
              header={pi === 0
                ? renderHeaderRegion()
                : (headerData?.repeatHeader ? <div className="print-repeat-fields">{renderFields()}</div> : null)}
              footer={renderFooterRegion(pi, packedPages.length)}
            >
              {blocks.length === 0 && pi === 0 && (
                <div className="no-print" style={{ ...styles.heroEmpty, gridColumn: 'span 4' }}>
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
              {/* Place every cell EXPLICITLY on the row the packer chose. Auto-placement
                  lets the browser backfill a gap in an earlier row, which silently moves a
                  block away from the row the pagination was costed against. Rows stay
                  `auto` height so content (and ScaledBlock's zoom) still sizes them.
                  Keep each item's position WITHIN its row: only a block that has a
                  neighbour to its left gets the column rule, so the setting is a no-op
                  on a single-column sheet instead of drawing a stray line down the page. */}
              {page.rows.flatMap((row, ri) => {
                let start = 0;
                return row.items.map((item, i) => {
                  const placed = { item, rowIndex: ri, start, firstInRow: i === 0 };
                  start += item.width;
                  return placed;
                });
              }).map(({ item, rowIndex, start, firstInRow }) => (
                <div
                  key={item.block.id}
                  data-block-id={item.block.id}
                  data-width={item.width}
                  className={!firstInRow && docSettings.showColumnDividers ? 'col-divider' : undefined}
                  style={{
                    gridRow: rowIndex + 1,
                    gridColumn: `${start + 1} / span ${item.width}`,
                    minWidth: 0,
                    position: 'relative',
                    // The rule is centred in the gutter, which is the COLUMN gap.
                    ['--col-gap' as string]: `${colGapPx}px`,
                  }}
                >
                  {renderBlock(item, blockOrder[item.block.id] ?? null)}
                </div>
              ))}
            </PageSheet>
          ))}
        </div>
        </div>
      </main>
      </div>

      {/* RIGHT — block settings, also full height with its own tab strip on top. */}
      <div className="no-print" style={{ display: 'flex', height: '100%', flex: '0 0 auto' }}>
        <Inspector />
      </div>

      </div>
    </div>
    {splitTarget && (
      <SplitPopover
        target={splitTarget}
        onSplit={(n) => splitBlock(splitTarget.blockId, n)}
        onClose={() => setSplitTarget(null)}
      />
    )}
    {visibleBlock && (
      <BlockControlsRail
        key={visibleBlock.id}
        anchorId={`block-${visibleBlock.id}`}
        locked={!!visibleBlock.locked}
        canSplit={splittableCount(visibleBlock) >= 2}
        splitActive={splitTarget?.blockId === visibleBlock.id}
        pageBreakBefore={!!visibleBlock.pageBreakBefore}
        canMoveUp={(blockPos[visibleBlock.id] ?? 0) > 0}
        canMoveDown={(blockPos[visibleBlock.id] ?? 0) < blocks.length - 1}
        handleProps={dnd.handleProps(visibleBlock.id)}
        onToggleLock={() => toggleBlockLock(visibleBlock.id)}
        onDuplicate={() => duplicateBlock(visibleBlock.id)}
        onSplit={(e) => openSplit(visibleBlock.id, e.currentTarget.getBoundingClientRect())}
        onTogglePageBreak={() => updateBlockSettings(visibleBlock.id, { pageBreakBefore: !visibleBlock.pageBreakBefore })}
        onMoveUp={() => moveBlockUp(visibleBlock.id)}
        onMoveDown={() => moveBlockDown(visibleBlock.id)}
        onDelete={() => removeBlock(visibleBlock.id)}
        onPointerEnter={() => setHoveredBlockId(visibleBlock.id)}
        onPointerLeave={() => setHoveredBlockId((id) => (id === visibleBlock.id ? null : id))}
      />
    )}
    {/* Screen-only strip explaining the three drop thirds, for the duration of a drag. */}
    {dnd.fromId !== null && <SheetDragHint />}
    {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} onStartTour={() => { setHelpOpen(false); setTourOpen(true); }} />}
    {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
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
