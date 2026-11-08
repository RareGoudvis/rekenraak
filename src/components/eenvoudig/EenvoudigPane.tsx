import { LEERJAREN } from '../../config/gradePresets';
import { COMBO_TOPIC_ID, EENVOUDIG_NAV } from '../../config/eenvoudig/nav';
import { listCards } from '../../config/eenvoudig/cards';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { useEenvoudigUi } from './useEenvoudigUi';
import { useEenvoudigData } from './useEenvoudigData';

// SYNC: these four styles are the Uitgebreid tree's own (sidebar.tsx S.sectionHeader / domainContent / subdomainBtn / countBadge / chevron).
const headStyle = (a: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: '6px 10px',
    margin: 'var(--sp-1) var(--sp-1) var(--sp-2) var(--sp-3)', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
    borderLeft: `3px solid var(--domain-${a}-line)`, backgroundColor: `var(--domain-${a}-soft)`,
    color: 'var(--text-main)', fontSize: 'var(--text-sm)', fontWeight: 700, letterSpacing: '0.01em',
});
const groupStyle = (a: string): React.CSSProperties => ({
    paddingLeft: 'var(--sp-2)', marginLeft: 'var(--sp-3)', borderLeft: `3px solid var(--domain-${a}-line)`,
});
const rowStyle = (on: boolean): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-1)',
    padding: '9px 12px', cursor: 'pointer', border: 'none', background: 'none',
    color: on ? 'var(--text-main)' : 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: on ? 700 : 600,
    textAlign: 'left', transition: 'color var(--dur) var(--ease-out)',
});
const badgeStyle: React.CSSProperties = {
    flexShrink: 0, marginLeft: 'auto', padding: '0 6px', minWidth: '20px', textAlign: 'center',
    borderRadius: 'var(--radius-pill)', backgroundColor: 'var(--bg-surface-2)',
    color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 600, lineHeight: '17px',
};
const chevronStyle = (on: boolean): React.CSSProperties => ({
    fontSize: '16px', lineHeight: 1, color: 'var(--text-muted)', flexShrink: 0,
    transform: on ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform var(--dur) var(--ease-out)', display: 'inline-block',
});
const labelStyle: React.CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 };

export default function EenvoudigPane() {
    const data = useEenvoudigData();
    const { grade, setGrade, resetPicks } = useEenvoudigUi();
    const panel = useWorksheetStore(s => s.eenvoudigPanel);
    const setPanel = useWorksheetStore(s => s.setEenvoudigPanel);

    const openId = panel?.kind === 'topic' ? panel.topicId : panel?.kind === 'combo' && !panel.only ? COMBO_TOPIC_ID : null;
    const toggleTopic = (id: string) => {
        if (openId === id) { setPanel(null); return; }
        resetPicks();
        setPanel(id === COMBO_TOPIC_ID ? { kind: 'combo' } : { kind: 'topic', topicId: id });
    };

    // A topic with nothing to show for this leerjaar (an exercise not built yet) stays hidden, and so does an emptied section.
    const sections = data ? EENVOUDIG_NAV.map(s => ({
        ...s,
        topics: s.topics
            .map(t => ({ t, count: t.hasCards ? listCards(data, t.id, { grade }).length : 1 }))
            .filter(x => x.count > 0),
    })).filter(s => s.topics.length > 0) : [];

    return (
        <div className="ez-pane">
            <div className="ez-grades">
                <span>Leerjaar</span>
                <div className="seg-group" role="group" aria-label="Leerjaar kiezen">
                    {LEERJAREN.map(g => (
                        <button key={g} type="button" className="seg-btn" aria-pressed={g === grade} onClick={() => setGrade(g)}>{g}</button>
                    ))}
                </div>
            </div>
            <hr className="ez-rule" />
            <div className="ez-nav" data-tour="sidebar-nav">
                {sections.map(s => (
                    <div key={s.name} style={{ marginBottom: 'var(--sp-3)' }}>
                        <div style={headStyle(s.accent)}><span>{s.name}</span></div>
                        <div style={groupStyle(s.accent)}>
                            {s.topics.map(({ t, count }) => {
                                const on = openId === t.id;
                                return (
                                    <button key={t.id} type="button" className="sidebar-row" aria-pressed={on} style={rowStyle(on)} onClick={() => toggleTopic(t.id)}>
                                        <span style={labelStyle}>{t.label}</span>
                                        {t.hasCards && <span style={badgeStyle}>{count}</span>}
                                        <span style={chevronStyle(on)}>{'›'}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
