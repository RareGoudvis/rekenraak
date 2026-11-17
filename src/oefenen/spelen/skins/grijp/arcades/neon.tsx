import type { CSSProperties, ReactNode } from 'react';
import { machineById, type Prize } from '../machines';
import { Bulbs, ClawFrom, Face, Plush } from './kit';
import { C, DISPLAY, GLASS, fill, mix, pivot, rectPoints, type PlushLook } from './layout';

// The neon arcade (80s): a dark hall with pink and cyan neon tubes, a buzzing ARCADE sign, old cabinets blinking beside
// the machine and a disco ball throwing spots. A chrome-and-pink machine with a lightning crown; plush animals inside.

const NAME = machineById('neon').name;
const PINK = C.pink;
const CYAN = mix(C.blue, 55, C.mint);

export function Room() {
    const zig = Array.from({ length: 33 }, (_, i) => `${i * 50},${i % 2 ? 70 : 40}`).join(' ');
    return (
        <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" aria-hidden>
            <polyline className="gm-neon is-pink" points={zig} fill="none" />
            <polyline className="gm-neon is-cyan" points={Array.from({ length: 33 }, (_, i) => `${i * 50},${i % 2 ? 120 : 150}`).join(' ')} fill="none" />
            {[[90, 300], [1510, 260], [40, 520], [1560, 480], [330, 200], [1280, 210]].map(([x, y], k) => (
                <path key={k} className="gm-neon-star" style={{ '--k': k } as CSSProperties} transform={`translate(${x} ${y})`} d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4 Z" />
            ))}
            {/* The disco ball's light spots sweeping over the wall. */}
            {[0, 1, 2, 3, 4, 5].map(k => <circle key={k} className="gm-disco-spot" cx={200 + k * 240} cy={260 + (k % 3) * 120} r={14 + (k % 2) * 6} style={{ '--k': k } as CSSProperties} />)}
        </svg>
    );
}

// An old upright cabinet with a blinking screen; kind = what plays on it.
function OldCabinet({ x, kind }: { x: number; kind: 'invader' | 'pong' }) {
    return (
        <g transform={`translate(${x} 0)`}>
            <path className="o" d="M40 210 L200 210 L214 240 L200 330 L216 600 L24 600 L40 330 L26 240 Z" style={fill(mix(C.purple, 55, C.ink))} />
            <rect className="o" x={36} y={178} width={168} height={46} rx={8} style={fill(kind === 'invader' ? PINK : CYAN)} />
            <text className="gm-cab-label" x={120} y={210} textAnchor="middle">{kind === 'invader' ? 'INVADER' : 'PONG'}</text>
            <rect className="o" x={52} y={244} width={136} height={104} rx={8} style={fill(mix(C.ink, 90, C.blue))} />
            {kind === 'invader' ? (
                <g className="gm-invader" style={fill(mix(C.lime, 80, C.paper))}>
                    {[[0, 0, 2, 1], [6, 0, 2, 1], [1, 1, 6, 1], [0, 2, 8, 1], [0, 3, 2, 1], [3, 3, 2, 1], [6, 3, 2, 1], [0, 4, 8, 1], [1, 5, 1, 1], [6, 5, 1, 1]].map(([px, py, w, h], k) => (
                        <rect key={k} x={92 + px * 7} y={268 + py * 7} width={w * 7} height={h * 7} />
                    ))}
                </g>
            ) : (
                <g style={fill(C.paper)}>
                    <rect className="gm-pong-l" x={62} y={280} width={6} height={26} />
                    <rect className="gm-pong-r" x={172} y={286} width={6} height={26} />
                    <rect className="gm-pong-ball" x={116} y={292} width={8} height={8} />
                    <path d="M120 252 V340" stroke={C.paper} strokeDasharray="6 6" strokeWidth={2} opacity={0.5} />
                </g>
            )}
            <text className="gm-blink-text" x={120} y={340} textAnchor="middle">1UP</text>
            <path className="o" d="M34 358 L206 358 L214 400 L26 400 Z" style={fill(mix(C.purple, 35, C.ink))} />
            <rect className="o" x={78} y={364} width={8} height={26} rx={3} style={fill(C.ink)} />
            <circle className="o" cx={82} cy={364} r={9} style={fill(C.red)} />
            <circle className="o" cx={140} cy={382} r={8} style={fill(C.yellow)} />
            <circle className="o" cx={166} cy={382} r={8} style={fill(CYAN)} />
            <rect x={60} y={440} width={120} height={8} rx={4} style={fill(PINK)} className="gm-neon-strip" />
            <rect className="o" x={96} y={500} width={48} height={40} rx={6} style={fill(mix(C.ink, 80, C.yellow))} />
        </g>
    );
}

function DiscoBall() {
    return (
        <g transform="translate(150 0)">
            <path d="M0 0 V54" stroke={C.ink} strokeWidth={4} />
            <g className="gm-disco">
                <circle className="o" cx={0} cy={96} r={44} style={fill(mix(C.ice, 60, C.paper))} />
                <g opacity={0.7}>
                    {[-30, -10, 10, 30].map(dy => <path key={dy} d={`M${-Math.sqrt(44 * 44 - dy * dy)} ${96 + dy} H${Math.sqrt(44 * 44 - dy * dy)}`} stroke={mix(C.ink, 40, C.ice)} strokeWidth={2} />)}
                    {[-26, -8, 8, 26].map(dx => <ellipse key={dx} className="gm-disco-line" cx={0} cy={96} rx={Math.abs(dx)} ry={44} fill="none" stroke={mix(C.ink, 40, C.ice)} strokeWidth={2} />)}
                </g>
                {[[-18, 80], [14, 70], [22, 106], [-10, 116]].map(([dx, dy], k) => <path key={k} className="gm-twinkle" style={{ '--k': k } as CSSProperties} transform={`translate(${dx} ${dy})`} d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" />)}
            </g>
        </g>
    );
}

export function WingL() {
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            <DiscoBall />
            <OldCabinet x={30} kind="invader" />
        </svg>
    );
}

export function WingR() {
    return (
        <svg viewBox="0 0 300 600" preserveAspectRatio="xMidYMax meet" aria-hidden>
            <rect className="o" x={20} y={30} width={260} height={92} rx={20} style={fill(mix(C.ink, 85, C.purple))} />
            <text className="gm-neon-word" x={150} y={98} textAnchor="middle">
                {'ARCADE'.split('').map((ch, i) => <tspan key={i} className={i === 3 ? 'is-buzz' : undefined}>{ch}</tspan>)}
            </text>
            <OldCabinet x={50} kind="pong" />
        </svg>
    );
}

export function Cabinet() {
    return (
        <g>
            {/* The crown: a chrome arch with the name in pink neon and two lightning bolts. */}
            <path className="o" d="M70 150 C70 -14 930 -14 930 150 Z" style={fill(mix(C.ice, 50, C.paper))} />
            <path d="M110 140 C120 22 880 22 890 140" fill="none" stroke={PINK} strokeWidth={10} className="gm-neon-line" />
            <text className="gm-marquee" x={500} y={96} textAnchor="middle">{NAME}</text>
            {[150, 850].map((x, k) => <path key={x} className="o gm-bolt" style={{ '--k': k } as CSSProperties} transform={`translate(${x} 78) scale(${k ? -1 : 1} 1)`} d="M8 -36 L-14 4 L0 4 L-8 36 L18 -8 L4 -8 L12 -36 Z" />)}
            {/* The body and the glass's chrome frame. */}
            <rect className="o gm-body" x={44} y={118} width={912} height={784} rx={44} />
            <rect className="gm-body-2" x={56} y={130} width={40} height={760} rx={18} opacity={0.55} />
            <rect className="o gm-trim" x={DISPLAY.x - 34} y={DISPLAY.y - 22} width={DISPLAY.w + 68} height={DISPLAY.h + 44} rx={26} />
            <Bulbs points={rectPoints(DISPLAY.x - 20, DISPLAY.y - 10, DISPLAY.w + 40, DISPLAY.h + 20, 30)} r={8} />
            <rect className="o gm-trim" x={GLASS.x - 18} y={GLASS.y - 16} width={GLASS.w + 36} height={GLASS.h + 32} rx={22} />
            {/* Cyan neon tubes up both sides. */}
            {[62, 938].map(x => <rect key={x} className="gm-neon-tube" x={x - 9} y={290} width={18} height={430} rx={9} style={fill(CYAN)} />)}
            {/* The slanted control panel and the plinth with its pink stripe. */}
            <path className="o gm-panel" d="M58 748 L942 748 L960 890 L40 890 Z" />
            <path d="M58 748 L942 748" stroke={PINK} strokeWidth={6} />
            <rect className="o" x={60} y={886} width={880} height={44} rx={12} style={fill(mix(C.ink, 85, C.purple))} />
            <rect x={90} y={902} width={820} height={10} rx={5} style={fill(PINK)} className="gm-neon-strip" />
        </g>
    );
}

export function Inside() {
    const W = GLASS.w, H = GLASS.h;
    return (
        <g>
            <rect width={W} height={H} style={fill(mix(C.purple, 30, C.ink))} />
            {/* A retro grid floor going off into the distance, and a neon sunset. */}
            <circle cx={W * 0.62} cy={H * 0.62} r={110} style={fill(mix(PINK, 70, C.orange))} opacity={0.75} />
            {[0, 1, 2, 3].map(k => <rect key={k} x={W * 0.62 - 120} y={H * 0.55 + k * 16} width={240} height={5 + k} style={fill(mix(C.purple, 30, C.ink))} />)}
            <rect y={H * 0.62} width={W} height={H * 0.38} style={fill(mix(C.purple, 45, C.ink))} />
            {[-6, -4, -2, 0, 2, 4, 6, 8].map(k => <path key={k} d={`M${W * 0.62} ${H * 0.62} L${W * 0.62 + k * 160} ${H}`} stroke={CYAN} strokeWidth={2} opacity={0.6} />)}
            {[0.66, 0.72, 0.8, 0.9].map(y => <path key={y} d={`M0 ${H * y} H${W}`} stroke={CYAN} strokeWidth={2} opacity={0.6} />)}
            <path className="gm-neon is-pink gm-inside-star" transform={`translate(${W * 0.2} ${H * 0.3})`} d="M0 -34 L9 -10 L34 -10 L14 6 L22 32 L0 16 L-22 32 L-14 6 L-34 -10 L-9 -10 Z" fill="none" />
            <text className="gm-neon-win" x={W * 0.88} y={H * 0.25} textAnchor="middle">WIN!</text>
            {/* The heap's floor. */}
            <path className="o" d={`M0 ${H} L0 ${H * 0.86} Q${W * 0.3} ${H * 0.78} ${W * 0.55} ${H * 0.82} Q${W * 0.8} ${H * 0.76} ${W} ${H * 0.84} L${W} ${H} Z`} style={fill(mix(C.purple, 60, C.ink))} />
        </g>
    );
}

export function Claw() {
    const steel = mix(C.ice, 45, C.paper);
    return (
        <ClawFrom look={{
            hub: (
                <g>
                    <rect className="o" x={44} y={0} width={32} height={26} rx={6} style={fill(steel)} />
                    <rect className="o" x={26} y={22} width={68} height={22} rx={10} style={fill(mix(C.ink, 35, C.ice))} />
                    <circle className="o gm-claw-light" cx={60} cy={33} r={6} />
                </g>
            ),
            prong: (
                <g>
                    <path className="o" d="M-6 0 L6 0 L9 52 Q12 76 26 86 L20 94 Q-2 80 -5 54 Z" style={fill(steel)} />
                    <circle className="o" cx={0} cy={0} r={8} style={fill(mix(C.ink, 35, C.ice))} />
                </g>
            ),
            middle: <path className="o" d="M-6 0 L6 0 L5 70 Q0 88 -5 70 Z" style={fill(mix(C.ink, 20, C.ice))} />,
        }} />
    );
}

// ── The plush animals ───────────────────────────────────────────────────────────

const LOOKS: Record<string, PlushLook[]> = {
    beer: [{ body: mix(C.orange, 55, C.ink), belly: C.cream }, { body: mix(C.orange, 70, C.yellow), belly: C.cream }, { body: mix(C.rose, 70, C.pink), belly: C.paper }],
    konijn: [{ body: mix(C.paper, 92, C.ink), belly: C.rose }, { body: C.lilac, belly: C.paper }, { body: C.mint, belly: C.paper }],
    kat: [{ body: mix(C.orange, 85, C.paper), belly: C.cream, dark: mix(C.orange, 60, C.ink) }, { body: mix(C.ink, 35, C.paper), belly: C.paper }, { body: mix(C.ink, 75, C.purple), belly: mix(C.ink, 30, C.paper) }],
    kikker: [{ body: mix(C.green, 85, C.paper), belly: C.cream }, { body: mix(C.lime, 70, C.yellow), belly: C.paper }, { body: mix(C.blue, 60, C.green), belly: C.ice }],
    dino: [{ body: mix(C.green, 70, C.blue), belly: C.cream }, { body: C.violet, belly: C.lilac }, { body: mix(C.orange, 75, C.red), belly: C.cream }],
    octopus: [{ body: mix(C.pink, 75, C.paper), belly: C.rose }, { body: C.violet, belly: C.lilac }, { body: mix(C.blue, 70, C.paper), belly: C.ice }],
};

function Octopus({ look }: { look: PlushLook }) {
    const legs = [16, 30, 44, 58, 72];
    return (
        <g>
            {legs.map(x => <path key={x} className="o" d={`M${x + 4} 66 Q${x - 4} 88 ${x + 2} 98 Q${x + 10} 100 ${x + 10} 90 Q${x + 8} 80 ${x + 14} 68 Z`} style={fill(look.body)} />)}
            <g className="gm-wave" style={pivot(80, 64)}>
                <path className="o" d="M78 62 Q96 60 98 44 Q100 36 92 38 Q90 50 76 54 Z" style={fill(look.body)} />
            </g>
            <path className="o" d="M14 70 Q8 16 50 14 Q92 16 86 70 Z" style={fill(look.body)} />
            {[[30, 30], [66, 26], [72, 52]].map(([x, y]) => <circle key={x} cx={x} cy={y} r={4} style={fill(look.belly)} />)}
            <Face x={50} y={46} mouth="o" />
        </g>
    );
}

export function Prize({ prize }: { prize: Prize }) {
    const look = LOOKS[prize.kind]?.[prize.look % 3] ?? LOOKS.beer[0];
    const dark = look.dark ?? mix(look.body, 65, C.ink);
    let back: ReactNode = null, front: ReactNode = null, face: ReactNode = undefined;
    switch (prize.kind) {
        case 'octopus': return <Octopus look={look} />;
        case 'beer':
            back = <g style={fill(look.body)}><circle className="o" cx={30} cy={24} r={10} /><circle className="o" cx={70} cy={24} r={10} /><circle cx={30} cy={24} r={5} style={fill(look.belly)} /><circle cx={70} cy={24} r={5} style={fill(look.belly)} /></g>;
            front = <><ellipse className="o" cx={50} cy={54} rx={11} ry={8} style={fill(look.belly)} /><ellipse cx={50} cy={50.5} rx={4} ry={3} style={fill(C.ink)} /></>;
            face = <Face x={50} y={40} gap={12} cheeks={false} mouth="none" />;
            break;
        case 'konijn':
            back = <g style={fill(look.body)}><g className="gm-ear" style={pivot(38, 26)}><ellipse className="o" cx={38} cy={4} rx={8} ry={22} transform="rotate(-10 38 4)" /><ellipse cx={38} cy={6} rx={3.5} ry={14} transform="rotate(-10 38 6)" style={fill(look.belly)} /></g><ellipse className="o" cx={62} cy={4} rx={8} ry={22} transform="rotate(12 62 4)" /><ellipse cx={62} cy={6} rx={3.5} ry={14} transform="rotate(12 62 6)" style={fill(look.belly)} /></g>;
            front = <><ellipse cx={50} cy={52} rx={4} ry={3} style={fill(mix(C.pink, 70, C.paper))} /><path d="M46 60 h8" stroke={C.ink} strokeWidth={2} /></>;
            face = <Face x={50} y={44} mouth="smile" />;
            break;
        case 'kat':
            back = <g style={fill(look.body)}><path className="o" d="M28 30 L30 6 L48 22 Z" /><path className="o" d="M72 30 L70 6 L52 22 Z" /><path d="M32 24 L33 13 L41 21 Z" style={fill(C.rose)} /><path d="M68 24 L67 13 L59 21 Z" style={fill(C.rose)} /></g>;
            front = <g stroke={C.ink} strokeWidth={1.8} strokeLinecap="round"><path d="M26 52 L12 49 M26 56 L12 58 M74 52 L88 49 M74 56 L88 58" /><path d="M40 24 L42 32 M50 21 V30 M60 24 L58 32" stroke={dark} strokeWidth={3} /><path d="M47 51 L53 51 L50 55 Z" fill={C.ink} /></g>;
            face = <Face x={50} y={44} mouth="smile" />;
            break;
        case 'kikker':
            back = <g style={fill(look.body)}><circle className="o" cx={33} cy={24} r={12} /><circle className="o" cx={67} cy={24} r={12} /></g>;
            face = (
                <g>
                    <g className="gm-eyes">{[33, 67].map(x => <g key={x}><circle cx={x} cy={24} r={6} style={fill(C.ink)} /><circle cx={x + 2} cy={21.5} r={2.2} style={fill(C.paper)} /></g>)}</g>
                    <path className="gm-mouth" d="M30 50 Q50 64 70 50" fill="none" />
                    <g style={fill(mix(C.rose, 90, C.red))} opacity={0.55}><ellipse cx={26} cy={52} rx={5} ry={3.5} /><ellipse cx={74} cy={52} rx={5} ry={3.5} /></g>
                </g>
            );
            break;
        case 'dino':
            back = <g style={fill(dark)}>{[[50, 16], [64, 20], [74, 30], [36, 20]].map(([x, y], k) => <path key={k} className="o" d={`M${x - 7} ${y + 6} L${x} ${y - 10} L${x + 7} ${y + 6} Z`} />)}<path className="o" d="M22 88 Q2 92 4 78 Q14 84 26 78 Z" style={fill(look.body)} /></g>;
            front = <><ellipse className="o" cx={50} cy={54} rx={16} ry={10} style={fill(look.body)} /><circle cx={44} cy={52} r={1.8} style={fill(C.ink)} /><circle cx={56} cy={52} r={1.8} style={fill(C.ink)} /><path d="M40 60 Q50 66 60 60" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" /></>;
            face = <Face x={50} y={38} gap={13} mouth="none" />;
            break;
    }
    return <Plush look={look} back={back} front={front} face={face} />;
}


