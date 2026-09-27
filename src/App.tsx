import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWorksheetStore } from './store/useWorksheetStore';
import Sidebar from './components/layout/sidebar';
import PageSheet, { PAGE_W_PX } from './components/layout/PageSheet';
import { packPages, pageIndexByBlock, skylineSlot } from './services/layout/pagePacker';
import { minWidthUnits } from './services/layout/blockLayout';
import { numberBlocks } from './services/layout/blockNumbering';
import Inspector from './components/configurator/Inspector';
import TopBar from './components/layout/TopBar';
import { cellWidthPx, answerSpaceVar } from './components/viewer/BlockWidthContext';
import { WIDTH_FIT_FLOOR } from './components/viewer/scaledBlockFit';
import MijnBladenView from './components/library/MijnBladenView';
import BibliotheekView from './components/library/BibliotheekView';
import HelpModal from './components/layout/HelpModal';
import PrintHintModal from './components/layout/PrintHintModal';
import TourOverlay from './components/onboarding/TourOverlay';
import WelcomeModal from './components/onboarding/WelcomeModal';
import { usePrint } from './hooks/usePrint';
import { useMeasuredHeights } from './hooks/useMeasuredHeights';
import { useSheetDnd } from './hooks/useSheetDnd';
import { SheetDragHint } from './components/layout/SheetDropZones';
import { styles } from './styles/appStyles';
import { splittableCount, fittingSplitIndex } from './services/layout/splitBlock';
import SplitPopover, { POPOVER_W, type SplitTarget } from './components/sheet/SplitPopover';
import SheetHeader, { SheetRepeatFields } from './components/sheet/SheetHeader';
import SheetFooter from './components/sheet/SheetFooter';
import EmptySheetHero from './components/sheet/EmptySheetHero';
import SheetBlock from './components/sheet/SheetBlock';
import SheetControlsRail from './components/sheet/SheetControlsRail';
import SheetBanners from './components/sheet/SheetBanners';
import { useSheetZoom } from './hooks/useSheetZoom';
import { useBootLoad } from './hooks/useBootLoad';
import { useOnboarding } from './hooks/useOnboarding';

export default function App() {
  const a4Ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetZoom = useSheetZoom(scrollRef);
  // Pending continuation of a first print: the modal's "naar afdrukken" button calls it.
  const [printHint, setPrintHint] = useState<(() => void) | null>(null);
  const { handlePrint } = usePrint((proceed) => setPrintHint(() => proceed));

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
  const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

  const onboarding = useOnboarding();
  const { releaseBannerVisible, dismissReleaseBanner } = useBootLoad();

  // Browser tab title follows the worksheet title.
  useEffect(() => {
    const t = headerData?.titel?.trim();
    document.title = t ? `${t} — Rekenraak` : 'Rekenraak';
  }, [headerData?.titel]);

  const totalScore = blocks.reduce((sum, block) => sum + (block.totalPoints || 0), 0);

  // A column rule needs air on both sides or the right-hand block's digits sit flush
  // against it. The COLUMN gap widens by 16px when the rule is on; the ROW gap keeps
  // blockSpacing, so the packer's vertical budget is untouched.
  const colGapPx = (docSettings.blockSpacing ?? 12) + (docSettings.showColumnDividers ? 16 : 0);
  const cellWidth = (units: number) => cellWidthPx(units, colGapPx);
  // Left edge of a cell that starts at column unit `x`: the width of the units before it
  // plus the one gap that separates them from it.
  const cellLeft = (x: number) => (x <= 0 ? 0 : cellWidth(x) + colGapPx);

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

  // Open the split popover for a block. `availableOverridePx` is the space the block has
  // to fit into; the page-tail hint passes the tail of the PREVIOUS page, because the
  // block it offers to split already sits at the top of the next one.
  const openSplit = useCallback((blockId: string, anchorRect: DOMRect, availableOverridePx?: number) => {
    // These callbacks read the live block list instead of closing over `blocks`, so they
    // stay stable and the memoised SheetBlock is not re-rendered by every block edit.
    const block = useWorksheetStore.getState().blocks.find(b => b.id === blockId);
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
  }, []);
  // The oversize banner's "Verklein dit blok": turn the switch on AND take the teacher to
  // it, so the sheet's fix and the Inspector's switch are visibly the same setting.
  // setActiveSelection resets the tab to 'oefening', so the tab is set after it.
  const fitBlockToPage = useCallback((blockId: string) => {
    const block = useWorksheetStore.getState().blocks.find(b => b.id === blockId);
    if (!block) return;
    updateBlockSettings(blockId, { constraints: { ...block.constraints, fitToPage: true } });
    setActiveSelection(blockId);
    setInspectorTab('weergave');
  }, [updateBlockSettings, setActiveSelection, setInspectorTab]);

  // The horizontal twin of fitBlockToPage: a cell whose content is wider than its column
  // ("Verklein om te passen") gets the same fix as the width picker's own switch.
  const fitBlockToWidth = useCallback((blockId: string) => {
    const block = useWorksheetStore.getState().blocks.find(b => b.id === blockId);
    if (!block) return;
    updateBlockSettings(blockId, { constraints: { ...block.constraints, fitToWidth: true } });
    setActiveSelection(blockId);
    setInspectorTab('weergave');
  }, [updateBlockSettings, setActiveSelection, setInspectorTab]);

  // "Verbreed": one width tier up (1 -> 2 -> 4), offered only below the widest tier.
  const widenBlock = useCallback((blockId: string) => {
    const block = useWorksheetStore.getState().blocks.find(b => b.id === blockId);
    if (!block) return;
    const current = (block.widthUnits ?? 4) as 1 | 2 | 4;
    updateBlockSettings(blockId, { widthUnits: current === 1 ? 2 : 4 });
  }, [updateBlockSettings]);

  const packedPages = useMemo(
    () => packPages(blocks, {
      mode: docSettings.packMode ?? 'aansluitend',
      blockSpacingPx: docSettings.blockSpacing ?? 12,
      heightPxOf: measured.heightPxOf,
      pageBudgetPx: measured.pageBudgetPx,
      // The width clamp is measured too: a block only needs a wider column when its
      // CONTENT does, not because its type once did at default settings.
      minWidthOf: (b) => minWidthUnits(b, measured.intrinsicEntries(b.id)),
      answerSpacePx: docSettings.answerSpace,
      ignoreMinWidth: debugIgnoreMinWidth,
    }),
    [blocks, docSettings.packMode, docSettings.blockSpacing, docSettings.answerSpace, measured, debugIgnoreMinWidth],
  );
  // Opdracht numbering runs across pages and counts exercise blocks only, so inserting a
  // separator never renumbers the exercises after it.
  const blockOrder = useMemo(() => numberBlocks(blocks), [blocks]);

  // Per-block page index for the Overzicht markers. It used to be MEASURED from the DOM
  // against a fixed 1044px page height; now it is simply what the packer decided, so the
  // markers agree with the pages on screen instead of approximating them.
  useEffect(() => {
    setBlockPages(pageIndexByBlock(packedPages));
  }, [packedPages, setBlockPages]);

  return (
    <>
    <div className="mobile-block">
      <video className="mobile-block-demo" src="/rekenraak-demo.mp4" autoPlay loop muted playsInline />
      <span className="mobile-block-title">RekenRaak werkt op een groot scherm</span>
      <span>Hiermee maak je werkbladen op A4-formaat — daarvoor staan het blad én alle instellingen naast elkaar. Open de tool op een computer, laptop of tablet om aan de slag te gaan.</span>
      <span className="mobile-block-hint">Tip: draai je tablet in liggende stand (landscape).</span>
      {/* A phone must not be a dead end: the static pages read fine on any screen. */}
      <nav className="mobile-block-links" aria-label="Meer over RekenRaak">
        <a href="/about.html">Over RekenRaak</a>
        <a href="/faq.html">Veelgestelde vragen</a>
        <a href="/oefeningen.html">Alle oefeningen</a>
      </nav>
    </div>
    {onboarding.welcomeOpen && <WelcomeModal onClose={onboarding.closeWelcome} onStartTour={onboarding.startTourFromWelcome} />}
    {onboarding.tourOpen && <TourOverlay onClose={onboarding.closeTour} />}
    <div className="print-root" style={styles.appShell}>
      <div className="print-body-row" style={styles.appBody}>
      {/* LEFT — the exercise palette, running the FULL height of the window. Its own tab
          strip sits at the top, level with the top bar, so the three columns read as three
          columns rather than as one bar with things under it. Panels no longer collapse to
          a hover flyout: teachers on 14" laptops got stuck in it even with the pin, so a
          narrow window shrinks the sheet instead (see sheetZoom above). */}
      <div className="no-print" style={{ display: 'flex', height: '100%', flex: '0 0 auto' }}>
        <Sidebar />
      </div>

      {/* CENTRE — the top bar belongs to the SHEET, so it spans only this column. */}
      <div style={styles.centreColumn}>
      <div className="no-print" onClick={(e) => e.stopPropagation()}>
        <TopBar onPrint={handlePrint} onOpenHelp={onboarding.openHelp} />
      </div>
      <main className="print-main" style={styles.mainContent} onClick={() => setActiveSelection('document')}>

        {/* Scroll container holds the banners + sheet (the topbar is now a sibling above).
            Padding ≥ the sheet's shadow reach (--shadow-3 = 48px blur): overflowY:auto forces
            overflow-x to compute as auto too, so without this the side/bottom shadow is clipped.
            The TOP is 28px rather than 8px because .page-sheet-tag hangs 20px above the first
            page (plus its ~13px line box) and was clipped to a row of descenders at scroll top.
            The tag is absolutely positioned, so this changes nothing the packer measures. */}
        <div ref={scrollRef} className="print-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 48px 48px' }}>

        <SheetBanners releaseVisible={releaseBannerVisible} onDismissRelease={dismissReleaseBanner} onOpenHelp={onboarding.openHelp} />

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
            // Writing space, expressed against --sheet-size-math so it follows the Cijfers
            // slider like every other sheet size. At the 18px default this is byte-identical
            // to the token's own value in theme.css.
            ...(docSettings.answerSpace != null ? { ['--sheet-answer-h' as string]: answerSpaceVar(docSettings.answerSpace) } : {}),
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
              tailPx={(() => {
                // The blank tail is not "how far down the ink goes" any more: with a
                // skyline the next block drops into the LOWEST gap wide enough for it, so
                // the room it has is measured at its own width.
                const next = packedPages[pi + 1]?.blocks[0];
                if (!next) return undefined;
                return Math.max(0, page.budgetPx - skylineSlot(page.fill, next.width, docSettings.blockSpacing ?? 12).y);
              })()}
              onSplitNext={(() => {
                // Only offer the split when there IS a next page whose first block can be
                // cut — otherwise the blank tail is simply the end of the worksheet.
                const next = packedPages[pi + 1]?.blocks[0]?.block;
                if (!next || splittableCount(next) < 2) return undefined;
                return (tailPx: number, anchorRect: DOMRect) => openSplit(next.id, anchorRect, tailPx);
              })()}
              onFitBlock={fitBlockToPage}
              onSplitBlock={(blockId, anchor) => openSplit(blockId, anchor)}
              header={pi === 0
                ? <SheetHeader header={headerData} docSettings={docSettings} totalScore={totalScore} />
                : (headerData?.repeatHeader ? <SheetRepeatFields header={headerData} /> : null)}
              footer={<SheetFooter footer={footerData} docSettings={docSettings} pageIndex={pi} pageCount={packedPages.length} />}
            >
              {blocks.length === 0 && pi === 0 && (
                <EmptySheetHero />
              )}
              {/* Place every cell EXACTLY where the packer put it: left/top in px, width
                  from its column units, height its own. Nothing flows, so the browser can
                  never move a block away from the position the pagination was costed
                  against — and the page on screen is the page on paper.
                  Only a block that does not start at the left edge has a neighbour beside
                  it, so the column rule is a no-op on a single-column sheet instead of
                  drawing a stray line down the page. */}
              {page.blocks.map((item) => {
                // Horizontal twin of the page's own overflow banner: a page that runs long
                // outlines itself and says by how much, but a cell wider than its column
                // clipped in silence (print hides the overflow, so nobody saw it until
                // paper). Only fire once the packer could not promote the block any
                // further — a block that still has a wider tier to grow into is the
                // packer's job, not the teacher's.
                const iw = measured.intrinsicOf(item.block.id);
                const cellPx = cellWidth(item.width);
                // fitToWidth judges against the shrunk-to floor, same as minWidthUnits: the raw
                // intrinsic map deliberately holds the size the teacher ASKED for (see
                // useMeasuredHeights), so the banner must apply the same floor itself or it
                // would keep firing right after "Verklein om te passen" fixed the cell.
                const fitsPx = iw && item.block.constraints?.fitToWidth ? iw.px * WIDTH_FIT_FLOOR : iw?.px;
                const overPx = iw && iw.atWidth === item.width && fitsPx !== undefined ? Math.round(fitsPx - cellPx) : 0;
                const hOverflow = overPx > 2 && (item.width === 4 || item.promoted);
                // Only the block under the pointer shows a live zone during a drag.
                const dropZone = dnd.overId === item.block.id ? dnd.zone : null;
                return (
                  <SheetBlock
                    key={item.block.id}
                    block={item.block}
                    index={blockOrder[item.block.id] ?? null}
                    leftPx={cellLeft(item.x)}
                    topPx={item.y}
                    cellWidthPx={cellWidth(item.w)}
                    widthUnits={item.width}
                    availableWidthPx={cellPx}
                    colGapPx={colGapPx}
                    columnDivider={item.x > 0 && !!docSettings.showColumnDividers}
                    hOverflowPx={hOverflow ? overPx : 0}
                    isActive={item.block.id === activeSelectionId}
                    isDragging={dnd.fromId === item.block.id}
                    showDropZones={dnd.fromId !== null && dnd.fromId !== item.block.id}
                    dropZone={dropZone}
                    dropNoop={dropZone !== null && dnd.isNoop(item.block.id, dropZone)}
                    showSolutions={showSolutions}
                    docSettings={docSettings}
                    blockProps={dnd.blockProps}
                    onFitWidth={fitBlockToWidth}
                    onWiden={widenBlock}
                  />
                );
              })}
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
    <SheetControlsRail splitBlockId={splitTarget?.blockId ?? null} handleProps={dnd.handleProps} onOpenSplit={openSplit} />
    {/* Screen-only strip explaining the three drop thirds, for the duration of a drag. */}
    {dnd.fromId !== null && <SheetDragHint />}
    {printHint && <PrintHintModal onClose={() => setPrintHint(null)} onContinue={() => { const go = printHint; setPrintHint(null); go(); }} />}
    {onboarding.helpOpen && <HelpModal onClose={onboarding.closeHelp} onStartTour={onboarding.startTourFromHelp} onShowVideo={onboarding.showVideoFromHelp} />}
    {onboarding.helpVideoOpen && (
      <WelcomeModal
        mode="video"
        onClose={onboarding.closeHelpVideo}
        onStartTour={onboarding.startTourFromVideo}
      />
    )}
    {/* Full-screen library overlays — editor stays mounted underneath (preserves scroll). */}
    {view === 'mijn-bladen' && <MijnBladenView />}
    {view === 'bibliotheek' && <BibliotheekView />}
    </>
  );
}

