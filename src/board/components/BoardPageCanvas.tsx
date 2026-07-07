import { useBoardStore } from '../useBoardStore';
import WidgetFrame from './WidgetFrame';
import ExerciseWidget from './widgets/ExerciseWidget';
import TekstWidget from './widgets/TekstWidget';
import DatumWidget from './widgets/DatumWidget';
import KlokWidget from './widgets/KlokWidget';
import AfbeeldingWidget from './widgets/AfbeeldingWidget';
import NamenWidget from './widgets/NamenWidget';
import WeerWidget from './widgets/WeerWidget';
import GeluidWidget from './widgets/GeluidWidget';
import { regenerateBoardBlock } from '../boardBlocks';
import { backgroundStyle } from '../backgrounds';
import InkLayer from './InkLayer';
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
    const tool = useBoardStore((s) => s.tool);
    const inkActive = tool === 'pen' || tool === 'marker' || tool === 'eraser';

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
            {/* Widget layer goes inert while an ink tool is active — one routing rule. */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: inkActive ? 'none' : 'auto' }}>
                {page.widgets.map((w) => (
                    <WidgetFrame
                        key={w.id} widget={w} selected={w.id === selectedWidgetId}
                        onRegenerate={w.kind === 'exercise' ? () => regenerate(w) : undefined}
                        onToggleAnswer={w.kind === 'exercise' ? () => updateWidget(w.id, { showAnswer: !w.showAnswer }) : undefined}
                    >
                        <WidgetContent widget={w} dark={page.background.dark} />
                    </WidgetFrame>
                ))}
            </div>
            <InkLayer active={inkActive} />
        </div>
    );
}

function WidgetContent({ widget, dark }: { widget: BoardWidget; dark: boolean }) {
    switch (widget.kind) {
        case 'exercise': return <ExerciseWidget widget={widget} />;
        case 'tekst': return <TekstWidget widget={widget} dark={dark} />;
        case 'datum': return <DatumWidget dark={dark} />;
        case 'klok': return <KlokWidget widget={widget} dark={dark} />;
        case 'afbeelding': return <AfbeeldingWidget widget={widget} />;
        case 'namen': return <NamenWidget dark={dark} />;
        case 'weer': return <WeerWidget widget={widget} dark={dark} />;
        case 'geluid': return <GeluidWidget dark={dark} />;
        default: return null;
    }
}
