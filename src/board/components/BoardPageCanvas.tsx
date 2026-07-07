import { useBoardStore } from '../useBoardStore';
import WidgetFrame from './WidgetFrame';
import type { BoardWidget } from '../boardTypes';

// The active board page: background + widget layer (+ ink layer in P2).
// Pointer routing rule: tool 'select' → widgets interactive; ink tools (P2)
// flip pointer-events to the stroke layer instead.
export default function BoardPageCanvas() {
    const page = useBoardStore((s) => s.pages[s.activePageIdx]);
    const selectedWidgetId = useBoardStore((s) => s.selectedWidgetId);
    const selectWidget = useBoardStore((s) => s.selectWidget);

    return (
        <div
            style={{
                position: 'relative', flex: 1, overflow: 'hidden',
                background: page.background.dark ? '#1c2430' : '#ffffff',
                touchAction: 'none',
            }}
            // Tap on empty board = deselect (closes the inspector flyout).
            onPointerDown={() => selectWidget(null)}
        >
            {page.widgets.map((w) => (
                <WidgetFrame key={w.id} widget={w} selected={w.id === selectedWidgetId}>
                    <WidgetContent widget={w} />
                </WidgetFrame>
            ))}
        </div>
    );
}

// Placeholder content per kind — replaced by real widget components in the
// exercise/basic-widget commits.
function WidgetContent({ widget }: { widget: BoardWidget }) {
    return (
        <div style={{
            padding: '16px', background: 'var(--bg-panel)', borderRadius: '8px',
            border: '1px solid var(--border-color)', color: 'var(--text-main)',
            fontFamily: "'Azeret Mono', monospace", fontSize: '14px', minHeight: '48px',
        }}>
            [{widget.kind}]
        </div>
    );
}
