import type { CSSProperties } from 'react';
import type { RegionStyle } from '../store/useWorksheetStore';

// Overlay a power-user RegionStyle onto a region's base/default style object.
// Custom keys win; absent keys leave the base untouched. Intentionally only touches
// in-region properties (size/weight/color/fill/border/padding/align) — never width,
// margin, or position, so the dialog-proof A4 print layout stays intact.
export function overlayRegionStyle(base: CSSProperties, rs?: RegionStyle): CSSProperties {
    if (!rs) return base;
    const out: CSSProperties = { ...base };
    if (rs.fontSize != null) out.fontSize = `${rs.fontSize}px`;
    if (rs.bold != null) out.fontWeight = rs.bold ? 700 : 400;
    if (rs.color) out.color = rs.color;
    if (rs.background) out.background = rs.background;
    if (rs.align) out.textAlign = rs.align;

    const bw = `${rs.borderWidth ?? 1.5}px solid ${rs.borderColor ?? '#000'}`;
    if (rs.borderBox) {
        out.border = bw;
    } else {
        if (rs.borderTop) out.borderTop = bw;
        if (rs.borderBottom) out.borderBottom = bw;
    }
    if (rs.padX != null || rs.padY != null) out.padding = `${rs.padY ?? 0}px ${rs.padX ?? 0}px`;
    return out;
}
