import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
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
    const cardRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Focus moves into the dialog on open and back to whatever opened it on close. Runs before
    // the owning modal's own effects, so a modal that focuses its primary button still wins.
    useEffect(() => {
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const card = cardRef.current;
        if (card && !card.contains(document.activeElement)) card.focus({ preventScroll: true });
        return () => { if (opener && opener.isConnected) opener.focus({ preventScroll: true }); };
    }, []);

    // Tab cycles inside the card. Focus that sits outside it (a PopupSelect list portalled to
    // <body>) is left alone, so a dropdown inside a modal still works from the keyboard.
    const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
        const card = cardRef.current;
        if (e.key !== 'Tab' || !card) return;
        const items = [...card.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => !el.hasAttribute('disabled'));
        const active = document.activeElement;
        if (items.length === 0) { e.preventDefault(); return; }
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (active === first || active === card)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };

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
                    ref={cardRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={ariaLabel}
                    tabIndex={-1}
                    onKeyDown={trapTab}
                    className={`modal-card${isSheet ? ' modal-sheet' : ''}`}
                    style={{
                        position: 'relative', outline: 'none',
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

const FOCUSABLE = 'a[href], button, input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])';
