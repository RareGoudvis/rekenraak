import { useMemo, useState } from 'react';
import { X, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import Wordmark from '../ui/Wordmark';
import SheetThumbnail from '../shared/SheetThumbnail';
import { APP_STRUCTURE } from '../../config/appstructure';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { REKENMETHODES, rekenmethodeLabel } from '../../config/rekenmethodes';
import { WORKSHEET_TEMPLATES } from '../../config/worksheetTemplates';

const DOMAINS = APP_STRUCTURE.filter(d => !d.hidden).map(d => ({ id: d.id, label: d.label, accentVar: d.accentVar }));

// Full-screen gallery of developer-curated worksheet templates. UI complete; the
// WORKSHEET_TEMPLATES data is authored later. Filters/cards work against whatever's there.
export default function BibliotheekView() {
    const setView = useWorksheetStore((s) => s.setView);
    const loadWorksheet = useWorksheetStore((s) => s.loadWorksheet);
    const generateAllBlocks = useWorksheetStore((s) => s.generateAllBlocks);

    const [leerjaar, setLeerjaar] = useState<Leerjaar | null>(null);
    const [methods, setMethods] = useState<Set<string>>(new Set());
    const [domains, setDomains] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');

    const close = () => setView('editor');
    const toggle = (set: Set<string>, key: string) => {
        const next = new Set(set);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    };
    const clearFilters = () => { setLeerjaar(null); setMethods(new Set()); setDomains(new Set()); setSearch(''); };
    const hasFilters = leerjaar != null || methods.size > 0 || domains.size > 0 || search.trim().length > 0;

    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return WORKSHEET_TEMPLATES.filter(t => {
            if (leerjaar != null && t.leerjaar !== leerjaar) return false;
            if (domains.size > 0 && !domains.has(t.domainId)) return false;
            if (methods.size > 0 && !(t.rekenmethodeIds ?? []).some(id => methods.has(id))) return false;
            if (needle && !t.title.toLowerCase().includes(needle)) return false;
            return true;
        });
    }, [leerjaar, methods, domains, search]);

    const applyTemplate = (id: string) => {
        const t = WORKSHEET_TEMPLATES.find(x => x.id === id);
        if (!t) return;
        loadWorksheet(t.payload);
        // Templates ship as configured-but-empty blocks; fill them so the editor opens ready.
        generateAllBlocks();
        close();
    };

    return (
        <div style={S.overlay}>
            <header style={S.topbar}>
                <div style={S.brand}>
                    <Wordmark height={28} />
                    <span style={S.crumb}>Bibliotheek / <b>Kant-en-klare bladen</b></span>
                </div>
                <button style={S.closeBtn} onClick={close} aria-label="Sluiten"><X size={18} /></button>
            </header>

            <div style={S.main}>
                {/* Left rail filters */}
                <aside style={S.rail}>
                    <div style={S.filterGroup}>
                        <div style={S.filterTitle}>Leerjaar</div>
                        <label style={S.radioRow}>
                            <input type="radio" name="lj" checked={leerjaar == null} onChange={() => setLeerjaar(null)} /> Alle leerjaren
                        </label>
                        {LEERJAREN.map(g => (
                            <label key={g} style={S.radioRow}>
                                <input type="radio" name="lj" checked={leerjaar === g} onChange={() => setLeerjaar(g)} />
                                {`${g}${g === 1 ? 'ste' : 'de'} leerjaar`}
                                <span style={S.count}>{WORKSHEET_TEMPLATES.filter(t => t.leerjaar === g).length}</span>
                            </label>
                        ))}
                    </div>

                    <div style={S.filterGroup}>
                        <div style={S.filterTitle}>Rekenmethode</div>
                        {REKENMETHODES.map(m => (
                            <label key={m.id} style={S.checkRow}>
                                <input type="checkbox" checked={methods.has(m.id)} onChange={() => setMethods(s => toggle(s, m.id))} />
                                {m.label}
                                <span style={S.count}>{WORKSHEET_TEMPLATES.filter(t => (t.rekenmethodeIds ?? []).includes(m.id)).length}</span>
                            </label>
                        ))}
                    </div>

                    <div style={S.filterGroup}>
                        <div style={S.filterTitle}>Domein</div>
                        {DOMAINS.map(d => (
                            <label key={d.id} style={S.checkRow}>
                                <input type="checkbox" checked={domains.has(d.id)} onChange={() => setDomains(s => toggle(s, d.id))} />
                                {d.label}
                            </label>
                        ))}
                    </div>

                    {hasFilters && (
                        <button style={S.clearBtn} onClick={clearFilters}><ArrowCounterClockwise size={13} /> Filters wissen</button>
                    )}
                </aside>

                {/* Content */}
                <div style={S.content}>
                    <div style={S.contentHead}>
                        <div>
                            <h1 style={S.h1}>Kant-en-klare bladen</h1>
                            <span style={S.subMeta}>{WORKSHEET_TEMPLATES.length} sjablonen</span>
                        </div>
                        <input style={S.search} placeholder="🔎 Zoek sjabloon…" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    {/* Active-filter pills */}
                    {hasFilters && (
                        <div style={S.pills}>
                            {leerjaar != null && <Pill label={`Leerjaar ${leerjaar}`} onClear={() => setLeerjaar(null)} />}
                            {[...domains].map(id => <Pill key={id} label={DOMAINS.find(d => d.id === id)?.label ?? id} onClear={() => setDomains(s => toggle(s, id))} />)}
                            {[...methods].map(id => <Pill key={id} label={rekenmethodeLabel(id)} onClear={() => setMethods(s => toggle(s, id))} />)}
                        </div>
                    )}

                    {WORKSHEET_TEMPLATES.length === 0 ? (
                        <div style={S.empty}>Komt binnenkort</div>
                    ) : visible.length === 0 ? (
                        <div style={S.empty}>Geen sjablonen voor deze filters. <button style={S.linkBtn} onClick={clearFilters}>Filters wissen</button></div>
                    ) : (
                        <div style={S.grid}>
                            {visible.map(t => (
                                <div key={t.id} style={S.card}>
                                    <div style={S.thumbWrap}><SheetThumbnail file={t.payload} height={220} maxBlocks={3} /></div>
                                    <div style={S.cardBody}>
                                        <div style={S.cardTitle}>{t.title}</div>
                                        <div style={S.tags}>
                                            <span style={S.tag}>Leerjaar {t.leerjaar}</span>
                                            <span style={S.tag}>{DOMAINS.find(d => d.id === t.domainId)?.label ?? t.domainId}</span>
                                            {(t.rekenmethodeIds ?? []).map(id => <span key={id} style={S.tag}>{rekenmethodeLabel(id)}</span>)}
                                        </div>
                                        <div style={S.cardFoot}>
                                            <span style={S.subMeta}>{t.exerciseCount} oefeningen</span>
                                            <button style={S.useBtn} onClick={() => applyTemplate(t.id)}>Gebruik sjabloon</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Pill({ label, onClear }: { label: string; onClear: () => void }) {
    return (
        <span style={S.pill}>{label} <button style={S.pillX} onClick={onClear} aria-label={`${label} verwijderen`}><X size={11} /></button></span>
    );
}

const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
    topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-3) var(--sp-5)', borderBottom: '1px solid var(--separator)', background: 'var(--bg-surface)', flexShrink: 0 } as React.CSSProperties,
    brand: { display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' } as React.CSSProperties,
    crumb: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    closeBtn: { display: 'inline-flex', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer' } as React.CSSProperties,
    main: { flex: 1, display: 'flex', minHeight: 0 } as React.CSSProperties,
    rail: { width: '260px', flexShrink: 0, borderRight: '1px solid var(--separator)', background: 'var(--bg-surface)', overflowY: 'auto', padding: 'var(--sp-4)' } as React.CSSProperties,
    filterGroup: { marginBottom: 'var(--sp-5)' } as React.CSSProperties,
    filterTitle: { fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' } as React.CSSProperties,
    radioRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', fontSize: 'var(--text-sm)', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties,
    checkRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', fontSize: 'var(--text-sm)', color: 'var(--text-main)', cursor: 'pointer' } as React.CSSProperties,
    count: { marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' } as React.CSSProperties,
    clearBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: 0 } as React.CSSProperties,
    content: { flex: 1, overflowY: 'auto', padding: 'var(--sp-5) var(--sp-6)' } as React.CSSProperties,
    contentHead: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)', flexWrap: 'wrap' } as React.CSSProperties,
    h1: { margin: 0, fontSize: 'var(--text-2xl)', color: 'var(--text-main)' } as React.CSSProperties,
    subMeta: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    search: { padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', minWidth: '240px' } as React.CSSProperties,
    pills: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--sp-4)' } as React.CSSProperties,
    pill: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '999px', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 'var(--text-xs)' } as React.CSSProperties,
    pillX: { display: 'inline-flex', border: 'none', background: 'none', color: 'inherit', cursor: 'pointer', padding: 0 } as React.CSSProperties,
    empty: { fontSize: 'var(--text-md)', color: 'var(--text-muted)', fontStyle: 'italic', padding: 'var(--sp-6) 0' } as React.CSSProperties,
    linkBtn: { background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', padding: 0, textDecoration: 'underline' } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--sp-4)', alignItems: 'start' } as React.CSSProperties,
    card: { display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', overflow: 'hidden', boxShadow: 'var(--shadow-1)' } as React.CSSProperties,
    thumbWrap: { borderBottom: '1px solid var(--separator)', background: '#fff' } as React.CSSProperties,
    cardBody: { padding: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: '8px' } as React.CSSProperties,
    cardTitle: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    tags: { display: 'flex', flexWrap: 'wrap', gap: '4px' } as React.CSSProperties,
    tag: { fontSize: 'var(--text-xs)', padding: '2px 7px', borderRadius: '999px', background: 'var(--bg-surface-2)', color: 'var(--text-muted)' } as React.CSSProperties,
    cardFoot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '2px' } as React.CSSProperties,
    useBtn: { padding: '7px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 } as React.CSSProperties,
};
