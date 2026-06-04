import { useState, useRef } from 'react';
import { Info } from '@phosphor-icons/react';
import ModalPortal from './ModalPortal';

// One-line help affordance: a small ⓘ that reveals a short explanation on hover or
// keyboard focus. The tooltip renders in a body-level portal with fixed, viewport-
// clamped positioning so the inspector panel's overflow can never clip it.
export default function InfoTip({ text }: { text: string }) {
    const ref = useRef<HTMLButtonElement>(null);
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

    const show = () => {
        const r = ref.current?.getBoundingClientRect();
        if (r) setPos({ x: r.left + r.width / 2, y: r.top });
    };
    const hide = () => setPos(null);

    return (
        <span
            style={{ display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={show}
            onMouseLeave={hide}
        >
            <button
                ref={ref}
                type="button"
                aria-label={text}
                onFocus={show}
                onBlur={hide}
                style={{ display: 'inline-flex', padding: 0, border: 'none', background: 'transparent', cursor: 'help', color: 'var(--text-muted)', lineHeight: 0 }}
            >
                <Info size={14} />
            </button>
            {pos && (
                <ModalPortal>
                    {/* Clamp the (centered, max-240px) box so it stays inside the viewport. */}
                    <div role="tooltip" style={tipStyle(pos)}>{text}</div>
                </ModalPortal>
            )}
        </span>
    );
}

function tipStyle(pos: { x: number; y: number }): React.CSSProperties {
    const HALF = 120;   // half of maxWidth, keeps the box off the viewport edges
    const x = Math.min(Math.max(pos.x, HALF + 8), window.innerWidth - HALF - 8);
    return {
        position: 'fixed', left: `${x}px`, top: `${pos.y - 8}px`, transform: 'translate(-50%, -100%)',
        zIndex: 1000, width: 'max-content', maxWidth: '240px',
        padding: '6px 9px', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-surface)', border: '1px solid var(--separator)', boxShadow: 'var(--shadow-2)',
        color: 'var(--text-main)', fontSize: 'var(--text-xs)', fontWeight: 400, lineHeight: 1.4,
        whiteSpace: 'normal', textAlign: 'left', pointerEvents: 'none',
    };
}
