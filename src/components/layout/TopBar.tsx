import { useEffect, useRef, useState } from 'react';
import { ArrowUUpLeft as Undo2, ArrowUUpRight as Redo2, Sparkle as Sparkles, Eye, EyeSlash as EyeOff, Printer, Check, SquaresFour as LayoutGrid, FileText, Layout as LayoutTemplate, Key, FilePlus, Trash as Trash2, List, FolderOpen, BookOpen, DownloadSimple, UploadSimple, Gear as SettingsIcon, SlidersHorizontal, BookBookmark as BookLock, Question as HelpIcon, ChatText, Heart } from '@phosphor-icons/react';
import { useWorksheetStore, type ThemeName } from '../../store/useWorksheetStore';
import { encodeShareLink, clearAutosave, exportWorksheet, parseWorksheetFile } from '../../services/persistence';
import IconButton from '../ui/IconButton';
import Switch from '../ui/Switch';
import MassAddModal from '../massadd/MassAddModal';
import BaseSettingsModal from './BaseSettingsModal';
import CurriculumBuilderModal from '../curriculum/CurriculumBuilderModal';
import AboutModal from './AboutModal';
import Wordmark from '../ui/Wordmark';
import { Info } from '@phosphor-icons/react';

interface Props {
    onPrint: (withSolutions: boolean) => void;
    onOpenHelp?: () => void;
}

export default function TopBar({ onPrint, onOpenHelp }: Props) {
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
    const theme = useWorksheetStore((s) => s.theme);
    const setTheme = useWorksheetStore((s) => s.setTheme);
    const sidebarPreview = useWorksheetStore((s) => s.sidebarPreview);
    const setSidebarPreview = useWorksheetStore((s) => s.setSidebarPreview);
    const locked = useWorksheetStore((s) => !!s.curriculum?.locked);
    const menuFileRef = useRef<HTMLInputElement>(null);
    const [baseOpen, setBaseOpen] = useState(false);
    const [curriculumOpen, setCurriculumOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);

    const THEMES: Array<{ id: ThemeName; label: string }> = [
        { id: 'light', label: 'Licht' }, { id: 'dark', label: 'Donker' }, { id: 'colorblind', label: 'Contrast' },
    ];

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
    const [menu, setMenu] = useState<null | 'share' | 'print' | 'menu' | 'settings'>(null);
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
        <div ref={barRef} className="mac-vibrant" style={S.bar}>
            <input ref={menuFileRef} type="file" accept=".rekenraak,application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />
            <div style={S.row}>
                {/* Logo — far left of the full-width header; opens "Over dit project". */}
                <button type="button" className="ui-hover" style={S.logoBtn} onClick={() => setAboutOpen(true)} aria-label="Over dit project">
                    <Wordmark height={28} />
                </button>

                {/* Menu (≡) — library navigation + file ops */}
                <div style={S.menuWrap}>
                    <IconButton
                        icon={List}
                        label="Menu"
                        onClick={() => setMenu(menu === 'menu' ? null : 'menu')}
                        dataTour="menu"
                    />
                    {menu === 'menu' && (
                        <>
                            <div style={{ ...S.menu, left: 0, right: 'auto', minWidth: '230px' }}>
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
                            </div>
                        </>
                    )}
                </div>

                {/* ⚙ Settings + ? Help sit next to the ≡ Menu — app-level controls grouped left. */}
                <div style={S.menuWrap}>
                    <IconButton icon={SettingsIcon} label="Instellingen" onClick={() => setMenu(menu === 'settings' ? null : 'settings')} dataTour="settings" />
                    {menu === 'settings' && (
                        <>
                            <div style={{ ...S.menu, left: 0, right: 'auto', minWidth: '240px' }}>
                                {!locked && (
                                    <>
                                        <div style={S.sectionLabel}>Werkblad</div>
                                        <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); setBaseOpen(true); }}>
                                            <SlidersHorizontal size={15} /> Basisinstellingen
                                        </button>
                                        <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); setCurriculumOpen(true); }}>
                                            <BookLock size={15} /> Curriculum samenstellen
                                        </button>
                                        <div style={S.menuDivider} />
                                    </>
                                )}
                                <div style={S.sectionLabel}>Weergave</div>
                                <div className="seg-group" style={{ margin: '0 6px 6px' }}>
                                    {THEMES.map((t) => (
                                        <button key={t.id} className="seg-btn" aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</button>
                                    ))}
                                </div>
                                <div style={{ ...S.menuItem, justifyContent: 'space-between', cursor: 'default' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}><Eye size={15} /> Voorbeeld bij zweven</span>
                                    <Switch checked={sidebarPreview} onChange={setSidebarPreview} aria-label="Voorbeeld bij zweven" />
                                </div>

                                <div style={S.menuDivider} />
                                <div style={S.sectionLabel}>Over &amp; steun</div>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); setAboutOpen(true); }}>
                                    <Info size={15} /> Over dit project
                                </button>
                                <a className="ui-hover" style={{ ...S.menuItem, textDecoration: 'none' }} href="https://forms.gle/jc1LcMXaRG3V3M556" target="_blank" rel="noopener noreferrer" onClick={() => setMenu(null)}>
                                    <ChatText size={15} /> Feedback geven
                                </a>
                                <a className="ui-hover" style={{ ...S.menuItem, textDecoration: 'none', color: '#e11d48' }} href="https://buymeacoffee.com/raregoudvis" target="_blank" rel="noopener noreferrer" onClick={() => setMenu(null)}>
                                    <Heart size={15} weight="fill" /> Steun met een koffie
                                </a>
                            </div>
                        </>
                    )}
                </div>

                <IconButton icon={HelpIcon} label="Help / uitleg" onClick={() => onOpenHelp?.()} />

                <div style={S.vsep} />

                <div style={S.group}>
                    <IconButton icon={Undo2} label="Ongedaan maken (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
                    <IconButton icon={Redo2} label="Opnieuw (Ctrl+Y)" onClick={redo} disabled={!canRedo} />
                </div>

                <IconButton
                    icon={FilePlus}
                    label="Nieuw blad (huidige werkbundel wissen)"
                    onClick={handleNewSheet}
                />

                <IconButton
                    icon={LayoutGrid}
                    label="Meerdere oefeningen tegelijk toevoegen"
                    visibleLabel="Toevoegen"
                    onClick={() => setMassAddOpen(true)}
                    variant="secondary"
                />

                <IconButton
                    icon={Sparkles}
                    label="Alle niet-vergrendelde blokken opnieuw genereren"
                    visibleLabel="Genereer alles"
                    onClick={() => hasBlocks && generateAllBlocks()}
                    disabled={!hasBlocks}
                    variant="primary"
                />

                <div style={S.spacer} />

                {/* Autosave tracker — green when saved, amber while saving; hover shows the time. */}
                <div
                    style={S.saveChip}
                    title={lastSavedAt ? `Laatst bewaard om ${new Date(lastSavedAt).toLocaleTimeString('nl-BE')}` : 'Wijzigingen worden automatisch lokaal bewaard'}
                >
                    <span style={{ ...S.saveDot, background: saveState === 'saving' ? '#d97706' : saveState === 'saved' ? '#16a34a' : 'var(--text-muted)' }} />
                    <span>{saveState === 'saving' ? 'Bewaren…' : 'Automatisch bewaard'}</span>
                </div>

                {/* Alle blokken wissen — icon only, confirm-guarded */}
                <div style={{ marginRight: 'var(--sp-3)' }}>
                    <IconButton
                        icon={Trash2}
                        label="Alle blokken wissen"
                        onClick={handleClearBlocks}
                        disabled={!hasBlocks}
                        variant="danger"
                    />
                </div>

                {shareFlash && <span style={S.shareFlash}><Check size={14} /> Link gekopieerd</span>}

                <IconButton
                    icon={showSolutions ? EyeOff : Eye}
                    label={showSolutions ? 'Oplossingen verbergen' : 'Oplossingen tonen'}
                    onClick={() => setShowSolutions(!showSolutions)}
                    variant={showSolutions ? 'danger' : 'neutral'}
                />

                {/* Afdrukken — single button; choose worksheet vs worksheet+solutions */}
                <div style={S.menuWrap}>
                    <IconButton
                        icon={Printer}
                        label="Afdrukken (Ctrl+P)"
                        visibleLabel="Afdrukken"
                        onClick={() => setMenu(menu === 'print' ? null : 'print')}
                        variant="primary"
                        dataTour="print"
                    />
                    {menu === 'print' && (
                        <>
                            <div style={S.menu}>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); onPrint(false); }}>
                                    <FileText size={15} /> Werkblad
                                </button>
                                <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); onPrint(true); }}>
                                    <Key size={15} /> Werkblad + oplossingen
                                </button>
                            </div>
                        </>
                    )}
                </div>

            </div>

            {massAddOpen && <MassAddModal onClose={() => setMassAddOpen(false)} />}
            {baseOpen && <BaseSettingsModal onClose={() => setBaseOpen(false)} />}
            {curriculumOpen && <CurriculumBuilderModal onClose={() => setCurriculumOpen(false)} />}
            {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
        </div>
    );
}

const S = {
    bar: {
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--sp-2)',
        padding: 'var(--sp-2) var(--sp-4)',
        /* Full-width header: background from .mac-vibrant (frosted), separated by a bottom hairline.
           position+zIndex so the dropdown menus paint ABOVE the panel body below (which is a
           later, opaque sibling — without this the menus open hidden behind it). */
        borderBottom: '1px solid var(--separator)',
        position: 'relative', zIndex: 50,
        flexShrink: 0,
    } as React.CSSProperties,
    logoBtn: { background: 'transparent', border: 'none', padding: '2px 6px', marginRight: 'var(--sp-2)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', flexShrink: 0 } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' } as React.CSSProperties,
    group: { display: 'flex', gap: 'var(--sp-1)' } as React.CSSProperties,
    spacer: { flex: 1, minWidth: 0 } as React.CSSProperties,
    vsep: { width: '1px', alignSelf: 'stretch', margin: '2px 4px', background: 'var(--separator)', flexShrink: 0 } as React.CSSProperties,
    menuWrap: { position: 'relative', display: 'flex' } as React.CSSProperties,
    backdrop: { position: 'fixed', inset: 0, zIndex: 30 } as React.CSSProperties,
    menu: {
        position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 31,
        minWidth: '210px', background: 'var(--bg-surface)', border: '1px solid var(--separator)',
        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-2)', padding: 'var(--sp-1)',
        display: 'flex', flexDirection: 'column', gap: '2px',
    } as React.CSSProperties,
    menuItem: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', textAlign: 'left',
        padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: 'none',
        background: 'transparent', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
    } as React.CSSProperties,
    menuHint: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 400 } as React.CSSProperties,
    menuDivider: { height: '1px', background: 'var(--separator)', margin: '4px 6px' } as React.CSSProperties,
    sectionLabel: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '6px 10px 2px' } as React.CSSProperties,
    shareFlash: { display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: 'var(--sp-2)', fontSize: 'var(--text-xs)', color: '#16a34a', whiteSpace: 'nowrap' } as React.CSSProperties,
    saveChip: {
        display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'var(--sp-3)',
        fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', cursor: 'default',
    } as React.CSSProperties,
    saveDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, transition: 'background var(--dur) var(--ease-out)' } as React.CSSProperties,
};
