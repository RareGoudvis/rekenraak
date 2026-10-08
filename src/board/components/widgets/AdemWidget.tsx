import { useEffect, useRef, useState } from 'react';
import { Play, Stop } from '@phosphor-icons/react';
import { ademProps } from '../../widgetSizing';
import type { BoardWidget } from '../../boardTypes';

type Phase = 'in' | 'vast' | 'uit';
const PHASE_LABEL: Record<Phase, string> = { in: 'Adem in…', vast: 'Houd vast…', uit: 'Adem uit…' };

// Guided breathing: a circle grows (inhale), holds, and shrinks (exhale) on the
// configured per-phase seconds. Calm colors, big text — meant for the digibord.
export default function AdemWidget({ widget }: { widget: BoardWidget }) {
    const p = ademProps(widget);
    const [running, setRunning] = useState(false);
    const [phase, setPhase] = useState<Phase>('in');
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!running) { if (timer.current) clearTimeout(timer.current); return; }
        const next: Record<Phase, { p: Phase; secs: number }> = {
            in: { p: p.holdSec > 0 ? 'vast' : 'uit', secs: p.inSec },
            vast: { p: 'uit', secs: p.holdSec },
            uit: { p: 'in', secs: p.outSec },
        };
        timer.current = setTimeout(() => setPhase(next[phase].p), next[phase].secs * 1000);
        return () => { if (timer.current) clearTimeout(timer.current); };
    }, [running, phase, p.inSec, p.holdSec, p.outSec]);

    const big = phase === 'in' || phase === 'vast';
    const dur = phase === 'in' ? p.inSec : phase === 'uit' ? p.outSec : 0.3;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '18px' }}>
            <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                    width: '90px', height: '90px', borderRadius: '50%',
                    background: 'radial-gradient(circle at 35% 35%, #7dd3fc, #0ea5e9)',
                    transform: running && big ? 'scale(2.0)' : 'scale(1)',
                    transition: `transform ${dur}s ease-in-out`,
                    boxShadow: '0 4px 20px rgba(14,165,233,0.4)',
                }} />
            </div>
            <div style={{ fontFamily: "'Azeret Mono', monospace", fontSize: '22px', fontWeight: 700, color: '#0369a1', minHeight: '28px' }}>
                {running ? PHASE_LABEL[phase] : ''}
            </div>
            <button
                type="button" className="ui-hover" onPointerDown={(e) => e.stopPropagation()}
                onClick={() => { setPhase('in'); setRunning(!running); }}
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
