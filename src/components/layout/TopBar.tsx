import { useWorksheetStore } from '../../store/useWorksheetStore';

interface Props {
    onDownloadPDF: (withSolutions: boolean) => void;
    isGenerating: boolean;
}

export default function TopBar({ onDownloadPDF, isGenerating }: Props) {
    const undo = useWorksheetStore((s) => s.undo);
    const redo = useWorksheetStore((s) => s.redo);
    const canUndo = useWorksheetStore((s) => s.canUndo());
    const canRedo = useWorksheetStore((s) => s.canRedo());
    const showSolutions = useWorksheetStore((s) => s.showSolutions);
    const setShowSolutions = useWorksheetStore((s) => s.setShowSolutions);

    return (
        <div style={S.bar}>
            {/* Undo / Redo */}
            <div style={S.group}>
                <button
                    style={S.iconBtn(canUndo)}
                    onClick={undo}
                    disabled={!canUndo}
                    title="Ongedaan maken (Ctrl+Z)"
                >
                    ↩
                </button>
                <button
                    style={S.iconBtn(canRedo)}
                    onClick={redo}
                    disabled={!canRedo}
                    title="Opnieuw (Ctrl+Y)"
                >
                    ↪
                </button>
            </div>

            <div style={S.spacer} />

            {/* Solutions toggle */}
            <button
                style={S.solToggle(showSolutions)}
                onClick={() => setShowSolutions(!showSolutions)}
                title="Oplossingen tonen/verbergen"
            >
                {showSolutions ? '🔴 Oplossingen aan' : 'Oplossingen'}
            </button>

            {/* Download buttons */}
            <div style={S.group}>
                <button
                    style={S.downloadBtn}
                    onClick={() => onDownloadPDF(false)}
                    disabled={isGenerating}
                >
                    {isGenerating ? '⏳ Genereren...' : '↓ Oefenbundel'}
                </button>
                <button
                    style={S.downloadSolBtn}
                    onClick={() => onDownloadPDF(true)}
                    disabled={isGenerating}
                >
                    {isGenerating ? '⏳ Genereren...' : '↓ Oplossingen'}
                </button>
            </div>
        </div>
    );
}

const S = {
    bar: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 16px',
        backgroundColor: 'var(--bg-panel)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        marginBottom: '12px',
        flexShrink: 0,
    } as React.CSSProperties,
    group: { display: 'flex', gap: '4px' } as React.CSSProperties,
    spacer: { flex: 1 } as React.CSSProperties,
    iconBtn: (enabled: boolean): React.CSSProperties => ({
        width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: enabled ? 'var(--bg-input)' : 'transparent',
        border: '1px solid var(--border-color)',
        borderRadius: '6px', cursor: enabled ? 'pointer' : 'not-allowed',
        fontSize: '16px', color: enabled ? 'var(--text-main)' : 'var(--border-color)',
        transition: 'all 0.15s',
    }),
    solToggle: (on: boolean): React.CSSProperties => ({
        padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
        border: '1px solid var(--border-color)',
        backgroundColor: on ? 'rgba(225,29,72,0.15)' : 'transparent',
        color: on ? '#f87171' : 'var(--text-muted)',
    }),
    downloadBtn: {
        padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
        border: 'none', backgroundColor: 'var(--accent-purple)', color: '#fff',
    } as React.CSSProperties,
    downloadSolBtn: {
        padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
        border: 'none', backgroundColor: 'var(--accent-purple-dark)', color: '#fff',
    } as React.CSSProperties,
};
