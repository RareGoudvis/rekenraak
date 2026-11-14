import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, QrCode } from '@phosphor-icons/react';
import { drawQr, qrMatrixOrNull } from '../../services/qr';
import ModalShell from '../ui/ModalShell';

// 8 px modules: the short kind.html link stays a small code, ~260 px on screen, big enough for a projector.
const MODULE_PX = 8;

function QrCanvas({ matrix }: { matrix: boolean[][] }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => { if (ref.current) drawQr(ref.current, matrix, MODULE_PX); }, [matrix]);
    return <canvas ref={ref} role="img" aria-label="QR-code van de link naar Zelf oefenen" style={S.qr} />;
}

// The QR in its own small dialog, so the card never changes size. Escape closes only this layer; one worded Sluiten instead of the corner X.
function QrDialog({ matrix, link, onClose }: { matrix: boolean[][]; link: string; onClose: () => void }) {
    useEffect(() => {
        // Capture phase on window: the builder's own Escape handler must not close the builder too.
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    return (
        <ModalShell onClose={onClose} ariaLabel="QR-code Zelf oefenen" maxWidth={380} hideClose>
            <div style={S.dialog}>
                <h3 style={S.dialogTitle}>Zelf oefenen</h3>
                <p style={S.hint}>Leerlingen scannen de code met de camera van hun toestel.</p>
                <QrCanvas matrix={matrix} />
                <span style={S.dialogLink}>{link.replace(/^https?:\/\//, '')}</span>
                <button type="button" className="ui-hover" style={S.btn} onClick={onClose}>Sluiten</button>
            </div>
        </ModalShell>
    );
}

// The pupil entry without a teacher link: one fixed address to hand out (kind.html needs no hash).
export default function ZelfLinkCard() {
    const link = `${window.location.origin}/kind.html`;
    const matrix = useMemo(() => qrMatrixOrNull(link), [link]);
    const [copied, setCopied] = useState(false);
    const [showQr, setShowQr] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt('Kopieer deze link:', link);
        }
    };

    return (
        <section style={S.card} aria-label="Zelf oefenen voor leerlingen">
            <div style={S.text}>
                <span style={S.name}>Zelf oefenen voor leerlingen</span>
                <span style={S.hint}>Eén vaste link: leerlingen kiezen zelf een oefening.</span>
            </div>
            {/* Plain text, not a link: the share dialog owns the one link a session has. */}
            <span style={S.link} title={link}>{link.replace(/^https?:\/\//, '')}</span>
            <div style={S.btns}>
                <button type="button" className="ui-hover" style={S.btn} onClick={copy}>
                    {copied ? <><Check size={15} /> Gekopieerd</> : <><Copy size={15} /> Kopieer link</>}
                </button>
                {matrix && (
                    <button type="button" className="ui-hover" style={S.btn} aria-haspopup="dialog" onClick={() => setShowQr(true)}>
                        <QrCode size={15} /> QR-code
                    </button>
                )}
            </div>
            {showQr && matrix && <QrDialog matrix={matrix} link={link} onClose={() => setShowQr(false)} />}
        </section>
    );
}

const S = {
    card: { marginTop: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2) var(--sp-3)', alignItems: 'center' } as React.CSSProperties,
    text: { flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' } as React.CSSProperties,
    name: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    hint: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 } as React.CSSProperties,
    link: { flex: '0 1 auto', minWidth: 0, maxWidth: '280px', padding: '0 var(--sp-3)', height: 'var(--control-h)', lineHeight: 'var(--control-h)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'all' } as React.CSSProperties,
    btns: { display: 'flex', gap: 'var(--sp-2)', flexShrink: 0 } as React.CSSProperties,
    btn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: 'var(--control-h)', padding: '0 var(--sp-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' } as React.CSSProperties,
    dialog: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-6) var(--sp-6) var(--sp-5)', textAlign: 'center' } as React.CSSProperties,
    dialogTitle: { margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    dialogLink: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' } as React.CSSProperties,
    qr: { width: 'min(264px, 70vw)', height: 'auto', imageRendering: 'pixelated', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)' } as React.CSSProperties,
};
