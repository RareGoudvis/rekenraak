import { useBoardStore } from '../useBoardStore';
import WidgetFrame from './WidgetFrame';
import ExerciseWidget from './widgets/ExerciseWidget';
import TekstWidget from './widgets/TekstWidget';
import DatumWidget from './widgets/DatumWidget';
import KlokWidget from './widgets/KlokWidget';
import AfbeeldingWidget from './widgets/AfbeeldingWidget';
import { regenerateBoardBlock } from '../boardBlocks';
import { backgroundStyle } from '../backgrounds';
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
                ...backgroundStyle(page.background),
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
                    <WidgetContent widget={w} selected={w.id === selectedWidgetId} dark={page.background.dark} />
                </WidgetFrame>
            ))}
        </div>
    );
}

function WidgetContent({ widget, selected, dark }: { widget: BoardWidget; selected: boolean; dark: boolean }) {
    switch (widget.kind) {
        case 'exercise': return <ExerciseWidget widget={widget} />;
        case 'tekst': return <TekstWidget widget={widget} dark={dark} />;
        case 'datum': return <DatumWidget dark={dark} />;
        case 'klok': return <KlokWidget widget={widget} selected={selected} dark={dark} />;
        case 'afbeelding': return <AfbeeldingWidget widget={widget} />;
        default: return null;
    }
}
