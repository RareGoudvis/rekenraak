import { useEffect, useState } from 'react';
import { CaretLeft, CaretRight, CaretDown, FloppyDisk, CornersOut, CornersIn, X, Plus, Copy, Broom, Trash } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { useBoardStore } from '../useBoardStore';
import { useBoardFullscreen } from '../boardChrome';
import BoardLibraryPopover from './BoardLibraryPopover';

type Pop = 'pages' | 'library';

// Top-right pill (Zijrail design): ◀ [Pagina 1 / 2 ▾] ▶ | Bewaren ▾ | Volledig scherm | X. The
// counter opens the page actions, Bewaren opens Mijn borden; both live only here (the gear menu
// no longer repeats them). Icon buttons carry their words in aria-label + title.
export default function BoardTopPill() {
    const setView = useWorksheetStore((s) => s.setView);
    const activePageIdx = useBoardStore((s) => s.activePageIdx);
    const pageCount = useBoardStore((s) => s.pages.length);
    const gotoPage = useBoardStore((s) => s.gotoPage);
    const fullscreen = useBoardFullscreen();
    const [pop, setPop] = useState<Pop | null>(null);
    const first = activePageIdx === 0;
    const last = activePageIdx >= pageCount - 1;

    // Escape or a press outside the open popover (and its button) closes it; capture phase,
    // because widgets stop their pointerdown from bubbling.
    useEffect(() => {
        if (!pop) return;
        const close = () => setPop(null);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        const onDown = (e: PointerEvent) => {
            if (!(e.target instanceof Element && e.target.closest(`[data-pill-menu="${pop}"]`))) close();
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown, true);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown, true);
        };
    }, [pop]);

    const toggle = (p: Pop) => setPop(pop === p ? null : p);

    return (
        <div data-board-pill="" role="toolbar" aria-label="Bord" style={S.pill} onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className="ui-hover" aria-label="Vorige pagina" title="Vorige pagina" disabled={first}
                style={{ ...S.btn, width: '40px', ...(first ? S.disabled : {}) }} onClick={() => gotoPage(activePageIdx - 1)}>
                <CaretLeft size={18} />
            </button>
            <div data-pill-menu="pages" style={S.slot}>
                <button type="button" className="ui-hover" aria-label={`Pagina ${activePageIdx + 1} van ${pageCount}: pagina’s beheren`}
                    title="Pagina toevoegen, dupliceren, leegmaken of verwijderen" aria-expanded={pop === 'pages'} aria-haspopup="dialog"
                    style={{ ...S.page, ...(pop === 'pages' ? S.on : {}) }} onClick={() => toggle('pages')}>
                    Pagina {activePageIdx + 1} / {pageCount} <CaretDown size={14} />
                </button>
                {pop === 'pages' && (
                    <div role="dialog" aria-label="Pagina’s" style={S.popover}>
                        <PageActions onDone={() => setPop(null)} />
                    </div>
                )}
            </div>
            <button type="button" className="ui-hover" aria-label="Volgende pagina" title="Volgende pagina" disabled={last}
                style={{ ...S.btn, width: '40px', ...(last ? S.disabled : {}) }} onClick={() => gotoPage(activePageIdx + 1)}>
                <CaretRight size={18} />
            </button>
            <span style={S.sep} />
            <div data-pill-menu="library" style={S.slot}>
                <button type="button" className="ui-hover" aria-label="Bewaren" title="Bewaren en Mijn borden" aria-expanded={pop === 'library'}
                    aria-haspopup="dialog" style={{ ...S.btn, width: '56px', gap: '2px', ...(pop === 'library' ? S.on : {}) }} onClick={() => toggle('library')}>
                    <FloppyDisk size={20} /><CaretDown size={12} />
                </button>
                {pop === 'library' && (
                    <div role="dialog" aria-label="Mijn borden" style={S.popover}>
                        <BoardLibraryPopover onDone={() => setPop(null)} />
                    </div>
                )}
            </div>
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

// The page actions that used to sit in the gear menu.
function PageActions({ onDone }: { onDone: () => void }) {
    const pageCount = useBoardStore((s) => s.pages.length);
    const run = (fn: () => void) => { fn(); onDone(); };
    const st = () => useBoardStore.getState();
    return (
        <div style={S.col}>
            <button type="button" className="ui-hover" style={S.item} onClick={() => run(st().addPage)}><Plus size={18} /> Pagina toevoegen</button>
            <button type="button" className="ui-hover" style={S.item} onClick={() => run(st().duplicatePage)}><Copy size={18} /> Pagina dupliceren</button>
            <button type="button" className="ui-hover" style={S.item}
                onClick={() => { if (window.confirm('Alles op deze pagina wissen?')) run(st().clearActivePage); }}>
                <Broom size={18} /> Pagina leegmaken
            </button>
            <button type="button" className="ui-hover" style={{ ...S.item, color: 'var(--danger)', ...(pageCount <= 1 ? S.disabled : {}) }}
                disabled={pageCount <= 1} onClick={() => run(st().removePage)}>
                <Trash size={18} /> Pagina verwijderen
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
    slot: { position: 'relative' } as React.CSSProperties,
    btn: {
        width: '44px', height: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 'var(--radius-pill)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    disabled: { opacity: 0.35, cursor: 'not-allowed' } as React.CSSProperties,
    // THE selected look (UI-GUIDE §2) while its popover is open.
    on: { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } as React.CSSProperties,
    page: {
        height: '44px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 12px',
        border: 'none', borderRadius: 'var(--radius-pill)', background: 'transparent', cursor: 'pointer',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap',
    } as React.CSSProperties,
    sep: { width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 4px' } as React.CSSProperties,
    // Hangs under its button, right-aligned so it never runs off the board's right edge.
    popover: {
        position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 1, width: 'max-content',
        padding: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-2)',
    } as React.CSSProperties,
    col: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '220px' } as React.CSSProperties,
    item: {
        display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', padding: '0 12px',
        borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', textAlign: 'left',
        color: 'var(--text-main)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-ui)', cursor: 'pointer',
    } as React.CSSProperties,
};
