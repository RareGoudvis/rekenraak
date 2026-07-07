import { useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import GeldItemWidget from './widgets/GeldItemWidget';
import type { BoardWidget } from '../boardTypes';

// All euro denominations, largest first (mirrors the geld generator catalogue).
const PALET: Array<{ denom: number; type: 'bill' | 'euro-coin' | 'cent-coin' }> = [
    { denom: 50000, type: 'bill' }, { denom: 20000, type: 'bill' }, { denom: 10000, type: 'bill' },
    { denom: 5000, type: 'bill' }, { denom: 2000, type: 'bill' }, { denom: 1000, type: 'bill' }, { denom: 500, type: 'bill' },
    { denom: 200, type: 'euro-coin' }, { denom: 100, type: 'euro-coin' },
    { denom: 50, type: 'cent-coin' }, { denom: 20, type: 'cent-coin' }, { denom: 10, type: 'cent-coin' }, { denom: 5, type: 'cent-coin' },
    { denom: 2, type: 'cent-coin' }, { denom: 1, type: 'cent-coin' },
];

// Money dock: drag a coin/bill FROM the palette onto the board — each drag
// duplicates it as a headerless geld-item widget that can be moved/removed.
export default function GeldPalet() {
    const setGeldPaletOpen = useBoardStore((s) => s.setGeldPaletOpen);
    const [real, setReal] = useState(false);
    const dragging = useRef<{ id: string; offX: number; offY: number } | null>(null);

    const canvasRect = (el: HTMLElement) =>
        (el.closest('[data-board-canvas]') as HTMLElement).getBoundingClientRect();

    const startDrag = (e: React.PointerEvent, item: { denom: number; type: string }) => {
        e.preventDefault();
        const r = canvasRect(e.currentTarget as HTMLElement);
        const w = item.type === 'bill' ? 110 : 74;
        const board = useBoardStore.getState();
        const id = board.addWidget({
            kind: 'geld-item',
            x: e.clientX - r.left - w / 2,
            y: e.clientY - r.top - 30,
            w,
            props: { denom: item.denom, type: item.type, geldStyle: real ? 'realistisch' : 'tekening', showHeader: false },
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
    const endDrag = () => { dragging.current = null; };

    // Preview render uses a throwaway widget shell (same renderer as the dropped item).
    const preview = (item: { denom: number; type: string }): BoardWidget => ({
        id: `palet-${item.denom}`, kind: 'geld-item', x: 0, y: 0, w: 100, z: 0,
        props: { denom: item.denom, type: item.type, geldStyle: real ? 'realistisch' : 'tekening' },
    });

    return (
        <div style={S.dock} onPointerDown={(e) => e.stopPropagation()}>
            <div style={S.head}>
                <span style={S.title}>Geld</span>
                <button type="button" className="ui-hover" style={S.closeBtn} aria-label="Palet sluiten" onClick={() => setGeldPaletOpen(false)}>
                    <X size={16} />
                </button>
            </div>
            <div className="seg-group" style={{ margin: '0 8px 8px' }}>
                <button type="button" className="seg-btn" aria-pressed={!real} onClick={() => setReal(false)}>Tekening</button>
                <button type="button" className="seg-btn" aria-pressed={real} onClick={() => setReal(true)}>Echt</button>
            </div>
            <div style={S.list}>
                {PALET.map(item => (
                    <div
                        key={item.denom + item.type}
                        style={S.item}
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
    );
}

const S = {
    dock: {
        position: 'absolute', left: '12px', top: '12px', bottom: '12px', width: '128px',
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.25)', zIndex: 45, overflow: 'hidden',
    } as React.CSSProperties,
    head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 10px 6px' } as React.CSSProperties,
    title: { fontFamily: "'Azeret Mono', monospace", fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' } as React.CSSProperties,
    closeBtn: {
        width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    list: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '4px 6px 10px' } as React.CSSProperties,
    item: {
        cursor: 'grab', touchAction: 'none', borderRadius: '10px', padding: '4px',
        border: '1px solid transparent',
    } as React.CSSProperties,
};
