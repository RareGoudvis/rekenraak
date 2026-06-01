import { useState } from 'react';
import { Settings, SlidersHorizontal, BookLock } from 'lucide-react';
import BaseSettingsModal from './BaseSettingsModal';
import CurriculumBuilderModal from '../curriculum/CurriculumBuilderModal';

// "Geavanceerd" tucked behind a gear icon in the sidebar footer (declutter). The gear
// toggles an upward popover with the two teacher tools, which open their existing modals.
export default function BaseSettingsPanel() {
    const [open, setOpen] = useState(false);
    const [baseOpen, setBaseOpen] = useState(false);
    const [curriculumOpen, setCurriculumOpen] = useState(false);

    return (
        <div style={S.wrap}>
            <button style={S.gearBtn} onClick={() => setOpen(o => !o)} title="Geavanceerd" aria-label="Geavanceerd">
                <Settings size={16} />
            </button>

            {open && (
                <>
                    <div style={S.backdrop} onClick={() => setOpen(false)} />
                    <div style={S.menu}>
                        <button className="ui-hover" style={S.item} onClick={() => { setOpen(false); setBaseOpen(true); }}>
                            <SlidersHorizontal size={14} /> Basisinstellingen
                        </button>
                        <button className="ui-hover" style={S.item} onClick={() => { setOpen(false); setCurriculumOpen(true); }}>
                            <BookLock size={14} /> Curriculum samenstellen
                        </button>
                    </div>
                </>
            )}

            {baseOpen && <BaseSettingsModal onClose={() => setBaseOpen(false)} />}
            {curriculumOpen && <CurriculumBuilderModal onClose={() => setCurriculumOpen(false)} />}
        </div>
    );
}

const S = {
    wrap: { position: 'relative', display: 'flex', flexShrink: 0 } as React.CSSProperties,
    gearBtn: {
        width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        border: '1px solid var(--separator)', backgroundColor: 'var(--bg-surface-2)',
        color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-1)',
    } as React.CSSProperties,
    backdrop: { position: 'fixed', inset: 0, zIndex: 30 } as React.CSSProperties,
    // Opens upward — the gear lives at the bottom of the sidebar.
    menu: {
        position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, zIndex: 31,
        minWidth: '210px', background: 'var(--bg-surface)', border: '1px solid var(--separator)',
        borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-2)', padding: 'var(--sp-1)',
        display: 'flex', flexDirection: 'column', gap: '2px',
    } as React.CSSProperties,
    item: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', textAlign: 'left',
        padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: 'none',
        background: 'transparent', color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
    } as React.CSSProperties,
};
