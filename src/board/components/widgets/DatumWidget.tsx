import { useEffect, useState } from 'react';
import { datumModel, datumColors, formatDate, isoWeek, dayOfYear, season, daysUntil, countdownText } from '../../settings/datumModel';
import { fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Daily-routine widget: weekday / date / live clock plus optional week number, day of the
// year, season and a countdown; format, letter case, colours and size from the ⚙ panel.
export default function DatumWidget({ widget }: { widget: BoardWidget }) {
    const m = datumModel(widget);
    const c = datumColors(m, widgetAccent(widget));
    const fs = fontScale(widget);
    const [now, setNow] = useState(() => new Date());

    // Tick per second with seconds showing, else every 10 s (also rolls the date over at midnight).
    useEffect(() => {
        const iv = setInterval(() => setNow(new Date()), m.showTime && m.showSeconds ? 1000 : 10_000);
        return () => clearInterval(iv);
    }, [m.showTime, m.showSeconds]);

    const weekday = now.toLocaleDateString('nl-BE', { weekday: 'long' });
    const timeStr = now.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit', ...(m.showSeconds ? { second: '2-digit' } : {}) });
    const caseOf = (capitalizeFirst: boolean): React.CSSProperties['textTransform'] =>
        m.textCase === 'hoofdletters' ? 'uppercase' : m.textCase === 'klein' ? 'lowercase' : capitalizeFirst ? 'capitalize' : 'none';
    const s = season(now);
    const countdown = m.countdownDate ? countdownText(daysUntil(now, m.countdownDate), m.countdownLabel) : null;
    const extras = [
        m.showWeek && `week ${isoWeek(now)}`,
        m.showDayOfYear && `dag ${dayOfYear(now)} van het jaar`,
        m.showSeason && `${s.icon} ${s.name}`,
    ].filter(Boolean) as string[];

    return (
        <div style={{
            margin: '12px', padding: '14px 20px', borderRadius: '10px', textAlign: 'center',
            background: m.tint ? c.bg : 'transparent', border: `1px solid ${m.tint ? c.border : 'transparent'}`,
            fontFamily: "'Azeret Mono', monospace",
        }}>
            {m.showWeekday && <div style={{ fontSize: `${30 * fs}px`, fontWeight: 700, textTransform: caseOf(true), color: c.text }}>{weekday}</div>}
            {m.showDate && <div style={{ fontSize: `${22 * fs}px`, marginTop: '4px', color: '#111', textTransform: caseOf(false) }}>{formatDate(now, m)}</div>}
            {m.showTime && <div style={{ fontSize: `${34 * fs}px`, fontWeight: 700, marginTop: '6px', color: c.text }}>{timeStr}</div>}
            {extras.length > 0 && (
                <div style={{ fontSize: `${15 * fs}px`, marginTop: '8px', color: '#444', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 14px', textTransform: caseOf(false) }}>
                    {extras.map(x => <span key={x}>{x}</span>)}
                </div>
            )}
            {countdown && <div data-datum-countdown style={{ fontSize: `${17 * fs}px`, fontWeight: 700, marginTop: '8px', color: c.text, textTransform: caseOf(false) }}>{countdown}</div>}
        </div>
    );
}
