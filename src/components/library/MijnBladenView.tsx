import { useMemo, useRef, useState } from 'react';
import { X, UploadSimple, FloppyDisk, PencilSimple, Copy, DownloadSimple, Trash, Plus, ArrowRight } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import Wordmark from '../ui/Wordmark';
import SheetThumbnail from '../shared/SheetThumbnail';
import {
    loadPresets, savePreset, renamePreset, deletePreset, duplicatePreset,
    exportWorksheetFile, savePresetFromFile, parseWorksheetFile, clearAutosave,
    type Preset,
} from '../../services/persistence';

type SortKey = 'recent' | 'name';

function formatDate(iso: string): string {
    try { return new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return iso; }
}

// Full-screen local library of the teacher's own saved worksheets ("Mijn bladen").
// Backed by the preset engine; reframed with thumbnails + rename/duplicate/export/delete.
export default function MijnBladenView() {
    const setView = useWorksheetStore((s) => s.setView);
    const loadWorksheet = useWorksheetStore((s) => s.loadWorksheet);
    const clearBlocks = useWorksheetStore((s) => s.clearBlocks);

    const [refresh, setRefresh] = useState(0);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortKey>('recent');
    const fileRef = useRef<HTMLInputElement>(null);
    const bump = () => setRefresh((n) => n + 1);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- `refresh` is the explicit re-read trigger after a mutation
    const presets = useMemo(() => loadPresets(), [refresh]);

    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase();
        const filtered = needle ? presets.filter(p => p.name.toLowerCase().includes(needle)) : presets;
        const sorted = [...filtered];
        if (sort === 'recent') sorted.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
        else sorted.sort((a, b) => a.name.localeCompare(b.name));
        return sorted;
    }, [presets, search, sort]);

    const close = () => setView('editor');

    const handleSaveCurrent = () => {
        const st = useWorksheetStore.getState();
        if (st.blocks.length === 0) { window.alert('Het huidige blad is leeg.'); return; }
        const name = window.prompt('Naam voor dit blad:', st.header.titel || 'Mijn blad');
        if (name === null) return;
        savePreset(name, { blocks: st.blocks, header: st.header, footer: st.footer, docSettings: st.docSettings, baseSettings: st.baseSettings, selectedGrade: st.selectedGrade });
        bump();
    };

    const handleOpen = (p: Preset) => { loadWorksheet(p.payload); close(); };

    const handleNew = () => {
        if (useWorksheetStore.getState().blocks.length > 0 && !window.confirm('Nieuw blad starten? Het huidige (niet-bewaarde) blad wordt gewist.')) return;
        clearBlocks();
        clearAutosave();
        close();
    };

    const handleRename = (p: Preset) => {
        const name = window.prompt('Nieuwe naam:', p.name);
        if (name === null) return;
        renamePreset(p.id, name);
        bump();
    };

    const handleDelete = (p: Preset) => {
        if (window.confirm(`"${p.name}" verwijderen?`)) { deletePreset(p.id); bump(); }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = parseWorksheetFile(String(reader.result));
                const name = file.name.replace(/\.(rekenraak|json)$/i, '');
                savePresetFromFile(parsed, name);
                bump();
            } catch (err) {
                window.alert(`Importeren mislukt: ${(err as Error).message}`);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={S.overlay}>
            <input ref={fileRef} type="file" accept=".rekenraak,application/json,.json" style={{ display: 'none' }} onChange={handleImport} />

            <header style={S.topbar}>
                <div style={S.brand}>
                    <Wordmark height={28} />
                    <span style={S.crumb}>Menu / <b>Mijn bladen</b></span>
                </div>
                <div style={S.topActions}>
                    <button style={S.ghostBtn} onClick={handleSaveCurrent}><FloppyDisk size={15} /> Huidig blad bewaren</button>
                    <button style={S.ghostBtn} onClick={() => fileRef.current?.click()}><UploadSimple size={15} /> Importeer…</button>
                    <button style={S.closeBtn} onClick={close} aria-label="Sluiten"><X size={18} /></button>
                </div>
            </header>

            <div style={S.body}>
                <div style={S.subhead}>
                    <div>
                        <h1 style={S.h1}>Mijn bladen</h1>
                        <span style={S.subMeta}>{presets.length} bewaard · lokaal opgeslagen</span>
                    </div>
                    <div style={S.controls}>
                        <input style={S.search} placeholder="🔎 Zoek in je bladen…" value={search} onChange={(e) => setSearch(e.target.value)} />
                        <select style={S.sortSel} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                            <option value="recent">Laatst bewerkt</option>
                            <option value="name">Naam (A–Z)</option>
                        </select>
                    </div>
                </div>

                <div style={S.grid}>
                    {/* Nieuw blad card */}
                    <button style={S.newCard} onClick={handleNew}>
                        <span style={S.newPlus}><Plus size={26} /></span>
                        <span style={S.newLabel}>Nieuw blad</span>
                        <span style={S.newHint}>of importeer een .rekenraak-bestand</span>
                    </button>

                    {visible.map((p) => (
                        <div key={p.id} style={S.card}>
                            <div style={S.thumbWrap}>
                                <SheetThumbnail file={p.payload} height={260} maxBlocks={3} />
                            </div>
                            <div style={S.cardBody}>
                                <div style={S.cardTitle} title={p.name}>{p.name}</div>
                                <div style={S.cardMeta}>Gewijzigd {formatDate(p.savedAt)} · {p.blockCount} {p.blockCount === 1 ? 'blok' : 'blokken'}</div>
                                <div style={S.cardActions}>
                                    <button style={S.iconBtn} title="Hernoemen" onClick={() => handleRename(p)}><PencilSimple size={15} /></button>
                                    <button style={S.iconBtn} title="Dupliceren" onClick={() => { duplicatePreset(p.id); bump(); }}><Copy size={15} /></button>
                                    <button style={S.iconBtn} title="Exporteren (.rekenraak)" onClick={() => exportWorksheetFile(p.payload, p.name)}><DownloadSimple size={15} /></button>
                                    <button style={{ ...S.iconBtn, color: '#e11d48' }} title="Verwijderen" onClick={() => handleDelete(p)}><Trash size={15} /></button>
                                    <button style={S.openBtn} onClick={() => handleOpen(p)}>Openen <ArrowRight size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {presets.length === 0 && (
                    <div style={S.emptyNote}>Nog geen bewaarde bladen. Maak een blad in de editor en klik “Huidig blad bewaren”.</div>
                )}
            </div>
        </div>
    );
}

const S = {
    overlay: { position: 'fixed', inset: 0, zIndex: 200, background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', overflow: 'hidden' } as React.CSSProperties,
    topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--sp-3) var(--sp-5)', borderBottom: '1px solid var(--separator)', background: 'var(--bg-surface)', flexShrink: 0 } as React.CSSProperties,
    brand: { display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' } as React.CSSProperties,
    crumb: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    topActions: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' } as React.CSSProperties,
    ghostBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', cursor: 'pointer', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    closeBtn: { display: 'inline-flex', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-muted)', cursor: 'pointer' } as React.CSSProperties,
    body: { flex: 1, overflowY: 'auto', padding: 'var(--sp-5) var(--sp-6)' } as React.CSSProperties,
    subhead: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--sp-4)', marginBottom: 'var(--sp-5)', flexWrap: 'wrap' } as React.CSSProperties,
    h1: { margin: 0, fontSize: 'var(--text-2xl)', color: 'var(--text-main)' } as React.CSSProperties,
    subMeta: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    controls: { display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' } as React.CSSProperties,
    search: { padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', minWidth: '240px' } as React.CSSProperties,
    sortSel: { padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', cursor: 'pointer' } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--sp-4)', alignItems: 'start' } as React.CSSProperties,
    newCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '360px', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--separator)', background: 'var(--bg-surface)', color: 'var(--accent)', cursor: 'pointer', padding: 'var(--sp-4)' } as React.CSSProperties,
    newPlus: { display: 'inline-flex' } as React.CSSProperties,
    newLabel: { fontSize: 'var(--text-md)', fontWeight: 600 } as React.CSSProperties,
    newHint: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' } as React.CSSProperties,
    card: { display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-lg)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', overflow: 'hidden', boxShadow: 'var(--shadow-1)' } as React.CSSProperties,
    thumbWrap: { borderBottom: '1px solid var(--separator)', background: '#fff' } as React.CSSProperties,
    cardBody: { padding: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: '4px' } as React.CSSProperties,
    cardTitle: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as React.CSSProperties,
    cardMeta: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '6px' } as React.CSSProperties,
    cardActions: { display: 'flex', alignItems: 'center', gap: '2px' } as React.CSSProperties,
    iconBtn: { display: 'inline-flex', padding: '6px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' } as React.CSSProperties,
    openBtn: { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 } as React.CSSProperties,
    emptyNote: { marginTop: 'var(--sp-5)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' } as React.CSSProperties,
};
