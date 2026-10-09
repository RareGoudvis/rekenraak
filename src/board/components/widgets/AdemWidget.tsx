import { useEffect, useRef, useState } from 'react';
import { Play, Stop } from '@phosphor-icons/react';
import { ademProps, ademPhaseSec, nextAdemPhase, ADEM_COLOR, type AdemPhase } from '../../settings/ademModel';
import { playTone } from '../../settings/tones';
import { widgetAccent } from '../../settings/baseProps';
import type { BoardWidget } from '../../boardTypes';

// Guided breathing: a shape grows (inhale), holds, and shrinks (exhale) on the configured
// per-phase seconds. Calm colours, big text — meant for the digibord.
export default function AdemWidget({ widget }: { widget: BoardWidget }) {
    const p = ademProps(widget);
    const [running, setRunning] = useState(false);
    const [phase, setPhase] = useState<AdemPhase>('in');
    const [done, setDone] = useState(0);        // completed breaths this run
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!running) { if (timer.current) clearTimeout(timer.current); return; }
        timer.current = setTimeout(() => {
            const next = nextAdemPhase(phase, p);
            const breaths = done + (next.wraps ? 1 : 0);
            if (next.wraps && p.cycles > 0 && breaths >= p.cycles) {
                setDone(breaths);
                setRunning(false);
                setPhase('in');
                if (p.soundCue) playTone('bel');
                return;
            }
            if (p.soundCue) playTone('zacht', 1, 0.15);
            setDone(breaths);
            setPhase(next.phase);
        }, ademPhaseSec(phase, p) * 1000);
        return () => { if (timer.current) clearTimeout(timer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- p is rebuilt per render; its fields are listed
    }, [running, phase, done, p.inSec, p.holdSec, p.outSec, p.holdOutSec, p.speed, p.cycles, p.soundCue]);

    const big = phase === 'in' || phase === 'vast';
    const dur = phase === 'in' || phase === 'uit' ? ademPhaseSec(phase, p) : 0.3;
    // The default colour keeps its original hand-picked tints; any other colour derives them.
    const base = p.color || widgetAccent(widget) || ADEM_COLOR;
    const isDefault = base === ADEM_COLOR;
    const light = isDefault ? '#7dd3fc' : `color-mix(in srgb, ${base} 45%, white)`;
    const ink = isDefault ? '#0369a1' : `color-mix(in srgb, ${base} 70%, black)`;
    const glow = isDefault ? 'rgba(14,165,233,0.4)' : `color-mix(in srgb, ${base} 40%, transparent)`;
    const label = phase === 'in' ? p.labelIn : phase === 'uit' ? p.labelOut : p.labelHold;
    const finished = !running && p.cycles > 0 && done >= p.cycles;

    const scale = running && big ? 'scale(2.0)' : 'scale(1)';
    const shape = p.shape === 'bloem' ? (
        <svg data-adem-shape="bloem" width={90} height={90} viewBox="-50 -50 100 100" style={{ transform: scale, transition: `transform ${dur}s ease-in-out`, overflow: 'visible', filter: `drop-shadow(0 4px 10px ${glow})` }}>
            {Array.from({ length: 6 }, (_, i) => (
                <ellipse key={i} cx={0} cy={-24} rx={15} ry={24} fill={base} opacity={0.75} transform={`rotate(${i * 60})`} />
            ))}
            <circle r={14} fill={light} />
        </svg>
    ) : (
        <div data-adem-shape={p.shape} style={{
            width: '90px', height: '90px', borderRadius: p.shape === 'vierkant' ? '14px' : '50%',
            background: `radial-gradient(circle at 35% 35%, ${light}, ${base})`,
            transform: scale,
            transition: `transform ${dur}s ease-in-out`,
            boxShadow: `0 4px 20px ${glow}`,
        }} />
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '18px' }}>
            <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {shape}
            </div>
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '22px', fontWeight: 700, color: ink, minHeight: '28px', textAlign: 'center' }}>
                {running && p.guideText ? label : finished ? 'Klaar!' : ''}
                {running && p.cycles > 0 && (
                    <span style={{ display: 'block', fontSize: '14px', opacity: 0.7 }}>{Math.min(done + 1, p.cycles)} / {p.cycles}</span>
                )}
            </div>
            <button
                type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()}
                onClick={() => { setPhase('in'); setDone(0); setRunning(!running); }}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    height: '44px', padding: '0 20px', borderRadius: '10px', cursor: 'pointer',
                    border: '1px solid var(--accent-purple)', background: 'var(--bg-active)',
                    color: 'var(--text-main)', fontSize: '14px', fontFamily: "'Azeret Mono', monospace",
                }}>
                {running ? <><Stop size={18} /> Stop</> : <><Play size={18} /> Start</>}
            </button>
        </div>
    );
}
