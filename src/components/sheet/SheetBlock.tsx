import { memo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Lock } from '@phosphor-icons/react';
import { useWorksheetStore, type DocSettings } from '../../store/useWorksheetStore';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { REGISTRY } from '../../config/exerciseRegistry';
import { ScaledBlock } from '../viewer/ScaledBlock';
import { BlockErrorBoundary } from '../viewer/BlockErrorBoundary';
import SheetDropZones from '../layout/SheetDropZones';
import type { DropZone } from '../../hooks/useSheetDnd';
import { styles } from '../../styles/appStyles';
import { overlayRegionStyle } from '../../services/regionStyle';
import type { MathBlock } from '../../services/math/types';
import { setHoveredBlockId } from './hoveredBlock';

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

export interface SheetBlockProps {
  block: MathBlock;
  /** Printed opdracht number; counts across the whole worksheet, null for furniture. */
  index: number | null;
  /** Where the packer put the cell, in layout px. */
  leftPx: number;
  topPx: number;
  cellWidthPx: number;
  /** Width of the cell's column span (`item.width`), the viewer's available width. */
  widthUnits: number;
  availableWidthPx: number;
  colGapPx: number;
  columnDivider: boolean;
  /** How far the content overflows its column; 0 when the banner should not show. */
  hOverflowPx: number;
  isActive: boolean;
  isDragging: boolean;
  /** Drop targets are drawn on every block except the dragged one, for the whole drag. */
  showDropZones: boolean;
  dropZone: DropZone | null;
  dropNoop: boolean;
  showSolutions: boolean;
  docSettings: DocSettings;
  blockProps: (blockId: string) => { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void };
  onFitWidth: (blockId: string) => void;
  onWiden: (blockId: string) => void;
}

// One packed cell on a page. Memoised with primitive props only, so hovering or selecting
// ANOTHER block does not re-render this block's viewer.
function SheetBlock({
  block, index, leftPx, topPx, cellWidthPx, widthUnits, availableWidthPx, colGapPx, columnDivider,
  hOverflowPx, isActive, isDragging, showDropZones, dropZone, dropNoop, showSolutions, docSettings,
  blockProps, onFitWidth, onWiden,
}: SheetBlockProps) {
  const setActiveSelection = useWorksheetStore((state) => state.setActiveSelection);
  // Sheet furniture (a rule, writing lines, a grid) is not an opdracht: it gets no
  // title row and takes no number, so the opdracht numbering skips over it.
  const isFurniture = block.typeId.startsWith('layout-');
  // dividers between blocks come from the page grid gap now
  const isNotLastBlock = false;

  return (
    <div
      data-block-id={block.id}
      data-width={widthUnits}
      className={columnDivider ? 'col-divider' : undefined}
      style={{
        position: 'absolute',
        left: `${leftPx}px`,
        top: `${topPx}px`,
        width: `${cellWidthPx}px`,
        minWidth: 0,
        // The rule is centred in the gutter, which is the COLUMN gap.
        ['--col-gap' as string]: `${colGapPx}px`,
      }}
    >
      <div
        id={`block-${block.id}`}
        className={`print-block${block.pageBreakBefore ? ' page-break-before' : ''}${isActive ? ' is-active' : ''}${isDragging ? ' is-dragging' : ''}`}
        onClick={(e) => { e.stopPropagation(); setActiveSelection(block.id); }}
        // Controls used to live inside this div and reveal on CSS :hover; they're
        // portalled out now (BlockControlsRail, rendered once for whichever block is
        // hovered or active) so a block at the bottom of the page can't have its buttons
        // clipped by .page-sheet-body's overflow:hidden.
        onPointerEnter={() => setHoveredBlockId(block.id)}
        onPointerLeave={() => setHoveredBlockId((id) => (id === block.id ? null : id))}
        {...blockProps(block.id)}
        style={styles.blockContainer(isActive, isNotLastBlock, docSettings.showDividers)}
      >
        {/* Only while something is being dragged, and never on the block that
            is being dragged itself. */}
        {showDropZones && (
          <SheetDropZones zone={dropZone} noop={dropNoop} />
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
          availableWidthPx={availableWidthPx}
          fitToPage={block.constraints?.fitToPage === true}
          fitToWidth={block.constraints?.fitToWidth === true}
          answerSpacePx={block.constraints?.answerSpace}
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
      {hOverflowPx > 0 && (
        <div className="no-print cell-hoverflow-warn" onClick={(e) => e.stopPropagation()}>
          <span>Dit blok is {hOverflowPx}px te breed voor zijn kolom.</span>
          <button type="button" onClick={() => onFitWidth(block.id)}>Verklein om te passen</button>
          {widthUnits < 4 && (
            <button type="button" onClick={() => onWiden(block.id)}>Verbreed</button>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(SheetBlock);
