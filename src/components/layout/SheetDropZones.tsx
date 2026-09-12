import { ArrowLineUp, ArrowsDownUp } from '@phosphor-icons/react';
import type { DropZone } from '../../hooks/useSheetDnd';

// The two drop targets of a block during a sheet drag: the top half inserts the dragged
// block in front of this one, the bottom half swaps the two. Both halves are LABELLED —
// a drop that only says what it does through geometry is a drop teachers have to try.
//
// Screen-only chrome: `.no-print`, and `pointer-events: none` so the overlay never eats
// the dragover events the cell underneath needs to keep receiving.
export default function SheetDropZones({ zone, noop }: { zone: DropZone | null; noop: boolean }) {
    const on = (z: DropZone) => (zone === z && !noop ? ' is-on' : '');
    return (
        <div className="no-print sheet-dropzones" aria-hidden="true">
            <div className={`sheet-dropzone${on('before')}`}>
                <span className="sheet-dropzone-label"><ArrowLineUp size={13} weight="bold" />Hier invoegen</span>
            </div>
            <div className={`sheet-dropzone${on('swap')}`}>
                <span className="sheet-dropzone-label"><ArrowsDownUp size={13} weight="bold" />Wisselen</span>
            </div>
        </div>
    );
}
