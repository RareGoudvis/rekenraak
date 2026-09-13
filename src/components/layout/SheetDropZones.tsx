import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLineUp, ArrowsDownUp, ArrowLineDown } from '@phosphor-icons/react';
import type { DropZone } from '../../hooks/useSheetDnd';

// The three drop targets of a block during a sheet drag: the top third inserts the
// dragged block in front of this one, the middle third swaps the two, the bottom third
// inserts it right after this one. All three are LABELLED — a drop that only says what
// it does through geometry is a drop teachers have to try.
//
// Every candidate carries a visible accent frame and tinted bands for the whole drag, not
// only the block under the pointer: teachers reported not knowing where a block could be
// dropped at all. The block under the pointer then dims its other two thirds so the one
// that will fire still reads as the answer.
//
// Screen-only chrome: `.no-print`, and `pointer-events: none` so the overlay is invisible
// to `document.elementFromPoint()` — which is how useSheetDnd picks the cell under the
// pointer, and it would otherwise only ever find this overlay.
export default function SheetDropZones({ zone, noop }: { zone: DropZone | null; noop: boolean }) {
    const active = zone !== null && !noop;
    const on = (z: DropZone) => (active && zone === z ? ' is-on' : '');
    return (
        <div className={`no-print sheet-dropzones${active ? ' has-on' : ''}`} aria-hidden="true">
            <div className={`sheet-dropzone${on('before')}`}>
                <span className="sheet-dropzone-label"><ArrowLineUp size={13} weight="bold" /><span className="sheet-dropzone-label-text">Hierboven invoegen</span></span>
            </div>
            <div className={`sheet-dropzone${on('swap')}`}>
                <span className="sheet-dropzone-label"><ArrowsDownUp size={13} weight="bold" /><span className="sheet-dropzone-label-text">Wisselen</span></span>
            </div>
            <div className={`sheet-dropzone${on('after')}`}>
                <span className="sheet-dropzone-label"><ArrowLineDown size={13} weight="bold" /><span className="sheet-dropzone-label-text">Hieronder invoegen</span></span>
            </div>
        </div>
    );
}

// One strip above the sheet for the duration of a drag, spelling out what the three thirds
// of a block do. Mounted by App while `dnd.fromId !== null`.
export function SheetDragHint() {
    // Fixed and portalled, not a child of `.print-scroll`: a strip inserted into the flow
    // mid-drag would push the sheet out from under the pointer. The top is read from the
    // scroller instead of hardcoded because the top bar's height varies with its
    // label-shedding stage.
    // Read once at first render: the strip only mounts mid-drag, when the scroller is
    // long laid out, and the top bar cannot change height while a drag is running.
    const [top] = useState(() => (document.querySelector('.print-scroll')?.getBoundingClientRect().top ?? 0) + 8);
    return createPortal(
        <div className="no-print sheet-drag-hint" style={{ top }} aria-hidden="true">
            Laat los op een blok · bovenaan = ervoor · midden = wisselen · onderaan = erna
        </div>,
        document.body,
    );
}
