import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { useWorksheetStore } from '../store/useWorksheetStore';

// Drag a block straight on the sheet, instead of only through the Overzicht outline.
//
// Native HTML5 drag-and-drop, no dependency. The drag starts on a HANDLE rather than on
// the block: the block itself carries the inline instruction editor and viewers with
// their own click-to-edit fields, and a draggable ancestor swallows those interactions.
//
// A drop does one of two things, chosen by which half of the target was hit:
//   top    → 'before': the dragged block is inserted in front of the target
//   bottom → 'swap'  : the two blocks trade places
// Halves rather than sides, and both labelled on screen (SheetDropZones): a full-width
// block has no meaningful left/right, and geometry alone never explains what a drop does.
export type DropZone = 'before' | 'swap';

export interface SheetDnd {
    /** Block currently being dragged, or null. */
    fromId: string | null;
    /** Block under the pointer, or null. */
    overId: string | null;
    zone: DropZone | null;
    /** True when dropping here would change nothing — the zone stays unhighlighted. */
    isNoop: (overId: string, zone: DropZone) => boolean;
    handleProps: (blockId: string) => {
        draggable: true;
        onDragStart: (e: DragEvent<HTMLElement>) => void;
        onDragEnd: () => void;
    };
    cellProps: (blockId: string) => {
        onDragOver: (e: DragEvent<HTMLElement>) => void;
        onDragLeave: (e: DragEvent<HTMLElement>) => void;
        onDrop: (e: DragEvent<HTMLElement>) => void;
    };
}

export function useSheetDnd(): SheetDnd {
    const blocks = useWorksheetStore((s) => s.blocks);
    const reorderBlocks = useWorksheetStore((s) => s.reorderBlocks);
    const swapBlocks = useWorksheetStore((s) => s.swapBlocks);
    const setActiveSelection = useWorksheetStore((s) => s.setActiveSelection);

    const [fromId, setFromId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [zone, setZone] = useState<DropZone | null>(null);
    // The state drives the highlight; the ref is what the handlers read. dragstart and the
    // first dragover can land in the same task (they do under synthetic events), and the
    // handler would then still close over a null fromId and ignore the drop target.
    const fromRef = useRef<string | null>(null);

    const clear = useCallback(() => {
        fromRef.current = null;
        setFromId(null); setOverId(null); setZone(null);
    }, []);

    // Escape cancels. Chrome does fire dragend for it, but a drag that ends outside the
    // window (or a synthetic one from a test) can leave the highlight behind.
    useEffect(() => {
        if (!fromId) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') clear(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [fromId, clear]);

    const indexOf = useCallback((id: string) => blocks.findIndex(b => b.id === id), [blocks]);

    const isNoop = useCallback((targetId: string, z: DropZone) => {
        if (!fromId || fromId === targetId) return true;
        const from = indexOf(fromId);
        const to = indexOf(targetId);
        if (from < 0 || to < 0) return true;
        // Inserting before the block that already follows me leaves the order untouched.
        return z === 'before' && to === from + 1;
    }, [fromId, indexOf]);

    const handleProps = useCallback((blockId: string) => ({
        draggable: true as const,
        onDragStart: (e: DragEvent<HTMLElement>) => {
            // Firefox refuses to start a drag without payload on the dataTransfer.
            e.dataTransfer.setData('text/plain', blockId);
            e.dataTransfer.effectAllowed = 'move';
            // Drag the BLOCK, not the little handle chip, so the ghost shows what moves.
            const el = document.getElementById(`block-${blockId}`);
            if (el) e.dataTransfer.setDragImage(el, 24, 24);
            fromRef.current = blockId;
            setFromId(blockId);
        },
        onDragEnd: clear,
    }), [clear]);

    const cellProps = useCallback((blockId: string) => ({
        onDragOver: (e: DragEvent<HTMLElement>) => {
            if (!fromRef.current) return;
            e.preventDefault();                       // without this the drop never fires
            e.dataTransfer.dropEffect = 'move';
            // Both the pointer and the rect are in the same (sheet-zoomed) space, so the
            // zoom cancels out and no correction is needed.
            const rect = e.currentTarget.getBoundingClientRect();
            const next: DropZone = e.clientY < rect.top + rect.height / 2 ? 'before' : 'swap';
            setOverId(blockId);
            setZone(next);
        },
        onDragLeave: (e: DragEvent<HTMLElement>) => {
            // Moving over a child fires dragleave on the cell; only a real exit counts.
            if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
            setOverId(prev => (prev === blockId ? null : prev));
        },
        onDrop: (e: DragEvent<HTMLElement>) => {
            e.preventDefault();
            const dragged = fromRef.current ?? e.dataTransfer.getData('text/plain');
            // Read the half off the drop event itself rather than off the hover state: the
            // state is a render behind, and the geometry is right here.
            const rect = e.currentTarget.getBoundingClientRect();
            const z: DropZone = e.clientY < rect.top + rect.height / 2 ? 'before' : 'swap';
            clear();
            if (!dragged || dragged === blockId) return;
            const from = blocks.findIndex(b => b.id === dragged);
            const to = blocks.findIndex(b => b.id === blockId);
            if (from < 0 || to < 0) return;
            if (z === 'swap') {
                swapBlocks(dragged, blockId);
            } else {
                // reorderBlocks splices the block OUT first, so every later index shifts
                // down by one — without this a downward drag lands after the target.
                if (to === from + 1) return;          // no-op: already in front of it
                reorderBlocks(from, to > from ? to - 1 : to);
            }
            // The block can land on another page; select it and bring it into view so the
            // teacher does not lose track of what they just moved.
            setActiveSelection(dragged);
            requestAnimationFrame(() => {
                document.getElementById(`block-${dragged}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        },
    }), [blocks, clear, reorderBlocks, swapBlocks, setActiveSelection]);

    return { fromId, overId, zone, isNoop, handleProps, cellProps };
}
