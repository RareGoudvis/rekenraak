import { useId, useMemo, type CSSProperties } from 'react';
import { CLOUD_SHAPES, cloudLayout, type CloudLayer } from './layout';
import './scene.css';

export interface CloudsProps {
    count?: number;
    // Seconds a mid-size cloud needs to cross the layer (the layer's parallax factor comes on top).
    speed?: number;
    // Width range in px.
    size?: readonly [number, number];
    // The band they float in, % of the layer's height (top edges).
    band?: readonly [number, number];
    layer?: CloudLayer;
    // Fill colour (a CSS colour or token); the belly is a shade of it.
    tint?: string;
    // false = soft clouds without the ink outline (far away, a hazy sky).
    outline?: boolean;
    direction?: 'right' | 'left';
    seed?: number;
    // The help panel is open: the sky waits.
    paused?: boolean;
    // Clouds stand still where they are (spread over the sky).
    reducedMotion?: boolean;
    className?: string;
}

/** One cartoon cloud: an ink rim, a lit top and a shaded belly along the bottom (100 × 60 box). */
export function CloudShape({ shape, flip }: { shape: number; flip?: boolean }) {
    const clip = `spel-cloud-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const s = CLOUD_SHAPES[shape % CLOUD_SHAPES.length];
    const [x0, x1] = s.base;
    const body = (dy = 0) => (
        <>
            {s.puffs.map(([x, y, r], i) => <circle key={i} cx={x} cy={y + dy} r={r} />)}
            <rect x={x0} y={37 + dy} width={x1 - x0} height={13} rx={6.5} />
        </>
    );
    return (
        <svg className="spel-cloud" viewBox="0 0 100 60" aria-hidden>
            <defs><clipPath id={clip}>{body()}</clipPath></defs>
            <g transform={flip ? 'translate(100 0) scale(-1 1)' : undefined}>
                {/* The rim: the whole shape stroked twice as thick; the fill on top hides its inner half. */}
                <g className="spel-cloud-rim">{body()}</g>
                {/* Inside the outline: the shade, then the same shape lifted a little, so a belly stays along the bottom. */}
                <g clipPath={`url(#${clip})`}>
                    <rect className="spel-cloud-shade" x={0} y={0} width={100} height={60} />
                    <g className="spel-cloud-fill">{body(-5)}</g>
                </g>
            </g>
        </svg>
    );
}

// How far along its crossing a cloud starts (0–1): reduced motion draws it there with a plain transform, since a paused
// animation lands off-screen when prefers-reduced-motion collapses every animation's duration (src/index.css).
const progressOf = (c: { delay: number; duration: number }, direction: 'right' | 'left') => {
    const p = ((-c.delay / c.duration) % 1 + 1) % 1;
    return direction === 'left' ? 1 - p : p;
};

/** Drifting clouds that keep moving and wrap round; stack a far and a near layer for parallax. */
export default function Clouds({
    count = 4, speed = 70, size = [110, 190], band = [4, 30], layer = 'mid', tint, outline = true, direction = 'right',
    seed = 7, paused = false, reducedMotion = false, className,
}: CloudsProps) {
    const [s0, s1] = size;
    const [b0, b1] = band;
    const specs = useMemo(() => cloudLayout({ count, seed, size: [s0, s1], speed, band: [b0, b1], layer }), [count, seed, s0, s1, speed, b0, b1, layer]);
    const cls = ['spel-clouds', `is-${layer}`, outline ? '' : 'is-flat', direction === 'left' ? 'is-left' : '', paused || reducedMotion ? 'is-still' : '', reducedMotion ? 'is-fixed' : '', className ?? '']
        .filter(Boolean).join(' ');
    return (
        <div className={cls} style={tint ? { '--cloud-fill': tint } as CSSProperties : undefined} aria-hidden>
            {specs.map(c => (
                <div key={c.key} className="spel-cloud-track"
                    style={{ top: `${c.top}%`, opacity: c.opacity, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s`, '--w': `${c.width}px`, '--p': progressOf(c, direction) } as CSSProperties}>
                    <CloudShape shape={c.shape} flip={c.flip} />
                </div>
            ))}
        </div>
    );
}
