import { useEffect, useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { loadPresets, savePreset, deletePreset, MAX_PRESETS, type Preset } from '../../services/persistence';

interface Props {
    onClose: () => void;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${mi}`;
}

export default function PresetModal({ onClose }: Props) {
    const headerTitle = useWorksheetStore((s) => s.header.titel);
    const loadWorksheet = useWorksheetStore((s) => s.loadWorksheet);

    const [presets, setPresets] = useState<Preset[]>(() => loadPresets());
    const [draftName, setDraftName] = useState<string>(headerTitle || '');

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const refresh = () => setPresets(loadPresets());

    const handleSave = () => {
        const st = useWorksheetStore.getState();
        savePreset(draftName, { blocks: st.blocks, header: st.header, footer: st.footer, docSettings: st.docSettings });
        setDraftName('');
        refresh();
    };

    const handleLoad = (p: Preset) => {
        if (!window.confirm(`Preset "${p.name}" laden? Huidige werkbundel wordt vervangen.`)) return;
        loadWorksheet(p.payload);
        onClose();
    };

    const handleDelete = (p: Preset) => {
        if (!window.confirm(`Preset "${p.name}" verwijderen?`)) return;
        deletePreset(p.id);
        refresh();
    };

    return (
        <div className="no-print" onClick={onClose} style={S.backdrop}>
            <div onClick={(e) => e.stopPropagation()} style={S.modal}>
                <div style={S.header}>
                    <h2 style={S.title}>Presets</h2>
                    <button onClick={onClose} style={S.closeBtn} title="Sluiten (Esc)">×</button>
                </div>

                {/* Save current */}
                <div style={S.saveSection}>
                    <label style={S.label}>Bewaar huidige werkbundel</label>
                    <div style={S.saveRow}>
                        <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            placeholder="Bv. Toets cijferen L4"
                            style={S.input}
                        />
                        <button onClick={handleSave} style={S.primaryBtn}>💾 Bewaar</button>
                    </div>
                    <span style={S.counter}>{presets.length}/{MAX_PRESETS} presets gebruikt</span>
                </div>

                {/* List */}
                <div style={S.listSection}>
                    <label style={S.label}>Opgeslagen presets</label>
                    {presets.length === 0 ? (
                        <p style={S.empty}>Nog geen presets opgeslagen.</p>
                    ) : (
                        <div style={S.list}>
                            {[...presets].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map(p => (
                                <div key={p.id} style={S.row}>
                                    <div style={S.rowMain}>
                                        <span style={S.rowName}>{p.name}</span>
                                        <span style={S.rowMeta}>{formatDate(p.savedAt)} — {p.blockCount} blok{p.blockCount === 1 ? '' : 'ken'}</span>
                                    </div>
                                    <button onClick={() => handleLoad(p)} style={S.rowLoad}>Laad</button>
                                    <button onClick={() => handleDelete(p)} style={S.rowDelete} title="Verwijderen">×</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const S = {
    backdrop: {
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    } as React.CSSProperties,
    modal: {
        backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-color)',
        borderRadius: '12px', padding: '24px 28px', maxWidth: '560px', width: '90%',
        maxHeight: '85vh', overflowY: 'auto', fontFamily: "'Azeret Mono', monospace",
        color: 'var(--text-main)',
    } as React.CSSProperties,
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' } as React.CSSProperties,
    title: { color: 'var(--accent-purple)', margin: 0, fontSize: '16px', textTransform: 'uppercase', letterSpacing: '1px' } as React.CSSProperties,
    closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '22px', cursor: 'pointer', padding: '4px 8px' } as React.CSSProperties,
    saveSection: { marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' } as React.CSSProperties,
    label: { display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 } as React.CSSProperties,
    saveRow: { display: 'flex', gap: '8px', alignItems: 'stretch' } as React.CSSProperties,
    input: {
        flex: 1, padding: '8px 10px', backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-color)', borderRadius: '6px',
        color: 'var(--text-main)', outline: 'none', fontSize: '13px', fontFamily: "'Azeret Mono', monospace",
    } as React.CSSProperties,
    primaryBtn: {
        padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px',
        border: 'none', backgroundColor: 'var(--accent-purple)', color: '#fff', whiteSpace: 'nowrap',
    } as React.CSSProperties,
    counter: { display: 'block', marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' } as React.CSSProperties,
    listSection: {} as React.CSSProperties,
    empty: { fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', margin: '4px 0 0' } as React.CSSProperties,
    list: { display: 'flex', flexDirection: 'column', gap: '6px' } as React.CSSProperties,
    row: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border-color)', borderRadius: '6px',
    } as React.CSSProperties,
    rowMain: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } as React.CSSProperties,
    rowName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
    rowMeta: { fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' } as React.CSSProperties,
    rowLoad: {
        padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '11px',
        border: '1px solid var(--accent-purple)', backgroundColor: 'transparent', color: 'var(--accent-purple)',
    } as React.CSSProperties,
    rowDelete: {
        padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px',
        border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-muted)',
    } as React.CSSProperties,
};
