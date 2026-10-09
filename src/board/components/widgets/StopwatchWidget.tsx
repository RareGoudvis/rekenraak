import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ArrowCounterClockwise, Flag } from '@phosphor-icons/react';
import { useBoardStore } from '../../useBoardStore';
import { stopwatchProps, formatElapsed } from '../../settings/stopwatchModel';
import { playTone } from '../../settings/tones';
import { widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Classroom stopwatch: counts up (or down from a start value) with start/stop/reset, optional
// laps, big-digit mode and a space-bar shortcut. Time is card-local state; laps persist in props.
export default function StopwatchWidget({ widget }: { widget: BoardWidget }) {
    const p = stopwatchProps(widget);
    const updateWidget = useBoardStore((s) => s.updateWidget);
    const [elapsed, setElapsed] = useState(0);   // ms
    const [running, setRunning] = useState(() => p.autoStart);
    const startRef = useRef(0);
    const countdownMs = p.fromSec * 1000;
    const isDown = p.direction === 'af';

    useEffect(() => {
        if (!running) return;
        startRef.current = Date.now() - elapsed;
        // Hundredths need a fast tick to look alive; tenths/seconds don't.
        const tick = p.precision === 'honderdsten' ? 30 : 100;
        const iv = setInterval(() => {
            const e = Date.now() - startRef.current;
            if (isDown && e >= countdownMs) {
                setElapsed(countdownMs);
                setRunning(false);
                if (p.soundAtStop) playTone(p.tone);
                return;
            }
            setElapsed(e);
        }, tick);
        return () => clearInterval(iv);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- elapsed is captured once at start
    }, [running, p.precision, isDown, countdownMs]);

    const toggle = () => {
        if (isDown && elapsed >= countdownMs) return;
        if (running && p.soundAtStop) playTone(p.tone);
        setRunning(!running);
    };
    const reset = () => { setRunning(false); setElapsed(0); };
    const lap = () => updateWidget(widget.id, { props: { ...widget.props, laps: [...p.laps, elapsed].slice(-99) } });

    // The latest toggle in a ref so the key listener never re-binds per tick.
    const toggleRef = useRef(toggle);
    useEffect(() => { toggleRef.current = toggle; });
    useEffect(() => {
        if (!p.spaceKey) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.code !== 'Space' || e.repeat) return;
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            e.preventDefault();
            toggleRef.current();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [p.spaceKey]);

    // Whole seconds counting down round up, like a countdown should: 00:01 until it is really over.
    const left = countdownMs - elapsed;
    const shown = !isDown ? elapsed : p.precision === 'seconden' ? Math.ceil(left / 1000) * 1000 : left;
    const { main, sub } = formatElapsed(shown, p.precision);
    const ink = widgetAccent(widget) ?? '#111';
    // Big mode sizes the digits to the 320px card: ~0.62em per mono glyph, sub-seconds at 0.55.
    const digitPx = p.bigDigits ? Math.min(96, Math.floor(284 / (0.62 * (main.length + 0.55 * sub.length)))) : 52;
    const btnPx = p.bigDigits ? 40 : 48;

    const btn: React.CSSProperties = {
        width: btnPx, height: btnPx, borderRadius: '12px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(0,0,0,0.2)', background: 'rgba(0,0,0,0.03)', color: '#111',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: p.bigDigits ? '6px' : '12px', padding: p.bigDigits ? '10px 18px 14px' : '18px' }}>
            <div data-stopwatch-digits style={{ fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: `${digitPx}px`, lineHeight: 1.1, color: ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                {main}{sub && <span style={{ fontSize: '0.58em', opacity: 0.55 }}>{sub}</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }} onPointerDown={(e) => e.stopPropagation()}>
                <button type="button" style={btn} aria-label={running ? 'Stop' : 'Start'} onClick={toggle}>
                    {running ? <Pause size={22} /> : <Play size={22} />}
                </button>
                {p.showLaps && (
                    <button type="button" style={btn} aria-label="Ronde" title="Ronde" onClick={lap} disabled={!running}>
                        <Flag size={22} />
                    </button>
                )}
                <button type="button" style={btn} aria-label="Reset" onClick={reset}>
                    <ArrowCounterClockwise size={22} />
                </button>
            </div>
            {p.showLaps && p.laps.length > 0 && (
                <ol data-stopwatch-laps style={{ margin: 0, padding: 0, listStyle: 'none', width: '100%', maxHeight: '180px', overflowY: 'auto', fontFamily: "'Azeret Mono', monospace", fontSize: '15px', color: '#111' }}>
                    {p.laps.map((t, i) => {
                        const split = formatElapsed(t - (i ? p.laps[i - 1] : 0), p.precision);
                        const total = formatElapsed(t, p.precision);
                        return (
                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 4px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                                <span style={{ opacity: 0.6 }}>Ronde {i + 1}</span>
                                <span>+{split.main}{split.sub}</span>
                                <span style={{ fontWeight: 700 }}>{total.main}{total.sub}</span>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
