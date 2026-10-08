import { useEffect, useState } from 'react';
import { datumProps, DATUM_COLORS } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

// Daily-routine widget: weekday / full date / live clock, each toggleable, with a
// small curated color accent (settings panel).
export default function DatumWidget({ widget }: { widget: BoardWidget }) {
    const p = datumProps(widget);
    const c = DATUM_COLORS[p.color];
    const [now, setNow] = useState(() => new Date());

    // Tick only when the clock is visible; per-second only when seconds show.
    useEffect(() => {
        if (!p.showTime) return;
        const iv = setInterval(() => setNow(new Date()), p.showSeconds ? 1000 : 10_000);
        return () => clearInterval(iv);
    }, [p.showTime, p.showSeconds]);

    const weekday = now.toLocaleDateString('nl-BE', { weekday: 'long' });
    const dateStr = now.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit', ...(p.showSeconds ? { second: '2-digit' } : {}) });

    return (
        <div style={{
            margin: '12px', padding: '14px 20px', borderRadius: '10px', textAlign: 'center',
            background: c.bg, border: `1px solid ${c.border}`,
            fontFamily: "'Azeret Mono', monospace",
        }}>
            {p.showWeekday && <div style={{ fontSize: '30px', fontWeight: 700, textTransform: 'capitalize', color: c.text }}>{weekday}</div>}
            {p.showDate && <div style={{ fontSize: '22px', marginTop: '4px', color: '#111' }}>{dateStr}</div>}
            {p.showTime && <div style={{ fontSize: '34px', fontWeight: 700, marginTop: '6px', color: c.text }}>{timeStr}</div>}
        </div>
    );
}
