import { useRef, useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { exportWorksheet, parseWorksheetFile, encodeShareLink } from '../../services/persistence';
import PresetModal from './PresetModal';

interface Props {
    onPrint: (withSolutions: boolean) => void;
    onOpenHelp?: () => void;
}

export default function TopBar({ onPrint }: Props) {
    const undo = useWorksheetStore((s) => s.undo);
    const redo = useWorksheetStore((s) => s.redo);
    const canUndo = useWorksheetStore((s) => s.canUndo());
    const canRedo = useWorksheetStore((s) => s.canRedo());
    const showSolutions = useWorksheetStore((s) => s.showSolutions);
    const setShowSolutions = useWorksheetStore((s) => s.setShowSolutions);
    const generateAllBlocks = useWorksheetStore((s) => s.generateAllBlocks);
    const loadWorksheet = useWorksheetStore((s) => s.loadWorksheet);
    const hasBlocks = useWorksheetStore((s) => s.blocks.length > 0);

    const importInputRef = useRef<HTMLInputElement>(null);
    const [presetOpen, setPresetOpen] = useState(false);
    const [shareFlash, setShareFlash] = useState(false);

    const handleExport = () => {
        const st = useWorksheetStore.getState();
        exportWorksheet({ blocks: st.blocks, header: st.header, footer: st.footer, docSettings: st.docSettings });
    };

    const handleImportClick = () => importInputRef.current?.click();

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = parseWorksheetFile(String(reader.result));
                if (!window.confirm('Huidige werkbundel wordt vervangen. Doorgaan?')) return;
                loadWorksheet(parsed);
            } catch (err) {
                window.alert(`Importeren mislukt: ${(err as Error).message}`);
            }
        };
        reader.onerror = () => window.alert('Bestand kon niet gelezen worden.');
        reader.readAsText(file);
    };

    const handleShare = async () => {
        const st = useWorksheetStore.getState();
        const link = encodeShareLink({ blocks: st.blocks, header: st.header, footer: st.footer, docSettings: st.docSettings });
        if (!link) {
            window.alert('Werkbundel te groot voor een deelbare link. Gebruik Exporteer i.p.v.');
            return;
        }
        try {
            await navigator.clipboard.writeText(link);
            setShareFlash(true);
            setTimeout(() => setShareFlash(false), 2000);
        } catch {
            window.prompt('Kopieer deze link:', link);
        }
    };

    return (
        <div style={S.bar}>
            {/* Undo / Redo */}
            <div style={S.group}>
                <button style={S.iconBtn(canUndo)} onClick={undo} disabled={!canUndo} title="Ongedaan maken (Ctrl+Z)">↩</button>
                <button style={S.iconBtn(canRedo)} onClick={redo} disabled={!canRedo} title="Opnieuw (Ctrl+Y)">↪</button>
            </div>

            <button
                style={S.actionBtn(hasBlocks)}
                onClick={() => hasBlocks && generateAllBlocks()}
                disabled={!hasBlocks}
                title="Alle niet-vergrendelde blokken opnieuw genereren"
            >✨ Genereer alles</button>

            <div style={S.group}>
                <button style={S.secondaryBtn} onClick={handleExport} title="Bewaar werkbundel als JSON-bestand">💾 Exporteer</button>
                <button style={S.secondaryBtn} onClick={handleImportClick} title="Open opgeslagen werkbundel">📂 Importeer</button>
                <button style={S.secondaryBtn} onClick={() => setPresetOpen(true)} title="Presets beheren">📑 Presets</button>
                <button style={S.secondaryBtn} onClick={handleShare} title="Deelbare link kopiëren">
                    {shareFlash ? '✓ Link gekopieerd' : '🔗 Deel'}
                </button>
                <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleImportFile}
                    style={{ display: 'none' }}
                />
            </div>

            <div style={S.spacer} />

            <button
                style={S.solToggle(showSolutions)}
                onClick={() => setShowSolutions(!showSolutions)}
                title="Oplossingen tonen/verbergen"
            >
                {showSolutions ? '🔴 Oplossingen aan' : 'Toon oplossingen'}
            </button>

            <div style={S.group}>
                <button style={S.downloadBtn} onClick={() => onPrint(false)}>🖨 Afdrukken</button>
                <button style={S.downloadSolBtn} onClick={() => onPrint(true)}>🖨 + Oplossingen</button>
            </div>

            {presetOpen && <PresetModal onClose={() => setPresetOpen(false)} />}
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
        flexWrap: 'wrap',
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
    actionBtn: (enabled: boolean): React.CSSProperties => ({
        padding: '6px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '12px',
        border: '1px solid var(--border-color)',
        backgroundColor: enabled ? 'var(--accent-purple)' : 'transparent',
        color: enabled ? '#fff' : 'var(--text-muted)',
        cursor: enabled ? 'pointer' : 'not-allowed',
    }),
    secondaryBtn: {
        padding: '6px 12px', borderRadius: '6px', fontWeight: 600, fontSize: '12px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-input)',
        color: 'var(--text-main)',
        cursor: 'pointer',
    } as React.CSSProperties,
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
