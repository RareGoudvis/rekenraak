import type { CSSProperties } from 'react';
import type { RegionStyle } from '../store/useWorksheetStore';

type Side = 'Top' | 'Right' | 'Bottom' | 'Left';
const SIDES: Side[] = ['Top', 'Right', 'Bottom', 'Left'];

// Borders as per-side longhands only. React warns ("Updating a style property during
// rerender … when a conflicting property is set") whenever one render sets `borderWidth`
// and the next `borderBottomWidth`, which a header/footer style switch did.
export function borderSides(sides: Partial<Record<Side, { width: string; color: string }>>): CSSProperties {
    const out: Record<string, string> = {};
    for (const s of SIDES) {
        const b = sides[s];
        if (!b) continue;
        out[`border${s}Style`] = 'solid';
        out[`border${s}Width`] = b.width;
        out[`border${s}Color`] = b.color;
    }
    return out as CSSProperties;
}

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

    const b = { width: `${rs.borderWidth ?? 1.5}px`, color: rs.borderColor ?? '#000' };
    if (rs.borderBox) Object.assign(out, borderSides({ Top: b, Right: b, Bottom: b, Left: b }));
    else Object.assign(out, borderSides({ ...(rs.borderTop && { Top: b }), ...(rs.borderBottom && { Bottom: b }) }));
    if (rs.padX != null || rs.padY != null) out.padding = `${rs.padY ?? 0}px ${rs.padX ?? 0}px`;
    return out;
}
