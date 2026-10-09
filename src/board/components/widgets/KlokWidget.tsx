import { useEffect, useRef, useState } from 'react';
import BoardClockFace from './BoardClockFace';
import { formatTimeText } from '../../../services/clock/clockTypes';
import { minuteFromAngle, hourFromAngle, carryHour, turnHourTo } from '../../../services/clock/clockMath';
import { useBoardStore } from '../../useBoardStore';
import { klokProps, type KlokProps } from '../../widgetSizing';
import { klokModel, digitalTime, FACE_SIZES } from '../../settings/klokModel';
import { fontScale, widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Settable clock: drag the hands directly on the face (outer zone = minute hand,
// inner zone = hour hand), with optional digital display and written time. Face style,
// size, rings, seconds hand and live time come from the ⚙ panel.
export default function KlokWidget({ widget }: { widget: BoardWidget }) {
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const k = klokModel(widget);
    const fs = fontScale(widget);
    const faceRef = useRef<HTMLDivElement>(null);
    const dragging = useRef<'uur' | 'minuut' | null>(null);
    const [now, setNow] = useState(() => new Date());

    // Live time ticks per second only when seconds show.
    useEffect(() => {
        if (!k.live) return;
        const tick = () => setNow(new Date());
        tick();
        const iv = setInterval(tick, k.showSeconds ? 1000 : 5000);
        return () => clearInterval(iv);
    }, [k.live, k.showSeconds]);
    const hours = k.live ? now.getHours() : k.hours;
    const minutes = k.live ? now.getMinutes() : k.minutes;
    const seconds = k.live && k.showSeconds ? now.getSeconds() : null;

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
        const cur = klokProps(live());
        if (dragging.current === 'minuut') {
            // Like a real clock: the kleine wijzer travels with the minutes and carries past 12.
            const m = minuteFromAngle(angle);
            if (m !== cur.minutes) setProps({ minutes: m, hours: carryHour(cur.minutes, m, cur.hours, 24) });
        } else if (dragging.current === 'uur') {
            // The kleine wijzer snaps to whole hours; the minutes stay what the grote wijzer says.
            const h = turnHourTo(hourFromAngle(angle, cur.minutes), cur.hours, 24);
            if (h !== cur.hours) setProps({ hours: h });
        }
    };

    const onPointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        // Live time follows the real clock; the hands are not draggable then.
        if (k.live) return;
        const { dist, radius } = angleAt(e);
        // Inner 45% of the face grabs the hour hand, the rest the minute hand.
        dragging.current = dist < radius * 0.45 ? 'uur' : 'minuut';
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        applyDrag(e);
    };
    const onPointerMove = (e: React.PointerEvent) => { if (dragging.current) applyDrag(e); };
    const endDrag = () => { dragging.current = null; };

    // Fixed design size per face size; the frame's zoom (w / naturalW) handles the rest.
    // An outer number ring widens the canvas (BoardClockFace); 264 overall fits the 300 natural width.
    const size = Math.min(FACE_SIZES[k.faceSize], k.minuteNumbers ? 234 : k.ring24 ? 240 : 264);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px' }}>
            {k.showAnalog && (
                <div
                    ref={faceRef} data-klok-face
                    style={{ background: '#fff', borderRadius: '50%', padding: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: k.live ? 'default' : 'grab', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
                >
                    <BoardClockFace hours={hours} minutes={minutes} seconds={seconds} showHourHand={k.showHourHand} showMinuteHand={k.showMinuteHand}
                        ring24={k.ring24} minuteNumbers={k.minuteNumbers} faceStyle={k.faceStyle} size={size} accent={widgetAccent(widget)} />
                </div>
            )}
            {k.showDigital && (
                <div style={{
                    fontFamily: "'Azeret Mono', monospace", fontWeight: 700, fontSize: `${34 * fs}px`, color: '#111',
                    background: 'rgba(0,0,0,0.05)', borderRadius: '10px', padding: '4px 16px',
                }}>
                    {digitalTime(hours, minutes, seconds, k.clock24)}
                </div>
            )}
            {k.showText && (
                <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: `${20 * fs}px`, color: '#111' }}>
                    {/* The carry runs the hours 0-23; the written time reads the 1-12 of the face ("kwart over 1", not "13"). */}
                    {k.textStyle === 'tekst' ? formatTimeText(hours % 12 || 12, minutes, false) : digitalTime(hours, minutes, null, k.clock24)}
                </div>
            )}
        </div>
    );
}
