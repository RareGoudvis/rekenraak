import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ArrowCounterClockwise } from '@phosphor-icons/react';
import type { BoardWidget } from '../../boardTypes';

// Visual countdown: shrinking pie wedge + mm:ss. Duration/color in settings.
export default function TimerWidget({ widget }: { widget: BoardWidget }) {
    const duration = Math.max(5, Number(widget.props?.durationSec ?? 300));
    const color = String(widget.props?.color ?? '#16a34a');
    const [remaining, setRemaining] = useState(duration);
    const [running, setRunning] = useState(false);
    const endFlash = remaining === 0;
    const iv = useRef<ReturnType<typeof setInterval> | null>(null);

    // Duration change in settings resets the countdown (render-phase adjustment —
    // the React-sanctioned pattern instead of a setState-in-effect).
    const [prevDuration, setPrevDuration] = useState(duration);
    if (prevDuration !== duration) {
        setPrevDuration(duration);
        setRemaining(duration);
        setRunning(false);
    }

    useEffect(() => {
        if (!running) { if (iv.current) clearInterval(iv.current); iv.current = null; return; }
        iv.current = setInterval(() => setRemaining(r => {
            if (r <= 1) { setRunning(false); return 0; }
            return r - 1;
        }), 1000);
        return () => { if (iv.current) clearInterval(iv.current); };
    }, [running]);

    const frac = remaining / duration;
    const R = 90, C = 110;
    // Pie wedge for the REMAINING fraction (classic classroom time-timer look).
    const angle = frac * 360;
    const large = angle > 180 ? 1 : 0;
    const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const x = C + R * Math.cos(rad(angle)), y = C + R * Math.sin(rad(angle));
    const pie = frac >= 1
        ? null   // full circle drawn separately (arc with 360° collapses)
        : `M ${C} ${C} L ${C} ${C - R} A ${R} ${R} 0 ${large} 1 ${x.toFixed(1)} ${y.toFixed(1)} Z`;

    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(remaining % 60).padStart(2, '0');

    const btn: React.CSSProperties = {
        width: '48px', height: '48px', borderRadius: '12px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(0,0,0,0.2)', background: 'rgba(0,0,0,0.03)', color: '#111',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '14px' }}>
            <svg width={220} height={220} viewBox="0 0 220 220" style={{ animation: endFlash ? 'rk-blink 0.8s step-start infinite' : undefined }}>
                <circle cx={C} cy={C} r={R} fill={endFlash ? '#fecaca' : 'rgba(0,0,0,0.05)'} stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
                {frac >= 1 ? <circle cx={C} cy={C} r={R} fill={color} opacity={0.85} /> : (pie && <path d={pie} fill={color} opacity={0.85} />)}
                <circle cx={C} cy={C} r={4} fill="#111" />
                <text x={C} y={C + 60} textAnchor="middle" fontFamily="'Azeret Mono', monospace" fontWeight="700" fontSize="30" fill="#111">{mm}:{ss}</text>
            </svg>
            <div style={{ display: 'flex', gap: '8px' }} onPointerDown={(e) => e.stopPropagation()}>
                <button type="button" style={btn} aria-label={running ? 'Pauze' : 'Start'} onClick={() => remaining > 0 && setRunning(!running)}>
                    {running ? <Pause size={22} /> : <Play size={22} />}
                </button>
                <button type="button" style={btn} aria-label="Reset" onClick={() => { setRunning(false); setRemaining(duration); }}>
                    <ArrowCounterClockwise size={22} />
                </button>
            </div>
            <style>{'@keyframes rk-blink { 50% { opacity: 0.35; } }'}</style>
        </div>
    );
}
