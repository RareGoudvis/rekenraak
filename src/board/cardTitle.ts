import { REGISTRY } from '../config/exerciseRegistry';
import { buildCatalog } from '../config/exerciseCatalog';
import { kioskLabelOf } from '../services/oefenen/kiosk';
import { formatMathNumber } from '../services/math/formatters';
import { widgetTitle } from './widgetSizing';
import { widgetAccent } from './settings/baseProps';
import type { BoardWidget } from './boardTypes';

let catalogByType: Map<string, { label: string; accentVar: string }> | null = null;
function catalogRow(typeId: string) {
    catalogByType ??= new Map(buildCatalog().map(it => [it.typeId, { label: it.label, accentVar: it.accentVar }]));
    return catalogByType.get(typeId);
}

// "Afronden · tot 1 000": the leaf's short name plus the block's current max, like the sheet's
// opdracht reads, so the card says what is on it and follows a max picked in Instellingen.
export function exerciseCardTitle(widget: BoardWidget): string {
    const block = widget.block;
    if (!block) return widgetTitle(widget);
    const name = (block.leafId && kioskLabelOf(block.leafId)) || catalogRow(block.typeId)?.label || widgetTitle(widget);
    const range = REGISTRY[block.typeId]?.maxPresets?.(block.constraints as Record<string, unknown>);
    const max = range ? (block.constraints as Record<string, unknown>)[range.key] : undefined;
    return typeof max === 'number' && Number.isFinite(max) ? `${name} · tot ${formatMathNumber(max)}` : name;
}

// The title bar text: a title the teacher typed wins; an exercise card names its leaf + max.
export function cardTitle(widget: BoardWidget): string {
    const t = widget.props?.title;
    if (typeof t === 'string' && t.trim()) return t;
    return widget.kind === 'exercise' ? exerciseCardTitle(widget) : widgetTitle(widget);
}

// The title-bar dot: the picked accent, else the exercise's domain hue (identity, beside its
// name), else the board accent every widget kind had.
export function cardDotColor(widget: BoardWidget): string {
    const accent = widgetAccent(widget);
    if (accent) return accent;
    const domain = widget.block ? catalogRow(widget.block.typeId)?.accentVar : undefined;
    return domain ? `var(${domain})` : 'var(--accent)';
}
