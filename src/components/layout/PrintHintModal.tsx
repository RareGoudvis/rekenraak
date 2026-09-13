import { useEffect, useRef } from 'react';
import ModalShell from '../ui/ModalShell';

interface Props {
    onContinue: () => void;
    onClose: () => void;
}

// Shown once, before the very first print dialog: the browser's own margin setting
// silently overrides @page, and the menu hint alone is easy to miss.
export default function PrintHintModal({ onContinue, onClose }: Props) {
    const primaryBtnRef = useRef<HTMLButtonElement>(null);
    useEffect(() => { primaryBtnRef.current?.focus(); }, []);
    const titleId = 'print-hint-title';

    return (
        <ModalShell onClose={onClose} ariaLabel="Voor je afdrukt" variant="dialog" maxWidth={460}>
            <div style={{ padding: '32px', fontFamily: 'var(--font-sheet-text)', color: 'var(--text-main)' }} role="dialog" aria-labelledby={titleId}>
                <h2 id={titleId} style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Eén instelling in het printvenster
                </h2>
                <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                    Zet <strong style={{ color: 'var(--text-main)' }}>Marges</strong> op <strong style={{ color: 'var(--text-main)' }}>Geen</strong> (Chrome: "Meer instellingen" → Marges).
                    Anders telt de browser er eigen marges bij en wijkt het blad af van het voorbeeld.
                </p>
                <p style={{ margin: '0 0 24px', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                    De browser onthoudt die keuze; dit bericht zie je maar één keer.
                </p>
                <button
                    ref={primaryBtnRef}
                    onClick={onContinue}
                    style={{
                        width: '100%', padding: '12px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
                        border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-on)',
                    }}
                >Begrepen, naar afdrukken</button>
            </div>
        </ModalShell>
    );
}
