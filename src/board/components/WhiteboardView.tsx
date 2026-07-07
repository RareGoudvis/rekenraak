import { useState } from 'react';
import BoardBottomBar from './BoardBottomBar';
import BoardPageCanvas from './BoardPageCanvas';
import BoardAddModal from './BoardAddModal';
import BoardInspector from './BoardInspector';
import WidgetInspector from './WidgetInspector';
import InkSettingsBar from './InkSettingsBar';
import { useBoardStore } from '../useBoardStore';

// Full-screen "Bordmodus" overlay — the digibord whiteboard app. Mounted by App.tsx
// when view === 'whiteboard'; the worksheet editor stays mounted underneath so
// switching back loses nothing. Everything whiteboard lives under src/board/.
export default function WhiteboardView() {
    const [addOpen, setAddOpen] = useState(false);
    const selectedWidget = useBoardStore((s) =>
        s.pages[s.activePageIdx].widgets.find(w => w.id === s.selectedWidgetId));
    const inspectorOpen = useBoardStore((s) => s.inspectorOpen);
    const tool = useBoardStore((s) => s.tool);

    return (
        <div style={S.overlay}>
            <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
                <BoardPageCanvas />
                {/* Inspector flyouts — opened via the ⚙ in the widget's title bar. */}
                {inspectorOpen && selectedWidget?.kind === 'exercise' && <BoardInspector key={selectedWidget.id} widget={selectedWidget} />}
                {inspectorOpen && selectedWidget && ['klok', 'weer', 'namen', 'datum', 'werksymbolen'].includes(selectedWidget.kind) && <WidgetInspector key={selectedWidget.id} widget={selectedWidget} />}
                {/* Ink tool settings strip (colors + widths) while pen/marker is active. */}
                {(tool === 'pen' || tool === 'marker') && <InkSettingsBar tool={tool} />}
            </div>
            <BoardBottomBar onOpenWiskunde={() => setAddOpen(true)} />
            {addOpen && <BoardAddModal onClose={() => setAddOpen(false)} />}
        </div>
    );
}

const S = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg-base)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        // Digibord: never let a stray touch scroll/zoom the page behind the board.
        touchAction: 'none', overscrollBehavior: 'none',
    } as React.CSSProperties,
};
