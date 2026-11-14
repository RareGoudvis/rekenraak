import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props { left: number; title: string; wide?: boolean; onClose: () => void; children: ReactNode }

export default function EenvoudigDrawer({ left, title, wide, onClose, children }: Props) {
    return createPortal(
        <div className={`ez-drawer no-print${wide ? ' ez-wide' : ''}`} style={{ left }} role="dialog" aria-label={title}>
            <div className="ez-head"><h2>{title}</h2></div>
            <button className="ez-x" type="button" aria-label="Sluiten" onClick={onClose}>{'×'}</button>
            <div className="ez-body">{children}</div>
        </div>,
        document.body,
    );
}
