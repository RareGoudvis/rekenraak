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
import WerksymbolenWidget from './widgets/WerksymbolenWidget';
import TimerWidget from './widgets/TimerWidget';
import StopwatchWidget from './widgets/StopwatchWidget';
import DobbelsteenWidget from './widgets/DobbelsteenWidget';
import AdemWidget from './widgets/AdemWidget';
import GroepjesWidget from './widgets/GroepjesWidget';
import ChecklistWidget from './widgets/ChecklistWidget';
import StappenplanWidget from './widgets/StappenplanWidget';
import GetallenlijnWidget from './widgets/GetallenlijnWidget';
import PositietabelWidget from './widgets/PositietabelWidget';
import HonderdveldWidget from './widgets/HonderdveldWidget';
import BreukvizWidget from './widgets/BreukvizWidget';
import { regenerateBoardBlock } from '../boardBlocks';
import { backgroundStyle } from '../backgrounds';
import InkLayer from './InkLayer';
import BoardErrorBoundary from './BoardErrorBoundary';
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
            // Tap on empty board = deselect; with the T-tool active, place a text
            // widget at the tap point and hop back to select.
            onPointerDown={(e) => {
                if (tool === 'text') {
                    const r = e.currentTarget.getBoundingClientRect();
                    const board = useBoardStore.getState();
                    board.addWidget({
                        kind: 'tekst', x: Math.max(0, e.clientX - r.left), y: Math.max(0, e.clientY - r.top),
                        w: 360, props: { text: '' },
                    });
                    board.setTool('select');
                    return;
                }
                selectWidget(null);
            }}
        >
            {/* Widget layer goes inert while an ink tool is active — one routing rule. */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: inkActive ? 'none' : 'auto' }}>
                {page.widgets.map((w) => (
                    <WidgetFrame
                        key={w.id} widget={w} selected={w.id === selectedWidgetId}
                        onRegenerate={w.kind === 'exercise' ? () => regenerate(w) : undefined}
                        onToggleAnswer={w.kind === 'exercise' ? () => updateWidget(w.id, { showAnswer: !w.showAnswer }) : undefined}
                    >
                        <BoardErrorBoundary label={`Widget (${w.kind})`}>
                            <WidgetContent widget={w} dark={page.background.dark} />
                        </BoardErrorBoundary>
                    </WidgetFrame>
                ))}
            </div>
            <BoardErrorBoundary label="Inktlaag">
                <InkLayer active={inkActive} />
            </BoardErrorBoundary>
        </div>
    );
}

function WidgetContent({ widget, dark }: { widget: BoardWidget; dark: boolean }) {
    switch (widget.kind) {
        case 'exercise': return <ExerciseWidget widget={widget} />;
        case 'tekst': return <TekstWidget widget={widget} dark={dark} />;
        case 'datum': return <DatumWidget widget={widget} />;
        case 'klok': return <KlokWidget widget={widget} dark={dark} />;
        case 'afbeelding': return <AfbeeldingWidget widget={widget} />;
        case 'namen': return <NamenWidget dark={dark} />;
        case 'weer': return <WeerWidget widget={widget} dark={dark} />;
        case 'geluid': return <GeluidWidget widget={widget} />;
        case 'werksymbolen': return <WerksymbolenWidget widget={widget} />;
        case 'timer': return <TimerWidget widget={widget} />;
        case 'stopwatch': return <StopwatchWidget />;
        case 'dobbelsteen': return <DobbelsteenWidget widget={widget} />;
        case 'adem': return <AdemWidget widget={widget} />;
        case 'groepjes': return <GroepjesWidget widget={widget} />;
        case 'checklist': return <ChecklistWidget widget={widget} />;
        case 'stappenplan': return <StappenplanWidget widget={widget} />;
        case 'getallenlijn': return <GetallenlijnWidget widget={widget} />;
        case 'positietabel': return <PositietabelWidget widget={widget} />;
        case 'honderdveld': return <HonderdveldWidget widget={widget} />;
        case 'breukviz': return <BreukvizWidget widget={widget} />;
        default: return null;
    }
}
