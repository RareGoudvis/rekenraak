import type { CSSProperties } from 'react';
import { machineById, type Prize } from '../machines';
import { Bulbs, ClawFrom, Face } from './kit';
import { C, DISPLAY, GLASS, fill, mix, pivot, rectPoints } from './layout';

// The candy shop arcade: pastel striped wallpaper, lollipop lamps that glow, jars of sweets on a shelf and a gumball
// machine beside the claw machine that drops a gumball now and then. A mint machine with a cupcake crown (frosting,
// sprinkles and a cherry) and candy-cane posts; sweets with faces inside.

const NAME = machineById('snoep').name;
const FROST = mix(C.pink, 35, C.paper);
const MINT = mix(C.mint, 80, C.green);
const CAKE = mix(C.orange, 45, C.cream);

const SPRINKLES = [C.red, C.blue, C.yellow, C.green, C.violet];

function Sprinkles({ pts }: { pts: readonly (readonly [number, number])[] }) {
    return <g>{pts.map(([x, y], k) => <rect key={k} x={x - 5} y={y - 2} width={10} height={4} rx={2} transform={`rotate(${(k * 47) % 180} ${x} ${y})`} style={fill(SPRINKLES[k % SPRINKLES.length])} />)}</g>;
}

function Lolly({ x, y, r, c, glow = false }: { x: number; y: number; r: number; c: string; glow?: boolean }) {
    return (
        <g transform={`translate(${x} ${y})`} className={glow ? 'gm-lolly-lamp' : undefined}>
            {glow && <circle className="gm-lamp-glow" r={r * 1.8} style={fill(c)} />}
            <circle className="o" r={r} style={fill(c)} />
            <path d={`M0 0 m-${r * 0.6} 0 a${r * 0.6} ${r * 0.6} 0 1 1 ${r * 1.2} 0 a${r * 0.4} ${r * 0.4} 0 1 1 -${r * 0.8} 0 a${r * 0.2} ${r * 0.2} 0 1 1 ${r * 0.4} 0`} fill="none" stroke={C.paper} strokeWidth={r * 0.16} />
        </g>
    );
}

export function Room() {
    return (
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden>
            {Array.from({ length: 27 }, (_, i) => <rect key={i} x={i * 60} y={0} width={30} height={900} style={fill(C.paper)} opacity={0.45} />)}
            {/* Lollipop lamps hanging from the ceiling. */}
            {[[520, 70, MINT], [1080, 70, C.violet]].map(([x, y, c], k) => (
                <g key={k} className="gm-lamp-sway" style={{ ...pivot(x as number, 0), '--k': k } as CSSProperties}>
                    <path d={`M${x} 0 V${(y as number) - 40}`} stroke={C.ink} strokeWidth={4} />
                    <Lolly x={x as number} y={y as number} r={40} c={c as string} glow />
                </g>
            ))}
            {/* A garland of wrapped sweets. */}
            <path d="M0 230 Q400 300 800 230 Q1200 300 1600 230" fill="none" stroke={C.ink} strokeWidth={3} />
            {Array.from({ length: 15 }, (_, i) => {
                const t = (i + 0.5) / 15, x = t * 1600, local = (t * 2) % 1, yy = 230 + 140 * local * (1 - local);
                return <g key={i} transform={`translate(${x} ${yy + 12}) rotate(${i % 2 ? 10 : -10})`}><path className="o" d="M-24 -10 L-14 0 L-24 10 Z M24 -10 L14 0 L24 10 Z" style={fill(SPRINKLES[i % 5])} /><ellipse className="o" rx={16} ry={11} style={fill(SPRINKLES[i % 5])} /></g>;
            })}
        </svg>
    );
}

export function WingL() {
    // Rows of gumballs filling the globe from the bottom up (centre 150, 230, radius 110; a ball is 17).
    const balls = [300, 270, 240, 210, 182].flatMap((y, r) => {
        const half = Math.sqrt(110 * 110 - (y - 230) ** 2) - 20;
        const n = Math.floor((2 * half) / 33) + 1;
        return Array.from({ length: n }, (_, i) => ({ x: 150 - half + (i * 2 * half) / Math.max(1, n - 1) + (r % 2 ? 6 : 0), y, c: SPRINKLES[(i * 3 + r) % 5] }));
    });
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            {/* The gumball machine: a glass globe of gumballs that jiggle, a crank, and one that rolls out now and then. */}
            <rect className="o" x={136} y={86} width={28} height={30} rx={8} style={fill(C.red)} />
            <circle className="o" cx={150} cy={230} r={110} style={fill(mix(C.ice, 40, C.paper))} />
            <g className="gm-gumballs">{balls.map((b, k) => <circle key={k} className="o" cx={b.x} cy={b.y} r={17} style={fill(b.c)} />)}</g>
            <ellipse cx={110} cy={180} rx={20} ry={36} style={fill(C.paper)} opacity={0.6} transform="rotate(30 110 180)" />
            <circle className="o" cx={150} cy={230} r={110} fill="none" />
            <path className="o" d="M80 330 L220 330 L240 600 L60 600 Z" style={fill(C.red)} />
            <rect className="o" x={110} y={380} width={80} height={60} rx={10} style={fill(mix(C.ink, 20, C.paper))} />
            <g className="gm-crank" style={pivot(150, 410)}><circle className="o" cx={150} cy={410} r={20} style={fill(C.yellow)} /><rect x={146} y={392} width={8} height={36} rx={3} style={fill(C.ink)} /></g>
            <path className="o" d="M120 480 L180 480 L180 520 Q150 540 120 520 Z" style={fill(mix(C.ink, 70, C.red))} />
            <circle className="o gm-gumball-out" cx={150} cy={500} r={14} style={fill(C.blue)} />
            <rect className="o" x={54} y={590} width={192} height={12} rx={4} style={fill(mix(C.red, 60, C.ink))} />
        </svg>
    );
}

export function WingR() {
    const jar = (x: number, y: number, c: string, k: number) => (
        <g key={k}>
            <rect className="o" x={x - 34} y={y - 70} width={68} height={70} rx={14} style={fill(mix(C.ice, 50, C.paper))} />
            {[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={x - 18 + (i % 3) * 18} cy={y - 14 - Math.floor(i / 3) * 18} r={8} style={fill(i % 2 ? c : SPRINKLES[(i + k) % 5])} />)}
            <rect className="o" x={x - 38} y={y - 84} width={76} height={16} rx={6} style={fill(c)} />
        </g>
    );
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            {/* A shelf of sweet jars, and a giant lollipop in a pot. */}
            {[110, 230].map(y => <rect key={y} className="o" x={20} y={y} width={260} height={16} rx={6} style={fill(CAKE)} />)}
            {jar(70, 110, C.pink, 0)}{jar(150, 110, MINT, 1)}{jar(230, 110, C.violet, 2)}
            {jar(90, 230, C.orange, 3)}{jar(210, 230, C.pink, 4)}
            <g className="gm-big-lolly" style={pivot(150, 600)}>
                <path d="M150 600 V380" stroke={C.paper} strokeWidth={12} /><path d="M150 600 V380" stroke={C.ink} strokeWidth={16} strokeOpacity={0.15} />
                <Lolly x={150} y={350} r={70} c={C.pink} />
            </g>
            <path className="o" d="M100 520 L200 520 L190 600 L110 600 Z" style={fill(MINT)} />
        </svg>
    );
}

export function Cabinet() {
    return (
        <g>
            {/* The cupcake crown: a frosting dome with sprinkles, a cherry on top that wobbles. */}
            <g className="gm-cherry" style={pivot(500, 40)}>
                <path d="M500 34 Q510 4 534 0" stroke={mix(C.green, 70, C.ink)} strokeWidth={5} fill="none" />
                <circle className="o" cx={500} cy={40} r={24} style={fill(C.red)} />
                <circle cx={492} cy={32} r={6} style={fill(C.paper)} opacity={0.7} />
            </g>
            <path className="o" d="M70 170 Q50 120 110 112 Q120 64 220 72 Q260 30 380 52 Q440 50 500 58 Q560 50 620 52 Q740 30 780 72 Q880 64 890 112 Q950 120 930 170 Z" style={fill(FROST)} />
            <Sprinkles pts={[[160, 110], [240, 92], [330, 76], [420, 80], [590, 84], [680, 74], [770, 96], [850, 124], [200, 140], [720, 140], [300, 122]]} />
            <text className="gm-marquee is-snoep" x={500} y={124} textAnchor="middle">{NAME}</text>
            <rect className="o gm-body" x={44} y={160} width={912} height={742} rx={36} />
            {/* The wrapper's ridges down the sides, candy-cane posts and a scalloped frosting edge. */}
            {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${60 + i * 9} 180 V880`} stroke={mix(MINT, 70, C.ink)} strokeWidth={3} opacity={0.4} />)}
            {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${860 + i * 9} 180 V880`} stroke={mix(MINT, 70, C.ink)} strokeWidth={3} opacity={0.4} />)}
            {[52, 948].map(x => (
                <g key={x}>
                    <rect className="o" x={x - 14} y={170} width={28} height={720} rx={14} style={fill(C.paper)} />
                    {Array.from({ length: 14 }, (_, i) => <path key={i} d={`M${x - 14} ${190 + i * 50} L${x + 14} ${170 + i * 50} L${x + 14} ${186 + i * 50} L${x - 14} ${206 + i * 50} Z`} style={fill(C.red)} />)}
                    <rect className="o" x={x - 14} y={170} width={28} height={720} rx={14} fill="none" />
                </g>
            ))}
            <path className="o" d="M44 166 Q90 200 136 166 Q182 200 228 166 Q274 200 320 166 Q366 200 412 166 Q458 200 504 166 Q550 200 596 166 Q642 200 688 166 Q734 200 780 166 Q826 200 872 166 Q918 200 956 166 L956 158 L44 158 Z" style={fill(FROST)} />
            <rect className="o gm-trim" x={DISPLAY.x - 34} y={DISPLAY.y - 4} width={DISPLAY.w + 68} height={DISPLAY.h + 26} rx={40} />
            <Bulbs points={rectPoints(DISPLAY.x - 22, DISPLAY.y + 6, DISPLAY.w + 44, DISPLAY.h + 6, 26)} r={8} />
            <rect className="o gm-trim" x={GLASS.x - 18} y={GLASS.y - 16} width={GLASS.w + 36} height={GLASS.h + 32} rx={30} />
            <path className="o gm-panel" d="M58 748 L942 748 L960 890 L40 890 Z" />
            <path className="o" d="M60 886 H940 V930 H60 Z" style={fill(mix(C.pink, 70, C.paper))} />
            <Sprinkles pts={[[120, 908], [240, 912], [380, 906], [520, 910], [660, 906], [800, 912], [890, 908]]} />
        </g>
    );
}

export function Inside() {
    const W = GLASS.w, H = GLASS.h;
    return (
        <g>
            <rect width={W} height={H} style={fill(C.lilac)} />
            {Array.from({ length: 12 }, (_, i) => <rect key={i} x={i * 76} y={0} width={38} height={H} style={fill(C.paper)} opacity={0.4} />)}
            <path d={`M0 ${H * 0.2} Q${W * 0.5} ${H * 0.34} ${W} ${H * 0.2}`} fill="none" stroke={C.ink} strokeWidth={2} />
            {Array.from({ length: 9 }, (_, i) => {
                const t = (i + 0.5) / 9, x = t * W, yy = H * 0.2 + H * 0.28 * t * (1 - t);
                return <path key={i} className="o gm-flag" style={{ ...fill(SPRINKLES[i % 5]), '--k': i % 4 } as CSSProperties} d={`M${x - 16} ${yy} L${x + 16} ${yy} L${x} ${yy + 28} Z`} />;
            })}
            <Lolly x={W * 0.86} y={H * 0.48} r={30} c={C.orange} />
            <path className="o" d={`M0 ${H} L0 ${H * 0.66} Q${W * 0.3} ${H * 0.6} ${W * 0.55} ${H * 0.66} Q${W * 0.8} ${H * 0.6} ${W} ${H * 0.66} L${W} ${H} Z`} style={fill(FROST)} />
            <Sprinkles pts={Array.from({ length: 14 }, (_, i) => [((i * 61) % W), H * 0.74 + ((i * 29) % 90)] as const)} />
        </g>
    );
}

export function Claw() {
    const cane = (
        <g>
            <path className="o" d="M-6 0 L6 0 L8 58 Q12 80 28 84 L24 94 Q0 90 -5 60 Z" style={fill(C.paper)} />
            {[10, 30, 50, 70].map(y => <path key={y} d={`M-6 ${y} L7 ${y - 8} L7.5 ${y - 2} L-5.6 ${y + 6} Z`} style={fill(C.red)} />)}
            <path className="o" d="M-6 0 L6 0 L8 58 Q12 80 28 84 L24 94 Q0 90 -5 60 Z" fill="none" />
            <circle className="o" cx={0} cy={0} r={8} style={fill(C.pink)} />
        </g>
    );
    return (
        <ClawFrom look={{
            hub: (
                <g>
                    <rect className="o" x={46} y={0} width={28} height={24} rx={8} style={fill(C.pink)} />
                    <path className="o" d="M22 40 Q22 18 60 18 Q98 18 98 40 Z" style={fill(FROST)} />
                    <Sprinkles pts={[[40, 30], [56, 25], [72, 30], [84, 35]]} />
                </g>
            ),
            prong: cane,
        }} />
    );
}

// ── The sweets ───────────────────────────────────────────────────────────────────

const PAL: Record<string, string[]> = {
    donut: [mix(C.pink, 55, C.paper), mix(C.orange, 40, C.ink), C.lilac],
    cupcake: [FROST, C.mint, C.cream],
    ijsje: [mix(C.pink, 45, C.paper), C.mint, C.cream],
    lolly: [C.pink, MINT, C.orange],
    snoepje: [C.red, C.violet, mix(C.blue, 70, C.paper)],
    taart: [FROST, mix(C.yellow, 60, C.paper), C.mint],
};

export function Prize({ prize }: { prize: Prize }) {
    const c = PAL[prize.kind]?.[prize.look % 3] ?? PAL.donut[0];
    const arm = (side: 'l' | 'r', y: number) => side === 'l'
        ? <path d={`M18 ${y} Q6 ${y + 4} 6 ${y + 16}`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        : <g className="gm-wave" style={pivot(82, y)}><path d={`M82 ${y} Q94 ${y - 4} 96 ${y - 16}`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" /></g>;
    switch (prize.kind) {
        case 'donut':
            return (
                <g>
                    {arm('l', 62)}{arm('r', 58)}
                    <ellipse className="o" cx={50} cy={60} rx={40} ry={34} style={fill(CAKE)} />
                    <path className="o" d="M14 56 Q12 28 50 26 Q88 28 86 56 Q80 68 72 60 Q66 70 58 62 Q50 72 42 62 Q34 70 28 60 Q20 68 14 56 Z" style={fill(c)} />
                    <Sprinkles pts={[[26, 46], [36, 32], [66, 32], [76, 46], [50, 28]]} />
                    <Face x={50} y={44} s={0.85} gap={13} />
                </g>
            );
        case 'cupcake':
            return (
                <g>
                    {arm('l', 72)}{arm('r', 70)}
                    <path className="o" d="M22 60 L78 60 L70 98 L30 98 Z" style={fill(mix(C.blue, 50, C.paper))} />
                    {[34, 44, 56, 66].map(x => <path key={x} d={`M${x} 62 L${x - 2} 96`} stroke={C.ink} strokeWidth={2} opacity={0.35} />)}
                    <path className="o" d="M16 62 Q10 40 30 36 Q30 14 50 16 Q70 14 70 36 Q90 40 84 62 Z" style={fill(c)} />
                    <circle className="o" cx={50} cy={12} r={8} style={fill(C.red)} />
                    <Sprinkles pts={[[24, 52], [40, 24], [62, 24], [76, 52]]} />
                    <Face x={50} y={42} s={0.85} gap={12} />
                </g>
            );
        case 'ijsje':
            return (
                <g>
                    <path className="o" d="M30 54 L70 54 L50 100 Z" style={fill(CAKE)} />
                    <path d="M36 62 L60 86 M46 56 L66 74 M64 62 L42 86 M54 56 L36 72" stroke={mix(CAKE, 60, C.ink)} strokeWidth={2.4} />
                    <path className="o" d="M22 56 Q14 34 32 26 Q36 6 50 8 Q66 6 68 26 Q86 34 78 56 Q70 62 62 56 Q54 64 46 56 Q38 64 30 56 Z" style={fill(c)} />
                    <g className="gm-wave" style={pivot(76, 44)}><path className="o" d="M76 44 Q90 40 92 28 Q86 26 82 32 Q80 38 72 38 Z" style={fill(c)} /></g>
                    <Face x={50} y={36} />
                </g>
            );
        case 'lolly':
            return (
                <g>
                    <path d="M50 70 V100" stroke={C.paper} strokeWidth={8} /><path d="M50 70 V100" stroke={C.ink} strokeWidth={10} strokeOpacity={0.2} />
                    {arm('l', 46)}{arm('r', 44)}
                    <Lolly x={50} y={42} r={34} c={c} />
                    <circle cx={50} cy={46} r={16} style={fill(c)} />
                    <Face x={50} y={44} s={0.8} gap={11} />
                </g>
            );
        case 'snoepje':
            return (
                <g>
                    <path className="o" d="M22 52 L4 36 L8 52 L4 68 Z" style={fill(c)} />
                    <g className="gm-wave" style={pivot(78, 52)}><path className="o" d="M78 52 L96 36 L92 52 L96 68 Z" style={fill(c)} /></g>
                    <ellipse className="o" cx={50} cy={52} rx={30} ry={24} style={fill(c)} />
                    <path d="M34 34 Q50 52 34 72 M66 34 Q50 52 66 72" stroke={C.paper} strokeWidth={4} fill="none" opacity={0.5} />
                    <Face x={50} y={50} s={0.85} gap={11} />
                </g>
            );
        default:
            // A little round cake: two tiers, a cherry, the face on the top tier.
            return (
                <g>
                    {arm('l', 70)}{arm('r', 66)}
                    <rect className="o" x={12} y={60} width={76} height={38} rx={8} style={fill(CAKE)} />
                    <path d="M12 76 H88" stroke={c} strokeWidth={8} />
                    <path className="o" d="M10 62 Q18 72 26 62 Q34 72 42 62 Q50 72 58 62 Q66 72 74 62 Q82 72 90 62 L90 58 L10 58 Z" style={fill(c)} />
                    <rect className="o" x={22} y={24} width={56} height={38} rx={10} style={fill(c)} />
                    <path className="o" d="M20 30 Q28 38 36 30 Q44 38 50 30 Q58 38 64 30 Q72 38 80 30 L80 22 L20 22 Z" style={fill(C.paper)} />
                    <circle className="o" cx={50} cy={14} r={8} style={fill(C.red)} />
                    <Face x={50} y={44} s={0.8} gap={11} />
                </g>
            );
    }
}

