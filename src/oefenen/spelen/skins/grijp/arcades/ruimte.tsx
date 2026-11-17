import type { CSSProperties } from 'react';
import { machineById, type Prize } from '../machines';
import { Bulbs, ClawFrom, Face } from './kit';
import { C, DISPLAY, GLASS, fill, linePoints, mix, pivot, rectPoints } from './layout';

// The space arcade: a station hall of riveted metal with portholes on the stars, a comet passing, a rocket flying by
// the big window, a robot janitor sweeping the floor. A rocket-shaped machine with a nose cone, fins and little
// exhaust flames; aliens, rockets and robots inside.

const NAME = machineById('ruimte').name;
const METAL = mix(C.blue, 22, mix(C.ink, 55, C.paper));
const SPACE = mix(C.blue, 25, C.ink);
const SILVER = mix(C.ice, 40, C.paper);

const STARS = Array.from({ length: 40 }, (_, i) => ({ x: (i * 211) % 1600, y: (i * 137) % 420 + 10, r: 1.5 + (i % 3), k: i % 6 }));

export function Room() {
    return (
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden>
            {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${i * 200} 0 V900`} stroke={C.ink} strokeWidth={4} opacity={0.35} />)}
            <path d="M0 300 H1600 M0 640 H1600" stroke={C.ink} strokeWidth={4} opacity={0.35} />
            {Array.from({ length: 9 }, (_, i) => [290, 310, 630, 650].map(y => <circle key={`${i}-${y}`} cx={i * 200 + 20} cy={y} r={4} style={fill(mix(C.ink, 40, C.ice))} />))}
            <path d="M0 860 H1600" stroke={mix(C.lime, 60, C.blue)} strokeWidth={6} className="gm-neon-strip" />
        </svg>
    );
}

function Rocket({ s = 1, flame = true }: { s?: number; flame?: boolean }) {
    return (
        <g transform={`scale(${s})`}>
            {flame && <g className="gm-thrust"><path className="o" d="M-10 30 Q0 64 10 30 Z" style={fill(C.orange)} /><path d="M-5 30 Q0 50 5 30 Z" style={fill(C.yellow)} /></g>}
            <path className="o" d="M-14 22 L-28 36 L-14 34 Z M14 22 L28 36 L14 34 Z" style={fill(C.red)} />
            <path className="o" d="M0 -40 Q18 -20 14 30 L-14 30 Q-18 -20 0 -40 Z" style={fill(C.paper)} />
            <path d="M0 -40 Q10 -30 12 -18 L-12 -18 Q-10 -30 0 -40 Z" style={fill(C.red)} />
            <circle className="o" cx={0} cy={0} r={7} style={fill(C.sky)} />
        </g>
    );
}

export function WingL() {
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            {/* The big window: a ringed planet, twinkling stars and now and then a rocket zooming past. */}
            <rect className="o" x={16} y={50} width={268} height={330} rx={60} style={fill(SILVER)} />
            <svg x={34} y={68} width={232} height={294} viewBox="0 0 232 294">
                <rect width={232} height={294} rx={44} style={fill(SPACE)} />
                {STARS.slice(0, 18).map((st, k) => <circle key={k} className="gm-star-dot" style={{ ...fill(C.paper), '--k': st.k } as CSSProperties} cx={st.x % 232} cy={st.y % 294} r={st.r * 0.8} />)}
                <g transform="translate(140 190)">
                    <ellipse rx={84} ry={18} fill="none" stroke={C.yellow} strokeWidth={8} transform="rotate(-18)" />
                    <circle className="o" r={46} style={fill(mix(C.orange, 70, C.pink))} />
                    <path d="M-44 -10 Q0 4 44 -14 M-40 16 Q0 28 40 12" stroke={mix(C.orange, 60, C.ink)} strokeWidth={5} fill="none" opacity={0.5} />
                    <path d="M-84 6 Q0 26 84 -6" fill="none" stroke={C.yellow} strokeWidth={8} transform="rotate(-18)" />
                </g>
                <g className="gm-rocket-fly"><g transform="rotate(60)"><Rocket s={0.8} /></g></g>
                <path className="gm-comet" d="M0 0 L-60 -20 L-58 -12 Z" style={fill(C.paper)} opacity={0.8} />
            </svg>
            <rect className="o" x={16} y={50} width={268} height={330} rx={60} fill="none" />
            {/* A control desk with blinking buttons. */}
            <path className="o" d="M20 470 L280 470 L268 600 L32 600 Z" style={fill(METAL)} />
            <path className="o" d="M14 440 L286 440 L280 470 L20 470 Z" style={fill(SILVER)} />
            {[50, 90, 130, 170, 210, 250].map((x, k) => <circle key={x} className="gm-desk-light" style={{ ...fill([C.red, C.lime, C.yellow, C.sky][k % 4]), '--k': k } as CSSProperties} cx={x} cy={455} r={8} />)}
            <rect className="o" x={70} y={500} width={160} height={60} rx={10} style={fill(SPACE)} />
            <path className="gm-radar" d="M80 530 L100 530 L110 510 L124 550 L136 520 L146 530 L220 530" fill="none" stroke={C.lime} strokeWidth={4} strokeLinejoin="round" />
        </svg>
    );
}

export function WingR() {
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            {/* The robot janitor sweeps to and fro, a little cloud of stardust at its broom. */}
            <g className="gm-janitor">
                <g className="gm-broom" style={pivot(150, 470)}>
                    <path d="M150 470 L96 590" stroke={mix(C.orange, 60, C.ink)} strokeWidth={8} strokeLinecap="round" />
                    <path className="o" d="M70 586 L120 586 L112 600 L78 600 Z" style={fill(C.yellow)} />
                </g>
                <circle className="gm-dust" cx={80} cy={590} r={14} style={fill(mix(C.paper, 70, C.purple))} />
                <rect className="o" x={110} y={500} width={90} height={70} rx={14} style={fill(SILVER)} />
                <circle className="o" cx={130} cy={584} r={16} style={fill(mix(C.ink, 60, C.ice))} /><circle className="o" cx={180} cy={584} r={16} style={fill(mix(C.ink, 60, C.ice))} />
                <rect className="o" x={118} y={436} width={74} height={60} rx={16} style={fill(SILVER)} />
                <rect x={128} y={448} width={54} height={28} rx={10} style={fill(SPACE)} />
                <g className="gm-eyes"><circle cx={144} cy={462} r={5} style={fill(C.lime)} /><circle cx={166} cy={462} r={5} style={fill(C.lime)} /></g>
                <path d="M155 436 V414" stroke={C.ink} strokeWidth={4} /><circle className="o gm-claw-light" cx={155} cy={410} r={7} />
                <path className="o" d="M200 520 Q226 520 230 500" fill="none" strokeWidth={8} />
            </g>
            {/* A hanging sign. */}
            <path d="M80 0 V40 M220 0 V40" stroke={C.ink} strokeWidth={4} />
            <rect className="o" x={50} y={40} width={200} height={70} rx={14} style={fill(SPACE)} />
            <text className="gm-space-word" x={150} y={88} textAnchor="middle">LANCEER!</text>
            <g transform="translate(150 250)"><g className="gm-planet-bob"><circle className="o" r={56} style={fill(mix(C.lime, 70, C.blue))} /><circle cx={-18} cy={-12} r={10} style={fill(mix(C.lime, 50, C.ink))} opacity={0.5} /><circle cx={20} cy={18} r={14} style={fill(mix(C.lime, 50, C.ink))} opacity={0.5} /><Face x={0} y={4} s={1.4} /></g></g>
        </svg>
    );
}

export function Cabinet() {
    return (
        <g>
            {/* The rocket: a nose cone with a porthole, a silver body, fins out at the sides and flames under the base. */}
            <path className="o" d="M90 190 Q140 30 500 6 Q860 30 910 190 Z" style={fill(C.red)} />
            <text className="gm-marquee is-space" x={500} y={112} textAnchor="middle">{NAME}</text>
            <path className="o" d="M40 640 L-0 900 L80 860 Z" style={fill(C.red)} />
            <path className="o" d="M960 640 L1000 900 L920 860 Z" style={fill(C.red)} />
            <rect className="o gm-body" x={44} y={118} width={912} height={784} rx={60} />
            <path d="M80 140 V880" stroke={C.paper} strokeWidth={14} opacity={0.5} strokeLinecap="round" />
            {[[70, 300], [70, 600], [930, 300], [930, 600]].map(([x, y]) => <g key={`${x}${y}`}><circle className="o" cx={x} cy={y} r={14} style={fill(C.sky)} /><circle cx={x - 4} cy={y - 4} r={4} style={fill(C.paper)} /></g>)}
            <rect className="o gm-trim" x={DISPLAY.x - 34} y={DISPLAY.y - 4} width={DISPLAY.w + 68} height={DISPLAY.h + 26} rx={30} />
            <Bulbs points={rectPoints(DISPLAY.x - 22, DISPLAY.y + 6, DISPLAY.w + 44, DISPLAY.h + 6, 28)} r={7} />
            <rect className="o gm-trim" x={GLASS.x - 18} y={GLASS.y - 16} width={GLASS.w + 36} height={GLASS.h + 32} rx={34} />
            {[...Array(10)].map((_, i) => <circle key={i} cx={GLASS.x - 4} cy={GLASS.y + 20 + i * 46} r={4} style={fill(mix(C.ink, 40, C.ice))} />)}
            {[...Array(10)].map((_, i) => <circle key={i} cx={GLASS.x + GLASS.w + 4} cy={GLASS.y + 20 + i * 46} r={4} style={fill(mix(C.ink, 40, C.ice))} />)}
            <path className="o gm-panel" d="M58 748 L942 748 L960 890 L40 890 Z" />
            <Bulbs points={linePoints([120, 760], [880, 760], 18)} r={5} kind="blink" />
            <path className="o" d="M120 896 L880 896 L840 930 L160 930 Z" style={fill(METAL)} />
            {[260, 500, 740].map((x, k) => <g key={x} className="gm-exhaust" style={{ '--k': k } as CSSProperties}><path className="o" d={`M${x - 24} 930 Q${x} 976 ${x + 24} 930 Z`} style={fill(C.orange)} /><path d={`M${x - 12} 930 Q${x} 954 ${x + 12} 930 Z`} style={fill(C.yellow)} /></g>)}
        </g>
    );
}

export function Inside() {
    const W = GLASS.w, H = GLASS.h;
    return (
        <g>
            <rect width={W} height={H} style={fill(SPACE)} />
            {STARS.map((st, k) => <circle key={k} className="gm-star-dot" style={{ ...fill(C.paper), '--k': st.k } as CSSProperties} cx={(st.x * W) / 1600} cy={(st.y * H) / 900} r={st.r * 0.7} />)}
            <g transform={`translate(${W * 0.78} ${H * 0.26})`}>
                <circle className="o" r={36} style={fill(C.violet)} />
                <ellipse rx={64} ry={12} fill="none" stroke={C.cream} strokeWidth={6} transform="rotate(-14)" />
            </g>
            <circle className="o" cx={W * 0.24} cy={H * 0.22} r={20} style={fill(mix(C.sky, 60, C.paper))} />
            <path className="gm-comet is-in" d="M0 0 L-70 -22 L-68 -12 Z" style={fill(C.paper)} opacity={0.8} />
            <path className="o" d={`M0 ${H} L0 ${H * 0.66} Q${W * 0.3} ${H * 0.6} ${W * 0.55} ${H * 0.66} Q${W * 0.8} ${H * 0.6} ${W} ${H * 0.66} L${W} ${H} Z`} style={fill(mix(C.ink, 40, C.ice))} />
            {[[0.35, 0.78, 18], [0.6, 0.86, 12], [0.86, 0.76, 15]].map(([x, y, r], k) => <ellipse key={k} cx={W * x} cy={H * y} rx={r} ry={r * 0.4} style={fill(mix(C.ink, 60, C.ice))} />)}
        </g>
    );
}

export function Claw() {
    return (
        <ClawFrom look={{
            hub: (
                <g>
                    <rect className="o" x={50} y={0} width={20} height={18} rx={4} style={fill(SILVER)} />
                    <ellipse className="o" cx={60} cy={30} rx={46} ry={14} style={fill(SILVER)} />
                    <path className="o" d="M36 26 Q60 2 84 26 Z" style={fill(mix(C.sky, 60, C.paper))} />
                    {[30, 50, 70, 90].map((x, k) => <circle key={x} className="gm-desk-light" style={{ ...fill([C.red, C.yellow, C.lime, C.sky][k]), '--k': k } as CSSProperties} cx={x} cy={33} r={3.5} />)}
                </g>
            ),
            prong: (
                <g>
                    <path className="o" d="M-6 0 L6 0 L6 56 L24 82 L16 92 L-4 62 Z" style={fill(SILVER)} />
                    <circle className="o" cx={0} cy={0} r={7} style={fill(C.red)} />
                    <circle className="o" cx={4} cy={58} r={5} style={fill(C.red)} />
                </g>
            ),
            middle: <path className="o" d="M-5 0 L5 0 L5 74 L0 90 L-5 74 Z" style={fill(mix(C.ink, 20, C.ice))} />,
            pivotY: 42,
            spread: 26,
        }} />
    );
}

// ── The space toys ───────────────────────────────────────────────────────────────

const PAL: Record<string, string[]> = {
    alien: [mix(C.lime, 85, C.paper), mix(C.green, 70, C.blue), C.violet],
    raket: [C.red, C.blue, C.orange],
    robot: [SILVER, mix(C.yellow, 60, C.paper), mix(C.sky, 50, C.paper)],
    ufo: [C.violet, mix(C.pink, 70, C.paper), mix(C.lime, 60, C.blue)],
    planeet: [mix(C.orange, 70, C.pink), mix(C.blue, 60, C.mint), mix(C.purple, 60, C.pink)],
    ster: [C.yellow, mix(C.yellow, 60, C.orange), mix(C.yellow, 50, C.paper)],
};

export function Prize({ prize }: { prize: Prize }) {
    const c = PAL[prize.kind]?.[prize.look % 3] ?? PAL.alien[0];
    const dark = mix(c, 60, C.ink);
    switch (prize.kind) {
        case 'alien':
            return (
                <g>
                    <path d="M38 22 L30 4 M62 22 L70 4" stroke={C.ink} strokeWidth={4} />
                    <circle className="o gm-antenna" cx={30} cy={4} r={6} style={fill(C.yellow)} /><circle className="o gm-antenna" cx={70} cy={4} r={6} style={fill(C.yellow)} />
                    <path className="o" d="M24 98 Q18 66 30 60 L70 60 Q82 66 76 98 Z" style={fill(c)} />
                    <path className="o" d="M26 70 Q10 74 12 86" fill="none" strokeWidth={8} style={{ stroke: c }} />
                    <g className="gm-wave" style={pivot(74, 68)}><path d="M74 70 Q90 64 90 50" fill="none" strokeWidth={8} strokeLinecap="round" style={{ stroke: c }} /></g>
                    <ellipse className="o" cx={50} cy={42} rx={32} ry={26} style={fill(c)} />
                    <g className="gm-eyes">{[36, 50, 64].map(x => <g key={x}><ellipse cx={x} cy={38} rx={5} ry={6.5} style={fill(C.ink)} /><circle cx={x + 1.6} cy={35.6} r={1.8} style={fill(C.paper)} /></g>)}</g>
                    <path className="gm-mouth" d="M42 52 Q50 58 58 52" fill="none" />
                </g>
            );
        case 'raket':
            return (
                <g>
                    <g className="gm-thrust"><path className="o" d="M40 92 Q50 112 60 92 Z" style={fill(C.yellow)} /></g>
                    <path className="o" d="M28 70 L12 92 L32 88 Z" style={fill(dark)} />
                    <g className="gm-wave" style={pivot(72, 70)}><path className="o" d="M72 70 L88 92 L68 88 Z" style={fill(dark)} /></g>
                    <path className="o" d="M50 4 Q76 30 72 92 L28 92 Q24 30 50 4 Z" style={fill(C.paper)} />
                    <path d="M50 4 Q64 16 69 32 L31 32 Q36 16 50 4 Z" style={fill(c)} />
                    <rect x={28} y={78} width={44} height={8} style={fill(c)} />
                    <circle className="o" cx={50} cy={54} r={15} style={fill(mix(C.sky, 60, C.paper))} />
                    <Face x={50} y={52} s={0.68} gap={10} />
                </g>
            );
        case 'robot':
            return (
                <g>
                    <path d="M50 16 V4" stroke={C.ink} strokeWidth={4} /><circle className="o gm-claw-light" cx={50} cy={4} r={5} />
                    <rect className="o" x={22} y={62} width={56} height={36} rx={8} style={fill(c)} />
                    <rect x={36} y={70} width={28} height={14} rx={3} style={fill(SPACE)} />
                    <rect className="o" x={8} y={66} width={12} height={24} rx={5} style={fill(c)} />
                    <g className="gm-wave" style={pivot(84, 66)}><rect className="o" x={80} y={46} width={12} height={24} rx={5} style={fill(c)} /></g>
                    <rect className="o" x={20} y={16} width={60} height={44} rx={12} style={fill(c)} />
                    <rect x={28} y={24} width={44} height={28} rx={8} style={fill(SPACE)} />
                    <g className="gm-eyes"><circle cx={40} cy={36} r={5} style={fill(C.lime)} /><circle cx={60} cy={36} r={5} style={fill(C.lime)} /></g>
                    <path d="M42 46 Q50 50 58 46" stroke={C.lime} strokeWidth={2.4} fill="none" strokeLinecap="round" />
                </g>
            );
        case 'ufo':
            return (
                <g>
                    <path className="gm-beam" d="M34 74 L18 100 L82 100 L66 74 Z" style={fill(C.yellow)} opacity={0.35} />
                    <circle className="o" cx={50} cy={40} r={22} style={fill(mix(C.sky, 40, C.paper))} />
                    <circle cx={50} cy={44} r={14} style={fill(mix(C.lime, 85, C.paper))} />
                    <Face x={50} y={44} s={0.6} gap={9} />
                    <g className="gm-wave" style={pivot(62, 50)}><path d="M62 50 Q70 40 68 32" stroke={mix(C.lime, 70, C.ink)} strokeWidth={4} strokeLinecap="round" fill="none" /></g>
                    <ellipse className="o" cx={50} cy={64} rx={44} ry={14} style={fill(c)} />
                    {[18, 34, 50, 66, 82].map((x, k) => <circle key={x} className="gm-desk-light" style={{ ...fill([C.yellow, C.red, C.lime][k % 3]), '--k': k } as CSSProperties} cx={x} cy={66} r={3.5} />)}
                </g>
            );
        case 'planeet':
            return (
                <g>
                    <path d="M4 66 Q50 92 96 58" fill="none" strokeWidth={7} style={{ stroke: C.yellow }} />
                    <circle className="o" cx={50} cy={56} r={36} style={fill(c)} />
                    <path d="M18 44 Q50 54 82 40 M16 70 Q50 80 84 66" stroke={dark} strokeWidth={4} fill="none" opacity={0.4} />
                    <g className="gm-wave" style={pivot(50, 62)}><path d="M4 66 Q30 44 50 50" fill="none" strokeWidth={7} strokeLinecap="round" style={{ stroke: C.yellow }} /></g>
                    <Face x={50} y={52} />
                </g>
            );
        default:
            return (
                <g>
                    <path className="o" d="M50 6 L62 36 L94 38 L68 58 L78 92 L50 72 L22 92 L32 58 L6 38 L38 36 Z" style={fill(c)} />
                    <g className="gm-wave" style={pivot(66, 46)}><path className="o" d="M62 36 L94 38 L68 58 Z" style={fill(c)} /></g>
                    <Face x={50} y={52} gap={10} mouth="grin" />
                </g>
            );
    }
}

