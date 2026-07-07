import AnalogClockSVG from '../../../components/viewer/AnalogClockSVG';
import { useBoardStore } from '../../useBoardStore';
import type { BoardWidget } from '../../boardTypes';

// Settable analog clock (static hands in P1; drag-the-hands is a P3 tool).
// Time lives in props.{hours,minutes}; quick +/- controls when selected.
export default function KlokWidget({ widget, selected, dark }: { widget: BoardWidget; selected: boolean; dark: boolean }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const hours = Number(widget.props?.hours ?? 9);
    const minutes = Number(widget.props?.minutes ?? 0);

    const setTime = (h: number, m: number) => {
        let mm = m, hh = h;
        if (mm < 0) { mm += 60; hh -= 1; }
        if (mm >= 60) { mm -= 60; hh += 1; }
        hh = ((hh % 24) + 24) % 24;
        updateWidget(widget.id, { props: { ...widget.props, hours: hh, minutes: mm } });
    };

    const btn: React.CSSProperties = {
        minWidth: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer',
        border: `1px solid ${dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'}`,
        background: 'transparent', color: dark ? '#fff' : '#111', fontSize: '13px',
        fontFamily: "'Azeret Mono', monospace",
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px' }}>
            <div style={{ background: '#fff', borderRadius: '50%', padding: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                <AnalogClockSVG hours={hours} minutes={minutes} showHourHand showMinuteHand is24hour={false} size={Math.min(260, widget.w - 60)} />
            </div>
            {selected && (
                <div style={{ display: 'flex', gap: '6px' }} onPointerDown={(e) => e.stopPropagation()}>
                    <button type="button" style={btn} onClick={() => setTime(hours - 1, minutes)}>-1u</button>
                    <button type="button" style={btn} onClick={() => setTime(hours, minutes - 5)}>-5m</button>
                    <span style={{ ...btn, cursor: 'default', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', fontWeight: 700 }}>
                        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
                    </span>
                    <button type="button" style={btn} onClick={() => setTime(hours, minutes + 5)}>+5m</button>
                    <button type="button" style={btn} onClick={() => setTime(hours + 1, minutes)}>+1u</button>
                </div>
            )}
        </div>
    );
}
