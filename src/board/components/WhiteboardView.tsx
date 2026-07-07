import BoardBottomBar from './BoardBottomBar';
import BoardPageCanvas from './BoardPageCanvas';

// Full-screen "Bordmodus" overlay — the digibord whiteboard app. Mounted by App.tsx
// when view === 'whiteboard'; the worksheet editor stays mounted underneath so
// switching back loses nothing. Everything whiteboard lives under src/board/.
export default function WhiteboardView() {
    return (
        <div style={S.overlay}>
            <BoardPageCanvas />
            <BoardBottomBar />
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
