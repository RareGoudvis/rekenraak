import { useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
    ArrowUp, ArrowDown, Lock, LockOpen as Unlock, Copy,
    Trash as Trash2, ArrowElbowDownRight as CornerDownRight,
    DotsSixVertical, Scissors,
} from '@phosphor-icons/react';
import ModalPortal from '../ui/ModalPortal';
import IconButton from '../ui/IconButton';
import { styles } from '../../styles/appStyles';

// Compact: nine buttons at the full 34px control height ran taller than most blocks are —
// 26px boxes + 14px glyphs read as a slim rail instead of a second toolbar.
const ICON_SIZE = 14;
const BOX_SIZE = 26;
// Clear of the sheet's right-edge selection halo (see appStyles.blockContainer).
const GAP_PX = 12;

export interface BlockControlsRailProps {
    /** dom id of the `.print-block` this rail belongs to (`block-<id>`) — read fresh on
        every reposition rather than held as an element ref, so a remount of the block
        (rare, but the packer can move it to a different page) doesn't leave the rail
        pinned to a detached node. */
    anchorId: string;
    locked: boolean;
    canSplit: boolean;
    splitActive: boolean;
    pageBreakBefore: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    handleProps: { onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void };
    onToggleLock: () => void;
    onDuplicate: () => void;
    onSplit: (e: ReactMouseEvent<HTMLButtonElement>) => void;
    onTogglePageBreak: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
    /** The pointer entering the rail counts as still hovering the block it belongs to —
        the rail lives outside `.print-block` now (portalled to body), so without this the
        block's own onPointerLeave would fire the instant the pointer crosses the gap. */
    onPointerEnter: () => void;
    onPointerLeave: () => void;
}

// Rendered through a body portal so a block near the bottom of the page is never clipped
// by `.page-sheet-body`'s `overflow: hidden` (that clip is deliberate — it's what makes the
// screen preview match the printed page — so the rail has to live outside the clipped
// subtree rather than fight it). Position is `fixed`, read straight off the block's own
// rect: the sheet's zoom-to-fit (`.print-area-shell { zoom }`) already bakes into
// getBoundingClientRect, so the rail lines up at any zoom with no correction.
export default function BlockControlsRail(props: BlockControlsRailProps) {
    const { anchorId, handleProps, onPointerEnter, onPointerLeave } = props;
    const railRef = useRef<HTMLDivElement>(null);
    // Hidden until the first position write lands, so the rail never flashes at (0,0)
    // (its un-positioned spot inside <body>) for a frame before the effect runs.
    const [ready, setReady] = useState(false);

    useLayoutEffect(() => {
        const reposition = () => {
            const anchor = document.getElementById(anchorId);
            const rail = railRef.current;
            if (!anchor || !rail) return;
            const rect = anchor.getBoundingClientRect();
            rail.style.top = `${rect.top}px`;
            rail.style.left = `${rect.right + GAP_PX}px`;
            setReady(true);
        };
        reposition();
        const anchor = document.getElementById(anchorId);
        // Content changes (regenerate, style tweaks) can resize the block without the
        // window resizing or the sheet scrolling — a plain scroll/resize pair would miss it.
        const ro = new ResizeObserver(reposition);
        if (anchor) ro.observe(anchor);
        const scroller = anchor?.closest('.print-scroll') as HTMLElement | null;
        scroller?.addEventListener('scroll', reposition, { passive: true });
        window.addEventListener('resize', reposition);
        return () => {
            ro.disconnect();
            scroller?.removeEventListener('scroll', reposition);
            window.removeEventListener('resize', reposition);
        };
    }, [anchorId]);

    return (
        <ModalPortal>
            <div
                ref={railRef}
                className="no-print block-controls-rail"
                style={{ ...styles.blockControls, visibility: ready ? 'visible' : 'hidden' }}
                onClick={(e) => e.stopPropagation()}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
            >
                {/* Drag handle first: it is the control people reach for. A plain div (not
                    IconButton) so a press on it never reads as a button click; the drag
                    itself is pointer-event based (useSheetDnd). */}
                <div
                    className="ui-icon-btn sheet-drag-handle"
                    role="button"
                    tabIndex={-1}
                    aria-label="Versleep dit blok"
                    title="Versleep naar een ander blok — bovenaan invoegen, onderaan wisselen"
                    style={{ height: `${BOX_SIZE}px`, minWidth: `${BOX_SIZE}px` }}
                    {...handleProps}
                >
                    <DotsSixVertical size={ICON_SIZE} weight="bold" aria-hidden="true" />
                </div>
                <IconButton
                    icon={props.locked ? Lock : Unlock}
                    label={props.locked ? 'Ontgrendel (massa-regeneratie zal dit blok wel vernieuwen)' : 'Vergrendel (massa-regeneratie laat dit blok ongemoeid)'}
                    onClick={props.onToggleLock}
                    variant={props.locked ? 'active' : 'neutral'}
                    size={ICON_SIZE}
                    boxSize={BOX_SIZE}
                />
                <IconButton icon={Copy} label="Blok dupliceren" onClick={props.onDuplicate} size={ICON_SIZE} boxSize={BOX_SIZE} />
                {props.canSplit && (
                    <IconButton
                        icon={Scissors}
                        label="Blok splitsen"
                        onClick={props.onSplit}
                        variant={props.splitActive ? 'active' : 'neutral'}
                        size={ICON_SIZE}
                        boxSize={BOX_SIZE}
                    />
                )}
                <div style={styles.blockControlsDivider} />
                <IconButton
                    icon={CornerDownRight}
                    label={props.pageBreakBefore ? 'Begin niet op nieuwe pagina' : 'Begin op nieuwe pagina (bij afdrukken)'}
                    onClick={props.onTogglePageBreak}
                    variant={props.pageBreakBefore ? 'active' : 'neutral'}
                    size={ICON_SIZE}
                    boxSize={BOX_SIZE}
                />
                {props.canMoveUp && (
                    <IconButton icon={ArrowUp} label="Blok omhoog" onClick={props.onMoveUp} size={ICON_SIZE} boxSize={BOX_SIZE} />
                )}
                {props.canMoveDown && (
                    <IconButton icon={ArrowDown} label="Blok omlaag" onClick={props.onMoveDown} size={ICON_SIZE} boxSize={BOX_SIZE} />
                )}
                {/* Delete sits apart at the bottom, behind a divider, to avoid mis-clicks. */}
                <div style={styles.blockControlsDivider} />
                <IconButton icon={Trash2} label="Blok verwijderen" onClick={props.onDelete} variant="danger" size={ICON_SIZE} boxSize={BOX_SIZE} />
            </div>
        </ModalPortal>
    );
}
