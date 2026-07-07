import { useRef, useState } from 'react';
import { Cursor, PenNib, Highlighter, Eraser, ArrowUpRight, Shapes, Ruler, GridFour, PaintRoller, Plus, CaretLeft, CaretRight, X, Sun, Moon, Copy, Trash, FloppyDisk, DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { useBoardStore } from '../useBoardStore';
import { PATTERN_LABELS } from '../backgrounds';
import { loadBoardPresets, saveBoardPreset, deleteBoardPreset, exportBoardFile, parseBoardFile, type BoardPreset } from '../boardPersistence';
import type { BackgroundPattern } from '../boardTypes';

interface Props {
    onAdd: () => void;
}

// Bottom toolbar of the whiteboard (replaces the TopBar in bordmodus). Digibord-first:
// every control is a ≥44px touch target, no hover-only affordances.
// P1 ships the chrome with only 'select' live; ink/shape tools activate in P2/P3.
export default function BoardBottomBar({ onAdd }: Props) {
    const setView = useWorksheetStore((s) => s.setView);
    const background = useBoardStore((s) => s.pages[s.activePageIdx].background);
    const setBackground = useBoardStore((s) => s.setBackground);
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
    const [menu, setMenu] = useState<'background' | 'grid' | 'page' | 'save' | null>(null);
    const [presets, setPresets] = useState<BoardPreset[]>([]);
    const importRef = useRef<HTMLInputElement>(null);

    const handleSavePreset = () => {
        const name = window.prompt('Naam voor dit bord:', 'Mijn bord');
        if (name === null) return;
        const st = useBoardStore.getState();
        setPresets(saveBoardPreset(name, st.pages, st.activePageIdx));
    };
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const parsed = parseBoardFile(String(reader.result));
            if (!parsed) { window.alert('Dit bestand is geen geldig Rekenraak-bord.'); return; }
            useBoardStore.getState().loadBoard(parsed.pages, parsed.activePageIdx);
            setMenu(null);
        };
        reader.readAsText(file);
    };
    const handleClearBoard = () => {
        if (!window.confirm('Het hele bord leegmaken (alle pagina’s)?')) return;
        useBoardStore.getState().resetBoard();
        setMenu(null);
    };

    // P1: selection is the only tool; the rest are visible-but-disabled placeholders
    // so the final layout is judgeable from day 1.
    const tools = [
        { key: 'select', icon: Cursor, label: 'Selecteren', enabled: true, active: true },
        { key: 'pen', icon: PenNib, label: 'Pen (binnenkort)', enabled: false, active: false },
        { key: 'marker', icon: Highlighter, label: 'Markeerstift (binnenkort)', enabled: false, active: false },
        { key: 'eraser', icon: Eraser, label: 'Gom (binnenkort)', enabled: false, active: false },
        { key: 'line', icon: ArrowUpRight, label: 'Lijn / pijl (binnenkort)', enabled: false, active: false },
        { key: 'shape', icon: Shapes, label: 'Vormen (binnenkort)', enabled: false, active: false },
        { key: 'instrument', icon: Ruler, label: 'Meetinstrumenten (binnenkort)', enabled: false, active: false },
    ];

    return (
        <div className="mac-vibrant" style={S.bar}>
            {/* Add exercise / widget — the board's primary action. */}
            <button type="button" className="ui-hover" style={S.addBtn} aria-label="Toevoegen aan bord" onClick={onAdd}>
                <Plus size={18} /> Toevoegen
            </button>

            <div style={S.sep} />

            {/* Tools */}
            <div style={S.group}>
                {tools.map(t => (
                    <button
                        key={t.key}
                        type="button"
                        className={t.enabled ? 'ui-hover' : undefined}
                        title={t.label}
                        aria-label={t.label}
                        disabled={!t.enabled}
                        style={{ ...S.toolBtn, ...(t.active ? S.toolActive : {}), ...(!t.enabled ? S.toolDisabled : {}) }}
                    >
                        <t.icon size={22} weight={t.active ? 'fill' : 'regular'} />
                    </button>
                ))}
            </div>

            <div style={S.sep} />

            {/* Board setup */}
            <div style={S.group}>
                <div style={{ position: 'relative' }}>
                    <button type="button" className="ui-hover" title="Achtergrond" aria-label="Achtergrond"
                        style={{ ...S.toolBtn, ...(menu === 'background' ? S.toolActive : {}) }}
                        onClick={() => setMenu(menu === 'background' ? null : 'background')}>
                        <PaintRoller size={22} />
                    </button>
                    {menu === 'background' && (
                        <div style={S.popup}>
                            {(Object.keys(PATTERN_LABELS) as BackgroundPattern[]).map(p => (
                                <button key={p} type="button" className="ui-hover"
                                    style={{ ...S.popupItem, ...(background.pattern === p ? S.popupItemOn : {}) }}
                                    onClick={() => setBackground({ ...background, pattern: p })}>
                                    {PATTERN_LABELS[p]}
                                </button>
                            ))}
                            <div style={S.popupDivider} />
                            <button type="button" className="ui-hover" style={S.popupItem}
                                onClick={() => setBackground({ ...background, dark: !background.dark })}>
                                {background.dark ? <Sun size={16} /> : <Moon size={16} />} {background.dark ? 'Wit bord' : 'Zwart bord'}
                            </button>
                        </div>
                    )}
                </div>
                <div style={{ position: 'relative' }}>
                    <button type="button" className="ui-hover" title="Raster uitlijnen" aria-label="Raster uitlijnen"
                        style={{ ...S.toolBtn, ...(gridSnap ? S.toolActive : {}) }}
                        onClick={() => setMenu(menu === 'grid' ? null : 'grid')}>
                        <GridFour size={22} />
                    </button>
                    {menu === 'grid' && (
                        <div style={S.popup}>
                            <button type="button" className="ui-hover" style={{ ...S.popupItem, ...(gridSnap ? S.popupItemOn : {}) }}
                                onClick={() => setGridSnap(!gridSnap)}>
                                {gridSnap ? 'Uitlijnen: aan' : 'Uitlijnen: uit'}
                            </button>
                            <div style={S.popupDivider} />
                            {[20, 40, 80].map(px => (
                                <button key={px} type="button" className="ui-hover"
                                    style={{ ...S.popupItem, ...(gridSize === px ? S.popupItemOn : {}) }}
                                    onClick={() => { setGridSize(px); setGridSnap(true); }}>
                                    Raster {px}px
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ flex: 1 }} />

            {/* Pagination */}
            <div style={S.group}>
                <button type="button" className="ui-hover" title="Vorige pagina" aria-label="Vorige pagina"
                    disabled={activePageIdx === 0} style={{ ...S.toolBtn, ...(activePageIdx === 0 ? S.toolDisabled : {}) }}
                    onClick={() => gotoPage(activePageIdx - 1)}>
                    <CaretLeft size={22} />
                </button>
                <div style={{ position: 'relative' }}>
                    <button type="button" className="ui-hover" title="Pagina-opties" aria-label="Pagina-opties" style={{ ...S.toolBtn, width: 'auto', padding: '0 8px' }}
                        onClick={() => setMenu(menu === 'page' ? null : 'page')}>
                        <span style={S.pageLabel}>{activePageIdx + 1} / {pageCount}</span>
                    </button>
                    {menu === 'page' && (
                        <div style={{ ...S.popup, left: 'auto', right: 0 }}>
                            <button type="button" className="ui-hover" style={S.popupItem} onClick={() => { duplicatePage(); setMenu(null); }}>
                                <Copy size={16} /> Pagina dupliceren
                            </button>
                            <button type="button" className="ui-hover" style={{ ...S.popupItem, color: 'var(--danger)' }} onClick={() => { removePage(); setMenu(null); }}>
                                <Trash size={16} /> Pagina verwijderen
                            </button>
                        </div>
                    )}
                </div>
                <button type="button" className="ui-hover" title="Volgende pagina" aria-label="Volgende pagina"
                    disabled={activePageIdx >= pageCount - 1} style={{ ...S.toolBtn, ...(activePageIdx >= pageCount - 1 ? S.toolDisabled : {}) }}
                    onClick={() => gotoPage(activePageIdx + 1)}>
                    <CaretRight size={22} />
                </button>
                <button type="button" className="ui-hover" title="Pagina toevoegen" aria-label="Pagina toevoegen" style={S.toolBtn} onClick={addPage}>
                    <Plus size={22} />
                </button>
            </div>

            <div style={S.sep} />

            {/* Save / boards */}
            <div style={{ position: 'relative' }}>
                <input ref={importRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />
                <button type="button" className="ui-hover" title="Bewaren / mijn borden" aria-label="Bewaren"
                    style={{ ...S.toolBtn, ...(menu === 'save' ? S.toolActive : {}) }}
                    onClick={() => { setPresets(loadBoardPresets()); setMenu(menu === 'save' ? null : 'save'); }}>
                    <FloppyDisk size={22} />
                </button>
                {menu === 'save' && (
                    <div style={{ ...S.popup, left: 'auto', right: 0, minWidth: '240px', maxHeight: '50vh', overflowY: 'auto' }}>
                        <button type="button" className="ui-hover" style={S.popupItem} onClick={handleSavePreset}>
                            <FloppyDisk size={16} /> Bord bewaren als…
                        </button>
                        <button type="button" className="ui-hover" style={S.popupItem} onClick={() => { exportBoardFile(useBoardStore.getState().pages, useBoardStore.getState().activePageIdx); setMenu(null); }}>
                            <DownloadSimple size={16} /> Exporteren…
                        </button>
                        <button type="button" className="ui-hover" style={S.popupItem} onClick={() => importRef.current?.click()}>
                            <UploadSimple size={16} /> Importeren…
                        </button>
                        <button type="button" className="ui-hover" style={{ ...S.popupItem, color: 'var(--danger)' }} onClick={handleClearBoard}>
                            <Trash size={16} /> Bord leegmaken
                        </button>
                        {presets.length > 0 && <div style={S.popupDivider} />}
                        {presets.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                <button type="button" className="ui-hover" style={{ ...S.popupItem, flex: 1, minWidth: 0 }}
                                    title={`${p.name} (${p.pageCount} pagina's)`}
                                    onClick={() => { useBoardStore.getState().loadBoard(p.payload.pages, p.payload.activePageIdx); setMenu(null); }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                </button>
                                <button type="button" className="ui-hover" title="Verwijderen" aria-label={`Verwijder ${p.name}`}
                                    style={{ ...S.popupItem, padding: '0 8px', color: 'var(--danger)' }}
                                    onClick={() => setPresets(deleteBoardPreset(p.id))}>
                                    <Trash size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={S.sep} />

            {/* Exit */}
            <button type="button" className="ui-hover" style={S.exitBtn} onClick={() => setView('editor')}>
                <X size={18} /> Bordmodus verlaten
            </button>
        </div>
    );
}

const S = {
    bar: {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 14px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-panel)',
        flexShrink: 0,
    } as React.CSSProperties,
    group: { display: 'flex', alignItems: 'center', gap: '6px' } as React.CSSProperties,
    // 44px = minimum comfortable digibord touch target.
    toolBtn: {
        width: '44px', height: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '10px', border: '1px solid transparent', background: 'transparent',
        color: 'var(--text-main)', cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    toolActive: {
        background: 'var(--bg-active)', border: '1px solid var(--accent-purple)',
    } as React.CSSProperties,
    toolDisabled: { opacity: 0.35, cursor: 'not-allowed' } as React.CSSProperties,
    sep: { width: '1px', alignSelf: 'stretch', margin: '6px 2px', background: 'var(--border-color)' } as React.CSSProperties,
    pageLabel: {
        fontFamily: "'Azeret Mono', monospace", fontSize: '13px', color: 'var(--text-main)',
        minWidth: '52px', textAlign: 'center', userSelect: 'none',
    } as React.CSSProperties,
    exitBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        height: '44px', padding: '0 16px', borderRadius: '10px',
        border: '1px solid var(--border-color)', background: 'transparent',
        color: 'var(--text-main)', cursor: 'pointer',
        fontSize: '13px', fontFamily: "'Azeret Mono', monospace",
    } as React.CSSProperties,
    addBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        height: '44px', padding: '0 18px', borderRadius: '10px',
        border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
        color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600,
        fontSize: '13px', fontFamily: "'Azeret Mono', monospace",
    } as React.CSSProperties,
    popup: {
        position: 'absolute', bottom: '52px', left: 0, minWidth: '170px',
        display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 60,
    } as React.CSSProperties,
    popupItem: {
        display: 'flex', alignItems: 'center', gap: '8px',
        height: '40px', padding: '0 12px', borderRadius: '8px', textAlign: 'left',
        border: 'none', background: 'transparent', color: 'var(--text-main)',
        fontSize: '13px', cursor: 'pointer',
    } as React.CSSProperties,
    popupItemOn: { background: 'var(--bg-active)', fontWeight: 600 } as React.CSSProperties,
    popupDivider: { height: '1px', background: 'var(--border-color)', margin: '4px 6px' } as React.CSSProperties,
};
