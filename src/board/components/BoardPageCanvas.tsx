import { useBoardStore } from '../useBoardStore';
import WidgetFrame from './WidgetFrame';
import ExerciseWidget from './widgets/ExerciseWidget';
import { regenerateBoardBlock } from '../boardBlocks';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import type { BoardWidget } from '../boardTypes';

// The active board page: background + widget layer (+ ink layer in P2).
// Pointer routing rule: tool 'select' → widgets interactive; ink tools (P2)
// flip pointer-events to the stroke layer instead.
export default function BoardPageCanvas() {
    const page = useBoardStore((s) => s.pages[s.activePageIdx]);
    const selectedWidgetId = useBoardStore((s) => s.selectedWidgetId);
    const selectWidget = useBoardStore((s) => s.selectWidget);
    const updateWidget = useBoardStore((s) => s.updateWidget);

    // Quick 🔄 on the widget frame: reroll exercises without opening the inspector.
    // Keep the inspector's draft mirror in sync when it's open for this block.
    const regenerate = (w: BoardWidget) => {
        if (!w.block) return;
        const fresh = regenerateBoardBlock(w.block);
        updateWidget(w.id, { block: fresh });
        const ws = useWorksheetStore.getState();
        if (ws.draftBlocks.some(b => b.id === fresh.id)) ws.setDraftBlocks([fresh]);
    };

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
                <WidgetFrame
                    key={w.id} widget={w} selected={w.id === selectedWidgetId}
                    onRegenerate={w.kind === 'exercise' ? () => regenerate(w) : undefined}
                    onToggleAnswer={w.kind === 'exercise' ? () => updateWidget(w.id, { showAnswer: !w.showAnswer }) : undefined}
                >
                    <WidgetContent widget={w} />
                </WidgetFrame>
            ))}
        </div>
    );
}

// Content per widget kind; non-exercise widgets land in the basic-widgets commit.
function WidgetContent({ widget }: { widget: BoardWidget }) {
    if (widget.kind === 'exercise') return <ExerciseWidget widget={widget} />;
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
