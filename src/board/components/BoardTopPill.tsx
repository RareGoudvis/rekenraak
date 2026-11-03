import { CaretLeft, CaretRight, FloppyDisk, CornersOut, CornersIn, X } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { useBoardStore } from '../useBoardStore';
import { promptSaveBoard, useBoardFullscreen } from '../boardChrome';

// Top-right pill (Zijrail design): pagina vorige / "1 / 2" / volgende, Bewaren, Volledig scherm and
// Bordmodus verlaten as an X. Icons only, so every one carries its words in aria-label + title.
export default function BoardTopPill() {
    const setView = useWorksheetStore((s) => s.setView);
    const activePageIdx = useBoardStore((s) => s.activePageIdx);
    const pageCount = useBoardStore((s) => s.pages.length);
    const gotoPage = useBoardStore((s) => s.gotoPage);
    const fullscreen = useBoardFullscreen();
    const first = activePageIdx === 0;
    const last = activePageIdx >= pageCount - 1;

    return (
        <div data-board-pill="" role="toolbar" aria-label="Bord" style={S.pill} onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className="ui-hover" aria-label="Vorige pagina" title="Vorige pagina" disabled={first}
                style={{ ...S.btn, width: '40px', ...(first ? S.disabled : {}) }} onClick={() => gotoPage(activePageIdx - 1)}>
                <CaretLeft size={18} />
            </button>
            <span style={S.page} aria-label={`Pagina ${activePageIdx + 1} van ${pageCount}`}>{activePageIdx + 1} / {pageCount}</span>
            <button type="button" className="ui-hover" aria-label="Volgende pagina" title="Volgende pagina" disabled={last}
                style={{ ...S.btn, width: '40px', ...(last ? S.disabled : {}) }} onClick={() => gotoPage(activePageIdx + 1)}>
                <CaretRight size={18} />
            </button>
            <span style={S.sep} />
            <button type="button" className="ui-hover" aria-label="Bewaren" title="Bewaren in Mijn borden" style={S.btn} onClick={() => { promptSaveBoard(); }}>
                <FloppyDisk size={20} />
            </button>
            {fullscreen.supported && (
                <button type="button" className="ui-hover" aria-label="Volledig scherm" title={fullscreen.on ? 'Volledig scherm verlaten' : 'Volledig scherm'}
                    aria-pressed={fullscreen.on} style={S.btn} onClick={fullscreen.toggle}>
                    {fullscreen.on ? <CornersIn size={20} /> : <CornersOut size={20} />}
                </button>
            )}
            <button type="button" className="ui-hover" aria-label="Bordmodus verlaten" title="Bordmodus verlaten" style={S.btn}
                onClick={() => { if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {}); setView('editor'); }}>
                <X size={20} />
            </button>
        </div>
    );
}

const S = {
    // Over the board's top-right corner, under the inspectors' top edge (they start below it).
    pill: {
        position: 'absolute', top: '12px', right: '16px', zIndex: 55,
        display: 'flex', alignItems: 'center', gap: '2px', padding: '4px 6px',
        background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-pill)',
        boxShadow: 'var(--shadow-2)',
    } as React.CSSProperties,
    btn: {
        width: '44px', height: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 'var(--radius-pill)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    disabled: { opacity: 0.35, cursor: 'not-allowed' } as React.CSSProperties,
    page: {
        padding: '0 4px', fontFamily: 'var(--font-sheet-math)', fontSize: 'var(--text-base)', fontWeight: 500,
        color: 'var(--text-main)', userSelect: 'none', whiteSpace: 'nowrap',
    } as React.CSSProperties,
    sep: { width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' } as React.CSSProperties,
};
