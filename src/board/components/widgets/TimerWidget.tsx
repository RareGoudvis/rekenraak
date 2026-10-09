import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ArrowCounterClockwise, Minus, Plus } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { timerProps, formatRemaining, presetLabel, TIMER_GREEN, type TimerModel } from '../../settings/timerModel';
import { widgetAccent } from '../../settings/baseProps';
import { playTone } from '../../settings/tones';
import type { BoardWidget } from '../../boardTypes';

const R = 90, C = 110;
const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;

// Visual countdown (pie / ring / bar / sandglass) + remaining time. Every option lives in the
// settings panel; the countdown itself is card-local state.
export default function TimerWidget({ widget }: { widget: BoardWidget }) {
    const p = timerProps(widget);
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const duration = p.durationSec;
    const [remaining, setRemaining] = useState(duration);
    const [running, setRunning] = useState(false);
    const [keyBuf, setKeyBuf] = useState('');
    const endFlash = remaining === 0 && p.flashOnEnd;
    const setDuration = (sec: number) => updateWidget(widget.id, { props: { ...widget.props, durationSec: Math.max(5, Math.min(5999, Math.round(sec))) } });

    // Duration change in settings resets the countdown (render-phase adjustment —
    // the React-sanctioned pattern instead of a setState-in-effect).
    const [prevDuration, setPrevDuration] = useState(duration);
    if (prevDuration !== duration) {
        setPrevDuration(duration);
        setRemaining(duration);
        setRunning(false);
    }

    // End handling reads the settings through a ref: the interval outlives a settings edit.
    const cfg = useRef<TimerModel>(p);
    useEffect(() => { cfg.current = p; });

    useEffect(() => {
        if (!running) return;
        // Wall-clock deadline instead of counting ticks: a throttled background tab stays exact.
        let endAt = Date.now() + remaining * 1000;
        const iv = setInterval(() => {
            const left = Math.ceil((endAt - Date.now()) / 1000);
            if (left > 0) { setRemaining(left); return; }
            const c = cfg.current;
            if (c.endSound !== 'geen') playTone(c.endSound, c.endRepeat);
            if (c.autoRestart) {
                endAt = Date.now() + c.durationSec * 1000;
                setRemaining(c.durationSec);
                return;
            }
            setRemaining(0);
            setRunning(false);
        }, 250);
        return () => clearInterval(iv);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- remaining is captured once at (re)start
    }, [running]);

    const frac = duration ? remaining / duration : 0;
    const warn = p.warnEnabled && remaining > 0 && remaining <= p.warnSec;
    const fill = warn ? p.warnColor : (p.color || widgetAccent(widget) || TIMER_GREEN);
    const label = keyBuf ? keypadLabel(keyBuf) : formatRemaining(remaining, p.display);
    const canStart = remaining > 0;
    const pauseLocked = running && !p.allowPause;

    // Dial input: drag around the circular face to set whole minutes on a 60-minute dial.
    const dialable = p.inputMode === 'draaien' && !running && (p.progress === 'taart' || p.progress === 'ring');
    const dialFrom = (e: React.PointerEvent<SVGSVGElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        const min = Math.round(((deg + 360) % 360) / 6) || 60;
        setDuration(min * 60);
    };

    const btn: React.CSSProperties = {
        width: '48px', height: '48px', borderRadius: '12px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(0,0,0,0.2)', background: 'rgba(0,0,0,0.03)', color: '#111',
    };
    const small: React.CSSProperties = {
        height: '36px', minWidth: '44px', padding: '0 10px', borderRadius: '10px', cursor: 'pointer',
        border: '1px solid rgba(0,0,0,0.2)', background: 'rgba(0,0,0,0.03)', color: '#111',
        fontFamily: "'Azeret Mono', monospace", fontSize: '14px', fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    };

    const flashStyle: React.CSSProperties = { animation: endFlash ? 'rk-blink 0.8s step-start infinite' : undefined };
    const textEl = (y: number, size = 30) => label && (
        <text x={C} y={y} textAnchor="middle" fontFamily="'Azeret Mono', monospace" fontWeight="700" fontSize={size} fill="#111">{label}</text>
    );

    let face: React.ReactNode;
    if (p.progress === 'balk') {
        face = (
            <div data-timer-face="balk" style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', ...flashStyle }}>
                {label && <div style={{ fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '44px', color: '#111' }}>{label}</div>}
                <div style={{ width: '100%', height: '38px', borderRadius: '10px', border: '2px solid rgba(0,0,0,0.25)', background: endFlash ? '#fecaca' : 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ width: `${frac * 100}%`, height: '100%', background: fill, opacity: 0.85, transition: 'width 250ms linear' }} />
                </div>
            </div>
        );
    } else if (p.progress === 'zandloper') {
        // Two triangular bulbs; the top sand drains from its surface, the bottom fills from its floor.
        const topH = 80 * frac, botH = 80 * (1 - frac);
        face = (
            <svg data-timer-face="zandloper" width={220} height={220} viewBox="0 0 220 220" style={flashStyle}>
                <defs>
                    <clipPath id={`tz-top-${widget.id}`}><path d="M 50 20 L 170 20 L 110 100 Z" /></clipPath>
                    <clipPath id={`tz-bot-${widget.id}`}><path d="M 110 100 L 170 180 L 50 180 Z" /></clipPath>
                </defs>
                <rect x={50} y={100 - topH} width={120} height={topH} fill={fill} opacity={0.85} clipPath={`url(#tz-top-${widget.id})`} />
                <rect x={50} y={180 - botH} width={120} height={botH} fill={fill} opacity={0.85} clipPath={`url(#tz-bot-${widget.id})`} />
                {running && frac > 0 && <line x1={110} y1={100} x2={110} y2={180 - botH} stroke={fill} strokeWidth={3} />}
                <path d="M 50 20 L 170 20 L 110 100 L 170 180 L 50 180 L 110 100 Z" fill={endFlash ? 'rgba(254,202,202,0.5)' : 'none'} stroke="rgba(0,0,0,0.45)" strokeWidth={3} strokeLinejoin="round" />
                <line x1={40} y1={18} x2={180} y2={18} stroke="#111" strokeWidth={5} strokeLinecap="round" />
                <line x1={40} y1={182} x2={180} y2={182} stroke="#111" strokeWidth={5} strokeLinecap="round" />
                {textEl(212, 24)}
            </svg>
        );
    } else if (p.progress === 'ring') {
        const circ = 2 * Math.PI * R;
        face = (
            <svg data-timer-face="ring" width={220} height={220} viewBox="0 0 220 220" style={{ ...flashStyle, touchAction: 'none', cursor: dialable ? 'pointer' : undefined }}
                onPointerDown={dialable ? (e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); dialFrom(e); } : undefined}
                onPointerMove={dialable ? (e) => { if (e.buttons) dialFrom(e); } : undefined}>
                <circle cx={C} cy={C} r={R} fill={endFlash ? '#fecaca' : 'none'} stroke="rgba(0,0,0,0.08)" strokeWidth={18} />
                <circle cx={C} cy={C} r={R} fill="none" stroke={fill} strokeWidth={18} strokeLinecap="round"
                    strokeDasharray={`${circ * frac} ${circ}`} transform={`rotate(-90 ${C} ${C})`} opacity={frac > 0 ? 0.9 : 0} />
                {textEl(C + 12, 40)}
            </svg>
        );
    } else {
        // Pie wedge for the REMAINING fraction (classic classroom time-timer look).
        const angle = frac * 360;
        const large = angle > 180 ? 1 : 0;
        const x = C + R * Math.cos(rad(angle)), y = C + R * Math.sin(rad(angle));
        const pie = frac >= 1 || frac <= 0
            ? null   // full circle drawn separately (arc with 360° collapses)
            : `M ${C} ${C} L ${C} ${C - R} A ${R} ${R} 0 ${large} 1 ${x.toFixed(1)} ${y.toFixed(1)} Z`;
        face = (
            <svg data-timer-face="taart" width={220} height={220} viewBox="0 0 220 220" style={{ ...flashStyle, touchAction: 'none', cursor: dialable ? 'pointer' : undefined }}
                onPointerDown={dialable ? (e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); dialFrom(e); } : undefined}
                onPointerMove={dialable ? (e) => { if (e.buttons) dialFrom(e); } : undefined}>
                <circle cx={C} cy={C} r={R} fill={endFlash ? '#fecaca' : 'rgba(0,0,0,0.05)'} stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
                {frac >= 1 ? <circle cx={C} cy={C} r={R} fill={fill} opacity={0.85} /> : (pie && <path d={pie} fill={fill} opacity={0.85} />)}
                <circle cx={C} cy={C} r={4} fill="#111" />
                {textEl(C + 60)}
            </svg>
        );
    }

    const pressKey = (k: string) => {
        if (k === 'C') { setKeyBuf(''); return; }
        if (k === 'OK') {
            if (keyBuf) setDuration(keypadSeconds(keyBuf));
            setKeyBuf('');
            return;
        }
        setKeyBuf((b) => (b + k).replace(/^0+/, '').slice(-4));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '14px' }}>
            {face}
            <div style={{ display: 'flex', gap: '8px' }} onPointerDown={(e) => e.stopPropagation()}>
                {p.inputMode === 'draaien' && !dialable && !running && (
                    <button type="button" style={btn} aria-label="Minuut minder" onClick={() => setDuration(duration - 60)}><Minus size={22} /></button>
                )}
                <button type="button" style={{ ...btn, opacity: pauseLocked || !canStart ? 0.4 : 1 }} aria-label={running ? 'Pauze' : 'Start'}
                    disabled={pauseLocked} onClick={() => canStart && setRunning(!running)}>
                    {running ? <Pause size={22} /> : <Play size={22} />}
                </button>
                <button type="button" style={btn} aria-label="Reset" onClick={() => { setRunning(false); setRemaining(duration); }}>
                    <ArrowCounterClockwise size={22} />
                </button>
                {p.inputMode === 'draaien' && !dialable && !running && (
                    <button type="button" style={btn} aria-label="Minuut meer" onClick={() => setDuration(duration + 60)}><Plus size={22} /></button>
                )}
            </div>
            {p.showPresets && !running && p.presets.length > 0 && (
                <div data-timer-presets style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }} onPointerDown={(e) => e.stopPropagation()}>
                    {p.presets.map((m, i) => (
                        <button key={i} type="button" style={small} onClick={() => setDuration(m * 60)}>{presetLabel(m)}</button>
                    ))}
                </div>
            )}
            {p.inputMode === 'toetsen' && !running && (
                <div data-timer-keypad style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: '6px' }} onPointerDown={(e) => e.stopPropagation()}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map(k => (
                        <button key={k} type="button" style={small} aria-label={k === 'C' ? 'Wissen' : k === 'OK' ? 'Tijd instellen' : k} onClick={() => pressKey(k)}>{k}</button>
                    ))}
                </div>
            )}
            <style>{'@keyframes rk-blink { 50% { opacity: 0.35; } }'}</style>
        </div>
    );
}

// Microwave-style entry: the last two typed digits are seconds, the ones before are minutes.
function keypadSeconds(buf: string): number {
    const n = buf.padStart(4, '0');
    return Number(n.slice(0, 2)) * 60 + Math.min(59, Number(n.slice(2)));
}
function keypadLabel(buf: string): string {
    const n = buf.padStart(4, '0');
    return `${n.slice(0, 2)}:${n.slice(2)}`;
}
