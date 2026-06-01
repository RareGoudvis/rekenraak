import { useRef, useState } from 'react';
import { Undo2, Redo2, Sparkles, Download, Upload, Bookmark, Share2, Eye, EyeOff, Printer, Key, Check, LayoutGrid, MoreHorizontal, FileText, LayoutTemplate, RotateCcw } from 'lucide-react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { exportWorksheet, parseWorksheetFile, encodeShareLink } from '../../services/persistence';
import IconButton from '../ui/IconButton';
import PresetModal from './PresetModal';
import MassAddModal from '../massadd/MassAddModal';

interface Props {
    onPrint: (withSolutions: boolean) => void;
    onOpenHelp?: () => void;
    autosaveTitle?: string | null;          // non-null = show the "vorige werkbundel" row
    onAcceptAutosave?: () => void;
    onDeclineAutosave?: () => void;
}

export default function TopBar({ onPrint, autosaveTitle, onAcceptAutosave, onDeclineAutosave }: Props) {
    const undo = useWorksheetStore((s) => s.undo);
    const redo = useWorksheetStore((s) => s.redo);
    const canUndo = useWorksheetStore((s) => s.canUndo());
    const canRedo = useWorksheetStore((s) => s.canRedo());
    const showSolutions = useWorksheetStore((s) => s.showSolutions);
    const setShowSolutions = useWorksheetStore((s) => s.setShowSolutions);
    const generateAllBlocks = useWorksheetStore((s) => s.generateAllBlocks);
    const loadWorksheet = useWorksheetStore((s) => s.loadWorksheet);
    const hasBlocks = useWorksheetStore((s) => s.blocks.length > 0);

    const importInputRef = useRef<HTMLInputElement>(null);
    const [presetOpen, setPresetOpen] = useState(false);
    const [massAddOpen, setMassAddOpen] = useState(false);
    const [menu, setMenu] = useState<null | 'share' | 'more'>(null);
    const [shareFlash, setShareFlash] = useState<'full' | 'template' | null>(null);

    const handleExport = () => {
        const st = useWorksheetStore.getState();
        exportWorksheet({ blocks: st.blocks, header: st.header, footer: st.footer, docSettings: st.docSettings, baseSettings: st.baseSettings });
    };

    const handleImportClick = () => importInputRef.current?.click();

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = parseWorksheetFile(String(reader.result));
                if (!window.confirm('Huidige werkbundel wordt vervangen. Doorgaan?')) return;
                loadWorksheet(parsed);
            } catch (err) {
                window.alert(`Importeren mislukt: ${(err as Error).message}`);
            }
        };
        reader.onerror = () => window.alert('Bestand kon niet gelezen worden.');
        reader.readAsText(file);
    };

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
        <div className="mac-vibrant" style={S.bar}>
            <div style={S.group}>
                <IconButton icon={Undo2} label="Ongedaan maken (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
                <IconButton icon={Redo2} label="Opnieuw (Ctrl+Y)" onClick={redo} disabled={!canRedo} />
            </div>

            <IconButton
                icon={LayoutGrid}
                label="Meerdere oefeningen tegelijk toevoegen"
                visibleLabel="Toevoegen"
                onClick={() => setMassAddOpen(true)}
                variant="primary"
            />

            <IconButton
                icon={Sparkles}
                label="Alle niet-vergrendelde blokken opnieuw genereren"
                visibleLabel="Genereer alles"
                onClick={() => hasBlocks && generateAllBlocks()}
                disabled={!hasBlocks}
                variant="primary"
            />

            {/* Center slot: doubles as the flex spacer, and hosts the autosave prompt
                (accent-tinted pill) in the middle of the bar when an autosave exists. */}
            <div style={S.center}>
                {autosaveTitle != null && (
                    <div style={S.autosavePill} onClick={(e) => e.stopPropagation()}>
                        <RotateCcw size={15} style={{ flexShrink: 0, color: 'var(--accent)' }} aria-hidden="true" />
                        <span style={S.autosaveText}>Vorige werkbundel ("{autosaveTitle}") gevonden. Terughalen?</span>
                        <button onClick={onAcceptAutosave} style={S.autosavePrimary}>Ja</button>
                        <button onClick={onDeclineAutosave} style={S.autosaveSecondary}>Nee</button>
                    </div>
                )}
            </div>

            {/* Delen — prompt sheet vs template */}
            <div style={S.menuWrap}>
                <IconButton
                    icon={shareFlash ? Check : Share2}
                    label={shareFlash ? 'Link gekopieerd' : 'Delen'}
                    visibleLabel={shareFlash ? 'Gekopieerd' : 'Delen'}
                    onClick={() => setMenu(menu === 'share' ? null : 'share')}
                    variant={shareFlash ? 'active' : 'neutral'}
                />
                {menu === 'share' && (
                    <>
                        <div style={S.backdrop} onClick={() => setMenu(null)} />
                        <div style={S.menu}>
                            <button className="ui-hover" style={S.menuItem} onClick={() => handleShare('full')}>
                                <FileText size={15} /> <span><b>Blad delen</b><br /><span style={S.menuHint}>volledige werkbundel</span></span>
                            </button>
                            <button className="ui-hover" style={S.menuItem} onClick={() => handleShare('template')}>
                                <LayoutTemplate size={15} /> <span><b>Sjabloon delen</b><br /><span style={S.menuHint}>enkel instellingen</span></span>
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* ⋯ Meer — file operations */}
            <div style={S.menuWrap}>
                <IconButton
                    icon={MoreHorizontal}
                    label="Meer acties"
                    onClick={() => setMenu(menu === 'more' ? null : 'more')}
                    variant={menu === 'more' ? 'active' : 'neutral'}
                />
                {menu === 'more' && (
                    <>
                        <div style={S.backdrop} onClick={() => setMenu(null)} />
                        <div style={S.menu}>
                            <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); handleExport(); }}>
                                <Download size={15} /> Exporteer als bestand
                            </button>
                            <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); handleImportClick(); }}>
                                <Upload size={15} /> Importeer bestand
                            </button>
                            <button className="ui-hover" style={S.menuItem} onClick={() => { setMenu(null); setPresetOpen(true); }}>
                                <Bookmark size={15} /> Presets beheren
                            </button>
                        </div>
                    </>
                )}
            </div>

            <IconButton
                icon={showSolutions ? EyeOff : Eye}
                label={showSolutions ? 'Oplossingen verbergen' : 'Oplossingen tonen'}
                onClick={() => setShowSolutions(!showSolutions)}
                variant={showSolutions ? 'danger' : 'neutral'}
            />

            <div style={S.group}>
                <IconButton
                    icon={Printer}
                    label="Afdrukken (Ctrl+P)"
                    visibleLabel="Afdrukken"
                    onClick={() => onPrint(false)}
                    variant="primary"
                    dataTour="print"
                />
                <IconButton
                    icon={Key}
                    label="Afdrukken met oplossingen (sleutel)"
                    onClick={() => onPrint(true)}
                    variant="primary"
                />
            </div>

            <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
            />

            {presetOpen && <PresetModal onClose={() => setPresetOpen(false)} />}
            {massAddOpen && <MassAddModal onClose={() => setMassAddOpen(false)} />}
        </div>
    );
}

const S = {
    bar: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        padding: 'var(--sp-3) var(--sp-4)',
        /* background comes from .mac-vibrant (frosted) — colorblind override makes it opaque */
        border: '1px solid var(--separator)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-1)',
        marginBottom: 'var(--sp-4)',
        flexShrink: 0,
        flexWrap: 'wrap',
    } as React.CSSProperties,
    group: { display: 'flex', gap: 'var(--sp-1)' } as React.CSSProperties,
    spacer: { flex: 1 } as React.CSSProperties,
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
    // Flex spacer that also centers the autosave pill in the middle of the bar.
    center: { flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' } as React.CSSProperties,
    // Accent-tinted pill so the prompt reads as a distinct, temporary callout.
    autosavePill: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', minWidth: 0,
        padding: '5px 6px 5px 12px', borderRadius: 'var(--radius-md)',
        backgroundColor: 'transparent', border: '1px solid var(--accent)',
    } as React.CSSProperties,
    autosaveText: {
        fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
    } as React.CSSProperties,
    autosavePrimary: {
        flexShrink: 0, padding: '4px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 700, fontSize: 'var(--text-sm)',
        border: '1px solid var(--accent)', backgroundColor: 'transparent', color: 'var(--accent)',
    } as React.CSSProperties,
    autosaveSecondary: {
        flexShrink: 0, padding: '4px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 'var(--text-sm)',
        border: '1px solid var(--accent)', backgroundColor: 'transparent', color: 'var(--accent)',
    } as React.CSSProperties,
};
