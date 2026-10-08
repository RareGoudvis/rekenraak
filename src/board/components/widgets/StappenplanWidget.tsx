import { DATUM_COLORS } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

const DEFAULT_PLAN = '# Zo werk je\n1e stap: lees de opdracht\n2e stap: maak een schets\n## Daarna\ncontroleer je antwoord';

// Numbered step plan: '#' lines are headers, '##' subheaders, other lines steps.
export default function StappenplanWidget({ widget }: { widget: BoardWidget }) {
    const text = typeof widget.props?.text === 'string' ? widget.props.text : DEFAULT_PLAN;
    const numbered = widget.props?.numbered !== false;
    const colorKey = typeof widget.props?.color === 'string' && widget.props.color in DATUM_COLORS ? widget.props.color : 'blauw';
    const c = DATUM_COLORS[colorKey];

    // Precompute step numbers (headers don't count) — pure data before the JSX map.
    const lines = text.split('\n').map(s => s.trimEnd()).filter(s => s.trim());
    const rows = lines.reduce<Array<{ line: string; step: number | null }>>((acc, line) => {
        const isHeader = line.startsWith('#');
        const prevStep = acc.length ? Math.max(...acc.map(r => r.step ?? 0)) : 0;
        acc.push({ line, step: isHeader ? null : prevStep + 1 });
        return acc;
    }, []);

    return (
        <div style={{ padding: '12px 16px', fontFamily: "'Azeret Mono', monospace" }}>
            {rows.map(({ line, step }, i) => {
                if (line.startsWith('##')) {
                    return <div key={i} style={{ fontSize: '16px', fontWeight: 700, color: c.text, margin: '10px 0 4px', opacity: 0.85 }}>{line.replace(/^##\s*/, '')}</div>;
                }
                if (line.startsWith('#')) {
                    return <div key={i} style={{
                        fontSize: '20px', fontWeight: 800, color: c.text, margin: '8px 0 6px',
                        borderBottom: `2px solid ${c.border}`, paddingBottom: '3px',
                    }}>{line.replace(/^#\s*/, '')}</div>;
                }
                return (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '10px', padding: '4px 0' }}>
                        {numbered && (
                            <span style={{
                                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, alignSelf: 'center',
                                background: c.bg, border: `1.5px solid ${c.border}`, color: c.text,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '14px',
                            }}>{step}</span>
                        )}
                        <span style={{ fontSize: '17px', color: '#111' }}>{line}</span>
                    </div>
                );
            })}
        </div>
    );
}
