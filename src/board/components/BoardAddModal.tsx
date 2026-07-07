import { useMemo, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import ModalShell from '../../components/ui/ModalShell';
import ExercisePreview from '../../components/shared/ExercisePreview';
import { buildCatalog, catalogDomains, type CatalogItem, type CatalogVariant } from '../../config/exerciseCatalog';
import { useBoardStore } from '../useBoardStore';
import { makeBoardBlock } from '../boardBlocks';

interface Props {
    onClose: () => void;
}

// Single-add exercise picker for the board (mass-add card style, but one tap =
// one widget on the board + modal closes; no multi-select/counts by design).
export default function BoardAddModal({ onClose }: Props) {
    const catalog = useMemo(() => buildCatalog(), []);
    const domains = useMemo(() => catalogDomains(catalog), [catalog]);
    const addWidget = useBoardStore((s) => s.addWidget);

    const [domain, setDomain] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return catalog.filter(it =>
            (!domain || it.domainId === domain) &&
            (!needle || it.label.toLowerCase().includes(needle) || it.context.toLowerCase().includes(needle)));
    }, [catalog, domain, search]);

    const handleAdd = (item: CatalogItem, variant: CatalogVariant) => {
        const block = makeBoardBlock(item.typeId, variant.constraints);
        if (!block) return;
        // Stagger new widgets a little so consecutive adds don't stack exactly.
        const n = useBoardStore.getState().pages[useBoardStore.getState().activePageIdx].widgets.length;
        addWidget({ kind: 'exercise', x: 60 + (n % 5) * 32, y: 40 + (n % 5) * 32, w: 460, block, showAnswer: false });
        onClose();
    };

    return (
        <ModalShell onClose={onClose} ariaLabel="Oefening toevoegen" maxWidth={1040}>
            <div style={S.head}>
                <h2 style={S.title}>Oefening toevoegen</h2>
                <input
                    type="text" placeholder="Zoeken…" value={search} onChange={(e) => setSearch(e.target.value)}
                    style={S.search}
                />
            </div>

            {/* Domain filter chips */}
            <div style={S.chips}>
                <button type="button" className="ui-hover" style={{ ...S.chip, ...(domain === null ? S.chipOn : {}) }} onClick={() => setDomain(null)}>Alles</button>
                {domains.map(d => (
                    <button key={d.id} type="button" className="ui-hover"
                        style={{ ...S.chip, ...(domain === d.id ? S.chipOn : {}) }}
                        onClick={() => setDomain(domain === d.id ? null : d.id)}>
                        {d.label}
                    </button>
                ))}
            </div>

            <div style={S.grid}>
                {visible.map(item => (
                    <div key={item.typeId} style={S.card}>
                        <div style={S.cardHead}>
                            <span style={S.cardLabel}>{item.label}</span>
                            <span style={S.cardContext}>{item.context}</span>
                        </div>
                        {/* NOT centered — width:100% viewers collapse when centered. */}
                        <div style={S.preview}>
                            <ExercisePreview typeId={item.typeId} constraints={item.variants[0].constraints} height={110} />
                        </div>
                        <div style={S.cardFoot}>
                            {item.variants.length === 1 ? (
                                <button type="button" className="ui-hover" style={S.addBtn} onClick={() => handleAdd(item, item.variants[0])}>
                                    <Plus size={14} /> Toevoegen
                                </button>
                            ) : (
                                item.variants.map(v => (
                                    <button key={v.key} type="button" className="ui-hover" style={S.variantBtn} onClick={() => handleAdd(item, v)}>
                                        <Plus size={12} /> {v.label}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ))}
                {visible.length === 0 && <div style={S.empty}>Geen oefeningen gevonden.</div>}
            </div>
        </ModalShell>
    );
}

const S = {
    head: { display: 'flex', alignItems: 'center', gap: '16px', padding: '4px 4px 10px' } as React.CSSProperties,
    title: { margin: 0, fontSize: '18px', fontFamily: "'Azeret Mono', monospace", color: 'var(--text-main)', flex: 1 } as React.CSSProperties,
    search: {
        width: '220px', height: '38px', padding: '0 12px', borderRadius: '10px',
        border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)',
        fontSize: '13px', outline: 'none',
    } as React.CSSProperties,
    chips: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '0 4px 12px' } as React.CSSProperties,
    chip: {
        height: '34px', padding: '0 14px', borderRadius: '17px', cursor: 'pointer',
        border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', fontSize: '12px',
    } as React.CSSProperties,
    chipOn: { background: 'var(--bg-active)', borderColor: 'var(--accent-purple)' } as React.CSSProperties,
    grid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px',
        maxHeight: '60vh', overflowY: 'auto', padding: '2px 4px 8px',
    } as React.CSSProperties,
    card: {
        border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-surface)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
    } as React.CSSProperties,
    cardHead: { display: 'flex', alignItems: 'baseline', gap: '8px', padding: '10px 12px 6px' } as React.CSSProperties,
    cardLabel: { fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', flex: 1 } as React.CSSProperties,
    cardContext: { fontSize: '11px', color: 'var(--text-muted)' } as React.CSSProperties,
    preview: { padding: '0 12px', background: 'transparent' } as React.CSSProperties,
    cardFoot: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 12px 12px' } as React.CSSProperties,
    addBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '6px', height: '36px', padding: '0 14px',
        borderRadius: '10px', border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
        color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer',
    } as React.CSSProperties,
    variantBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '4px', height: '34px', padding: '0 10px',
        borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent',
        color: 'var(--text-main)', fontSize: '12px', cursor: 'pointer',
    } as React.CSSProperties,
    empty: { padding: '24px', color: 'var(--text-muted)', fontSize: '13px' } as React.CSSProperties,
};
