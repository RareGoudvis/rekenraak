import { useRef, useState } from 'react';
import { FloppyDisk, PencilSimple, Copy, Trash, DownloadSimple, UploadSimple } from '@phosphor-icons/react';
import { useBoardStore } from '../useBoardStore';
import {
    loadBoardPresets, deleteBoardPreset, renameBoardPreset, duplicateBoardPreset,
    exportBoardFile, parseBoardFile, type BoardPreset,
} from '../boardPersistence';
import { promptSaveBoard } from '../boardChrome';

const pagesLabel = (n: number) => `${n} ${n === 1 ? 'pagina' : 'pagina’s'}`;
const dateLabel = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Mijn borden (the pill's Bewaren ▾): whole boards kept as templates in this browser, opened in
// one tap; the JSON file (Exporteren / Importeren) carries one to another device. No backend.
export default function BoardLibraryPopover({ onDone }: { onDone: () => void }) {
    const savedBoardId = useBoardStore((s) => s.savedBoardId);
    const [presets, setPresets] = useState<BoardPreset[]>(loadBoardPresets);
    const [status, setStatus] = useState<string | null>(null);
    const importRef = useRef<HTMLInputElement>(null);
    const linked = presets.find(p => p.id === savedBoardId);

    const save = (asNew: boolean) => {
        const { outcome, presets: next } = promptSaveBoard(asNew);
        setPresets(next);
        const name = next.find(p => p.id === useBoardStore.getState().savedBoardId)?.name;
        if (outcome === 'updated') setStatus(`Bijgewerkt: ${name ?? 'bord'}`);
        else if (outcome === 'saved') setStatus(`Bewaard als ${name ?? 'bord'}`);
    };

    const open = (p: BoardPreset) => {
        const st = useBoardStore.getState();
        // Only a board that exists nowhere else asks first; a linked one is already in Mijn borden.
        const hasContent = st.pages.some(pg => pg.strokes.length > 0 || pg.widgets.length > 0);
        if (hasContent && !st.savedBoardId && !window.confirm('Het bord op het scherm is niet bewaard. Toch openen?')) return;
        const file = parseBoardFile(JSON.stringify(p.payload));
        if (!file) { window.alert('Dit bord kan niet meer geopend worden.'); return; }
        st.loadBoard(file.pages, file.activePageIdx, file.settings, p.id);
        onDone();
    };

    const rename = (p: BoardPreset) => {
        const name = window.prompt('Nieuwe naam voor dit bord:', p.name);
        if (name !== null) setPresets(renameBoardPreset(p.id, name));
    };

    const duplicate = (p: BoardPreset) => {
        const next = duplicateBoardPreset(p.id);
        if (next) setPresets(next);
        else window.alert('Kon het bord niet dupliceren (opslag vol?).');
    };

    const remove = (p: BoardPreset) => {
        if (!window.confirm(`„${p.name}” verwijderen uit Mijn borden?`)) return;
        setPresets(deleteBoardPreset(p.id));
        // The board on screen stays; it just no longer has an entry to update.
        if (useBoardStore.getState().savedBoardId === p.id) useBoardStore.getState().setSavedBoardId(null);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const parsed = parseBoardFile(String(reader.result));
            if (!parsed) { window.alert('Dit bestand is geen geldig Rekenraak-bord.'); return; }
            // No savedId: an imported board is new here, so Bewaren asks a name.
            useBoardStore.getState().loadBoard(parsed.pages, parsed.activePageIdx, parsed.settings);
            onDone();
        };
        reader.readAsText(file);
    };

    return (
        <div data-board-library="" style={S.root}>
            <input ref={importRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={handleImportFile} />
            <div style={S.row}>
                <button type="button" className="ui-hover" style={S.primary} onClick={() => save(false)}
                    title={linked ? `Bijwerken in Mijn borden: ${linked.name}` : 'Bewaren in Mijn borden'}>
                    <FloppyDisk size={18} /> Bewaren
                </button>
                <button type="button" className="ui-hover" style={{ ...S.item, flex: 1, justifyContent: 'center', border: '1px solid var(--border-color)' }}
                    onClick={() => save(true)}>
                    Bewaren als…
                </button>
            </div>
            <div style={S.hint} aria-live="polite">
                {status ?? (linked ? `Open: ${linked.name}` : 'Dit bord is nog niet bewaard.')}
            </div>

            <div style={S.section}>Mijn borden</div>
            {presets.length === 0 && <div style={S.empty}>Nog geen borden bewaard.</div>}
            <ul style={S.list}>
                {presets.map(p => (
                    <li key={p.id} data-board-preset={p.id} style={{ ...S.entry, ...(p.id === savedBoardId ? S.entryOn : {}) }}>
                        <div style={S.entryText}>
                            <span style={S.name} title={p.name}>{p.name}</span>
                            <span style={S.meta}>{pagesLabel(p.pageCount)} · {dateLabel(p.savedAt)}</span>
                        </div>
                        <button type="button" className="ui-hover" style={S.openBtn} aria-label={`Openen: ${p.name}`} onClick={() => open(p)}>Openen</button>
                        <button type="button" className="ui-hover" style={S.icon} aria-label={`Hernoemen: ${p.name}`} title="Hernoemen" onClick={() => rename(p)}>
                            <PencilSimple size={18} />
                        </button>
                        <button type="button" className="ui-hover" style={S.icon} aria-label={`Dupliceren: ${p.name}`} title="Dupliceren" onClick={() => duplicate(p)}>
                            <Copy size={18} />
                        </button>
                        <button type="button" className="ui-hover" style={{ ...S.icon, color: 'var(--danger)' }} aria-label={`Verwijderen: ${p.name}`} title="Verwijderen" onClick={() => remove(p)}>
                            <Trash size={18} />
                        </button>
                    </li>
                ))}
            </ul>

            <div style={S.divider} />
            <div style={S.row}>
                <button type="button" className="ui-hover" style={{ ...S.item, flex: 1 }}
                    onClick={() => { const s = useBoardStore.getState(); exportBoardFile(s.pages, s.activePageIdx, s.boardSettings); onDone(); }}>
                    <DownloadSimple size={18} /> Exporteren
                </button>
                <button type="button" className="ui-hover" style={{ ...S.item, flex: 1 }} onClick={() => importRef.current?.click()}>
                    <UploadSimple size={18} /> Importeren
                </button>
            </div>
        </div>
    );
}

const S = {
    root: { display: 'flex', flexDirection: 'column', gap: '4px', width: '420px', maxWidth: 'calc(100vw - 120px)' } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: '6px' } as React.CSSProperties,
    item: {
        display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', padding: '0 12px',
        borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', textAlign: 'left',
        color: 'var(--text-main)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-ui)', cursor: 'pointer',
    } as React.CSSProperties,
    primary: {
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', minHeight: '44px', padding: '0 12px',
        borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: 'var(--accent-on)',
        fontSize: 'var(--text-base)', fontFamily: 'var(--font-ui)', fontWeight: 600, cursor: 'pointer',
    } as React.CSSProperties,
    hint: { padding: '2px 4px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
    section: { padding: '10px 4px 2px', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)', userSelect: 'none' } as React.CSSProperties,
    empty: { padding: '6px 4px 10px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '46vh', overflowY: 'auto' } as React.CSSProperties,
    entry: { display: 'flex', alignItems: 'center', gap: '2px', padding: '4px 4px 4px 8px', borderRadius: 'var(--radius-sm)' } as React.CSSProperties,
    // The board on screen: the soft selected fill without the ring, it is a state not a choice.
    entryOn: { background: 'var(--accent-soft)' } as React.CSSProperties,
    entryText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    name: { fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
    meta: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', whiteSpace: 'nowrap' } as React.CSSProperties,
    openBtn: {
        minHeight: '40px', padding: '0 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        border: '1px solid var(--accent)', background: 'var(--bg-surface)', color: 'var(--accent)',
        fontSize: 'var(--text-sm)', fontFamily: 'var(--font-ui)', fontWeight: 600,
    } as React.CSSProperties,
    icon: {
        width: '40px', height: '40px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer', padding: 0,
    } as React.CSSProperties,
    divider: { height: '1px', background: 'var(--border-color)', margin: '6px 4px' } as React.CSSProperties,
};
