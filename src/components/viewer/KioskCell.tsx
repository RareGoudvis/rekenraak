import type { CSSProperties, ReactNode } from 'react';
import { cellProps, useViewerInteraction } from './ViewerInteractionContext';

/** A fill-cells blank: the kiosk draws an input bound to `cells[cellKey]`, the sheet keeps `children` (its own blank) untouched. */
export default function KioskCell({ cellKey, children, style }: { cellKey: string; children?: ReactNode; style?: CSSProperties }) {
    const ctx = useViewerInteraction();
    if (!ctx || ctx.kind !== 'fill-cells') return <>{children}</>;
    return <input className="kiosk-cell" style={style} {...cellProps(ctx, cellKey)} />;
}
