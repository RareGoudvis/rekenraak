import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import type { Side } from '../../duel/types';
import { DOMES, LAUNCHER, VIEW, arcOf, seeded, toScene, type Pt } from './geometry';
import { baseStage, type BaseStage, type Part } from './rule';

// The Meteorietenregen scene: two bases on red Mars ground under a dusky sky with stars and two moons, a rover
// and dust devils between them. Code-drawn SVG, flat fills under the thick --spel-ink outline. Everything moves
// by CSS (meteorietenregen.css); this file only says what is where. The right base is the left one mirrored.

// ── Characters ─────────────────────────────────────────────────────────────────

// idle: bobbing; cheer: arms up, jumping; panic: arms over the helmet, shaking; calm: a thumbs up behind the
// shield; hit: knocked about, sooty, dizzy stars; sooty: next to the crater, dizzy; won: cheering on and on.
export type Mood = 'idle' | 'cheer' | 'panic' | 'calm' | 'hit' | 'sooty' | 'won';

const ARMS: Record<Mood, string> = {
    idle: 'M-11 -30 Q-17 -20 -15 -12 M11 -30 Q17 -20 15 -12',
    cheer: 'M-11 -32 L-20 -52 M11 -32 L20 -52',
    won: 'M-11 -32 L-20 -52 M11 -32 L20 -52',
    panic: 'M-11 -32 Q-22 -48 -8 -58 M11 -32 Q22 -48 8 -58',
    calm: 'M-11 -30 Q-17 -20 -15 -12 M11 -32 Q22 -34 24 -44',
    hit: 'M-11 -30 L-22 -22 M11 -30 L22 -38',
    sooty: 'M-11 -30 L-20 -20 M11 -30 L20 -20',
};
const MOUTH: Record<Mood, string> = {
    idle: 'M-3 -46 Q0 -43 3 -46',
    cheer: 'M-4 -47 Q0 -41 4 -47 Z',
    won: 'M-4 -47 Q0 -41 4 -47 Z',
    panic: 'M-2.5 -45 A2.5 3 0 1 0 2.5 -45 A2.5 3 0 1 0 -2.5 -45 Z',
    calm: 'M-3 -46 Q0 -43 4 -47',
    hit: 'M-4 -45 q2 -2 4 0 t4 0',
    sooty: 'M-4 -45 q2 -2 4 0 t4 0',
};

function DizzyStars() {
    return (
        <g transform="translate(0 -70)">
            <g className="mt-dizzy">
                {[0, 120, 240].map(a => <path key={a} className="mt-dizzy-star" transform={`rotate(${a}) translate(13 0)`} d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z" />)}
            </g>
        </g>
    );
}

/** A little astronaut, feet at (0, 0), facing +x (towards the other base). */
export function Astronaut({ mood }: { mood: Mood }) {
    const sooty = mood === 'hit' || mood === 'sooty';
    return (
        <g className={`mt-astro is-${mood}`}>
            <g className="mt-astro-body">
                <rect className="mt-pack" x="-16" y="-36" width="9" height="20" rx="3" />
                <path className="mt-legs" d="M-6 -14 L-7 -2 M6 -14 L7 -2" />
                <path className="mt-boot" d="M-12 0 h10 v-5 h-10 Z M2 0 h10 v-5 h-10 Z" />
                <rect className="mt-suit-fill" x="-12" y="-36" width="24" height="24" rx="8" />
                <rect className="mt-team" x="-6" y="-30" width="12" height="7" rx="2" />
                <path className="mt-arm" d={ARMS[mood]} />
                <circle className="mt-helmet" cx="0" cy="-48" r="13" />
                <ellipse className="mt-face" cx="2" cy="-47" rx="9" ry="8" />
                <circle className="mt-eye" cx="-1" cy="-49" r={mood === 'panic' ? 2.2 : 1.6} />
                <circle className="mt-eye" cx="5" cy="-49" r={mood === 'panic' ? 2.2 : 1.6} />
                <path className={`mt-mouth${mood === 'cheer' || mood === 'won' || mood === 'panic' ? ' is-open' : ''}`} d={MOUTH[mood]} transform="translate(2 0)" />
                {sooty && <path className="mt-soot" d="M-4 -44 q3 -3 6 0 q3 3 6 0 M-2 -52 q2 2 4 0" />}
                <path className="mt-glass" d="M-5 -55 Q2 -59 8 -54" />
                <path className="mt-astro-ant" d="M-6 -60 L-9 -68" />
                <circle className="mt-astro-tip" cx="-9" cy="-69" r="2.4" />
                {mood === 'panic' && <path className="mt-sweat" d="M14 -58 q3 4 0 6 q-3 -2 0 -6 Z M-14 -54 q3 4 0 6 q-3 -2 0 -6 Z" />}
            </g>
            {sooty && <DizzyStars />}
            {mood === 'panic' && (
                <g transform="translate(16 -78)">
                    <g className="mt-alert">
                        <path className="mt-alert-bg" d="M0 -12 A11 11 0 1 1 -0.1 -12 Z M-4 9 L-8 15 L2 10 Z" />
                        <path className="mt-alert-mark" d="M0 -6 V2 M0 6 V6.5" />
                    </g>
                </g>
            )}
        </g>
    );
}

/** The base's helper robot on treads, at (0, 0), facing +x. */
export function Robot({ mood }: { mood: Mood }) {
    const happy = mood === 'cheer' || mood === 'won' || mood === 'calm';
    return (
        <g className={`mt-bot is-${mood}`}>
            <g className="mt-bot-body">
                <rect className="mt-tread" x="-16" y="-9" width="32" height="9" rx="4.5" />
                <circle className="mt-wheel" cx="-10" cy="-4.5" r="2.5" /><circle className="mt-wheel" cx="0" cy="-4.5" r="2.5" /><circle className="mt-wheel" cx="10" cy="-4.5" r="2.5" />
                <rect className="mt-metal" x="-12" y="-28" width="24" height="19" rx="4" />
                <rect className="mt-team" x="-12" y="-20" width="24" height="5" />
                <path className="mt-arm is-bot" d={happy ? 'M-12 -24 L-20 -36 M12 -24 L20 -36' : mood === 'panic' ? 'M-12 -24 L-22 -30 M12 -24 L22 -30' : 'M-12 -22 L-18 -14 M12 -22 L18 -14'} />
                <path className="mt-neck" d="M0 -28 V-32" />
                <rect className="mt-hull" x="-11" y="-46" width="22" height="15" rx="5" />
                <rect className="mt-screen" x="-7" y="-43" width="15" height="9" rx="3" />
                {mood === 'hit' || mood === 'sooty'
                    ? <path className="mt-bot-x" d="M-4 -41 l3 3 m0 -3 l-3 3 M3 -41 l3 3 m0 -3 l-3 3" />
                    : <g className="mt-bot-eyes"><circle cx="-2" cy="-38.5" r={mood === 'panic' ? 2.4 : 1.7} /><circle cx="5" cy="-38.5" r={mood === 'panic' ? 2.4 : 1.7} /></g>}
                <path className="mt-astro-ant" d="M0 -46 V-54" />
                <circle className={`mt-bot-bulb${mood === 'panic' ? ' is-alarm' : ''}`} cx="0" cy="-56" r="3" />
            </g>
            {(mood === 'hit' || mood === 'sooty') && <DizzyStars />}
        </g>
    );
}

// ── The base ──────────────────────────────────────────────────────────────────

function SolarPanel({ x, y, deg, w = 34 }: { x: number; y: number; deg: number; w?: number }) {
    return (
        <g transform={`translate(${x} ${y}) rotate(${deg})`}>
            <rect className="mt-solar" x={-w / 2} y="-6" width={w} height="11" rx="1.5" />
            <path className="mt-solar-cells" d={`M${-w / 6} -6 V5 M${w / 6} -6 V5 M${-w / 2} -0.5 H${w / 2}`} />
        </g>
    );
}

// Each part, in base units; the flag and the dish move (CSS).
const PART_ART: Record<Part, () => ReactNode> = {
    solarGround: () => (
        <g className="mt-part">
            <path className="mt-strut" d="M-158 0 V-18" />
            <SolarPanel x={-158} y={-22} deg={-24} />
        </g>
    ),
    tower: () => (
        <g className="mt-part">
            <rect className="mt-metal" x="-124" y="-128" width="28" height="128" />
            <path className="mt-lattice" d="M-124 -128 L-96 -96 M-96 -128 L-124 -96 M-124 -96 L-96 -64 M-96 -96 L-124 -64 M-124 -64 L-96 -32 M-96 -64 L-124 -32 M-124 -32 L-96 0 M-96 -32 L-124 0" />
            <rect className="mt-hull" x="-131" y="-136" width="42" height="9" rx="2" />
        </g>
    ),
    dish: () => (
        <g className="mt-part" transform="translate(-118 -140)">
            <g className="mt-dish">
                <path className="mt-strut" d="M0 4 L0 -4" />
                <path className="mt-hull" d="M-17 -6 Q0 16 17 -6 Z" />
                <path className="mt-strut" d="M0 2 L0 -16" />
                <circle className="mt-knob" cx="0" cy="-17" r="3" />
            </g>
        </g>
    ),
    antenna: () => (
        <g className="mt-part">
            <path className="mt-strut" d="M-100 -136 V-166 M-106 -150 H-94 M-104 -158 H-96" />
            <circle className="mt-tip" cx="-100" cy="-168" r="4" />
        </g>
    ),
    tank: () => (
        <g className="mt-part">
            <path className="mt-strut" d="M-138 0 V-8 M-110 0 V-8" />
            <rect className="mt-hull" x="-148" y="-32" width="48" height="25" rx="12.5" />
            <rect className="mt-team" x="-128" y="-32" width="8" height="25" />
        </g>
    ),
    greenhouse: () => (
        <g className="mt-part">
            <path className="mt-plant" d="M92 0 Q90 -10 92 -18 M92 -10 q-7 -2 -9 -8 q7 0 9 8 M92 -14 q7 -3 9 -9 q-7 1 -9 9" />
            <path className="mt-glass-dome" d="M72 0 A20 20 0 0 1 112 0 Z" />
            <path className="mt-glass-frame" d="M92 -20 V0 M74.5 -10 H109.5" />
            <path className="mt-glass" d="M78 -10 Q80 -16 86 -18" />
        </g>
    ),
    solarRoof: () => (
        <g className="mt-part">
            <path className="mt-strut" d="M-40 -82 V-90" />
            <SolarPanel x={-40} y={-93} deg={-18} w={30} />
        </g>
    ),
    flag: () => (
        <g className="mt-part">
            <path className="mt-pole" d="M40 -84 V-138" />
            <g transform="translate(40 -138)"><path className="mt-cloth" d="M0 0 q10 -5 20 0 t20 0 v16 q-10 5 -20 0 t-20 0 Z" /></g>
        </g>
    ),
};

// The parts behind the habitat, then the habitat, then the parts in front.
const BEHIND: Part[] = ['tower', 'dish', 'antenna', 'solarGround', 'tank'];
const FRONT: Part[] = ['solarRoof', 'flag', 'greenhouse'];

function Launcher({ fired }: { fired: number }) {
    return (
        <g className="mt-launcher">
            <rect className="mt-metal" x="112" y="-16" width="24" height="16" rx="3" />
            <g transform={`translate(${LAUNCHER.x} ${LAUNCHER.y}) rotate(${LAUNCHER.deg})`}>
                <g key={fired} className={`mt-barrel${fired ? ' is-fire' : ''}`}>
                    <rect className="mt-hull" x="0" y="-6" width={LAUNCHER.len - 6} height="12" rx="3" />
                    <rect className="mt-team" x="12" y="-6" width="7" height="12" />
                    <rect className="mt-metal" x={LAUNCHER.len - 8} y="-8" width="9" height="16" rx="2" />
                    {fired > 0 && (
                        <g transform={`translate(${LAUNCHER.len + 4} 0)`}>
                            <g className="mt-muzzle">
                                <path className="mt-flash" d="M0 -14 L5 -5 L16 0 L5 5 L0 14 L-3 4 L-10 0 L-3 -4 Z" />
                                <circle className="mt-puff" cx="8" cy="-10" r="7" /><circle className="mt-puff" cx="4" cy="10" r="6" />
                            </g>
                        </g>
                    )}
                </g>
            </g>
            <circle className="mt-metal" cx={LAUNCHER.x} cy={LAUNCHER.y} r="10" />
            <circle className="mt-knob" cx={LAUNCHER.x} cy={LAUNCHER.y} r="3.5" />
        </g>
    );
}

function Habitat({ stage, alarm }: { stage: BaseStage; alarm: boolean }) {
    return (
        <g className="mt-habitat">
            <path className="mt-hull" d="M-72 0 V-50 A72 48 0 0 1 72 -50 V0 Z" />
            <path className="mt-seam" d="M-72 -26 H72 M-24 0 V-50 M24 0 V-50 M-52 -50 Q-40 -84 -18 -95 M52 -50 Q40 -84 18 -95" />
            <rect className="mt-team" x="-72" y="-54" width="144" height="7" />
            {[-48, -12].map(x => <circle key={x} className="mt-window" cx={x} cy="-32" r="8" />)}
            <path className="mt-door" d="M30 0 V-28 A13 13 0 0 1 56 -28 V0 Z" />
            <circle className="mt-knob" cx="35" cy="-14" r="2" />
            {stage.dents >= 1 && <path className="mt-dent" d="M-30 -60 l6 8 l-5 6 l7 6" />}
            {stage.dents >= 2 && <path className="mt-dent" d="M10 -80 l-4 9 l6 5 l-3 8" />}
            {stage.dents >= 3 && <path className="mt-dent" d="M-62 -8 l8 -4 l3 -9 l9 -2" />}
            {/* The beacon: it spins and flashes while a meteor is on its way. */}
            <rect className="mt-metal" x="-8" y="-104" width="16" height="8" rx="2" />
            <g transform="translate(0 -110)">
                {alarm && <g className="mt-beams"><path d="M0 0 L80 -16 L80 16 Z" /><path d="M0 0 L-80 -16 L-80 16 Z" /></g>}
                <circle className={`mt-beacon${alarm ? ' is-alarm' : ''}`} r="7" />
            </g>
        </g>
    );
}

function Smoke({ x, y, n = 3, big = false }: { x: number; y: number; n?: number; big?: boolean }) {
    return (
        <g transform={`translate(${x} ${y})`} className={`mt-smoke${big ? ' is-big' : ''}`}>
            {Array.from({ length: n }, (_, k) => <circle key={k} className="mt-smoke-puff" r={big ? 14 : 9} style={{ '--k': k, '--n': n } as CSSProperties} />)}
        </g>
    );
}

function Flames({ x, y }: { x: number; y: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <g className="mt-flames">
                <path className="mt-fire-out" d="M-10 0 Q-12 -14 -4 -22 Q-4 -12 0 -10 Q2 -20 8 -26 Q10 -12 10 0 Z" />
                <path className="mt-fire-in" d="M-5 0 Q-6 -8 -1 -13 Q0 -6 3 -5 Q4 -11 6 -14 Q7 -6 6 0 Z" />
            </g>
        </g>
    );
}

// A hole where the base stood: a scorched crater with a raised rim, scraps, smoke wisps and embers.
function Crater() {
    return (
        <g className="mt-crater">
            <ellipse className="mt-scorch" cx="0" cy="4" rx="190" ry="20" />
            <path className="mt-pit" d="M-132 2 Q-110 -10 -70 -12 L70 -12 Q110 -10 132 2 Q60 22 0 22 Q-60 22 -132 2 Z" />
            <path className="mt-pit-floor" d="M-96 4 Q-40 16 0 16 Q40 16 96 4 Q40 -2 0 -2 Q-40 -2 -96 4 Z" />
            <path className="mt-rim" d="M-160 6 Q-150 -22 -120 -16 Q-110 -26 -86 -14 L-132 2 Z M160 6 Q150 -22 120 -16 Q110 -26 86 -14 L132 2 Z" />
            <g transform="translate(-52 -6) rotate(-22)"><rect className="mt-hull is-scorched" x="-18" y="-8" width="36" height="12" rx="3" /></g>
            <g transform="translate(64 -4) rotate(18)"><rect className="mt-metal is-scorched" x="-10" y="-10" width="20" height="14" rx="2" /></g>
            <circle className="mt-ember" cx="-20" cy="6" r="3" /><circle className="mt-ember" cx="14" cy="10" r="2.5" style={{ animationDelay: '-.6s' }} /><circle className="mt-ember" cx="40" cy="4" r="2" style={{ animationDelay: '-1.1s' }} />
            <Smoke x={-30} y={-6} n={4} big />
            <Smoke x={34} y={-4} n={3} />
        </g>
    );
}

// ── Shields ───────────────────────────────────────────────────────────────────

const domePath = (rx: number, ry: number) => `M${-rx} 0 A${rx} ${ry} 0 0 1 ${rx} 0 Z`;
const domeEdge = (rx: number, ry: number) => `M${-rx} 0 A${rx} ${ry} 0 0 1 ${rx} 0`;

/** A shield dome (layer 1 = the green one, 2 = the blue one over it); `breaking` = it just took a meteor. */
export function Dome({ layer, uid, clipId, breaking = false }: { layer: 1 | 2; uid: string; clipId: string; breaking?: boolean }) {
    const { rx, ry } = DOMES[layer - 1];
    const clip = `${clipId}-${layer}`;
    return (
        <g className={`mt-dome is-l${layer}${breaking ? ' is-breaking' : ''}`}>
            <clipPath id={clip}><path d={domePath(rx, ry)} /></clipPath>
            <g className="mt-dome-grow">
                <path className="mt-dome-fill" d={domePath(rx, ry)} />
                <g clipPath={`url(#${clip})`}>
                    <rect className="mt-dome-hex" x={-rx} y={-ry} width={rx * 2} height={ry} fill={`url(#${uid}-hex-${layer})`} />
                    <rect className="mt-dome-sweep" x="-30" y={-ry} width="44" height={ry} />
                </g>
                <path className="mt-dome-shine" d={`M${-rx * 0.72} ${-ry * 0.5} A${rx * 0.85} ${ry * 0.85} 0 0 1 ${-rx * 0.2} ${-ry * 0.92}`} />
                <path className="mt-dome-edge" d={domeEdge(rx, ry)} />
            </g>
        </g>
    );
}

function HexPatterns({ uid }: { uid: string }) {
    // A flat-top hexagon grid: 24 wide, 41.57 tall per tile.
    const hex = 'M6 0 H18 L24 10.39 L18 20.78 H6 L0 10.39 Z M18 20.78 L24 31.18 L18 41.57 M6 20.78 L0 31.18 L6 41.57 M24 10.39 H30 M-6 31.18 H0';
    return (
        <defs>
            {[1, 2].map(l => (
                <pattern key={l} id={`${uid}-hex-${l}`} width="36" height="41.57" patternUnits="userSpaceOnUse">
                    <path className={`mt-hex is-l${l}`} d={hex} />
                </pattern>
            ))}
        </defs>
    );
}

// ── One base ──────────────────────────────────────────────────────────────────

export interface BaseView {
    hp: number;
    lives: number;
    shields: number;
    // A meteor is on its way here.
    alarm: boolean;
    // Shots fired: restarts the launcher's recoil.
    fired: number;
    // The astronaut's and the robot's mood.
    mood: Mood;
    // The shield layer that just broke (1 or 2), keyed so a second break plays again.
    breaking: { layer: 1 | 2; key: number } | null;
}

export function Base({ side, v, uid }: { side: Side; v: BaseView; uid: string }) {
    const stage = baseStage(v.hp, v.lives);
    const x = toScene(side, { x: 0, y: 0 });
    const flip = side === 'right' ? ' scale(-1 1)' : '';
    const has = (p: Part) => !stage.lost.has(p);
    return (
        <g className={`mt-base is-${side}${stage.crater ? ' is-crater' : ''}`} transform={`translate(${x.x} ${x.y})${flip}`}>
            {stage.crater ? <Crater /> : (
                <g className="mt-standing">
                    {BEHIND.filter(has).map(p => <g key={p}>{PART_ART[p]()}</g>)}
                    <Habitat stage={stage} alarm={v.alarm} />
                    {FRONT.filter(has).map(p => <g key={p}>{PART_ART[p]()}</g>)}
                    <Launcher fired={v.fired} />
                    {stage.smoke && <Smoke x={-20} y={-90} n={3} />}
                    {stage.fire && <><Flames x={-40} y={-62} /><Flames x={58} y={-48} /></>}
                    {stage.lost.has('tower') && <g className="mt-sparks" transform="translate(-110 -6)"><path d="M0 0 l-6 -10 M0 0 l5 -11 M0 0 l10 -4" /></g>}
                </g>
            )}
            <g transform={`translate(${stage.crater ? -150 : -40} 16)`}><Robot mood={v.mood} /></g>
            <g transform={`translate(${stage.crater ? 150 : 96} 14)`}><Astronaut mood={v.mood} /></g>
            {v.shields >= 1 && <Dome layer={1} uid={uid} clipId={`${uid}-${side}`} />}
            {v.shields >= 2 && <Dome layer={2} uid={uid} clipId={`${uid}-${side}`} />}
            {v.breaking && <g key={v.breaking.key}><Dome layer={v.breaking.layer} uid={uid} clipId={`${uid}-${side}-b`} breaking /></g>}
        </g>
    );
}

// ── The sky and the ground ────────────────────────────────────────────────────

const STARS = (() => {
    const r = seeded(11);
    return Array.from({ length: 46 }, (_, i) => ({ x: -520 + r() * 2240, y: VIEW.top + 4 + r() ** 1.4 * 150, s: 0.6 + r() * 1.1, twinkle: i % 3 === 0, d: -r() * 4 }));
})();
const ROCKS = (() => {
    const r = seeded(5);
    return Array.from({ length: 16 }, () => ({ x: -500 + r() * 2200, y: VIEW.ground + 8 + r() * 36, w: 8 + r() * 18, a: r() * 40 - 20 }));
})();

export function Sky({ uid }: { uid: string }) {
    return (
        <>
            <defs>
                <linearGradient id={`${uid}-sky`} x1="0" y1="-40" x2="0" y2={VIEW.ground} gradientUnits="userSpaceOnUse">
                    <stop className="mt-sky-top" offset="0" />
                    <stop className="mt-sky-mid" offset="0.55" />
                    <stop className="mt-sky-low" offset="1" />
                </linearGradient>
            </defs>
            <rect x="-1500" y="-600" width="4200" height={VIEW.ground + 610} fill={`url(#${uid}-sky)`} />
            {STARS.map((s, i) => (
                <circle key={i} className={`mt-star${s.twinkle ? ' is-twinkle' : ''}`} cx={s.x} cy={s.y} r={s.s} style={{ animationDelay: `${s.d}s` } as CSSProperties} />
            ))}
            <g className="mt-shooting"><path d="M0 0 L-60 18" /></g>
            {/* Phobos (big, lumpy) and Deimos (small), drifting slowly. */}
            <g className="mt-moon is-phobos" transform="translate(760 84)">
                <path className="mt-moon-body" d="M-24 -4 Q-22 -20 -4 -21 Q18 -22 24 -6 Q28 10 10 17 Q-12 22 -22 10 Q-27 4 -24 -4 Z" />
                <path className="mt-moon-shade" d="M24 -6 Q28 10 10 17 Q-12 22 -22 10 Q2 14 14 4 Q22 -2 24 -6 Z" />
                <circle className="mt-moon-crater" cx="-8" cy="-8" r="5" /><circle className="mt-moon-crater" cx="9" cy="2" r="3.5" /><circle className="mt-moon-crater" cx="-12" cy="7" r="2.5" />
            </g>
            <g className="mt-moon is-deimos" transform="translate(410 60)">
                <path className="mt-moon-body" d="M-10 -2 Q-9 -10 0 -10 Q10 -9 10 0 Q9 9 0 9 Q-10 8 -10 -2 Z" />
                <circle className="mt-moon-crater" cx="-3" cy="-3" r="2.4" />
            </g>
            {/* Far mesas and the big old volcano, hazy. */}
            <path className="mt-far" d="M-1500 292 L-1500 262 L-420 262 L-380 246 L-250 246 L-214 264 L130 264 L170 250 L250 250 L280 266 L450 266 Q600 206 760 266 L930 266 L960 248 L1060 248 L1092 266 L1500 266 L1540 250 L1640 250 L1680 262 L2700 262 L2700 292 Z" />
            <path className="mt-far-shade" d="M500 266 Q600 230 700 266 Z" />
        </>
    );
}

export function Ground() {
    return (
        <>
            <rect className="mt-ground" x="-1500" y={VIEW.ground} width="4200" height="400" />
            <path className="mt-strata" d="M-1500 312 Q-600 306 0 314 T1200 310 T2700 314 M-1500 330 Q-500 326 300 334 T2700 330" />
            {[[470, 304, 46], [690, 318, 30], [-150, 312, 40], [1340, 306, 44], [880, 330, 22]].map(([x, y, r]) => (
                <g key={`${x}`} transform={`translate(${x} ${y})`}>
                    <ellipse className="mt-crater-rim" rx={r} ry={r / 4.2} />
                    <ellipse className="mt-crater-hole" cx="0" cy="1" rx={r * 0.72} ry={r / 6.5} />
                </g>
            ))}
            {ROCKS.map((k, i) => (
                <path key={i} className="mt-rock" transform={`translate(${k.x} ${k.y}) rotate(${k.a})`} d={`M${-k.w / 2} 0 L${-k.w / 3} ${-k.w / 2.4} L${k.w / 4} ${-k.w / 2} L${k.w / 2} ${-k.w / 6} L${k.w / 2.4} 0 Z`} />
            ))}
        </>
    );
}

/** A dust devil, a twisting funnel of dust that wanders across the plain. */
export function DustDevil({ className }: { className: string }) {
    return (
        <g className={`mt-devil ${className}`}>
            <g className="mt-devil-spin">
                <path className="mt-devil-body" d="M-4 0 Q-8 -24 -28 -60 Q0 -66 28 -60 Q8 -24 4 0 Z" />
                <path className="mt-devil-swirl" d="M-8 -14 Q0 -10 9 -16 M-14 -30 Q0 -25 15 -32 M-21 -46 Q0 -40 23 -48" />
            </g>
        </g>
    );
}

/** The rover, driving up and down the plain between the bases. */
export function Rover() {
    return (
        <g className="mt-rover-path">
            <g className="mt-rover">
                <g className="mt-rover-dust"><circle cx="-36" cy="-4" r="6" /><circle cx="-46" cy="-9" r="4.5" /></g>
                <path className="mt-strut" d="M-24 -12 L-14 -20 L-4 -12 M8 -12 L18 -20 L28 -12" />
                <rect className="mt-hull" x="-24" y="-30" width="48" height="13" rx="4" />
                <rect className="mt-solar" x="-28" y="-36" width="40" height="6" rx="1.5" />
                <path className="mt-strut" d="M16 -30 V-48" />
                <rect className="mt-metal" x="10" y="-56" width="14" height="9" rx="2" />
                <circle className="mt-rover-eye" cx="20" cy="-51.5" r="2.4" />
                {[-22, 0, 22].map(x => (
                    <g key={x} transform={`translate(${x} -7)`}><g className="mt-rover-wheel"><circle className="mt-tyre" r="7" /><path className="mt-spoke" d="M-5 0 H5 M0 -5 V5" /></g></g>
                ))}
            </g>
        </g>
    );
}

// ── Meteors ───────────────────────────────────────────────────────────────────

export interface MeteorView {
    id: number;
    from: Side;
    to: Side;
    // The shield it will strike (0 = the roof).
    layer: number;
    ms: number;
    startedAt: number;
}

const EMBERS = [{ d: 70, r: 6 }, { d: 140, r: 4.6 }, { d: 220, r: 3.4 }, { d: 300, r: 2.4 }];

/** A meteor on its way: a burning rock on a parabola (nested transforms), its flame trailing behind it. */
export function Meteor({ m }: { m: MeteorView }) {
    // A remount mid-flight picks up where the flight is (the engine lands it on time).
    const [lag] = useState(() => Math.max(0, Date.now() - m.startedAt));
    const arc = arcOf(m.from, m.to, m.layer);
    const vars = (delay: number) => ({
        '--dx': `${arc.dx}px`, '--dy': `${arc.dy}px`, '--arc': `${-arc.h}px`, '--dur': `${m.ms}ms`, '--wait': `${delay - lag}ms`,
        ...Object.fromEntries(arc.heading.map((a, i) => [`--a${i}`, `${a}deg`])),
    } as CSSProperties);
    const chain = (delay: number, body: ReactNode, key?: number) => (
        <g key={key} className="mt-fly" style={vars(delay)}>
            <g className="mt-fly-x"><g className="mt-fly-y"><g className="mt-fly-arc">{body}</g></g></g>
        </g>
    );
    return (
        <g className="mt-meteor" transform={`translate(${arc.from.x} ${arc.from.y})`} data-to={m.to} data-layer={m.layer}>
            {EMBERS.map((e, i) => chain(e.d, <circle className="mt-ember-trail" r={e.r} style={{ '--k': i } as CSSProperties} />, i))}
            {chain(0, (
                <g transform={arc.dir < 0 ? 'scale(-1 1)' : undefined}>
                    <g className="mt-aim">
                        <g className="mt-grow">
                            <circle className="mt-glow" r="26" />
                            <g className="mt-tail">
                                <path className="mt-tail-out" d="M4 -15 Q-40 -12 -96 0 Q-40 12 4 15 Z" />
                                <path className="mt-tail-mid" d="M2 -10 Q-30 -8 -66 0 Q-30 8 2 10 Z" />
                                <path className="mt-tail-in" d="M0 -6 Q-18 -4 -38 0 Q-18 4 0 6 Z" />
                            </g>
                            <g className="mt-spin">
                                <path className="mt-rock-body" d="M-13 -4 Q-12 -13 -2 -14 Q11 -14 14 -3 Q15 9 4 13 Q-9 15 -13 6 Z" />
                                <circle className="mt-rock-pit" cx="-4" cy="-4" r="3.4" /><circle className="mt-rock-pit" cx="5" cy="5" r="2.4" />
                            </g>
                            <path className="mt-hot" d="M8 -11 Q17 -2 9 11 Q13 0 8 -11 Z" />
                        </g>
                    </g>
                </g>
            ))}
        </g>
    );
}

// ── Impacts ───────────────────────────────────────────────────────────────────

export type ImpactKind = 'hit' | 'block' | 'boom';
export interface Impact { id: number; kind: ImpactKind; side: Side; at: Pt; layer?: number }

const CHUNKS = [[-70, -60, 1], [-40, -95, -1], [-10, -70, 1], [30, -100, -1], [60, -64, 1], [90, -40, -1], [-95, -30, 1], [120, -80, 1]] as const;
const SPARKS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
// Bits of shield that fly off a block (deg, distance); the toward-the-sky half.
const SHARDS = [[-150, 60], [-110, 74], [-70, 58], [-30, 70], [10, 52], [-90, 44]] as const;

/** A hit, a shield block or the base blowing up, at a point in scene units; it plays once and is removed. */
export function ImpactFx({ fx }: { fx: Impact }) {
    const big = fx.kind === 'boom';
    const toward = fx.side === 'left' ? -1 : 1;
    const s = big ? 2.1 : 1;
    if (fx.kind === 'block') {
        return (
            <g className={`mt-fx is-block is-l${fx.layer ?? 1}`} transform={`translate(${fx.at.x} ${fx.at.y})`}>
                <circle className="mt-ripple" r="30" /><circle className="mt-ripple is-2" r="30" />
                <circle className="mt-fx-flash is-shield" r="40" />
                <path className="mt-zap" d="M0 -30 L6 -10 L26 -16 L10 0 L28 14 L6 10 L0 30 L-6 10 L-28 14 L-10 0 L-26 -16 L-6 -10 Z" />
                {SPARKS.map((a, i) => <g key={a} transform={`rotate(${a})`}><path className="mt-spark" d="M18 0 L40 0" style={{ '--k': i % 4 } as CSSProperties} /></g>)}
                {SHARDS.map(([a, d], k) => (
                    <g key={`h${k}`} transform={`rotate(${a})`}><g className="mt-shard" style={{ '--d': `${d}px`, '--k': k } as CSSProperties}><path d="M-4 -7 H4 L8 0 L4 7 H-4 L-8 0 Z" /></g></g>
                ))}
                {[0, 1, 2, 3, 4].map(k => (
                    <g key={k} className="mt-bounce" style={{ '--bx': `${toward * (34 + k * 22)}px`, '--by': `${-46 - k * 14}px`, '--fall': `${VIEW.ground - fx.at.y + 4}px`, '--r': `${toward * (200 + k * 90)}deg`, '--k': k } as CSSProperties}>
                        <path className="mt-rock-body" transform={`scale(${1.6 - k * 0.15})`} d="M-5 -2 L-2 -6 L5 -4 L5 3 L-1 5 Z" />
                    </g>
                ))}
            </g>
        );
    }
    return (
        <g className={`mt-fx is-${fx.kind}`} transform={`translate(${fx.at.x} ${fx.at.y})`}>
            <g transform={`translate(0 ${VIEW.ground - fx.at.y})`}><ellipse className="mt-shock" rx={60 * s} ry={9 * s} /></g>
            <circle className="mt-fx-flash" r={56 * s} />
            <g className="mt-fireball">
                {[[0, 0, 26], [-18, 8, 18], [18, 6, 20], [-6, -16, 18], [12, -12, 15]].map(([x, y, r], i) => (
                    <circle key={i} className={`mt-fire-ball is-${i % 3}`} cx={x * s} cy={y * s} r={r * s} style={{ '--k': i } as CSSProperties} />
                ))}
            </g>
            {SPARKS.filter((_, i) => big || i % 2 === 0).map((a, i) => <g key={a} transform={`rotate(${a})`}><path className="mt-spark is-hot" d={`M${18 * s} 0 L${44 * s} 0`} style={{ '--k': i % 4 } as CSSProperties} /></g>)}
            {CHUNKS.slice(0, big ? 8 : 5).map(([cx, cy, r], k) => (
                <g key={k} className="mt-chunk" style={{ '--cx': `${cx * s}px`, '--cy': `${cy * s}px`, '--fall': `${VIEW.ground - fx.at.y + 6}px`, '--r': `${r * (220 + k * 60)}deg`, '--k': k } as CSSProperties}>
                    <rect className={k % 3 === 0 ? 'mt-team-chunk' : k % 3 === 1 ? 'mt-hull' : 'mt-metal'} x="-7" y="-5" width={12 + (k % 2) * 6} height="10" rx="2" />
                </g>
            ))}
            <circle className="mt-core" r={16 * s} />
            <Smoke x={0} y={-10} n={big ? 6 : 3} big={big} />
            {big && (
                <g className="mt-billow">
                    {[[-40, 10, 30], [40, 12, 30], [0, -10, 38], [-62, 34, 22], [64, 36, 22], [-18, -40, 26], [22, -36, 24]].map(([x, y, r], k) => (
                        <circle key={k} cx={x} cy={y} r={r} style={{ '--k': k } as CSSProperties} />
                    ))}
                </g>
            )}
        </g>
    );
}

/** A comic word that pops up over a base ("BOEM!", "Geblokt!", "Schild!"), centred on (x, y). */
export function Call({ text, at, tone }: { text: string; at: Pt; tone: 'boom' | 'block' | 'shield' }) {
    const w = Math.max(96, text.length * 17 + 36);
    return (
        <g transform={`translate(${at.x} ${at.y})`}>
            <g className={`mt-call is-${tone}`}>
                {tone === 'boom'
                    ? <path className="mt-call-bg" d={burstPath(w / 2 + 14, 34, 12)} />
                    : <rect className="mt-call-bg" x={-w / 2} y="-22" width={w} height="40" rx="20" />}
                <text className="mt-call-text" x="0" y="7" textAnchor="middle">{text}</text>
            </g>
        </g>
    );
}

function burstPath(rx: number, ry: number, n: number) {
    const pts = Array.from({ length: n * 2 }, (_, i) => {
        const a = (i / (n * 2)) * Math.PI * 2;
        const k = i % 2 === 0 ? 1 : 0.72;
        return `${(Math.cos(a) * rx * k).toFixed(1)} ${(Math.sin(a) * ry * k).toFixed(1)}`;
    });
    return `M${pts.join(' L')} Z`;
}

/** Fireworks over the winner's base, again and again while the round's win plays. */
export function Fireworks({ side }: { side: Side }) {
    const c = toScene(side, { x: 0, y: 0 }).x;
    const shots = [[-120, 92, 0], [40, 64, 0.5], [130, 110, 0.95], [-30, 130, 1.4], [90, 44, 1.85]] as const;
    return (
        <g className="mt-fireworks">
            {shots.map(([dx, y, d], i) => (
                <g key={i} transform={`translate(${c + dx} ${y})`} className={`mt-fw is-${i % 4}`} style={{ '--d': `${d}s`, '--rise': `${VIEW.ground - 40 - y}px` } as CSSProperties}>
                    <path className="mt-fw-trail" d="M0 0 V24" />
                    <g className="mt-fw-burst">
                        {Array.from({ length: 12 }, (_, k) => <path key={k} className="mt-fw-ray" transform={`rotate(${k * 30})`} d="M10 0 L30 0" />)}
                        {Array.from({ length: 12 }, (_, k) => <circle key={`d${k}`} className="mt-fw-dot" transform={`rotate(${k * 30 + 15}) translate(38 0)`} r="3" />)}
                    </g>
                </g>
            ))}
        </g>
    );
}

export interface SceneProps {
    left: BaseView;
    right: BaseView;
    meteors: MeteorView[];
    impacts: Impact[];
    calls: { id: number; text: string; at: Pt; tone: 'boom' | 'block' | 'shield' }[];
    winner: Side | null;
}

export function Scene({ left, right, meteors, impacts, calls, winner }: SceneProps) {
    const uid = useId().replace(/:/g, '');
    return (
        <svg className="mt-svg" viewBox={`0 ${VIEW.top} ${VIEW.w} ${VIEW.h - VIEW.top}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
            <HexPatterns uid={uid} />
            <Sky uid={uid} />
            <Ground />
            <DustDevil className="is-a" />
            <DustDevil className="is-b" />
            <Rover />
            <Base side="left" v={left} uid={uid} />
            <Base side="right" v={right} uid={uid} />
            {winner && <Fireworks side={winner} />}
            {meteors.map(m => <Meteor key={m.id} m={m} />)}
            {impacts.map(fx => <ImpactFx key={fx.id} fx={fx} />)}
            {calls.map(c => <Call key={c.id} text={c.text} at={c.at} tone={c.tone} />)}
        </svg>
    );
}
