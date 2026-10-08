import { useBoardStore } from '../../useBoardStore';
import type { BoardWidget } from '../../boardTypes';

// Classroom noise-level poster (owner reference): 5 colored rows 0-4; the teacher
// taps the level that applies right now — active row full-strength, rest dimmed.
const LEVELS = [
    { n: 0, title: 'Stilte', desc: 'Muisstil: iedereen is stil.', color: '#facc15' },
    { n: 1, title: 'Fluisterstem', desc: 'Fluisteren: één persoon kan je horen.', color: '#4ade80' },
    { n: 2, title: 'Groepjesstem', desc: 'Enkel jouw groepje kan je horen.', color: '#38bdf8' },
    { n: 3, title: 'Klasstem', desc: 'Gewone stem bij klasopdrachten.', color: '#fb923c' },
    { n: 4, title: 'Luide stem', desc: 'Deze kan je gebruiken bij presentaties.', color: '#ef4444' },
];

export default function GeluidWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const active = Number(widget.props?.level ?? 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
            {LEVELS.map(l => {
                const on = active === l.n;
                return (
                    <button
                        key={l.n} type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => updateWidget(widget.id, { props: { ...widget.props, level: l.n } })}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                            padding: '8px 12px', borderRadius: '12px', cursor: 'pointer',
                            background: l.color, opacity: on ? 1 : 0.35,
                            border: on ? '3px solid #111' : '3px solid transparent',
                            transform: on ? 'scale(1.02)' : 'none', transition: 'all 120ms',
                        }}
                    >
                        <span style={{
                            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                            background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '24px', color: '#111',
                            border: '2px solid rgba(0,0,0,0.35)',
                        }}>{l.n}</span>
                        <span>
                            <span style={{ display: 'block', fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '19px', color: '#111' }}>{l.title}</span>
                            <span style={{ display: 'block', fontSize: '12px', fontStyle: 'italic', color: 'rgba(0,0,0,0.75)' }}>{l.desc}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
