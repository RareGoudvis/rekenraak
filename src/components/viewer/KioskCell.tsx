import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { cellProps, useViewerInteraction } from './ViewerInteractionContext';

interface Props {
    cellKey: string;
    children?: ReactNode;
    style?: CSSProperties;
    // Kiosk look of this cell (kiosk.css), e.g. 'is-grid' for a cijfer ruitje, 'is-scratch' for a carry.
    variant?: string;
}

/** A fill-cells blank: the kiosk draws an input bound to `cells[cellKey]`, the sheet keeps `children` (its own blank) untouched. */
export default function KioskCell({ cellKey, children, style, variant }: Props) {
    const ctx = useViewerInteraction();
    const ref = useRef<HTMLInputElement>(null);
    const active = !!ctx && ctx.kind === 'fill-cells' && ctx.activeCell === cellKey;
    // The keypad or Enter moved on to this cell: take the focus so a physical keyboard follows.
    useEffect(() => {
        if (!active || !ref.current) return;
        if (document.activeElement !== ref.current) ref.current.focus({ preventScroll: true });
        // A grid taller than the card scrolls: bring the cell the keypad moved to into view.
        ref.current.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [active]);
    if (!ctx || ctx.kind !== 'fill-cells') return <>{children}</>;
    return <input ref={ref} className={variant ? `kiosk-cell ${variant}` : 'kiosk-cell'} style={style} {...cellProps(ctx, cellKey)} />;
}
