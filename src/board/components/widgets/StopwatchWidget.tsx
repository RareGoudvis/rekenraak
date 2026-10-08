import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ArrowCounterClockwise } from '@phosphor-icons/react';

// Simple classroom stopwatch: mm:ss.t with start/stop/reset.
export default function StopwatchWidget() {
    const [elapsed, setElapsed] = useState(0);   // ms
    const [running, setRunning] = useState(false);
    const startRef = useRef(0);

    useEffect(() => {
        if (!running) return;
        startRef.current = Date.now() - elapsed;
        const iv = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
        return () => clearInterval(iv);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- elapsed is captured once at start
    }, [running]);

    const mm = String(Math.floor(elapsed / 60000)).padStart(2, '0');
    const ss = String(Math.floor(elapsed / 1000) % 60).padStart(2, '0');
    const t = Math.floor(elapsed / 100) % 10;

    const btn: React.CSSProperties = {
        width: '48px', height: '48px', borderRadius: '12px', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(0,0,0,0.2)', background: 'rgba(0,0,0,0.03)', color: '#111',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '18px' }}>
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontWeight: 800, fontSize: '52px', color: '#111', fontVariantNumeric: 'tabular-nums' }}>
                {mm}:{ss}<span style={{ fontSize: '30px', color: 'rgba(0,0,0,0.5)' }}>.{t}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }} onPointerDown={(e) => e.stopPropagation()}>
                <button type="button" style={btn} aria-label={running ? 'Stop' : 'Start'} onClick={() => setRunning(!running)}>
                    {running ? <Pause size={22} /> : <Play size={22} />}
                </button>
                <button type="button" style={btn} aria-label="Reset" onClick={() => { setRunning(false); setElapsed(0); }}>
                    <ArrowCounterClockwise size={22} />
                </button>
            </div>
        </div>
    );
}
