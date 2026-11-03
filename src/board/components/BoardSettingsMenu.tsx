import { useRef, useState } from 'react';
import { CaretLeft, CaretRight, Plus, Copy, Trash, Broom, FloppyDisk, DownloadSimple, UploadSimple, CornersOut, CornersIn } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import { loadBoardPresets, deleteBoardPreset, exportBoardFile, parseBoardFile, parseBoardSettings, type BoardPreset } from '../boardPersistence';
import { promptSaveBoard, useBoardFullscreen } from '../boardChrome';
import BackgroundPicker from './BackgroundPicker';

// The rail's Bordinstellingen: everything about the board itself in one popover (owner design).
// Left: the achtergrond tiles. Right: raster, pagina's, Mijn borden, volledig scherm, bord wissen.
export default function BoardSettingsMenu({ onDone }: { onDone: () => void }) {
    const gridSnap = useBoardStore((s) => s.gridSnap);
    const setGridSnap = useBoardStore((s) => s.setGridSnap);
    const gridSize = useBoardStore((s) => s.gridSize);
    const setGridSize = useBoardStore((s) => s.setGridSize);
    const activePageIdx = useBoardStore((s) => s.activePageIdx);
    const pageCount = useBoardStore((s) => s.pages.length);
    const gotoPage = useBoardStore((s) => s.gotoPage);
    const addPage = useBoardStore((s) => s.addPage);
    const duplicatePage = useBoardStore((s) => s.duplicatePage);
    const removePage = useBoardStore((s) => s.removePage);
    const clearActivePage = useBoardStore((s) => s.clearActivePage);
    const fullscreen = useBoardFullscreen();
    const [presets, setPresets] = useState<BoardPreset[]>(loadBoardPresets);
    const importRef = useRef<HTMLInputElement>(null);

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const parsed = parseBoardFile(String(reader.result));
            if (!parsed) { window.alert('Dit bestand is geen geldig Rekenraak-bord.'); return; }
            useBoardStore.getState().loadBoard(parsed.pages, parsed.activePageIdx, parsed.settings);
            onDone();
        };
        reader.readAsText(file);
    };
    const handleClearBoard = () => {
        if (!window.confirm('Het hele bord wissen (alle pagina’s)?')) return;
        useBoardStore.getState().resetBoard();
        onDone();
    };

    return (
        <div style={S.root}>
            <input ref={importRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />
            <div style={S.col}>
                <BackgroundPicker />
            </div>
            <div style={{ ...S.col, ...S.rightCol }}>
                <div style={S.section}>Raster uitlijnen</div>
                <button type="button" className="ui-hover" aria-pressed={gridSnap} style={{ ...S.item, ...(gridSnap ? S.itemOn : {}) }}
                    onClick={() => setGridSnap(!gridSnap)}>
                    {gridSnap ? 'Uitlijnen: aan' : 'Uitlijnen: uit'}
                </button>
                <div style={S.row}>
                    {[20, 40, 80].map(px => (
                        <button key={px} type="button" className="ui-hover" aria-pressed={gridSize === px && gridSnap}
                            style={{ ...S.item, flex: 1, justifyContent: 'center', ...(gridSize === px && gridSnap ? S.itemOn : {}) }}
                            onClick={() => { setGridSize(px); setGridSnap(true); }}>
                            {px} px
                        </button>
                    ))}
                </div>

                <div style={S.section}>Pagina’s</div>
                <div style={S.row}>
                    <button type="button" className="ui-hover" aria-label="Vorige pagina" title="Vorige pagina" disabled={activePageIdx === 0}
                        style={{ ...S.iconItem, ...(activePageIdx === 0 ? S.disabled : {}) }} onClick={() => gotoPage(activePageIdx - 1)}>
                        <CaretLeft size={18} />
                    </button>
                    <span style={S.pageLabel}>Pagina {activePageIdx + 1} / {pageCount}</span>
                    <button type="button" className="ui-hover" aria-label="Volgende pagina" title="Volgende pagina" disabled={activePageIdx >= pageCount - 1}
                        style={{ ...S.iconItem, ...(activePageIdx >= pageCount - 1 ? S.disabled : {}) }} onClick={() => gotoPage(activePageIdx + 1)}>
                        <CaretRight size={18} />
                    </button>
                </div>
                <button type="button" className="ui-hover" style={S.item} onClick={addPage}><Plus size={18} /> Pagina toevoegen</button>
                <button type="button" className="ui-hover" style={S.item} onClick={duplicatePage}><Copy size={18} /> Pagina dupliceren</button>
                <button type="button" className="ui-hover" style={S.item}
                    onClick={() => { if (window.confirm('Alles op deze pagina wissen?')) clearActivePage(); }}>
                    <Broom size={18} /> Pagina leegmaken
                </button>
                <button type="button" className="ui-hover" style={{ ...S.item, color: 'var(--danger)', ...(pageCount <= 1 ? S.disabled : {}) }}
                    disabled={pageCount <= 1} onClick={removePage}>
                    <Trash size={18} /> Pagina verwijderen
                </button>

                <div style={S.section}>Mijn borden</div>
                <button type="button" className="ui-hover" style={S.item} onClick={() => { const p = promptSaveBoard(); if (p) setPresets(p); }}>
                    <FloppyDisk size={18} /> Bord bewaren als…
                </button>
                {presets.map(p => (
                    <div key={p.id} style={S.row}>
                        <button type="button" className="ui-hover" style={{ ...S.item, flex: 1, minWidth: 0 }}
                            title={`${p.name} (${p.pageCount} pagina's)`}
                            onClick={() => { useBoardStore.getState().loadBoard(p.payload.pages, p.payload.activePageIdx, parseBoardSettings(p.payload.settings)); onDone(); }}>
                            <span style={S.ellipsis}>{p.name}</span>
                        </button>
                        <button type="button" className="ui-hover" title="Verwijderen" aria-label={`Verwijder ${p.name}`}
                            style={{ ...S.iconItem, color: 'var(--danger)' }} onClick={() => setPresets(deleteBoardPreset(p.id))}>
                            <Trash size={16} />
                        </button>
                    </div>
                ))}
                <div style={S.row}>
                    <button type="button" className="ui-hover" style={{ ...S.item, flex: 1 }}
                        onClick={() => { const s = useBoardStore.getState(); exportBoardFile(s.pages, s.activePageIdx, s.boardSettings); onDone(); }}>
                        <DownloadSimple size={18} /> Exporteren
                    </button>
                    <button type="button" className="ui-hover" style={{ ...S.item, flex: 1 }} onClick={() => importRef.current?.click()}>
                        <UploadSimple size={18} /> Importeren
                    </button>
                </div>

                <div style={S.divider} />
                {fullscreen.supported && (
                    <button type="button" className="ui-hover" aria-pressed={fullscreen.on} style={{ ...S.item, ...(fullscreen.on ? S.itemOn : {}) }}
                        onClick={fullscreen.toggle}>
                        {fullscreen.on ? <CornersIn size={18} /> : <CornersOut size={18} />} Volledig scherm{fullscreen.on ? ': aan' : ''}
                    </button>
                )}
                <button type="button" className="ui-hover" style={{ ...S.item, color: 'var(--danger)' }} onClick={handleClearBoard}>
                    <Trash size={18} /> Bord wissen
                </button>
            </div>
        </div>
    );
}

const S = {
    root: { display: 'flex', gap: '12px', alignItems: 'flex-start' } as React.CSSProperties,
    col: { display: 'flex', flexDirection: 'column', gap: '2px' } as React.CSSProperties,
    rightCol: { width: '250px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: '2px' } as React.CSSProperties,
    section: {
        padding: '10px 6px 4px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)', userSelect: 'none',
    } as React.CSSProperties,
    item: {
        display: 'flex', alignItems: 'center', gap: '10px', minHeight: '40px', padding: '0 10px',
        borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', textAlign: 'left',
        color: 'var(--text-main)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-ui)', cursor: 'pointer',
    } as React.CSSProperties,
    // THE selected look (UI-GUIDE §2).
    itemOn: { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } as React.CSSProperties,
    iconItem: {
        width: '40px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    disabled: { opacity: 0.35, cursor: 'not-allowed' } as React.CSSProperties,
    pageLabel: { flex: 1, textAlign: 'center', fontFamily: 'var(--font-sheet-math)', fontSize: 'var(--text-sm)', color: 'var(--text-main)' } as React.CSSProperties,
    ellipsis: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
    divider: { height: '1px', background: 'var(--border-color)', margin: '6px 4px' } as React.CSSProperties,
};
