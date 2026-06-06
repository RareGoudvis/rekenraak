import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus } from '@phosphor-icons/react';
import { APP_STRUCTURE, type Domain } from '../../config/appstructure';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { REGISTRY } from '../../config/exerciseRegistry';
import { baseApply } from '../../config/baseSettings';
import ExercisePreview from '../shared/ExercisePreview';
import { LEERJAREN, leafAllowedForGrade, type Leerjaar } from '../../config/gradePresets';
import PopupSelect from '../ui/PopupSelect';
import OverzichtPanel from './OverzichtPanel';

// Walk the domain tree keeping only entries whose label matches the search needle.
// A parent survives when any of its descendants match. Returns the filtered tree.
function filterTree(domains: Domain[], query: string): Domain[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return domains;
    const result: Domain[] = [];
    for (const dom of domains) {
        const subs = [];
        for (const sub of dom.subdomains) {
            const types = [];
            for (const type of sub.types) {
                if (type.children) {
                    const kids = type.children.filter(l => l.label.toLowerCase().includes(needle));
                    if (kids.length > 0 || type.label.toLowerCase().includes(needle)) {
                        types.push({ ...type, children: kids.length > 0 ? kids : type.children });
                    }
                } else if (type.label.toLowerCase().includes(needle)) {
                    types.push(type);
                }
            }
            if (types.length > 0 || sub.label.toLowerCase().includes(needle)) {
                subs.push({ ...sub, types });
            }
        }
        if (subs.length > 0 || dom.label.toLowerCase().includes(needle)) {
            result.push({ ...dom, subdomains: subs });
        }
    }
    return result;
}

// Soft leerjaar filter: drop leaves above the chosen grade and prune now-empty
// parents. grade == null → unchanged (Alle leerjaren).
function filterByGrade(domains: Domain[], grade: Leerjaar | null): Domain[] {
    if (grade == null) return domains;
    const result: Domain[] = [];
    for (const dom of domains) {
        const subs = [];
        for (const sub of dom.subdomains) {
            const types = [];
            for (const type of sub.types) {
                if (type.children) {
                    const kids = type.children.filter(l => leafAllowedForGrade(l, grade));
                    if (kids.length > 0) types.push({ ...type, children: kids });
                } else if (leafAllowedForGrade(type, grade)) {
                    types.push(type);
                }
            }
            if (types.length > 0) subs.push({ ...sub, types });
        }
        if (subs.length > 0) result.push({ ...dom, subdomains: subs });
    }
    return result;
}

export default function Sidebar() {
    const addBlockFromType = useWorksheetStore((state) => state.addBlockFromType);
    const curriculum = useWorksheetStore((state) => state.curriculum);
    const selectedGrade = useWorksheetStore((state) => state.selectedGrade);
    const setSelectedGrade = useWorksheetStore((state) => state.setSelectedGrade);
    const baseSettings = useWorksheetStore((state) => state.baseSettings);
    const sidebarPreview = useWorksheetStore((state) => state.sidebarPreview);
    const locked = !!curriculum?.locked;

    // Hover example: after a short delay over a leaf, show a live preview card anchored
    // to its right (or left if it would overflow). Gated on the sidebarPreview setting.
    const [preview, setPreview] = useState<{ typeId: string; constraints: Record<string, unknown>; top: number; left: number } | null>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resolveConstraints = (typeId: string, override?: Record<string, unknown>): Record<string, unknown> | null => {
        const def = REGISTRY[typeId];
        if (!def) return null;
        const defaults = def.defaultConstraints(typeId);
        return { ...defaults, ...baseApply(baseSettings, defaults), ...(override ?? {}) };
    };
    const leafHover = (typeId: string, override?: Record<string, unknown>) => ({
        onMouseEnter: (e: React.MouseEvent) => {
            if (!sidebarPreview) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const W = 290;
            const left = rect.right + 12 + W > window.innerWidth ? rect.left - W - 12 : rect.right + 12;
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
            hoverTimer.current = setTimeout(() => {
                const constraints = resolveConstraints(typeId, override);
                if (constraints) setPreview({ typeId, constraints, top: rect.top, left });
            }, 250);
        },
        onMouseLeave: () => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
            setPreview(null);
        },
    });

    const [openSubdomain, setOpenSubdomain] = useState<string | null>(null);
    // Multiple type-accordions can be open at once — opening a subdomain expands them all.
    const [openTypes, setOpenTypes] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<'oefeningen' | 'overzicht'>('oefeningen');

    const isSearching = search.trim().length > 0;
    const tree = useMemo(
        () => filterByGrade(filterTree(APP_STRUCTURE.filter(d => !d.hidden), search), selectedGrade),
        [search, selectedGrade],
    );


    const toggleSubdomain = (id: string) => {
        if (isSearching) return;  // tree is force-expanded during search
        if (openSubdomain === id) { setOpenSubdomain(null); setOpenTypes(new Set()); return; }
        setOpenSubdomain(id);
        // Auto-expand every accordion type under this subdomain (fewer clicks).
        const sub = APP_STRUCTURE.flatMap(d => d.subdomains).find(s => s.id === id);
        const typeIds = (sub?.types ?? []).filter(t => t.children).map(t => t.id);
        setOpenTypes(new Set(typeIds));
    };

    const toggleType = (id: string) => {
        if (isSearching) return;
        setOpenTypes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    return (
        <aside className="mac-vibrant" style={S.aside}>
            {/* Tab switch: exercise palette vs the block outline (Overzicht). The logo now
                lives in the full-width topbar, so the sidebar starts straight at the tabs. */}
            <div className="seg-group" style={{ ...S.tabSwitch, marginTop: 'var(--sp-3)' }}>
                <button className="seg-btn" aria-pressed={tab === 'oefeningen'} onClick={() => setTab('oefeningen')}>Oefeningen</button>
                <button className="seg-btn" aria-pressed={tab === 'overzicht'} onClick={() => setTab('overzicht')} data-tour="overzicht-tab">Overzicht</button>
            </div>

            {tab === 'overzicht' ? <OverzichtPanel /> : (<>

            {locked && (
                <div style={S.lockedPalette}>
                    <div style={S.lockedBanner}>
                        🔒 Vergrendelde werkbundel — je kan enkel oefeningen uit deze lijst toevoegen.
                    </div>
                    <div style={S.lockedListTitle}>Toegestane oefeningen</div>
                    <div style={S.navArea}>
                        {(curriculum?.allowedTypes ?? []).map((t, i) => (
                            <button
                                key={`${t.typeId}-${i}`}
                                className="sidebar-leaf"
                                style={S.leafBtn}
                                onClick={() => addBlockFromType(t.typeId, t.label, t.lockedConstraints)}
                                {...leafHover(t.typeId, t.lockedConstraints)}
                            >
                                <span style={S.addBadge}><Plus size={13} weight="bold" /></span>
                                <span>{t.label}</span>
                            </button>
                        ))}
                        {(curriculum?.allowedTypes ?? []).length === 0 && (
                            <div style={S.noResults}>Geen oefeningen in deze werkbundel.</div>
                        )}
                    </div>
                </div>
            )}

            {!locked && (<>
            {/* Search + leerjaar share one row. Leerjaar shortened (L1…L6) to stay compact. */}
            <div style={S.searchWrap}>
                <input
                    type="text"
                    placeholder="🔎 Zoek oefening…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ ...S.searchInput, flex: 1 }}
                />
                <div style={{ flexShrink: 0 }}>
                    <PopupSelect
                        value={selectedGrade ?? 0}
                        options={[{ value: 0, label: 'Alle' }, ...LEERJAREN.map(g => ({ value: g, label: `L${g}` }))]}
                        onChange={(v) => setSelectedGrade(v === 0 ? null : (v as Leerjaar))}
                        ariaLabel="Leerjaar kiezen"
                    />
                </div>
            </div>

            <hr style={S.divider} />

            <div style={S.navArea} data-tour="sidebar-nav">
                {tree.length === 0 && isSearching && (
                    <div style={S.noResults}>Geen oefening gevonden voor "{search}".</div>
                )}
                {tree.map((domain) => {
                    const accent = `var(${domain.accentVar})`;

                    return (
                        <div key={domain.id} style={S.domainWrap}>
                            {/* Domain section header: a full-width accent-tinted band with a
                               dot + the domain name in the domain's accent color. */}
                            <div style={S.sectionHeader(accent)}>
                                <span style={S.sectionDot(accent)} />
                                <span>{domain.label}</span>
                            </div>
                            <div style={S.domainContent}>
                                    {domain.subdomains.map((subdomain) => {
                                        const subOpen = isSearching || openSubdomain === subdomain.id;

                                        return (
                                            <div key={subdomain.id}>
                                                {/* Subdomain header */}
                                                <button
                                                    className="sidebar-row"
                                                    style={S.subdomainBtn(subOpen, accent, subdomain.placeholder)}
                                                    onClick={() => toggleSubdomain(subdomain.id)}
                                                >
                                                    <span style={S.navText}>{subdomain.label}</span>
                                                    <span style={S.chevron(subOpen)}>›</span>
                                                </button>

                                                {/* Subdomain content */}
                                                {subOpen && (
                                                    <div style={S.subdomainContent}>
                                                        {subdomain.types.map((type) => {
                                                            // Placeholder leaf (no children, placeholder flag)
                                                            if (!type.children && type.placeholder) {
                                                                return (
                                                                    <div key={type.id} style={S.placeholderLeaf}>
                                                                        <span style={S.placeholderBadge}>·</span>
                                                                        <span>{type.label}</span>
                                                                    </div>
                                                                );
                                                            }

                                                            // Leaf type (no children, not placeholder)
                                                            if (!type.children) {
                                                                return (
                                                                    <button
                                                                        key={type.id}
                                                                        className="sidebar-leaf"
                                                                        style={S.leafBtn}
                                                                        onClick={() => addBlockFromType(type.typeId!, type.label, type.defaultConstraints)}
                                                                        {...leafHover(type.typeId!, type.defaultConstraints)}
                                                                    >
                                                                        <span style={S.addBadge}><Plus size={13} weight="bold" /></span>
                                                                        <span>{type.label}</span>
                                                                    </button>
                                                                );
                                                            }

                                                            // Accordion type (has children)
                                                            const typeOpen = isSearching || openTypes.has(type.id);
                                                            const isPhAcc = !!type.placeholder;
                                                            return (
                                                                <div key={type.id}>
                                                                    <button
                                                                        className={isPhAcc ? undefined : 'sidebar-row'}
                                                                        style={isPhAcc ? S.placeholderTypeBtn(typeOpen, accent) : S.typeBtn(typeOpen, accent)}
                                                                        onClick={() => toggleType(type.id)}
                                                                    >
                                                                        <span style={S.navText}>{type.label}</span>
                                                                        <span style={S.chevron(typeOpen)}>›</span>
                                                                    </button>

                                                                    {typeOpen && (
                                                                        <div style={S.typeContent}>
                                                                            {type.children.map((leaf) => (
                                                                                leaf.placeholder ? (
                                                                                    <div key={leaf.id} style={S.placeholderLeaf}>
                                                                                        <span style={S.placeholderBadge}>·</span>
                                                                                        <span>{leaf.label}</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <button
                                                                                        key={leaf.id}
                                                                                        className="sidebar-leaf"
                                                                                        style={S.leafBtn}
                                                                                        onClick={() => addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints)}
                                                                                        {...leafHover(leaf.typeId, leaf.defaultConstraints)}
                                                                                    >
                                                                                        <span style={S.addBadge}><Plus size={13} weight="bold" /></span>
                                                                                        <span>{leaf.label}</span>
                                                                                    </button>
                                                                                )
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                        </div>
                    );
                })}
            </div>
            </>)}

            </>)}

            {/* Hover example card — portal so it escapes the sidebar's overflow/clip. */}
            {preview && createPortal(
                <div style={{ ...S.previewCard, top: Math.min(preview.top, window.innerHeight - 210), left: Math.max(8, preview.left) }}>
                    <div style={S.previewLabel}>Voorbeeld</div>
                    <ExercisePreview typeId={preview.typeId} constraints={preview.constraints} height={150} />
                </div>,
                document.body,
            )}
        </aside>
    );
}





const S = {
    aside: { width: '300px', minWidth: '300px', borderRight: '1px solid var(--separator)', height: '100%', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    headerCol: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3) var(--sp-4)', color: 'var(--text-main)' } as React.CSSProperties,
    // Negative margin so the hover fill pads the wordmark without nudging it.
    logoBtn: { background: 'transparent', border: 'none', padding: '2px 4px', margin: '-2px -4px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex' } as React.CSSProperties,
    divider: { border: 'none', height: '1px', backgroundColor: 'var(--separator)', margin: '0 var(--sp-4)' } as React.CSSProperties,
    tabSwitch: { margin: '0 var(--sp-4) var(--sp-2)' } as React.CSSProperties,
    previewCard: { position: 'fixed', zIndex: 400, width: '290px', background: 'var(--bg-surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-2)', padding: 'var(--sp-2)', pointerEvents: 'none' } as React.CSSProperties,
    previewLabel: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', padding: '0 2px' } as React.CSSProperties,
    searchWrap: { padding: 'var(--sp-2) var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' } as React.CSSProperties,
    gradeWrap: { padding: '0 var(--sp-4) var(--sp-2)' } as React.CSSProperties,
    searchInput: {
        flex: 1, padding: '8px 12px', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
        backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-sm)',
        color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box',
    } as React.CSSProperties,
    noResults: { padding: 'var(--sp-3) var(--sp-5)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
    navArea: { flex: 1, overflowY: 'auto', padding: 'var(--sp-2) var(--sp-1)' } as React.CSSProperties,
    // Truncate long nav labels with an ellipsis instead of colliding with the chevron.
    navText: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 } as React.CSSProperties,

    lockedPalette: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } as React.CSSProperties,
    lockedBanner: { margin: 'var(--sp-1) var(--sp-4) var(--sp-2)', padding: 'var(--sp-2) var(--sp-3)', fontSize: 'var(--text-xs)', lineHeight: 1.4, color: 'var(--text-main)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)' } as React.CSSProperties,
    lockedListTitle: { padding: 'var(--sp-1) var(--sp-4)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)' } as React.CSSProperties,

    domainWrap: { marginBottom: 'var(--sp-3)' } as React.CSSProperties,

    // Domain section header — full-width accent-tinted band, label + dot in the domain accent.
    sectionHeader: (accent: string): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        padding: '6px 10px', margin: 'var(--sp-1) var(--sp-1) var(--sp-2)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)`,
        color: accent, fontSize: 'var(--text-sm)', fontWeight: 700, letterSpacing: '0.01em',
    }),
    sectionDot: (accent: string): React.CSSProperties => ({ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }),

    domainContent: { paddingLeft: 'var(--sp-1)' } as React.CSSProperties,

    subdomainBtn: (open: boolean, _accent: string, placeholder?: boolean): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-1)',
        padding: '9px 12px', cursor: 'pointer', border: 'none', background: 'none',
        color: open && !placeholder ? 'var(--text-main)' : 'var(--text-muted)',
        fontSize: 'var(--text-sm)', fontWeight: 600, textAlign: 'left',
        transition: 'color var(--dur) var(--ease-out)',
        opacity: placeholder ? 0.45 : 1,
    }),
    subdomainContent: { paddingLeft: 'var(--sp-1)' } as React.CSSProperties,

    typeBtn: (open: boolean, _accent: string): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', cursor: 'pointer', border: 'none', background: 'none',
        color: open ? 'var(--text-main)' : 'var(--text-muted)',
        fontSize: 'var(--text-sm)', fontWeight: 500, textAlign: 'left',
        transition: 'color var(--dur) var(--ease-out)',
    }),
    typeContent: { paddingLeft: 'var(--sp-1)' } as React.CSSProperties,

    // Hover (rounded fill + text lift) lives in index.css under .sidebar-leaf.
    leafBtn: {
        width: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        textAlign: 'left', background: 'none', border: 'none',
        color: 'var(--text-muted)', padding: '7px 10px', margin: '1px 6px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer', fontSize: 'var(--text-sm)',
    } as React.CSSProperties,
    addBadge: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '18px', height: '18px', borderRadius: 'var(--radius-xs)',
        backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)',
        fontSize: '13px', fontWeight: 700, lineHeight: 1, flexShrink: 0, color: 'var(--text-muted)',
    } as React.CSSProperties,
    chevron: (open: boolean): React.CSSProperties => ({
        fontSize: '16px', lineHeight: 1, color: 'var(--text-muted)', flexShrink: 0,
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform var(--dur) var(--ease-out)', display: 'inline-block',
    }),

    placeholderLeaf: {
        width: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        textAlign: 'left', padding: '7px 10px', margin: '1px 6px',
        fontSize: 'var(--text-sm)', color: 'var(--text-muted)', opacity: 0.5, cursor: 'default',
    } as React.CSSProperties,
    placeholderBadge: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '18px', height: '18px', borderRadius: 'var(--radius-xs)',
        backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--separator)',
        fontSize: '13px', fontWeight: 700, lineHeight: 1, flexShrink: 0, color: 'var(--text-muted)',
    } as React.CSSProperties,
    placeholderTypeBtn: (_open: boolean, _accent: string): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', cursor: 'pointer', border: 'none', background: 'none',
        color: 'var(--text-muted)',
        fontSize: 'var(--text-sm)', fontWeight: 500, textAlign: 'left', opacity: 0.5,
        transition: 'color var(--dur) var(--ease-out)',
    }),

    footer: { padding: 'var(--sp-3) var(--sp-4)', borderTop: '1px solid var(--separator)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' } as React.CSSProperties,
    footerActions: { display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' } as React.CSSProperties,
    footerText: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.4 } as React.CSSProperties,
    footerIconBtn: {
        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        border: '1px solid var(--separator)', backgroundColor: 'var(--bg-surface-2)',
        color: 'var(--text-muted)', fontSize: '14px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        textDecoration: 'none', fontWeight: 700,
    } as React.CSSProperties,
};
