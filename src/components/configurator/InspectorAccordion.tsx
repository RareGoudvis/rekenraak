import { useState, type CSSProperties, type ReactNode } from 'react';

// Same disclosure look as the block inspector's Geavanceerd (label button + ▾/▸); a plain
// button is keyboard-openable. `forceOpen` = a value differs from default, so a styled
// teacher sees it; a click always wins afterwards (state is not persisted).
export default function InspectorAccordion({ title, forceOpen, card, cardTitle, children }: {
    title: string; forceOpen: boolean; card: CSSProperties; cardTitle: CSSProperties; children: ReactNode;
}) {
    const [userOpen, setUserOpen] = useState<boolean | null>(null);
    const open = userOpen ?? forceOpen;
    return (
        <div style={card}>
            <button type="button" aria-expanded={open} onClick={() => setUserOpen(!open)}
                style={{ ...cardTitle, margin: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                {title} <span style={{ fontSize: '10px' }}>{open ? '▾' : '▸'}</span>
            </button>
            {open && <div style={{ marginTop: 'var(--sp-3)' }}>{children}</div>}
        </div>
    );
}
