import type { CSSProperties } from 'react';
import { machineById, type Prize } from '../machines';
import { Bulbs, ClawFrom, Face } from './kit';
import { C, DISPLAY, GLASS, fill, linePoints, mix, pivot, rectPoints } from './layout';

// The pier arcade at the seaside kermis: a wooden hall, bunting, a window on the sea with a turning Ferris wheel and
// seagulls, a candy-floss cart spinning beside the machine. A red-and-white striped machine under a circus awning;
// sea creatures inside.

const NAME = machineById('pier').name;
const SEA = mix(C.blue, 70, C.paper);
const SAND = mix(C.yellow, 45, C.paper);
const WOOD = mix(C.orange, 55, C.ink);
const GOLD = mix(C.yellow, 85, C.orange);

function Bunting({ y, n, w }: { y: number; n: number; w: number }) {
    const cols = [C.red, C.yellow, C.blue, C.paper, C.green];
    return (
        <g className="gm-bunting" style={{ '--k': y % 5 } as CSSProperties}>
            <path d={`M0 ${y} Q${w / 2} ${y + 60} ${w} ${y}`} fill="none" stroke={C.ink} strokeWidth={3} />
            {Array.from({ length: n }, (_, i) => {
                const t = (i + 0.5) / n;
                const x = t * w;
                const yy = y + 120 * t * (1 - t);
                return <path key={i} className="o gm-flag" style={{ ...fill(cols[i % cols.length]), '--k': i % 4 } as CSSProperties} d={`M${x - 18} ${yy} L${x + 18} ${yy} L${x} ${yy + 34} Z`} />;
            })}
        </g>
    );
}

export function Room() {
    return (
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden>
            {Array.from({ length: 21 }, (_, i) => <path key={i} d={`M${i * 80} 0 V900`} stroke={mix(C.ink, 60, C.orange)} strokeWidth={3} opacity={0.5} />)}
            {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={(i % 20) * 80 + 40} cy={i < 20 ? 18 : 600} r={3} style={fill(mix(C.ink, 60, C.orange))} />)}
            <Bunting y={20} n={14} w={800} />
            <g transform="translate(800 0)"><Bunting y={20} n={14} w={800} /></g>
        </svg>
    );
}

function Gull({ x, y, s = 1, flying = true }: { x: number; y: number; s?: number; flying?: boolean }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <ellipse className="o" cx={0} cy={0} rx={18} ry={11} style={fill(C.paper)} />
            <circle className="o" cx={14} cy={-8} r={8} style={fill(C.paper)} />
            <path className="o" d="M21 -8 L31 -5 L21 -3 Z" style={fill(C.orange)} />
            <circle cx={16} cy={-9} r={1.8} style={fill(C.ink)} />
            {flying
                ? <path className="o gm-gull-wing" d="M-6 -4 Q-14 -30 -30 -24 Q-18 -10 -8 4 Z" style={fill(mix(C.ink, 20, C.paper))} />
                : <><path className="o" d="M-4 -2 Q-18 -6 -24 6 Q-10 8 -2 4 Z" style={fill(mix(C.ink, 20, C.paper))} /><path d="M-2 10 V22 M6 10 V22" stroke={C.orange} strokeWidth={3} /></>}
        </g>
    );
}

export function WingL() {
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            {/* The window on the sea: the Ferris wheel turns, a seagull glides past, the waves roll. */}
            <rect className="o" x={20} y={60} width={260} height={300} rx={18} style={fill(WOOD)} />
            <svg x={36} y={76} width={228} height={268} viewBox="0 0 228 268">
                <rect width={228} height={268} style={fill(mix(C.sky, 35, C.paper))} />
                <circle cx={180} cy={50} r={22} style={fill(C.yellow)} />
                <g transform="translate(96 150)">
                    <path d="M0 0 L-40 110 M0 0 L40 110" stroke={C.ink} strokeWidth={5} />
                    <g className="gm-wheel">
                        <circle r={78} fill="none" stroke={C.ink} strokeWidth={5} />
                        {Array.from({ length: 8 }, (_, i) => <path key={i} d="M0 0 L0 -78" transform={`rotate(${i * 45})`} stroke={C.ink} strokeWidth={3} />)}
                        {Array.from({ length: 8 }, (_, i) => {
                            const a = (i * 45 * Math.PI) / 180;
                            return (
                                <g key={i} transform={`translate(${Math.sin(a) * 78} ${-Math.cos(a) * 78})`}>
                                    <g className="gm-gondola"><rect className="o" x={-9} y={0} width={18} height={14} rx={4} style={fill([C.red, C.yellow, C.blue, C.green][i % 4])} /></g>
                                </g>
                            );
                        })}
                    </g>
                    <circle className="o" r={8} style={fill(C.red)} />
                </g>
                <rect y={196} width={228} height={72} style={fill(SEA)} />
                <path className="gm-waves" d="M-40 206 q20 -10 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke={C.paper} strokeWidth={4} />
                <g className="gm-gull-fly"><Gull x={0} y={80} s={0.9} /></g>
            </svg>
            <path d="M150 60 V360 M20 210 H280" stroke={WOOD} strokeWidth={10} />
            <rect className="o" x={20} y={60} width={260} height={300} rx={18} fill="none" />
            <rect className="o" x={8} y={350} width={284} height={22} rx={8} style={fill(mix(WOOD, 80, C.paper))} />
            <Gull x={232} y={336} s={1.1} flying={false} />
            {/* A post with a rope, and a crate of beach balls. */}
            <rect className="o" x={30} y={430} width={28} height={170} rx={6} style={fill(WOOD)} />
            <rect className="o" x={110} y={500} width={170} height={100} rx={8} style={fill(mix(WOOD, 75, C.yellow))} />
            {[150, 200, 245].map((x, k) => <g key={x} className="gm-ball" style={{ '--k': k } as CSSProperties}><circle className="o" cx={x} cy={486} r={24} style={fill(C.paper)} /><path d={`M${x - 24} 486 A24 24 0 0 1 ${x} 462 V486 Z`} style={fill([C.red, C.blue, C.green][k])} /><path d={`M${x} 486 L${x + 24} 486 A24 24 0 0 1 ${x} 510 Z`} style={fill(C.yellow)} /></g>)}
        </svg>
    );
}

export function WingR() {
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            {/* The candy-floss cart: a striped roof, the spinning bowl and a pink cloud growing on its stick. */}
            <path className="o" d="M30 230 L270 230 L250 180 L50 180 Z" style={fill(C.paper)} />
            {[0, 2, 4].map(i => <path key={i} d={`M${50 + i * 40} 180 L${90 + i * 40} 180 L${78 + i * 48} 230 L${30 + i * 48} 230 Z`} style={fill(C.pink)} />)}
            <path className="o" d="M30 230 L270 230 L250 180 L50 180 Z" fill="none" />
            <path className="o" d="M30 230 Q50 250 70 230 Q90 250 110 230 Q130 250 150 230 Q170 250 190 230 Q210 250 230 230 Q250 250 270 230" style={fill(C.pink)} />
            <path d="M60 250 V420 M240 250 V420" stroke={C.ink} strokeWidth={6} />
            <text className="gm-cart-word" x={150} y={172} textAnchor="middle">SUIKERSPIN</text>
            <rect className="o" x={40} y={420} width={220} height={140} rx={14} style={fill(mix(C.blue, 60, C.paper))} />
            <circle className="o" cx={90} cy={572} r={22} style={fill(C.yellow)} /><circle className="o" cx={210} cy={572} r={22} style={fill(C.yellow)} />
            <ellipse className="o" cx={150} cy={414} rx={78} ry={22} style={fill(mix(C.ink, 25, C.paper))} />
            <g className="gm-floss">
                {[[-30, -40, 30], [8, -58, 34], [36, -36, 28], [-6, -26, 32], [20, -82, 24]].map(([dx, dy, r], k) => <circle key={k} className="o" cx={150 + dx} cy={404 + dy} r={r} style={fill(mix(C.pink, 45, C.paper))} />)}
            </g>
            <path d="M150 410 V330" stroke={C.cream} strokeWidth={6} />
            <path className="gm-spin" d="M90 410 Q150 396 210 410" fill="none" stroke={C.paper} strokeWidth={4} strokeDasharray="10 12" />
        </svg>
    );
}

export function Cabinet() {
    const stripes = Array.from({ length: 12 }, (_, i) => 44 + i * 76);
    return (
        <g>
            {/* The circus awning with a flag on its pole. */}
            <path d="M500 0 V40" stroke={C.ink} strokeWidth={6} />
            <path className="o gm-pennant" style={{ ...fill(C.blue), ...pivot(500, 6) } as CSSProperties} d="M500 4 L560 18 L500 32 Z" />
            <path className="o" d="M60 150 L500 36 L940 150 Z" style={fill(C.paper)} />
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <path key={i} d={`M${60 + i * 110} 150 L500 36 L${115 + i * 110} 150 Z`} style={fill(C.red)} opacity={i % 2 ? 0 : 1} />)}
            <path className="o" d="M60 150 L500 36 L940 150 Z" fill="none" />
            <text className="gm-marquee is-pier" x={500} y={112} textAnchor="middle">{NAME}</text>
            <rect className="o gm-body" x={44} y={142} width={912} height={760} rx={30} />
            <g opacity={0.95}>{stripes.map((x, i) => i % 2 ? null : <rect key={x} x={x} y={150} width={76} height={600} style={fill(C.paper)} />)}</g>
            <rect className="o" x={44} y={142} width={912} height={760} rx={30} fill="none" />
            <path className="o" d="M40 160 Q90 196 140 160 Q190 196 240 160 Q290 196 340 160 Q390 196 440 160 Q490 196 540 160 Q590 196 640 160 Q690 196 740 160 Q790 196 840 160 Q890 196 960 160 L960 142 L40 142 Z" style={fill(C.red)} />
            <rect className="o gm-trim" x={DISPLAY.x - 34} y={DISPLAY.y - 4} width={DISPLAY.w + 68} height={DISPLAY.h + 26} rx={22} />
            <Bulbs points={rectPoints(DISPLAY.x - 20, DISPLAY.y + 6, DISPLAY.w + 40, DISPLAY.h + 6, 28)} r={8} />
            <rect className="o gm-trim" x={GLASS.x - 18} y={GLASS.y - 16} width={GLASS.w + 36} height={GLASS.h + 32} rx={22} />
            <Bulbs points={[...linePoints([68, 300], [68, 720], 9), ...linePoints([932, 720], [932, 300], 9)]} r={9} kind="blink" />
            <path className="o gm-panel" d="M58 748 L942 748 L960 890 L40 890 Z" />
            <path className="o" d="M60 886 H940 V912 Q940 930 920 930 H80 Q60 930 60 912 Z" style={fill(WOOD)} />
            {[140, 860].map(x => <circle key={x} className="o" cx={x} cy={908} r={10} style={fill(GOLD)} />)}
        </g>
    );
}

export function Inside() {
    const W = GLASS.w, H = GLASS.h;
    return (
        <g>
            <rect width={W} height={H} style={fill(mix(C.sky, 30, C.paper))} />
            <circle cx={W * 0.8} cy={H * 0.24} r={40} style={fill(C.yellow)} />
            <g className="gm-sun-rays" style={pivot(W * 0.8, H * 0.24)}>{Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${W * 0.8} ${H * 0.24 - 52} V${H * 0.24 - 66}`} transform={`rotate(${i * 45} ${W * 0.8} ${H * 0.24})`} stroke={C.yellow} strokeWidth={6} strokeLinecap="round" />)}</g>
            <rect y={H * 0.42} width={W} height={H * 0.25} style={fill(SEA)} />
            <path className="gm-waves is-in" d={`M-60 ${H * 0.46} ${Array.from({ length: 24 }, () => 'q20 -10 40 0').join(' ')}`} fill="none" stroke={C.paper} strokeWidth={4} />
            <path className="gm-boat" d={`M${W * 0.3} ${H * 0.4} l60 0 l-10 14 l-40 0 Z M${W * 0.3 + 30} ${H * 0.4} V${H * 0.3} l24 10 l-24 4`} style={fill(C.paper)} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
            <path className="o" d={`M0 ${H} L0 ${H * 0.66} Q${W * 0.3} ${H * 0.6} ${W * 0.55} ${H * 0.66} Q${W * 0.8} ${H * 0.6} ${W} ${H * 0.66} L${W} ${H} Z`} style={fill(SAND)} />
            {[[0.4, 0.75], [0.62, 0.8], [0.9, 0.72]].map(([x, y], k) => <path key={k} d={`M${W * x - 10} ${H * y} q10 -10 20 0`} stroke={mix(C.yellow, 50, C.ink)} strokeWidth={3} fill="none" />)}
        </g>
    );
}

export function Claw() {
    return (
        <ClawFrom look={{
            hub: (
                <g>
                    <rect className="o" x={50} y={0} width={20} height={26} rx={4} style={fill(GOLD)} />
                    <circle className="o" cx={60} cy={10} r={9} fill="none" style={{ stroke: C.ink }} />
                    <path className="o" d="M24 30 Q60 50 96 30 L96 44 Q60 62 24 44 Z" style={fill(GOLD)} />
                </g>
            ),
            prong: (
                <g>
                    <path className="o" d="M-6 0 L6 0 L8 60 Q10 74 26 82 L30 70 L36 92 L14 92 L20 86 Q-2 80 -5 62 Z" style={fill(GOLD)} />
                    <circle className="o" cx={0} cy={0} r={8} style={fill(mix(GOLD, 70, C.ink))} />
                </g>
            ),
            middle: <path className="o" d="M-6 0 L6 0 L5 72 L10 80 L0 92 L-10 80 L-5 72 Z" style={fill(mix(GOLD, 85, C.ink))} />,
        }} />
    );
}

// ── The sea creatures ────────────────────────────────────────────────────────────

const PAL: Record<string, string[]> = {
    krab: [mix(C.red, 90, C.orange), C.orange, mix(C.pink, 80, C.red)],
    vis: [C.orange, mix(C.blue, 70, C.paper), C.yellow],
    zeester: [mix(C.orange, 80, C.yellow), C.pink, C.violet],
    schildpad: [mix(C.green, 85, C.paper), mix(C.lime, 70, C.blue), mix(C.green, 60, C.yellow)],
    kwal: [C.lilac, mix(C.pink, 45, C.paper), C.ice],
    walvis: [mix(C.blue, 85, C.paper), mix(C.sky, 60, C.purple), mix(C.blue, 50, C.mint)],
};

export function Prize({ prize }: { prize: Prize }) {
    const c = PAL[prize.kind]?.[prize.look % 3] ?? PAL.krab[0];
    const dark = mix(c, 65, C.ink);
    switch (prize.kind) {
        case 'krab':
            return (
                <g>
                    {[[22, 84], [30, 92], [70, 92], [78, 84]].map(([x, y], k) => <path key={k} className="o" d={`M50 78 Q${x} ${y - 10} ${x} ${y}`} fill="none" style={{ stroke: C.ink }} strokeWidth={5} />)}
                    <path className="o" d="M24 58 Q8 46 12 30" fill="none" strokeWidth={6} />
                    <path className="o" d="M10 22 Q-2 30 8 40 L14 32 L22 36 Q24 22 10 22 Z" style={fill(c)} />
                    <g className="gm-wave" style={pivot(76, 58)}>
                        <path className="o" d="M76 58 Q92 46 88 30" fill="none" strokeWidth={6} />
                        <path className="o" d="M90 22 Q102 30 92 40 L86 32 L78 36 Q76 22 90 22 Z" style={fill(c)} />
                    </g>
                    <ellipse className="o" cx={50} cy={66} rx={32} ry={24} style={fill(c)} />
                    <path d="M30 54 Q50 46 70 54" stroke={dark} strokeWidth={3} fill="none" />
                    <path d="M40 40 V30 M60 40 V30" stroke={C.ink} strokeWidth={4} />
                    <Face x={50} y={28} gap={10} s={0.9} cheeks={false} mouth="none" />
                    <path className="gm-mouth" d="M42 70 Q50 78 58 70" fill="none" />
                    <g style={fill(mix(C.rose, 90, C.red))} opacity={0.6}><ellipse cx={32} cy={68} rx={5} ry={3.5} /><ellipse cx={68} cy={68} rx={5} ry={3.5} /></g>
                </g>
            );
        case 'vis':
            return (
                <g>
                    <path className="o" d="M80 60 L98 42 L98 84 Z" style={fill(dark)} />
                    <ellipse className="o" cx={48} cy={60} rx={38} ry={34} style={fill(c)} />
                    <path d="M30 34 Q40 60 30 88 M44 28 Q54 60 44 94" stroke={dark} strokeWidth={3} fill="none" opacity={0.5} />
                    <path className="o" d="M40 28 Q52 4 70 24 Z" style={fill(dark)} />
                    <g className="gm-wave" style={pivot(56, 74)}><path className="o" d="M56 74 Q72 94 80 78 Q70 72 60 66 Z" style={fill(dark)} /></g>
                    <Face x={34} y={52} gap={9} mouth="o" />
                </g>
            );
        case 'zeester':
            return (
                <g>
                    <path className="o" d="M50 10 Q58 34 64 40 Q88 38 94 42 Q76 58 72 66 Q80 90 76 98 Q58 84 50 82 Q42 84 24 98 Q20 90 28 66 Q24 58 6 42 Q12 38 36 40 Q42 34 50 10 Z" style={fill(c)} />
                    <g className="gm-wave" style={pivot(66, 44)}><path className="o" d="M64 40 Q88 38 94 42 Q76 58 72 66 Z" style={fill(c)} /></g>
                    {[[50, 26], [30, 48], [70, 48], [36, 78], [64, 78]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r={2.6} style={fill(dark)} />)}
                    <Face x={50} y={54} gap={9} mouth="grin" />
                </g>
            );
        case 'schildpad':
            return (
                <g>
                    <ellipse className="o" cx={24} cy={90} rx={10} ry={6} style={fill(mix(C.green, 60, C.yellow))} />
                    <ellipse className="o" cx={76} cy={90} rx={10} ry={6} style={fill(mix(C.green, 60, C.yellow))} />
                    <circle className="o" cx={50} cy={34} r={20} style={fill(mix(C.green, 60, C.yellow))} />
                    <Face x={50} y={34} gap={8} s={0.95} mouth="smile" />
                    <g className="gm-wave" style={pivot(80, 66)}><ellipse className="o" cx={88} cy={62} rx={12} ry={6} transform="rotate(-30 88 62)" style={fill(mix(C.green, 60, C.yellow))} /></g>
                    <path className="o" d="M14 86 Q14 50 50 50 Q86 50 86 86 Z" style={fill(c)} />
                    <path d="M50 56 L40 68 L50 80 L60 68 Z M28 76 L40 68 M72 76 L60 68" stroke={dark} strokeWidth={3} fill="none" strokeLinejoin="round" />
                </g>
            );
        case 'kwal':
            return (
                <g>
                    {[26, 40, 54, 68].map((x, k) => <path key={x} className="gm-tentacle" style={{ '--k': k } as CSSProperties} d={`M${x} 60 q-6 10 0 20 q6 10 0 18`} fill="none" stroke={dark} strokeWidth={5} strokeLinecap="round" />)}
                    <g className="gm-wave" style={pivot(80, 60)}><path d="M80 60 q10 8 8 20 q-2 10 6 16" fill="none" stroke={dark} strokeWidth={5} strokeLinecap="round" /></g>
                    <path className="o" d="M14 62 Q12 14 50 14 Q88 14 86 62 Q78 56 70 62 Q60 56 50 62 Q40 56 30 62 Q22 56 14 62 Z" style={fill(c)} />
                    <ellipse cx={34} cy={28} rx={8} ry={5} style={fill(C.paper)} opacity={0.6} />
                    <Face x={50} y={42} gap={11} mouth="smile" />
                </g>
            );
        default:
            return (
                <g>
                    <g className="gm-wave" style={pivot(84, 56)}><path className="o" d="M82 58 Q94 40 98 30 Q90 34 86 30 Q90 44 76 54 Z" style={fill(c)} /></g>
                    <path className="o" d="M8 70 Q8 30 48 30 Q88 30 88 70 Q88 96 48 96 Q8 96 8 70 Z" style={fill(c)} />
                    <path d="M14 76 Q48 94 84 76 Q76 92 48 94 Q20 92 14 76 Z" style={fill(C.ice)} />
                    {/* The spout plays now and then (grijp.css .gm-spout). */}
                    <g className="gm-spout"><path d="M46 28 Q40 10 30 8 M50 28 V4 M54 28 Q60 10 70 8" stroke={mix(C.blue, 40, C.paper)} strokeWidth={4} fill="none" strokeLinecap="round" /></g>
                    <Face x={42} y={58} gap={11} mouth="smile" />
                </g>
            );
    }
}

