import { useRef, useState } from 'react';
import { X, GearSix } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import GeldItemWidget from './widgets/GeldItemWidget';
import GeldPaletSettingsPanel from '../settings/GeldPaletSettings';
import { formatAmount } from '../../services/geld/geldGenerator';
import { GELD_CATALOGUE, geldItemProps, geldItemWidth, loadGeldPalet, saveGeldPalet, type GeldPaletSettings, type GeldType } from '../mathTools/geld';
import type { BoardWidget } from '../boardTypes';

// Money dock: drag a coin/bill FROM the palette onto the board — each drag duplicates it as a
// headerless geld-item widget that can be moved/removed. Its settings are per device (localStorage),
// not per board: the dock is a tool drawer, not board content.
export default function GeldPalet() {
    const setGeldPaletOpen = useBoardStore((s) => s.setGeldPaletOpen);
    const gridSize = useBoardStore((s) => s.gridSize);
    // Sum of every coin/bill on the page, for the "tel samen" readout.
    const pageSum = useBoardStore((s) => s.pages[s.activePageIdx].widgets
        .filter(w => w.kind === 'geld-item').reduce((t, w) => t + geldItemProps(w).denom, 0));
    const [cfg, setCfg] = useState<GeldPaletSettings>(loadGeldPalet);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const dragging = useRef<{ id: string; offX: number; offY: number } | null>(null);
    const real = cfg.style === 'realistisch';

    const update = (next: GeldPaletSettings) => { setCfg(next); saveGeldPalet(next); };
    const snap = (v: number) => (cfg.snap ? Math.round(v / gridSize) * gridSize : v);

    const canvasRect = (el: HTMLElement) =>
        (el.closest('[data-board-canvas]') as HTMLElement).getBoundingClientRect();

    const startDrag = (e: React.PointerEvent, item: { denom: number; type: GeldType }) => {
        e.preventDefault();
        const r = canvasRect(e.currentTarget as HTMLElement);
        const w = geldItemWidth(item.type, cfg.size);
        const board = useBoardStore.getState();
        const id = board.addWidget({
            kind: 'geld-item',
            x: e.clientX - r.left - w / 2,
            y: e.clientY - r.top - 30,
            w,
            props: { denom: item.denom, type: item.type, geldStyle: cfg.style, showHeader: false, ...(cfg.showLabels ? { showLabel: true } : {}) },
        });
        dragging.current = { id, offX: w / 2, offY: 30 };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const onMove = (e: React.PointerEvent) => {
        const d = dragging.current;
        if (!d) return;
        const r = canvasRect(e.currentTarget as HTMLElement);
        useBoardStore.getState().updateWidget(d.id, {
            x: Math.max(0, e.clientX - r.left - d.offX),
            y: Math.max(0, e.clientY - r.top - d.offY),
        });
    };
    const endDrag = () => {
        const d = dragging.current;
        dragging.current = null;
        if (!d || !cfg.snap) return;
        const w = useBoardStore.getState().pages[useBoardStore.getState().activePageIdx].widgets.find(x => x.id === d.id);
        if (w) useBoardStore.getState().updateWidget(d.id, { x: snap(w.x), y: snap(w.y) });
    };

    // Preview render uses a throwaway widget shell (same renderer as the dropped item).
    const preview = (item: { denom: number; type: string }): BoardWidget => ({
        id: `palet-${item.denom}`, kind: 'geld-item', x: 0, y: 0, w: 100, z: 0,
        props: { denom: item.denom, type: item.type, geldStyle: cfg.style, showLabel: cfg.showLabels },
    });

    return (
        <>
            <div style={S.dock} onPointerDown={(e) => e.stopPropagation()} data-geld-palet>
                <div style={S.head}>
                    <span style={S.title}>Geld</span>
                    <span style={{ display: 'flex' }}>
                        <button type="button" className="ui-hover" style={{ ...S.closeBtn, ...(settingsOpen ? S.on : {}) }} aria-label="Palet-instellingen" aria-pressed={settingsOpen} onClick={() => setSettingsOpen(o => !o)}>
                            <GearSix size={16} />
                        </button>
                        <button type="button" className="ui-hover" style={S.closeBtn} aria-label="Palet sluiten" onClick={() => setGeldPaletOpen(false)}>
                            <X size={16} />
                        </button>
                    </span>
                </div>
                <div className="seg-group" style={{ margin: '0 8px 8px' }}>
                    <button type="button" className="seg-btn" aria-pressed={!real} onClick={() => update({ ...cfg, style: 'tekening' })}>Schema</button>
                    <button type="button" className="seg-btn" aria-pressed={real} onClick={() => update({ ...cfg, style: 'realistisch' })}>Echt</button>
                </div>
                {cfg.showSum && (
                    <div style={S.sum} data-geld-sum aria-live="polite">
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SAMEN</span>
                        <span>{formatAmount(pageSum, 'euros')}</span>
                    </div>
                )}
                <div style={S.list}>
                    {GELD_CATALOGUE.filter(g => cfg.denoms.includes(g.denom)).map(item => (
                        <div
                            key={item.denom + item.type}
                            style={S.item} data-geld-palet-item
                            title="Sleep naar het bord"
                            onPointerDown={(e) => startDrag(e, item)}
                            onPointerMove={onMove}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                        >
                            <div style={{ zoom: 0.62, pointerEvents: 'none' }}>
                                <GeldItemWidget widget={preview(item)} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {settingsOpen && <GeldPaletSettingsPanel value={cfg} onChange={update} onClose={() => setSettingsOpen(false)} />}
        </>
    );
}

const S = {
    dock: {
        position: 'absolute', left: '12px', top: '12px', bottom: '12px', width: '128px',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 45, overflow: 'hidden',
    } as React.CSSProperties,
    head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 6px 6px 10px' } as React.CSSProperties,
    title: { fontFamily: "'Azeret Mono', monospace", fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' } as React.CSSProperties,
    closeBtn: {
        width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    on: { background: 'var(--bg-active)', color: 'var(--accent-purple)' } as React.CSSProperties,
    sum: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 8px 8px', padding: '6px 4px',
        borderRadius: '10px', background: 'var(--bg-active)', color: 'var(--text-main)',
        fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '16px',
    } as React.CSSProperties,
    list: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '4px 6px 10px' } as React.CSSProperties,
    item: {
        cursor: 'grab', touchAction: 'none', borderRadius: '10px', padding: '4px',
        border: '1px solid transparent',
        // A drag out of the palette must not select the bill/coin labels on its way.
        userSelect: 'none', WebkitUserSelect: 'none',
    } as React.CSSProperties,
};
