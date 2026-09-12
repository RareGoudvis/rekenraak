import { ArrowLineUp, ArrowsDownUp, ArrowLineDown } from '@phosphor-icons/react';
import type { DropZone } from '../../hooks/useSheetDnd';

// The three drop targets of a block during a sheet drag: the top third inserts the
// dragged block in front of this one, the middle third swaps the two, the bottom third
// inserts it right after this one. All three are LABELLED — a drop that only says what
// it does through geometry is a drop teachers have to try.
//
// Screen-only chrome: `.no-print`, and `pointer-events: none` so the overlay is invisible
// to `document.elementFromPoint()` — which is how useSheetDnd picks the cell under the
// pointer, and it would otherwise only ever find this overlay.
export default function SheetDropZones({ zone, noop }: { zone: DropZone | null; noop: boolean }) {
    const on = (z: DropZone) => (zone === z && !noop ? ' is-on' : '');
    return (
        <div className="no-print sheet-dropzones" aria-hidden="true">
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
