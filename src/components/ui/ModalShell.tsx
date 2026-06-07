import { useEffect, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import ModalPortal from './ModalPortal';
import IconButton from './IconButton';

interface Props {
    onClose: () => void;
    children: ReactNode;
    ariaLabel?: string;
    // 'sheet' anchors near the top and slides down (macOS sheet); 'dialog' centres + scales in.
    variant?: 'dialog' | 'sheet';
    maxWidth?: number | string;
    hideClose?: boolean;
}

// One shared modal frame: portal-to-body + scrim (click-outside) + Escape + a consistent card
// and a standard close button. Replaces the overlay/close/escape blocks that were copy-pasted
// (and had drifted) across every modal. The scrim is a single lighter 0.4 — macOS dims gently.
export default function ModalShell({ onClose, children, ariaLabel, variant = 'dialog', maxWidth = 640, hideClose = false }: Props) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const isSheet = variant === 'sheet';
    return (
        <ModalPortal>
            <div
                className="no-print modal-scrim"
                // mousedown (not click) on the scrim itself closes — prevents a drag that ends
                // outside the card from dismissing it.
                onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
                style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 2000,
                    display: 'flex', justifyContent: 'center',
                    alignItems: isSheet ? 'flex-start' : 'center',
                    padding: isSheet ? 'max(5vh, var(--sp-6)) var(--sp-4) var(--sp-4)' : 'var(--sp-4)',
                }}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={ariaLabel}
                    className={`modal-card${isSheet ? ' modal-sheet' : ''}`}
                    style={{
                        position: 'relative',
                        backgroundColor: 'var(--bg-panel)', border: '1px solid var(--separator)',
                        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-3)',
                        maxWidth, width: '100%', maxHeight: '85vh',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', color: 'var(--text-main)',
                    }}
                >
                    {!hideClose && (
                        <div style={{ position: 'absolute', top: 'var(--sp-3)', right: 'var(--sp-3)', zIndex: 1 }}>
                            <IconButton icon={X} label="Sluiten" onClick={onClose} />
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </ModalPortal>
    );
}
