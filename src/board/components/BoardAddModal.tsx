import { useMemo, useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import ExercisePreview from '../../components/shared/ExercisePreview';
import { buildCatalog, catalogDomains, type CatalogItem, type CatalogVariant } from '../../config/exerciseCatalog';
import { useBoardStore } from '../useBoardStore';
import { makeBoardBlock } from '../boardBlocks';
import { staggerPos } from '../addWidgets';

interface Props {
    onClose: () => void;
}

// Board-friendly variant naming: the hoofdrekenen rational leaves are just called
// "Optellen"/"Aftrekken"… in APP_STRUCTURE (they live under a Breuken subdomain);
// on the flat board catalog that context is gone, so name them explicitly.
function variantLabel(item: CatalogItem, v: CatalogVariant): string {
    if (v.constraints?.numberType === 'rational' && !/breuk/i.test(v.label)) {
        // Prefer the operation word from the variant itself ("… · Optellen"); the
        // item label can be the subdomain ("Hoofdrekenen") for multi-parent families.
        const op = v.label.match(/Optellen|Aftrekken|Vermenigvuldigen|Delen/i)?.[0]
            ?? item.label.split(/[\s(—]/)[0];
        return `${op} met breuken`;
    }
    return v.label;
}

// Single-add exercise picker for the board's Wiskunde category (mass-add card
// style, but one tap = one widget on the board + modal closes; no multi-select).
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
        // 660px ≈ a full exercise row (625px viewer budget + card padding), so every
        // type shows complete rows out of the box; the corner grip scales from there.
        const title = item.variants.length > 1 ? `${item.label} — ${variantLabel(item, variant)}` : item.label;
        addWidget({ kind: 'exercise', ...staggerPos(), w: 660, block, showAnswer: false, props: { title } });
        onClose();
    };

    return (
        // Side panel anchored next to the Toevoegen menu (bottom-left), not a
        // centered modal — the board stays visible while picking (Ruben decision).
        <div style={S.panel} aria-label="Wiskunde toevoegen" onPointerDown={(e) => e.stopPropagation()}>
            <div style={S.head}>
                <h2 style={S.title}>Wiskunde toevoegen</h2>
                <input
                    type="text" placeholder="Zoeken…" value={search} onChange={(e) => setSearch(e.target.value)}
                    style={S.search}
                />
                <button type="button" className="ui-hover" style={S.closeBtn} aria-label="Sluiten" onClick={onClose}>
                    <X size={18} />
                </button>
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
                                        <Plus size={12} /> {variantLabel(item, v)}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ))}
                {visible.length === 0 && <div style={S.empty}>Geen oefeningen gevonden.</div>}
            </div>
        </div>
    );
}

const S = {
    panel: {
        position: 'absolute', left: '12px', bottom: '74px', width: 'min(780px, calc(100vw - 24px))',
        maxHeight: 'calc(100% - 90px)', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '14px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)', zIndex: 60, padding: '12px',
    } as React.CSSProperties,
    closeBtn: {
        width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', flexShrink: 0,
    } as React.CSSProperties,
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
