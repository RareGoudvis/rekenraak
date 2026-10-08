import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, CornersOut, ImageSquare } from '@phosphor-icons/react';
import type { OefenSessie } from '../../services/oefenen/types';
import { drawQr, qrMatrixOrNull } from '../../services/qr';
import ModalShell from '../ui/ModalShell';
import ModalPortal from '../ui/ModalPortal';
import { sessieLink } from '../../services/oefenen/session';

interface Props {
    sessie: OefenSessie;
    onClose: () => void;
}

// A 5 px module keeps a version-25 code under ~600 px on the dialog; the beamer view scales by CSS.
const MODULE_PX = 5;
// Clipboard / download PNG is rendered bigger so it stays sharp when pasted into a slide.
const EXPORT_MODULE_PX = 12;

function QrCanvas({ matrix, modulePx, style, label }: { matrix: boolean[][]; modulePx: number; style?: React.CSSProperties; label: string }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => { if (ref.current) drawQr(ref.current, matrix, modulePx); }, [matrix, modulePx]);
    return <canvas ref={ref} role="img" aria-label={label} style={{ imageRendering: 'pixelated', background: '#fff', ...style }} />;
}

export default function OefenShareModal({ sessie, onClose }: Props) {
    const link = useMemo(() => sessieLink(sessie, window.location.origin), [sessie]);
    const matrix = useMemo(() => (link ? qrMatrixOrNull(link) : null), [link]);
    const [linkFlash, setLinkFlash] = useState(false);
    const [qrFlash, setQrFlash] = useState<'copied' | 'downloaded' | null>(null);
    const [big, setBig] = useState(false);
    const fieldRef = useRef<HTMLInputElement>(null);

    const copyLink = async () => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setLinkFlash(true);
            setTimeout(() => setLinkFlash(false), 2000);
        } catch {
            window.prompt('Kopieer deze link:', link);
        }
    };

    const copyQr = async () => {
        if (!matrix) return;
        const canvas = document.createElement('canvas');
        drawQr(canvas, matrix, EXPORT_MODULE_PX);
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'));
        if (!blob) return;
        try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setQrFlash('copied');
        } catch {
            // No image clipboard (Firefox, http): hand over the PNG as a download instead.
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `oefenmodus-${sessie.id}.png`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            setQrFlash('downloaded');
        }
        setTimeout(() => setQrFlash(null), 2000);
    };

    return (
        <>
            <ModalShell onClose={() => { if (!big) onClose(); }} ariaLabel="Oefenmodus delen" maxWidth={560}>
                <div style={S.header}>
                    <h2 style={S.title}>Oefenmodus delen</h2>
                    <p style={S.subtitle}>{sessie.title ? `${sessie.title} · ` : ''}{sessie.types.length} {sessie.types.length === 1 ? 'soort' : 'soorten'}{sessie.timerMin ? ` · ${sessie.timerMin} min` : ''}</p>
                </div>

                <div style={S.body}>
                    {link === null ? (
                        <p style={S.note} role="status">Deze sessie is te groot voor een deelbare link. Haal een soort weg of kies minder uitgebreide instellingen.</p>
                    ) : (
                        <>
                            <div style={S.field}>
                                <label style={S.label} htmlFor="oefen-link">Link voor de leerlingen</label>
                                <div style={S.linkRow}>
                                    <input id="oefen-link" ref={fieldRef} style={S.input} readOnly value={link} onFocus={e => e.currentTarget.select()} />
                                    <button className="ui-hover" style={S.btn} onClick={copyLink}>
                                        {linkFlash ? <><Check size={15} /> Gekopieerd</> : <><Copy size={15} /> Kopieer link</>}
                                    </button>
                                </div>
                            </div>

                            {matrix ? (
                                <div style={S.qrBlock}>
                                    <QrCanvas matrix={matrix} modulePx={MODULE_PX} label="QR-code van de oefenlink" style={S.qr} />
                                    <div style={S.qrActions}>
                                        <button className="ui-hover" style={S.btn} onClick={copyQr}>
                                            {qrFlash === 'copied' ? <><Check size={15} /> QR gekopieerd</> : qrFlash === 'downloaded' ? <><Check size={15} /> QR gedownload</> : <><ImageSquare size={15} /> Kopieer QR</>}
                                        </button>
                                        <button className="ui-hover" style={S.btn} onClick={() => setBig(true)}>
                                            <CornersOut size={15} /> Groot tonen
                                        </button>
                                        <p style={S.hint}>Toon de QR op het bord: leerlingen scannen hem met de camera van hun toestel.</p>
                                    </div>
                                </div>
                            ) : (
                                <p style={S.note} role="status">Deze link is te lang voor een QR-code. Deel de link zelf, of maak de sessie kleiner.</p>
                            )}
                        </>
                    )}
                </div>
            </ModalShell>
            {big && matrix && <BigQr matrix={matrix} title={sessie.title} onClose={() => setBig(false)} />}
        </>
    );
}

// Full-screen QR for the classroom beamer; Escape or a click closes only this layer.
function BigQr({ matrix, title, onClose }: { matrix: boolean[][]; title?: string; onClose: () => void }) {
    useEffect(() => {
        // Capture phase on window so the share modal's own Escape handler never sees the key.
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [onClose]);

    // Portalled: the TopBar's backdrop-filter would otherwise make `fixed` relative to the bar.
    return (
        <ModalPortal>
        <div className="no-print" style={S.bigScrim} role="dialog" aria-modal="true" aria-label="QR-code groot" onClick={onClose}>
            {title && <div style={S.bigTitle}>{title}</div>}
            <QrCanvas matrix={matrix} modulePx={EXPORT_MODULE_PX} label="QR-code van de oefenlink" style={S.bigQr} />
            <div style={S.bigHint}>Scan met de camera · Escape of klik om te sluiten</div>
        </div>
        </ModalPortal>
    );
}

const S = {
    header: { padding: 'var(--sp-4) 56px var(--sp-3) var(--sp-5)', borderBottom: '1px solid var(--separator)' } as React.CSSProperties,
    title: { margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    subtitle: { margin: 'var(--sp-1) 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    body: { padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', overflowY: 'auto' } as React.CSSProperties,
    field: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' } as React.CSSProperties,
    label: { fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-muted)' } as React.CSSProperties,
    linkRow: { display: 'flex', gap: 'var(--sp-2)' } as React.CSSProperties,
    input: { flex: 1, minWidth: 0, height: 'var(--control-h)', boxSizing: 'border-box', padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface-2)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontFamily: 'monospace' } as React.CSSProperties,
    btn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: 'var(--control-h)', padding: '0 var(--sp-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' } as React.CSSProperties,
    qrBlock: { display: 'flex', gap: 'var(--sp-5)', alignItems: 'flex-start', flexWrap: 'wrap' } as React.CSSProperties,
    qr: { width: '240px', height: '240px', flexShrink: 0, border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)' } as React.CSSProperties,
    qrActions: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', alignItems: 'flex-start', flex: 1, minWidth: '180px' } as React.CSSProperties,
    hint: { margin: 'var(--sp-2) 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    note: { margin: 0, padding: 'var(--sp-3)', borderRadius: 'var(--radius-xs)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    // Beamer layer: opaque white so the code keeps its contrast on any projector.
    bigScrim: { position: 'fixed', inset: 0, zIndex: 3000, background: '#fff', color: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-5)', cursor: 'pointer', padding: 'var(--sp-5)' } as React.CSSProperties,
    bigTitle: { fontSize: 'var(--text-2xl)', fontWeight: 700, textAlign: 'center' } as React.CSSProperties,
    bigQr: { width: 'min(78vh, 90vw)', height: 'min(78vh, 90vw)' } as React.CSSProperties,
    bigHint: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
};
