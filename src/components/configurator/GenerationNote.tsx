import { WarningCircle, Info } from '@phosphor-icons/react';
import { GENERATION_FAILED } from '../../services/generateDispatch';

// What the last generate had to do with these settings: which constraints it relaxed, how
// many were possible, or that the generator failed outright (that last one is a fault, so it
// reads as one). Shared by the sheet Inspector and the board inspector.
export default function GenerationNote({ note }: { note: string | null | undefined }) {
    if (!note) return null;
    const failed = note.startsWith(GENERATION_FAILED);
    // Bold only the lead sentence ("Instellingen versoepeld: ...") so the
    // reason that follows the ':' or '—' still reads as plain explanation.
    const separators = [note.indexOf(':'), note.indexOf('—')].filter(i => i >= 0);
    const sepIdx = separators.length ? Math.min(...separators) : -1;
    const lead = sepIdx >= 0 ? note.slice(0, sepIdx) : note;
    const rest = sepIdx >= 0 ? note.slice(sepIdx) : '';
    const NoteIcon = failed ? WarningCircle : Info;
    return (
        <div data-generation-note style={{
            display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-start',
            padding: '8px', border: `1px solid ${failed ? 'var(--danger)' : 'var(--accent)'}`,
            borderRadius: 'var(--radius-sm)', background: failed ? 'var(--danger-soft)' : 'var(--accent-soft)',
            color: 'var(--text-main)', fontSize: 'var(--text-xs)', margin: '0 0 var(--sp-2)',
        }}>
            <NoteIcon size={16} weight="fill" style={{ flexShrink: 0, marginTop: '1px', color: failed ? 'var(--danger)' : 'var(--accent)' }} />
            <span><strong>{lead}</strong>{rest}</span>
        </div>
    );
}
