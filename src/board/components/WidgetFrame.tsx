import { useRef, useState } from 'react';
import { Trash, ArrowCounterClockwise, Eye, EyeSlash, GearSix, CopySimple } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import { naturalWidth, widgetTitle, KINDS_WITH_SETTINGS } from '../widgetSizing';
import type { BoardWidget } from '../boardTypes';

interface Props {
    widget: BoardWidget;
    selected: boolean;
    children: React.ReactNode;
    // Exercise widgets wire these; other kinds leave them undefined.
    onRegenerate?: () => void;
    onToggleAnswer?: () => void;
}

// Window-card widget chrome (owner design): title bar with editable title + action
// buttons, body below, resize grip bottom-right. The title bar is the drag handle
// and stays at UI size (outside the zoom wrapper). Pointer events (not mouse
// events) so finger + stylus on a digibord work identically to a mouse.
export default function WidgetFrame({ widget, selected, children, onRegenerate, onToggleAnswer }: Props) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const removeWidget = useBoardStore((s) => s.removeWidget);
    const duplicateWidget = useBoardStore((s) => s.duplicateWidget);
    const bringToFront = useBoardStore((s) => s.bringToFront);
    const selectWidget = useBoardStore((s) => s.selectWidget);
    const setInspectorOpen = useBoardStore((s) => s.setInspectorOpen);
    const gridSnap = useBoardStore((s) => s.gridSnap);
    const gridSize = useBoardStore((s) => s.gridSize);
    const tool = useBoardStore((s) => s.tool);

    const [editingTitle, setEditingTitle] = useState(false);

    // Drag bookkeeping lives in a ref — no re-render per pointermove beyond the store write.
    const drag = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; origX: number; origY: number; origW: number } | null>(null);

    const snap = (v: number) => (gridSnap ? Math.round(v / gridSize) * gridSize : Math.round(v));

    const startDrag = (e: React.PointerEvent, mode: 'move' | 'resize') => {
        e.stopPropagation();
        if (tool !== 'hand') selectWidget(widget.id);   // hand drags without selecting
        bringToFront(widget.id);
        drag.current = { mode, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y, origW: widget.w };
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
            // Corner grip = uniform zoom: the body's zoom is w / naturalWidth, so
            // changing w scales the whole widget like an image — content never reflows.
            updateWidget(widget.id, { w: Math.max(150, Math.round(d.origW + dx)) });
        }
    };

    const endDrag = (e: React.PointerEvent) => {
        drag.current = null;
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    };

    // Body zoom targets the inner width (frame width minus its 2×1/2px borders is
    // handled by border-box + padding 0; borders are ON the card).
    const innerW = widget.w - 2;   // 1px card border each side
    const frameZoom = innerW / naturalWidth(widget.kind);
    const textScale = widget.scale ?? 1;   // extra content zoom (exercise tekstgrootte)
    const handMode = tool === 'hand';
    const showHeader = widget.props?.showHeader !== false;
    const hasSettings = KINDS_WITH_SETTINGS.includes(widget.kind);

    const commitTitle = (v: string) => {
        updateWidget(widget.id, { props: { ...widget.props, title: v } });
        setEditingTitle(false);
    };

    return (
        <div
            style={{
                position: 'absolute', left: widget.x, top: widget.y, width: widget.w, zIndex: widget.z,
                background: '#ffffff', borderRadius: '12px',
                border: selected ? '2px solid var(--accent-purple)' : '1px solid rgba(0,0,0,0.18)',
                // Constant outer size whether selected or not (border grows inward).
                boxSizing: 'border-box', padding: selected ? 0 : '1px',
                boxShadow: '0 3px 14px rgba(0,0,0,0.14)',
                touchAction: 'none',
                cursor: handMode ? 'grab' : undefined,
                overflow: 'hidden',
            }}
            // Hand tool drags without selecting; headerless widgets (geld-items, kale
            // kaarten) drag from anywhere since they have no title-bar handle.
            onPointerDown={handMode || !showHeader ? (e) => startDrag(e, 'move') : (e) => { e.stopPropagation(); selectWidget(widget.id); bringToFront(widget.id); }}
            onPointerMove={handMode || !showHeader ? onPointerMove : undefined}
            onPointerUp={handMode || !showHeader ? endDrag : undefined}
            onPointerCancel={handMode || !showHeader ? endDrag : undefined}
        >
            {/* ── Title bar (drag handle; fixed UI size, outside the zoom) ── */}
            {showHeader && (
                <div
                    style={S.header}
                    onPointerDown={handMode ? undefined : (e) => startDrag(e, 'move')}
                    onPointerMove={handMode ? undefined : onPointerMove}
                    onPointerUp={handMode ? undefined : endDrag}
                    onPointerCancel={handMode ? undefined : endDrag}
                >
                    <span style={S.dot} />
                    {editingTitle ? (
                        <input
                            autoFocus defaultValue={widgetTitle(widget)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onBlur={(e) => commitTitle(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitTitle((e.target as HTMLInputElement).value); }}
                            style={S.titleInput}
                        />
                    ) : (
                        <span
                            style={S.title}
                            title="Klik om de titel te wijzigen"
                            onPointerDown={(e) => { e.stopPropagation(); selectWidget(widget.id); }}
                            onClick={() => setEditingTitle(true)}
                        >
                            {widgetTitle(widget)}
                        </span>
                    )}
                    <span style={{ flex: 1 }} />
                    <span style={S.btnRow} onPointerDown={(e) => e.stopPropagation()}>
                        {onRegenerate && (
                            <button type="button" title="Nieuwe oefeningen" aria-label="Nieuwe oefeningen" style={S.btn} onClick={onRegenerate}>
                                <ArrowCounterClockwise size={17} />
                            </button>
                        )}
                        {onToggleAnswer && (
                            <button type="button" title={widget.showAnswer ? 'Verberg oplossing' : 'Toon oplossing'} aria-label="Oplossing tonen/verbergen"
                                style={{ ...S.btn, ...(widget.showAnswer ? S.btnOn : {}) }} onClick={onToggleAnswer}>
                                {widget.showAnswer ? <EyeSlash size={17} /> : <Eye size={17} />}
                            </button>
                        )}
                        {hasSettings && (
                            <button type="button" title="Instellingen" aria-label="Widget-instellingen" style={S.btn}
                                onClick={() => { selectWidget(widget.id); setInspectorOpen(true); }}>
                                <GearSix size={17} />
                            </button>
                        )}
                        <button type="button" title="Dupliceren" aria-label="Dupliceren" style={S.btn} onClick={() => duplicateWidget(widget.id)}>
                            <CopySimple size={17} />
                        </button>
                        <button type="button" title="Verwijderen" aria-label="Verwijderen" style={{ ...S.btn, color: 'var(--danger)' }} onClick={() => removeWidget(widget.id)}>
                            <Trash size={17} />
                        </button>
                    </span>
                </div>
            )}

            {/* ── Body (zoomed content) ── */}
            <div style={{ zoom: frameZoom, width: naturalWidth(widget.kind) }}>
                {/* Inner text zoom keeps the layout width constant: content reflows at
                    naturalW/textScale and zooms back up, so bigger text = same frame. */}
                <div style={{ zoom: textScale, width: naturalWidth(widget.kind) / textScale, pointerEvents: handMode ? 'none' : undefined }}>
                    {children}
                </div>
            </div>

            {/* ── Resize grip (diagonal lines, bottom-right) ── */}
            {(selected || handMode) && (
                <div
                    title="Grootte aanpassen" aria-label="Grootte aanpassen"
                    style={S.grip}
                    onPointerDown={(e) => startDrag(e, 'resize')} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
                >
                    <svg width="14" height="14" viewBox="0 0 14 14">
                        <path d="M13 5 L5 13 M13 9 L9 13" stroke="rgba(0,0,0,0.4)" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                </div>
            )}
        </div>
    );
}

const S = {
    header: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.10)',
        cursor: 'grab', userSelect: 'none', background: 'rgba(0,0,0,0.02)',
    } as React.CSSProperties,
    dot: { width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-purple)', flexShrink: 0 } as React.CSSProperties,
    title: {
        fontFamily: "'Azeret Mono', monospace", fontSize: '13px', fontWeight: 600, color: '#111',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text',
    } as React.CSSProperties,
    titleInput: {
        fontFamily: "'Azeret Mono', monospace", fontSize: '13px', fontWeight: 600, color: '#111',
        border: '1px solid var(--accent-purple)', borderRadius: '6px', padding: '2px 6px',
        outline: 'none', background: '#fff', minWidth: 0, flex: 1,
    } as React.CSSProperties,
    btnRow: { display: 'flex', gap: '2px', flexShrink: 0 } as React.CSSProperties,
    btn: {
        width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', background: 'transparent', color: '#333',
        cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    btnOn: { background: 'var(--bg-active)', color: 'var(--accent-purple)' } as React.CSSProperties,
    grip: {
        position: 'absolute', right: '2px', bottom: '2px', width: '26px', height: '26px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '4px',
        cursor: 'nwse-resize', touchAction: 'none', boxSizing: 'border-box',
    } as React.CSSProperties,
};
