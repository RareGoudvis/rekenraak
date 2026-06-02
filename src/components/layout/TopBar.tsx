import { useState } from 'react';
import { Undo2, Redo2, Sparkles, Share2, Eye, EyeOff, Printer, Check, LayoutGrid, FileText, LayoutTemplate, Key, RotateCcw, Trash2 } from 'lucide-react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { encodeShareLink } from '../../services/persistence';
import IconButton from '../ui/IconButton';
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
    const clearBlocks = useWorksheetStore((s) => s.clearBlocks);
    const hasBlocks = useWorksheetStore((s) => s.blocks.length > 0);

    const handleClearBlocks = () => {
        if (window.confirm('Alle blokken wissen?')) clearBlocks();
    };

    const [massAddOpen, setMassAddOpen] = useState(false);
    const [menu, setMenu] = useState<null | 'share' | 'print'>(null);
    const [shareFlash, setShareFlash] = useState<'full' | 'template' | null>(null);

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
            {/* Row 1 — actions. Row 2 (autosave prompt) sits below so it never clips the bar. */}
            <div style={S.row}>
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

                {/* Alle blokken wissen — icon only, confirm-guarded; spaced apart from Delen */}
                <div style={{ marginRight: 'var(--sp-3)' }}>
                    <IconButton
                        icon={Trash2}
                        label="Alle blokken wissen"
                        onClick={handleClearBlocks}
                        disabled={!hasBlocks}
                        variant="danger"
                    />
                </div>

                {/* Delen — icon only; prompt sheet vs template */}
                <div style={S.menuWrap}>
                    <IconButton
                        icon={shareFlash ? Check : Share2}
                        label={shareFlash ? 'Link gekopieerd' : 'Delen'}
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
                            <div style={S.backdrop} onClick={() => setMenu(null)} />
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

            {autosaveTitle != null && (
                <div style={S.autosaveRow} onClick={(e) => e.stopPropagation()}>
                    <div style={S.autosavePill}>
                        <RotateCcw size={15} style={{ flexShrink: 0, color: 'var(--accent)' }} aria-hidden="true" />
                        <span style={S.autosaveText}>Vorige werkbundel ("{autosaveTitle}") gevonden. Terughalen?</span>
                        <button onClick={onAcceptAutosave} style={S.autosavePrimary}>Ja</button>
                        <button onClick={onDeclineAutosave} style={S.autosaveSecondary}>Nee</button>
                    </div>
                </div>
            )}

            {massAddOpen && <MassAddModal onClose={() => setMassAddOpen(false)} />}
        </div>
    );
}

const S = {
    bar: {
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--sp-2)',
        padding: 'var(--sp-3) var(--sp-4)',
        /* background comes from .mac-vibrant (frosted) — colorblind override makes it opaque */
        border: '1px solid var(--separator)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-1)',
        marginBottom: 'var(--sp-4)',
        flexShrink: 0,
    } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' } as React.CSSProperties,
    group: { display: 'flex', gap: 'var(--sp-1)' } as React.CSSProperties,
    spacer: { flex: 1, minWidth: 0 } as React.CSSProperties,
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
    // Second row: the autosave prompt gets its own full-width line so it never clips the action row.
    autosaveRow: { display: 'flex', justifyContent: 'center', width: '100%' } as React.CSSProperties,
    // Accent-tinted pill so the prompt reads as a distinct, temporary callout.
    autosavePill: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', maxWidth: '100%',
        padding: '5px 6px 5px 12px', borderRadius: 'var(--radius-md)',
        backgroundColor: 'transparent', border: '1px solid var(--accent)',
    } as React.CSSProperties,
    autosaveText: {
        fontSize: 'var(--text-sm)', color: 'var(--accent)', fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
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
