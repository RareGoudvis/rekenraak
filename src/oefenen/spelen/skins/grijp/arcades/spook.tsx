import type { CSSProperties } from 'react';
import { machineById, type Prize } from '../machines';
import { Bulbs, ClawFrom, Face } from './kit';
import { C, DISPLAY, GLASS, arcPoints, fill, linePoints, mix, pivot } from './layout';

// The spooky-cute arcade: an old stone hall with cobwebs, flickering candles, a round moon window and a friendly bat;
// a spider lives in the machine and dangles on its thread. A purple gothic machine with slime dripping off its crown;
// little monsters and pumpkins inside. Never scary: every face smiles.

const NAME = machineById('spook').name;
const STONE = mix(C.purple, 25, C.ink);
const SLIME = mix(C.lime, 80, C.yellow);
const MOON = mix(C.yellow, 30, C.paper);

function Web({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} stroke={mix(C.paper, 70, C.purple)} strokeWidth={2} fill="none" opacity={0.75}>
            {[0, 22, 45, 68, 90].map(a => <path key={a} d={`M0 0 L${Math.cos((a * Math.PI) / 180) * 120} ${Math.sin((a * Math.PI) / 180) * 120}`} />)}
            {[30, 60, 90].map(r => <path key={r} d={arcPoints(0, 0, r, 0, 90, 5).map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ')} />)}
        </g>
    );
}

function Bat({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <g className="gm-bat-wing is-l" style={pivot(-10, 0)}><path className="o" d="M-10 -4 Q-30 -26 -52 -14 Q-44 -6 -46 4 Q-36 -2 -30 8 Q-22 -2 -10 6 Z" style={fill(mix(C.purple, 60, C.ink))} /></g>
            <g className="gm-bat-wing is-r" style={pivot(10, 0)}><path className="o" d="M10 -4 Q30 -26 52 -14 Q44 -6 46 4 Q36 -2 30 8 Q22 -2 10 6 Z" style={fill(mix(C.purple, 60, C.ink))} /></g>
            <path className="o" d="M-10 -12 L-14 -26 L-4 -16 L4 -16 L14 -26 L10 -12 Z" style={fill(mix(C.purple, 70, C.ink))} />
            <ellipse className="o" cx={0} cy={0} rx={16} ry={15} style={fill(mix(C.purple, 70, C.ink))} />
            <Face x={0} y={-2} s={0.62} gap={10} />
            <path d="M-4 8 L-2 12 L0 8 M2 8 L4 12 L6 8" stroke={C.paper} strokeWidth={1.6} fill={C.paper} />
        </g>
    );
}

export function Room() {
    return (
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden>
            {Array.from({ length: 9 }, (_, r) => Array.from({ length: 11 }, (_, i) => (
                <rect key={`${r}-${i}`} x={i * 160 - (r % 2 ? 80 : 0)} y={r * 90} width={150} height={80} rx={14} style={fill(mix(C.purple, 32, C.ink))} opacity={0.5} />
            )))}
            <Web x={0} y={0} s={1.6} />
            <Web x={1600} y={0} s={1.6} flip />
            <g className="gm-bat-fly"><Bat x={0} y={0} s={1.2} /></g>
        </svg>
    );
}

function Candle({ x, y }: { x: number; y: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <rect className="o" x={-10} y={0} width={20} height={44} rx={4} style={fill(C.cream)} />
            <path d="M-10 8 Q-4 14 -6 22" stroke={C.cream} strokeWidth={6} />
            <g className="gm-flame"><path className="o" d="M0 -26 Q12 -8 0 0 Q-12 -8 0 -26 Z" style={fill(C.yellow)} /><path d="M0 -14 Q5 -6 0 -2 Q-5 -6 0 -14 Z" style={fill(C.orange)} /></g>
            <circle className="gm-candle-glow" cx={0} cy={-10} r={34} style={fill(C.yellow)} />
        </g>
    );
}

export function WingL() {
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            {/* The round moon window. */}
            <circle className="o" cx={150} cy={140} r={104} style={fill(mix(C.ink, 70, C.purple))} />
            <circle cx={150} cy={140} r={92} style={fill(mix(C.blue, 30, C.ink))} />
            <circle className="gm-moon" cx={176} cy={112} r={40} style={fill(MOON)} />
            <circle cx={164} cy={104} r={8} style={fill(mix(MOON, 80, C.ink))} /><circle cx={190} cy={124} r={6} style={fill(mix(MOON, 80, C.ink))} />
            <path className="gm-cloud-drift" d="M80 190 q10 -20 30 -12 q14 -18 34 -4 q20 -6 22 12 Z" style={fill(mix(C.lilac, 40, C.ink))} />
            <path d="M150 36 V244 M46 140 H254" stroke={mix(C.ink, 70, C.purple)} strokeWidth={10} />
            <circle className="o" cx={150} cy={140} r={104} fill="none" />
            {/* A candelabra on a little table, and a gravestone that says BOE. */}
            <rect className="o" x={40} y={390} width={160} height={20} rx={6} style={fill(mix(C.orange, 35, C.ink))} />
            <path d="M60 410 V600 M180 410 V600" stroke={C.ink} strokeWidth={10} />
            <path className="o" d="M80 386 Q80 340 120 340 Q160 340 160 386" fill="none" strokeWidth={6} />
            <path d="M120 386 V330" stroke={C.ink} strokeWidth={6} />
            <Candle x={80} y={338} /><Candle x={120} y={290} /><Candle x={160} y={338} />
            <path className="o" d="M190 600 V520 Q190 470 240 470 Q290 470 290 520 V600 Z" style={fill(mix(C.ink, 40, C.paper))} />
            <text className="gm-grave" x={240} y={540} textAnchor="middle">BOE</text>
            <path d="M190 600 Q210 586 230 600 Q252 588 290 600" style={fill(mix(C.green, 50, C.ink))} />
        </svg>
    );
}

export function WingR() {
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            <Web x={300} y={0} s={1.2} flip />
            <g className="gm-bat-hang"><path d="M150 0 V60" stroke={C.ink} strokeWidth={3} /><g transform="translate(150 84) rotate(180)"><Bat x={0} y={0} s={1.3} /></g></g>
            {/* A cauldron bubbling with green slime. */}
            <g className="gm-bubbles">{[0, 1, 2].map(k => <circle key={k} className="o gm-bubble" style={{ ...fill(SLIME), '--k': k } as CSSProperties} cx={120 + k * 30} cy={430} r={10 + k * 3} />)}</g>
            <ellipse className="o" cx={150} cy={450} rx={110} ry={26} style={fill(SLIME)} />
            <path className="o" d="M40 450 Q36 590 150 590 Q264 590 260 450 Z" style={fill(mix(C.ink, 85, C.purple))} />
            <ellipse className="o" cx={150} cy={450} rx={118} ry={22} fill="none" strokeWidth={8} />
            <path d="M74 590 L60 600 M226 590 L240 600" stroke={C.ink} strokeWidth={8} />
            <g className="gm-fire">{[110, 150, 190].map((x, k) => <path key={x} className="o" style={fill(k === 1 ? C.yellow : C.orange)} d={`M${x} 600 Q${x - 14} 584 ${x} 568 Q${x + 14} 584 ${x} 600 Z`} />)}</g>
        </svg>
    );
}

export function Cabinet() {
    return (
        <g>
            {/* The gothic crown: a pointed arch with bat wings and two little horns. */}
            <path className="o" d="M90 64 L60 20 L130 44 Z" style={fill(mix(C.purple, 60, C.ink))} />
            <path className="o" d="M910 64 L940 20 L870 44 Z" style={fill(mix(C.purple, 60, C.ink))} />
            <path className="o gm-body" d="M70 170 Q70 60 500 10 Q930 60 930 170 Z" />
            <path className="o" d="M40 140 Q-10 90 10 60 Q30 92 60 96 Q50 70 70 56 Q86 100 110 120 Z" style={fill(mix(C.purple, 55, C.ink))} />
            <path className="o" d="M960 140 Q1010 90 990 60 Q970 92 940 96 Q950 70 930 56 Q914 100 890 120 Z" style={fill(mix(C.purple, 55, C.ink))} />
            <text className="gm-marquee is-spook" x={500} y={102} textAnchor="middle">{NAME}</text>
            <rect className="o gm-body" x={44} y={118} width={912} height={784} rx={30} />
            {/* Slime dripping off the top edge. */}
            <path className="o" d="M44 140 L956 140 L956 158 Q930 158 926 176 Q922 196 910 176 Q900 160 860 160 Q830 160 826 196 Q822 226 812 196 Q806 160 760 162 L240 162 Q200 160 196 190 Q192 214 182 190 Q176 160 130 160 Q96 160 92 184 Q88 204 78 182 Q72 160 44 160 Z" style={fill(SLIME)} />
            <path className="gm-drip" d="M820 196 Q826 214 818 214 Q810 214 816 196" style={fill(SLIME)} />
            <rect className="o gm-trim" x={DISPLAY.x - 34} y={DISPLAY.y - 4} width={DISPLAY.w + 68} height={DISPLAY.h + 26} rx={22} />
            <Bulbs points={linePoints([DISPLAY.x - 16, DISPLAY.y + 4], [DISPLAY.x + DISPLAY.w + 16, DISPLAY.y + 4], 20)} r={7} kind="blink" />
            <path className="o gm-trim" d={`M${GLASS.x - 18} ${GLASS.y + GLASS.h + 16} V${GLASS.y + 30} Q${GLASS.x - 18} ${GLASS.y - 16} ${GLASS.x + 40} ${GLASS.y - 16} H${GLASS.x + GLASS.w - 40} Q${GLASS.x + GLASS.w + 18} ${GLASS.y - 16} ${GLASS.x + GLASS.w + 18} ${GLASS.y + 30} V${GLASS.y + GLASS.h + 16} Z`} />
            {/* Eyes in the dark sides, blinking now and then. */}
            {[[64, 420], [936, 560], [64, 650]].map(([x, y], k) => (
                <g key={k} className="gm-side-eyes" style={{ '--k': k } as CSSProperties}><ellipse cx={x - 8} cy={y} rx={5} ry={7} style={fill(C.yellow)} /><ellipse cx={x + 8} cy={y} rx={5} ry={7} style={fill(C.yellow)} /></g>
            ))}
            <path className="o gm-panel" d="M58 748 L942 748 L960 890 L40 890 Z" />
            <path className="o" d="M60 886 H940 V930 H60 Z" style={fill(STONE)} />
            {[160, 500, 840].map(x => <path key={x} className="o" d={`M${x - 30} 930 Q${x} 900 ${x + 30} 930`} style={fill(mix(C.purple, 40, C.ink))} />)}
        </g>
    );
}

export function Inside() {
    const W = GLASS.w, H = GLASS.h;
    return (
        <g>
            <rect width={W} height={H} style={fill(mix(C.purple, 40, C.ink))} />
            <circle cx={W * 0.3} cy={H * 0.3} r={54} style={fill(MOON)} opacity={0.9} />
            {Array.from({ length: 9 }, (_, i) => <circle key={i} className="gm-star-dot" style={{ ...fill(C.paper), '--k': i % 5 } as CSSProperties} cx={(i * 97) % W} cy={20 + ((i * 53) % 140)} r={2.5} />)}
            {/* Little gravestones and a crooked fence far behind the heap. */}
            {[0.18, 0.42, 0.64, 0.86].map((x, k) => <path key={x} className="o" d={`M${W * x - 22} ${H * 0.64} V${H * 0.5} Q${W * x} ${H * 0.42 - k * 4} ${W * x + 22} ${H * 0.5} V${H * 0.64} Z`} style={fill(mix(C.ink, 40, C.lilac))} />)}
            <path className="o" d={`M0 ${H} L0 ${H * 0.66} Q${W * 0.3} ${H * 0.58} ${W * 0.55} ${H * 0.66} Q${W * 0.8} ${H * 0.6} ${W} ${H * 0.66} L${W} ${H} Z`} style={fill(mix(C.green, 30, C.ink))} />
            <Web x={W} y={0} s={0.9} flip />
            {/* The spider who lives here: down on its thread, a little wiggle, back up. */}
            <g className="gm-spider" style={pivot(W * 0.62, 0)}>
                <path d={`M${W * 0.62} 0 V${H * 0.2}`} stroke={mix(C.paper, 70, C.purple)} strokeWidth={2} />
                <g transform={`translate(${W * 0.62} ${H * 0.2 + 14})`}>
                    {[-1, 1].map(d => [0, 1, 2].map(k => <path key={`${d}${k}`} className="gm-spider-leg" d={`M0 0 Q${d * 18} ${-10 + k * 8} ${d * 24} ${4 + k * 8}`} fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" />))}
                    <circle className="o" r={14} style={fill(mix(C.ink, 85, C.purple))} />
                    <Face x={0} y={-1} s={0.55} gap={9} eye={C.paper} cheeks />
                </g>
            </g>
        </g>
    );
}

export function Claw() {
    const bone = mix(C.lime, 35, C.paper);
    return (
        <ClawFrom look={{
            hub: (
                <g>
                    <rect className="o" x={46} y={0} width={28} height={24} rx={6} style={fill(mix(C.purple, 50, C.ink))} />
                    <path className="o" d="M22 26 Q60 12 98 26 L94 44 Q60 54 26 44 Z" style={fill(mix(C.purple, 50, C.ink))} />
                    <ellipse cx={46} cy={36} rx={5} ry={6} style={fill(C.yellow)} className="gm-hub-eye" /><ellipse cx={74} cy={36} rx={5} ry={6} style={fill(C.yellow)} className="gm-hub-eye" />
                </g>
            ),
            prong: (
                <g>
                    <path className="o" d="M-6 0 L6 0 L7 40 Q12 46 8 52 L10 74 Q16 82 24 84 L22 92 Q4 92 0 76 L-2 52 Q-8 46 -4 40 Z" style={fill(bone)} />
                    <circle className="o" cx={0} cy={0} r={8} style={fill(mix(C.purple, 50, C.ink))} />
                </g>
            ),
        }} />
    );
}

// ── The little monsters ──────────────────────────────────────────────────────────

const PAL: Record<string, string[]> = {
    spookje: [C.paper, C.ice, C.mint],
    pompoen: [C.orange, mix(C.orange, 70, C.yellow), mix(C.orange, 80, C.red)],
    monster: [C.violet, mix(C.blue, 70, C.mint), mix(C.green, 75, C.paper)],
    vleermuis: [mix(C.purple, 60, C.ink), mix(C.purple, 80, C.paper), mix(C.ink, 60, C.blue)],
    slijm: [SLIME, mix(C.pink, 70, C.paper), mix(C.blue, 60, C.mint)],
    mummie: [mix(C.cream, 60, C.paper), mix(C.peach, 60, C.paper), mix(C.ice, 50, C.paper)],
};

export function Prize({ prize }: { prize: Prize }) {
    const c = PAL[prize.kind]?.[prize.look % 3] ?? PAL.spookje[0];
    const dark = mix(c, 60, C.ink);
    switch (prize.kind) {
        case 'spookje':
            return (
                <g>
                    <path className="o" d="M18 98 V44 Q18 10 50 10 Q82 10 82 44 V98 L72 90 L62 98 L50 90 L38 98 L28 90 Z" style={fill(c)} />
                    <path className="o" d="M20 60 Q6 62 8 50 Q14 50 20 48" style={fill(c)} />
                    <g className="gm-wave" style={pivot(80, 52)}><path className="o" d="M80 50 Q96 44 94 32 Q86 36 80 40" style={fill(c)} /></g>
                    <Face x={50} y={42} mouth="open" />
                </g>
            );
        case 'pompoen':
            return (
                <g>
                    <path className="o" d="M48 28 Q46 12 56 6 L60 12 Q54 18 56 28 Z" style={fill(mix(C.green, 60, C.ink))} />
                    <g className="gm-wave" style={pivot(56, 18)}><path className="o" d="M58 16 Q74 4 84 14 Q72 24 58 20 Z" style={fill(C.green)} /></g>
                    <ellipse className="o" cx={50} cy={64} rx={42} ry={34} style={fill(c)} />
                    <path d="M50 30 Q34 64 50 98 M50 30 Q66 64 50 98 M30 34 Q18 64 30 94 M70 34 Q82 64 70 94" stroke={dark} strokeWidth={3} fill="none" />
                    <Face x={50} y={56} mouth="grin" cheeks={false} />
                </g>
            );
        case 'monster':
            return (
                <g>
                    <path className="o" d="M28 22 L22 2 L38 16 Z M72 22 L78 2 L62 16 Z" style={fill(C.cream)} />
                    <path className="o" d="M16 98 Q10 60 16 40 Q20 14 50 14 Q80 14 84 40 Q90 60 84 98 Z" style={fill(c)} />
                    {[[30, 70], [66, 80], [44, 88]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={4} style={fill(dark)} />)}
                    <path className="o" d="M16 62 Q4 70 6 82" fill="none" strokeWidth={8} style={{ stroke: c }} />
                    <g className="gm-wave" style={pivot(84, 56)}><path d="M84 58 Q98 50 96 36" fill="none" strokeWidth={8} strokeLinecap="round" style={{ stroke: c }} /></g>
                    <circle className="o" cx={50} cy={40} r={15} style={fill(C.paper)} />
                    <g className="gm-eyes"><circle cx={52} cy={41} r={8} style={fill(C.ink)} /><circle cx={55} cy={37} r={3} style={fill(C.paper)} /></g>
                    <path className="gm-mouth" d="M38 62 Q50 72 62 62" fill="none" />
                    <path d="M44 64 L46 69 L48 65 M54 65 L56 69 L58 64" stroke={C.paper} strokeWidth={2} fill={C.paper} />
                </g>
            );
        case 'vleermuis':
            return (
                <g>
                    <path className="o" d="M30 40 Q6 20 2 50 Q10 48 14 56 Q20 50 26 58 Q30 50 36 54 Z" style={fill(dark)} />
                    <g className="gm-wave" style={pivot(70, 46)}><path className="o" d="M70 40 Q94 20 98 50 Q90 48 86 56 Q80 50 74 58 Q70 50 64 54 Z" style={fill(dark)} /></g>
                    <path className="o" d="M32 30 L30 8 L44 22 Z M68 30 L70 8 L56 22 Z" style={fill(c)} />
                    <ellipse className="o" cx={50} cy={64} rx={26} ry={32} style={fill(c)} />
                    <ellipse cx={50} cy={78} rx={14} ry={14} style={fill(mix(c, 60, C.paper))} />
                    <Face x={50} y={46} gap={11} mouth="smile" />
                    <path d="M45 54 L47 59 L49 54 M51 54 L53 59 L55 54" stroke={C.paper} strokeWidth={1.8} fill={C.paper} />
                </g>
            );
        case 'slijm':
            return (
                <g>
                    <path className="o" d="M10 98 Q4 98 8 86 Q14 60 24 40 Q34 16 50 16 Q66 16 76 40 Q86 60 92 86 Q96 98 90 98 Z" style={fill(c)} />
                    <g className="gm-wave" style={pivot(80, 60)}><path className="o" d="M80 60 Q98 54 96 38 Q90 40 86 48 Q84 54 78 54 Z" style={fill(c)} /></g>
                    <path className="gm-drip" d="M30 98 Q32 106 28 108 Q24 106 26 98" style={fill(c)} />
                    <ellipse cx={36} cy={32} rx={6} ry={9} style={fill(C.paper)} opacity={0.6} />
                    <Face x={50} y={52} mouth="open" />
                </g>
            );
        default:
            return (
                <g>
                    <rect className="o" x={22} y={14} width={56} height={84} rx={26} style={fill(c)} />
                    {[30, 44, 58, 72, 86].map((y, k) => <path key={y} d={`M22 ${y} Q50 ${y + (k % 2 ? 8 : -6)} 78 ${y + 4}`} stroke={dark} strokeWidth={2.4} fill="none" opacity={0.6} />)}
                    <path className="o" d="M22 62 Q10 66 10 54" fill="none" strokeWidth={10} style={{ stroke: c }} />
                    <g className="gm-wave" style={pivot(78, 58)}><path d="M78 60 Q92 54 92 40" fill="none" strokeWidth={10} strokeLinecap="round" style={{ stroke: c }} /></g>
                    <rect x={28} y={34} width={44} height={20} rx={10} style={fill(mix(C.ink, 70, C.purple))} />
                    <g className="gm-eyes">{[39, 61].map(x => <circle key={x} cx={x} cy={44} r={5} style={fill(C.paper)} />)}{[40, 62].map(x => <circle key={x} cx={x} cy={44} r={2.6} style={fill(C.ink)} />)}</g>
                    <path className="gm-mouth" d="M44 64 Q50 70 56 64" fill="none" />
                </g>
            );
    }
}

