import { useEffect, useMemo, useRef, useState } from 'react';
import { Star, X, MagnifyingGlass } from '@phosphor-icons/react';
import { buildCatalog, catalogDomains, type CatalogItem, type CatalogVariant } from '../../config/exerciseCatalog';
import { useBoardStore } from '../useBoardStore';
import { makeBoardBlock, sheetSeedContext } from '../boardBlocks';
import { addBasicWidget, staggerPos } from '../addWidgets';
import { TOOL_CATALOG, TOOL_CATEGORIES, runTool, loadFavorites, toggleFavorite, type ToolCategory, type BoardToolDef } from '../toolCatalog';

type Tab = 'rekenblad' | ToolCategory;

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
    { id: 'rekenblad', label: 'Rekenblad' },
    ...TOOL_CATEGORIES,
];

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

// A search hits the row, its subdomain, any variant (as listed on the sheet or renamed for the
// board), the typeId and the leaf ids, so "klok" finds the klok-kloklezen variants.
function boardItemMatches(item: CatalogItem, needle: string): boolean {
    if (!needle) return true;
    const hay = [item.label, item.context, item.typeId, ...item.variants.flatMap(v => [v.label, variantLabel(item, v), v.key])];
    return hay.some(t => t.toLowerCase().includes(needle));
}

function toolMatches(t: BoardToolDef, needle: string): boolean {
    return t.label.toLowerCase().includes(needle) || t.id.includes(needle);
}

// Toevoegen (Zijrail design): a panel docked to the rail at the bottom-left, the board stays
// visible. Tabs per category, one search across all of them, one tap = one card on the board.
// Adding switches to Selecteren (the new card is ready to drag) and closes the panel.
export default function BoardAddPanel({ onClose }: Props) {
    const catalog = useMemo(() => buildCatalog(), []);
    const domains = useMemo(() => catalogDomains(catalog), [catalog]);
    const [tab, setTab] = useState<Tab>('rekenblad');
    const [domain, setDomain] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [favorites, setFavorites] = useState<string[]>(loadFavorites);
    const panelRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLInputElement>(null);

    // Escape, or a press outside the panel and the rail's + (which toggles it itself). Capture
    // phase, because widgets and the panel stop their pointerdown from bubbling.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        const onDown = (e: PointerEvent) => {
            if (e.target instanceof Element && e.target.closest('[data-board-add]')) return;
            onClose();
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown, true);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown, true);
        };
    }, [onClose]);

    const done = () => { useBoardStore.getState().setTool('select'); onClose(); };

    const needle = search.trim().toLowerCase();
    const items = useMemo(
        () => catalog.filter(it => (needle || !domain || it.domainId === domain) && boardItemMatches(it, needle)),
        [catalog, domain, needle]);
    const tools = needle ? TOOL_CATALOG.filter(t => toolMatches(t, needle)) : TOOL_CATALOG.filter(t => t.category === tab);
    const showItems = needle ? true : tab === 'rekenblad';
    const favDefs = favorites.map(id => TOOL_CATALOG.find(t => t.id === id)).filter((t): t is BoardToolDef => !!t);

    const addExercise = (item: CatalogItem, variant: CatalogVariant) => {
        const block = makeBoardBlock(item.typeId, { override: variant.constraints, leafId: variant.key, ...sheetSeedContext() });
        if (!block) return;
        // No stored title: the card names its leaf and max live (cardTitle), so a max picked in
        // Instellingen shows in the bar. 660px ≈ a full exercise row (625px viewer budget + padding).
        useBoardStore.getState().addWidget({ kind: 'exercise', ...staggerPos(), w: 660, block, showAnswer: false });
        done();
    };
    const addTool = (t: BoardToolDef) => {
        // The image tile opens the file picker; the panel closes once a picture is on the board.
        if (!runTool(t)) { imageRef.current?.click(); return; }
        done();
    };
    const onImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { addBasicWidget('afbeelding', { src: String(reader.result) }, 420); done(); };
        reader.readAsDataURL(file);
    };

    return (
        <div ref={panelRef} data-board-add="" role="dialog" aria-label="Toevoegen" style={S.panel}
            onPointerDown={(e) => e.stopPropagation()}>
            <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onImage} />
            <div style={S.head}>
                <div role="tablist" aria-label="Categorie" style={S.tabs}>
                    {TABS.map(t => (
                        <button key={t.id} type="button" role="tab" aria-selected={!needle && tab === t.id}
                            className="ui-hover" style={{ ...S.tab, ...(!needle && tab === t.id ? S.tabOn : {}) }}
                            onClick={() => { setTab(t.id); setSearch(''); }}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <label style={S.searchBox}>
                    <MagnifyingGlass size={16} aria-hidden="true" />
                    <input type="search" aria-label="Zoeken" placeholder="Zoeken…" value={search}
                        onChange={(e) => setSearch(e.target.value)} style={S.search} />
                </label>
                <button type="button" className="ui-hover" style={S.closeBtn} aria-label="Sluiten" title="Sluiten" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            {favDefs.length > 0 && !needle && (
                <div style={S.favRow} aria-label="Favorieten">
                    <span style={S.favLabel}><Star size={14} weight="fill" aria-hidden="true" /> Favorieten</span>
                    {favDefs.map(t => (
                        <button key={t.id} type="button" className="ui-hover" style={S.favBtn} onClick={() => addTool(t)}>
                            <t.icon size={18} /> {t.label}
                        </button>
                    ))}
                </div>
            )}

            {!needle && tab === 'rekenblad' && (
                <div style={S.chips} aria-label="Domein">
                    <button type="button" className="ui-hover" aria-pressed={domain === null}
                        style={{ ...S.chip, ...(domain === null ? S.chipOn : {}) }} onClick={() => setDomain(null)}>Alles</button>
                    {domains.map(d => (
                        <button key={d.id} type="button" className="ui-hover" aria-pressed={domain === d.id}
                            style={{ ...S.chip, ...(domain === d.id ? S.chipOn : {}) }}
                            onClick={() => setDomain(domain === d.id ? null : d.id)}>
                            <span style={{ ...S.dot, background: `var(${d.accentVar})` }} />{d.label}
                        </button>
                    ))}
                </div>
            )}

            <div style={S.scroll}>
                {tools.length > 0 && (
                    <div style={S.toolGrid} aria-label="Hulpmiddelen">
                        {tools.map(t => (
                            <div key={t.id} style={{ position: 'relative' }}>
                                <button type="button" className="ui-hover" style={S.toolTile} onClick={() => addTool(t)}>
                                    <t.icon size={26} />
                                    <span>{t.label}</span>
                                </button>
                                <button type="button" className="ui-hover"
                                    title={favorites.includes(t.id) ? 'Uit favorieten' : 'Aan favorieten toevoegen'}
                                    aria-label={`Favoriet ${t.label}`} aria-pressed={favorites.includes(t.id)}
                                    style={{ ...S.starBtn, color: favorites.includes(t.id) ? 'var(--accent)' : 'var(--text-muted)' }}
                                    onClick={() => setFavorites(toggleFavorite(t.id))}>
                                    <Star size={16} weight={favorites.includes(t.id) ? 'fill' : 'regular'} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {showItems && (
                    <div style={S.itemGrid} aria-label="Rekenblad">
                        {items.map(item => item.variants.length === 1 ? (
                            <button key={item.typeId} type="button" className="ui-hover" style={S.itemTile} onClick={() => addExercise(item, item.variants[0])}>
                                <span style={S.itemHead}>
                                    <span style={{ ...S.dot, background: `var(${item.accentVar})` }} />
                                    <span style={S.itemLabel}>{item.label}</span>
                                </span>
                                <span style={S.itemContext}>{item.context}</span>
                            </button>
                        ) : (
                            <div key={item.typeId} style={{ ...S.itemTile, cursor: 'default' }}>
                                <span style={S.itemHead}>
                                    <span style={{ ...S.dot, background: `var(${item.accentVar})` }} />
                                    <span style={S.itemLabel}>{item.label}</span>
                                </span>
                                <span style={S.itemContext}>{item.context}</span>
                                <span style={S.variants}>
                                    {item.variants.map(v => (
                                        <button key={v.key} type="button" className="ui-hover" style={S.variantBtn} onClick={() => addExercise(item, v)}>
                                            {variantLabel(item, v)}
                                        </button>
                                    ))}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                {(showItems ? items.length : 0) + tools.length === 0 && <div style={S.empty}>Niets gevonden.</div>}
            </div>

            {showItems && !needle && (
                <div style={S.hint}>Een blok start met één oefening. Meer? Tik in het blok op Instellingen › Aantal.</div>
            )}
        </div>
    );
}

const S = {
    // Docked to the rail's right edge and the board's bottom, no gap: it grows out of the rail.
    panel: {
        position: 'absolute', left: 0, bottom: 0, zIndex: 60,
        width: 'min(820px, calc(100% - 16px))', height: 'min(560px, calc(100% - 72px))',
        display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px', boxSizing: 'border-box',
        background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderLeft: 'none', borderBottom: 'none',
        borderRadius: '0 var(--radius-lg) 0 0', boxShadow: 'var(--shadow-3)',
    } as React.CSSProperties,
    head: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } as React.CSSProperties,
    tabs: { display: 'flex', flexWrap: 'wrap', gap: '4px', flex: 1, minWidth: 0 } as React.CSSProperties,
    tab: {
        height: '40px', padding: '0 14px', border: 'none', borderRadius: 'var(--radius-pill)', background: 'transparent',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--text-base)', fontWeight: 500, color: 'var(--text-muted)', cursor: 'pointer',
    } as React.CSSProperties,
    // THE selected look (UI-GUIDE §2).
    tabOn: { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' } as React.CSSProperties,
    searchBox: {
        display: 'flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 12px', width: '200px',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-pill)', background: 'var(--bg-input)',
        color: 'var(--text-muted)', boxSizing: 'border-box',
    } as React.CSSProperties,
    search: {
        flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none', background: 'transparent',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--text-base)', color: 'var(--text-main)',
    } as React.CSSProperties,
    closeBtn: {
        width: '40px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        border: 'none', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    favRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' } as React.CSSProperties,
    favLabel: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginRight: '4px' } as React.CSSProperties,
    favBtn: {
        display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 12px',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-pill)', background: 'var(--bg-surface)',
        fontSize: 'var(--text-sm)', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    chips: { display: 'flex', flexWrap: 'wrap', gap: '6px' } as React.CSSProperties,
    chip: {
        display: 'inline-flex', alignItems: 'center', gap: '6px', height: '40px', padding: '0 14px',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-pill)', background: 'transparent',
        fontSize: 'var(--text-sm)', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    chipOn: { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' } as React.CSSProperties,
    dot: { width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0 } as React.CSSProperties,
    scroll: { flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '2px' } as React.CSSProperties,
    toolGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: '10px' } as React.CSSProperties,
    toolTile: {
        width: '100%', minHeight: '88px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '8px', padding: '14px 8px', boxSizing: 'border-box',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: '#ffffff',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    starBtn: {
        position: 'absolute', top: '2px', right: '2px', width: '40px', height: '40px',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 'var(--radius-sm)', background: 'transparent', cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    itemGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', alignItems: 'start' } as React.CSSProperties,
    itemTile: {
        width: '100%', minHeight: '64px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px',
        padding: '12px', boxSizing: 'border-box', textAlign: 'left',
        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: '#ffffff',
        fontFamily: 'var(--font-ui)', color: 'var(--text-main)', cursor: 'pointer',
    } as React.CSSProperties,
    itemHead: { display: 'flex', alignItems: 'center', gap: '8px' } as React.CSSProperties,
    itemLabel: { fontSize: 'var(--text-sm)', fontWeight: 600, lineHeight: 1.25 } as React.CSSProperties,
    itemContext: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', paddingLeft: '18px' } as React.CSSProperties,
    variants: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' } as React.CSSProperties,
    variantBtn: {
        minHeight: '40px', padding: '0 10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-surface)', fontSize: 'var(--text-sm)', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left',
    } as React.CSSProperties,
    empty: { padding: '24px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    hint: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 1.4 } as React.CSSProperties,
};
