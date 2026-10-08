import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useWorksheetStore } from './store/useWorksheetStore';
import Sidebar from './components/layout/sidebar';
import { PAGE_W_PX } from './components/layout/PageSheet';
import { packPages, pageIndexByBlock } from './services/layout/pagePacker';
import { minWidthUnits } from './services/layout/blockLayout';
import { numberBlocks } from './services/layout/blockNumbering';
import Inspector from './components/configurator/Inspector';
import TopBar from './components/layout/TopBar';
import { answerSpaceVar } from './components/viewer/BlockWidthContext';
import MijnBladenView from './components/library/MijnBladenView';
import BibliotheekView from './components/library/BibliotheekView';
import WhiteboardView from './board/components/WhiteboardView';
import HelpModal from './components/layout/HelpModal';
import ReleaseNotesModal from './components/layout/ReleaseNotesModal';
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
import SheetPages from './components/sheet/SheetPages';
import SheetControlsRail from './components/sheet/SheetControlsRail';
import SheetBanners from './components/sheet/SheetBanners';
import { useSheetZoom } from './hooks/useSheetZoom';
import { useBootLoad } from './hooks/useBootLoad';
import { useOnboarding } from './hooks/useOnboarding';
import { isBordPage } from './bootEntry';

export default function App() {
  const a4Ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetZoom = useSheetZoom(scrollRef);
  // Pending continuation of a first print: the modal's "naar afdrukken" button calls it.
  const [printHint, setPrintHint] = useState<(() => void) | null>(null);
  const { handlePrint } = usePrint((proceed) => setPrintHint(() => proceed));

  const blocks = useWorksheetStore((state) => state.blocks);
  const headerData = useWorksheetStore((state) => state.header);
  const docSettings = useWorksheetStore((state) => state.docSettings);
  const view = useWorksheetStore((state) => state.view);
  const setBlockPages = useWorksheetStore((state) => state.setBlockPages);
  // Harness escape hatch: measure a type at a width its tier forbids (scripts/width-matrix.mjs).
  const debugIgnoreMinWidth = useWorksheetStore((state) => state.debugIgnoreMinWidth);

  const setActiveSelection = useWorksheetStore((state) => state.setActiveSelection);
  const onboarding = useOnboarding();
  const { releaseBannerVisible, dismissReleaseBanner } = useBootLoad();

  // Browser tab title follows the worksheet title.
  useEffect(() => {
    // bord.html keeps its own tab title (the board, not a worksheet, is what is open there).
    if (isBordPage()) return;
    const t = headerData?.titel?.trim();
    document.title = t ? `${t} — Rekenraak` : 'Rekenraak';
  }, [headerData?.titel]);

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
    // Reads the live block list instead of closing over `blocks`, so it stays stable.
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
          narrow window shrinks the sheet instead (see useSheetZoom). */}
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

        <SheetBanners releaseVisible={releaseBannerVisible} onDismissRelease={dismissReleaseBanner} onOpenReleaseNotes={onboarding.openReleaseNotes} />

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

          <SheetPages packedPages={packedPages} blockOrder={blockOrder} measured={measured} dnd={dnd} onOpenSplit={openSplit} />
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
    {onboarding.helpOpen && <HelpModal onClose={onboarding.closeHelp} onStartTour={onboarding.startTourFromHelp} onShowVideo={onboarding.showVideoFromHelp} onShowReleaseNotes={onboarding.showReleaseNotesFromHelp} />}
    {onboarding.releaseNotesOpen && <ReleaseNotesModal onClose={onboarding.closeReleaseNotes} />}
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
    {/* Bordmodus — the whiteboard app; ALL its code lives under src/board/. */}
    {view === 'whiteboard' && <WhiteboardView />}
    </>
  );
}

