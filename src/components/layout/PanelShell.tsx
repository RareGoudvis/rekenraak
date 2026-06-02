import { useEffect, useRef, useState } from 'react';
import { CaretRight as ChevronRight, CaretLeft as ChevronLeft, PushPin as Pin, PushPinSlash as PinOff } from '@phosphor-icons/react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// Below this width the side panels collapse to a hover/focus flyout so the center
// viewer reclaims their width (below ~1800px the 3-panel layout gets too cramped).
const COMPACT_Q = '(max-width: 1799px)';

// Wraps a side panel (Sidebar / Inspector). When the viewport is compact and the panel
// isn't pinned, it collapses to an edge trigger strip and slides over the viewer on
// hover/focus (pure-CSS via :hover/:focus-within; Esc drops focus to close). A pin button
// (compact only, persisted per-side) keeps it open in normal in-flow layout instead.
export default function PanelShell({ side, label, children }: { side: 'left' | 'right'; label: string; children: React.ReactNode }) {
    const compact = useMediaQuery(COMPACT_Q);
    const storageKey = side === 'left' ? 'rekenraak_pin_left' : 'rekenraak_pin_right';
    const [pinned, setPinned] = useState<boolean>(() => {
        try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
    });
    useEffect(() => { try { localStorage.setItem(storageKey, pinned ? '1' : '0'); } catch { /* ignore */ } }, [pinned, storageKey]);

    const shellRef = useRef<HTMLDivElement>(null);
    const collapsed = compact && !pinned;
    const Chevron = side === 'left' ? ChevronRight : ChevronLeft;
    const PinIcon = pinned ? PinOff : Pin;

    // Esc closes the open flyout by dropping focus (releases :focus-within).
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && shellRef.current?.contains(document.activeElement)) {
            (document.activeElement as HTMLElement | null)?.blur();
        }
    };

    return (
        <div
            ref={shellRef}
            className={`panel-shell no-print panel-${side}${compact ? ' compact' : ''}${pinned ? ' pinned' : ''}`}
            onKeyDown={onKeyDown}
        >
            {collapsed && (
                <div className="panel-trigger" tabIndex={0} role="button" aria-label={`${label} tonen`} title={`${label} tonen`}>
                    <Chevron size={16} aria-hidden="true" />
                    <span className="panel-trigger-label">{label}</span>
                </div>
            )}
            <div className="panel-body">
                {compact && (
                    <button
                        className="ui-icon-btn panel-pin"
                        onClick={() => setPinned(p => !p)}
                        title={pinned ? 'Paneel losmaken' : 'Paneel vastzetten'}
                        aria-label={pinned ? 'Paneel losmaken' : 'Paneel vastzetten'}
                        aria-pressed={pinned}
                    >
                        <PinIcon size={14} />
                    </button>
                )}
                {children}
            </div>
        </div>
    );
}
