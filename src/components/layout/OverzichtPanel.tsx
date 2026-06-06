import { useMemo, useState } from 'react';
import { Trash, DotsSixVertical, Lock, Copy, Plus } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { buildCatalog } from '../../config/exerciseCatalog';
import MassAddModal from '../massadd/MassAddModal';

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
    const setActiveSelection = useWorksheetStore((s) => s.setActiveSelection);
    const blockPages = useWorksheetStore((s) => s.blockPages);
    const showScores = useWorksheetStore((s) => s.docSettings.showScores);

    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);
    const [massAddOpen, setMassAddOpen] = useState(false);

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

    const onDrop = (toIndex: number) => {
        if (dragIndex !== null && dragIndex !== toIndex) reorderBlocks(dragIndex, toIndex);
        setDragIndex(null);
        setOverIndex(null);
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
                    return (
                    <div key={block.id}>
                        {showBreak && <div style={S.pageBreak}>— pagina {page + 1} —</div>}

                        <div
                            draggable
                            onDragStart={(e) => { setDragIndex(index); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragOver={(e) => { e.preventDefault(); setOverIndex(index); }}
                            onDrop={() => onDrop(index)}
                            onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                            onClick={() => jumpTo(block.id)}
                            style={{
                                ...S.row,
                                ...(block.id === activeBlockId ? S.rowActive : {}),
                                ...(overIndex === index && dragIndex !== null && dragIndex !== index ? S.rowOver : {}),
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
                                <span style={S.metaLabel}>
                                    {block.numberOfExercises || 0} opg.
                                    {showScores && (block.totalPoints || 0) > 0 ? ` · ${block.totalPoints} ptn` : ''}
                                </span>
                            </span>
                            <span style={S.rowActions} onClick={(e) => e.stopPropagation()}>
                                <button style={S.iconBtn} title="Dupliceren" onClick={() => duplicateBlock(block.id)}><Copy size={14} /></button>
                                <button style={{ ...S.iconBtn, color: 'var(--danger, #e11d48)' }} title="Verwijderen" onClick={() => removeBlock(block.id)}><Trash size={14} /></button>
                            </span>
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* Add a block without leaving the outline — reuses the mass-add modal. */}
            <button style={S.addBtn} onClick={() => setMassAddOpen(true)}>
                <Plus size={15} weight="bold" /> Oefening toevoegen
            </button>

            {massAddOpen && <MassAddModal onClose={() => setMassAddOpen(false)} />}
        </div>
    );
}

const S = {
    wrap: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflowY: 'auto', padding: 'var(--sp-2) var(--sp-3)' } as React.CSSProperties,
    header: { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '4px 6px 8px' } as React.CSSProperties,
    empty: { fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 6px' } as React.CSSProperties,
    list: { display: 'flex', flexDirection: 'column', gap: '4px' } as React.CSSProperties,
    pageBreak: { fontSize: '10px', color: 'var(--accent-purple)', textAlign: 'center', letterSpacing: '0.05em', margin: '6px 0 2px', pointerEvents: 'none', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid transparent', background: 'var(--bg-surface-2)' } as React.CSSProperties,
    rowActive: { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } as React.CSSProperties,
    rowOver: { borderColor: 'var(--accent)', borderStyle: 'dashed' } as React.CSSProperties,
    handle: { color: 'var(--text-muted)', display: 'inline-flex', cursor: 'grab', flexShrink: 0 } as React.CSSProperties,
    badge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0 } as React.CSSProperties,
    labelCol: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 } as React.CSSProperties,
    typeLabel: { fontSize: '13px', color: 'var(--text-main)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties,
    metaLabel: { fontSize: '11px', color: 'var(--text-muted)' } as React.CSSProperties,
    rowActions: { display: 'flex', gap: '2px', flexShrink: 0 } as React.CSSProperties,
    iconBtn: { background: 'none', border: 'none', padding: '3px', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', borderRadius: '4px' } as React.CSSProperties,
    note: { fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 6px 4px' } as React.CSSProperties,
    addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', marginTop: 'var(--sp-3)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--separator)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 } as React.CSSProperties,
};
