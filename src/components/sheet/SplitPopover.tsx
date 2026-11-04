import { useEffect, useRef, useState } from 'react';
import PopupSelect from '../ui/PopupSelect';

export interface SplitTarget { blockId: string; count: number; suggested: number; x: number; y: number; }

export const POPOVER_W = 240;   // SYNC: .split-popover width in index.css

// Tiny popover: pick where to cut, confirm. Positioned next to whatever opened it (the
// scissors control, or the page-tail hint), clamped into the viewport.
export default function SplitPopover({ target, onSplit, onClose }: { target: SplitTarget; onSplit: (n: number) => void; onClose: () => void }) {
    const [n, setN] = useState(target.suggested);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, [onClose]);

    const options = Array.from({ length: target.count - 1 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));
    return (
        <div
            ref={ref}
            className="no-print split-popover"
            style={{
                left: Math.max(8, Math.min(target.x, window.innerWidth - POPOVER_W - 8)),
                top: Math.max(8, Math.min(target.y, window.innerHeight - 150)),
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="split-popover-title">Splitsen na oefening</div>
            <PopupSelect value={n} options={options} onChange={setN} ariaLabel="Splitsen na oefening" />
            <div className="split-popover-actions">
                <button type="button" className="split-popover-cancel" onClick={onClose}>Annuleren</button>
                <button type="button" className="split-popover-confirm" onClick={() => { onSplit(n); onClose(); }}>Splitsen</button>
            </div>
        </div>
    );
}
