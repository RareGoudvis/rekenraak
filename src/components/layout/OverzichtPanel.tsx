import { useMemo, useRef, useState } from 'react';
import { Trash, DotsSixVertical, Lock, Copy, Plus } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { buildCatalog } from '../../config/exerciseCatalog';
import { DOMAIN_BY_TYPE } from '../../config/appstructure';
import MassAddModal from '../massadd/MassAddModal';
import type { DropZone } from '../../hooks/useSheetDnd';

// Left-panel "Overzicht" tab: an outline of every block on the sheet with reorder
// (drag + up/down), delete, page-break separators, and click-to-jump. Mirrors the
// canvas order 1:1; reorderBlocks/move* push history so Ctrl+Z works.
export default function OverzichtPanel() {
    const blocks = useWorksheetStore((s) => s.blocks);
    const activeBlockId = useWorksheetStore((s) => s.activeBlockId);
    const removeBlock = useWorksheetStore((s) => s.removeBlock);
    const duplicateBlock = useWorksheetStore((s) => s.duplicateBlock);
    // up/down removed — reorder is drag-and-drop (DotsSixVertical handle).
    const reorderBlocks = useWorksheetStore((s) => s.reorderBlocks);
    const swapBlocks = useWorksheetStore((s) => s.swapBlocks);
    const setActiveSelection = useWorksheetStore((s) => s.setActiveSelection);
    const blockPages = useWorksheetStore((s) => s.blockPages);
    const showScores = useWorksheetStore((s) => s.docSettings.showScores);

    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);
    const [overZone, setOverZone] = useState<DropZone | null>(null);
    const [massAddOpen, setMassAddOpen] = useState(false);
    // Ref as well as state: the pointer handlers run outside React's render, so they need
    // the live index the highlight is only a render behind on.
    const dragRef = useRef<{ from: number; over: number | null; zone: DropZone | null; moved: boolean } | null>(null);

    // typeId → human label ("Optellen", "Splitsen", …) from the addable catalog.
    const labelByType = useMemo(() => {
        const m: Record<string, string> = {};
        for (const item of buildCatalog()) if (!m[item.typeId]) m[item.typeId] = item.label;
        return m;
    }, []);

    const typeLabel = (typeId: string, instruction: string) =>
        labelByType[typeId] || (instruction || '').replace(/:\s*$/, '').trim() || typeId;

    const jumpTo = (id: string) => {
        setActiveSelection(id);
        document.getElementById(`block-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Three zones per row, same as the sheet drag (useSheetDnd): top third inserts
    // before the target, the middle third swaps the two, the bottom third inserts
    // after. This also replaces the old "drop on the last row appends" special case —
    // that behaviour now falls straight out of the after-zone of the last row.
    const onDrop = (fromIndex: number, toIndex: number, zone: DropZone) => {
        if (fromIndex !== toIndex) {
            if (zone === 'swap') {
                swapBlocks(blocks[fromIndex].id, blocks[toIndex].id);
            } else if (zone === 'before') {
                if (toIndex !== fromIndex + 1) {
                    // reorderBlocks splices the block out first, so every later index
                    // shifts down by one — without this a downward drag lands after
                    // the target instead of before it.
                    reorderBlocks(fromIndex, toIndex > fromIndex ? toIndex - 1 : toIndex);
                }
            } else {
                if (toIndex !== fromIndex - 1) {
                    // Mirror of 'before': land on the target's post-splice index when
                    // dragging up, or one past it when dragging down.
                    reorderBlocks(fromIndex, fromIndex < toIndex ? toIndex : toIndex + 1);
                }
            }
        }
        setDragIndex(null);
        setOverIndex(null);
        setOverZone(null);
    };

    // Pointer events, not native HTML5 drag-and-drop: an extension that hooks `dragstart`
    // (the "Claude in Chrome" one does) freezes the tab for the whole drag, and the sheet
    // drag was rewritten for exactly that reason — a second native surface in the same app
    // would just be the same bug in a smaller window. A row is click-to-jump, so a press
    // only becomes a drag past OUTLINE_THRESHOLD_PX of movement.
    const onRowPointerDown = (index: number) => (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0 || dragRef.current) return;
        if ((e.target as HTMLElement).closest('button, input, a')) return;
        const startX = e.clientX, startY = e.clientY;
        const state = { from: index, over: null as number | null, zone: null as DropZone | null, moved: false };
        dragRef.current = state;

        const onMove = (ev: PointerEvent) => {
            if (!state.moved) {
                if (Math.abs(ev.clientX - startX) < OUTLINE_THRESHOLD_PX
                    && Math.abs(ev.clientY - startY) < OUTLINE_THRESHOLD_PX) return;
                state.moved = true;
                setDragIndex(index);
            }
            const hit = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
            const row = hit?.closest('[data-ov-index]') as HTMLElement | null;
            const over = row ? Number(row.dataset.ovIndex) : null;
            let zone: DropZone | null = null;
            if (row) {
                const rect = row.getBoundingClientRect();
                const frac = (ev.clientY - rect.top) / rect.height;
                zone = frac < 1 / 3 ? 'before' : frac > 2 / 3 ? 'after' : 'swap';
            }
            if (over !== state.over) { state.over = over; setOverIndex(over); }
            if (zone !== state.zone) { state.zone = zone; setOverZone(zone); }
        };
        const stop = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey);
            dragRef.current = null;
        };
        const onUp = () => {
            const { moved, over, zone } = state;
            stop();
            if (moved && over !== null && zone !== null) onDrop(index, over, zone);
            else { setDragIndex(null); setOverIndex(null); setOverZone(null); }
            if (moved) {
                // The pointerup that ended a drag must not also jump to the row it landed on.
                const suppress = (ev: Event) => ev.stopPropagation();
                window.addEventListener('click', suppress, true);
                setTimeout(() => window.removeEventListener('click', suppress, true), 0);
            }
        };
        const onCancel = () => { stop(); setDragIndex(null); setOverIndex(null); setOverZone(null); };
        const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onCancel(); };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey);
    };

    // Dropping in a zone that would leave the order unchanged: before on self or on the
    // row right after it, after on self or on the row right before it, swap on self.
    const isRowNoop = (from: number, to: number, zone: DropZone) => {
        if (from === to) return true;
        if (zone === 'before') return to === from + 1;
        if (zone === 'after') return to === from - 1;
        return false;
    };

    return (
        <div style={S.wrap}>
            <div style={S.header}>Werkbundel · {blocks.length} {blocks.length === 1 ? 'blok' : 'blokken'}</div>

            {blocks.length === 0 && (
                <div style={S.empty}>Nog geen blokken. Voeg een oefening toe via het tabblad “Oefeningen”.</div>
            )}

            <div style={S.list}>
                {blocks.map((block, index) => {
                    // Page-break marker: explicit (pageBreakBefore) OR measured overflow
                    // (this block sits on a later page than the previous one).
                    const page = blockPages[block.id] ?? 0;
                    const prevPage = index > 0 ? (blockPages[blocks[index - 1].id] ?? 0) : 0;
                    const showBreak = block.pageBreakBefore || (index > 0 && page > prevPage);
                    // Only light the zone up when it would actually move something —
                    // a no-op drop (e.g. "before" onto the row right after the dragged
                    // one) stays unhighlighted, same as the sheet's SheetDropZones.
                    const isDropTarget = overIndex === index && dragIndex !== null && dragIndex !== index
                        && overZone !== null && !isRowNoop(dragIndex, index, overZone);
                    return (
                    <div key={block.id}>
                        {showBreak && <div style={S.pageBreak}>— pagina {page + 1} —</div>}

                        <div
                            data-ov-index={index}
                            onPointerDown={onRowPointerDown(index)}
                            onClick={() => jumpTo(block.id)}
                            style={{
                                ...S.row,
                                ...S.rowRail(DOMAIN_BY_TYPE[block.typeId]?.name),
                                ...(block.id === activeBlockId ? S.rowActive : {}),
                                ...(isDropTarget ? S.rowOverZone(overZone!) : {}),
                                ...(dragIndex === index ? { opacity: 0.5 } : {}),
                            }}
                        >
                            <span style={S.handle}><DotsSixVertical size={14} /></span>
                            <span style={S.badge}>{index + 1}</span>
                            <span style={S.labelCol}>
                                <span style={S.typeLabel}>
                                    {typeLabel(block.typeId, block.instructionText)}
                                    {block.locked && <Lock size={11} style={{ marginLeft: 4, verticalAlign: 'middle', color: 'var(--accent-purple)' }} />}
                                </span>
                                {block.instructionText && (
                                    <span style={S.instrLabel}>{block.instructionText}</span>
                                )}
                                <span style={S.metaLabel}>
                                    {DOMAIN_BY_TYPE[block.typeId]?.label ?? 'Bladonderdeel'}
                                    {' · '}{block.numberOfExercises || 0} opg.
                                    {showScores && (block.totalPoints || 0) > 0 ? ` · ${block.totalPoints} ptn` : ''}
                                </span>
                            </span>
                            <span style={S.rowActions} onClick={(e) => e.stopPropagation()}>
                                <button style={S.iconBtn} title="Dupliceren" aria-label="Blok dupliceren" onClick={() => duplicateBlock(block.id)}><Copy size={14} /></button>
                                <button style={{ ...S.iconBtn, color: 'var(--danger)' }} title="Verwijderen" aria-label="Blok verwijderen" onClick={() => removeBlock(block.id)}><Trash size={14} /></button>
                            </span>
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* Add a block without leaving the outline — reuses the mass-add modal. */}
            <button style={S.addBtn} onClick={() => setMassAddOpen(true)}>
                <Plus size={15} weight="bold" /> Oefeningen toevoegen
            </button>

            {massAddOpen && <MassAddModal onClose={() => setMassAddOpen(false)} />}
        </div>
    );
}

// Below this much movement a press on a row is a click (jump to the block), not a drag.
const OUTLINE_THRESHOLD_PX = 5;

const S = {
    wrap: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflowY: 'auto', padding: 'var(--sp-2) var(--sp-3)' } as React.CSSProperties,
    header: { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 6px 8px' } as React.CSSProperties,
    empty: { fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 6px' } as React.CSSProperties,
    list: { display: 'flex', flexDirection: 'column', gap: '4px' } as React.CSSProperties,
    pageBreak: { fontSize: '10px', color: 'var(--accent-purple)', textAlign: 'center', letterSpacing: '0.05em', margin: '6px 0 2px', pointerEvents: 'none', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
    // userSelect: none unconditionally, not only while dragIndex is set: the browser starts
    // selecting on the first pointer move, which is the same move that crosses the drag
    // threshold, so a state-gated rule always arrives one render too late and the labels of
    // every row the drag passes stay smeared blue. A row is click-to-jump, never text to copy.
    row: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid transparent', background: 'var(--bg-surface-2)', userSelect: 'none' } as React.CSSProperties,
    // Domain rail, same tint as the sidebar's — the outline reads back against the
    // list it was built from. Every typeId in DOMAIN_BY_TYPE has one (sheet furniture
    // maps to 'vraagstukken'); only an unknown typeId falls back to a plain edge.
    // The instruction as it is printed on the sheet, so a row can be matched to the page
    // by its heading as well as by its number.
    instrLabel: {
        fontSize: 'var(--text-xs)', color: 'var(--text-main)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    } as React.CSSProperties,
    rowRail: (name?: string): React.CSSProperties => ({
        borderLeft: `3px solid ${name ? `var(--domain-${name}-line)` : 'var(--separator)'}`,
    }),
    // Selection is an inset ring, NOT borderColor: the shorthand would repaint all four
    // sides and swallow the domain rail on the left, so a selected row lost the one thing
    // telling you which domain it belongs to. Ring = state, rail = identity, both visible.
    rowActive: { background: 'var(--accent-soft)', boxShadow: 'inset 0 0 0 1.5px var(--accent)' } as React.CSSProperties,
    // Three zones, same meaning as the sheet's SheetDropZones: a line at the top = insert
    // before, a filled row = swap, a line at the bottom = insert after. A row is too short
    // for three labelled bands, so the edge that lit up stands in for the label.
    // Like rowActive, this may only use outline/box-shadow: any border* here repaints all
    // four sides and swallows the domain rail, so the hovered row lost its identity colour
    // at the exact moment the teacher is looking for it.
    rowOverZone: (zone: DropZone): React.CSSProperties => ({
        outline: '1px dashed var(--accent)', outlineOffset: '-1px',
        ...(zone === 'before' ? { boxShadow: 'inset 0 2px 0 var(--accent)' } : {}),
        ...(zone === 'after' ? { boxShadow: 'inset 0 -2px 0 var(--accent)' } : {}),
        // Shorthand, not outlineWidth: React warns (and drops the value) when a longhand
        // is mixed with the shorthand set on the same object.
        ...(zone === 'swap' ? { background: 'var(--accent-soft)', outline: '2px dashed var(--accent)' } : {}),
    }),
    // touch-action: none on the handle only — the list itself must stay scrollable with
    // a finger, so a touch drag starts from the grip.
    handle: { color: 'var(--text-muted)', display: 'inline-flex', cursor: 'grab', flexShrink: 0, touchAction: 'none' } as React.CSSProperties,
    badge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0 } as React.CSSProperties,
    labelCol: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 } as React.CSSProperties,
    typeLabel: { fontSize: '13px', color: 'var(--text-main)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties,
    metaLabel: { fontSize: '11px', color: 'var(--text-muted)' } as React.CSSProperties,
    rowActions: { display: 'flex', gap: '2px', flexShrink: 0 } as React.CSSProperties,
    iconBtn: { background: 'none', border: 'none', padding: '3px', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', borderRadius: '4px' } as React.CSSProperties,
    note: { fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 6px 4px' } as React.CSSProperties,
    addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', marginTop: 'var(--sp-3)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--separator)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 } as React.CSSProperties,
};
