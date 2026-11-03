import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash, ArrowClockwise, Eye, EyeSlash, GearSix, CopySimple, DotsThree, MagnifyingGlassPlus, MagnifyingGlassMinus, Drop } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import { cardFitZoom, capWidenedWidth, naturalWidth, KINDS_WITH_SETTINGS } from '../widgetSizing';
import { cardLayoutWidth, cardNaturalWidth, cardTextScale, isTransparent } from '../settings/baseProps';
import { cardTitle, cardDotColor } from '../cardTitle';
import type { BoardWidget } from '../boardTypes';

const FIT_DEADBAND = 0.01;
// 40px = the board's minimum touch target (a digibord finger, no hover).
const BTN_PX = 40;
// Title bar height: one row of 40px buttons + 4px padding above and below.
const CARD_BAR_PX = BTN_PX + 8;
// A press that moves less than this is a tap (a title tap edits), not a drag.
const TAP_SLOP_PX = 4;
// Groter / Kleiner: one step of the corner grip's uniform zoom.
const SIZE_STEP = 1.2;
const MIN_W = 150;

interface Props {
    widget: BoardWidget;
    selected: boolean;
    children: React.ReactNode;
    // Exercise widgets wire these; other kinds leave them undefined.
    onRegenerate?: () => void;
    onToggleAnswer?: () => void;
}

// Card chrome (Zijrail design): a slim title bar that is always there (dot, title, 40px icon
// buttons, a Meer menu), the zoomed body, a resize grip. Nothing depends on hover: a digibord
// has none. A transparent or titleless card shows its bar only while selected, floating above
// the card so the content never jumps. Pointer events: finger, stylus and mouse behave alike.
export default function WidgetFrame({ widget, selected, children, onRegenerate, onToggleAnswer }: Props) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const bringToFront = useBoardStore((s) => s.bringToFront);
    const selectWidget = useBoardStore((s) => s.selectWidget);
    const setInspectorOpen = useBoardStore((s) => s.setInspectorOpen);
    const gridSnap = useBoardStore((s) => s.gridSnap);
    const gridSize = useBoardStore((s) => s.gridSize);
    const tool = useBoardStore((s) => s.tool);

    const frameRef = useRef<HTMLDivElement>(null);
    // Width of the widget layer (the board); 0 until measured (jsdom stays 0 = no cap).
    const [boardW, setBoardW] = useState(0);
    useLayoutEffect(() => {
        const layer = frameRef.current?.parentElement;
        if (!layer) return;
        const read = () => setBoardW(layer.clientWidth);
        read();
        const ro = new ResizeObserver(read);
        ro.observe(layer);
        return () => ro.disconnect();
    }, []);

    const [editingTitle, setEditingTitle] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    // Keyboard focus inside a card whose bar hides reveals it, so Tab reaches the buttons.
    const [focusWithin, setFocusWithin] = useState(false);
    const moreBtnRef = useRef<HTMLButtonElement>(null);

    // Drag bookkeeping lives in a ref: no re-render per pointermove beyond the store write.
    const drag = useRef<{
        mode: 'move' | 'resize'; startX: number; startY: number; origX: number; origY: number; origW: number;
        moved: boolean; titleTap: boolean;
    } | null>(null);

    const snap = (v: number) => (gridSnap ? Math.round(v / gridSize) * gridSize : Math.round(v));

    const startDrag = (e: React.PointerEvent, mode: 'move' | 'resize') => {
        e.stopPropagation();
        // A tap on the title of an already selected card edits it; the first tap only selects.
        const titleTap = mode === 'move' && selected && e.target instanceof Element && !!e.target.closest('[data-card-title]');
        if (tool !== 'hand') selectWidget(widget.id);   // hand drags without selecting
        bringToFront(widget.id);
        drag.current = { mode, startX: e.clientX, startY: e.clientY, origX: widget.x, origY: widget.y, origW: widget.w, moved: false, titleTap };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP_PX) return;
        d.moved = true;
        if (d.mode === 'move') {
            updateWidget(widget.id, { x: Math.max(0, snap(d.origX + dx)), y: Math.max(0, snap(d.origY + dy)) });
        } else {
            // Corner grip = uniform zoom: the body's zoom is w / naturalWidth, so
            // changing w scales the whole widget like an image; content never reflows.
            updateWidget(widget.id, { w: Math.max(MIN_W, Math.round(d.origW + dx / (cardNaturalWidth(widget) / naturalWidth(widget.kind)))) });
        }
    };

    const endDrag = (e: React.PointerEvent) => {
        const d = drag.current;
        drag.current = null;
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        if (d?.titleTap && !d.moved) setEditingTitle(true);
    };

    // A card whose content needs more than the kind's natural width (20-column honderdveld) is
    // drawn `widenFactor` wider at the SAME zoom, instead of zooming its content down.
    const naturalW = cardNaturalWidth(widget);
    const widenFactor = naturalW / naturalWidth(widget.kind);
    // A widened card never runs past the board's right edge: it shrinks (uniform zoom) to the room left.
    const outerW = capWidenedWidth(widget.w * widenFactor, widenFactor > 1, widget.x, boardW);
    const innerW = outerW - 2;   // 1px card border each side
    const frameZoom = innerW / naturalW;
    // Extra content zoom: exercise tekstgrootte × the baseline font size (kinds that scale their
    // own type sizes skip the zoom, so their fixed-size faces never clip).
    const textScale = cardTextScale(widget);
    const handMode = tool === 'hand';
    const layoutW = cardLayoutWidth(widget);

    // Content wider than the body (a 200 % exercise card, a 20-column honderdveld at XL) is
    // shrunk to fit instead of cut off by the body's overflow-x: hidden. The fit box keeps its
    // own-unit width, so the zoom does not reflow the content.
    const fitRef = useRef<HTMLDivElement>(null);
    const [fit, setFit] = useState(1);
    const measureFit = () => {
        const el = fitRef.current;
        if (!el) return;
        const next = cardFitZoom(el.scrollWidth, el.clientWidth);
        // Dead-band: glyph rounding under a zoom moves the content a pixel (618 ↔ 619 px for a
        // 20-column honderdveld), which would otherwise flip the fit back and forth forever.
        setFit(prev => (Math.abs(next - prev) < FIT_DEADBAND ? prev : next));
    };
    // Every render: a regenerated block, a new setting or a text zoom can change the width.
    useLayoutEffect(measureFit);
    useLayoutEffect(() => {
        const el = fitRef.current;
        if (!el) return;
        const ro = new ResizeObserver(measureFit);
        ro.observe(el);
        if (el.firstElementChild) ro.observe(el.firstElementChild);
        return () => ro.disconnect();
    }, []);

    const transparent = isTransparent(widget);
    const showHeader = widget.props?.showHeader !== false;
    // A transparent or titleless card has no bar of its own: it floats in only while selected.
    const floating = transparent || !showHeader;
    const barShown = !floating || selected || focusWithin || moreOpen;
    const hasSettings = KINDS_WITH_SETTINGS.includes(widget.kind);
    const title = cardTitle(widget);

    const commitTitle = (v: string) => {
        updateWidget(widget.id, { props: { ...widget.props, title: v } });
        setEditingTitle(false);
    };

    const bar = (
        <div
            data-card-bar=""
            style={floating ? {
                ...S.bar, ...S.floatingBar,
                // Above the card; a card at the board's very top gets it just below instead,
                // never over its content (a one-exercise card is barely taller than the bar).
                ...(widget.y >= CARD_BAR_PX + 4 ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                // Transparent: a quiet bar that does not cover the board (owner design, ~55 %).
                opacity: barShown ? (transparent && !focusWithin && !moreOpen ? 0.55 : 1) : 0,
                pointerEvents: barShown ? 'auto' : 'none',
            } : S.bar}
            onPointerDown={handMode ? undefined : (e) => startDrag(e, 'move')}
            onPointerMove={handMode ? undefined : onPointerMove}
            onPointerUp={handMode ? undefined : endDrag}
            onPointerCancel={handMode ? undefined : endDrag}
        >
            <span style={{ ...S.dot, background: cardDotColor(widget) }} />
            {editingTitle ? (
                <input
                    autoFocus defaultValue={title} aria-label="Titel"
                    onPointerDown={(e) => e.stopPropagation()}
                    onBlur={(e) => commitTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitTitle((e.target as HTMLInputElement).value);
                        if (e.key === 'Escape') setEditingTitle(false);
                    }}
                    style={S.titleInput}
                />
            ) : (
                <span data-card-title="" style={S.title} title={selected ? 'Tik nog eens om de titel te wijzigen' : title}>{title}</span>
            )}
            {/* A button press selects its card (Meer acts on it) but never starts a drag. */}
            <span style={S.btnRow} onPointerDown={(e) => {
                e.stopPropagation();
                if (!handMode) selectWidget(widget.id);
                bringToFront(widget.id);
            }}>
                {onRegenerate && (
                    <button type="button" className="ui-hover" title="Nieuwe oefeningen" aria-label="Nieuwe oefeningen"
                        style={{ ...S.btn, color: 'var(--accent)' }} onClick={onRegenerate}>
                        <ArrowClockwise size={20} weight="bold" />
                    </button>
                )}
                {onToggleAnswer && (
                    <button type="button" className="ui-hover" title={widget.showAnswer ? 'Oplossing verbergen' : 'Oplossing tonen'}
                        aria-label="Oplossing tonen" aria-pressed={!!widget.showAnswer}
                        style={{ ...S.btn, ...(widget.showAnswer ? S.btnOn : {}) }} onClick={onToggleAnswer}>
                        {widget.showAnswer ? <EyeSlash size={20} /> : <Eye size={20} />}
                    </button>
                )}
                {hasSettings && (
                    <button type="button" className="ui-hover" title="Instellingen" aria-label="Instellingen" style={S.btn}
                        onClick={() => { selectWidget(widget.id); setInspectorOpen(true); }}>
                        <GearSix size={20} />
                    </button>
                )}
                <button ref={moreBtnRef} type="button" className="ui-hover" title="Meer" aria-label="Meer"
                    aria-haspopup="menu" aria-expanded={moreOpen}
                    style={{ ...S.btn, ...(moreOpen ? S.btnOn : {}) }} onClick={() => setMoreOpen(o => !o)}>
                    <DotsThree size={22} weight="bold" />
                </button>
            </span>
        </div>
    );

    return (
        <div
            ref={frameRef}
            data-widget-frame
            data-transparent={transparent ? '' : undefined}
            style={{
                position: 'absolute', left: widget.x, top: widget.y, width: outerW, zIndex: widget.z,
                touchAction: 'none',
                cursor: handMode ? 'grab' : undefined,
                // Never taller than the board below its top edge: a tall exercise (omtrek, cijferen
                // delen) scrolls inside the card instead of running off-board with its resize grip.
                // 100% = the widget layer, which spans the board; 140px keeps title bar + grip.
                display: 'flex', flexDirection: 'column',
                maxHeight: `max(${WIDGET_MIN_VISIBLE_PX}px, calc(100% - ${widget.y + BOARD_EDGE_GAP_PX}px))`,
            }}
            // Hand tool drags without selecting; a card without a bar of its own (transparent,
            // titleless, a geld-item) drags from anywhere: its bar only floats in once selected.
            onPointerDown={handMode || floating ? (e) => startDrag(e, 'move') : (e) => { e.stopPropagation(); selectWidget(widget.id); bringToFront(widget.id); }}
            onPointerMove={handMode || floating ? onPointerMove : undefined}
            onPointerUp={handMode || floating ? endDrag : undefined}
            onPointerCancel={handMode || floating ? endDrag : undefined}
            onFocus={() => setFocusWithin(true)}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false); }}
        >
            {floating && bar}
            <div
                data-widget-card=""
                style={{
                    ...S.card,
                    ...(transparent ? {
                        background: 'transparent', border: '1px solid transparent', boxShadow: 'none',
                        // Without a card the selection still has to show: a dashed ring, no box.
                        outline: selected ? '2px dashed var(--accent)' : 'none', outlineOffset: '2px',
                    } : {
                        border: selected ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                        // Constant outer size whether selected or not (border grows inward).
                        padding: selected ? 0 : '1px',
                    }),
                }}
            >
                {!floating && bar}
                {/* ── Body (zoomed content), scrolling when the card hits the board's bottom edge ── */}
                <div data-widget-body style={S.body}>
                    <div style={{ zoom: frameZoom, width: naturalW }}>
                        {/* Inner text zoom keeps the layout width constant: content reflows at
                            naturalW/textScale and zooms back up, so bigger text = same frame. */}
                        <div style={{ zoom: textScale, width: layoutW, pointerEvents: handMode ? 'none' : undefined }}>
                            <div ref={fitRef} data-widget-fit="" style={{ width: layoutW, ...(fit < 1 ? { zoom: fit } : {}) }}>
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Resize grip (bottom-right: a small mark in a 40px hit area) ── */}
            {(selected || handMode) && (
                <div
                    title="Grootte aanpassen" aria-label="Grootte aanpassen"
                    style={S.grip}
                    onPointerDown={(e) => startDrag(e, 'resize')} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M13 5 L5 13 M13 9 L9 13" stroke="var(--text-muted)" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                </div>
            )}

            {moreOpen && <MoreMenu widget={widget} anchor={moreBtnRef} transparent={transparent} onClose={() => setMoreOpen(false)} />}
        </div>
    );
}

// The live widget: a menu action right after another must not patch a stale copy.
function liveWidget(fallback: BoardWidget): BoardWidget {
    return useBoardStore.getState().pages.flatMap(p => p.widgets).find(w => w.id === fallback.id) ?? fallback;
}

// The Meer menu: Doorzichtig, Kleiner / Groter, Dupliceren, Verwijderen. Portalled to the board
// root with a fixed position, so the card's own clipping never cuts it off.
function MoreMenu({ widget, anchor, transparent, onClose }: {
    widget: BoardWidget; anchor: React.RefObject<HTMLButtonElement | null>; transparent: boolean; onClose: () => void;
}) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const removeWidget = useBoardStore((s) => s.removeWidget);
    const duplicateWidget = useBoardStore((s) => s.duplicateWidget);
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos] = useState<React.CSSProperties>(() => {
        const r = anchor.current?.getBoundingClientRect();
        if (!r) return { left: 8, top: 8 };
        // Below the button, right-aligned to it; above it when the screen's bottom is near.
        const below = r.bottom + MENU_H_EST <= window.innerHeight;
        return { left: Math.max(8, r.right - MENU_W), ...(below ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) };
    });

    // Escape or a press outside the menu and its button closes it (capture: widgets stop propagation).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        const onDown = (e: PointerEvent) => {
            const t = e.target instanceof Node ? e.target : null;
            if (t && (menuRef.current?.contains(t) || anchor.current?.contains(t))) return;
            onClose();
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown, true);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown, true);
        };
    }, [onClose, anchor]);

    const resize = (f: number) => updateWidget(widget.id, { w: Math.max(MIN_W, Math.round(liveWidget(widget).w * f)) });
    const toggleTransparent = () => {
        updateWidget(widget.id, { props: { ...liveWidget(widget).props, transparent: !transparent } });
        onClose();
    };

    const root = document.querySelector('[data-whiteboard]') ?? document.body;
    return createPortal(
        // A portal still bubbles through the card in React: stop it, or a tap here drags the card.
        <div ref={menuRef} role="menu" aria-label="Meer" data-card-menu="" style={{ ...S.menu, ...pos }}
            onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" role="menuitemcheckbox" aria-checked={transparent} className="ui-hover"
                style={{ ...S.menuItem, ...(transparent ? S.menuItemOn : {}) }} onClick={toggleTransparent}>
                <Drop size={18} /> <span style={{ flex: 1 }}>Doorzichtig</span> <span style={S.menuState}>{transparent ? 'aan' : 'uit'}</span>
            </button>
            <div style={S.menuRow}>
                <button type="button" role="menuitem" className="ui-hover" style={{ ...S.menuItem, flex: 1 }} onClick={() => resize(1 / SIZE_STEP)}>
                    <MagnifyingGlassMinus size={18} /> Kleiner
                </button>
                <button type="button" role="menuitem" className="ui-hover" style={{ ...S.menuItem, flex: 1 }} onClick={() => resize(SIZE_STEP)}>
                    <MagnifyingGlassPlus size={18} /> Groter
                </button>
            </div>
            <button type="button" role="menuitem" className="ui-hover" style={S.menuItem} onClick={() => { duplicateWidget(widget.id); onClose(); }}>
                <CopySimple size={18} /> Dupliceren
            </button>
            <div style={S.menuDivider} />
            <button type="button" role="menuitem" className="ui-hover" style={{ ...S.menuItem, color: 'var(--danger)' }}
                onClick={() => { onClose(); removeWidget(widget.id); }}>
                <Trash size={18} /> Verwijderen
            </button>
        </div>,
        root,
    );
}

// Room left under a capped card so its grip never sits on the board's very last pixel.
const BOARD_EDGE_GAP_PX = 8;
// A card pushed low on the board still shows its title bar, a strip of content and the grip.
const WIDGET_MIN_VISIBLE_PX = 140;
const MENU_W = 240;
// Four 44px rows + a divider + padding: enough to decide whether the menu fits below the button.
const MENU_H_EST = 210;

const S = {
    card: {
        flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        // White paper whatever the board colour: the viewers assume a paper background (UI-GUIDE §3).
        background: '#ffffff', borderRadius: 'var(--radius-lg)', boxSizing: 'border-box',
        boxShadow: 'var(--shadow-2)',
    } as React.CSSProperties,
    // pan-y: a finger on a capped card scrolls it (the frame itself stays touch-action:none).
    body: { flex: '1 1 auto', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', touchAction: 'pan-y' } as React.CSSProperties,
    bar: {
        display: 'flex', alignItems: 'center', gap: '4px', height: `${CARD_BAR_PX}px`, boxSizing: 'border-box',
        padding: '4px 4px 4px 14px', borderBottom: '1px solid var(--border-color)',
        cursor: 'grab', userSelect: 'none', background: 'var(--bg-surface)', flexShrink: 0,
    } as React.CSSProperties,
    // Detached from the card: its own rounded surface, at least as wide as the card.
    floatingBar: {
        position: 'absolute', left: 0, zIndex: 2, minWidth: '100%', width: 'max-content',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-2)',
        transition: 'opacity var(--dur) var(--ease-out)',
    } as React.CSSProperties,
    dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 } as React.CSSProperties,
    title: {
        flex: 1, minWidth: 0, marginLeft: '6px',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    } as React.CSSProperties,
    titleInput: {
        flex: 1, minWidth: 0, height: '32px', marginLeft: '6px',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-main)',
        border: '1px solid var(--accent)', borderRadius: 'var(--radius-xs)', padding: '0 8px',
        outline: 'none', background: 'var(--bg-surface)',
    } as React.CSSProperties,
    btnRow: { display: 'flex', flexShrink: 0 } as React.CSSProperties,
    btn: {
        width: `${BTN_PX}px`, height: `${BTN_PX}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-muted)',
        cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    // THE selected look (UI-GUIDE §2): soft fill, accent glyph, 1px accent ring.
    btnOn: { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } as React.CSSProperties,
    grip: {
        position: 'absolute', right: 0, bottom: 0, width: '40px', height: '40px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '6px',
        cursor: 'nwse-resize', touchAction: 'none', boxSizing: 'border-box',
    } as React.CSSProperties,
    menu: {
        position: 'fixed', zIndex: 90, width: `${MENU_W}px`,
        display: 'flex', flexDirection: 'column', gap: '2px', padding: '6px',
        background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-3)',
    } as React.CSSProperties,
    menuRow: { display: 'flex', gap: '2px' } as React.CSSProperties,
    menuItem: {
        display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', padding: '0 12px',
        borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', textAlign: 'left',
        color: 'var(--text-main)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-ui)', cursor: 'pointer',
    } as React.CSSProperties,
    menuItemOn: { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } as React.CSSProperties,
    menuState: { fontSize: 'var(--text-sm)', color: 'inherit' } as React.CSSProperties,
    menuDivider: { height: '1px', background: 'var(--border-color)', margin: '4px 6px' } as React.CSSProperties,
};
