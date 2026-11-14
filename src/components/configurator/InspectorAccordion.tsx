import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretRight } from '@phosphor-icons/react';

// Hover and open states as classes, tokens only; the caret turns instead of swapping glyphs.
const CSS = `
.insp-sec { flex: none; background: var(--bg-surface); border: 1px solid var(--separator); border-radius: var(--radius-md); box-shadow: var(--shadow-1); }
.insp-sec-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); background: none; border: 0; border-radius: var(--radius-md); font: inherit; color: var(--text-main); text-align: left; cursor: pointer; }
.insp-sec-head:hover { background: var(--bg-hover); }
.insp-sec-title { display: block; font-size: var(--text-base); font-weight: 600; }
.insp-sec-sum { display: block; margin-top: 2px; font-size: var(--text-xs); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.insp-caret { flex: none; color: var(--text-muted); transition: transform var(--dur) var(--ease-out); }
.insp-caret[data-open="true"] { transform: rotate(90deg); }
.insp-sec-body { padding: var(--sp-3) var(--sp-4) var(--sp-4); border-top: 1px solid var(--separator); display: flex; flex-direction: column; gap: var(--sp-1); }
.insp-fold { margin-top: var(--sp-3); border: 1px solid var(--separator); border-radius: var(--radius-sm); background: var(--bg-surface-2); }
.insp-fold-head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: var(--sp-2); padding: var(--sp-2) var(--sp-3); background: none; border: 0; border-radius: var(--radius-sm); font: inherit; font-size: var(--text-sm); font-weight: 600; color: var(--text-main); text-align: left; cursor: pointer; }
.insp-fold-head:hover { background: var(--bg-hover); }
.insp-fold-body { padding: 0 var(--sp-3) var(--sp-3); }
.insp-stepper { display: inline-flex; align-items: center; height: var(--control-h); background: var(--seg-track); border: 1px solid var(--separator); border-radius: var(--radius-sm); }
.insp-stepper button { width: 32px; height: 100%; display: inline-flex; align-items: center; justify-content: center; background: none; border: 0; border-radius: var(--radius-sm); color: var(--text-main); cursor: pointer; }
.insp-stepper button:hover:not(:disabled) { background: var(--bg-hover); }
.insp-stepper button:disabled { opacity: .4; cursor: not-allowed; }
.insp-stepper output { min-width: 28px; text-align: center; font-size: var(--text-base); font-weight: 700; color: var(--text-main); font-variant-numeric: tabular-nums; }
`;

// One <style> for every section and fold: rendered once by the Inspector root.
export function InspectorStyles() {
    return <style>{CSS}</style>;
}

// A top-level Inspector section: title + a one-line summary of its current values, so a
// closed section still says what it holds. Open state is the caller's (one open per scope).
export function InspectorSection({ title, summary, open, onToggle, children }: {
    title: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode;
}) {
    const headRef = useRef<HTMLButtonElement>(null);
    // The section above may just have folded shut, so bring a newly opened head back into view.
    useEffect(() => { if (open) headRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [open]);
    return (
        <section className="insp-sec">
            <button ref={headRef} type="button" className="insp-sec-head" aria-expanded={open} onClick={onToggle}>
                <span style={{ minWidth: 0 }}>
                    <span className="insp-sec-title">{title}</span>
                    <span className="insp-sec-sum">{summary}</span>
                </span>
                <CaretRight size={16} className="insp-caret" data-open={open} aria-hidden="true" />
            </button>
            {open && <div className="insp-sec-body">{children}</div>}
        </section>
    );
}

// A nested fold inside a section (Geavanceerd, Vormgeving …). `forceOpen` = a value differs
// from default, so a styled teacher sees it; a click always wins afterwards (not persisted).
export default function InspectorAccordion({ title, forceOpen = false, children }: {
    title: string; forceOpen?: boolean; children: ReactNode;
}) {
    const [userOpen, setUserOpen] = useState<boolean | null>(null);
    const open = userOpen ?? forceOpen;
    return (
        <div className="insp-fold">
            <button type="button" className="insp-fold-head" aria-expanded={open} onClick={() => setUserOpen(!open)}>
                {title} <CaretRight size={14} className="insp-caret" data-open={open} aria-hidden="true" />
            </button>
            {open && <div className="insp-fold-body">{children}</div>}
        </div>
    );
}
