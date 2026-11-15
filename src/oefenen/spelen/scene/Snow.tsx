import { useEffect, useMemo, useRef, useState, type AnimationEvent, type CSSProperties } from 'react';
import { snowLayout } from './layout';
import './scene.css';

export interface SnowProps {
    // Flakes on screen (about 25 = light, 50 = snowing, 100 = a blizzard).
    density?: number;
    // false = the snow stops: every flake finishes its fall, no new ones. true again = it starts once more.
    falling?: boolean;
    // Already snowing when the scene opens (else it starts at the top).
    full?: boolean;
    // Flake size range in px and seconds per fall.
    size?: readonly [number, number];
    fall?: readonly [number, number];
    seed?: number;
    paused?: boolean;
    // A few still flakes while it snows, none after.
    reducedMotion?: boolean;
    className?: string;
}

/** Falling snow over the whole layer; flakes sway a little and wrap back to the top until it stops. */
export default function Snow({
    density = 50, falling = true, full = false, size = [4, 11], fall = [6, 11], seed = 11, paused = false, reducedMotion = false, className,
}: SnowProps) {
    // Each start is a new snowfall: fresh flakes coming from the top.
    const [gen, setGen] = useState({ falling, n: 0 });
    if (gen.falling !== falling) setGen({ falling, n: falling ? gen.n + 1 : gen.n });
    const stopping = useRef(!falling);
    useEffect(() => { stopping.current = !falling; }, [falling]);
    const [s0, s1] = size;
    const [f0, f1] = fall;
    const still = reducedMotion;
    const flakes = useMemo(
        () => snowLayout(still ? Math.ceil(density / 3) : density, seed + gen.n, still || (full && gen.n === 0), [s0, s1], [f0, f1]),
        [density, seed, gen.n, full, still, s0, s1, f0, f1],
    );
    if (still && !falling) return null;
    // Stopping: a flake that reaches the bottom (or has yet to start) stays away; one in the air lands first.
    const settle = (e: AnimationEvent<HTMLSpanElement>) => {
        if (stopping.current && e.target === e.currentTarget) e.currentTarget.style.visibility = 'hidden';
    };
    const cls = ['spel-snow', paused || still ? 'is-still' : '', still ? 'is-fixed' : '', className ?? ''].filter(Boolean).join(' ');
    return (
        <div className={cls} aria-hidden>
            {flakes.map(f => (
                <span key={`${gen.n}-${f.key}`} className="spel-flake-fall" onAnimationIteration={settle} onAnimationStart={settle}
                    style={{ left: `${f.left}%`, animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s`, '--p': ((-f.delay / f.duration) % 1 + 1) % 1 } as CSSProperties}>
                    <i className="spel-flake" style={{ width: f.size, height: f.size, opacity: f.opacity, '--sway': `${f.sway}px`, animationDelay: `${f.delay}s` } as CSSProperties} />
                </span>
            ))}
        </div>
    );
}
