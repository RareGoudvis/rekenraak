import { useSetProps, widgetAccent } from '../../settings/baseProps';
import { honderdveldProps, highlightColor, LEGACY_MARK_CYCLE } from '../../mathTools/honderdveld';
import type { BoardWidget } from '../../boardTypes';

// Hundred chart (any start, length and row width). A tap paints the cell in the chosen colour
// ('cyclus' steps through the palette like the original), or hides its number for invullen.
export default function HonderdveldWidget({ widget }: { widget: BoardWidget }) {
    const set = useSetProps(widget);
    const p = honderdveldProps(widget);
    // Accentkleur inks the numbers; none = the black of before.
    const ink = widgetAccent(widget) ?? '#111';

    const tap = (n: number) => {
        const key = String(n);
        if (p.tapMode === 'verbergen') {
            set({ hidden: p.hidden.includes(n) ? p.hidden.filter(h => h !== n) : [...p.hidden, n] });
            return;
        }
        const cur = p.marks[key];
        const marks = { ...p.marks };
        let next: string | undefined;
        if (p.paint === 'cyclus') {
            const i = LEGACY_MARK_CYCLE.indexOf(cur ?? '');
            next = LEGACY_MARK_CYCLE[(Math.max(0, i) + 1) % LEGACY_MARK_CYCLE.length] || undefined;
        } else {
            next = cur === p.paint ? undefined : p.paint;
        }
        if (next) marks[key] = next; else delete marks[key];
        set({ marks });
    };

    return (
        <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${p.cols}, 1fr)`, border: '2px solid #000' }}>
                {Array.from({ length: p.count }, (_, i) => {
                    const n = p.start + i;
                    const hidden = p.hidden.includes(n);
                    return (
                        <button
                            key={n} type="button" data-cell={n}
                            aria-label={hidden ? `Verborgen vakje ${i + 1}` : String(n)}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => tap(n)}
                            style={{
                                aspectRatio: '1', border: '0.5px solid rgba(0,0,0,0.35)', cursor: 'pointer',
                                background: p.marks[String(n)] ?? highlightColor(n, p.highlights) ?? '#fff',
                                fontFamily: "'Azeret Mono', monospace", fontSize: '14px', color: ink, padding: 0,
                            }}
                        >
                            {hidden ? '' : String(n).replace('-', '−')}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
