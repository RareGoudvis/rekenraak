import { useRef, useState } from 'react';
import { Undo2, Redo2, Sparkles, Download, Upload, Bookmark, Share2, Eye, EyeOff, Printer, Check, LayoutGrid, MoreHorizontal, FileText, LayoutTemplate } from 'lucide-react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { exportWorksheet, parseWorksheetFile, encodeShareLink } from '../../services/persistence';
import IconButton from '../ui/IconButton';
import PresetModal from './PresetModal';
import MassAddModal from '../massadd/MassAddModal';

interface Props {
    onPrint: (withSolutions: boolean) => void;
    onOpenHelp?: () => void;
}

export default function TopBar({ onPrint }: Props) {
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
        <div style={S.bar}>
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

            <div style={S.spacer} />

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
                />
                <IconButton
                    icon={Printer}
                    label="Afdrukken met oplossingen"
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
        backgroundColor: 'var(--bg-surface)',
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
};
