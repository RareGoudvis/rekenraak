import type { CSSProperties, ReactNode } from 'react';
import { burst, seeded, type ArenaArtProps } from './pick';

// The laboratorium: a stone lab at night. Cauldrons bubble on the floor at both ends, potion shelves glow on
// the walls, herbs hang from the beam, a brass orrery turns, an alchemy circle slowly turns on the floor and a
// tipped flask fizzles. The middle (x 500 to 1100) stays plain wall so the spells read. Animated groups never
// carry a transform attribute: a wrapper places them, so CSS and SVG transforms never fight.

const at = (x: number, y: number) => `translate(${x} ${y})`;
const v = (o: Record<string, string | number>) => o as CSSProperties;

// The wall's stones: rows above the wainscot, staggered; the middle ones faint.
const STONES = (() => {
    const r = seeded(11);
    const out: { x: number; y: number; w: number; faint: boolean; tone: number }[] = [];
    for (let row = 0, y = 2; y < 486; row++, y += 54) {
        let x = row % 2 ? -50 : -10;
        while (x < 1600) {
            const w = 96 + Math.floor(r() * 70);
            const cx = x + w / 2;
            out.push({ x, y, w, faint: cx > 470 && cx < 1130, tone: Math.floor(r() * 3) });
            x += w;
        }
    }
    return out;
})();

type Potion = 'green' | 'purple' | 'pink' | 'blue' | 'gold';
const POTIONS: Potion[] = ['green', 'purple', 'pink', 'blue', 'gold'];

// One flask, standing on (0, 0): its glass, the glowing liquid and a highlight.
function Flask({ shape, c }: { shape: 'round' | 'cone' | 'bottle' | 'vial' | 'jar'; c: Potion }) {
    const liq = `tva-lab-liq is-${c}`;
    if (shape === 'round') return (
        <g>
            <rect className="tva-lab-glass" x="-5" y="-46" width="10" height="18" rx="2" />
            <circle className="tva-lab-glass" cx="0" cy="-16" r="17" />
            <path className={liq} d="M-16 -11 A17 17 0 0 0 16 -11 Z" />
            <circle className="tva-lab-rim" cx="0" cy="-16" r="17" />
            <rect className="tva-lab-cork" x="-6" y="-53" width="12" height="9" rx="2" />
            <path className="tva-lab-shine" d="M-9 -24 Q-8 -29 -3 -30" />
        </g>
    );
    if (shape === 'cone') return (
        <g>
            <path className="tva-lab-glass" d="M-19 0 L19 0 L6 -30 L6 -44 L-6 -44 L-6 -30 Z" />
            <path className={liq} d="M-19 0 L19 0 L12 -16 L-12 -16 Z" />
            <path className="tva-lab-rim" d="M-19 0 L19 0 L6 -30 L6 -44 L-6 -44 L-6 -30 Z" />
            <path className="tva-lab-rim" d="M-9 -44 h18" />
            <path className="tva-lab-shine" d="M-8 -8 L-2 -24" />
        </g>
    );
    if (shape === 'bottle') return (
        <g>
            <rect className="tva-lab-glass" x="-11" y="-48" width="22" height="48" rx="6" />
            <rect className="tva-lab-glass" x="-5" y="-60" width="10" height="13" rx="2" />
            <rect className={liq} x="-11" y="-30" width="22" height="30" rx="6" />
            <rect className="tva-lab-rim" x="-11" y="-48" width="22" height="48" rx="6" />
            <rect className="tva-lab-cork" x="-6" y="-67" width="12" height="9" rx="2" />
            <rect className="tva-lab-label" x="-8" y="-24" width="16" height="11" rx="2" />
            <path className="tva-lab-shine" d="M-6 -42 v14" />
        </g>
    );
    if (shape === 'vial') return (
        <g>
            <rect className="tva-lab-glass" x="-6" y="-36" width="12" height="36" rx="6" />
            <rect className={liq} x="-6" y="-20" width="12" height="20" rx="6" />
            <rect className="tva-lab-rim" x="-6" y="-36" width="12" height="36" rx="6" />
            <rect className="tva-lab-cork" x="-7" y="-42" width="14" height="7" rx="2" />
        </g>
    );
    return (
        <g>
            <rect className="tva-lab-glass" x="-16" y="-38" width="32" height="38" rx="7" />
            {[[-6, -12, 0], [6, -22, 1], [-2, -28, 2]].map(([x, y, k]) => (
                <g key={k} transform={at(x, y)}><path className="tva-lab-mote is-gold" style={v({ '--k': k })} d="M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4 Z" /></g>
            ))}
            <rect className="tva-lab-rim" x="-16" y="-38" width="32" height="38" rx="7" />
            <rect className="tva-lab-lid" x="-18" y="-45" width="36" height="9" rx="3" />
        </g>
    );
}

type Item = { x: number; shape: 'round' | 'cone' | 'bottle' | 'vial' | 'jar'; c: Potion } | { x: number; book: true } | { x: number; glass: true };

// A wall shelf with its flasks: each flask glows, and wobbles and clinks on a hit.
function Shelf({ x0, x1, y, items, half }: { x0: number; x1: number; y: number; items: Item[]; half: 'l' | 'r' }) {
    return (
        <g>
            {items.map((it, i) => 'c' in it && <circle key={`g${i}`} className="tva-lab-flaskglow" cx={it.x} cy={y - 22} r="34" fill={`url(#tva-lab-g-${it.c})`} style={v({ '--k': i })} />)}
            <path className="tva-lab-bracket" d={`M${x0 + 18} ${y + 10} q0 22 22 26 M${x1 - 18} ${y + 10} q0 22 -22 26`} />
            {items.map((it, i) => (
                <g key={i} transform={at(it.x, y)}>
                    <g className={`tva-wob is-${half}`} style={v({ '--wob': `${6 + (i % 3) * 3}deg`, '--d': `${i * 40}ms` })}>
                        {'c' in it ? <Flask shape={it.shape} c={it.c} />
                            : 'book' in it ? <Books /> : <Hourglass />}
                    </g>
                </g>
            ))}
            <rect className="tva-lab-plank" x={x0} y={y} width={x1 - x0} height="12" rx="3" />
        </g>
    );
}

function Books() {
    return (
        <g>
            <rect className="tva-lab-book is-a" x="-22" y="-12" width="46" height="12" rx="2" />
            <rect className="tva-lab-book is-b" x="-18" y="-23" width="40" height="11" rx="2" />
            <rect className="tva-lab-book is-c" x="-6" y="-62" width="12" height="39" rx="2" />
            <path className="tva-lab-line" d="M-14 -6 h26 M-10 -17 h22" />
        </g>
    );
}

// An hourglass whose sand runs down, over and over.
function Hourglass() {
    return (
        <g>
            <rect className="tva-lab-wood" x="-17" y="-6" width="34" height="6" rx="2" />
            <rect className="tva-lab-wood" x="-17" y="-58" width="34" height="6" rx="2" />
            <path className="tva-lab-glass" d="M-12 -52 Q-12 -36 0 -29 Q12 -36 12 -52 Z M-12 -6 Q-12 -22 0 -29 Q12 -22 12 -6 Z" />
            <g transform={at(0, -29)}><path className="tva-lab-sand is-top" d="M-10 -21 Q-10 -9 0 -2 Q10 -9 10 -21 Z" /></g>
            <g transform={at(0, -6)}><path className="tva-lab-sand is-bottom" d="M-11 0 Q0 -18 11 0 Z" /></g>
            <path className="tva-lab-sandrun" d="M0 -29 V-8" />
            <path className="tva-lab-rim" d="M-12 -52 Q-12 -36 0 -29 Q12 -36 12 -52 M-12 -6 Q-12 -22 0 -29 Q12 -22 12 -6" />
            <path className="tva-lab-post" d="M-15 -52 V-6 M15 -52 V-6" />
        </g>
    );
}

// A bundle of herbs hanging from the beam at (0, 0): it sways, and swings on a hit.
function Herbs({ kind, len, k, half }: { kind: 0 | 1 | 2; len: number; k: number; half: 'l' | 'r' }) {
    const leaves = kind === 2
        ? [0, 1, 2, 3, 4].map(i => <ellipse key={i} className="tva-lab-chili" cx={i % 2 ? 5 : -5} cy={len + 4 + i * 11} rx="5" ry="8" />)
        : [-14, -7, 0, 7, 14].map((dx, i) => (
            <path key={i} className={`tva-lab-leaf is-${kind}`} d={`M0 ${len} Q${dx * 0.6} ${len + 18} ${dx} ${len + 30 + (i % 2) * 8} Q${dx * 1.3} ${len + 14} 0 ${len}`} />
        ));
    return (
        <g className={`tva-wob is-${half}`} style={v({ '--wob': '14deg', '--d': `${k * 50}ms` })}>
            <g className="tva-lab-sway" style={v({ '--k': k })}>
                <path className="tva-lab-string" d={`M0 0 V${kind === 2 ? len + 52 : len + 4}`} />
                {leaves}
                {kind !== 2 && <rect className="tva-lab-tie" x="-6" y={len - 3} width="12" height="7" rx="2" />}
            </g>
        </g>
    );
}

// A cauldron on legs over a small fire, its rim at (0, 0). Bubbles rise, coloured steam drifts up.
function Cauldron({ r, c, half, n, hit }: { r: number; c: 'green' | 'purple'; half: 'l' | 'r'; n: number; hit: number }) {
    const h = r * 0.9;
    const bubbles = [-0.55, -0.2, 0.15, 0.45, -0.35, 0.3];
    return (
        <g>
            <ellipse className="tva-lab-potglow" cx="0" cy={-r * 0.4} rx={r * 1.5} ry={r * 1.2} fill={`url(#tva-lab-g-${c})`} />
            {/* The steam: puffs that rise, swell and fade. */}
            {[0, 1, 2, 3, 4].map(k => (
                <g key={k} transform={at((k - 2) * r * 0.18, -6)}>
                    <circle className={`tva-lab-steam is-${c}`} r={r * 0.2 + k * 2} style={v({ '--k': k, '--sx': `${(k % 2 ? 1 : -1) * (14 + k * 6)}px`, '--sh': `${-r * 2.1}px` })} />
                </g>
            ))}
            {/* The fire under the pot. */}
            {[-0.42, 0, 0.42].map((f, k) => (
                <g key={k} transform={`${at(f * r, h + r * 0.34)} scale(${(r / 96).toFixed(2)})`}>
                    <g className="tva-lab-fire" style={v({ '--k': k })}>
                        <path className="tva-lab-flame-out" d="M0 -34 C9 -20 14 -10 10 -3 C7 2 -7 2 -10 -3 C-14 -10 -9 -20 0 -34 Z" />
                        <path className="tva-lab-flame-in" d="M0 -20 C5 -12 7 -6 5 -2 C3 1 -3 1 -5 -2 C-7 -6 -5 -12 0 -20 Z" />
                    </g>
                </g>
            ))}
            <path className="tva-lab-logs" d={`M${-r * 0.6} ${h + r * 0.36} L${r * 0.6} ${h + r * 0.28} M${-r * 0.55} ${h + r * 0.26} L${r * 0.6} ${h + r * 0.36}`} />
            <path className="tva-lab-iron" d={`M${-r * 0.62} ${h * 0.8} L${-r * 0.78} ${h + r * 0.38} M${r * 0.62} ${h * 0.8} L${r * 0.78} ${h + r * 0.38} M0 ${h} V${h + r * 0.3}`} />
            <path className="tva-lab-pot" d={`M${-r} 0 C${-r * 1.12} ${h * 0.5} ${-r * 0.8} ${h} 0 ${h} C${r * 0.8} ${h} ${r * 1.12} ${h * 0.5} ${r} 0 Z`} />
            <path className="tva-lab-potshine" d={`M${-r * 0.78} ${h * 0.25} Q${-r * 0.74} ${h * 0.62} ${-r * 0.42} ${h * 0.78}`} />
            {/* The brew surges on a hit. */}
            <g className={`tva-surge is-${half}`}>
                <ellipse className={`tva-lab-brew is-${c}`} cx="0" cy="0" rx={r * 0.9} ry={r * 0.16} />
                <ellipse className="tva-lab-brewshine" cx={-r * 0.3} cy={-r * 0.03} rx={r * 0.3} ry={r * 0.05} />
            </g>
            {bubbles.map((b, k) => (
                <g key={k} transform={at(b * r, 0)}>
                    <circle className={`tva-lab-bubble is-${c}`} r={4 + (k % 3) * 2.5} style={v({ '--k': k, '--bh': `${-r * 0.7 - (k % 3) * 14}px` })} />
                </g>
            ))}
            <ellipse className="tva-lab-rimring" cx="0" cy="0" rx={r} ry={r * 0.2} />
            {/* A wooden spoon that stirs. */}
            <g transform={at(r * 0.35, -r * 0.05)}>
                <g className="tva-lab-stir">
                    <path className="tva-lab-spoon" d={`M0 0 L${r * 0.45} ${-r * 0.85}`} />
                    <ellipse className="tva-lab-spoonbowl" cx={r * 0.47} cy={-r * 0.88} rx="6" ry="9" transform={`rotate(28 ${r * 0.47} ${-r * 0.88})`} />
                </g>
            </g>
            {/* A hit: the brew splashes out over the rim. */}
            {n > 0 && (
                <g key={n}>
                    {Array.from({ length: hit }, (_, k) => {
                        const dir = (k % 2 ? 1 : -1) * (0.3 + (k / hit) * 0.9);
                        return (
                            <g key={k} transform={at(dir * r * 0.5, -4)}>
                                <g className="tva-fly-x" style={v({ '--dx': `${dir * r * 1.1}px`, '--k': k })}>
                                    <g className="tva-fly-y" style={v({ '--up': `${-r * (0.9 + (k % 3) * 0.35)}px`, '--down': `${r * 1.22}px`, '--k': k })}>
                                        <ellipse className={`tva-lab-drop is-${c}`} rx={6 + (k % 3) * 2} ry={9 + (k % 3) * 2} />
                                    </g>
                                </g>
                            </g>
                        );
                    })}
                    <g className="tva-pop"><ellipse className={`tva-lab-splash is-${c}`} rx={r * 0.95} ry={r * 0.32} /></g>
                </g>
            )}
        </g>
    );
}

// The brass orrery on its stand, the sphere's centre at (0, 0): planets circle the sun, the meridian turns.
function Orrery() {
    const orbits = [[34, 11, 5, 'is-a', 7], [52, 17, 7, 'is-b', 11], [72, 24, 6, 'is-c', 17]] as const;
    return (
        <g>
            <circle className="tva-lab-sunglow" r="62" fill="url(#tva-lab-g-gold)" />
            <path className="tva-lab-brass" d="M-12 74 L12 74 L9 150 L-9 150 Z" />
            <path className="tva-lab-brass" d="M-34 170 L34 170 L22 150 L-22 150 Z" />
            <rect className="tva-lab-brass-dk" x="-40" y="166" width="80" height="12" rx="4" />
            <path className="tva-lab-arm" d="M0 74 V60 M-58 52 Q0 92 58 52" />
            <g className="tva-wob is-r" style={v({ '--wob': '7deg' })}>
                <g className="tva-lab-meridian"><ellipse className="tva-lab-ring" rx="80" ry="80" /><path className="tva-lab-ticks" d="M0 -80 v10 M0 80 v-10 M-80 0 h10 M80 0 h-10 M57 -57 l-7 7 M-57 57 l7 -7 M-57 -57 l7 7 M57 57 l-7 -7" /></g>
                <g transform="rotate(-16)">
                    {orbits.map(([rx, ry, , , ], i) => <ellipse key={i} className="tva-lab-orbit" rx={rx} ry={ry} />)}
                    <circle className="tva-lab-sun" r="15" />
                    <path className="tva-lab-rays" d="M0 -21 v-6 M0 21 v6 M-21 0 h-6 M21 0 h6 M15 -15 l4 -4 M-15 15 l-4 4 M-15 -15 l-4 -4 M15 15 l4 4" />
                    {orbits.map(([rx, ry, pr, cls, t], i) => (
                        <g key={i} className="tva-orb-x" style={v({ '--rx': `${rx}px`, '--t': `${t}s` })}>
                            <g className="tva-orb-y" style={v({ '--ry': `${ry}px`, '--t': `${t}s` })}>
                                <circle className={`tva-lab-planet ${cls}`} r={pr} />
                                {i === 1 && <ellipse className="tva-lab-planetring" rx={pr + 6} ry="3" />}
                            </g>
                        </g>
                    ))}
                </g>
            </g>
        </g>
    );
}

// A flask tipped over on the floor: a glowing puddle and sparks that spurt from its neck.
function StrayFlask({ n, many }: { n: number; many: number }) {
    const sparks = (count: number, big: boolean) => Array.from({ length: count }, (_, k) => {
        const a = -Math.PI / 2 - 0.9 + (k / Math.max(1, count - 1)) * 1.8;
        const d = big ? 90 + (k % 3) * 30 : 38 + (k % 3) * 12;
        return (
            <g key={k} className={big ? 'tva-spark-once' : 'tva-lab-spark'} style={v({ '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d}px`, '--k': k })}>
                <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" />
            </g>
        );
    });
    return (
        <g>
            <ellipse className="tva-lab-puddleglow" cx="30" cy="8" rx="80" ry="22" fill="url(#tva-lab-g-pink)" />
            <ellipse className="tva-lab-puddle" cx="34" cy="8" rx="44" ry="8" />
            <g transform="rotate(-72)"><Flask shape="round" c="pink" /></g>
            <g transform={at(46, -14)}>
                {sparks(6, false)}
                {n > 0 && <g key={n}>{sparks(many, true)}</g>}
            </g>
        </g>
    );
}

// The round window high in the back wall: a night sky with a moon and twinkling stars.
function Window() {
    return (
        <g transform={at(800, 96)}>
            <circle className="tva-lab-sky" r="84" />
            <circle className="tva-lab-moon" cx="30" cy="-24" r="24" />
            <circle className="tva-lab-sky" cx="40" cy="-32" r="20" />
            {[[-40, -30, 0], [-12, -56, 1], [-52, 18, 2], [12, 30, 3], [52, 34, 4], [-20, 2, 5]].map(([x, y, k]) => (
                <g key={k} transform={at(x, y)}><path className="tva-twinkle" style={v({ '--k': k })} d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" /></g>
            ))}
            <path className="tva-lab-mullion" d="M0 -84 V84 M-84 0 H84" />
            <circle className="tva-lab-winframe is-ink" r="84" />
            <circle className="tva-lab-winframe" r="84" />
            <circle className="tva-lab-winframe is-in" r="34" />
        </g>
    );
}

// The alchemy circle on the floor: drawn flat, squashed into the floor, turning slowly; it flares on a hit.
function Circle({ n }: { n: number }) {
    const tri = (r: number, rot: number) => [0, 1, 2].map(i => {
        const a = rot + (i / 3) * Math.PI * 2;
        return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
    }).join(' L');
    return (
        <g>
            <ellipse className="tva-lab-circleglow" cx="800" cy="630" rx="400" ry="74" fill="url(#tva-lab-g-green)" />
            <g transform={at(800, 630)}>
                <g className="tva-flash"><ellipse className="tva-lab-flare" rx="420" ry="86" fill="url(#tva-lab-g-green)" /></g>
                {n > 0 && (
                    <g key={n}>
                        <g className="tva-ring-once"><ellipse className="tva-lab-shock" rx="330" ry="53" /></g>
                        <g className="tva-ring-once is-late"><ellipse className="tva-lab-shock" rx="296" ry="47" /></g>
                    </g>
                )}
            </g>
            <g transform="translate(800 630) scale(1 0.16)">
                <g className="tva-lab-turn">
                    <circle className="tva-lab-rune is-wide" r="330" />
                    <circle className="tva-lab-rune" r="296" />
                    <path className="tva-lab-rune" d={`M${tri(296, -Math.PI / 2)} Z M${tri(296, Math.PI / 2)} Z`} />
                    <circle className="tva-lab-rune" r="118" />
                    <circle className="tva-lab-rune is-dot" r="40" />
                    {Array.from({ length: 12 }, (_, i) => {
                        const a = (i / 12) * Math.PI * 2;
                        const x = Math.cos(a) * 313, y = Math.sin(a) * 313;
                        return <circle key={i} className="tva-lab-rune is-glyph" cx={x.toFixed(1)} cy={y.toFixed(1)} r={i % 3 ? 6 : 10} />;
                    })}
                </g>
            </g>
            {/* Magic motes that drift up from the circle. */}
            {[[560, 0], [650, 1], [760, 2], [860, 3], [960, 4], [1050, 5], [700, 6], [910, 7]].map(([x, k]) => (
                <g key={k} transform={at(x, 618 + (k % 3) * 8)}>
                    <circle className="tva-lab-motes" r={2.5 + (k % 2)} style={v({ '--k': k })} />
                </g>
            ))}
        </g>
    );
}

function Wainscot() {
    return (
        <g>
            <rect className="tva-lab-panel" x="-10" y="490" width="1620" height="70" />
            {Array.from({ length: 16 }, (_, i) => <rect key={i} className="tva-lab-panel-in" x={i * 100 + 12} y="502" width="76" height="46" rx="4" />)}
            <rect className="tva-lab-rail" x="-10" y="482" width="1620" height="12" rx="3" />
        </g>
    );
}

function Floor() {
    return (
        <g>
            <rect className="tva-lab-floor" x="-10" y="560" width="1620" height="150" />
            <path className="tva-lab-seam" d="M-10 588 H1610 M-10 622 H1610 M-10 662 H1610" />
            <path className="tva-lab-seam" d={[...Array(9)].map((_, i) => `M${i * 190 + 40} 560 v28 M${i * 190 + 130} 588 v34 M${i * 190 + 10} 622 v40 M${i * 190 + 100} 662 v40`).join(' ')} />
            <path className="tva-lab-floorline" d="M-10 560 H1610" />
        </g>
    );
}

function Beam() {
    return (
        <g>
            <rect className="tva-lab-beam" x="-10" y="228" width="1620" height="28" />
            <path className="tva-lab-grain" d="M40 238 h220 M380 246 h300 M760 237 h180 M1040 247 h260 M1380 239 h190" />
            {[60, 300, 560, 820, 1080, 1340, 1560].map(x => <circle key={x} className="tva-lab-nail" cx={x} cy="242" r="3.5" />)}
        </g>
    );
}

export default function Lab({ n, side }: ArenaArtProps) {
    const shelfL: Item[] = [{ x: 34, shape: 'round', c: 'green' }, { x: 74, shape: 'vial', c: 'blue' }, { x: 106, shape: 'cone', c: 'purple' }, { x: 150, shape: 'jar', c: 'gold' }, { x: 192, shape: 'bottle', c: 'pink' }];
    const shelfL2: Item[] = [{ x: 40, book: true }, { x: 92, shape: 'bottle', c: 'blue' }, { x: 130, shape: 'round', c: 'gold' }, { x: 170, shape: 'vial', c: 'green' }];
    const shelfR: Item[] = [{ x: 1418, shape: 'bottle', c: 'green' }, { x: 1458, shape: 'round', c: 'purple' }, { x: 1494, shape: 'vial', c: 'pink' }, { x: 1526, shape: 'cone', c: 'blue' }, { x: 1570, glass: true }];
    return (
        <svg className="tva-svg" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMax slice">
            <defs>
                {POTIONS.map(c => (
                    <radialGradient key={c} id={`tva-lab-g-${c}`}>
                        <stop offset="0" className={`tva-lab-stop is-${c}`} stopOpacity=".75" />
                        <stop offset=".5" className={`tva-lab-stop is-${c}`} stopOpacity=".25" />
                        <stop offset="1" className={`tva-lab-stop is-${c}`} stopOpacity="0" />
                    </radialGradient>
                ))}
                <radialGradient id="tva-lab-vig" cx=".5" cy=".62" r=".72">
                    <stop offset=".45" className="tva-stop-ink" stopOpacity="0" />
                    <stop offset="1" className="tva-stop-ink" stopOpacity=".6" />
                </radialGradient>
                <linearGradient id="tva-lab-moonbeam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" className="tva-lab-stop is-moon" stopOpacity=".16" />
                    <stop offset="1" className="tva-lab-stop is-moon" stopOpacity="0" />
                </linearGradient>
            </defs>
            <rect className="tva-lab-wall" x="-10" y="-10" width="1620" height="580" />
            {STONES.map((s, i) => <rect key={i} className={`tva-lab-stone is-${s.tone}${s.faint ? ' is-faint' : ''}`} x={s.x + 3} y={s.y} width={s.w - 6} height="48" rx="8" />)}
            <rect x="-10" y="-10" width="1620" height="580" fill="url(#tva-lab-vig)" />
            <Window />
            <path className="tva-lab-moonbeam" d="M740 140 L860 140 L1010 560 L590 560 Z" />
            <Beam />
            <Wainscot />
            {/* Left wall: two shelves over the big cauldron; herbs from the beam. */}
            <Shelf x0={10} x1={222} y={336} items={shelfL} half="l" />
            <Shelf x0={10} x1={200} y={414} items={shelfL2} half="l" />
            {[[404, 0, 44], [448, 2, 22], [492, 1, 34]].map(([x, kind, len], k) => (
                <g key={k} transform={at(x, 256)}><Herbs kind={kind as 0 | 1 | 2} len={len} k={k} half="l" /></g>
            ))}
            {/* Right wall: a shelf with an hourglass, a small shelf, herbs, the orrery. */}
            <Shelf x0={1396} x1={1592} y={326} items={shelfR} half="r" />
            {[[1108, 0, 36], [1150, 2, 22], [1196, 1, 42]].map(([x, kind, len], k) => (
                <g key={k} transform={at(x, 256)}><Herbs kind={kind as 0 | 1 | 2} len={len} k={k + 5} half="r" /></g>
            ))}
            <Floor />
            <Circle n={n} />
            <ellipse className="tva-shadow" cx="1500" cy="580" rx="70" ry="10" />
            <g transform={`${at(1500, 420)} scale(.9)`}><Orrery /></g>
            <ellipse className="tva-shadow" cx="122" cy="574" rx="120" ry="13" />
            <ellipse className="tva-shadow" cx="1176" cy="572" rx="70" ry="9" />
            <g transform={at(122, 566 - 1.28 * 96)}><Cauldron r={96} c="green" half="l" n={n} hit={burst(side, 'left', 14, 5)} /></g>
            <g transform={at(1176, 566 - 1.28 * 54)}><Cauldron r={54} c="purple" half="r" n={n} hit={burst(side, 'right', 10, 4)} /></g>
            <g transform={at(438, 546)}><StrayFlask n={n} many={burst(side, 'left', 12, 6)} /></g>
            <Fizz n={n} />
        </svg>
    );
}

// A short sparkle in the air on the hit side: the magic in the room answers the blast.
function Fizz({ n }: { n: number }): ReactNode {
    if (!n) return null;
    return (
        <g key={n}>
            {[[180, 250], [430, 330], [1220, 260], [1440, 340], [90, 420], [1530, 450]].map(([x, y], k) => (
                <g key={k} transform={at(x, y)} className={`is-${x < 800 ? 'l' : 'r'}`}>
                    <path className="tva-glint-once" style={v({ '--k': k })} d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z" />
                </g>
            ))}
        </g>
    );
}
