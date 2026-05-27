import { useMemo, useState } from 'react';
import logo from '../../assets/enderklas-logo.png';
import { APP_STRUCTURE, type Domain } from '../../config/appstructure';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import HelpModal from './HelpModal';

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

    const [openSubdomain, setOpenSubdomain] = useState<string | null>(null);
    const [openType, setOpenType] = useState<string | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [search, setSearch] = useState('');

    const isSearching = search.trim().length > 0;
    const tree = useMemo(() => filterTree(APP_STRUCTURE, search), [search]);

    const toggleSubdomain = (id: string) => {
        if (isSearching) return;  // tree is force-expanded during search
        const next = openSubdomain === id ? null : id;
        setOpenSubdomain(next);
        setOpenType(null);
    };

    const toggleType = (id: string) => {
        if (isSearching) return;
        setOpenType(openType === id ? null : id);
    };

    return (
        <aside style={S.aside}>
            <div style={S.header}>
                <div style={S.logoWrap}>
                    <img src={logo} alt="Enderklas Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h2 style={S.title}>Enderklas Builder</h2>
                <p style={S.subtitle}>Basisonderwijs Vlaanderen</p>
            </div>

            <div style={S.searchWrap}>
                <input
                    type="text"
                    placeholder="🔎 Zoek oefening…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={S.searchInput}
                />
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
                            {/* Domain content — accent border runs full height, always visible */}
                            <div style={S.domainContent(accent)}>
                                    {domain.subdomains.map((subdomain) => {
                                        const subOpen = isSearching || openSubdomain === subdomain.id;

                                        return (
                                            <div key={subdomain.id}>
                                                {/* Subdomain header */}
                                                <button
                                                    style={S.subdomainBtn(subOpen, accent, subdomain.placeholder)}
                                                    onClick={() => toggleSubdomain(subdomain.id)}
                                                >
                                                    <span>{subdomain.label}</span>
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
                                                                        style={S.leafBtn}
                                                                        onClick={() => addBlockFromType(type.typeId!, type.label, type.defaultConstraints)}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                                                                    >
                                                                        <span style={S.addBadge}>+</span>
                                                                        <span>{type.label}</span>
                                                                    </button>
                                                                );
                                                            }

                                                            // Accordion type (has children)
                                                            const typeOpen = isSearching || openType === type.id;
                                                            const isPhAcc = !!type.placeholder;
                                                            return (
                                                                <div key={type.id}>
                                                                    <button
                                                                        style={isPhAcc ? S.placeholderTypeBtn(typeOpen, accent) : S.typeBtn(typeOpen, accent)}
                                                                        onClick={() => toggleType(type.id)}
                                                                    >
                                                                        <span>{type.label}</span>
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
                                                                                        style={S.leafBtn}
                                                                                        onClick={() => addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints)}
                                                                                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main)'; }}
                                                                                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                                                                                    >
                                                                                        <span style={S.addBadge}>+</span>
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

            <div style={S.themeRow}>
                <span style={S.themeLabel}>Thema</span>
                <div style={S.themeBtnGroup}>
                    <button style={S.themeBtn(theme === 'light')} onClick={() => setTheme('light')} title="Licht thema">☀</button>
                    <button style={S.themeBtn(theme === 'dark')} onClick={() => setTheme('dark')} title="Donker thema">☽</button>
                    <button style={S.themeBtn(theme === 'colorblind')} onClick={() => setTheme('colorblind')} title="Hoog contrast / kleurenblind-veilig">◐</button>
                </div>
            </div>

            <div style={S.footer}>
                <div style={S.footerActions}>
                    <a href="https://x.com/ruben_vah" target="_blank" rel="noopener noreferrer" style={S.footerIconBtn} title="Contact via X">
                        <span style={{ fontFamily: 'serif', fontWeight: 700 }}>𝕏</span>
                    </a>
                    <button style={S.footerIconBtn} onClick={() => setHelpOpen(true)} title="Help / uitleg">
                        <span>?</span>
                    </button>
                    {/* TODO: replace REPLACE_ME with the real Buy Me a Coffee handle before merging */}
                    <a href="https://buymeacoffee.com/REPLACE_ME" target="_blank" rel="noopener noreferrer" style={S.footerIconBtn} title="Steun deze tool met een koffie ☕">
                        <span style={{ color: '#e11d48' }}>❤</span>
                    </a>
                </div>
                <div style={S.footerText}>
                    Gemaakt door Ruben V.H. — gratis beschikbaar.<br/>
                    Code onder <a href="https://www.gnu.org/licenses/agpl-3.0.txt" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>AGPL-3.0</a>.
                </div>
            </div>
            {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
        </aside>
    );
}





const S = {
    aside: { width: '300px', minWidth: '300px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
    header: { padding: '24px 20px 16px 20px' } as React.CSSProperties,
    logoWrap: { width: '100%', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px', padding: '5px', overflow: 'hidden' } as React.CSSProperties,
    title: { margin: 0, fontSize: '17px', color: 'var(--text-main)', fontWeight: 700 } as React.CSSProperties,
    subtitle: { margin: '4px 0 0 0', fontSize: '12px', color: 'var(--accent-purple)', fontWeight: 400 } as React.CSSProperties,
    divider: { border: 'none', height: '1px', backgroundColor: 'var(--border-color)', margin: '0 16px' } as React.CSSProperties,
    searchWrap: { padding: '4px 16px 8px' } as React.CSSProperties,
    searchInput: {
        width: '100%', padding: '6px 10px', fontSize: '12px', fontFamily: "'Azeret Mono', monospace",
        backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '6px',
        color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box',
    } as React.CSSProperties,
    noResults: { padding: '12px 18px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
    navArea: { flex: 1, overflowY: 'auto', padding: '10px 0' } as React.CSSProperties,

    domainWrap: { marginBottom: '14px' } as React.CSSProperties,

    domainContent: (accent: string): React.CSSProperties => ({
        borderLeft: `3px solid ${accent}`,
    }),

    subdomainBtn: (open: boolean, accent: string, placeholder?: boolean): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 10px 18px', cursor: 'pointer', border: 'none', background: 'none',
        color: open && !placeholder ? 'var(--text-main)' : 'var(--text-muted)',
        fontSize: '13px', fontWeight: 600, textAlign: 'left',
        borderLeft: open && !placeholder ? `2px solid ${accent}60` : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
        opacity: placeholder ? 0.45 : 1,
    }),
    subdomainContent: { paddingLeft: '8px' } as React.CSSProperties,

    typeBtn: (open: boolean, accent: string): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px 9px 18px', cursor: 'pointer', border: 'none', background: 'none',
        color: open ? 'var(--text-main)' : 'var(--text-muted)',
        fontSize: '12px', fontWeight: 500, textAlign: 'left',
        borderLeft: open ? `2px solid ${accent}40` : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
    }),
    typeContent: { paddingLeft: '8px' } as React.CSSProperties,

    leafBtn: {
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        textAlign: 'left', background: 'none', border: 'none',
        color: 'var(--text-muted)', padding: '8px 14px 8px 18px',
        cursor: 'pointer', fontSize: '12px', transition: 'color 0.15s ease',
    } as React.CSSProperties,
    addBadge: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '18px', height: '18px', borderRadius: '4px',
        backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)',
        fontSize: '13px', fontWeight: 700, lineHeight: 1, flexShrink: 0, color: 'var(--text-muted)',
    } as React.CSSProperties,
    chevron: (open: boolean): React.CSSProperties => ({
        fontSize: '16px', lineHeight: 1, color: 'var(--text-muted)', flexShrink: 0,
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease', display: 'inline-block',
    }),

    placeholderLeaf: {
        width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
        textAlign: 'left', padding: '8px 14px 8px 18px',
        fontSize: '12px', color: 'var(--text-muted)', opacity: 0.5, cursor: 'default',
    } as React.CSSProperties,
    placeholderBadge: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '18px', height: '18px', borderRadius: '4px',
        backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)',
        fontSize: '13px', fontWeight: 700, lineHeight: 1, flexShrink: 0, color: 'var(--text-muted)',
    } as React.CSSProperties,
    placeholderTypeBtn: (open: boolean, accent: string): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 14px 9px 18px', cursor: 'pointer', border: 'none', background: 'none',
        color: open ? 'var(--text-muted)' : 'var(--text-muted)',
        fontSize: '12px', fontWeight: 500, textAlign: 'left', opacity: 0.5,
        borderLeft: open ? `2px solid ${accent}40` : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
    }),

    themeRow: { padding: '10px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' } as React.CSSProperties,
    themeLabel: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, color: 'var(--text-muted)' } as React.CSSProperties,
    themeBtnGroup: { display: 'flex', gap: '4px', backgroundColor: 'var(--bg-input)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' } as React.CSSProperties,
    themeBtn: (active: boolean): React.CSSProperties => ({
        width: '32px', height: '28px', borderRadius: '4px', cursor: 'pointer', border: 'none',
        backgroundColor: active ? 'var(--accent-purple)' : 'transparent',
        color: active ? 'white' : 'var(--text-muted)',
        fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: active ? 'bold' : 'normal',
    }),

    footer: { padding: '12px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' } as React.CSSProperties,
    footerActions: { display: 'flex', gap: '8px', alignItems: 'center' } as React.CSSProperties,
    footerText: { fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 } as React.CSSProperties,
    footerIconBtn: {
        width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer',
        border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)',
        color: 'var(--text-muted)', fontSize: '14px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        textDecoration: 'none', fontWeight: 700,
    } as React.CSSProperties,
};
