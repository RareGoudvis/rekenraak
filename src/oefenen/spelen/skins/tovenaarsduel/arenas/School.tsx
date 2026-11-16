import type { CSSProperties } from 'react';
import { burst, seeded, type ArenaArtProps } from './pick';

// The tovenaarsschool: a great hall at night. Tall arched windows with the moon and stars, floating candles
// that bob, long banners in blue and orange (an owl, a star), and stands full of owl and imp pupils in the two
// house scarves who bounce, wave and cheer. The middle is plain wall and the high table (calm, so the spells
// read). Animated groups never carry a transform attribute: a wrapper places them.

const at = (x: number, y: number) => `translate(${x} ${y})`;
const v = (o: Record<string, string | number>) => o as CSSProperties;
const star = (r: number) => `M0 ${-r} L${r * 0.25} ${-r * 0.25} L${r} 0 L${r * 0.25} ${r * 0.25} L0 ${r} L${-r * 0.25} ${r * 0.25} L${-r} 0 L${-r * 0.25} ${-r * 0.25} Z`;
const star5 = (r: number) => Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    return `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`;
}).join(' ') + ' Z';

// The wall's big ashlar blocks.
const BLOCKS = (() => {
    const r = seeded(5);
    const out: { x: number; y: number; w: number }[] = [];
    for (let row = 0, y = 0; y < 560; row++, y += 70) {
        let x = row % 2 ? -90 : -20;
        while (x < 1620) {
            const w = 150 + Math.floor(r() * 60);
            out.push({ x, y, w });
            x += w;
        }
    }
    return out;
})();

// A tall arched window, its foot centred on (0, 0): night sky, moon, stars, the odd shooting star.
function Window({ w, h, id, moon, k }: { w: number; h: number; id: string; moon?: boolean; k: number }) {
    const r = w / 2;
    const d = `M${-r} 0 V${-h + r} A${r} ${r} 0 0 1 ${r} ${-h + r} V0 Z`;
    const rs = seeded(40 + k);
    return (
        <g>
            <clipPath id={id}><path d={d} /></clipPath>
            <path className="tva-sch-sky" d={d} />
            <g clipPath={`url(#${id})`}>
                <rect className="tva-sch-skylow" x={-r} y={-h * 0.4} width={w} height={h * 0.4} />
                {moon && (
                    <g transform={at(r * 0.25, -h + r * 1.1)}>
                        <circle className="tva-sch-moonglow" r={r * 1.1} fill="url(#tva-sch-moon)" />
                        <circle className="tva-sch-moon" r={r * 0.36} />
                        <circle className="tva-sch-crater" cx={-r * 0.1} cy={r * 0.08} r={r * 0.08} />
                        <circle className="tva-sch-crater" cx={r * 0.12} cy={-r * 0.12} r={r * 0.05} />
                    </g>
                )}
                {Array.from({ length: 7 }, (_, i) => (
                    <g key={i} transform={at((rs() - 0.5) * w * 0.9, -h * 0.25 - rs() * h * 0.65)}>
                        <path className="tva-twinkle" style={v({ '--k': i + k * 3 })} d={star(3 + (i % 3) * 1.5)} />
                    </g>
                ))}
                <g transform={at(-r, -h * 0.85)}>
                    <g className="tva-sch-shoot" style={v({ '--k': k, '--sx': `${w * 1.4}px`, '--sy': `${h * 0.3}px` })}>
                        <path className="tva-sch-trail" d="M0 0 L-34 -8" />
                        <path className="tva-sch-shootstar" d={star(5)} />
                    </g>
                </g>
            </g>
            <path className="tva-sch-lead" d={`M0 0 V${-h} M${-r} ${-h * 0.33} H${r} M${-r} ${-h * 0.62} H${r}`} clipPath={`url(#${id})`} />
            <path className="tva-sch-frame is-ink" d={d} />
            <path className="tva-sch-frame" d={d} />
            <rect className="tva-sch-sill" x={-r - 12} y="-4" width={w + 24} height="14" rx="3" />
        </g>
    );
}

// A floating candle, its middle at (0, 0): it bobs, its flame flickers; a hit sways it and makes it flare.
function Candle({ h, k, half }: { h: number; k: number; half: 'l' | 'r' }) {
    return (
        <g className="tva-sch-bob" style={v({ '--k': k })}>
            <circle className="tva-sch-candleglow" cy={-h / 2 - 14} r="38" fill="url(#tva-sch-glow)" style={v({ '--k': k })} />
            <g className={`tva-wob is-${half}`} style={v({ '--wob': '14deg', '--d': `${(k % 5) * 40}ms` })}>
                <rect className="tva-sch-wax" x="-6" y={-h / 2} width="12" height={h} rx="3" />
                <path className="tva-sch-drip" d={`M-6 ${-h / 2 + 4} q2 8 0 12 M5 ${-h / 2 + 3} q-2 6 0 8`} />
                <path className="tva-sch-wick" d={`M0 ${-h / 2} v-5`} />
                <g transform={at(0, -h / 2 - 4)}>
                    <g className={`tva-gust is-${half}`} style={v({ '--lean': half === 'l' ? '26deg' : '-26deg', '--d': `${(k % 4) * 30}ms` })}>
                        <g className="tva-sch-flame" style={v({ '--k': k })}>
                            <path className="tva-sch-flame-out" d="M0 -22 C6 -14 9 -7 6 -2 C4 1 -4 1 -6 -2 C-9 -7 -6 -14 0 -22 Z" />
                            <path className="tva-sch-flame-in" d="M0 -11 C3 -7 4 -4 3 -1 C2 0 -2 0 -3 -1 C-4 -4 -3 -7 0 -11 Z" />
                        </g>
                    </g>
                </g>
            </g>
        </g>
    );
}

// A long banner hanging from (0, 0): a house colour, a gold border and an emblem. It ripples, and flaps on a hit.
function Banner({ len, w, house, emblem, k, half }: { len: number; w: number; house: 'blue' | 'orange'; emblem: 'owl' | 'star'; k: number; half: 'l' | 'r' }) {
    const hw = w / 2;
    return (
        <g>
            <rect className="tva-sch-rod" x={-hw - 12} y="-6" width={w + 24} height="10" rx="5" />
            <g className={`tva-flap is-${half}`} style={v({ '--d': `${k * 60}ms` })}>
                <g className="tva-sch-ripple" style={v({ '--k': k })}>
                    <path className={`tva-sch-banner is-${house}`} d={`M${-hw} 0 H${hw} V${len} L0 ${len - 26} L${-hw} ${len} Z`} />
                    <path className="tva-sch-trim" d={`M${-hw + 8} 6 V${len - 14} L0 ${len - 36} L${hw - 8} ${len - 14} V6`} />
                    <g transform={at(0, len * 0.42)}>
                        <circle className="tva-sch-shield" r={hw * 0.62} />
                        {emblem === 'star'
                            ? <path className="tva-sch-emblem" d={star5(hw * 0.44)} />
                            : (
                                <g>
                                    <path className="tva-sch-emblem" d={`M${-hw * 0.38} ${hw * 0.36} Q${-hw * 0.46} ${-hw * 0.2} ${-hw * 0.3} ${-hw * 0.38} L${-hw * 0.2} ${-hw * 0.2} Q0 ${-hw * 0.3} ${hw * 0.2} ${-hw * 0.2} L${hw * 0.3} ${-hw * 0.38} Q${hw * 0.46} ${-hw * 0.2} ${hw * 0.38} ${hw * 0.36} Q0 ${hw * 0.5} ${-hw * 0.38} ${hw * 0.36} Z`} />
                                    <circle className="tva-sch-owleye" cx={-hw * 0.15} cy={-hw * 0.04} r={hw * 0.13} />
                                    <circle className="tva-sch-owleye" cx={hw * 0.15} cy={-hw * 0.04} r={hw * 0.13} />
                                    <path className="tva-sch-beak" d={`M${-hw * 0.06} ${hw * 0.08} L0 ${hw * 0.2} L${hw * 0.06} ${hw * 0.08} Z`} />
                                </g>
                            )}
                    </g>
                    {[0, 1, 2].map(i => <path key={i} className="tva-sch-tassel" d={`M${-hw + 6 + i * (hw - 6)} ${len - 2 - (i === 1 ? 24 : 0)} v14`} />)}
                </g>
            </g>
        </g>
    );
}

type Pupil = 'owl' | 'imp';

// One pupil in the stands, sitting on (0, 0), in a house scarf: it bounces and waves; a hit makes it jump.
function Student({ kind, house, k, half, flag }: { kind: Pupil; house: 'blue' | 'orange'; k: number; half: 'l' | 'r'; flag: boolean }) {
    const tone = k % 3;
    const arm = (
        <g transform={at(15, -22)}>
            <g className={`tva-sch-wave${flag ? ' is-flag' : ''}`} style={v({ '--k': k })}>
                {flag ? (
                    <g>
                        <path className="tva-sch-stick" d="M0 0 L8 -34" />
                        <path className={`tva-sch-pennant is-${house}`} d="M8 -34 L32 -26 L6 -18 Z" />
                    </g>
                ) : kind === 'owl'
                    ? <path className={`tva-sch-wing is-${tone}`} d="M-2 4 Q10 -10 14 -26 Q4 -18 -6 -4 Z" />
                    : <path className="tva-sch-imparm" d="M0 0 Q6 -12 10 -22" />}
                {!flag && kind === 'imp' && <circle className={`tva-sch-imp is-${tone}`} cx="10" cy="-24" r="5" />}
            </g>
        </g>
    );
    return (
        <g className={`tva-jolt is-${half}`} style={v({ '--jump': '22px', '--d': `${(k % 6) * 35}ms` })}>
            <g className="tva-sch-bounce" style={v({ '--k': k })}>
                {kind === 'owl' ? (
                    <g>
                        <path className={`tva-sch-owl is-${tone}`} d="M-18 0 Q-22 -26 -14 -40 L-16 -52 L-6 -44 Q0 -46 6 -44 L16 -52 L14 -40 Q22 -26 18 0 Z" />
                        <ellipse className="tva-sch-belly" cx="0" cy="-12" rx="11" ry="12" />
                        <circle className="tva-sch-eyewhite" cx="-7" cy="-34" r="7" />
                        <circle className="tva-sch-eyewhite" cx="7" cy="-34" r="7" />
                        <g className="tva-sch-blink" style={v({ '--k': k })}>
                            <circle className="tva-sch-pupil" cx="-6" cy="-34" r="3.4" />
                            <circle className="tva-sch-pupil" cx="6" cy="-34" r="3.4" />
                        </g>
                        <path className="tva-sch-beak" d="M-3 -28 L0 -22 L3 -28 Z" />
                    </g>
                ) : (
                    <g>
                        <path className={`tva-sch-imp is-${tone}`} d="M-16 0 Q-20 -30 0 -36 Q20 -30 16 0 Z" />
                        <path className={`tva-sch-imp is-${tone}`} d="M-14 -24 L-28 -34 L-12 -32 Z M14 -24 L28 -34 L12 -32 Z" />
                        <path className="tva-sch-horn" d="M-7 -34 L-9 -44 L-3 -36 Z M7 -34 L9 -44 L3 -36 Z" />
                        <circle className="tva-sch-eyewhite" cx="-6" cy="-24" r="5" />
                        <circle className="tva-sch-eyewhite" cx="6" cy="-24" r="5" />
                        <g className="tva-sch-blink" style={v({ '--k': k })}>
                            <circle className="tva-sch-pupil" cx="-5" cy="-24" r="2.6" />
                            <circle className="tva-sch-pupil" cx="5" cy="-24" r="2.6" />
                        </g>
                        <path className="tva-sch-grin" d="M-7 -15 Q0 -8 7 -15 Z" />
                    </g>
                )}
                <path className={`tva-sch-scarf is-${house}`} d={kind === 'owl' ? 'M-15 -24 Q0 -18 15 -24 L15 -18 Q0 -12 -15 -18 Z' : 'M-15 -14 Q0 -8 15 -14 L15 -8 Q0 -2 -15 -8 Z'} />
                <path className={`tva-sch-scarf is-${house}`} d={kind === 'owl' ? 'M-10 -20 L-14 -6 L-7 -6 L-5 -19 Z' : 'M-10 -10 L-13 2 L-6 2 L-5 -9 Z'} />
                {arm}
            </g>
        </g>
    );
}

// The stands at one end of the hall: three benches stepping up, full of pupils of one house.
function Stand({ x0, house, half, n, side }: { x0: number; house: 'blue' | 'orange'; half: 'l' | 'r'; n: number; side: ArenaArtProps['side'] }) {
    const rows = [{ y: 466, off: 30 }, { y: 512, off: 6 }, { y: 558, off: 30 }];
    const r = seeded(half === 'l' ? 3 : 9);
    let k = half === 'l' ? 0 : 20;
    return (
        <g>
            {rows.map((row, ri) => (
                <g key={ri}>
                    <rect className="tva-sch-bench" x={x0} y={row.y - 2} width="216" height="12" rx="3" />
                    <rect className="tva-sch-benchfront" x={x0 + 4} y={row.y + 10} width="208" height={ri === 2 ? 4 : 36} />
                    {[0, 1, 2, 3].map(c => {
                        const kind: Pupil = r() < 0.5 ? 'owl' : 'imp';
                        const kk = k++;
                        return (
                            <g key={c} transform={`${at(x0 + row.off + c * 52, row.y - 2)} scale(1.14)`}>
                                <Student kind={kind} house={house} k={kk} half={half} flag={(kk * 7 + ri) % 5 === 0} />
                            </g>
                        );
                    })}
                </g>
            ))}
            {n > 0 && (
                <g key={n}>
                    {Array.from({ length: burst(side, half === 'l' ? 'left' : 'right', 12, 4) }, (_, i) => {
                        const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * (0.15 + (i / 12) * 1.2);
                        return (
                            <g key={i} transform={at(x0 + 108, 440)} className={`is-${half}`}>
                                <g className="tva-spark-once" style={v({ '--dx': `${Math.cos(a) * 140}px`, '--dy': `${Math.sin(a) * 130}px`, '--k': i })}>
                                    <path className={`tva-sch-confetti is-${i % 3}`} d={star5(12)} />
                                </g>
                            </g>
                        );
                    })}
                </g>
            )}
        </g>
    );
}

// The high table at the back, in the middle: a long cloth with a gold hem, two goblets.
function HighTable() {
    return (
        <g>
            <rect className="tva-sch-tabletop" x="586" y="490" width="428" height="14" rx="4" />
            <path className="tva-sch-cloth" d="M592 500 H1008 V552 Q980 560 952 552 Q924 560 896 552 Q868 560 840 552 Q812 560 784 552 Q756 560 728 552 Q700 560 672 552 Q644 560 616 552 Q604 556 592 552 Z" />
            <path className="tva-sch-hem" d="M592 540 Q604 546 616 540 Q644 548 672 540 Q700 548 728 540 Q756 548 784 540 Q812 548 840 540 Q868 548 896 540 Q924 548 952 540 Q980 548 1008 540" />
            {[690, 910].map(x => (
                <g key={x} transform={at(x, 490)}>
                    <path className="tva-sch-goblet" d="M-10 -30 H10 Q10 -16 2 -12 V-4 H8 V0 H-8 V-4 H-2 V-12 Q-10 -16 -10 -30 Z" />
                </g>
            ))}
            <g transform={at(800, 490)}>
                <ellipse className="tva-sch-plate" cx="0" cy="-3" rx="36" ry="6" />
                <path className="tva-sch-pie" d="M-28 -6 Q0 -30 28 -6 Z" />
            </g>
        </g>
    );
}

function Pillar({ x }: { x: number }) {
    return (
        <g>
            <rect className="tva-sch-pillar" x={x - 24} y="-20" width="48" height="582" />
            <path className="tva-sch-flute" d={`M${x - 10} 40 V530 M${x + 10} 40 V530`} />
            <rect className="tva-sch-capital" x={x - 34} y="530" width="68" height="30" rx="4" />
            <rect className="tva-sch-capital" x={x - 32} y="150" width="64" height="18" rx="4" />
        </g>
    );
}

function Floor() {
    return (
        <g>
            <rect className="tva-sch-floor" x="-10" y="560" width="1620" height="150" />
            <path className="tva-sch-board" d="M-10 584 H1610 M-10 614 H1610 M-10 652 H1610" />
            <path className="tva-sch-board" d={[...Array(9)].map((_, i) => `M${i * 200 + 60} 560 v24 M${i * 200 + 150} 584 v30 M${i * 200 + 20} 614 v38 M${i * 200 + 110} 652 v50`).join(' ')} />
            <path className="tva-sch-carpet" d="M470 570 H1130 L1190 664 H410 Z" />
            <path className="tva-sch-carpettrim" d="M486 578 H1114 L1164 656 H436 Z" />
            <ellipse className="tva-sch-floorglow" cx="800" cy="612" rx="320" ry="40" fill="url(#tva-sch-glow)" />
            <path className="tva-sch-floorline" d="M-10 560 H1610" />
        </g>
    );
}

// The candles floating in the hall: [x, y, height]. The ones over the middle sit high (out of the spells' way).
const CANDLES = [
    [38, 286, 40], [104, 246, 34], [178, 300, 44], [246, 214, 36], [322, 236, 30], [398, 206, 40], [466, 300, 34],
    [620, 128, 36], [710, 80, 30], [800, 132, 40], [890, 84, 30], [980, 126, 36],
    [1134, 300, 34], [1202, 206, 40], [1278, 236, 30], [1354, 214, 36], [1422, 300, 44], [1496, 246, 34], [1562, 286, 40],
] as const;

export default function School({ n, side }: ArenaArtProps) {
    return (
        <svg className="tva-svg" viewBox="0 0 1600 700" preserveAspectRatio="xMidYMax slice">
            <defs>
                <radialGradient id="tva-sch-glow">
                    <stop offset="0" className="tva-sch-stop is-warm" stopOpacity=".6" />
                    <stop offset=".5" className="tva-sch-stop is-warm" stopOpacity=".18" />
                    <stop offset="1" className="tva-sch-stop is-warm" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="tva-sch-moon">
                    <stop offset=".3" className="tva-sch-stop is-moon" stopOpacity=".5" />
                    <stop offset="1" className="tva-sch-stop is-moon" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="tva-sch-vig" cx=".5" cy=".55" r=".75">
                    <stop offset=".45" className="tva-stop-ink" stopOpacity="0" />
                    <stop offset="1" className="tva-stop-ink" stopOpacity=".55" />
                </radialGradient>
            </defs>
            <rect className="tva-sch-wall" x="-10" y="-10" width="1620" height="580" />
            {BLOCKS.map((b, i) => <rect key={i} className={`tva-sch-block${b.x + b.w / 2 > 560 && b.x + b.w / 2 < 1040 ? ' is-faint' : ''}`} x={b.x + 3} y={b.y + 3} width={b.w - 6} height="64" rx="5" />)}
            <rect x="-10" y="-10" width="1620" height="580" fill="url(#tva-sch-vig)" />
            {/* The round window high over the middle, for the taller screens. */}
            <g transform={at(800, 70)}>
                <circle className="tva-sch-sky" r="62" />
                <circle className="tva-sch-moon" cx="16" cy="-12" r="20" />
                <path className="tva-sch-lead" d="M0 -62 V62 M-62 0 H62" />
                <circle className="tva-sch-roundframe is-ink" r="62" />
                <circle className="tva-sch-roundframe" r="62" />
            </g>
            <g transform={at(92, 462)}><Window w={128} h={360} id="tva-sch-w1" moon k={0} /></g>
            <g transform={at(474, 470)}><Window w={96} h={300} id="tva-sch-w2" k={1} /></g>
            <g transform={at(1126, 470)}><Window w={96} h={300} id="tva-sch-w3" k={2} /></g>
            <g transform={at(1508, 462)}><Window w={128} h={360} id="tva-sch-w4" k={3} /></g>
            <Pillar x={560} />
            <Pillar x={1040} />
            <g transform={at(186, 90)}><Banner len={250} w={64} house="orange" emblem="star" k={0} half="l" /></g>
            <g transform={at(1414, 90)}><Banner len={250} w={64} house="blue" emblem="owl" k={1} half="r" /></g>
            <g transform={at(660, -10)}><Banner len={170} w={70} house="blue" emblem="owl" k={2} half="l" /></g>
            <g transform={at(940, -10)}><Banner len={170} w={70} house="orange" emblem="star" k={3} half="r" /></g>
            <HighTable />
            <Floor />
            <Stand x0={-8} house="blue" half="l" n={n} side={side} />
            <Stand x0={1392} house="orange" half="r" n={n} side={side} />
            {CANDLES.map(([x, y, h], k) => (
                <g key={k} transform={at(x, y)}><Candle h={h} k={k} half={x < 800 ? 'l' : 'r'} /></g>
            ))}
        </svg>
    );
}
