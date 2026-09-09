import { useEffect, useRef, useState } from 'react';
import { ArrowUUpLeft as Undo2, ArrowUUpRight as Redo2, Sparkle as Sparkles, Eye, EyeSlash as EyeOff, Printer, Check, SquaresFour as LayoutGrid, FileText, Layout as LayoutTemplate, Key, FilePlus, Trash as Trash2, List, FolderOpen, BookOpen, DownloadSimple, UploadSimple, SlidersHorizontal, BookBookmark as BookLock, Question as HelpIcon, ChatText } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { encodeShareLink, clearAutosave, exportWorksheet, parseWorksheetFile } from '../../services/persistence';
import IconButton from '../ui/IconButton';
import Switch from '../ui/Switch';
import MassAddModal from '../massadd/MassAddModal';
import BaseSettingsModal from './BaseSettingsModal';
import CurriculumBuilderModal from '../curriculum/CurriculumBuilderModal';
import { Info } from '@phosphor-icons/react';

interface Props {
    onPrint: (withSolutions: boolean) => void;
    onOpenHelp?: () => void;
    onOpenAbout?: () => void;
}

// The sheet's name belongs in the bar, next to the logo — that is where a document's
// identity lives in every other app. It is the same header.titel the Blad panel edits.
function SheetTitle({ title, onChange }: { title: string; onChange: (t: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const commit = () => { onChange(draft.trim()); setEditing(false); };
    if (editing) {
        return (
            <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') setEditing(false);
                }}
                placeholder="Naam van dit blad"
                style={S.titleInput}
                aria-label="Naam van dit blad"
            />
        );
    }
    return (
        <button
            type="button"
            className="ui-hover bar-title"
            style={{ ...S.titleBtn, color: title ? 'var(--text-main)' : 'var(--text-muted)' }}
            onClick={() => { setDraft(title); setEditing(true); }}
            title="Klik om dit blad een naam te geven"
        >
            {title || 'Naamloos blad'}
        </button>
    );
}

export default function TopBar({ onPrint, onOpenHelp, onOpenAbout }: Props) {
    const undo = useWorksheetStore((s) => s.undo);
    const redo = useWorksheetStore((s) => s.redo);
    const canUndo = useWorksheetStore((s) => s.canUndo());
    const canRedo = useWorksheetStore((s) => s.canRedo());
    const showSolutions = useWorksheetStore((s) => s.showSolutions);
    const setShowSolutions = useWorksheetStore((s) => s.setShowSolutions);
    const generateAllBlocks = useWorksheetStore((s) => s.generateAllBlocks);
    const clearBlocks = useWorksheetStore((s) => s.clearBlocks);
    const hasBlocks = useWorksheetStore((s) => s.blocks.length > 0);
    const saveState = useWorksheetStore((s) => s.saveState);
    const lastSavedAt = useWorksheetStore((s) => s.lastSavedAt);
    const setView = useWorksheetStore((s) => s.setView);
    const loadWorksheet = useWorksheetStore((s) => s.loadWorksheet);
    const headerTitle = useWorksheetStore((s) => s.header.titel);
    const updateHeader = useWorksheetStore((s) => s.updateHeader);
    const sidebarPreview = useWorksheetStore((s) => s.sidebarPreview);
    const setSidebarPreview = useWorksheetStore((s) => s.setSidebarPreview);
    const locked = useWorksheetStore((s) => !!s.curriculum?.locked);
    const menuFileRef = useRef<HTMLInputElement>(null);
    const [baseOpen, setBaseOpen] = useState(false);
    const [curriculumOpen, setCurriculumOpen] = useState(false);

    const handleExport = () => {
        const st = useWorksheetStore.getState();
        exportWorksheet({ blocks: st.blocks, header: st.header, footer: st.footer, docSettings: st.docSettings, baseSettings: st.baseSettings, selectedGrade: st.selectedGrade });
    };
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = parseWorksheetFile(String(reader.result));
                if (window.confirm('Huidige werkbundel wordt vervangen. Doorgaan?')) loadWorksheet(parsed);
            } catch (err) { window.alert(`Importeren mislukt: ${(err as Error).message}`); }
        };
        reader.readAsText(file);
    };

    // Undo is invisible when the block it changed is off-screen, which reads as "nothing
    // happened". Scroll to it and flash it instead.
    const revealBlock = (id: string | null) => {
        if (!id) return;
        requestAnimationFrame(() => {
            const el = document.getElementById(`block-${id}`);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('block-flash');
            window.setTimeout(() => el.classList.remove('block-flash'), 1000);
        });
    };
    const doUndo = () => revealBlock(undo());
    const doRedo = () => revealBlock(redo());

    const handleClearBlocks = () => {
        if (window.confirm('Alle blokken wissen?')) clearBlocks();
    };

    // Start fresh: clear the sheet AND the autosave, otherwise the next load would
    // silently auto-resume the old worksheet again.
    const handleNewSheet = () => {
        if (!hasBlocks || window.confirm('Nieuw blad starten? De huidige werkbundel wordt gewist.')) {
            clearBlocks();
            clearAutosave();
        }
    };

    const [massAddOpen, setMassAddOpen] = useState(false);
    const [menu, setMenu] = useState<null | 'share' | 'print' | 'menu'>(null);
    const [shareFlash, setShareFlash] = useState<'full' | 'template' | null>(null);
    const barRef = useRef<HTMLDivElement>(null);

    // Close any open dropdown on outside click / Escape. A fixed backdrop can't be used here:
    // the `.mac-vibrant` bar has backdrop-filter, which traps position:fixed to the bar instead
    // of the viewport. Clicks inside the bar (triggers, menu items) handle themselves.
    useEffect(() => {
        if (!menu) return;
        const onDown = (e: MouseEvent) => { if (barRef.current && !barRef.current.contains(e.target as Node)) setMenu(null); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [menu]);

    // The tooltips promised these shortcuts and nothing implemented them. Ignored while
    // typing, so undo inside a title or instruction field still means undo the typing.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            const key = e.key.toLowerCase();
            const isRedo = key === 'y' || (key === 'z' && e.shiftKey);
            if (key !== 'z' && key !== 'y') return;
            e.preventDefault();
            if (isRedo) { if (canRedo) doRedo(); } else if (canUndo) doUndo();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const handleShare = async (mode: 'full' | 'template') => {
        setMenu(null);
        const st = useWorksheetStore.getState();
        const link = encodeShareLink({ blocks: st.blocks, header: st.header, footer: st.footer, docSettings: st.docSettings, baseSettings: st.baseSettings }, { template: mode === 'template' });
        if (!link) {
            window.alert('Werkbundel te groot voor een deelbare link. Gebruik Exporteer i.p.v.');
            return;
        }
        try {
            await navigator.clipboard.writeText(link);
            setShareFlash(mode);
            setTimeout(() => setShareFlash(null), 2000);
        } catch {
            window.prompt('Kopieer deze link:', link);
        }
    };

    return (
        <div ref={barRef} className="mac-vibrant topbar" style={S.bar}>
            <input ref={menuFileRef} type="file" accept=".rekenraak,application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />
            {/* Three zones, each the width of the column beneath it, so every control sits
                physically above the thing it changes. The panel tab strips live here rather
                than inside their panels: visually they belong to the bar, functionally to
                the column below (state in the store). */}
            {/* One row: app chrome left, wordmark dead centre, sheet actions right. The
                logo is a grid track of its own so it stays centred whatever the two
                groups weigh. The panel tabs are NOT here — they live in the panel
                headers, which run to the top of the window alongside this bar. */}
            <div style={S.zones}>
              <div style={S.groupLeft}>
                {/* Toevoegen first: it is the sidebar's twin, so it sits hard against it. */}
                <IconButton
                    icon={LayoutGrid}
                    label="Meerdere oefeningen tegelijk kiezen en toevoegen"
                    visibleLabel="Oefeningen toevoegen"
                    onClick={() => setMassAddOpen(true)}
                    variant="secondary"
                />

                {/* One "Meer" menu instead of a ≡ and a ⚙ side by side: two unlabelled
                    icons that both opened a list of app-level things was a guess the
                    teacher had to make. Everything app-level now lives behind one word. */}
                <div style={S.menuWrap}>
                    <IconButton
                        icon={List}
                        label="Meer: werkbladen, bestand, delen, instellingen"
                        visibleLabel="Meer"
                        onClick={() => setMenu(menu === 'menu' ? null : 'menu')}
                        dataTour="menu"
                    />
                    {menu === 'menu' && (
                        <>
                            <div className="ui-menu" style={{ ...S.menu, left: 0, right: 'auto', minWidth: '230px' }}>
                                <div style={S.sectionLabel}>Werkbladen</div>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); setView('mijn-bladen'); }}>
                                    <FolderOpen size={15} /> Mijn bladen
                                </button>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); setView('bibliotheek'); }}>
                                    <BookOpen size={15} /> Kant-en-klare bladen
                                </button>

                                <div style={S.menuDivider} />
                                <div style={S.sectionLabel}>Bestand</div>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); menuFileRef.current?.click(); }}>
                                    <UploadSimple size={15} /> Importeren…
                                </button>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); handleExport(); }}>
                                    <DownloadSimple size={15} /> Exporteren…
                                </button>

                                <div style={S.menuDivider} />
                                <div style={S.sectionLabel}>Delen</div>
                                <button className="ui-hover" style={S.menuItem} onClick={() => handleShare('full')}>
                                    <FileText size={15} /> <span>Blad delen<br /><span style={S.menuHint}>volledige werkbundel</span></span>
                                </button>
                                <button className="ui-hover" style={S.menuItem} onClick={() => handleShare('template')}>
                                    <LayoutTemplate size={15} /> <span>Sjabloon delen<br /><span style={S.menuHint}>enkel instellingen</span></span>
                                </button>

                                {!locked && (
                                    <>
                                        <div style={S.menuDivider} />
                                        <div style={S.sectionLabel}>Werkblad</div>
                                        <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); setBaseOpen(true); }}>
                                            <SlidersHorizontal size={15} /> Basisinstellingen
                                        </button>
                                        <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); setCurriculumOpen(true); }}>
                                            <BookLock size={15} /> Curriculum samenstellen
                                        </button>
                                    </>
                                )}

                                <div style={S.menuDivider} />
                                <div style={S.sectionLabel}>Weergave</div>
                                <div style={{ ...S.menuItem, justifyContent: 'space-between', cursor: 'default' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}><Eye size={15} /> Voorbeeld bij zweven</span>
                                    <Switch checked={sidebarPreview} onChange={setSidebarPreview} aria-label="Voorbeeld bij zweven" />
                                </div>

                                <div style={S.menuDivider} />
                                {/* Destructive actions live here, not next to Afdrukken. Tinted at
                                    rest, solid red only on hover (.is-danger in index.css). */}
                                <button className="ui-hover is-danger" style={S.menuItemDanger} onClick={() => { setMenu(null); handleNewSheet(); }}>
                                    <FilePlus size={15} /> Nieuw blad beginnen
                                </button>
                                <button className="ui-hover is-danger" style={S.menuItemDanger} disabled={!hasBlocks} onClick={() => { setMenu(null); handleClearBlocks(); }}>
                                    <Trash2 size={15} /> Alle oefeningen wissen
                                </button>

                                <div style={S.menuDivider} />
                                <div style={S.sectionLabel}>Over dit project</div>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); onOpenAbout?.(); }}>
                                    <Info size={15} /> Over dit project
                                </button>
                                <a className="ui-hover" style={{ ...S.menuItem, textDecoration: 'none' }} href="https://forms.gle/jc1LcMXaRG3V3M556" target="_blank" rel="noopener noreferrer" onClick={() => setMenu(null)}>
                                    <ChatText size={15} /> Feedback geven
                                </a>
                            </div>
                        </>
                    )}
                </div>

                <IconButton icon={HelpIcon} label="Uitleg en rondleiding" visibleLabel="Uitleg" onClick={() => onOpenHelp?.()} />

              </div>

              {/* Middle track: wordmark plus the save status directly to its right. That
                  leaves the space LEFT of the logo free for user hints later. */}
              <div style={S.centreTrack}>
                <span className="bar-beta" style={S.betaChip} title="RekenRaak is nog in ontwikkeling — bewaar je bladen ook als bestand.">beta</span>
                <SheetTitle title={headerTitle} onChange={(t) => updateHeader({ titel: t })} />
                <div
                    style={S.saveChip}
                    title={lastSavedAt ? `Laatst bewaard om ${new Date(lastSavedAt).toLocaleTimeString('nl-BE')}` : 'Wijzigingen worden automatisch lokaal bewaard'}
                >
                    <span style={{ ...S.saveDot, background: saveState === 'saving' ? '#d97706' : saveState === 'saved' ? '#16a34a' : 'var(--text-muted)' }} />
                    <span className="bar-save-text">{saveState === 'saving' ? 'Bewaren…' : 'Automatisch bewaard'}</span>
                </div>
              </div>

              <div style={S.groupRight}>

                <div className="bar-undo" style={S.group}>
                    <IconButton icon={Undo2} label="Ongedaan maken (Ctrl+Z)" onClick={doUndo} disabled={!canUndo} />
                    <IconButton icon={Redo2} label="Opnieuw (Ctrl+Y)" onClick={doRedo} disabled={!canRedo} />
                </div>

                <IconButton
                    icon={Sparkles}
                    label="Alle niet-vergrendelde blokken opnieuw genereren"
                    visibleLabel="Genereer alles"
                    onClick={() => hasBlocks && generateAllBlocks()}
                    disabled={!hasBlocks}
                    variant="secondary"
                />

                {shareFlash && <span style={S.shareFlash}><Check size={14} /> Link gekopieerd</span>}

                {/* Labelled: an eye alone doesn't say whether it shows or hides answers. */}
                <IconButton
                    icon={showSolutions ? EyeOff : Eye}
                    label={showSolutions ? 'Oplossingen verbergen' : 'Oplossingen tonen'}
                    visibleLabel="Oplossingen"
                    onClick={() => setShowSolutions(!showSolutions)}
                    variant={showSolutions ? 'active' : 'neutral'}
                />

                {/* Afdrukken — single button; choose worksheet vs worksheet+solutions */}
                <div style={S.menuWrap}>
                    <IconButton
                        icon={Printer}
                        label="Afdrukken (Ctrl+P)"
                        visibleLabel="Afdrukken"
                        className="keep-label"
                        onClick={() => setMenu(menu === 'print' ? null : 'print')}
                        variant="primary"
                        dataTour="print"
                    />
                    {menu === 'print' && (
                        <>
                            <div className="ui-menu" style={S.menu}>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); onPrint(false); }}>
                                    <FileText size={15} /> Werkblad
                                </button>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); onPrint(true); }}>
                                    <Key size={15} /> Werkblad + oplossingen
                                </button>
                                {/* The browser's own margin setting silently overrides @page, so the
                                    only fix is telling the teacher. Chrome's "Standaard" adds ~10mm
                                    on top of the sheet's own 17mm and the print stops matching the
                                    preview; "Geen" leaves the sheet's margins alone. */}
                                <div style={S.printHint}>
                                    Zet <strong>Marges</strong> op <strong>Geen</strong> in het
                                    printvenster — anders telt de browser er eigen marges bij en
                                    wijkt het blad af van het voorbeeld.
                                </div>
                            </div>
                        </>
                    )}
                </div>
              </div>
            </div>

            {massAddOpen && <MassAddModal onClose={() => setMassAddOpen(false)} />}
            {baseOpen && <BaseSettingsModal onClose={() => setBaseOpen(false)} />}
            {curriculumOpen && <CurriculumBuilderModal onClose={() => setCurriculumOpen(false)} />}
        </div>
    );
}

const S = {
    bar: {
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'stretch',
        // SYNC: --bar-h is what .panel-head uses, so the three column headers share a baseline.
        height: 'var(--bar-h)',
        padding: '0 var(--sp-5)',
        /* Full-width header: background from .mac-vibrant (frosted), separated by a bottom hairline.
           position+zIndex so the dropdown menus paint ABOVE the panel body below (which is a
           later, opaque sibling — without this the menus open hidden behind it). */
        borderBottom: '1px solid var(--separator)',
        position: 'relative', zIndex: 50,
        flexShrink: 0,
    } as React.CSSProperties,
    logoBtn: { background: 'transparent', border: 'none', padding: '2px 6px', marginRight: 'var(--sp-2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' } as React.CSSProperties,
    // SYNC: the outer column widths must match Sidebar's aside (286px) and Inspector's (338px).
    // 1fr | auto | 1fr keeps the wordmark optically centred no matter how the two action
    // groups grow, which a plain flex row with space-between does not.
    // The centre track is minmax(0, auto), NOT auto: an `auto` track refuses to shrink
    // below its content, so a long sheet name used to push the two action groups into
    // each other instead of truncating itself. With a 0 floor the title's own maxWidth +
    // ellipsis absorbs the squeeze. (No overflow:hidden on the groups — it would clip the
    // dropdown menus, which are absolutely positioned inside them.)
    zones: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, auto) minmax(0, 1fr)', alignItems: 'center', gap: 'var(--sp-3)' } as React.CSSProperties,
    groupLeft: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0, justifySelf: 'start', paddingRight: 'var(--sp-5)' } as React.CSSProperties,
    groupRight: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0, justifySelf: 'end', paddingLeft: 'var(--sp-5)' } as React.CSSProperties,
    centreTrack: { display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', whiteSpace: 'nowrap', minWidth: 0, justifyContent: 'center' } as React.CSSProperties,
    group: { display: 'flex', gap: 'var(--sp-1)', marginRight: 'var(--sp-2)' } as React.CSSProperties,
    spacer: { flex: 1, minWidth: 0 } as React.CSSProperties,
    vsep: { width: '1px', alignSelf: 'stretch', margin: '2px 4px', background: 'var(--separator)', flexShrink: 0 } as React.CSSProperties,
    menuWrap: { position: 'relative', display: 'flex' } as React.CSSProperties,
    backdrop: { position: 'fixed', inset: 0, zIndex: 30 } as React.CSSProperties,
    menu: {
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 31,
        minWidth: '210px', background: 'var(--bg-surface)', border: '1px solid var(--separator)',
        borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-2)', padding: 'var(--sp-1)',
        display: 'flex', flexDirection: 'column', gap: '1px',
    } as React.CSSProperties,
    printHint: { padding: 'var(--sp-2) var(--sp-3)', margin: 'var(--sp-1) 0 0', borderTop: '1px solid var(--separator)', fontSize: 'var(--text-xs)', lineHeight: 1.45, color: 'var(--text-muted)', maxWidth: '260px' } as React.CSSProperties,
    menuItem: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', width: '100%', textAlign: 'left',
        padding: '5px 10px', borderRadius: 'var(--radius-xs)', cursor: 'pointer', border: 'none',
        background: 'transparent', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
    } as React.CSSProperties,
    menuHint: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 400 } as React.CSSProperties,
    // Destructive menu row: tinted at rest, solid red on hover via .is-danger (index.css).
    menuItemDanger: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', width: '100%', textAlign: 'left',
        padding: '5px 10px', borderRadius: 'var(--radius-xs)', cursor: 'pointer', border: 'none',
        background: 'transparent', color: 'var(--danger)', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
    } as React.CSSProperties,
    titleBtn: {
        maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        background: 'transparent', border: '1px solid transparent', borderRadius: 'var(--radius-sm)',
        padding: '3px 8px', cursor: 'text',
        fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'inherit',
    } as React.CSSProperties,
    titleInput: {
        width: '320px', padding: '3px 8px',
        background: 'var(--bg-surface-2)', border: '1px solid var(--accent)',
        borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', outline: 'none',
        fontSize: 'var(--text-md)', fontWeight: 600, fontFamily: 'inherit',
    } as React.CSSProperties,
    menuDivider: { height: '1px', background: 'var(--separator)', margin: '4px 6px' } as React.CSSProperties,
    sectionLabel: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, padding: '6px 10px 2px' } as React.CSSProperties,
    shareFlash: { display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: 'var(--sp-2)', fontSize: 'var(--text-xs)', color: '#16a34a', whiteSpace: 'nowrap' } as React.CSSProperties,
    betaChip: {
        padding: '2px 8px', borderRadius: 'var(--radius-pill)',
        border: '1px solid var(--separator)', color: 'var(--text-muted)',
        fontSize: 'var(--text-xs)', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'default',
    } as React.CSSProperties,
    saveChip: {
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', cursor: 'default',
    } as React.CSSProperties,
    saveDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, transition: 'background var(--dur) var(--ease-out)' } as React.CSSProperties,
};
