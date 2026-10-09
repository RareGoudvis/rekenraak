import { useBoardStore } from '../useBoardStore';
import type { BoardWidget, WidgetKind } from '../boardTypes';

// The baseline every widget kind gets (rendered by WidgetInspector under the kind's own
// panel): props.title, props.fontSize, props.accent, props.showHeader. Readers here are the
// validation layer: a missing or junk value reads as today's look, so old boards load unchanged.

export type FontSizeKey = 'klein' | 'normaal' | 'groot' | 'xl';
// The board's size scale: one multiplier per step, 'normaal' = today's pixels.
export const FONT_SIZES: ReadonlyArray<{ key: FontSizeKey; label: string; scale: number }> = [
    { key: 'klein', label: 'Klein', scale: 0.85 },
    { key: 'normaal', label: 'Normaal', scale: 1 },
    { key: 'groot', label: 'Groot', scale: 1.25 },
    { key: 'xl', label: 'XL', scale: 1.5 },
];

export function fontSizeKey(widget: BoardWidget): FontSizeKey {
    const v = widget.props?.fontSize;
    return FONT_SIZES.some(f => f.key === v) ? v as FontSizeKey : 'normaal';
}

export function fontScale(widget: BoardWidget): number {
    const key = fontSizeKey(widget);
    return FONT_SIZES.find(f => f.key === key)!.scale;
}

// Kinds that multiply their own type sizes by fontScale(); every other kind gets the font
// size as the frame's inner text zoom (the exercise Tekstgrootte mechanism), which reflows.
export const SELF_SCALED_FONT: ReadonlySet<WidgetKind> = new Set<WidgetKind>([
    'checklist', 'stappenplan', 'werksymbolen', 'namen', 'groepjes',
]);

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

// Widget ink on the white card, not UI chrome (UI-GUIDE §3 "worksheet-ink"): the board's
// curated text colours, each with its Dutch name so colour never carries meaning alone.
export const ACCENT_PALETTE: ReadonlyArray<{ name: string; hex: string }> = [
    { name: 'Blauw', hex: '#1e40af' },
    { name: 'Groen', hex: '#166534' },
    { name: 'Paars', hex: '#6b21a8' },
    { name: 'Oranje', hex: '#9a3412' },
    { name: 'Rood', hex: '#b91c1c' },
    { name: 'Roze', hex: '#be185d' },
    { name: 'Turkoois', hex: '#0f766e' },
    { name: 'Grijs', hex: '#374151' },
    { name: 'Zwart', hex: '#111111' },
];

export function colorName(hex: string | null): string {
    if (!hex) return 'Standaard';
    return ACCENT_PALETTE.find(c => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? hex;
}

// null = the kind's own colour (today's look).
export function widgetAccent(widget: BoardWidget): string | null {
    const v = widget.props?.accent;
    return isHex(v) ? v : null;
}

// Settings writes merge into the LIVE props: two quick edits before a re-render must not
// drop the first one (the panel's `widget` prop is one render behind the store).
export function useSetProps(widget: BoardWidget): (patch: Record<string, unknown>) => void {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    return (patch) => {
        const s = useBoardStore.getState();
        const live = s.pages[s.activePageIdx]?.widgets.find(w => w.id === widget.id) ?? widget;
        updateWidget(widget.id, { props: { ...live.props, ...patch } });
    };
}
