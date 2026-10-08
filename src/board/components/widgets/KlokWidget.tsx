import { useRef } from 'react';
import AnalogClockSVG from '../../../components/viewer/AnalogClockSVG';
import { formatTimeText, formatDigitalTime } from '../../../services/clock/clockTypes';
import { minuteFromAngle, hourFromAngle, carryHour, turnHourTo } from '../../../services/clock/clockMath';
import { useBoardStore } from '../../useBoardStore';
import { klokProps, type KlokProps } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

// Settable clock: drag the hands directly on the face (outer zone = minute hand,
// inner zone = hour hand), with optional digital display and written time.
export default function KlokWidget({ widget, dark }: { widget: BoardWidget; dark: boolean }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const k = klokProps(widget);
    const faceRef = useRef<HTMLDivElement>(null);
    const dragging = useRef<'uur' | 'minuut' | null>(null);

    // Several pointermoves can land before a re-render; the carry must compare against the stored time, not the rendered one.
    const live = () => {
        const s = useBoardStore.getState();
        return s.pages[s.activePageIdx]?.widgets.find(w => w.id === widget.id) ?? widget;
    };
    const setProps = (patch: Partial<KlokProps>) =>
        updateWidget(widget.id, { props: { ...live().props, ...patch } });

    const angleAt = (e: React.PointerEvent) => {
        const r = faceRef.current!.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        // 0° at 12 o'clock, clockwise.
        return { angle: (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, dist: Math.hypot(dx, dy), radius: r.width / 2 };
    };

    const applyDrag = (e: React.PointerEvent) => {
        const { angle } = angleAt(e);
        const now = klokProps(live());
        if (dragging.current === 'minuut') {
            // Like a real clock: the kleine wijzer travels with the minutes and carries past 12.
            const m = minuteFromAngle(angle);
            if (m !== now.minutes) setProps({ minutes: m, hours: carryHour(now.minutes, m, now.hours, 24) });
        } else if (dragging.current === 'uur') {
            // The kleine wijzer snaps to whole hours; the minutes stay what the grote wijzer says.
            const h = turnHourTo(hourFromAngle(angle, now.minutes), now.hours, 24);
            if (h !== now.hours) setProps({ hours: h });
        }
    };

    const onPointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        const { dist, radius } = angleAt(e);
        // Inner 45% of the face grabs the hour hand, the rest the minute hand.
        dragging.current = dist < radius * 0.45 ? 'uur' : 'minuut';
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        applyDrag(e);
    };
    const onPointerMove = (e: React.PointerEvent) => { if (dragging.current) applyDrag(e); };
    const endDrag = () => { dragging.current = null; };

    const textColor = dark ? '#fff' : '#111';
    // Fixed design size — the frame's zoom (w / naturalW) handles the visual size.
    const size = 240;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px' }}>
            {k.showAnalog && (
                <div
                    ref={faceRef} data-klok-face
                    style={{ background: '#fff', borderRadius: '50%', padding: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'grab', touchAction: 'none' }}
                    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
                >
                    <AnalogClockSVG hours={k.hours} minutes={k.minutes} showHourHand={k.showHourHand} showMinuteHand={k.showMinuteHand} is24hour={false} size={size} />
                </div>
            )}
            {k.showDigital && (
                <div style={{
                    fontFamily: "'Azeret Mono', monospace", fontWeight: 700, fontSize: '34px', color: textColor,
                    background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: '10px', padding: '4px 16px',
                }}>
                    {formatDigitalTime(k.hours, k.minutes)}
                </div>
            )}
            {k.showText && (
                <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '20px', color: textColor }}>
                    {/* The carry runs the hours 0-23; the written time reads the 1-12 of the face ("kwart over 1", not "13"). */}
                    {k.textStyle === 'tekst' ? formatTimeText(k.hours % 12 || 12, k.minutes, false) : formatDigitalTime(k.hours, k.minutes)}
                </div>
            )}
        </div>
    );
}
