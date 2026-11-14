import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, MagnifyingGlass, Student, Chalkboard } from '@phosphor-icons/react';
import { APP_STRUCTURE } from '../../config/appstructure';
import { useWorksheetStore, type AddBlockOpts } from '../../store/useWorksheetStore';
import { REGISTRY } from '../../config/exerciseRegistry';
import { seedConstraints } from '../../config/baseSettings';
import ExercisePreview from '../shared/ExercisePreview';
import { LEERJAREN, type Leerjaar } from '../../config/gradePresets';
import SidebarTree from './SidebarTree';
import { filterByGrade, filterTree, useTreeOpen } from './sidebarTreeModel';
import { S } from './sidebarStyles';
import PopupSelect from '../ui/PopupSelect';
import Wordmark from '../ui/Wordmark';
import BetaCaption from '../ui/BetaCaption';
import OverzichtPanel from './OverzichtPanel';
import OefenBuilderModal from '../oefenen/OefenBuilderModal';
import EenvoudigPane from '../eenvoudig/EenvoudigPane';
import EenvoudigPanelHost from '../eenvoudig/EenvoudigPanelHost';
import { effectiveSidebarTab, saveDefaultMode } from '../../services/eenvoudigMode';
import type { SidebarTab } from '../../store/types';

export default function Sidebar() {
    const addBlockFromType = useWorksheetStore((state) => state.addBlockFromType);
    const curriculum = useWorksheetStore((state) => state.curriculum);
    const selectedGrade = useWorksheetStore((state) => state.selectedGrade);
    const setSelectedGrade = useWorksheetStore((state) => state.setSelectedGrade);
    const baseSettings = useWorksheetStore((state) => state.baseSettings);
    const sidebarPreview = useWorksheetStore((state) => state.sidebarPreview);
    const setView = useWorksheetStore((state) => state.setView);
    const locked = !!curriculum?.locked;
    const oefenOpen = useWorksheetStore((state) => state.oefenBuilderOpen);
    const setOefenOpen = useWorksheetStore((state) => state.setOefenBuilderOpen);

    // Hover example: after a short delay over a leaf, show a live preview card anchored
    // to its right (or left if it would overflow). Gated on the sidebarPreview setting.
    const [preview, setPreview] = useState<{ typeId: string; constraints: Record<string, unknown>; top: number; left: number } | null>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // No leafId for the locked palette: its constraints are the curriculum author's, and the
    // store likewise keeps a picked leerjaar away from them.
    const resolveConstraints = (typeId: string, override?: Record<string, unknown>, leafId?: string): Record<string, unknown> | null => {
        if (!REGISTRY[typeId]) return null;
        return seedConstraints({ typeId, base: baseSettings, override, grade: selectedGrade, leafId });
    };
    const leafHover = (typeId: string, override?: Record<string, unknown>, leafId?: string) => ({
        onMouseEnter: (e: React.MouseEvent) => {
            if (!sidebarPreview) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const W = 290;
            const left = rect.right + 12 + W > window.innerWidth ? rect.left - W - 12 : rect.right + 12;
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
            hoverTimer.current = setTimeout(() => {
                const constraints = resolveConstraints(typeId, override, leafId);
                if (constraints) setPreview({ typeId, constraints, top: rect.top, left });
            }, 250);
        },
        onMouseLeave: () => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
            setPreview(null);
        },
    });

    // Adding a block switches the panel to Instellingen, which unmounts the leaf — so its
    // onMouseLeave never fires and a pending/open preview card would hang around on screen.
    // Every add goes through here so the hover state is always torn down with it.
    const addLeaf = (typeId: string, label: string, constraints?: Record<string, unknown>, opts?: AddBlockOpts) => {
        if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
        setPreview(null);
        addBlockFromType(typeId, label, constraints, opts);
    };

    const [search, setSearch] = useState('');
    const storedTab = useWorksheetStore((state) => state.sidebarTab);
    const setSidebarTab = useWorksheetStore((state) => state.setSidebarTab);
    const setEenvoudigPanel = useWorksheetStore((state) => state.setEenvoudigPanel);
    // A locked file only offers its author's palette, which lives in the Uitgebreid pane.
    const tab = effectiveSidebarTab(storedTab, locked);
    // Eenvoudig and Uitgebreid are the two ways to start; the pick is remembered, Werkblad is not a start screen.
    const pickTab = (next: SidebarTab) => {
        setEenvoudigPanel(null);
        if (next === 'eenvoudig' || next === 'oefeningen') saveDefaultMode(next);
        setSidebarTab(next);
    };

    const isSearching = search.trim().length > 0;
    const tree = useMemo(
        () => filterByGrade(filterTree(APP_STRUCTURE.filter(d => !d.hidden), search), selectedGrade),
        [search, selectedGrade],
    );
    const open = useTreeOpen(isSearching);


    return (
        <aside className="mac-vibrant app-panel-left" style={S.aside}>
            <div className="panel-head">
                <div className="seg-group">
                    {!locked && <button className="seg-btn" aria-pressed={tab === 'eenvoudig'} onClick={() => pickTab('eenvoudig')} data-tour="eenvoudig-tab">Eenvoudig</button>}
                    <button className="seg-btn" aria-pressed={tab === 'oefeningen'} onClick={() => pickTab('oefeningen')}>Uitgebreid</button>
                    <button className="seg-btn" aria-pressed={tab === 'overzicht'} onClick={() => pickTab('overzicht')} data-tour="overzicht-tab">Werkblad</button>
                </div>
            </div>
            {tab === 'overzicht' ? <OverzichtPanel /> : tab === 'eenvoudig' ? <EenvoudigPane /> : (<>

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
                                title={`${t.label} toevoegen (één oefening)`}
                                onClick={() => addLeaf(t.typeId, t.label, t.lockedConstraints, { leafId: t.leafId, instruction: t.instruction })}
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
                <div style={{ position: 'relative', flex: 1 }}>
                    <MagnifyingGlass size={15} weight="bold" style={S.searchIcon} aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="Zoek oefening…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ ...S.searchInput, width: '100%' }}
                    />
                </div>
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
                <SidebarTree
                    tree={tree}
                    search={search}
                    open={open}
                    onLeaf={(leaf) => addLeaf(leaf.typeId, leaf.label, leaf.defaultConstraints, { leafId: leaf.id, instruction: leaf.instruction })}
                    hoverOf={(leaf) => leafHover(leaf.typeId, leaf.defaultConstraints, leaf.id)}
                />
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

            {/* The two app modes sit at the foot of the list, not in the TopBar: there they
                pushed stage 0 (all labels) past 1920 px. A locked curriculum hides Oefenmodus
                (it would offer exercises outside the whitelist) but keeps Bordmodus. */}
            <div style={S.modeRow}>
                {!locked && (
                    <button type="button" className="ui-icon-btn" style={S.modeBtn} onClick={() => setOefenOpen(true)}
                        title="Oefenmodus: laat leerlingen oefenen via een link of QR-code" aria-label="Oefenmodus: laat leerlingen oefenen via een link of QR-code">
                        <Student size={16} aria-hidden="true" /><span>Oefenmodus</span>
                    </button>
                )}
                <button type="button" className="ui-icon-btn" style={S.modeBtn} onClick={() => setView('whiteboard')}
                    title="Whiteboard: oefeningen en hulpmiddelen op het digibord" aria-label="Whiteboard: oefeningen en hulpmiddelen op het digibord">
                    <Chalkboard size={16} aria-hidden="true" /><span>Whiteboard</span>
                </button>
            </div>
            <BetaCaption />

            {/* The wordmark anchors the sidebar's foot instead of sitting in the toolbar's
                centre track — that frees the middle of the bar for the sheet's own name.
                Plain link to the static about page rather than a modal — one page to keep
                the project write-up current instead of two. */}
            <a
                className="ui-hover"
                style={S.brandFoot}
                href="/about.html"
                aria-label="Over dit project"
                title="Over dit project"
            >
                <Wordmark height={22} />
            </a>
            {!locked && <EenvoudigPanelHost />}
            {oefenOpen && <OefenBuilderModal onClose={() => setOefenOpen(false)} />}
        </aside>
    );
}
