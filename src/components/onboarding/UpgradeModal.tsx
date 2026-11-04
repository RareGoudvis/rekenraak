import { useEffect, useRef } from 'react';
import { Student, Chalkboard } from '@phosphor-icons/react';
import ModalShell from '../ui/ModalShell';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { BETA_TEXT } from '../../config/beta';
import { UPGRADE_TITLE, UPGRADE_INTRO, UPGRADE_MODES, UPGRADE_HIGHLIGHTS } from '../../config/upgradeNotes';

interface Props {
    onClose: () => void;
    onOpenReleaseNotes: () => void;
}

// One-time "what's new" for returning teachers: the two beta modes with a Probeer CTA, then highlights.
export default function UpgradeModal({ onClose, onOpenReleaseNotes }: Props) {
    const setView = useWorksheetStore((s) => s.setView);
    const setOefenBuilderOpen = useWorksheetStore((s) => s.setOefenBuilderOpen);
    // A locked curriculum hides Oefenmodus in the sidebar too (it would offer exercises outside the whitelist).
    const locked = useWorksheetStore((s) => !!s.curriculum?.locked);
    const closeRef = useRef<HTMLButtonElement>(null);
    useEffect(() => { closeRef.current?.focus(); }, []);

    const titleId = 'upgrade-modal-title';
    const tryBord = () => { onClose(); setView('whiteboard'); };
    const tryOefen = () => { onClose(); setOefenBuilderOpen(true); };

    return (
        <ModalShell onClose={onClose} ariaLabel={UPGRADE_TITLE} variant="dialog" maxWidth={720}>
            <div role="dialog" aria-labelledby={titleId} style={S.root}>
                <div style={S.header}>
                    <h2 id={titleId} style={S.title}>{UPGRADE_TITLE}</h2>
                    <p style={S.intro}>{UPGRADE_INTRO}</p>
                </div>
                <div style={S.body}>
                    <div style={S.cards}>
                        {!locked && (
                            <Card icon={<Student size={20} aria-hidden="true" />} title={UPGRADE_MODES.oefenmodus.title}
                                text={UPGRADE_MODES.oefenmodus.text} onTry={tryOefen} />
                        )}
                        <Card icon={<Chalkboard size={20} aria-hidden="true" />} title={UPGRADE_MODES.bordmodus.title}
                            text={UPGRADE_MODES.bordmodus.text} onTry={tryBord} />
                    </div>
                    <ul style={S.list}>
                        {UPGRADE_HIGHLIGHTS.map((h) => <li key={h}>{h}</li>)}
                    </ul>
                </div>
                <div style={S.footer}>
                    <button type="button" onClick={() => { onClose(); onOpenReleaseNotes(); }} style={S.ghostBtn}>Alles wat nieuw is</button>
                    <button ref={closeRef} type="button" onClick={onClose} style={S.primaryBtn}>Sluiten</button>
                </div>
            </div>
        </ModalShell>
    );
}

function Card({ icon, title, text, onTry }: { icon: React.ReactNode; title: string; text: string; onTry: () => void }) {
    return (
        <section aria-label={title} data-testid="upgrade-card" style={S.card}>
            <strong style={S.cardTitle}>{icon}{title}</strong>
            <p style={S.cardText}>{text}</p>
            <p style={S.beta}>{BETA_TEXT}</p>
            <button type="button" onClick={onTry} aria-label={`Probeer ${title}`} style={S.tryBtn}>Probeer</button>
        </section>
    );
}

const S = {
    root: { display: 'flex', flexDirection: 'column', maxHeight: '90vh', fontFamily: 'var(--font-sheet-text)', color: 'var(--text-main)' } as React.CSSProperties,
    header: { padding: '18px 44px 14px 20px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 } as React.CSSProperties,
    title: { margin: '0 0 6px', fontSize: '20px', fontWeight: 700 } as React.CSSProperties,
    intro: { margin: 0, fontSize: 'var(--text-sm)', lineHeight: 1.5, color: 'var(--text-muted)' } as React.CSSProperties,
    body: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' } as React.CSSProperties,
    cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--sp-3)' } as React.CSSProperties,
    card: { padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', border: '1px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', alignItems: 'flex-start' } as React.CSSProperties,
    cardTitle: { display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-base)' } as React.CSSProperties,
    cardText: { margin: 0, fontSize: 'var(--text-sm)', lineHeight: 1.5 } as React.CSSProperties,
    beta: { margin: 0, fontSize: 'var(--text-xs)', lineHeight: 1.4, color: 'var(--text-muted)', flex: 1 } as React.CSSProperties,
    tryBtn: { padding: '6px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-on)', fontWeight: 700, fontFamily: 'inherit' } as React.CSSProperties,
    list: { margin: 0, paddingLeft: 18, fontSize: 'var(--text-sm)', lineHeight: 1.6 } as React.CSSProperties,
    footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '14px 20px', borderTop: '1px solid var(--border-color)', flexShrink: 0 } as React.CSSProperties,
    ghostBtn: { padding: '8px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', fontWeight: 600, fontFamily: 'inherit' } as React.CSSProperties,
    primaryBtn: { padding: '8px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-on)', fontWeight: 700, fontFamily: 'inherit' } as React.CSSProperties,
};
