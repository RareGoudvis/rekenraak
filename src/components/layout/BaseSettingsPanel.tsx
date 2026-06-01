import { useState } from 'react';
import { SlidersHorizontal, BookLock } from 'lucide-react';
import BaseSettingsModal from './BaseSettingsModal';
import CurriculumBuilderModal from '../curriculum/CurriculumBuilderModal';

// Sidebar "Geavanceerd" accordion: collapsed by default, opens two buttons for the
// global base-settings modal and the curriculum builder. Hidden in locked (parent)
// mode by the sidebar.
export default function BaseSettingsPanel() {
    const [open, setOpen] = useState(false);
    const [baseOpen, setBaseOpen] = useState(false);
    const [curriculumOpen, setCurriculumOpen] = useState(false);

    return (
        <div style={S.wrap}>
            <button style={S.header} onClick={() => setOpen(!open)}>
                <span style={S.groupLabel}>Geavanceerd</span>
                <span style={S.chevron(open)}>›</span>
            </button>

            {open && (
                <div style={S.body}>
                    <button className="ui-hover" style={S.btn} onClick={() => setBaseOpen(true)}>
                        <SlidersHorizontal size={14} /> Basisinstellingen
                    </button>
                    <button className="ui-hover" style={S.btn} onClick={() => setCurriculumOpen(true)}>
                        <BookLock size={14} /> Curriculum samenstellen
                    </button>
                </div>
            )}

            {baseOpen && <BaseSettingsModal onClose={() => setBaseOpen(false)} />}
            {curriculumOpen && <CurriculumBuilderModal onClose={() => setCurriculumOpen(false)} />}
        </div>
    );
}

const S = {
    wrap: { padding: 'var(--sp-3) var(--sp-4)', borderTop: '1px solid var(--separator)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' } as React.CSSProperties,
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: 'var(--sp-1) 0', border: 'none', background: 'none', cursor: 'pointer' } as React.CSSProperties,
    chevron: (open: boolean): React.CSSProperties => ({ fontSize: '16px', lineHeight: 1, color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform var(--dur) var(--ease-out)', display: 'inline-block' }),
    body: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' } as React.CSSProperties,
    groupLabel: { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)' } as React.CSSProperties,
    btn: {
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', width: '100%',
        padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        border: '1px solid var(--separator)', background: 'var(--bg-surface-2)',
        color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 500, textAlign: 'left',
    } as React.CSSProperties,
};
