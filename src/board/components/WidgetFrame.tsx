import { useRef } from 'react';
import { Trash, ArrowsOutCardinal, ArrowCounterClockwise, Eye, EyeSlash, ArrowLineUp } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import { naturalWidth } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

interface Props {
    widget: BoardWidget;
    selected: boolean;
    children: React.ReactNode;
    // Exercise widgets wire these; other kinds leave them undefined.
    onRegenerate?: () => void;
    onToggleAnswer?: () => void;
}

// Movable/resizable frame around every board widget. Pointer events (not mouse
// events) so finger + stylus on a digibord work identically to a mouse.
export default function WidgetFrame({ widget, selected, children, onRegenerate, onToggleAnswer }: Props) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const removeWidget = useBoardStore((s) => s.removeWidget);
    const bringToFront = useBoardStore((s) => s.bringToFront);
    const selectWidget = useBoardStore((s) => s.selectWidget);
    const gridSnap = useBoardStore((s) => s.gridSnap);
    const gridSize = useBoardStore((s) => s.gridSize);
    const tool = useBoardStore((s) => s.tool);

    // Drag bookkeeping lives in a ref — no re-render per pointermove beyond the store write.
    const drag = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; origX: number; origY: number; origW: number; origScale: number } | null>(null);

    const snap = (v: number) => (gridSnap ? Math.round(v / gridSize) * gridSize : Math.round(v));

    const startDrag = (e: React.PointerEvent, mode: 'move' | 'resize') => {
        e.stopPropagation();
        if (tool !== 'hand') selectWidget(widget.id);   // hand drags without selecting
        bringToFront(widget.id);
        drag.current = { mode, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y, origW: widget.w, origScale: widget.scale ?? 1 };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (d.mode === 'move') {
            updateWidget(widget.id, { x: Math.max(0, snap(d.origX + dx)), y: Math.max(0, snap(d.origY + dy)) });
        } else {
            // Corner handle = uniform zoom: the frame's zoom is w / naturalWidth, so
            // changing w scales the whole widget like an image — content never reflows.
            updateWidget(widget.id, { w: Math.max(120, Math.round(d.origW + dx)) });
        }
    };

    const endDrag = (e: React.PointerEvent) => {
        drag.current = null;
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    };

    // Frame zoom: `zoom` (unlike transform:scale) participates in layout, so the
    // frame height always matches the scaled content — no clipping, no dead space.
    // Zoom to the INNER width (minus the 2×2px border) or the content covers the
    // frame's right border.
    const frameZoom = (widget.w - 4) / naturalWidth(widget.kind);
    const textScale = widget.scale ?? 1;   // extra content zoom (exercise tekstgrootte)
    const handMode = tool === 'hand';

    return (
        <div
            style={{
                position: 'absolute', left: widget.x, top: widget.y, width: widget.w, zIndex: widget.z,
                border: selected ? '2px solid var(--accent-purple)' : '2px solid transparent',
                borderRadius: '10px', boxSizing: 'border-box',
                background: 'transparent',
                touchAction: 'none',
                cursor: handMode ? 'grab' : undefined,
            }}
            // Hand tool: any press drags the widget directly, nothing gets selected.
            onPointerDown={handMode ? (e) => startDrag(e, 'move') : (e) => { e.stopPropagation(); selectWidget(widget.id); }}
            onPointerMove={handMode ? onPointerMove : undefined}
            onPointerUp={handMode ? endDrag : undefined}
            onPointerCancel={handMode ? endDrag : undefined}
        >
            <div style={{ zoom: frameZoom, width: naturalWidth(widget.kind), pointerEvents: handMode ? 'none' : undefined }}>
                {/* Inner text zoom keeps the layout width constant: content reflows at
                    naturalW/textScale and zooms back up, so bigger text = same frame. */}
                <div style={{ zoom: textScale, width: naturalWidth(widget.kind) / textScale }}>
                    {children}
                </div>
            </div>

            {/* Action strip — only on the selected widget; big tap targets. */}
            {selected && (
                <div style={S.actions}>
                    <button type="button" title="Verslepen" aria-label="Verslepen" style={{ ...S.btn, cursor: 'grab', touchAction: 'none' }}
                        onPointerDown={(e) => startDrag(e, 'move')} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
                        <ArrowsOutCardinal size={18} />
                    </button>
                    {onRegenerate && (
                        <button type="button" title="Nieuwe oefeningen" aria-label="Nieuwe oefeningen" style={S.btn} onClick={onRegenerate}>
                            <ArrowCounterClockwise size={18} />
                        </button>
                    )}
                    {onToggleAnswer && (
                        <button type="button" title={widget.showAnswer ? 'Verberg oplossing' : 'Toon oplossing'} aria-label="Oplossing tonen/verbergen"
                            style={{ ...S.btn, ...(widget.showAnswer ? S.btnOn : {}) }} onClick={onToggleAnswer}>
                            {widget.showAnswer ? <EyeSlash size={18} /> : <Eye size={18} />}
                        </button>
                    )}
                    <button type="button" title="Naar voorgrond" aria-label="Naar voorgrond" style={S.btn} onClick={() => bringToFront(widget.id)}>
                        <ArrowLineUp size={18} />
                    </button>
                    <button type="button" title="Verwijderen" aria-label="Verwijderen" style={{ ...S.btn, color: 'var(--danger)' }} onClick={() => removeWidget(widget.id)}>
                        <Trash size={18} />
                    </button>
                </div>
            )}

            {/* Resize handle (bottom-right) */}
            {selected && (
                <div
                    title="Grootte aanpassen"
                    style={S.resizeHandle}
                    onPointerDown={(e) => startDrag(e, 'resize')} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
                />
            )}
        </div>
    );
}

const S = {
    actions: {
        position: 'absolute', top: '-46px', left: 0,
        display: 'flex', gap: '4px', padding: '4px',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
    } as React.CSSProperties,
    btn: {
        width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)',
        cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    btnOn: { background: 'var(--bg-active)', color: 'var(--accent-purple)' } as React.CSSProperties,
    resizeHandle: {
        position: 'absolute', right: '-10px', bottom: '-10px', width: '24px', height: '24px',
        borderRadius: '50%', background: 'var(--accent-purple)', border: '2px solid var(--bg-panel)',
        cursor: 'nwse-resize', touchAction: 'none',
    } as React.CSSProperties,
};
