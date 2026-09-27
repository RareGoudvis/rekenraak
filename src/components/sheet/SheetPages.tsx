import { useCallback } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import PageSheet from '../layout/PageSheet';
import { skylineSlot, type PackedPage } from '../../services/layout/pagePacker';
import { splittableCount } from '../../services/layout/splitBlock';
import { cellWidthPx } from '../viewer/BlockWidthContext';
import { WIDTH_FIT_FLOOR } from '../viewer/scaledBlockFit';
import type { MeasuredHeights } from '../../hooks/useMeasuredHeights';
import type { SheetDnd } from '../../hooks/useSheetDnd';
import SheetHeader, { SheetRepeatFields } from './SheetHeader';
import SheetFooter from './SheetFooter';
import EmptySheetHero from './EmptySheetHero';
import SheetBlock from './SheetBlock';

// The page stack: one PageSheet per packed page, every cell placed where the packer put it.
export default function SheetPages({ packedPages, blockOrder, measured, dnd, onOpenSplit }: {
  packedPages: PackedPage[];
  blockOrder: Record<string, number | null>;
  measured: MeasuredHeights;
  dnd: SheetDnd;
  onOpenSplit: (blockId: string, anchorRect: DOMRect, availableOverridePx?: number) => void;
}) {
  const blocks = useWorksheetStore((state) => state.blocks);
  const headerData = useWorksheetStore((state) => state.header);
  const footerData = useWorksheetStore((state) => state.footer);
  const docSettings = useWorksheetStore((state) => state.docSettings);
  const showSolutions = useWorksheetStore((state) => state.showSolutions);
  const activeSelectionId = useWorksheetStore((state) => state.activeBlockId);
  const setActiveSelection = useWorksheetStore((state) => state.setActiveSelection);
  const setInspectorTab = useWorksheetStore((state) => state.setInspectorTab);
  const setBladSection = useWorksheetStore((state) => state.setBladSection);
  const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

  // Clicking the header or footer ON the sheet opens its settings: select the document,
  // switch to Blad, and open the sub-tab for the part that was clicked.
  const openBladCard = useCallback((card: 'koptekst' | 'voettekst') => {
    setActiveSelection('document');
    setInspectorTab('blad');
    setBladSection(card);
  }, [setActiveSelection, setInspectorTab, setBladSection]);

  // These callbacks read the live block list instead of closing over `blocks`, so they
  // stay stable and the memoised SheetBlock is not re-rendered by every block edit.
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

  const totalScore = blocks.reduce((sum, block) => sum + (block.totalPoints || 0), 0);

  // A column rule needs air on both sides or the right-hand block's digits sit flush
  // against it. The COLUMN gap widens by 16px when the rule is on; the ROW gap keeps
  // blockSpacing, so the packer's vertical budget is untouched.
  const colGapPx = (docSettings.blockSpacing ?? 12) + (docSettings.showColumnDividers ? 16 : 0);
  const cellWidth = (units: number) => cellWidthPx(units, colGapPx);
  // Left edge of a cell that starts at column unit `x`: the width of the units before it
  // plus the one gap that separates them from it.
  const cellLeft = (x: number) => (x <= 0 ? 0 : cellWidth(x) + colGapPx);

  return (
    <>
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
            return (tailPx: number, anchorRect: DOMRect) => onOpenSplit(next.id, anchorRect, tailPx);
          })()}
          onFitBlock={fitBlockToPage}
          onSplitBlock={(blockId, anchor) => onOpenSplit(blockId, anchor)}
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
    </>
  );
}
