import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useWorksheetStore } from '../store/useWorksheetStore';

// Drag a block straight on the sheet, instead of only through the Overzicht outline.
//
// POINTER EVENTS, never native HTML5 drag-and-drop: an extension that hooks `dragstart`
// (the "Claude in Chrome" extension does) froze the tab for the whole drag, and block
// dragging is core behaviour for teachers. Pointer events are also the only way to get
// touch, a ghost we control, and edge auto-scroll.
//
// The visible affordance is a HANDLE, but the whole block drags: grabbing a block by its
// exercises is what teachers try first. A press on the block only becomes a drag after
// DRAG_THRESHOLD_PX of movement, so a plain click still selects the block and the
// viewers' click-to-edit fields keep working; the handle starts dragging immediately.
//
// A drop does one of three things, chosen by which third of the target was hit:
//   top third    → 'before': the dragged block is inserted in front of the target
//   middle third → 'swap'  : the two blocks trade places
//   bottom third → 'after' : the dragged block is inserted right after the target
// Thirds rather than sides, and all three labelled on screen (SheetDropZones): a
// full-width block has no meaningful left/right, and geometry alone never explains
// what a drop does.
export type DropZone = 'before' | 'swap' | 'after';

export interface SheetDnd {
    /** Block currently being dragged, or null. */
    fromId: string | null;
    /** Block under the pointer, or null. */
    overId: string | null;
    zone: DropZone | null;
    /** True when dropping here would change nothing — the zone stays unhighlighted. */
    isNoop: (overId: string, zone: DropZone) => boolean;
    /** Spread on the drag handle: starts a drag on the first pointer move. */
    handleProps: (blockId: string) => { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void };
    /** Spread on `.print-block`: drags from anywhere that is not an input, a button or
        another control — but only past the movement threshold, so clicks survive. */
    blockProps: (blockId: string) => { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void };
}

// Below this much movement a press is a click, not a drag. 6px is the usual slop for a
// pointer that is meant to stand still (a trackpad tap drifts 1-3px).
const DRAG_THRESHOLD_PX = 6;
// Auto-scroll band at the top/bottom of `.print-scroll`, and px per frame inside it.
const EDGE_PX = 40;
const EDGE_SPEED_PX = 14;

// Anything that owns the press keeps it: text fields, the block controls, the viewers'
// own click-to-edit spans are all reached through these roles.
const INTERACTIVE = 'input, textarea, button, [contenteditable], a, select, [role="button"]';

// The thing that follows the pointer. Our own element rather than a browser drag image:
// it can carry the block's title, it never rasterises an A4-sized node (which is what
// froze the tab), and it exists in every browser.
function makeGhost(title: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = 'sheet-drag-ghost no-print';
    el.setAttribute('aria-hidden', 'true');
    const chip = document.createElement('span');
    chip.className = 'sheet-drag-ghost-chip';
    chip.textContent = 'Blok verplaatsen';
    el.appendChild(chip);
    if (title) {
        const label = document.createElement('span');
        label.className = 'sheet-drag-ghost-title';
        label.textContent = title;
        el.appendChild(label);
    }
    document.body.appendChild(el);
    return el;
}

interface DragState {
    id: string;
    pointerId: number;
    el: HTMLElement;
    startX: number; startY: number;
    x: number; y: number;
    /** 0 for the handle (drag at once), DRAG_THRESHOLD_PX for the block body. */
    threshold: number;
    active: boolean;
    moved: boolean;
    ghost: HTMLDivElement | null;
    scroller: HTMLElement | null;
    raf: number;
    overId: string | null;
    zone: DropZone | null;
    prevTouchAction: string;
}

export function useSheetDnd(): SheetDnd {
    const blocks = useWorksheetStore((s) => s.blocks);

    const [fromId, setFromId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [zone, setZone] = useState<DropZone | null>(null);

    const drag = useRef<DragState | null>(null);

    const indexOf = useCallback((id: string) => blocks.findIndex(b => b.id === id), [blocks]);

    const isNoop = useCallback((targetId: string, z: DropZone) => {
        if (!fromId || fromId === targetId) return true;
        const from = indexOf(fromId);
        const to = indexOf(targetId);
        if (from < 0 || to < 0) return true;
        // Inserting before the block that already follows me, or after the block that
        // already precedes me, leaves the order untouched.
        if (z === 'before') return to === from + 1;
        if (z === 'after') return to === from - 1;
        return false;
    }, [fromId, indexOf]);

    const onPointerDown = useCallback((blockId: string, fromHandle: boolean) => (e: ReactPointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;                      // left button / primary touch only
        if (drag.current) return;
        if (!fromHandle && (e.target as HTMLElement).closest(INTERACTIVE)) return;
        const el = (fromHandle
            ? (e.currentTarget.closest('.print-block') as HTMLElement | null)
            : e.currentTarget) ?? e.currentTarget;

        const state: DragState = {
            id: blockId, pointerId: e.pointerId, el,
            startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY,
            threshold: fromHandle ? 0 : DRAG_THRESHOLD_PX,
            active: false, moved: false, ghost: null,
            scroller: el.closest('.print-scroll') as HTMLElement | null,
            raf: 0, overId: null, zone: null,
            prevTouchAction: el.style.touchAction,
        };
        drag.current = state;

        // Where the pointer is, which cell is under it, and which half of it.
        const updateTarget = () => {
            const hit = document.elementFromPoint(state.x, state.y) as HTMLElement | null;
            const cell = hit?.closest('[data-block-id]') as HTMLElement | null;
            const id = cell?.dataset.blockId ?? null;
            let next: DropZone | null = null;
            if (cell && id) {
                // Pointer and rect are both in visual (sheet-zoomed) space, so the zoom
                // cancels out and no correction is needed. Thirds: top → before, middle →
                // swap, bottom → after.
                const rect = cell.getBoundingClientRect();
                const frac = (state.y - rect.top) / rect.height;
                next = frac < 1 / 3 ? 'before' : frac > 2 / 3 ? 'after' : 'swap';
            }
            if (id !== state.overId) { state.overId = id; setOverId(id); }
            if (next !== state.zone) { state.zone = next; setZone(next); }
        };

        // rAF loop: scrolls the sheet when the pointer sits near an edge, and re-reads the
        // target afterwards so the highlight keeps up while the page moves under a still
        // pointer. Only runs while a drag is active.
        const tick = () => {
            if (!drag.current || !state.active) return;
            const sc = state.scroller;
            if (sc) {
                const r = sc.getBoundingClientRect();
                let dy = 0;
                if (state.y < r.top + EDGE_PX) dy = -EDGE_SPEED_PX;
                else if (state.y > r.bottom - EDGE_PX) dy = EDGE_SPEED_PX;
                if (dy !== 0) {
                    const before = sc.scrollTop;
                    sc.scrollTop = before + dy;
                    if (sc.scrollTop !== before) updateTarget();
                }
            }
            state.raf = requestAnimationFrame(tick);
        };

        const begin = () => {
            state.active = true;
            setFromId(state.id);
            // A drag that starts mid-selection would otherwise paint a stray highlight.
            window.getSelection()?.removeAllRanges();
            try { el.setPointerCapture(state.pointerId); } catch { /* pointer already gone */ }
            el.style.touchAction = 'none';               // for the drag only: taps keep scrolling
            const title = (el.querySelector('.print-opdracht') as HTMLElement | null)?.innerText?.trim() ?? '';
            state.ghost = makeGhost(title.slice(0, 48));
            moveGhost();
            if (typeof requestAnimationFrame === 'function') state.raf = requestAnimationFrame(tick);
            updateTarget();
        };

        const moveGhost = () => {
            if (state.ghost) state.ghost.style.transform = `translate(${state.x + 14}px, ${state.y + 14}px)`;
        };

        const finish = (drop: boolean) => {
            if (drag.current !== state) return;
            drag.current = null;
            if (state.raf) cancelAnimationFrame(state.raf);
            state.ghost?.remove();
            state.el.style.touchAction = state.prevTouchAction;
            try { state.el.releasePointerCapture(state.pointerId); } catch { /* already released */ }
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey);
            const wasActive = state.active;
            const targetId = state.overId;
            const z = state.zone;
            setFromId(null); setOverId(null); setZone(null);
            if (wasActive) {
                // The pointerup that ended a drag must not also count as a click on
                // whatever block it landed on (that would change the selection).
                const suppress = (ev: Event) => ev.stopPropagation();
                window.addEventListener('click', suppress, true);
                setTimeout(() => window.removeEventListener('click', suppress, true), 0);
            }
            if (drop && wasActive && targetId && z) applyDrop(state.id, targetId, z);
        };

        const onMove = (ev: PointerEvent) => {
            if (ev.pointerId !== state.pointerId) return;
            state.x = ev.clientX; state.y = ev.clientY;
            if (!state.active) {
                if (Math.abs(ev.clientX - state.startX) < state.threshold
                    && Math.abs(ev.clientY - state.startY) < state.threshold) return;
                begin();
            }
            ev.preventDefault();
            moveGhost();
            updateTarget();
        };
        const onUp = (ev: PointerEvent) => { if (ev.pointerId === state.pointerId) finish(true); };
        const onCancel = (ev: PointerEvent) => { if (ev.pointerId === state.pointerId) finish(false); };
        const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') finish(false); };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey);
        // The handle drags at once, so there is nothing to wait for.
        if (state.threshold === 0) begin();
    }, []);

    const handleProps = useCallback((blockId: string) => ({
        onPointerDown: onPointerDown(blockId, true),
    }), [onPointerDown]);

    const blockProps = useCallback((blockId: string) => ({
        onPointerDown: onPointerDown(blockId, false),
    }), [onPointerDown]);

    return { fromId, overId, zone, isNoop, handleProps, blockProps };
}

// Read the order straight from the store rather than from a closure: a drag outlives
// several renders, and the block list may have changed under it.
function applyDrop(draggedId: string, targetId: string, z: DropZone) {
    const s = useWorksheetStore.getState();
    if (draggedId === targetId) return;
    const from = s.blocks.findIndex(b => b.id === draggedId);
    const to = s.blocks.findIndex(b => b.id === targetId);
    if (from < 0 || to < 0) return;
    if (z === 'swap') {
        s.swapBlocks(draggedId, targetId);
    } else if (z === 'before') {
        if (to === from + 1) return;                     // no-op: already in front of it
        // reorderBlocks splices the block OUT first, so every later index shifts down by
        // one — without this a downward drag lands after the target.
        s.reorderBlocks(from, to > from ? to - 1 : to);
    } else {
        if (to === from - 1) return;                      // no-op: already right after it
        // Mirror of 'before': inserting after the target means landing ON the target's
        // (post-splice) index when dragging up, or one past it when dragging down.
        s.reorderBlocks(from, from < to ? to : to + 1);
    }
    // The block can land on another page; select it and bring it into view so the teacher
    // does not lose track of what they just moved.
    s.setActiveSelection(draggedId);
    requestAnimationFrame(() => {
        document.getElementById(`block-${draggedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
}
