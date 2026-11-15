import type { CSSProperties, ReactNode } from 'react';

// The weather over a leerjaar scene: particles crossing the whole sky behind the page content (petals, bubbles,
// sparks, rain, snow, sand). Fixed pseudo-random paths, so every render draws the same sky; under reduced motion each
// particle rests at a point on its path (rain is left out: frozen streaks read as scratches).

export type WeatherKind = 'petals' | 'bubbles' | 'embers' | 'rain' | 'snow' | 'sand';

type Particle = { x0: number; y0: number; dx: number; dy: number; rot: number; dur: number; size: number; o: number };

// A stable 0..1 value per particle and channel.
const rnd = (i: number, k: number) => {
    const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return v - Math.floor(v);
};
const span = (r: number, lo: number, hi: number) => lo + r * (hi - lo);

const SPECS: Record<WeatherKind, { n: number; make: (i: number) => Particle }> = {
    snow: { n: 34, make: i => ({ x0: span(rnd(i, 1), -40, 1000), y0: -20, dx: span(rnd(i, 2), -30, 70), dy: 640, rot: 0, dur: span(rnd(i, 3), 10, 18), size: span(rnd(i, 4), 2.2, 4.8), o: 1 }) },
    petals: { n: 16, make: i => ({ x0: span(rnd(i, 1), -200, 700), y0: span(rnd(i, 2), -40, 200), dx: span(rnd(i, 3), 380, 560), dy: span(rnd(i, 4), 380, 520), rot: span(rnd(i, 5), 300, 720), dur: span(rnd(i, 6), 14, 22), size: span(rnd(i, 7), 0.8, 1.3), o: 0.95 }) },
    bubbles: { n: 14, make: i => ({ x0: span(rnd(i, 1), 0, 1000), y0: 640, dx: span(rnd(i, 2), -60, 60), dy: -720, rot: 0, dur: span(rnd(i, 3), 16, 26), size: span(rnd(i, 4), 5, 12), o: 0.9 }) },
    embers: { n: 22, make: i => ({ x0: span(rnd(i, 1), 0, 1000), y0: 620, dx: span(rnd(i, 2), -70, 70), dy: span(rnd(i, 3), -520, -680), rot: 0, dur: span(rnd(i, 4), 7, 12), size: span(rnd(i, 5), 1.8, 3.4), o: 1 }) },
    rain: { n: 44, make: i => ({ x0: span(rnd(i, 1), -100, 1000), y0: -40, dx: 60, dy: 680, rot: 0, dur: span(rnd(i, 2), 0.9, 1.4), size: span(rnd(i, 3), 14, 22), o: 0.55 }) },
    sand: { n: 22, make: i => ({ x0: -60, y0: span(rnd(i, 1), 260, 600), dx: 1120, dy: span(rnd(i, 2), -60, 20), rot: i % 4 === 0 ? 0 : span(rnd(i, 3), 0, 360), dur: span(rnd(i, 4), 6, 11), size: span(rnd(i, 5), 1.4, 2.6), o: 0.75 }) },
};

function shape(kind: WeatherKind, p: Particle, i: number): ReactNode {
    switch (kind) {
        case 'snow': return <circle className="kw-snow" r={p.size} />;
        case 'petals': return <ellipse className={i % 2 ? 'kw-petal' : 'kw-petal is-white'} rx={6 * p.size} ry={3.4 * p.size} />;
        case 'bubbles': return <g><circle className="kw-bubble" r={p.size} /><circle className="kw-bubble-shine" cx={-p.size * 0.35} cy={-p.size * 0.35} r={p.size * 0.25} /></g>;
        case 'embers': return <circle className="kw-ember" r={p.size} />;
        case 'rain': return <path className="kw-rain" d={`M0 0 L${(-p.size * 60) / 680} ${-p.size}`} />;
        // Every fourth grain is a wind streak.
        case 'sand': return i % 4 === 0 ? <path className="kw-wind" d="M0 0 q24 -5 48 0 t48 0" /> : <circle className="kw-sand" r={p.size} />;
    }
}

export default function Weather({ kind }: { kind: WeatherKind }) {
    const { n, make } = SPECS[kind];
    return (
        <svg className={`ks-weather is-${kind}`} viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: n }, (_, i) => {
                const p = make(i);
                const t = rnd(i, 9);
                const style = {
                    '--x0': `${p.x0}px`, '--y0': `${p.y0}px`,
                    '--x1': `${p.x0 + p.dx}px`, '--y1': `${p.y0 + p.dy}px`,
                    '--rot': `${p.rot}deg`, '--o': p.o, '--dur': `${p.dur}s`, '--delay': `${-t * p.dur}s`,
                    '--rest': `translate(${p.x0 + p.dx * t}px, ${p.y0 + p.dy * t}px) rotate(${p.rot * t}deg)`,
                } as CSSProperties;
                return <g key={i} className="kw-p" style={style}>{shape(kind, p, i)}</g>;
            })}
        </svg>
    );
}
