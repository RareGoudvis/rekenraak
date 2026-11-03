import { useEffect, useState } from 'react';
import { Cursor, Selection, PenNib, Highlighter, Eraser, Shapes, Ruler, Plus, ArrowUUpLeft, ArrowUUpRight, HandGrabbing, TextT, GearSix, type Icon } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import type { BoardTool, InstrumentKind, InstrumentSnap } from '../boardTypes';
import { INSTRUMENT_KINDS, INSTRUMENT_LABELS, snapOf } from '../instrumentGeometry';
import InkFlyout, { EraserFlyout } from './InkFlyout';
import BoardSettingsMenu from './BoardSettingsMenu';

// Single-letter tool shortcuts (shown in each tooltip): the ink tools.
const TOOL_KEYS: Record<string, BoardTool> = { l: 'line', v: 'shape', s: 'lasso' };

// One rail button can stand for a few tools; its flyout picks between them.
const SELECT_GROUP: ReadonlyArray<{ key: BoardTool; icon: Icon; label: string }> = [
    // Two "select" tools would read the same: the cursor points at cards, Selecteren takes ink.
    { key: 'select', icon: Cursor, label: 'Aanwijzen (kaarten)' },
    { key: 'lasso', icon: Selection, label: 'Selecteren (S)' },
    { key: 'hand', icon: HandGrabbing, label: 'Verplaatsen (hand)' },
];
const LINE_TOOLS: ReadonlyArray<BoardTool> = ['line', 'shape'];

type Flyout = 'settings' | 'select' | 'pen' | 'marker' | 'eraser' | 'lines' | 'instruments';

interface Props {
    addOpen: boolean;
    onToggleAdd: () => void;
}

// The left rail of the board (Zijrail design, 72px): Bordinstellingen on top, the tools, then at
// the bottom undo / redo right above the big Toevoegen (owner: undo lives by the add button). Settings grow out of the rail as flyouts next
// to their button, never floating mid-board. Digibord-first: ≥ 40px targets, nothing on hover.
export default function BoardRail({ addOpen, onToggleAdd }: Props) {
    const tool = useBoardStore((s) => s.tool);
    const setTool = useBoardStore((s) => s.setTool);
    const undoStroke = useBoardStore((s) => s.undoStroke);
    const redoStroke = useBoardStore((s) => s.redoStroke);
    const canUndoInk = useBoardStore((s) => s.pages[s.activePageIdx].strokes.length > 0 || s._undoInk.length > 0);
    const canRedoInk = useBoardStore((s) => s._redoInk.length > 0);
    const instrumentKinds = useBoardStore((s) => (s.pages[s.activePageIdx].instruments ?? []).map(i => i.kind).join(','));

    const [flyout, setFlyout] = useState<Flyout | null>(null);
    // The select button remembers the member picked last in its flyout (S still picks the lasso).
    const [lastSelect, setLastSelect] = useState<BoardTool>('select');

    // Escape or a press outside the open flyout (and its button) closes it. Capture phase:
    // widgets stop their pointerdown from bubbling past the board.
    useEffect(() => {
        if (!flyout) return;
        const close = () => setFlyout(null);
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        const onDown = (e: PointerEvent) => {
            if (!(e.target instanceof Element && e.target.closest(`[data-board-menu="${flyout}"]`))) close();
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown, true);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown, true);
        };
    }, [flyout]);

    // Ignored while typing (tekst widget, titles, inspector fields) and with a modifier held,
    // so Ctrl+L and friends keep their browser meaning.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            const next = TOOL_KEYS[e.key.toLowerCase()];
            if (next) setTool(next);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [setTool]);

    const toggle = (f: Flyout) => setFlyout(flyout === f ? null : f);
    // First tap picks the tool (and opens its settings for the ink tools); a tap on the tool that
    // is already active toggles its flyout; any other tool closes it.
    const pick = (key: BoardTool, f: Flyout | null, opensOnPick: boolean) => {
        if (tool === key && f) { toggle(f); return; }
        setTool(key);
        setFlyout(opensOnPick ? f : null);
    };

    const selectOn = SELECT_GROUP.some(t => t.key === tool);
    const selectDef = SELECT_GROUP.find(t => t.key === (selectOn ? tool : lastSelect)) ?? SELECT_GROUP[0];
    const linesOn = LINE_TOOLS.includes(tool);
    const placed = instrumentKinds ? instrumentKinds.split(',') : [];

    return (
        <nav data-board-rail="" aria-label="Bordgereedschap" style={S.rail}>
            <div data-board-menu="settings" style={S.slot}>
                <RailButton icon={GearSix} label="Bordinstellingen" title="Bordinstellingen: achtergrond, pagina’s, bewaren"
                    active={flyout === 'settings'} expanded={flyout === 'settings'} onClick={() => toggle('settings')} />
                {flyout === 'settings' && (
                    <div data-rail-flyout="" style={{ ...S.flyout, top: '-4px', maxHeight: 'calc(100vh - 24px)', overflowY: 'auto' }} role="dialog" aria-label="Bordinstellingen">
                        <BoardSettingsMenu onDone={() => setFlyout(null)} />
                    </div>
                )}
            </div>

            <span style={S.sep} />

            <div data-board-menu="select" style={S.slot}>
                <RailButton icon={selectDef.icon} label="Selecteren" title={`Selecteren — nu: ${selectDef.label}. Tik nog eens voor de keuze.`}
                    active={selectOn} expanded={flyout === 'select'} group
                    onClick={() => { if (selectOn) toggle('select'); else { setTool(lastSelect); setFlyout(null); } }} />
                {flyout === 'select' && (
                    <div data-rail-flyout="" style={S.flyout} role="group" aria-label="Selecteren">
                        {SELECT_GROUP.map(t => (
                            <button key={t.key} type="button" className="ui-hover" aria-label={t.label} title={t.label} aria-pressed={tool === t.key}
                                style={{ ...S.choice, ...(tool === t.key ? S.choiceOn : {}) }}
                                onClick={() => { setTool(t.key); setLastSelect(t.key); setFlyout(null); }}>
                                <t.icon size={22} weight={tool === t.key ? 'fill' : 'regular'} /> {t.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {(['pen', 'marker'] as const).map(key => (
                <div key={key} data-board-menu={key} style={S.slot}>
                    <RailButton icon={key === 'pen' ? PenNib : Highlighter} label={key === 'pen' ? 'Pen' : 'Markeerstift'}
                        active={tool === key} expanded={flyout === key} onClick={() => pick(key, key, true)} />
                    {flyout === key && tool === key && (
                        <div data-rail-flyout="" style={S.flyout} role="group" aria-label={key === 'pen' ? 'Pen' : 'Markeerstift'}>
                            <InkFlyout tool={key} />
                        </div>
                    )}
                </div>
            ))}

            <div data-board-menu="eraser" style={S.slot}>
                <RailButton icon={Eraser} label="Gom" active={tool === 'eraser'} expanded={flyout === 'eraser'} onClick={() => pick('eraser', 'eraser', true)} />
                {flyout === 'eraser' && tool === 'eraser' && (
                    <div data-rail-flyout="" style={S.flyout} role="group" aria-label="Gom">
                        <EraserFlyout />
                    </div>
                )}
            </div>
            <div style={S.slot}>
                <RailButton icon={TextT} label="Tekst (tik op het bord)" active={tool === 'text'} onClick={() => pick('text', null, false)} />
            </div>

            <div data-board-menu="lines" style={S.slot}>
                <RailButton icon={Shapes} label="Lijn en vormen" title="Lijn en vormen (L / V)" active={linesOn} expanded={flyout === 'lines'} group
                    onClick={() => { if (linesOn) toggle('lines'); else { setTool('line'); setFlyout('lines'); } }} />
                {flyout === 'lines' && linesOn && (
                    <div data-rail-flyout="" style={S.flyout} role="group" aria-label="Lijn en vormen">
                        <InkFlyout tool={tool as 'line' | 'shape'} />
                    </div>
                )}
            </div>

            {/* Not a tool mode: the ruler opens the instruments; the pen keeps drawing. */}
            <div data-board-menu="instruments" style={S.slot}>
                <RailButton icon={Ruler} label="Meetinstrumenten" active={flyout === 'instruments' || placed.length > 0}
                    filled={placed.length > 0} expanded={flyout === 'instruments'} onClick={() => toggle('instruments')} />
                {flyout === 'instruments' && (
                    <div data-rail-flyout="" style={{ ...S.flyout, top: 'auto', bottom: '-8px' }}>
                        <InstrumentPopup on={placed} />
                    </div>
                )}
            </div>

            <span style={{ flex: 1 }} />

            <RailButton icon={ArrowUUpLeft} label="Ongedaan maken" title="Ongedaan maken (Ctrl+Z): alleen getekende inkt, widgets niet"
                disabled={!canUndoInk} muted onClick={undoStroke} />
            <RailButton icon={ArrowUUpRight} label="Opnieuw" title="Opnieuw (Ctrl+Y): alleen getekende inkt"
                disabled={!canRedoInk} muted onClick={redoStroke} />

            <span style={S.sep} />

            {/* data-board-add: the panel treats a press here as its own, so + toggles it. */}
            <button type="button" data-board-add="" className="ui-hover" aria-label="Toevoegen" title="Toevoegen" aria-expanded={addOpen}
                style={S.addBtn} onClick={onToggleAdd}>
                <Plus size={28} weight="bold" />
            </button>
        </nav>
    );
}

function RailButton({ icon: I, label, title, active, expanded, disabled, muted, filled, group, onClick }: {
    icon: Icon; label: string; title?: string; active?: boolean; expanded?: boolean; disabled?: boolean;
    muted?: boolean; filled?: boolean; group?: boolean; onClick: () => void;
}) {
    return (
        <button type="button" className={disabled ? undefined : 'ui-hover'} aria-label={label} title={title ?? label}
            aria-pressed={active} aria-expanded={expanded} disabled={disabled} onClick={onClick}
            style={{ ...S.btn, ...(muted ? { color: 'var(--text-muted)' } : {}), ...(active ? S.btnOn : {}), ...(disabled ? S.disabled : {}) }}>
            <I size={24} weight={active || filled ? 'fill' : 'regular'} />
            {/* A group button holds more than one tool: a corner mark says a second tap opens the choice. */}
            {group && <span aria-hidden="true" style={S.groupMark} />}
        </button>
    );
}

// The instruments flyout body: one toggle per instrument (at most one of each on a page), its
// Vastklikken ⚙, the board-wide handles toggle and hide all. Mounted only while open, so every
// opening starts with the ⚙ panels shut.
function InstrumentPopup({ on }: { on: string[] }) {
    const [snapOpen, setSnapOpen] = useState<InstrumentKind | null>(null);
    const keepHandles = useBoardStore((s) => s.boardSettings.keepHandles);
    const toggle = (kind: InstrumentKind) => {
        // A new instrument lands in the middle of the visible board.
        const r = document.querySelector('[data-board-canvas]')?.getBoundingClientRect();
        useBoardStore.getState().toggleInstrument(kind, r?.width ?? 0, r?.height ?? 0);
    };
    return (
        <div style={{ ...S.col, minWidth: '230px' }}>
            <div style={S.section}>Meetinstrumenten</div>
            {INSTRUMENT_KINDS.map(kind => (
                <div key={kind}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button type="button" className="ui-hover" aria-pressed={on.includes(kind)}
                            style={{ ...S.choice, flex: 1, ...(on.includes(kind) ? S.choiceOn : {}) }}
                            onClick={() => toggle(kind)}>
                            {INSTRUMENT_LABELS[kind]}{on.includes(kind) ? ': aan' : ''}
                        </button>
                        {/* Vastklikken lives on the placed instrument, so the ⚙ needs one on the page */}
                        <button type="button" className="ui-hover" title={`Vastklikken: ${INSTRUMENT_LABELS[kind]}`}
                            aria-label={`Vastklikken ${INSTRUMENT_LABELS[kind]}`} aria-expanded={snapOpen === kind}
                            disabled={!on.includes(kind)}
                            style={{ ...S.choice, width: '40px', padding: 0, justifyContent: 'center', ...(snapOpen === kind ? S.choiceOn : {}), ...(!on.includes(kind) ? S.disabled : {}) }}
                            onClick={() => setSnapOpen(snapOpen === kind ? null : kind)}>
                            <GearSix size={18} />
                        </button>
                    </div>
                    {snapOpen === kind && on.includes(kind) && <SnapSettings kind={kind} />}
                </div>
            ))}
            <div style={S.divider} />
            {/* board-wide: an instrument may hang past the edge, its grab handles stay reachable */}
            <label style={{ ...S.snapRow, padding: '0 10px', whiteSpace: 'nowrap' }} title="Draaihandvat en scharnier blijven op het bord, ook als het instrument over de rand steekt">
                <input type="checkbox" checked={keepHandles} onChange={(e) => useBoardStore.getState().setKeepHandles(e.target.checked)} />
                Handvatten op het bord houden
            </label>
            <button type="button" className="ui-hover" style={{ ...S.choice, ...(!on.length ? S.disabled : {}) }} disabled={!on.length}
                onClick={() => useBoardStore.getState().hideAllInstruments()}>
                Alles verbergen
            </button>
        </div>
    );
}

const SNAP_LABELS: [keyof Omit<InstrumentSnap, 'on'>, string][] = [
    ['angles45', 'Hoeken (0/45/90°)'],
    ['angles15', 'Hoeken (per 15°, met raster)'],
    ['grid', 'Rasterpunten'],
    ['endpoints', 'Lijneinden'],
];

// One instrument's "Vastklikken": a master switch and the four snap kinds (greyed while off).
function SnapSettings({ kind }: { kind: InstrumentKind }) {
    const inst = useBoardStore((s) => (s.pages[s.activePageIdx].instruments ?? []).find(i => i.kind === kind));
    if (!inst) return null;
    const snap = snapOf(inst);
    const set = (patch: Partial<InstrumentSnap>) => useBoardStore.getState().updateInstrument(inst.id, { snap: { ...snap, ...patch } });
    return (
        <div data-snap-settings={kind} style={S.snapBox}>
            <label style={{ ...S.snapRow, fontWeight: 600 }}>
                <input type="checkbox" checked={snap.on} onChange={(e) => set({ on: e.target.checked })} />
                Vastklikken {snap.on ? 'aan' : 'uit'}
            </label>
            {SNAP_LABELS.map(([k, label]) => (
                <label key={k} style={{ ...S.snapRow, paddingLeft: '22px', opacity: snap.on ? 1 : 0.45 }}>
                    <input type="checkbox" checked={snap[k]} disabled={!snap.on} onChange={(e) => set({ [k]: e.target.checked })} />
                    {label}
                </label>
            ))}
        </div>
    );
}

// 72px rail, 52px buttons: the mockup's sizes (a digibord finger, well above 40px).
const RAIL_W = 72;

const S = {
    rail: {
        width: `${RAIL_W}px`, flexShrink: 0, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '12px 0',
        background: 'var(--bg-surface)', borderRight: '1px solid var(--border-color)',
        // Above the board, the inspectors (50) and the add panel (60): flyouts open over them.
        position: 'relative', zIndex: 70,
    } as React.CSSProperties,
    slot: { position: 'relative' } as React.CSSProperties,
    btn: {
        position: 'relative', width: '52px', height: '52px', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text-main)',
        cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    // THE selected look (UI-GUIDE §2), with the mockup's 2px ring for a board seen from afar.
    btnOn: { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 2px var(--accent)' } as React.CSSProperties,
    disabled: { opacity: 0.35, cursor: 'not-allowed' } as React.CSSProperties,
    groupMark: {
        position: 'absolute', right: '6px', bottom: '6px', width: 0, height: 0,
        borderLeft: '6px solid transparent', borderBottom: '6px solid currentColor', opacity: 0.6,
    } as React.CSSProperties,
    sep: { width: '36px', height: '1px', background: 'var(--border-color)', margin: '8px 0', flexShrink: 0 } as React.CSSProperties,
    addBtn: {
        width: '56px', height: '56px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--accent)', color: 'var(--accent-on)',
        cursor: 'pointer', padding: 0, boxShadow: 'var(--shadow-2)',
    } as React.CSSProperties,
    // Grows out of the rail: starts at the rail's right edge (button 52 inside a 72 rail = 10px),
    // no left border, rounded on the board side only.
    flyout: {
        position: 'absolute', left: `calc(100% + ${(RAIL_W - 52) / 2}px)`, top: '-8px', zIndex: 1,
        padding: '10px 12px', boxSizing: 'border-box', width: 'max-content',
        background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderLeft: 'none',
        borderRadius: '0 var(--radius-lg) var(--radius-lg) 0', boxShadow: '4px 4px 16px rgba(0, 0, 0, 0.08)',
        display: 'flex', flexDirection: 'column', gap: '4px',
    } as React.CSSProperties,
    choice: {
        display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', padding: '0 12px',
        borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', textAlign: 'left',
        color: 'var(--text-main)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-ui)', cursor: 'pointer',
    } as React.CSSProperties,
    choiceOn: { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } as React.CSSProperties,
    col: { display: 'flex', flexDirection: 'column', gap: '2px' } as React.CSSProperties,
    section: { padding: '4px 6px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)', userSelect: 'none' } as React.CSSProperties,
    snapBox: {
        display: 'flex', flexDirection: 'column', gap: '2px', margin: '2px 6px 6px', padding: '6px 8px',
        borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-2)',
    } as React.CSSProperties,
    snapRow: {
        display: 'flex', alignItems: 'center', gap: '8px', minHeight: '36px',
        fontSize: 'var(--text-sm)', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    divider: { height: '1px', background: 'var(--border-color)', margin: '4px 6px' } as React.CSSProperties,
};
