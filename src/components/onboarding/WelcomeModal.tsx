import { useEffect, useRef, useState } from 'react';
import ModalShell from '../ui/ModalShell';
import ModeChoice from './ModeChoice';
import { readDefaultMode, saveDefaultMode } from '../../services/eenvoudigMode';

interface Props {
    onClose: () => void;
    onStartTour: () => void;
    // 'welcome' = first-visit choice screen; 'video' = jump straight to the demo (reused from HelpModal).
    mode?: 'welcome' | 'video';
}

// First-visit greeting shown instead of auto-opening the tour: the teacher first picks how to add
// exercises (each mode explained), then tour, a 1-min demo video, or skip. Also doubles as the standalone video view opened from HelpModal
// (mode='video'), so the video markup and styling live in one place.
export default function WelcomeModal({ onClose, onStartTour, mode = 'welcome' }: Props) {
    const [showVideo, setShowVideo] = useState(mode === 'video');
    const [step, setStep] = useState<'mode' | 'start'>('mode');
    const primaryBtnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!showVideo) primaryBtnRef.current?.focus();
    }, [showVideo, step]);

    const titleId = 'welcome-modal-title';
    // Closing marks the tour seen, which would silently flip the no-choice default to Uitgebreid: pin the shown choice first.
    const keepChoice = () => { if (mode === 'welcome') saveDefaultMode(readDefaultMode()); };
    const startTour = () => { keepChoice(); onStartTour(); };
    // Every way out goes through here, the X included, or the choice is lost when the tour key is set.
    const close = () => { keepChoice(); onClose(); };

    return (
        <ModalShell onClose={close} ariaLabel="Welkom bij RekenRaak" variant="dialog" maxWidth={showVideo ? 760 : step === 'mode' ? 560 : 460}>
            <div style={{ padding: '32px', fontFamily: 'var(--font-sheet-text)', color: 'var(--text-main)' }} role="dialog" aria-labelledby={titleId}>
                {!showVideo && step === 'mode' ? (
                    <>
                        <h2 id={titleId} style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
                            Welkom bij RekenRaak
                        </h2>
                        <p style={{ margin: '0 0 20px', fontSize: '14px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                            Maak in een paar klikken een rekenblad. Kies eerst hoe je oefeningen wil toevoegen. Je kan later altijd wisselen, links bovenaan.
                        </p>
                        <div style={{ margin: '0 0 20px' }}><ModeChoice detailed /></div>
                        <button
                            ref={primaryBtnRef}
                            onClick={() => setStep('start')}
                            style={{
                                width: '100%', padding: '12px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                fontSize: '14px', fontWeight: 700, fontFamily: 'inherit',
                                border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-on)',
                            }}
                        >Verder</button>
                    </>
                ) : !showVideo ? (
                    <>
                        <h2 id={titleId} style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
                            Klaar om te starten
                        </h2>
                        <p style={{ margin: '0 0 24px', fontSize: '14px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                            Wil je eerst even zien hoe het werkt?
                        </p>
                        <p style={{ margin: '-14px 0 24px', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
                            Nieuw: Oefenmodus (leerlingen oefenen op hun toestel) en Bordmodus (digibord), allebei in bèta.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                ref={primaryBtnRef}
                                onClick={startTour}
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
                                onClick={close}
                                style={{
                                    padding: '10px 18px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
                                    border: 'none', background: 'transparent', color: 'var(--text-muted)',
                                }}
                            >Overslaan</button>
                            <button
                                onClick={() => setStep('mode')}
                                style={{
                                    padding: '4px 18px', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit',
                                    border: 'none', background: 'transparent', color: 'var(--text-muted)', textDecoration: 'underline',
                                }}
                            >Terug naar de keuze</button>
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
                                    onClick={startTour}
                                    style={{
                                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                                        fontSize: '13px', fontFamily: 'inherit', color: 'var(--accent-purple)', textDecoration: 'underline',
                                    }}
                                >Liever de rondleiding?</button>
                            ) : <span />}
                            <button
                                ref={primaryBtnRef}
                                onClick={close}
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
