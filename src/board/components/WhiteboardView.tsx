import { useState } from 'react';
import BoardBottomBar from './BoardBottomBar';
import BoardPageCanvas from './BoardPageCanvas';
import BoardAddModal from './BoardAddModal';
import BoardInspector from './BoardInspector';
import { useBoardStore } from '../useBoardStore';

// Full-screen "Bordmodus" overlay — the digibord whiteboard app. Mounted by App.tsx
// when view === 'whiteboard'; the worksheet editor stays mounted underneath so
// switching back loses nothing. Everything whiteboard lives under src/board/.
export default function WhiteboardView() {
    const [addOpen, setAddOpen] = useState(false);
    const selectedWidget = useBoardStore((s) =>
        s.pages[s.activePageIdx].widgets.find(w => w.id === s.selectedWidgetId));

    return (
        <div style={S.overlay}>
            <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
                <BoardPageCanvas />
                {/* Inspector flyout — only for a selected exercise widget (Ruben decision). */}
                {selectedWidget?.kind === 'exercise' && <BoardInspector key={selectedWidget.id} widget={selectedWidget} />}
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
