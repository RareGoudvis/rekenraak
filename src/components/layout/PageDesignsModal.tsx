import { useState } from 'react';
import { FloppyDisk, PencilSimple, Trash } from '@phosphor-icons/react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import type { DocSettings } from '../../store/useWorksheetStore';
import { loadPageDesigns, savePageDesign, deletePageDesign, renamePageDesign, type PageDesign } from '../../services/persistence';
import ModalShell from '../ui/ModalShell';

interface Props {
    onClose: () => void;
}

const DESIGNS_FULL_TEXT = 'Bewaren mislukt: de opslag van deze browser is vol. Verwijder een ander sjabloon of blad en probeer opnieuw.';

// Applying a design REPLACES the look: a key the design never set (an optional style override
// added later) is cleared too, which a plain merge into docSettings would leave behind.
function replacementFor(current: DocSettings, design: DocSettings): Partial<DocSettings> {
    const cleared = Object.fromEntries(Object.keys(current).filter(k => !(k in design)).map(k => [k, undefined]));
    return { ...cleared, ...design } as Partial<DocSettings>;
}

// Named page-design library from the main menu: save / apply / rename / delete a snapshot of
// docSettings (header, footer, opdracht style, spacing, font sizes), never the blocks.
export default function PageDesignsModal({ onClose }: Props) {
    const docSettings = useWorksheetStore((s) => s.docSettings);
    const updateDocSettings = useWorksheetStore((s) => s.updateDocSettings);
    const [designs, setDesigns] = useState<PageDesign[]>(() => loadPageDesigns());
    const refresh = () => setDesigns(loadPageDesigns());
    // An in-app name dialog: window.prompt throws in webviews with native dialogs disabled.
    const [nameModal, setNameModal] = useState<{ mode: 'save' | 'rename'; targetId?: string } | null>(null);
    const [nameValue, setNameValue] = useState('');
    const [nameError, setNameError] = useState<string | null>(null);
    const [applied, setApplied] = useState<string | null>(null);

    const openName = (mode: 'save' | 'rename', value: string, targetId?: string) => {
        setNameValue(value);
        setNameError(null);
        setNameModal({ mode, targetId });
    };
    const handleApply = (d: PageDesign) => {
        if (!window.confirm(`Sjabloon "${d.name}" toepassen?\nVervangt de vormgeving van dit blad, de oefeningen blijven.`)) return;
        // TODO(B1): ensureFontLoaded for the template fonts
        updateDocSettings(replacementFor(useWorksheetStore.getState().docSettings, d.docSettings));
        setApplied(d.id);
    };
    const handleDelete = (d: PageDesign) => {
        if (!window.confirm(`Sjabloon "${d.name}" verwijderen?`)) return;
        deletePageDesign(d.id);
        refresh();
    };
    const handleNameConfirm = () => {
        if (!nameModal) return;
        const ok = nameModal.mode === 'save'
            ? savePageDesign(nameValue, docSettings) !== null
            : !nameModal.targetId || renamePageDesign(nameModal.targetId, nameValue);
        if (!ok) { setNameError(DESIGNS_FULL_TEXT); return; }
        setNameModal(null);
        refresh();
    };

    // The name step replaces the list inside the same card: a second ModalShell would also
    // catch Escape and close both at once.
    return (
        <ModalShell onClose={nameModal ? () => setNameModal(null) : onClose} ariaLabel="Pagina-ontwerp sjablonen" maxWidth={420}>
            {nameModal ? (
                <form style={S.body} onSubmit={(e) => { e.preventDefault(); handleNameConfirm(); }}>
                    <h2 style={S.title}>{nameModal.mode === 'save' ? 'Sjabloon bewaren' : 'Sjabloon hernoemen'}</h2>
                    <div style={S.nameForm}>
                        <label style={S.nameLabel} htmlFor="page-design-name">{nameModal.mode === 'save' ? 'Naam voor dit sjabloon' : 'Nieuwe naam'}</label>
                        <input
                            id="page-design-name"
                            autoFocus
                            type="text"
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            maxLength={80}
                            style={S.nameInput}
                        />
                        {nameError && <p role="alert" style={S.errorText}>{nameError}</p>}
                        <div style={S.nameActions}>
                            <button type="button" style={S.miniBtn} onClick={() => setNameModal(null)}>Annuleren</button>
                            <button type="submit" style={{ ...S.saveBtn, marginBottom: 0 }}>Bewaren</button>
                        </div>
                    </div>
                </form>
            ) : (
                <div style={S.body}>
                    <h2 style={S.title}>Pagina-ontwerp sjablonen</h2>
                    <p style={S.hintText}>Bewaar de vormgeving van dit blad (koptekst, voettekst, opdrachttitels, witruimte, lettergrootte) als sjabloon en pas ze toe op een ander blad. De oefeningen gaan niet mee.</p>
                    <button type="button" style={S.saveBtn} onClick={() => openName('save', '')}>
                        <FloppyDisk size={14} /> Huidig ontwerp bewaren als sjabloon
                    </button>
                    {designs.length === 0 ? (
                        <p style={S.hintText}>Nog geen sjablonen bewaard.</p>
                    ) : (
                        <ul style={S.designList}>
                            {designs.map((d) => (
                                <li key={d.id} style={S.designRow}>
                                    <span style={S.designName} title={d.name}>{d.name}</span>
                                    <div style={S.designActions}>
                                        <button type="button" style={S.miniBtn} onClick={() => handleApply(d)}>{applied === d.id ? 'Toegepast' : 'Toepassen'}</button>
                                        <button type="button" style={S.iconBtn} onClick={() => openName('rename', d.name, d.id)} aria-label={`${d.name} hernoemen`} title="Hernoemen"><PencilSimple size={13} /></button>
                                        <button type="button" style={S.iconBtn} onClick={() => handleDelete(d)} aria-label={`${d.name} verwijderen`} title="Verwijderen"><Trash size={13} /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </ModalShell>
    );
}

const S = {
    body: { padding: 'var(--sp-5)' } as React.CSSProperties,
    title: { margin: '0 0 var(--sp-3)', fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em' } as React.CSSProperties,
    hintText: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: '0 0 var(--sp-3)', lineHeight: 1.4 } as React.CSSProperties,
    errorText: { fontSize: 'var(--text-xs)', color: 'var(--danger)', margin: 0, lineHeight: 1.4 } as React.CSSProperties,
    saveBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: 'var(--text-sm)', fontWeight: 600, borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: 'none', background: 'var(--accent)', color: 'var(--accent-on)', marginBottom: 'var(--sp-3)' } as React.CSSProperties,
    nameForm: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' } as React.CSSProperties,
    nameLabel: { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    nameInput: { padding: '8px 10px', fontSize: 'var(--text-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)' } as React.CSSProperties,
    nameActions: { display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)' } as React.CSSProperties,
    designList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' } as React.CSSProperties,
    designRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface-2)' } as React.CSSProperties,
    designName: { fontSize: 'var(--text-sm)', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
    designActions: { display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 } as React.CSSProperties,
    miniBtn: { padding: '5px 10px', fontSize: 'var(--text-xs)', borderRadius: 'var(--radius-xs)', cursor: 'pointer', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)' } as React.CSSProperties,
    iconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-muted)', borderRadius: 'var(--radius-xs)', cursor: 'pointer' } as React.CSSProperties,
};
