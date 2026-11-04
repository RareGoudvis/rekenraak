import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, CornersOut, ImageSquare, Printer } from '@phosphor-icons/react';
import { attemptsOf, type OefenSessie } from '../../services/oefenen/types';
import { viablePlannedTotal } from '../../services/oefenen/stats';
import { QR_QUIET, drawQr, qrMatrixOrNull, qrVersionOf } from '../../services/qr';
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
// Past this version the modules get small enough that a phone at the back of the class struggles.
const BIG_QR_VERSION = 25;
const PRINT_STYLE_ID = 'oefen-qr-print-style';

function QrCanvas({ matrix, modulePx, style, label }: { matrix: boolean[][]; modulePx: number; style?: React.CSSProperties; label: string }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => { if (ref.current) drawQr(ref.current, matrix, modulePx); }, [matrix, modulePx]);
    return <canvas ref={ref} role="img" aria-label={label} style={{ imageRendering: 'pixelated', background: '#fff', ...style }} />;
}

export default function OefenShareModal({ sessie, onClose }: Props) {
    const link = useMemo(() => sessieLink(sessie, window.location.origin), [sessie]);
    const matrix = useMemo(() => (link ? qrMatrixOrNull(link) : null), [link]);
    const version = matrix ? qrVersionOf(matrix) : null;
    const [linkFlash, setLinkFlash] = useState(false);
    const [qrFlash, setQrFlash] = useState<'copied' | 'downloaded' | null>(null);
    const [big, setBig] = useState(false);
    const [printing, setPrinting] = useState(false);
    const name = sessie.title || 'Oefensessie';

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
                    <ul style={S.summary} aria-label="Samenvatting van de sessie">
                        {summaryOf(sessie).map(item => <li key={item} style={S.summaryItem}>{item}</li>)}
                    </ul>
                    <p style={S.subtitle}>Elk toestel maakt zijn eigen oefeningen: leerlingen krijgen niet dezelfde sommen.</p>
                </div>

                <div style={S.body}>
                    {link === null ? (
                        <p style={S.note} role="status">Deze sessie is te groot voor een deelbare link. Haal een soort weg of kies minder uitgebreide instellingen.</p>
                    ) : (
                        <>
                            {/* Nobody types the URL: a clickable link to try it, and a copy button to paste it. */}
                            <div style={S.linkRow}>
                                <div style={S.linkText}>
                                    <span style={S.sessName}>{name}</span>
                                    <a href={link} target="_blank" rel="noopener noreferrer" style={S.link} title={link}>{link.replace(/^https?:\/\//, '')}</a>
                                </div>
                                <button className="ui-hover" style={S.btn} onClick={copyLink}>
                                    {linkFlash ? <><Check size={15} /> Gekopieerd</> : <><Copy size={15} /> Kopieer link</>}
                                </button>
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
                                        <button className="ui-hover" style={S.btn} onClick={() => setPrinting(true)}>
                                            <Printer size={15} /> Afdrukken (A5)
                                        </button>
                                        <p style={S.hint}>Toon de QR op het bord: leerlingen scannen hem met de camera van hun toestel.</p>
                                        <p style={S.size}>QR-versie {version} · {matrix.length}×{matrix.length} blokjes</p>
                                        {version !== null && version > BIG_QR_VERSION && (
                                            <p style={S.warn} role="note">Grote QR: toon hem groot op het bord of deel de link.</p>
                                        )}
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
            {printing && matrix && <PrintQr matrix={matrix} title={name} onDone={() => setPrinting(false)} />}
        </>
    );
}

// What the teacher is about to hand out, in the kiosk's own terms (viable types, testmodus rules).
function summaryOf(s: OefenSessie): string[] {
    const n = s.types.length;
    const total = viablePlannedTotal(s);
    const amount = total === null ? 'onbeperkt' : `${total} ${total === 1 ? 'oefening' : 'oefeningen'}`;
    return [
        `${n} ${n === 1 ? 'soort' : 'soorten'} · ${amount}`,
        `Timer: ${s.timerMin ? `${s.timerMin} min` : 'geen'}`,
        `Toets: ${s.testMode ? 'ja' : 'nee'}`,
        `Kansen: ${attemptsOf(s)}`,
        // Testmodus hides the results until the end whatever statsLocked says.
        `Resultaten: ${s.statsLocked || s.testMode ? 'pas op het einde' : 'altijd'}`,
    ];
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

// Crisp at any print size, unlike the canvas: one path of 1×1 squares in module units.
function QrSvg({ matrix, style }: { matrix: boolean[][]; style?: React.CSSProperties }) {
    const n = matrix.length;
    const size = n + QR_QUIET * 2;
    let d = '';
    matrix.forEach((row, r) => row.forEach((dark, c) => { if (dark) d += `M${c + QR_QUIET},${r + QR_QUIET}h1v1h-1z`; }));
    return (
        <svg viewBox={`0 0 ${size} ${size}`} style={style} shapeRendering="crispEdges" role="img" aria-label="QR-code om af te drukken">
            <rect width={size} height={size} fill="#fff" />
            <path d={d} fill="#000" />
        </svg>
    );
}

// A5 hand-out: the usePrint recipe (inject a print style, print after two frames, clean up on
// afterprint), but with its own @page and everything except this sheet hidden from paper.
function PrintQr({ matrix, title, onDone }: { matrix: boolean[][]; title: string; onDone: () => void }) {
    // Latest onDone without re-running the effect: a re-render must never open a second dialog.
    const doneRef = useRef(onDone);
    useEffect(() => { doneRef.current = onDone; });
    useEffect(() => {
        const done = () => doneRef.current();
        const style = document.createElement('style');
        style.id = PRINT_STYLE_ID;
        // Appended after index.css, so this @page (A5) beats the sheet's A4 for this print only.
        style.textContent = `
            .oefen-qr-print { display: none; }
            @page { size: A5 portrait; margin: 0; }
            @media print {
                body > *:not(.oefen-qr-print) { display: none !important; }
                .oefen-qr-print { display: flex !important; }
            }`;
        document.head.appendChild(style);
        window.addEventListener('afterprint', done, { once: true });
        let frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => window.print()); });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('afterprint', done);
            style.remove();
        };
    }, []);

    return (
        <ModalPortal>
            <div className="oefen-qr-print" style={S.printPage}>
                <div style={S.printTitle}>{title}</div>
                <QrSvg matrix={matrix} style={S.printQr} />
                <div style={S.printLine}>Scan met je toestel</div>
            </div>
        </ModalPortal>
    );
}

const S = {
    header: { padding: 'var(--sp-4) 56px var(--sp-3) var(--sp-5)', borderBottom: '1px solid var(--separator)' } as React.CSSProperties,
    title: { margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-main)' } as React.CSSProperties,
    subtitle: { margin: 'var(--sp-2) 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    summary: { listStyle: 'none', margin: 'var(--sp-2) 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-1) var(--sp-2)' } as React.CSSProperties,
    summaryItem: { fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-main)', padding: '2px var(--sp-2)', borderRadius: 'var(--radius-pill)', background: 'var(--bg-surface-2)', border: '1px solid var(--separator)' } as React.CSSProperties,
    body: { padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', overflowY: 'auto' } as React.CSSProperties,
    linkRow: { display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' } as React.CSSProperties,
    linkText: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' } as React.CSSProperties,
    sessName: { fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
    link: { fontSize: 'var(--text-sm)', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
    btn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: 'var(--control-h)', padding: '0 var(--sp-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' } as React.CSSProperties,
    qrBlock: { display: 'flex', gap: 'var(--sp-5)', alignItems: 'flex-start', flexWrap: 'wrap' } as React.CSSProperties,
    qr: { width: '240px', height: '240px', flexShrink: 0, border: '1px solid var(--separator)', borderRadius: 'var(--radius-xs)' } as React.CSSProperties,
    qrActions: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', alignItems: 'flex-start', flex: 1, minWidth: '180px' } as React.CSSProperties,
    hint: { margin: 'var(--sp-2) 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    size: { margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' } as React.CSSProperties,
    warn: { margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-main)', fontWeight: 600 } as React.CSSProperties,
    note: { margin: 0, padding: 'var(--sp-3)', borderRadius: 'var(--radius-xs)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 'var(--text-sm)' } as React.CSSProperties,
    // Beamer layer: opaque white so the code keeps its contrast on any projector.
    bigScrim: { position: 'fixed', inset: 0, zIndex: 3000, background: '#fff', color: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-5)', cursor: 'pointer', padding: 'var(--sp-5)' } as React.CSSProperties,
    bigTitle: { fontSize: 'var(--text-2xl)', fontWeight: 700, textAlign: 'center' } as React.CSSProperties,
    bigQr: { width: 'min(78vh, 90vw)', height: 'min(78vh, 90vw)' } as React.CSSProperties,
    bigHint: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as React.CSSProperties,
    // A5 = 148 × 210 mm; the code fills ~80 % of the width so a phone reads it from arm's length.
    printPage: { width: '148mm', height: '210mm', boxSizing: 'border-box', padding: '14mm', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8mm', background: '#fff', color: '#000', fontFamily: 'var(--font-ui)' } as React.CSSProperties,
    printTitle: { fontSize: 'var(--text-2xl)', fontWeight: 700, textAlign: 'center' } as React.CSSProperties,
    printQr: { width: '118mm', height: '118mm' } as React.CSSProperties,
    printLine: { fontSize: 'var(--text-lg)' } as React.CSSProperties,
};
