import { useCallback, useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { APP_STRUCTURE, type Domain } from '../../config/appstructure';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import { EENVOUDIG_NAV } from '../../config/eenvoudig/nav';
import { resolveCard } from '../../config/eenvoudig/resolveCard';
import type { CardVariant } from '../../config/eenvoudig/cards';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { kioskSupports } from '../../services/oefenen/kiosk';
import { usableVariants } from '../../oefenen/zelf/zelfSessie';
import PopupSelect from '../ui/PopupSelect';
import SidebarTree from '../layout/SidebarTree';
import { filterByGrade, filterTree, useTreeOpen, type TreeLeaf } from '../layout/sidebarTreeModel';
import { S } from '../layout/sidebarStyles';
import { EenvoudigNav, type NavSection } from '../eenvoudig/EenvoudigPane';
import TopicPanel, { type TopicPanelFilter } from '../eenvoudig/TopicPanel';
import EenvoudigDrawer from '../eenvoudig/EenvoudigDrawer';
import { useAsideRight, useDrawerDismiss } from '../eenvoudig/drawerHooks';
import { useEenvoudigData } from '../eenvoudig/useEenvoudigData';
import { useEenvoudigUi } from '../eenvoudig/useEenvoudigUi';
import { listOefenLeaves, seedRowConstraints, withKioskSeed, type OefenLeaf } from './oefenBuild';

interface Props {
    onAdd(leafId: string, constraints?: Record<string, unknown>, label?: string): void;
    // How often the leaf is already in the session (the count badge).
    isAdded?(leafId: string): number;
}

type Tab = 'eenvoudig' | 'oefeningen';

// The drawer and its click-outside rule anchor on this aside, not on the editor's.
const ASIDE = 'aside.oefen-sidebar';

// The builder's leaves whose kiosk start the kiosk can check.
function kioskLeaves(): Map<string, OefenLeaf> {
    return new Map(listOefenLeaves().filter(l => kioskSupports(l.typeId, l.constraints)).map(l => [l.id, l]));
}

// APP_STRUCTURE cut down to the given leaves; placeholders and emptied parents go.
function kioskTree(ids: Set<string>): Domain[] {
    const out: Domain[] = [];
    for (const dom of APP_STRUCTURE) {
        if (dom.hidden) continue;
        const subdomains = [];
        for (const sub of dom.subdomains) {
            const types = [];
            for (const t of sub.types) {
                if (t.children) {
                    const children = t.children.filter(l => !l.placeholder && ids.has(l.id));
                    if (children.length) types.push({ ...t, children });
                } else if (!t.placeholder && ids.has(t.id)) types.push(t);
            }
            if (types.length) subdomains.push({ ...sub, types });
        }
        if (subdomains.length) out.push({ ...dom, subdomains });
    }
    return out;
}

const oefenTitle = (label: string) => `${label} toevoegen aan de sessie`;

// Oefenmodus's left catalogue: the editor's sidebar (Eenvoudig cards, Uitgebreid tree) showing only what the kiosk can practise.
export default function OefenSidebar({ onAdd, isAdded }: Props) {
    const [tab, setTab] = useState<Tab>(() => (useWorksheetStore.getState().sidebarTab === 'oefeningen' ? 'oefeningen' : 'eenvoudig'));

    // Uitgebreid: starts at the editor's leerjaar but never writes it back (the sheet's grade is not the session's).
    const [grade, setGrade] = useState<Leerjaar | null>(() => useWorksheetStore.getState().selectedGrade);
    const [search, setSearch] = useState('');
    const leaves = useMemo(() => kioskLeaves(), []);
    const fullTree = useMemo(() => kioskTree(new Set(leaves.keys())), [leaves]);
    const tree = useMemo(() => filterByGrade(filterTree(fullTree, search), grade), [fullTree, search, grade]);
    const open = useTreeOpen(search.trim().length > 0);
    const addLeaf = (t: TreeLeaf) => {
        const leaf = leaves.get(t.id);
        if (!leaf) return;
        // The builder's seed: the editor's leerjaar at the moment of adding.
        onAdd(leaf.id, seedRowConstraints(leaf, useWorksheetStore.getState().selectedGrade), leaf.label);
    };
    const countBadge = (leafId: string) => {
        const n = isAdded?.(leafId) ?? 0;
        return n > 0 ? <span style={addedBadge}>{n}×</span> : null;
    };

    // Eenvoudig: the card panel's own leerjaar and picks, as in the editor.
    const data = useEenvoudigData();
    const { grade: ezGrade, setGrade: setEzGrade, resetPicks } = useEenvoudigUi();
    const [topic, setTopic] = useState<string | null>(null);
    const usable = useMemo(() => (data && tab === 'eenvoudig' ? usableVariants(data, ezGrade) : null), [data, ezGrade, tab]);
    const usableIds = useMemo(() => new Set([...(usable?.values() ?? [])].flatMap(list => list.flatMap(c => c.vars.map(v => v.id)))), [usable]);
    const sections: NavSection[] = usable ? EENVOUDIG_NAV.map(s => ({
        ...s,
        topics: s.topics.filter(t => t.hasCards && usable.has(t.id)).map(t => ({ t, count: usable.get(t.id)!.length })),
    })).filter(s => s.topics.length > 0) : [];
    const toggleTopic = (id: string) => {
        if (topic === id) { setTopic(null); return; }
        resetPicks();
        setTopic(id);
    };
    const close = useCallback(() => setTopic(null), []);
    const drawerOpen = tab === 'eenvoudig' && topic !== null && sections.some(s => s.topics.some(x => x.t.id === topic));
    const left = useAsideRight(ASIDE);
    useDrawerDismiss(drawerOpen, close, ASIDE);

    const keep = useCallback((v: CardVariant) => usableIds.has(v.id), [usableIds]);
    const filter: TopicPanelFilter = {
        keep,
        onPick: (v) => {
            const r = resolveCard(v);
            // A card is its own leerjaar preset (resolveCard); the kiosk's start goes on top, as in Zelf oefenen.
            onAdd(r.leafId, withKioskSeed(r.typeId, r.constraints), r.label);
            setTopic(null);
        },
    };

    const pickTab = (next: Tab) => { setTopic(null); setTab(next); };

    return (
        <aside className="mac-vibrant app-panel-left oefen-sidebar" style={S.aside} aria-label="Oefeningen voor de sessie">
            <div className="panel-head">
                <div className="seg-group">
                    <button className="seg-btn" aria-pressed={tab === 'eenvoudig'} onClick={() => pickTab('eenvoudig')}>Eenvoudig</button>
                    <button className="seg-btn" aria-pressed={tab === 'oefeningen'} onClick={() => pickTab('oefeningen')}>Uitgebreid</button>
                </div>
            </div>
            {tab === 'eenvoudig' ? (
                data
                    ? <EenvoudigNav grade={ezGrade} onGrade={g => { setTopic(null); setEzGrade(g); }} sections={sections} openId={drawerOpen ? topic : null} onToggle={toggleTopic} />
                    : <p style={S.noResults}>Laden...</p>
            ) : (<>
                <div style={S.searchWrap}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <MagnifyingGlass size={15} weight="bold" style={S.searchIcon} aria-hidden="true" />
                        <input type="text" placeholder="Zoek oefening…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.searchInput, width: '100%' }} />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                        <PopupSelect
                            value={grade ?? 0}
                            options={[{ value: 0, label: 'Alle' }, ...LEERJAREN.map(g => ({ value: g, label: `L${g}` }))]}
                            onChange={v => setGrade(v === 0 ? null : (v as Leerjaar))}
                            ariaLabel="Leerjaar kiezen"
                        />
                    </div>
                </div>
                <hr style={S.divider} />
                <div style={S.navArea}>
                    <SidebarTree tree={tree} search={search} open={open} onLeaf={addLeaf} leafEnd={countBadge} leafTitle={oefenTitle} />
                </div>
            </>)}
            {drawerOpen && data && topic !== null && (
                <EenvoudigDrawer left={left} title={topic.replace(' · ', ': ')} onClose={close}>
                    <TopicPanel key={topic} topicId={topic} data={data} filter={filter} />
                </EenvoudigDrawer>
            )}
        </aside>
    );
}

// The sidebar's countBadge in the accent tint: this one counts session rows, not leaves in a list.
const addedBadge: React.CSSProperties = {
    flexShrink: 0, padding: '0 6px', minWidth: '20px', textAlign: 'center',
    borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--accent-soft)',
    color: 'var(--accent)', fontSize: 'var(--text-xs)', fontWeight: 600, lineHeight: '17px',
};
