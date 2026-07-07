import { useBoardStore } from '../../useBoardStore';
import type { BoardWidget } from '../../boardTypes';

// Tap a cell to cycle its highlight color — for multiples, patterns, counting.
const MARK_CYCLE = ['', '#fde047', '#86efac', '#93c5fd', '#fca5a5'];

// 10×10 hundred chart (1-100 or 0-99).
export default function HonderdveldWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const start = Number(widget.props?.start ?? 1);
    const marks: Record<string, number> = (widget.props?.marks as Record<string, number>) ?? {};

    const cycle = (n: number) => {
        const cur = marks[String(n)] ?? 0;
        const next = (cur + 1) % MARK_CYCLE.length;
        const nm = { ...marks };
        if (next === 0) delete nm[String(n)];
        else nm[String(n)] = next;
        updateWidget(widget.id, { props: { ...widget.props, marks: nm } });
    };

    return (
        <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', border: '2px solid #000' }}>
                {Array.from({ length: 100 }, (_, i) => {
                    const n = start + i;
                    const mark = marks[String(n)] ?? 0;
                    return (
                        <button
                            key={n} type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => cycle(n)}
                            style={{
                                aspectRatio: '1', border: '0.5px solid rgba(0,0,0,0.35)', cursor: 'pointer',
                                background: MARK_CYCLE[mark] || '#fff',
                                fontFamily: "'Azeret Mono', monospace", fontSize: '14px', color: '#111', padding: 0,
                            }}
                        >
                            {n}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
