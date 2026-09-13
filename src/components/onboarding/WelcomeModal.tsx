import { useEffect, useRef, useState } from 'react';
import ModalShell from '../ui/ModalShell';

interface Props {
    onClose: () => void;
    onStartTour: () => void;
    // 'welcome' = first-visit choice screen; 'video' = jump straight to the demo (reused from HelpModal).
    mode?: 'welcome' | 'video';
}

// First-visit greeting shown instead of auto-opening the tour: teacher picks tour, a 1-min
// demo video, or skip. Also doubles as the standalone video view opened from HelpModal
// (mode='video'), so the video markup and styling live in one place.
export default function WelcomeModal({ onClose, onStartTour, mode = 'welcome' }: Props) {
    const [showVideo, setShowVideo] = useState(mode === 'video');
    const primaryBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!showVideo) primaryBtnRef.current?.focus();
    }, [showVideo]);

    const titleId = 'welcome-modal-title';

    return (
        <ModalShell onClose={onClose} ariaLabel="Welkom bij RekenRaak" variant="dialog" maxWidth={showVideo ? 760 : 460}>
            <div style={{ padding: '32px', fontFamily: 'var(--font-sheet-text)', color: 'var(--text-main)' }} role="dialog" aria-labelledby={titleId}>
                {!showVideo ? (
                    <>
                        <h2 id={titleId} style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
                            Welkom bij RekenRaak
                        </h2>
                        <p style={{ margin: '0 0 24px', fontSize: '14px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                            Welkom bij RekenRaak — maak in een paar klikken een rekenblad. Hoe wil je beginnen?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                ref={primaryBtnRef}
                                onClick={onStartTour}
                                style={{
                                    padding: '12px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                    fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
                                    border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-on)',
                                }}
                            >Start de rondleiding</button>
                            <button
                                onClick={() => setShowVideo(true)}
                                style={{
                                    padding: '12px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                    fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
                                    border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)',
                                }}
                            >Bekijk de video (1 min)</button>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                                    border: 'none', background: 'transparent', color: 'var(--text-muted)',
                                }}
                            >Overslaan</button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 id={titleId} style={{ margin: '0 0 14px', fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                            RekenRaak in 1 minuut
                        </h2>
                        <video
                            controls
                            autoPlay
                            playsInline
                            src="/rekenraak-demo.mp4"
                            style={{ width: '100%', maxWidth: '720px', height: 'auto', display: 'block', borderRadius: 'var(--radius-sm)', background: '#000' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', flexWrap: 'wrap', gap: '10px' }}>
                            {mode === 'welcome' ? (
                                <button
                                    onClick={onStartTour}
                                    style={{
                                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                        fontSize: '13px', fontFamily: 'inherit', color: 'var(--accent-purple)', textDecoration: 'underline',
                                    }}
                                >Liever de rondleiding?</button>
                            ) : <span />}
                            <button
                                ref={primaryBtnRef}
                                onClick={onClose}
                                style={{
                                    padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                    fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
                                    border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-on)',
                                }}
                            >Sluiten</button>
                        </div>
                    </>
                )}
            </div>
        </ModalShell>
    );
}
