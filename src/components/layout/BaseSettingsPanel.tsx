import { useRef, useState } from 'react';
import { Settings, SlidersHorizontal, BookLock, Download, Upload, Bookmark } from 'lucide-react';
import BaseSettingsModal from './BaseSettingsModal';
import CurriculumBuilderModal from '../curriculum/CurriculumBuilderModal';
import PresetModal from './PresetModal';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { exportWorksheet, parseWorksheetFile } from '../../services/persistence';

// "Geavanceerd" tucked behind a gear icon in the sidebar footer (declutter). The gear
// toggles an upward popover with the teacher tools + file operations (moved here from
// the TopBar's old "⋯ Meer" menu to keep the top bar uncluttered on small laptops).
export default function BaseSettingsPanel() {
    const [open, setOpen] = useState(false);
    const [baseOpen, setBaseOpen] = useState(false);
    const [curriculumOpen, setCurriculumOpen] = useState(false);
    const [presetOpen, setPresetOpen] = useState(false);
    const importInputRef = useRef<HTMLInputElement>(null);
    const loadWorksheet = useWorksheetStore((s) => s.loadWorksheet);

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

    return (
        <div style={S.wrap}>
            <button className="ui-icon-btn" style={S.gearBtn} onClick={() => setOpen(o => !o)} title="Geavanceerd" aria-label="Geavanceerd">
                <Settings size={16} />
            </button>

            {open && (
                <>
                    <div style={S.backdrop} onClick={() => setOpen(false)} />
                    <div style={S.menu}>
                        <button className="ui-hover" style={S.item} onClick={() => { setOpen(false); setBaseOpen(true); }}>
                            <SlidersHorizontal size={14} /> Basisinstellingen
                        </button>
                        <button className="ui-hover" style={S.item} onClick={() => { setOpen(false); setCurriculumOpen(true); }}>
                            <BookLock size={14} /> Curriculum samenstellen
                        </button>
                        <hr style={S.sep} />
                        <button className="ui-hover" style={S.item} onClick={() => { setOpen(false); handleExport(); }}>
                            <Download size={14} /> Exporteer als bestand
                        </button>
                        <button className="ui-hover" style={S.item} onClick={() => { setOpen(false); handleImportClick(); }}>
                            <Upload size={14} /> Importeer bestand
                        </button>
                        <button className="ui-hover" style={S.item} onClick={() => { setOpen(false); setPresetOpen(true); }}>
                            <Bookmark size={14} /> Presets beheren
                        </button>
                    </div>
                </>
            )}

            <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                style={{ display: 'none' }}
            />

            {baseOpen && <BaseSettingsModal onClose={() => setBaseOpen(false)} />}
            {curriculumOpen && <CurriculumBuilderModal onClose={() => setCurriculumOpen(false)} />}
            {presetOpen && <PresetModal onClose={() => setPresetOpen(false)} />}
        </div>
    );
}

const S = {
    wrap: { position: 'relative', display: 'flex', flexShrink: 0 } as React.CSSProperties,
    gearBtn: {
        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        border: '1px solid var(--separator)', backgroundColor: 'var(--bg-surface-2)',
        color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-1)',
    } as React.CSSProperties,
    backdrop: { position: 'fixed', inset: 0, zIndex: 30 } as React.CSSProperties,
    // Opens upward, rightward into the canvas (sidebar is at the screen's left edge, so it
    // must NOT open left). The sidebar drops overflow:hidden so this isn't clipped.
    menu: {
        position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 31,
        minWidth: '210px', background: 'var(--bg-surface)', border: '1px solid var(--separator)',
        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-2)', padding: 'var(--sp-1)',
        display: 'flex', flexDirection: 'column', gap: '2px',
    } as React.CSSProperties,
    item: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', textAlign: 'left',
        padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: 'none',
        background: 'transparent', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
    } as React.CSSProperties,
    sep: { margin: '4px 6px', border: 'none', borderTop: '1px solid var(--separator)' } as React.CSSProperties,
};
