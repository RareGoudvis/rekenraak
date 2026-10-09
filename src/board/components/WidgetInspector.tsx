import { X } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import { widgetTitle } from '../widgetSizing';
import { WIDGET_SETTINGS, type WidgetSettingsPanel } from '../settings/registry';
import BaselineSettings from '../settings/BaselineSettings';
import type { BoardWidget, WidgetKind } from '../boardTypes';

interface Props {
    widget: BoardWidget;   // selected non-exercise widget (klok, weer, …)
}

// Panels not yet moved to src/board/settings/: none left (groups A, B and C are all in the registry).
const LEGACY_SETTINGS: Partial<Record<WidgetKind, WidgetSettingsPanel>> = {};

// Settings flyout for non-exercise widgets (same chrome as the exercise inspector): the
// kind's own panel from the settings registry, then the baseline every kind shares.
export default function WidgetInspector({ widget }: Props) {
    const selectWidget = useBoardStore((s) => s.selectWidget);
    const Panel = WIDGET_SETTINGS[widget.kind] ?? LEGACY_SETTINGS[widget.kind];

    return (
        <div style={S.panel} data-widget-inspector>
            <div style={S.head}>
                <span style={S.title}>Instellingen · {widgetTitle(widget)}</span>
                <button type="button" className="ui-hover" style={S.closeBtn} aria-label="Sluiten" onClick={() => selectWidget(null)}>
                    <X size={18} />
                </button>
            </div>
            <div style={S.scroll}>
                {Panel && <Panel widget={widget} />}
                <BaselineSettings widget={widget} />
            </div>
        </div>
    );
}

const S = {
    panel: {
        position: 'absolute', top: '12px', right: '12px', maxHeight: 'calc(100% - 24px)', width: '340px',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 50, overflow: 'hidden',
    } as React.CSSProperties,
    head: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
    } as React.CSSProperties,
    title: { fontSize: '14px', fontWeight: 600, fontFamily: "'Azeret Mono', monospace", color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } as React.CSSProperties,
    closeBtn: {
        width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    scroll: { flex: 1, overflowY: 'auto', padding: '12px 14px', minHeight: 0 } as React.CSSProperties,
};
