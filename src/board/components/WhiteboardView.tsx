import { useEffect, useState } from 'react';
import BoardRail from './BoardRail';
import BoardTopPill from './BoardTopPill';
import BoardPageCanvas from './BoardPageCanvas';
import BoardAddPanel from './BoardAddPanel';
import BoardInspector from './BoardInspector';
import WidgetInspector from './WidgetInspector';
import { useBoardStore } from '../useBoardStore';

// Full-screen "Bordmodus" overlay — the digibord whiteboard app. Mounted by App.tsx
// when view === 'whiteboard'; the worksheet editor stays mounted underneath so
// switching back loses nothing. Everything whiteboard lives under src/board/.
// Layout (Zijrail design): the tool rail on the left, the board filling the rest, the
// page / exit pill in the board's top-right corner, Toevoegen docked to the rail's foot.
export default function WhiteboardView() {
    const [addOpen, setAddOpen] = useState(false);
    const selectedWidget = useBoardStore((s) =>
        s.pages[s.activePageIdx].widgets.find(w => w.id === s.selectedWidgetId));
    const inspectorOpen = useBoardStore((s) => s.inspectorOpen);

    // Ink undo/redo only (widget actions have no history). Ignored while typing so a tekst
    // widget or title field keeps its own text undo.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
            const key = e.key.toLowerCase();
            if (key !== 'z' && key !== 'y') return;
            const t = e.target as HTMLElement | null;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            e.preventDefault();
            const { undoStroke, redoStroke } = useBoardStore.getState();
            if (key === 'y' || e.shiftKey) redoStroke(); else undoStroke();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        // no-print: Ctrl+P or the Afdrukken path with the board open must print the sheet
        // underneath, not this fixed overlay on top of every page.
        <div className="no-print" data-whiteboard style={S.overlay}>
            <div style={S.row}>
                <BoardRail addOpen={addOpen} onToggleAdd={() => setAddOpen(o => !o)} />
                <div style={S.main}>
                    <BoardPageCanvas />
                    <BoardTopPill />
                    {/* Inspector flyouts — opened via the ⚙ in the widget's title bar. */}
                    {inspectorOpen && selectedWidget?.kind === 'exercise' && <BoardInspector key={selectedWidget.id} widget={selectedWidget} />}
                    {inspectorOpen && selectedWidget && selectedWidget.kind !== 'exercise' && <WidgetInspector key={selectedWidget.id} widget={selectedWidget} />}
                    {addOpen && <BoardAddPanel onClose={() => setAddOpen(false)} />}
                </div>
            </div>
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
    row: { flex: 1, minHeight: 0, display: 'flex' } as React.CSSProperties,
    main: { position: 'relative', flex: 1, minWidth: 0, minHeight: 0, display: 'flex' } as React.CSSProperties,
};
