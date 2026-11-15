import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { BURST_MS, burstParticles, type BurstKind } from './layout';
import './scene.css';

export interface BurstProps {
    kind: BurstKind;
    // The point it bursts from, in the nearest positioned parent: px, or any CSS length ("40%").
    x: number | string;
    y: number | string;
    // How far the particles fly, px.
    spread?: number;
    count?: number;
    // One colour for every particle (pieces of ice, a brown wooden block); absent = the kind's own (pieces: the game fills).
    color?: string;
    seed?: number;
    // Nothing moves: no burst at all, onDone at once.
    reducedMotion?: boolean;
    // After the last particle has gone (remount with a new key to burst again).
    onDone?(): void;
    className?: string;
}

/** A 4-point twinkle (24 × 24). */
const STAR = 'M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z';

/** A one-shot burst at a point: a splash of water, a twinkle of sparkles, a puff of smoke, or flying pieces. */
export default function Burst({ kind, x, y, spread = 80, count, color, seed = 3, reducedMotion = false, onDone, className }: BurstProps) {
    const particles = useMemo(() => burstParticles(kind, seed, spread, count), [kind, seed, spread, count]);
    const done = useRef(onDone);
    useEffect(() => { done.current = onDone; });
    const longest = reducedMotion ? 0 : Math.max(BURST_MS[kind], ...particles.map(p => p.delay + p.dur));
    useEffect(() => {
        const id = window.setTimeout(() => done.current?.(), longest);
        return () => window.clearTimeout(id);
    }, [longest]);
    if (reducedMotion) return null;
    const pos = (v: number | string) => (typeof v === 'number' ? `${v}px` : v);
    return (
        <div className={`spel-burst is-${kind}${className ? ` ${className}` : ''}`} style={{ left: pos(x), top: pos(y), ...(color ? { '--burst-color': color } : {}) } as CSSProperties} aria-hidden>
            {particles.map(p => (
                <span key={p.key} className="spel-particle"
                    style={{
                        '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--fall': `${p.fall}px`, '--rot': `${p.rot}deg`, '--size': `${p.size}px`,
                        '--tone': `var(--spel-fill-${p.tone})`, animationDelay: `${p.delay}ms`, animationDuration: `${p.dur}ms`,
                    } as CSSProperties}>
                    {kind === 'sparkle' && <svg viewBox="0 0 24 24"><path d={STAR} /></svg>}
                </span>
            ))}
        </div>
    );
}
