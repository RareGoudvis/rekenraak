import type { CSSProperties } from 'react';
import { burst, seeded, type ArenaArtProps } from './pick';

// The kerker: a friendly dungeon. Rough stone walls lit by four flickering torches, chains that sway from the
// beams, a barred cell door with two curious eyes, bats that flutter, water that drips into a bucket, a mouse
// that peeks out, cobwebs and dust in the torchlight. The middle is a dark archway (calm, so the spells read).
// Animated groups never carry a transform attribute: a wrapper places them.

const at = (x: number, y: number) => `translate(${x} ${y})`;
const v = (o: Record<string, string | number>) => o as CSSProperties;

// The wall's stones: rough rows of uneven blocks (the archway is painted over them).
const STONES = (() => {
    const r = seeded(7);
    const out: { x: number; y: number; w: number; h: number; tone: number; moss: boolean }[] = [];
    for (let row = 0, y = -4; y < 560; row++) {
        const h = 50 + Math.floor(r() * 16);
        let x = -20 - Math.floor(r() * 60);
        while (x < 1620) {
            const w = 80 + Math.floor(r() * 80);
            out.push({ x, y, w, h, tone: Math.floor(r() * 3), moss: r() < 0.12 && y > 300 });
            x += w;
        }
        y += h;
    }
    return out;
})();

// A rough stone: a rectangle with chipped corners.
const stonePath = (x: number, y: number, w: number, h: number, k: number) => {
    const c = 6 + (k % 3) * 3;
    return `M${x + c} ${y + 2} L${x + w - c} ${y + 3} L${x + w - 3} ${y + c} L${x + w - 2} ${y + h - c} L${x + w - c - 2} ${y + h - 2} L${x + c} ${y + h - 3} L${x + 3} ${y + h - c} L${x + 2} ${y + c + 1} Z`;
};

const TORCHES = [
    { x: 118, y: 360, half: 'l', lean: '24deg' },
    { x: 468, y: 360, half: 'l', lean: '20deg' },
    { x: 1132, y: 360, half: 'r', lean: '-20deg' },
    { x: 1500, y: 336, half: 'r', lean: '-24deg' },
] as const;

function Torch({ k, half, lean }: { k: number; half: 'l' | 'r'; lean: string }) {
    return (
        <g>
            <rect className="tva-ker-plate" x="-11" y="4" width="22" height="34" rx="4" />
            <path className="tva-ker-arm" d="M0 22 Q-2 10 0 0" />
            <path className="tva-ker-stick" d="M2 30 L0 -12" />
            <path className="tva-ker-cup" d="M-13 -24 L13 -24 L8 -8 L-8 -8 Z" />
            <path className="tva-ker-wrap" d="M-10 -18 L10 -14 M-9 -13 L9 -10" />
            <g transform={at(0, -22)}>
                <g className={`tva-gust is-${half}`} style={v({ '--lean': lean, '--d': `${k * 30}ms` })}>
                    <g className="tva-ker-flame" style={v({ '--k': k })}>
                        <path className="tva-ker-flame-out" d="M0 -66 C14 -48 24 -30 18 -12 C14 0 -14 0 -18 -12 C-24 -30 -10 -44 -6 -56 C-4 -46 0 -40 0 -66 Z" />
                        <path className="tva-ker-flame-mid" d="M0 -44 C9 -32 14 -20 10 -9 C7 -2 -7 -2 -10 -9 C-14 -20 -8 -30 0 -44 Z" />
                        <path className="tva-ker-flame-core" d="M0 -24 C5 -17 7 -10 5 -5 C3 -2 -3 -2 -5 -5 C-7 -10 -5 -17 0 -24 Z" />
                    </g>
                </g>
                {[0, 1, 2].map(e => (
                    <g key={e} transform={at((e - 1) * 7, -40)}>
                        <circle className="tva-ker-ember" r="2.5" style={v({ '--k': e + k * 3, '--ex': `${(e - 1) * 14}px` })} />
                    </g>
                ))}
            </g>
        </g>
    );
}

// A chain hanging from (0, 0) with a shackle at the end: it sways, and swings on a hit.
function Chain({ len, k, half }: { len: number; k: number; half: 'l' | 'r' }) {
    const links = Math.floor(len / 17);
    return (
        <g className={`tva-wob is-${half}`} style={v({ '--wob': '11deg', '--d': `${k * 60}ms` })}>
            <g className="tva-ker-swing" style={v({ '--k': k })}>
                {Array.from({ length: links }, (_, i) => i % 2
                    ? <rect key={i} className="tva-ker-link-side" x="-2.5" y={i * 17 - 3} width="5" height="23" rx="2.5" />
                    : <ellipse key={i} className="tva-ker-link" cx="0" cy={i * 17 + 8} rx="7" ry="12" />)}
                <g transform={at(0, links * 17 + 14)}>
                    <path className="tva-ker-shackle" d="M-14 0 A14 14 0 1 0 14 0" />
                    <rect className="tva-ker-hinge" x="-18" y="-6" width="36" height="9" rx="4" />
                </g>
            </g>
        </g>
    );
}

// A bat that flaps, drawn around its body at (0, 0).
function Bat({ k }: { k: number }) {
    return (
        <g>
            <g className="tva-ker-wing is-left" style={v({ '--k': k })}>
                <path className="tva-ker-batwing" d="M-6 -2 Q-18 -16 -36 -10 Q-30 -4 -32 4 Q-24 0 -20 6 Q-14 0 -6 4 Z" />
            </g>
            <g className="tva-ker-wing is-right" style={v({ '--k': k })}>
                <path className="tva-ker-batwing" d="M6 -2 Q18 -16 36 -10 Q30 -4 32 4 Q24 0 20 6 Q14 0 6 4 Z" />
            </g>
            <ellipse className="tva-ker-bat" cx="0" cy="0" rx="9" ry="11" />
            <path className="tva-ker-bat" d="M-7 -7 L-8 -17 L-2 -10 Z M7 -7 L8 -17 L2 -10 Z" />
            <circle className="tva-ker-bateye" cx="-3.5" cy="-3" r="2.2" />
            <circle className="tva-ker-bateye" cx="3.5" cy="-3" r="2.2" />
            <path className="tva-ker-batfang" d="M-2 4 l1 3 l1 -3 M1 4 l1 3 l1 -3" />
        </g>
    );
}

// A flying bat on a lazy loop around (cx, cy).
function FlyingBat({ cx, cy, rx, ry, t, k, half }: { cx: number; cy: number; rx: number; ry: number; t: number; k: number; half: 'l' | 'r' }) {
    return (
        <g transform={at(cx, cy)}>
            <g className={`tva-jolt is-${half}`} style={v({ '--jump': '34px' })}>
                <g className="tva-orb-x" style={v({ '--rx': `${rx}px`, '--t': `${t}s` })}>
                    <g className="tva-orb-y" style={v({ '--ry': `${ry}px`, '--t': `${t * 0.5}s` })}>
                        <g className="tva-ker-flutter" style={v({ '--k': k })}><Bat k={k} /></g>
                    </g>
                </g>
            </g>
        </g>
    );
}

// A bat asleep upside down, hanging from (0, 0).
function SleepyBat() {
    return (
        <g className="tva-ker-dangle">
            <path className="tva-ker-claw" d="M-3 0 v6 M3 0 v6" />
            <path className="tva-ker-batwing" d="M-12 8 Q-16 26 -6 40 Q0 44 6 40 Q16 26 12 8 Q0 2 -12 8 Z" />
            <path className="tva-ker-bat" d="M-6 40 L-7 50 L-1 43 Z M6 40 L7 50 L1 43 Z" />
            <path className="tva-ker-sleep" d="M-6 33 q3 -3 6 0 M1 33 q3 -3 6 0" />
            {[0, 1, 2].map(z => (
                <g key={z} transform={at(14, 30)}>
                    <path className="tva-ker-z" style={v({ '--k': z })} d="M0 0 h7 l-7 8 h7" />
                </g>
            ))}
        </g>
    );
}

// A drop that swells at (0, 0), falls `fall` and splashes; synced with its splash ring.
function Drip({ fall, k }: { fall: number; k: number }) {
    return (
        <g>
            <path className="tva-ker-drop" style={v({ '--fall': `${fall}px`, '--k': k })} d="M0 -10 C3 -5 6 -1 6 3 A6 6 0 0 1 -6 3 C-6 -1 -3 -5 0 -10 Z" />
            <g transform={at(0, fall + 4)}>
                <ellipse className="tva-ker-splash" rx="18" ry="5" style={v({ '--k': k })} />
            </g>
        </g>
    );
}

function Cobweb({ flip = false, s = 1 }: { flip?: boolean; s?: number }) {
    return (
        <g transform={`scale(${flip ? -s : s} ${s})`}>
            <g className="tva-ker-web">
                <path className="tva-ker-thread" d="M0 0 L90 4 M0 0 L76 40 M0 0 L44 70 M0 0 L6 92" />
                <path className="tva-ker-thread" d="M30 1 Q24 10 25 14 Q16 18 15 23 Q8 24 2 31 M56 3 Q46 18 50 27 Q36 36 30 47 Q16 50 4 61 M80 4 Q66 26 69 36 Q54 50 41 64 Q24 72 5 84" />
            </g>
        </g>
    );
}

// The cell door: an arched opening with iron bars, a lock, and two eyes that blink in the dark.
function Gate() {
    return (
        <g>
            <path className="tva-ker-cell" d="M-84 0 V-90 A84 84 0 0 1 84 -90 V0 Z" />
            <g transform={at(-12, -78)}>
                <g className="tva-ker-peek">
                    <ellipse className="tva-ker-eye" cx="0" cy="0" rx="7" ry="9" />
                    <ellipse className="tva-ker-eye" cx="24" cy="0" rx="7" ry="9" />
                    <circle className="tva-ker-pupil" cx="2" cy="1" r="3" />
                    <circle className="tva-ker-pupil" cx="26" cy="1" r="3" />
                </g>
            </g>
            <g className="tva-wob is-r" style={v({ '--wob': '1.6deg' })}>
                {[-56, -28, 0, 28, 56].map(x => {
                    const top = -90 - Math.sqrt(Math.max(0, 84 * 84 - x * x)) + 4;
                    return <path key={x} className="tva-ker-bar" d={`M${x} 0 V${top.toFixed(1)}`} />;
                })}
                <path className="tva-ker-crossbar" d="M-82 -36 H82 M-82 -96 H82" />
                {[-56, -28, 0, 28, 56].map(x => <circle key={x} className="tva-ker-rivet" cx={x} cy="-36" r="4" />)}
                <rect className="tva-ker-lock" x="40" y="-62" width="26" height="30" rx="5" />
                <path className="tva-ker-keyhole" d="M53 -52 v10" />
            </g>
            <path className="tva-ker-frame is-ink" d="M-92 0 V-90 A92 92 0 0 1 92 -90 V0" />
            <path className="tva-ker-frame" d="M-92 0 V-90 A92 92 0 0 1 92 -90 V0" />
        </g>
    );
}

// A mouse hole at the wall's foot (its floor centre at 0, 0): the mouse peeks out now and then.
function MouseHole() {
    return (
        <g>
            <path className="tva-ker-hole" d="M-22 0 V-14 A22 22 0 0 1 22 -14 V0 Z" />
            <g className="tva-ker-mouse">
                <ellipse className="tva-ker-mousebody" cx="0" cy="-10" rx="13" ry="10" />
                <circle className="tva-ker-mousebody" cx="-9" cy="-20" r="6" />
                <circle className="tva-ker-mousebody" cx="9" cy="-20" r="6" />
                <circle className="tva-ker-mouseeye" cx="-4" cy="-11" r="2" />
                <circle className="tva-ker-mouseeye" cx="4" cy="-11" r="2" />
                <circle className="tva-ker-nose" cx="0" cy="-6" r="2.5" />
            </g>
        </g>
    );
}

function Bucket() {
    return (
        <g>
            <ellipse className="tva-shadow" cx="0" cy="4" rx="36" ry="7" />
            <path className="tva-ker-bucket" d="M-28 -46 L28 -46 L22 0 L-22 0 Z" />
            <path className="tva-ker-hoop" d="M-27 -36 L27 -36 M-23 -8 L23 -8" />
            <ellipse className="tva-ker-water" cx="0" cy="-46" rx="27" ry="6" />
            <path className="tva-ker-handle" d="M-28 -46 Q0 -86 28 -46" />
        </g>
    );
}

function Straw() {
    return (
        <g>
            <path className="tva-ker-straw" d="M-20 0 Q10 -44 60 -36 Q100 -34 128 0 Z" />
            <path className="tva-ker-strand" d="M0 -8 L-14 -26 M20 -20 L10 -44 M44 -28 L52 -50 M70 -26 L86 -46 M96 -16 L116 -30 M30 -6 L58 -18 M80 -6 L104 -12" />
        </g>
    );
}

// The arch over the dark passage: voussoirs round the opening, a keystone, and the jambs.
function Archway() {
    const R0 = 240, R1 = 284, cx = 800, cy = 330;
    const ring = Array.from({ length: 11 }, (_, i) => {
        const a0 = Math.PI + (i / 11) * Math.PI + 0.012, a1 = Math.PI + ((i + 1) / 11) * Math.PI - 0.012;
        const p = (r: number, a: number) => `${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`;
        return <path key={i} className={`tva-ker-vous${i === 5 ? ' is-key' : ''}`} d={`M${p(R0, a0)} A${R0} ${R0} 0 0 1 ${p(R0, a1)} L${p(R1 + (i === 5 ? 14 : 0), a1)} A${R1} ${R1} 0 0 0 ${p(R1 + (i === 5 ? 14 : 0), a0)} Z`} />;
    });
    return (
        <g>
            <path className="tva-ker-deep" d={`M${cx - R0} 562 V${cy} A${R0} ${R0} 0 0 1 ${cx + R0} ${cy} V562 Z`} />
            <path className="tva-ker-deeper" d={`M${cx - 170} 562 V${cy + 40} A170 170 0 0 1 ${cx + 170} ${cy + 40} V562 Z`} />
            <ellipse className="tva-ker-farglow" cx={cx} cy="540" rx="190" ry="90" fill="url(#tva-ker-far)" />
            {[0, 1, 2].map(i => <path key={i} className="tva-ker-step" d={`M${cx - 200 + i * 22} ${560 - i * 14} H${cx + 200 - i * 22}`} />)}
            {[0, 1, 2, 3].map(i => (
                <g key={i}>
                    <rect className="tva-ker-jamb" x={cx - R1} y={cy + i * 58} width={R1 - R0} height="56" rx="5" />
                    <rect className="tva-ker-jamb" x={cx + R0} y={cy + i * 58} width={R1 - R0} height="56" rx="5" />
                </g>
            ))}
            {ring}
        </g>
    );
}

function Floor() {
    const r = seeded(23);
    const rows = [[560, 30], [590, 40], [630, 76]] as const;
    return (
        <g>
            <rect className="tva-ker-floor" x="-10" y="560" width="1620" height="150" />
            {rows.map(([y, h], ri) => {
                const out = [];
                let x = -30 - ri * 40;
                while (x < 1620) {
                    const w = 110 + ri * 40 + Math.floor(r() * 70);
                    out.push(<path key={x} className={`tva-ker-flag is-${Math.floor(r() * 3)}`} d={stonePath(x, y, w, h, Math.floor(r() * 3))} />);
                    x += w;
                }
                return <g key={ri}>{out}</g>;
            })}
            {TORCHES.map((t, i) => <ellipse key={i} className="tva-ker-floorlight" cx={t.x} cy="600" rx="150" ry="34" fill="url(#tva-ker-light)" style={v({ '--k': i })} />)}
            <path className="tva-ker-floorline" d="M-10 560 H1610" />
        </g>
    );
}

// On a big hit: dust and pebbles rain from the beams, a puff where they come loose.
function Dust({ n, side }: { n: number; side: ArenaArtProps['side'] }) {
    const r = seeded(100 + n);
    const half = (x0: number, x1: number, count: number, cls: 'l' | 'r') => Array.from({ length: count }, (_, k) => {
        const x = x0 + r() * (x1 - x0);
        const pebble = k % 3 === 0;
        return (
            <g key={`${cls}${k}`} transform={at(x, 236)} className={`is-${cls}`}>
                <g className="tva-fall" style={v({ '--fy': `${330 + r() * 20}px`, '--fx': `${(r() - 0.5) * 40}px`, '--fr': `${(r() - 0.5) * 500}deg`, '--fd': `${900 + r() * 700}ms`, '--fdel': `${r() * 260}ms` })}>
                    {pebble ? <path className="tva-ker-pebble" d={`M-${6 + (k % 4)} 0 L0 -${6 + (k % 3)} L${7 + (k % 3)} -1 L3 ${6 + (k % 2)} Z`} /> : <circle className="tva-ker-speck" r={2.5 + (k % 3)} />}
                </g>
            </g>
        );
    });
    const puffs = (xs: number[], cls: 'l' | 'r') => xs.map((x, k) => (
        <g key={`p${cls}${k}`} transform={at(x, 240)} className={`is-${cls}`}>
            <g className="tva-cloud" style={v({ '--fx': `${(k % 2 ? 1 : -1) * 14}px`, '--fdel': `${k * 70}ms` })}>
                <circle className="tva-ker-puff" cx="-12" cy="4" r={12 + (k % 3) * 4} /><circle className="tva-ker-puff" cx="12" cy="6" r={11 + (k % 2) * 4} /><circle className="tva-ker-puff" cx="0" cy="-4" r={15 + (k % 3) * 4} />
            </g>
        </g>
    ));
    const nl = burst(side, 'left', 34, 10), nr = burst(side, 'right', 34, 10);
    return (
        <g>
            {half(0, 540, nl, 'l')}
            {half(1060, 1600, nr, 'r')}
            {puffs(side === 'right' ? [1180, 1420] : [120, 300, 470], 'l')}
            {puffs(side === 'left' ? [1230] : [1150, 1330, 1520], 'r')}
        </g>
    );
}

export default function Kerker({ n, side }: ArenaArtProps) {
    return (
        <svg className="tva-svg" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMax slice">
            <defs>
                <radialGradient id="tva-ker-light">
                    <stop offset="0" className="tva-ker-stop is-warm" stopOpacity=".7" />
                    <stop offset=".45" className="tva-ker-stop is-warm" stopOpacity=".28" />
                    <stop offset="1" className="tva-ker-stop is-warm" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="tva-ker-hot">
                    <stop offset="0" className="tva-ker-stop is-hot" stopOpacity=".9" />
                    <stop offset=".4" className="tva-ker-stop is-warm" stopOpacity=".45" />
                    <stop offset="1" className="tva-ker-stop is-warm" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="tva-ker-far">
                    <stop offset="0" className="tva-ker-stop is-far" stopOpacity=".28" />
                    <stop offset="1" className="tva-ker-stop is-far" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="tva-ker-vig" cx=".5" cy=".6" r=".75">
                    <stop offset=".4" className="tva-stop-ink" stopOpacity="0" />
                    <stop offset="1" className="tva-stop-ink" stopOpacity=".65" />
                </radialGradient>
            </defs>
            <rect className="tva-ker-wall" x="-10" y="-10" width="1620" height="580" />
            {STONES.map((s, i) => (
                <g key={i}>
                    <path className={`tva-ker-stone is-${s.tone}`} d={stonePath(s.x, s.y, s.w, s.h, i)} />
                    {s.moss && <path className="tva-ker-moss" d={`M${s.x + 10} ${s.y + s.h - 4} q${s.w * 0.2} -14 ${s.w * 0.45} -6 q${s.w * 0.15} -10 ${s.w * 0.3} 2 Z`} />}
                </g>
            ))}
            <rect x="-10" y="-10" width="1620" height="580" fill="url(#tva-ker-vig)" />
            {TORCHES.map((t, i) => <circle key={i} className="tva-ker-pool" cx={t.x} cy={t.y - 60} r="200" fill="url(#tva-ker-light)" style={v({ '--k': i })} />)}
            <Archway />
            <g transform={at(600, 200)}><SleepyBat /></g>
            {/* The beams the chains hang from, with cobwebs in the corners. */}
            <rect className="tva-ker-beam" x="-10" y="208" width="528" height="30" />
            <rect className="tva-ker-beam" x="1082" y="208" width="528" height="30" />
            <path className="tva-ker-grain" d="M20 218 h160 M260 228 h200 M1110 220 h180 M1360 228 h200" />
            <g transform={at(0, 238)}><Cobweb s={1.2} /></g>
            <g transform={at(1600, 238)}><Cobweb flip s={1.1} /></g>
            <g transform={at(516, 238)}><Cobweb flip s={0.6} /></g>
            {[[206, 110, 0, 'l'], [398, 74, 1, 'l'], [1204, 84, 2, 'r'], [1392, 118, 3, 'r']].map(([x, len, k, half]) => (
                <g key={k} transform={at(x as number, 238)}><Chain len={len as number} k={k as number} half={half as 'l' | 'r'} /></g>
            ))}
            <g transform={at(1500, 562)}><Gate /></g>
            <g transform={at(1084, 238)}><Cobweb s={0.6} /></g>
            {TORCHES.map((t, i) => (
                <g key={i}>
                    <g transform={at(t.x, t.y - 80)}>
                        <g className={`tva-flash is-${t.half}`}><circle r="150" fill="url(#tva-ker-hot)" /></g>
                    </g>
                    <g transform={at(t.x, t.y)}><Torch k={i} half={t.half} lean={t.lean} /></g>
                    {[0, 1, 2, 3, 4].map(m => (
                        <g key={m} transform={at(t.x + (m - 2) * 34, t.y - 40 + (m % 2) * 40)}>
                            <circle className="tva-ker-mote" r={1.8 + (m % 2)} style={v({ '--k': m + i * 5 })} />
                        </g>
                    ))}
                </g>
            ))}
            <Floor />
            <g transform={at(-20, 584)}><Straw /></g>
            <g transform={at(172, 560)}><MouseHole /></g>
            <g transform={at(62, 598)}><Bucket /></g>
            <g transform={at(62, 252)}><Drip fall={300} k={0} /></g>
            <g transform={at(1066, 250)}><Drip fall={312} k={1} /></g>
            <ellipse className="tva-ker-puddle" cx="1066" cy="567" rx="34" ry="6" />
            <FlyingBat cx={318} cy={292} rx={110} ry={14} t={9} k={0} half="l" />
            <FlyingBat cx={1276} cy={282} rx={120} ry={18} t={11} k={1} half="r" />
            {n > 0 && <g key={n}><Dust n={n} side={side} /></g>}
        </svg>
    );
}
