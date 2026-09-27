import { useMemo, type PointerEvent as ReactPointerEvent } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import BlockControlsRail from '../layout/BlockControlsRail';
import { splittableCount } from '../../services/layout/splitBlock';
import { useHoveredBlockId, setHoveredBlockId } from './hoveredBlock';

// The single rail mounted below the page stack (outside the packer's clipped body) —
// hover beats selection, and 'document' (nothing selected) shows no rail at all.
// Hover wins over selection (matches the old CSS :hover-over-:is-active rule) so moving
// off a selected block onto another one shows THAT block's controls, not two rails at once.
export default function SheetControlsRail({ splitBlockId, handleProps, onOpenSplit }: {
  splitBlockId: string | null;
  handleProps: (blockId: string) => { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void };
  onOpenSplit: (blockId: string, anchorRect: DOMRect) => void;
}) {
  const hoveredBlockId = useHoveredBlockId();
  const blocks = useWorksheetStore((state) => state.blocks);
  const activeSelectionId = useWorksheetStore((state) => state.activeBlockId);
  const removeBlock = useWorksheetStore((state) => state.removeBlock);
  const moveBlockUp = useWorksheetStore((state) => state.moveBlockUp);
  const moveBlockDown = useWorksheetStore((state) => state.moveBlockDown);
  const toggleBlockLock = useWorksheetStore((state) => state.toggleBlockLock);
  const duplicateBlock = useWorksheetStore((state) => state.duplicateBlock);
  const updateBlockSettings = useWorksheetStore((state) => state.updateBlockSettings);

  // id -> position in blocks[]. Distinct from blockOrder, which is the printed
  // opdracht number and deliberately skips layout-* furniture.
  const blockPos = useMemo(() => {
    const m: Record<string, number> = {};
    blocks.forEach((b, i) => { m[b.id] = i; });
    return m;
  }, [blocks]);

  const visibleBlockId = hoveredBlockId ?? (activeSelectionId && activeSelectionId !== 'document' ? activeSelectionId : null);
  const visibleBlock = visibleBlockId ? blocks.find((b) => b.id === visibleBlockId) : undefined;
  if (!visibleBlock) return null;

  return (
    <BlockControlsRail
      key={visibleBlock.id}
      anchorId={`block-${visibleBlock.id}`}
      locked={!!visibleBlock.locked}
      canSplit={splittableCount(visibleBlock) >= 2}
      splitActive={splitBlockId === visibleBlock.id}
      pageBreakBefore={!!visibleBlock.pageBreakBefore}
      canMoveUp={(blockPos[visibleBlock.id] ?? 0) > 0}
      canMoveDown={(blockPos[visibleBlock.id] ?? 0) < blocks.length - 1}
      handleProps={handleProps(visibleBlock.id)}
      onToggleLock={() => toggleBlockLock(visibleBlock.id)}
      onDuplicate={() => duplicateBlock(visibleBlock.id)}
      onSplit={(e) => onOpenSplit(visibleBlock.id, e.currentTarget.getBoundingClientRect())}
      onTogglePageBreak={() => updateBlockSettings(visibleBlock.id, { pageBreakBefore: !visibleBlock.pageBreakBefore })}
      onMoveUp={() => moveBlockUp(visibleBlock.id)}
      onMoveDown={() => moveBlockDown(visibleBlock.id)}
      onDelete={() => removeBlock(visibleBlock.id)}
      onPointerEnter={() => setHoveredBlockId(visibleBlock.id)}
      onPointerLeave={() => setHoveredBlockId((id) => (id === visibleBlock.id ? null : id))}
    />
  );
}
