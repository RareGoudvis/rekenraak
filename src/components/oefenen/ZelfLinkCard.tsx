import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, QrCode } from '@phosphor-icons/react';
import { drawQr, qrMatrixOrNull } from '../../services/qr';

// 4 px modules: a version-2 code of a short URL stays ~130 px, enough for a phone held up to the screen.
const MODULE_PX = 4;

function QrCanvas({ matrix }: { matrix: boolean[][] }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => { if (ref.current) drawQr(ref.current, matrix, MODULE_PX); }, [matrix]);
    return <canvas ref={ref} role="img" aria-label="QR-code van de link naar Zelf oefenen" style={S.qr} />;
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
            <div style={S.row}>
                <div style={S.text}>
                    <span style={S.name}>Zelf oefenen voor leerlingen</span>
                    <span style={S.hint}>Leerlingen kiezen zelf een oefening, zonder jouw sessie. Eén vaste link voor de hele klas.</span>
                    {/* Plain text, not a link: the share dialog owns the one link a session has. */}
                    <span style={S.link}>{link.replace(/^https?:\/\//, '')}</span>
                </div>
                <button type="button" className="ui-hover" style={S.btn} onClick={copy}>
                    {copied ? <><Check size={15} /> Gekopieerd</> : <><Copy size={15} /> Kopieer link</>}
                </button>
                {matrix && (
                    <button type="button" className="ui-hover" style={S.btn} aria-expanded={showQr} onClick={() => setShowQr(v => !v)}>
                        <QrCode size={15} /> {showQr ? 'Verberg QR' : 'Toon QR'}
                    </button>
                )}
            </div>
            {showQr && matrix && <QrCanvas matrix={matrix} />}
        </section>
    );
}

const S = {
    card: { marginTop: 'var(--sp-3)', padding: 'var(--sp-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', alignItems: 'flex-start' } as React.CSSProperties,
    row: { display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap', width: '100%' } as React.CSSProperties,
    text: { flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '2px' } as React.CSSProperties,
    name: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)' } as React.CSSProperties,
    hint: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    link: { fontSize: 'var(--text-sm)', color: 'var(--accent)' } as React.CSSProperties,
    btn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: 'var(--control-h)', padding: '0 var(--sp-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' } as React.CSSProperties,
    qr: { imageRendering: 'pixelated', background: '#fff', border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)' } as React.CSSProperties,
};
