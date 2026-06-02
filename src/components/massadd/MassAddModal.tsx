import { useMemo, useState } from 'react';
import { X, ArrowClockwise as RotateCw, Check, Plus } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { buildCatalog, catalogDomains, type CatalogItem } from '../../config/exerciseCatalog';
import { REGISTRY } from '../../config/exerciseRegistry';
import { baseApply } from '../../config/baseSettings';
import ExercisePreview from '../shared/ExercisePreview';
import ModalPortal from '../ui/ModalPortal';

interface Props {
    onClose: () => void;
}

const PREVIEW_H = 170;

export default function MassAddModal({ onClose }: Props) {
    const catalog = useMemo(() => buildCatalog(), []);
    const domains = useMemo(() => catalogDomains(catalog), [catalog]);
    const base = useWorksheetStore((s) => s.baseSettings);
    const addBlockFromType = useWorksheetStore((s) => s.addBlockFromType);
    const generateAllBlocks = useWorksheetStore((s) => s.generateAllBlocks);

    const [variantByType, setVariantByType] = useState<Record<string, string>>({});
    const [nonceByType, setNonceByType] = useState<Record<string, number>>({});
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const [activeDomains, setActiveDomains] = useState<Set<string>>(new Set());   // empty = all
    const [search, setSearch] = useState('');

    const chosenVariant = (item: CatalogItem) => {
        const key = variantByType[item.typeId];
        return item.variants.find(v => v.key === key) ?? item.variants[0];
    };

    // Resolve the same way addBlockFromType does, so the preview matches a real add.
    const resolvedConstraints = (item: CatalogItem, variantConstraints: Record<string, unknown>) => {
        const def = REGISTRY[item.typeId];
        const defaults = def.defaultConstraints(item.typeId);
        return { ...defaults, ...baseApply(base, defaults), ...variantConstraints };
    };

    const toggleSelected = (typeId: string) => setSelected(s => ({ ...s, [typeId]: !s[typeId] }));
    const reroll = (typeId: string) => setNonceByType(n => ({ ...n, [typeId]: (n[typeId] ?? 0) + 1 }));
    const toggleDomain = (id: string) => setActiveDomains(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    // Domain chips + free-text search both narrow the grid (AND). Search matches the
    // label, the context line, and any variant label (same .includes() as the sidebar).
    const needle = search.trim().toLowerCase();
    const visible = catalog.filter(i => {
        if (activeDomains.size > 0 && !activeDomains.has(i.domainId)) return false;
        if (!needle) return true;
        return i.label.toLowerCase().includes(needle)
            || i.context.toLowerCase().includes(needle)
            || i.variants.some(v => v.label.toLowerCase().includes(needle));
    });
    const selectedCount = Object.values(selected).filter(Boolean).length;

    const handleAddAll = () => {
        for (const item of catalog) {
            if (!selected[item.typeId]) continue;
            const variant = chosenVariant(item);
            const label = item.variants.length > 1 ? variant.label : item.label;
            addBlockFromType(item.typeId, label, variant.constraints);
        }
        generateAllBlocks();
        onClose();
    };

    return (
        <ModalPortal>
        <div style={S.overlay} onClick={onClose}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <div>
                        <h2 style={S.title}>Oefeningen toevoegen</h2>
                        <p style={S.subtitle}>Kies oefeningen, stel varianten in, en voeg ze in één keer toe. De basisinstellingen (zijbalk) bepalen de moeilijkheidsgraad.</p>
                    </div>
                    <button style={S.closeBtn} onClick={onClose} title="Sluiten" aria-label="Sluiten"><X size={20} /></button>
                </div>

                <div style={S.filterBar}>
                    <div style={S.chipGroup}>
                        {domains.length > 1 && (<>
                            <button onClick={() => setActiveDomains(new Set())} style={S.filterChip(activeDomains.size === 0, 'var(--text-muted)')}>
                                Alles
                            </button>
                            {domains.map(d => (
                                <button key={d.id} onClick={() => toggleDomain(d.id)} style={S.filterChip(activeDomains.has(d.id), `var(${d.accentVar})`)}>
                                    {d.label}
                                </button>
                            ))}
                        </>)}
                    </div>
                    <input
                        type="text"
                        placeholder="🔎 Zoek oefening…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={S.searchInput}
                    />
                </div>

                <div style={S.grid}>
                    {visible.length === 0 && (
                        <div style={S.noResults}>Geen oefening gevonden voor "{search.trim()}".</div>
                    )}
                    {visible.map((item) => {
                        const variant = chosenVariant(item);
                        const isSel = !!selected[item.typeId];
                        return (
                            <div key={item.typeId} style={S.card(isSel, item.accentVar)}>
                                <div style={S.cardHead}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={S.cardLabel}>{item.label}</div>
                                        <div style={S.cardContext}>{item.context}</div>
                                    </div>
                                    <button
                                        onClick={() => toggleSelected(item.typeId)}
                                        style={S.selectBtn(isSel)}
                                        title={isSel ? 'Uit selectie halen' : 'Aan selectie toevoegen'}
                                    >
                                        {isSel ? <Check size={14} /> : <Plus size={14} />}
                                        {isSel ? 'Gekozen' : 'Kies'}
                                    </button>
                                </div>

                                {item.variants.length > 1 && (
                                    <div style={S.variantRow}>
                                        {item.variants.map(v => (
                                            <button
                                                key={v.key}
                                                onClick={() => setVariantByType(s => ({ ...s, [item.typeId]: v.key }))}
                                                style={S.variantBtn(v.key === variant.key)}
                                            >
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div style={S.previewWrap}>
                                    <ExercisePreview
                                        typeId={item.typeId}
                                        constraints={resolvedConstraints(item, variant.constraints)}
                                        nonce={nonceByType[item.typeId] ?? 0}
                                        height={PREVIEW_H}
                                    />
                                    <button style={S.rerollBtn} onClick={() => reroll(item.typeId)} title="Ander voorbeeld" aria-label="Ander voorbeeld">
                                        <RotateCw size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={S.footer}>
                    <span style={S.footerCount}>{selectedCount} gekozen</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={S.cancelBtn} onClick={onClose}>Annuleren</button>
                        <button style={S.addAllBtn(selectedCount > 0)} onClick={handleAddAll} disabled={selectedCount === 0}>
                            Alles toevoegen{selectedCount > 0 ? ` (${selectedCount})` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
}

const S = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
    } as React.CSSProperties,
    modal: {
        width: '100%', maxWidth: '1200px', height: '100%', maxHeight: '90vh',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
    } as React.CSSProperties,
    header: {
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
        padding: '18px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0,
    } as React.CSSProperties,
    title: { margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    subtitle: { margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', maxWidth: '720px' } as React.CSSProperties,
    closeBtn: {
        flexShrink: 0, width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer',
        border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    } as React.CSSProperties,
    filterBar: {
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
        borderBottom: '1px solid var(--border-color)', flexShrink: 0,
    } as React.CSSProperties,
    chipGroup: { display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1, minWidth: 0 } as React.CSSProperties,
    searchInput: {
        flexShrink: 0, width: '240px', padding: '7px 12px', fontSize: '12px', fontFamily: 'inherit',
        background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px',
        color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box',
    } as React.CSSProperties,
    noResults: {
        gridColumn: '1 / -1', padding: '24px 4px', fontSize: '13px',
        color: 'var(--text-muted)', fontStyle: 'italic',
    } as React.CSSProperties,
    filterChip: (active: boolean, accent: string): React.CSSProperties => ({
        padding: '5px 12px', fontSize: '12px', borderRadius: '14px', cursor: 'pointer', fontWeight: 600,
        border: `1px solid ${active ? accent : 'var(--border-color)'}`,
        background: active ? accent : 'var(--bg-input)',
        color: active ? '#fff' : 'var(--text-muted)',
    }),
    grid: {
        flex: 1, overflowY: 'auto', padding: '16px 20px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '14px', alignContent: 'start',
    } as React.CSSProperties,
    card: (selected: boolean, accentVar: string): React.CSSProperties => ({
        border: `1px solid ${selected ? `var(${accentVar})` : 'var(--border-color)'}`,
        borderLeft: `3px solid var(${accentVar})`,
        borderRadius: '10px', background: 'var(--bg-dark)', padding: '12px',
        display: 'flex', flexDirection: 'column', gap: '10px',
        boxShadow: selected ? `0 0 0 1px var(${accentVar})` : 'none',
    }),
    cardHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' } as React.CSSProperties,
    cardLabel: { fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties,
    cardContext: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' } as React.CSSProperties,
    selectBtn: (selected: boolean): React.CSSProperties => ({
        flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '5px 10px', borderRadius: '14px', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
        border: `1px solid ${selected ? 'var(--accent-purple)' : 'var(--border-color)'}`,
        background: selected ? 'var(--accent-purple)' : 'var(--bg-input)',
        color: selected ? '#fff' : 'var(--text-muted)',
    }),
    variantRow: { display: 'flex', flexWrap: 'wrap', gap: '4px' } as React.CSSProperties,
    variantBtn: (active: boolean): React.CSSProperties => ({
        padding: '4px 8px', fontSize: '11px', borderRadius: '12px', cursor: 'pointer',
        border: '1px solid var(--border-color)',
        background: active ? 'var(--accent-purple)' : 'var(--bg-input)',
        color: active ? '#fff' : 'var(--text-muted)', fontWeight: active ? 700 : 400,
    }),
    previewWrap: { position: 'relative', background: '#fff', borderRadius: '6px', border: '1px solid var(--border-color)' } as React.CSSProperties,
    rerollBtn: {
        position: 'absolute', top: '6px', right: '6px',
        width: '26px', height: '26px', borderRadius: '6px', cursor: 'pointer',
        border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.9)', color: '#555',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    } as React.CSSProperties,
    footer: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderTop: '1px solid var(--border-color)', flexShrink: 0,
    } as React.CSSProperties,
    footerCount: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 } as React.CSSProperties,
    cancelBtn: {
        padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
        border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)',
    } as React.CSSProperties,
    addAllBtn: (enabled: boolean): React.CSSProperties => ({
        padding: '8px 18px', borderRadius: '6px', cursor: enabled ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 700,
        border: 'none', background: 'var(--accent-purple)', color: '#fff', opacity: enabled ? 1 : 0.5,
    }),
};
