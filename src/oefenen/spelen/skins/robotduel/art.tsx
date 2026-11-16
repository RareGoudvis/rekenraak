import type { CSSProperties, ReactNode } from 'react';
import type { Side } from '../../duel/types';
import { FLOOR, MODEL, ROBOT_X, VIEW, impactAt, type Model } from './geometry';
import { ROBOT, platesOff, type HitKind } from './rule';

// The Robotduel scene: a neon boxing ring in a dark arena (crowd, big screen, spotlights) with two robots that
// face each other. Code-drawn SVG, flat fills under the thick ink outline. Every robot is drawn facing right
// with its feet at (0, 0); the right one is mirrored, so "forward" is +x for both. Everything moves by CSS:
// an animated <g> never carries a transform attribute (a pivot wrapper around it does), so CSS and SVG
// transforms never fight. Restarts: a parity class (rd-hit-0 / -1) or a key per attack.

// The armour plates in the order they fall off: shoulder, helmet fin, knee, chest. Centre in robot units.
const PLATE_AT = [{ x: 30, y: -192 }, { x: -2, y: -268 }, { x: 22, y: -50 }, { x: -3, y: -152 }] as const;
// Where each fallen plate ends on the floor (relative to its centre) and how far it turns on the way.
const PLATE_FALL = [{ x: -92, r: -250 }, { x: -130, r: 330 }, { x: -64, r: -160 }, { x: -110, r: 200 }] as const;
// Dents, one per life lost (robot units), the first ones on the chest and head.
const DENTS = [{ x: 30, y: -116, r: -20 }, { x: -24, y: -226, r: 30 }, { x: -40, y: -170, r: 10 }, { x: 16, y: -246, r: -40 }, { x: 40, y: -150, r: 60 }, { x: -34, y: -112, r: -50 }] as const;

// ── Robot parts (robot units, facing right) ─────────────────────────────────────────────────────

function Legs({ m }: { m: Model }) {
    return m === 'bruiser' ? (
        <g className="rd-legs">
            <rect className="rd-metal-dk" x="-36" y="-80" width="26" height="64" rx="8" />
            <rect className="rd-boot" x="-50" y="-24" width="48" height="24" rx="10" />
            <rect className="rd-metal" x="8" y="-80" width="28" height="64" rx="8" />
            <rect className="rd-boot" x="2" y="-24" width="58" height="24" rx="10" />
            <path className="rd-line" d="M14 -12 h40" />
            <rect className="rd-metal-dk" x="-48" y="-100" width="96" height="28" rx="11" />
        </g>
    ) : (
        <g className="rd-legs">
            <rect className="rd-metal-dk" x="-30" y="-84" width="18" height="70" rx="9" />
            <path className="rd-boot" d="M-46 0 L-40 -18 L-8 -18 L0 0 Z" />
            <rect className="rd-metal" x="8" y="-84" width="20" height="70" rx="10" />
            <path className="rd-boot" d="M-2 0 L4 -18 L34 -18 L54 0 Z" />
            <circle className="rd-joint" cx="-21" cy="-48" r="9" />
            <ellipse className="rd-metal-dk" cx="0" cy="-92" rx="42" ry="15" />
            <path className="rd-thrust" d="M-36 2 h26 M8 2 h36" />
        </g>
    );
}

function Torso({ m }: { m: Model }) {
    return m === 'bruiser' ? (
        <g>
            <rect className="rd-team" x="-62" y="-206" width="124" height="116" rx="22" />
            <path className="rd-shine" d="M-50 -190 v62" />
            <path className="rd-line" d="M-26 -108 h52 M-22 -99 h44" />
        </g>
    ) : (
        <g>
            <path className="rd-team" d="M-48 -208 Q-62 -208 -60 -194 L-46 -112 Q-40 -92 0 -92 Q40 -92 46 -112 L60 -194 Q62 -208 48 -208 Z" />
            <path className="rd-stripe" d="M-50 -122 Q0 -104 50 -122" />
            <path className="rd-shine" d="M-46 -192 l8 54" />
        </g>
    );
}

// What shows where the chest plate was: a dark cavity, wires and the glowing core.
function Core() {
    return (
        <g>
            <rect className="rd-cavity" x="-40" y="-178" width="74" height="52" rx="12" />
            <path className="rd-wire" d="M-32 -138 q8 -16 16 0 t16 0 t16 0" />
            <circle className="rd-core" cx="-3" cy="-158" r="11" />
        </g>
    );
}

// One armour plate, centred on (0, 0).
function Plate({ m, i }: { m: Model; i: number }) {
    if (i === 0) return m === 'bruiser'
        ? <g><rect className="rd-plate" x="-32" y="-21" width="64" height="42" rx="16" /><path className="rd-line" d="M-16 -21 v42" /><circle className="rd-rivet" cx="14" cy="0" r="4" /></g>
        : <g><path className="rd-plate" d="M-24 14 Q-26 -16 0 -18 Q26 -16 24 14 Z" /><path className="rd-line" d="M-16 4 Q0 -6 16 4" /></g>;
    if (i === 1) return m === 'bruiser'
        ? <g><path className="rd-plate" d="M-30 10 L-20 -9 L22 -9 L32 10 Z" /><path className="rd-line" d="M-6 -9 v19 M8 -9 v19" /></g>
        : <g><path className="rd-plate" d="M-14 10 L-40 -20 L-12 -12 L14 10 Z" /><circle className="rd-bulb" cx="-40" cy="-20" r="6" /></g>;
    if (i === 2) return m === 'bruiser'
        ? <g><rect className="rd-plate" x="-18" y="-13" width="36" height="26" rx="8" /><circle className="rd-rivet" cx="0" cy="0" r="3.5" /></g>
        : <g><circle className="rd-plate" r="13" /><circle className="rd-rivet" r="4" /></g>;
    return m === 'bruiser' ? (
        <g>
            <rect className="rd-plate" x="-44" y="-30" width="88" height="60" rx="13" />
            {[[-34, -21], [34, -21], [-34, 21], [34, 21]].map(([x, y]) => <circle key={`${x}${y}`} className="rd-rivet" cx={x} cy={y} r="3.5" />)}
            <path className="rd-emblem" d="M4 -20 L-12 4 L0 4 L-6 22 L14 -4 L2 -4 Z" />
        </g>
    ) : (
        <g>
            <ellipse className="rd-plate" rx="42" ry="31" />
            <circle className="rd-emblem-ring" r="15" />
            <circle className="rd-emblem" r="7" />
        </g>
    );
}

function PlateAt({ m, i }: { m: Model; i: number }) {
    return <g transform={`translate(${PLATE_AT[i].x} ${PLATE_AT[i].y})`}><Plate m={m} i={i} /></g>;
}

export type Eyes = 'open' | 'happy' | 'hurt' | 'off';

// The head around its neck pivot (0, 0): the robot's -200.
function HeadArt({ m, eyes }: { m: Model; eyes: Eyes }) {
    const happy = eyes === 'happy';
    const shut = eyes === 'hurt' || eyes === 'off';
    if (m === 'bruiser') return (
        <g>
            <rect className="rd-metal-dk" x="-15" y="-14" width="30" height="18" rx="4" />
            <rect className="rd-team" x="-42" y="-60" width="84" height="52" rx="13" />
            <rect className="rd-visor" x="-6" y="-50" width="48" height="24" rx="12" />
            {happy ? <path className="rd-eye-line" d="M2 -34 q7 -9 14 0 M22 -34 q7 -9 14 0" />
                : shut ? <path className="rd-eye-line" d="M4 -42 l9 8 m0 -8 l-9 8 M24 -42 l9 8 m0 -8 l-9 8" />
                    : <rect className="rd-eye" x="2" y="-44" width="34" height="11" rx="5.5" />}
            <path className="rd-line" d="M-30 -20 h22 M-30 -27 h22" />
            <circle className="rd-rivet" cx="-26" cy="-42" r="7" />
        </g>
    );
    return (
        <g>
            <rect className="rd-metal-dk" x="-12" y="-14" width="24" height="18" rx="4" />
            <path className="rd-team" d="M-38 -10 Q-42 -64 0 -66 Q42 -64 42 -10 Z" />
            <rect className="rd-visor" x="-8" y="-48" width="50" height="26" rx="13" />
            {happy ? <path className="rd-eye-line" d="M2 -33 q6 -9 12 0 M22 -33 q6 -9 12 0" />
                : shut ? <path className="rd-eye-line" d="M3 -40 l9 9 m0 -9 l-9 9 M22 -40 l9 9 m0 -9 l-9 9" />
                    : <><circle className="rd-eye" cx="8" cy="-35" r="7" /><circle className="rd-eye" cx="28" cy="-35" r="7" /></>}
            <path className="rd-line" d="M14 -16 h16" />
            <circle className="rd-rivet" cx="-24" cy="-34" r="6" />
        </g>
    );
}

// A fist centred on (0, 0), the knuckles forward.
function Fist({ m, back = false }: { m: Model; back?: boolean }) {
    const cls = back ? 'rd-team-dk' : 'rd-team';
    return m === 'bruiser' ? (
        <g>
            <rect className={cls} x="-22" y="-23" width="46" height="46" rx="12" />
            <path className="rd-line" d="M10 -23 v46 M10 -8 h14 M10 8 h14" />
        </g>
    ) : (
        <g>
            <circle className={cls} r="21" />
            <path className="rd-line" d="M6 -20 Q14 0 6 20" />
            <circle className="rd-rivet" cx="-8" cy="0" r="4" />
        </g>
    );
}

// The front arm's shape (shoulder pivot at 0, 0): the piston and the fist forward. The fist sits at FIST_X.
const FIST_X: Record<Model, number> = { bruiser: 78, sleek: 74 };

function Flame() {
    return (
        <g className="rd-flame">
            <path className="rd-flame-out" d="M-20 -14 Q-60 -10 -86 0 Q-60 10 -20 14 Z" />
            <path className="rd-flame-in" d="M-20 -8 Q-44 -5 -60 0 Q-44 5 -20 8 Z" />
        </g>
    );
}

export interface RobotView {
    side: Side;
    model: Model;
    lives: number;
    max: number;
    // Attacks started, and what the latest is: restarts the lunge (parity) and the arm (key).
    atk: { n: number; kind: HitKind };
    // Hits taken, and what the latest was.
    hit: { n: number; kind: HitKind; double: boolean };
    // Wrong answers: a little power-down twitch.
    oops: number;
    guardDown: boolean;
    // The next right answer is the special: the fist glows.
    ready?: boolean;
    won: boolean;
    ko: boolean;
}

// One robot, standing (or, at 0 lives, in pieces). Robot units; the caller places and mirrors it.
export function Robot({ v }: { v: RobotView }) {
    const off = v.ko ? ROBOT.plates : platesOff(v.lives, v.max);
    const lost = Math.max(0, v.max - v.lives);
    const low = !v.ko && v.lives > 0 && v.lives / v.max <= 0.4;
    const eyes: Eyes = v.won ? 'happy' : v.guardDown ? 'hurt' : 'open';
    const atkCls = v.atk.n ? ` rd-atk-${v.atk.n % 2} is-${v.atk.kind}` : '';
    const hitCls = v.hit.n ? ` rd-hit-${v.hit.n % 2} is-${v.hit.kind}${v.hit.double ? ' is-double' : ''}` : '';
    const cls = `rd-bot is-${v.side} is-${v.model}${v.guardDown && !v.won ? ' is-guard' : ''}${v.won ? ' is-win' : ''}${low ? ' is-low' : ''}`;
    const fx = FIST_X[v.model];
    if (v.ko) return <Wreck v={v} />;
    return (
        <g className={cls}>
            <ellipse className="rd-shadow" cx="4" cy="2" rx="74" ry="10" />
            {v.guardDown && !v.won && <ellipse className="rd-aura" cx="0" cy="-130" rx="96" ry="150" />}
            <g className={`rd-react${hitCls}`}>
                <g className={`rd-lunge${atkCls}`}>
                    <g className={`rd-idle${v.oops ? ` rd-oops-${v.oops % 2}` : ''}`}>
                        <Legs m={v.model} />
                        {/* The back arm behind the body: its fist up by the chin (guard). */}
                        <g transform="translate(-28 -184)">
                            <g className="rd-armb">
                                <g transform="rotate(-25)"><rect className="rd-metal-dk" x="0" y="-10" width="90" height="20" rx="9" /></g>
                                <g transform="translate(92 -44)"><Fist m={v.model} back /></g>
                            </g>
                        </g>
                        <Torso m={v.model} />
                        <Core />
                        {off < 4 && <PlateAt m={v.model} i={3} />}
                        {DENTS.slice(0, Math.min(DENTS.length, lost)).map((d, i) => (
                            <path key={i} className="rd-dent" transform={`translate(${d.x} ${d.y}) rotate(${d.r})`} d="M-9 -2 Q0 6 9 -2 M-2 2 l-4 7 M3 2 l5 6" />
                        ))}
                        {off < 3 && <PlateAt m={v.model} i={2} />}
                        <g transform="translate(0 -200)">
                            <g className="rd-head">
                                <HeadArt m={v.model} eyes={eyes} />
                                {off < 2 && <g transform={`translate(${PLATE_AT[1].x} ${PLATE_AT[1].y + 200})`}><Plate m={v.model} i={1} /></g>}
                                {off >= 2 && <path className="rd-stub" d="M-14 -60 v-6 M10 -60 v-6" />}
                            </g>
                        </g>
                        {/* The front arm: guard up; a punch drives the piston out and the fist into the other robot. */}
                        <circle className="rd-joint" cx="26" cy="-176" r="15" />
                        <g transform="translate(26 -176)">
                            <g key={v.atk.n} className={`rd-armf${v.atk.n ? ` is-${v.atk.kind}` : ''}`}>
                                <g className="rd-piston"><rect className="rd-metal" x="0" y="-10" width={fx - 16} height="20" rx="8" /><path className="rd-line" d={`M14 -10 v20 M${fx - 34} -10 v20`} /></g>
                                <g transform={`translate(${fx} 0)`}>
                                    {v.atk.n > 0 && v.atk.kind === 'special' && <circle className="rd-charge" r="40" />}
                                    {v.ready && <circle className="rd-ready" r="34" />}
                                    <g className="rd-fist">
                                        {v.atk.kind === 'special' && v.model === 'bruiser' && <Flame />}
                                        <Fist m={v.model} />
                                    </g>
                                </g>
                            </g>
                        </g>
                        {off < 1 ? <PlateAt m={v.model} i={0} /> : low && <g transform="translate(36 -194)"><Crackle /></g>}
                        {low && <g transform="translate(-10 -262)"><Smoke n={v.lives <= 1 ? 3 : 2} /></g>}
                        {/* The laser: the core charges, then a beam to the other robot. */}
                        {v.model === 'sleek' && v.atk.n > 0 && v.atk.kind === 'special' && (
                            <g key={`l${v.atk.n}`}>
                                <g transform="translate(-3 -158)"><circle className="rd-charge is-core" r="34" /></g>
                                <g transform="translate(30 -158)">
                                    <g className="rd-beam">
                                        <rect className="rd-beam-out" x="0" y="-15" width="268" height="30" rx="15" />
                                        <rect className="rd-beam-in" x="0" y="-6" width="266" height="12" rx="6" />
                                    </g>
                                </g>
                            </g>
                        )}
                    </g>
                </g>
            </g>
            {v.oops > 0 && (
                <g key={`z${v.oops}`} transform="translate(-6 -272)">
                    <path className="rd-zap" d="M-18 -4 l9 -12 l5 9 l9 -14 l5 9" />
                </g>
            )}
            {v.guardDown && !v.won && (
                <g transform="translate(0 -300)">
                    <g className="rd-warn">
                        <path className="rd-warn-sign" d="M0 -22 L22 16 L-22 16 Z" />
                        <path className="rd-warn-mark" d="M0 -8 v12 M0 10 v1" />
                    </g>
                </g>
            )}
            {/* Fallen plates stay on the mat for the rest of the round. */}
            {Array.from({ length: off }, (_, i) => (
                <g key={`p${i}`} transform={`translate(${PLATE_AT[i].x} ${PLATE_AT[i].y})`}>
                    <g className="rd-plate-fall" style={{ '--fx': `${PLATE_FALL[i].x}px`, '--fy': `${-PLATE_AT[i].y - 8}px`, '--fr': `${PLATE_FALL[i].r}deg` } as CSSProperties}>
                        <Plate m={v.model} i={i} />
                    </g>
                </g>
            ))}
        </g>
    );
}

// A few sparks that sputter from a torn joint, on a loop.
function Crackle() {
    return (
        <g className="rd-crackle">
            {[[-10, -14, 0], [12, -10, 1], [2, -20, 2]].map(([x, y, k]) => (
                <path key={k} className="rd-spark-loop" style={{ '--k': k } as CSSProperties} d={`M0 0 L${x} ${y}`} />
            ))}
        </g>
    );
}

// Smoke puffs rising from (0, 0), on a loop.
function Smoke({ n }: { n: number }) {
    return (
        <g className="rd-smoke-loop">
            {Array.from({ length: n }, (_, k) => <circle key={k} className="rd-puff" r={10 + k * 3} style={{ '--k': k } as CSSProperties} />)}
        </g>
    );
}

// Bolts and nuts that bounce out of a falling robot: [x on the floor, how high, spin].
const BOLTS = [[-120, 120, 540], [-70, 160, -400], [-160, 90, 300], [60, 140, -620], [-30, 190, 480], [110, 100, -300], [-200, 70, 720]] as const;

// A robot at 0: it bursts into parts that fall on the mat, bolts bounce, smoke rises, sparks crackle.
function Wreck({ v }: { v: RobotView }) {
    const m = v.model;
    const part = (name: string, children: ReactNode, at: { x: number; y: number }) => (
        <g transform={`translate(${at.x} ${at.y})`}>
            <g className={`rd-part is-${name}`}>{children}</g>
        </g>
    );
    return (
        <g className={`rd-bot is-${v.side} is-${m} is-ko`}>
            <ellipse className="rd-shadow" cx="-30" cy="2" rx="110" ry="10" />
            {part('legs', <Legs m={m} />, { x: 0, y: 0 })}
            {part('torso', <g transform="translate(0 92)"><Torso m={m} /><Core /></g>, { x: 0, y: -92 })}
            {part('armb', <g transform="translate(0 0)"><rect className="rd-metal-dk" x="-46" y="-10" width="70" height="20" rx="9" /><g transform="translate(36 0)"><Fist m={m} back /></g></g>, { x: -28, y: -184 })}
            {part('armf', <g><rect className="rd-metal" x="-40" y="-10" width="60" height="20" rx="8" /><g transform="translate(36 0)"><Fist m={m} /></g></g>, { x: 40, y: -176 })}
            {part('head', <g transform="translate(0 30)"><HeadArt m={m} eyes="off" /></g>, { x: 0, y: -230 })}
            {BOLTS.map(([x, h, r], k) => (
                <g key={k} transform="translate(0 -150)">
                    <g className="rd-bolt-x" style={{ '--bx': `${x}px`, '--k': k } as CSSProperties}>
                        <g className="rd-bolt-y" style={{ '--bh': `${-h}px`, '--by': '146px', '--k': k } as CSSProperties}>
                            <g className="rd-bolt-r" style={{ '--br': `${r}deg`, '--k': k } as CSSProperties}>
                                {k % 2 ? <rect className="rd-screw" x="-3" y="-9" width="6" height="18" rx="2" /> : <><path className="rd-nut" d="M-7 -4 L0 -8 L7 -4 L7 4 L0 8 L-7 4 Z" /><circle className="rd-nut-hole" r="2.6" /></>}
                            </g>
                        </g>
                    </g>
                </g>
            ))}
            <g transform="translate(-40 -150)"><Boom /></g>
            <g transform="translate(-50 -40)"><Smoke n={4} /></g>
            <g transform="translate(10 -70)"><Crackle /></g>
            <g transform="translate(-110 -30)"><Crackle /></g>
        </g>
    );
}

// The KO's burst: a flash, a ring of sparks and a puff of smoke.
function Boom() {
    return (
        <g className="rd-boom">
            <circle className="rd-boom-flash" r="80" />
            {Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * Math.PI * 2;
                return <g key={i} className="rd-spark" style={{ '--dx': `${Math.cos(a) * 130}px`, '--dy': `${Math.sin(a) * 110}px`, '--k': i % 3 } as CSSProperties}><path d="M-10 0 L10 0" transform={`rotate(${(a * 180) / Math.PI})`} /></g>;
            })}
            {[[-40, -10, 34], [30, -20, 40], [0, 20, 46], [-60, 30, 30], [60, 26, 32]].map(([x, y, r], i) => (
                <circle key={i} className="rd-boom-puff" cx={x} cy={y} r={r} style={{ '--k': i } as CSSProperties} />
            ))}
        </g>
    );
}

// ── Effects in scene units ────────────────────────────────────────────────────────────────────────

export interface Pow { id: number; side: Side; kind: HitKind; double: boolean; word: string }

const starPath = (spikes: number, r1: number, r2: number) => {
    const pts: string[] = [];
    for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 ? r2 : r1 * (i % 4 === 0 ? 1 : 0.86);
        pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`);
    }
    return `M${pts.join(' L')} Z`;
};
const STAR_SMALL = starPath(12, 58, 36);
const STAR_BIG = starPath(14, 86, 52);

// The comic burst on a hit: a spiky star with a word, sparks flying out. Never mirrored (scene units).
export function PowBurst({ p }: { p: Pow }) {
    const at = impactAt(p.side);
    const big = p.kind === 'special';
    const tilt = p.side === 'left' ? -8 : 8;
    return (
        <g transform={`translate(${at.x} ${at.y - 10})`}>
            <g className={`rd-pow${big ? ' is-big' : ''}${p.double ? ' is-double' : ''}`} style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
                <circle className="rd-pow-flash" r={big ? 90 : 60} />
                {p.double && <path className="rd-pow-ring" d={big ? starPath(16, 110, 80) : starPath(14, 80, 56)} />}
                <path className="rd-pow-star" d={big ? STAR_BIG : STAR_SMALL} />
                <text className="rd-pow-text" y={big ? 10 : 8} textAnchor="middle">{p.word}</text>
            </g>
            {Array.from({ length: big ? 12 : 8 }, (_, i) => {
                const a = (i / (big ? 12 : 8)) * Math.PI * 2 + 0.3;
                const d = big ? 140 : 96;
                return <g key={i} className="rd-spark" style={{ '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d * 0.8}px`, '--k': i % 3 } as CSSProperties}><path d="M-10 0 L10 0" transform={`rotate(${(a * 180) / Math.PI})`} /></g>;
            })}
        </g>
    );
}

// ── The arena ─────────────────────────────────────────────────────────────────────────────────────

// The crowd: rows of fans behind the ring; [y, size, offset, row class].
const ROWS = [[214, 12, 0, 'is-back'], [236, 14, 17, 'is-mid'], [258, 16, 6, 'is-front']] as const;
// Raised signs and glow sticks in the crowd (x, row) and camera flashes (x, y).
const SIGNS = [[-180, 1, 'left'], [40, 2, 'left'], [150, 0, 'left'], [640, 0, 'right'], [760, 2, 'right'], [980, 1, 'right']] as const;
const FLASHES = [[-120, 196], [70, 214], [180, 200], [330, 206], [470, 198], [590, 212], [720, 196], [900, 210], [-260, 206], [1040, 200]] as const;

function Crowd() {
    return (
        <g className="rd-crowd">
            {ROWS.map(([y, r, off, cls], row) => (
                <g key={row} className={`rd-row ${cls}`} style={{ '--k': row } as CSSProperties}>
                    {Array.from({ length: 68 }, (_, i) => {
                        const x = -900 + off + i * (r * 2.6);
                        const h = (i * 37 + row * 11) % 7;
                        return (
                            <g key={i} transform={`translate(${x} ${y + (h % 3) * 2})`}>
                                <path className="rd-fan" d={`M${-r * 1.2} ${r * 2} Q${-r * 1.2} ${r * 0.6} 0 ${r * 0.6} Q${r * 1.2} ${r * 0.6} ${r * 1.2} ${r * 2} Z`} />
                                <circle className="rd-fan" cx="0" cy="0" r={r} />
                            </g>
                        );
                    })}
                </g>
            ))}
            {SIGNS.map(([x, row, side], i) => (
                <g key={i} transform={`translate(${x} ${ROWS[row][0] - 30})`}>
                    <g className="rd-sign" style={{ '--k': i } as CSSProperties}>
                        <path className="rd-stick" d="M0 30 V8" />
                        <rect className={`rd-sign-card is-${side}`} x="-20" y="-14" width="40" height="24" rx="4" />
                        <path className="rd-sign-bolt" d="M3 -9 L-6 0 L0 0 L-3 7 L6 -2 L0 -2 Z" />
                    </g>
                </g>
            ))}
            {FLASHES.map(([x, y], i) => (
                <path key={i} className="rd-flash" transform={`translate(${x} ${y})`} style={{ '--k': i } as CSSProperties} d="M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2 Z" />
            ))}
        </g>
    );
}

// The big screen over the ring: the two team colours, a lightning bolt and VS. It flashes on every hit.
function BigScreen({ flash }: { flash: number }) {
    return (
        <g>
            <path className="rd-strut" d="M350 -24 L356 -8 M450 -24 L444 -8" />
            <rect className="rd-screen-frame" x="322" y="-10" width="156" height="78" rx="10" />
            <rect className="rd-screen is-left" x="330" y="-2" width="70" height="62" rx="4" />
            <rect className="rd-screen is-right" x="400" y="-2" width="70" height="62" rx="4" />
            <g transform="translate(365 50) scale(0.5)"><HeadArt m="bruiser" eyes="open" /></g>
            <g transform="translate(435 50) scale(-0.5 0.5)"><HeadArt m="sleek" eyes="open" /></g>
            <path className="rd-screen-bolt" d="M404 2 L391 32 L402 32 L395 58 L412 26 L401 26 L409 2 Z" />
            {flash > 0 && <rect key={flash} className="rd-screen-flash" x="330" y="-2" width="140" height="62" rx="4" />}
        </g>
    );
}

function Ring() {
    const posts = [[96, 268, 112], [704, 268, 112]] as const;
    return (
        <g className="rd-ring">
            {/* The ropes behind the robots, then the corner posts. */}
            {[176, 206, 236].map(y => (
                <g key={y}>
                    <path className="rd-rope-glow" d={`M96 ${y} L704 ${y}`} />
                    <path className="rd-rope" d={`M96 ${y} L704 ${y}`} />
                    <path className="rd-rope-glow" d={`M96 ${y} L22 ${y + 34}`} />
                    <path className="rd-rope" d={`M96 ${y} L22 ${y + 34}`} />
                    <path className="rd-rope-glow" d={`M704 ${y} L778 ${y + 34}`} />
                    <path className="rd-rope" d={`M704 ${y} L778 ${y + 34}`} />
                </g>
            ))}
            {posts.map(([x, y, h], i) => (
                <g key={i}>
                    <rect className="rd-post" x={x - 7} y={y - h} width="14" height={h} rx="4" />
                    <rect className={`rd-pad is-${i ? 'right' : 'left'}`} x={x - 11} y={y - h - 4} width="22" height="78" rx="8" />
                </g>
            ))}
            <path className="rd-mat" d="M96 268 L704 268 L786 324 L14 324 Z" />
            <path className="rd-mat-line" d="M400 270 L400 322" />
            <ellipse className="rd-mat-logo" cx="400" cy="296" rx="70" ry="16" />
            <path className="rd-mat-bolt" d="M406 284 L390 298 L400 298 L394 310 L412 294 L402 294 Z" />
            <rect className="rd-apron" x="14" y="324" width="772" height="80" />
            <path className="rd-apron-neon" d="M14 324 L786 324" />
            {[[22, 'left'], [778, 'right']].map(([x, s]) => (
                <g key={s}>
                    <rect className="rd-post" x={(x as number) - 8} y="190" width="16" height="140" rx="4" />
                    <rect className={`rd-pad is-${s}`} x={(x as number) - 12} y="186" width="24" height="86" rx="8" />
                </g>
            ))}
        </g>
    );
}

export interface SceneProps {
    left: RobotView;
    right: RobotView;
    pows: Pow[];
    // Hits so far (the big screen flashes).
    hits: number;
    // The round's winner side: the crowd cheers, fireworks in that colour.
    cheer: Side | 'draw' | null;
}

export function Scene({ left, right, pows, hits, cheer }: SceneProps) {
    // Fighting-game layering: an attacking robot (and its fist) goes in front of the other.
    const front = left.atk.n >= right.atk.n ? 'left' : 'right';
    const robot = (v: RobotView) => (
        <g key={v.side} transform={v.side === 'left' ? `translate(${ROBOT_X.left} ${FLOOR})` : `translate(${ROBOT_X.right} ${FLOOR}) scale(-1 1)`}>
            <Robot v={v} />
        </g>
    );
    return (
        <svg className={`rd-scene${cheer ? ' is-cheer' : ''}`} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
            <defs>
                <radialGradient id="rd-glow-warm"><stop offset="0" className="rd-stop-hot" /><stop offset="0.45" className="rd-stop-warm" /><stop offset="1" className="rd-stop-none" /></radialGradient>
                <radialGradient id="rd-glow-cool"><stop offset="0" className="rd-stop-hot" /><stop offset="0.45" className="rd-stop-cool" /><stop offset="1" className="rd-stop-none" /></radialGradient>
                <radialGradient id="rd-glow-warn"><stop offset="0.55" className="rd-stop-none" /><stop offset="0.85" className="rd-stop-warn" /><stop offset="1" className="rd-stop-none" /></radialGradient>
                <linearGradient id="rd-spot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" className="rd-stop-spot" /><stop offset="1" className="rd-stop-none" /></linearGradient>
            </defs>
            <rect className="rd-wall" x="-1600" y="-600" width="4000" height="900" />
            <rect className="rd-truss" x="-1600" y="-34" width="4000" height="10" />
            {Array.from({ length: 40 }, (_, i) => <circle key={i} className="rd-lamp" cx={-1000 + i * 70} cy="-20" r="6" style={{ '--k': i % 5 } as CSSProperties} />)}
            <BigScreen flash={hits} />
            <Crowd />
            {[[110, 'is-a'], [690, 'is-b']].map(([x, c]) => (
                <g key={c} transform={`translate(${x} -10)`}><path className={`rd-spot ${c}`} d="M0 0 L-70 330 L70 330 Z" /></g>
            ))}
            {cheer && cheer !== 'draw' && <Fireworks side={cheer} />}
            <Ring />
            {(front === 'left' ? [right, left] : [left, right]).map(robot)}
            {pows.map(p => <PowBurst key={p.id} p={p} />)}
        </svg>
    );
}

// Fireworks over the crowd in the winner's colour: rays that burst, again and again.
function Fireworks({ side }: { side: Side }) {
    const at = [[150, 70, 0], [400, 30, 1], [650, 70, 2], [270, 20, 3], [540, 18, 4]] as const;
    return (
        <g className={`rd-fireworks is-${side}`}>
            {at.map(([x, y, k]) => (
                <g key={k} transform={`translate(${x} ${y})`}>
                    <g className="rd-firework" style={{ '--k': k } as CSSProperties}>
                        {Array.from({ length: 10 }, (_, i) => <path key={i} className={i % 2 ? 'rd-ray is-star' : 'rd-ray'} transform={`rotate(${i * 36})`} d="M14 0 L40 0" />)}
                    </g>
                </g>
            ))}
        </g>
    );
}

// A small robot for the round / match card: the winner's victory pose.
export function CardRobot({ side }: { side: Side }) {
    const v: RobotView = { side, model: MODEL[side], lives: 1, max: 1, atk: { n: 0, kind: 'punch' }, hit: { n: 0, kind: 'punch', double: false }, oops: 0, guardDown: false, won: true, ko: false };
    return (
        <svg className="rd-card-art" viewBox="-110 -300 220 310" aria-hidden>
            <g transform={side === 'right' ? 'scale(-1 1)' : undefined}><Robot v={v} /></g>
        </svg>
    );
}

// The face in a health bar's end cap.
export function Portrait({ side }: { side: Side }) {
    return (
        <svg className="rd-portrait" viewBox="-50 -72 100 80" aria-hidden>
            <g transform={side === 'right' ? 'scale(-1 1)' : undefined}><HeadArt m={MODEL[side]} eyes="open" /></g>
        </svg>
    );
}
