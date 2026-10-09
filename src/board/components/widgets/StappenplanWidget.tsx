import { Check } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { DATUM_COLORS } from '../../widgetSizing';
import { stappenplanProps } from '../../settings/listModel';
import { fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Numbered step plan: '#' rows are headers, '##' subheaders, other rows steps. With
// "Stappen afvinken" on, a tap marks a step done (same looks as the checklist).
export default function StappenplanWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const p = stappenplanProps(widget);
    const fs = fontScale(widget);
    const accent = widgetAccent(widget);
    // Legacy named colour (before accentkleur) still paints old boards the same.
    const colorKey = typeof widget.props?.color === 'string' && widget.props.color in DATUM_COLORS ? widget.props.color : 'blauw';
    const legacy = DATUM_COLORS[colorKey];
    const tone = (hex: string | null) => hex
        ? { text: hex, border: `color-mix(in srgb, ${hex} 35%, transparent)`, bg: `color-mix(in srgb, ${hex} 8%, transparent)` }
        : legacy;

    // Step numbers skip header rows — pure data before the JSX map.
    const steps = p.items.reduce<number[]>((acc, it) => {
        const prev = acc.length ? Math.max(...acc) : 0;
        return [...acc, it.text.trim() && !it.text.startsWith('#') ? prev + 1 : prev];
    }, []);

    const toggle = (i: number) => {
        const next = p.done.includes(i) ? p.done.filter(x => x !== i) : [...p.done, i];
        updateWidget(widget.id, { props: { ...widget.props, done: next } });
    };

    return (
        <div style={{ padding: '12px 16px', fontFamily: "'Azeret Mono', monospace" }}>
            {p.items.map((item, i) => {
                const line = item.text.trimEnd();
                if (!line.trim()) return null;
                const c = tone(item.color ?? accent);
                if (line.startsWith('##')) {
                    return <div key={i} style={{ fontSize: `${16 * fs}px`, fontWeight: 700, color: c.text, margin: '10px 0 4px', opacity: 0.85 }}>{line.replace(/^##\s*/, '')}</div>;
                }
                if (line.startsWith('#')) {
                    return <div key={i} style={{
                        fontSize: `${20 * fs}px`, fontWeight: 800, color: c.text, margin: '8px 0 6px',
                        borderBottom: `2px solid ${c.border}`, paddingBottom: '3px',
                    }}>{line.replace(/^#\s*/, '')}</div>;
                }
                const done = p.tappable && p.done.includes(i);
                const badge = (p.bigTap ? 38 : 28) * fs;
                const body = (
                    <>
                        {p.numbered && (
                            <span style={{
                                width: `${badge}px`, height: `${badge}px`, borderRadius: '50%', flexShrink: 0, alignSelf: 'center',
                                background: done ? c.text : c.bg, border: `1.5px solid ${c.border}`, color: done ? '#fff' : c.text,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: `${14 * fs * (p.bigTap ? 1.2 : 1)}px`,
                            }}>{done ? <Check size={badge * 0.6} weight="bold" /> : steps[i]}</span>
                        )}
                        <span style={{
                            fontSize: `${(p.bigTap ? 21 : 17) * fs}px`, color: '#111',
                            textDecoration: done && p.checkStyle === 'doorstreep' ? 'line-through' : 'none',
                            opacity: done && p.checkStyle !== 'vink' ? (p.checkStyle === 'vervaag' ? 0.4 : 0.55) : 1,
                        }}>{!p.numbered && done ? '✓ ' : ''}{line}</span>
                    </>
                );
                const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: '10px', padding: p.bigTap ? '10px 0' : '4px 0' };
                return p.tappable ? (
                    <button key={i} type="button" aria-pressed={done} onPointerDown={(e) => e.stopPropagation()} onClick={() => toggle(i)}
                        style={{ ...rowStyle, width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {body}
                    </button>
                ) : (
                    <div key={i} style={rowStyle}>{body}</div>
                );
            })}
        </div>
    );
}
