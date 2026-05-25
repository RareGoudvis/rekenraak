import { useState } from 'react';
import logo from '../../assets/enderklas-logo.png';
import { APP_STRUCTURE } from '../../config/appstructure';
import { useWorksheetStore } from '../../store/useWorksheetStore';

export default function Sidebar() {
    const addBlockFromType = useWorksheetStore((state) => state.addBlockFromType);

    const [openDomain, setOpenDomain] = useState<string | null>(null);
    const [openSubdomain, setOpenSubdomain] = useState<string | null>(null);
    const [openType, setOpenType] = useState<string | null>(null);

    const toggleDomain = (id: string) => {
        const next = openDomain === id ? null : id;
        setOpenDomain(next);
        setOpenSubdomain(null);
        setOpenType(null);
    };

    const toggleSubdomain = (id: string) => {
        const next = openSubdomain === id ? null : id;
        setOpenSubdomain(next);
        setOpenType(null);
    };

    const toggleType = (id: string) => {
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

            <hr style={S.divider} />

            <div style={S.navArea}>
                {APP_STRUCTURE.map((domain) => {
                    const accent = `var(${domain.accentVar})`;
                    const domainOpen = openDomain === domain.id;

                    return (
                        <div key={domain.id} style={S.domainWrap}>
                            {/* Domain header */}
                            <button
                                style={S.domainBtn(domainOpen, accent)}
                                onClick={() => toggleDomain(domain.id)}
                            >
                                <span style={{ color: accent, fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {domain.label}
                                </span>
                                <span style={S.chevron(domainOpen)}>›</span>
                            </button>

                            {/* Domain content — accent border runs full height */}
                            {domainOpen && (
                                <div style={S.domainContent(accent)}>
                                    {domain.subdomains.map((subdomain) => {
                                        const subOpen = openSubdomain === subdomain.id;

                                        return (
                                            <div key={subdomain.id}>
                                                {/* Subdomain header */}
                                                <button
                                                    style={S.subdomainBtn(subOpen, accent)}
                                                    onClick={() => toggleSubdomain(subdomain.id)}
                                                >
                                                    <span>{subdomain.label}</span>
                                                    <span style={S.chevron(subOpen)}>›</span>
                                                </button>

                                                {/* Subdomain content */}
                                                {subOpen && (
                                                    <div style={S.subdomainContent}>
                                                        {subdomain.types.map((type) => {
                                                            // Leaf type (no children)
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
                                                            const typeOpen = openType === type.id;
                                                            return (
                                                                <div key={type.id}>
                                                                    <button
                                                                        style={S.typeBtn(typeOpen, accent)}
                                                                        onClick={() => toggleType(type.id)}
                                                                    >
                                                                        <span>{type.label}</span>
                                                                        <span style={S.chevron(typeOpen)}>›</span>
                                                                    </button>

                                                                    {typeOpen && (
                                                                        <div style={S.typeContent}>
                                                                            {type.children.map((leaf) => (
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
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={S.footer}>
                <div style={S.footerText}>Deze website werkt gemaakt door Ruben V.H.
                    <br/> Deze website wordt gratis ter beschikking gesteld. 
                    <br /> <a href="https://www.gnu.org/licenses/agpl-3.0.txt" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Licentie: AGPL-3.0</a>
                </div>
            </div>
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
    navArea: { flex: 1, overflowY: 'auto', padding: '10px 0' } as React.CSSProperties,

    domainWrap: { marginBottom: '2px' } as React.CSSProperties,
    domainBtn: (open: boolean, accent: string): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 16px', cursor: 'pointer', border: 'none', background: 'none',
        borderLeft: open ? `3px solid ${accent}` : '3px solid transparent',
        transition: 'border-color 0.15s ease',
    }),

    // Full-height accent line via borderLeft on the content container
    domainContent: (accent: string): React.CSSProperties => ({
        borderLeft: `3px solid ${accent}`,
        marginLeft: '0px',
        paddingLeft: '0px',
    }),

    subdomainBtn: (open: boolean, accent: string): React.CSSProperties => ({
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px 10px 18px', cursor: 'pointer', border: 'none', background: 'none',
        color: open ? 'var(--text-main)' : 'var(--text-muted)',
        fontSize: '13px', fontWeight: 600, textAlign: 'left',
        borderLeft: open ? `2px solid ${accent}60` : '2px solid transparent',
        transition: 'color 0.15s, border-color 0.15s',
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

    footer: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)' } as React.CSSProperties,
    settingsBtn: { width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '12px', backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)' } as React.CSSProperties,
    downloadBtn: { width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', border: 'none', backgroundColor: 'var(--accent-purple)', color: '#ffffff' } as React.CSSProperties,
    downloadSolBtn: { width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', border: 'none', backgroundColor: 'var(--accent-purple-dark)', color: '#ffffff' } as React.CSSProperties,
    footerText: { fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' } as React.CSSProperties,
};
