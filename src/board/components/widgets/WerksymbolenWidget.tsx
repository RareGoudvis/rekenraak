import { useBoardStore } from '../../useBoardStore';
import { werksymbolenModel, tapSymbol, WS_ICONS } from '../../settings/werksymbolenModel';
import { fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Today's active look (owner screenshot); a symbol's own colour or the accent replaces it.
const ACTIVE_BG = '#ef4444';
const ACTIVE_BORDER = '#dc2626';
// Per size: tile min height (with / without label), icon px, label px.
const SIZES = {
    klein: { tile: 66, tileIcon: 48, icon: 22, font: 11 },
    normaal: { tile: 92, tileIcon: 64, icon: 30, font: 13 },
    groot: { tile: 128, tileIcon: 92, icon: 46, font: 17 },
} as const;

// Work-mode selector: tap a tile = active mode (filled), rest dimmed. Symbols, layout,
// size, labels and multi-active come from the ⚙ panel.
export default function WerksymbolenWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const m = werksymbolenModel(widget);
    const fs = fontScale(widget);
    const accent = widgetAccent(widget);
    const sz = SIZES[m.size];
    const anyActive = m.symbols.some(s => m.active.includes(s.key));
    const shown = m.onlyActive && anyActive ? m.symbols.filter(s => m.active.includes(s.key)) : m.symbols;
    const vertical = m.layout === 'kolom';

    return (
        <div style={{
            display: vertical ? 'flex' : 'grid',
            flexDirection: vertical ? 'column' : undefined,
            gridTemplateColumns: vertical ? undefined : `repeat(${m.layout === 'rij' || (m.onlyActive && anyActive) ? Math.max(1, shown.length) : m.columns}, minmax(0, 1fr))`,
            gap: '10px', padding: '14px',
        }}>
            {shown.map(s => {
                const Icon = WS_ICONS[s.icon]?.icon ?? WS_ICONS.ster.icon;
                const active = m.active.includes(s.key);
                const color = s.color ?? accent;
                return (
                    <button
                        key={s.key} type="button" aria-pressed={active} aria-label={s.label || WS_ICONS[s.icon]?.name}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => updateWidget(widget.id, { props: { ...widget.props, active: tapSymbol(m, s.key) } })}
                        style={{
                            display: 'flex', flexDirection: vertical && !m.showLabel ? 'row' : 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '8px',
                            minHeight: `${(m.showLabel ? sz.tile : sz.tileIcon) * fs}px`, padding: '10px 8px',
                            borderRadius: '12px', cursor: 'pointer',
                            border: active ? `2px solid ${color ? `color-mix(in srgb, ${color} 80%, #000)` : ACTIVE_BORDER}` : '1px solid rgba(0,0,0,0.15)',
                            background: active ? (color ?? ACTIVE_BG) : 'rgba(0,0,0,0.03)',
                            color: active ? '#fff' : (color ?? '#444'),
                            fontFamily: "'Azeret Mono', monospace", fontSize: `${sz.font * fs}px`, fontWeight: active ? 700 : 400,
                            transition: 'background 120ms',
                        }}
                    >
                        <Icon size={sz.icon * fs} weight={active ? 'fill' : 'regular'} />
                        {/* A narrow tile (one long row, big size) hyphenates a long Dutch word instead of overflowing. */}
                        {m.showLabel && <span lang="nl" style={{ textAlign: 'center', lineHeight: 1.25, hyphens: 'auto', overflowWrap: 'anywhere', maxWidth: '100%' }}>{s.label}</span>}
                    </button>
                );
            })}
        </div>
    );
}
