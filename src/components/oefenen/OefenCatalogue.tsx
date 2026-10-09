import { useMemo, useState } from 'react';
import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { filterOefenLeaves, type OefenLeaf } from './oefenBuild';

interface Props {
    leaves: OefenLeaf[];
    // How often a leaf is already in the session (the "2×" counter).
    countOf: (leafId: string) => number;
    onAdd: (leaf: OefenLeaf) => void;
}

// The builder's left column: kiosk-capable leaves grouped by domain, with the sidebar's search
// and leerjaar filter on top. Click adds a row.
export default function OefenCatalogue({ leaves, countOf, onAdd }: Props) {
    const [search, setSearch] = useState('');
    // Starts at the sidebar's leerjaar but never writes it back: the sheet's grade is not the session's.
    const [grade, setGrade] = useState<Leerjaar | null>(() => useWorksheetStore.getState().selectedGrade);
    const visible = useMemo(() => filterOefenLeaves(leaves, search, grade), [leaves, search, grade]);
    const domains = useMemo(() => {
        const seen = new Map<string, { id: string; label: string; accentVar: string; leaves: OefenLeaf[] }>();
        for (const l of visible) {
            const dom = seen.get(l.domainId) ?? { id: l.domainId, label: l.domainLabel, accentVar: l.accentVar, leaves: [] };
            dom.leaves.push(l);
            seen.set(l.domainId, dom);
        }
        return [...seen.values()];
    }, [visible]);

    return (
        <div style={S.col}>
            <div style={S.filters}>
                <div style={S.searchWrap}>
                    <MagnifyingGlass size={15} weight="bold" style={S.searchIcon} aria-hidden="true" />
                    <input type="text" placeholder="Zoek oefening…" aria-label="Zoek oefening" value={search}
                        onChange={e => setSearch(e.target.value)} style={S.searchInput} />
                </div>
                <div className="seg-group" role="group" aria-label="Leerjaar" style={S.grades}>
                    <button className="seg-btn" aria-pressed={grade === null} onClick={() => setGrade(null)}>Alle</button>
                    {LEERJAREN.map(g => (
                        <button key={g} className="seg-btn" aria-pressed={grade === g} onClick={() => setGrade(g)}>L{g}</button>
                    ))}
                </div>
            </div>
            <div style={S.list}>
                {domains.length === 0 && search.trim() !== '' && (
                    <div style={S.noResults}>Geen oefening gevonden voor "{search}".</div>
                )}
                {domains.map(dom => {
                    let prevCtx: string | null = null;
                    const els: React.ReactNode[] = [];
                    for (const leaf of dom.leaves) {
                        if (leaf.context !== prevCtx) {
                            prevCtx = leaf.context;
                            els.push(<div key={`sub-${leaf.context}`} style={S.subHead}>{leaf.context}</div>);
                        }
                        const n = countOf(leaf.id);
                        els.push(
                            <button key={leaf.id} className="ui-hover" style={S.leafBtn} onClick={() => onAdd(leaf)} title="Toevoegen aan de sessie">
                                <Plus size={14} />
                                <span style={S.leafLabel}>{leaf.label}</span>
                                {n > 0 && <span style={S.leafCount}>{n}×</span>}
                            </button>,
                        );
                    }
                    return (
                        <div key={dom.id} style={S.domGroup}>
                            <div style={S.domHead}>
                                <span style={{ ...S.domDot, background: `var(${dom.accentVar})` }} aria-hidden />
                                <span>{dom.label}</span>
                            </div>
                            {els}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const S = {
    col: { width: '280px', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--separator)' } as React.CSSProperties,
    filters: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', padding: 'var(--sp-3)', borderBottom: '1px solid var(--separator)', flexShrink: 0 } as React.CSSProperties,
    searchWrap: { position: 'relative' } as React.CSSProperties,
    searchIcon: { position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' } as React.CSSProperties,
    // SYNC: sidebar.tsx searchInput, so the two "Zoek oefening…" fields look the same.
    searchInput: { width: '100%', padding: '6px 12px 6px 30px', fontSize: 'var(--text-sm)', fontFamily: 'inherit', backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' } as React.CSSProperties,
    grades: { width: '100%' } as React.CSSProperties,
    list: { flex: 1, overflowY: 'auto', padding: 'var(--sp-3)' } as React.CSSProperties,
    noResults: { padding: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
    domGroup: { marginBottom: 'var(--sp-4)' } as React.CSSProperties,
    domHead: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-main)', padding: 'var(--sp-1) var(--sp-2)' } as React.CSSProperties,
    domDot: { width: '8px', height: '8px', borderRadius: 'var(--radius-pill)', flexShrink: 0 } as React.CSSProperties,
    subHead: { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', padding: 'var(--sp-2) var(--sp-2) 2px' } as React.CSSProperties,
    leafBtn: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', width: '100%', textAlign: 'left', padding: '6px var(--sp-2)', borderRadius: 'var(--radius-xs)', border: 'none', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    leafLabel: { flex: 1, minWidth: 0 } as React.CSSProperties,
    leafCount: { fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent)' } as React.CSSProperties,
};
