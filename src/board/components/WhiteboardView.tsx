import BoardBottomBar from './BoardBottomBar';

// Full-screen "Bordmodus" overlay — the digibord whiteboard app. Mounted by App.tsx
// when view === 'whiteboard'; the worksheet editor stays mounted underneath so
// switching back loses nothing. Everything whiteboard lives under src/board/.
export default function WhiteboardView() {
    return (
        <div style={S.overlay}>
            {/* Board surface — the page canvas (widgets + ink) mounts here. */}
            <div style={S.surfaceWrap}>
                <div style={S.surface} />
            </div>
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
    surfaceWrap: {
        flex: 1, minHeight: 0, display: 'flex',
    } as React.CSSProperties,
    surface: {
        flex: 1, background: '#ffffff',
    } as React.CSSProperties,
};
