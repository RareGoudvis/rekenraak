import { useEffect, useMemo, useState } from 'react';
import { HelpCircle, Heart, Sun, Moon, Contrast, MessageSquare, Plus } from 'lucide-react';
import logo from '../../assets/enderklas-logo.png';
import { APP_STRUCTURE, type Domain } from '../../config/appstructure';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import HelpModal from './HelpModal';
import BaseSettingsPanel from './BaseSettingsPanel';

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

export default function Sidebar() {
    const addBlockFromType = useWorksheetStore((state) => state.addBlockFromType);
    const theme = useWorksheetStore((state) => state.theme);
    const setTheme = useWorksheetStore((state) => state.setTheme);
    const curriculum = useWorksheetStore((state) => state.curriculum);
    const locked = !!curriculum?.locked;

    const [openSubdomain, setOpenSubdomain] = useState<string | null>(null);
    // Multiple type-accordions can be open at once — opening a subdomain expands them all.
    const [openTypes, setOpenTypes] = useState<Set<string>>(new Set());
    const [helpOpen, setHelpOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Sidebar branding — editable site title + subtitle, persisted per-browser.
    const [siteTitle, setSiteTitle] = useState<string>(() => {
        try { return localStorage.getItem('enderklas_site_title_v1') ?? 'Enderklas Builder'; } catch { return 'Enderklas Builder'; }
    });
    const [siteSubtitle, setSiteSubtitle] = useState<string>(() => {
        try { return localStorage.getItem('enderklas_site_subtitle_v1') ?? ''; } catch { return ''; }
    });
    useEffect(() => { try { localStorage.setItem('enderklas_site_title_v1', siteTitle); } catch { /* ignore */ } }, [siteTitle]);
    useEffect(() => { try { localStorage.setItem('enderklas_site_subtitle_v1', siteSubtitle); } catch { /* ignore */ } }, [siteSubtitle]);

    const isSearching = search.trim().length > 0;
    const tree = useMemo(() => filterTree(APP_STRUCTURE, search), [search]);

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
        <aside style={S.aside}>
            <div style={S.headerRow}>
                <div style={S.logoWrap}>
                    <img src={logo} alt="Enderklas Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={S.headerText}>
                    <input
                        value={siteTitle}
                        onChange={(e) => setSiteTitle(e.target.value)}
                        placeholder="Enderklas Builder"
                        style={S.siteTitleInput}
                    />
                    <input
                        value={siteSubtitle}
                        onChange={(e) => setSiteSubtitle(e.target.value)}
                        placeholder="Werkbundels maken, snel en simpel."
                        style={S.siteSubtitleInput}
                    />
                </div>
            </div>

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
                            >
                                <span style={S.addBadge}><Plus size={13} strokeWidth={2.5} /></span>
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
            <div style={S.searchWrap}>
                <input
                    type="text"
                    placeholder="🔎 Zoek oefening…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={S.searchInput}
                />
                <button style={S.footerIconBtn} onClick={() => setHelpOpen(true)} title="Help / uitleg" aria-label="Help">
                    <HelpCircle size={16} />
                </button>
            </div>

            <hr style={S.divider} />

            <div style={S.navArea}>
                {tree.length === 0 && isSearching && (
                    <div style={S.noResults}>Geen oefening gevonden voor "{search}".</div>
                )}
                {tree.map((domain) => {
                    const accent = `var(${domain.accentVar})`;

                    return (
                        <div key={domain.id} style={S.domainWrap}>
                            {/* macOS source-list section header: a domain-color dot + the domain name. */}
                            <div style={S.sectionHeader}>
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
                                                                    >
                                                                        <span style={S.addBadge}><Plus size={13} strokeWidth={2.5} /></span>
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
                                                                                    >
                                                                                        <span style={S.addBadge}><Plus size={13} strokeWidth={2.5} /></span>
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

            <div style={S.themeRow}>
                <span style={S.themeLabel}>Thema</span>
                <div className="seg-group" style={{ flex: '0 0 auto' }}>
                    <button className="seg-btn" aria-pressed={theme === 'light'} style={{ width: '40px' }} onClick={() => setTheme('light')} title="Licht thema" aria-label="Licht thema"><Sun size={14} /></button>
                    <button className="seg-btn" aria-pressed={theme === 'dark'} style={{ width: '40px' }} onClick={() => setTheme('dark')} title="Donker thema" aria-label="Donker thema"><Moon size={14} /></button>
                    <button className="seg-btn" aria-pressed={theme === 'colorblind'} style={{ width: '40px' }} onClick={() => setTheme('colorblind')} title="Hoog contrast / kleurenblind-veilig" aria-label="Hoog contrast"><Contrast size={14} /></button>
                </div>
            </div>

            {!locked && <BaseSettingsPanel />}

            <div style={S.footer}>
                {/* Name on its own full-width line so it never wraps; links + actions below. */}
                <div style={S.footerText}>Gemaakt door Ruben Van Handenhove</div>
                <div style={S.footerActions}>
                    <span style={{ ...S.footerText, flex: 1 }}>
                        Code onder <a href="https://www.gnu.org/licenses/agpl-3.0.txt" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>AGPL-3.0</a>.
                    </span>
                    <a href="https://forms.gle/jc1LcMXaRG3V3M556" target="_blank" rel="noopener noreferrer" style={S.footerIconBtn} title="Feedback geven" aria-label="Feedback">
                        <MessageSquare size={16} />
                    </a>
                    <a href="https://buymeacoffee.com/raregoudvis" target="_blank" rel="noopener noreferrer" style={{ ...S.footerIconBtn, color: '#e11d48', border: '1px solid #e11d48' }} title="Steun deze tool met een koffie ☕" aria-label="Doneer">
                        <Heart size={16} fill="#e11d48" />
                    </a>
                </div>
            </div>
            {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
        </aside>
    );
}





const S = {
    aside: { width: '300px', minWidth: '300px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--separator)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-1)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
    headerRow: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-5) var(--sp-4) var(--sp-3)' } as React.CSSProperties,
    logoWrap: { width: '48px', height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } as React.CSSProperties,
    headerText: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 } as React.CSSProperties,
    siteTitleInput: { background: 'transparent', border: 'none', outline: 'none', padding: 0, fontSize: 'var(--text-lg)', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-main)', width: '100%', fontFamily: 'inherit' } as React.CSSProperties,
    siteSubtitleInput: { background: 'transparent', border: 'none', outline: 'none', padding: 0, fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--accent)', width: '100%', fontFamily: 'inherit' } as React.CSSProperties,
    divider: { border: 'none', height: '1px', backgroundColor: 'var(--separator)', margin: '0 var(--sp-4)' } as React.CSSProperties,
    searchWrap: { padding: 'var(--sp-2) var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' } as React.CSSProperties,
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

    // macOS source-list section header + leading domain-color dot.
    sectionHeader: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-2) var(--sp-3) var(--sp-1)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.01em' } as React.CSSProperties,
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

    themeRow: { padding: 'var(--sp-3) var(--sp-4)', borderTop: '1px solid var(--separator)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)' } as React.CSSProperties,
    themeLabel: { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)' } as React.CSSProperties,
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
