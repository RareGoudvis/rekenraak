import type { CSSProperties, ReactNode } from 'react';
import { isKid, type CustomerKind, type OrderKind } from './rule';

// Frituur's drawings: flat fills under the --spel-ink outline (frituur.css), each a <g> in its own box so the live
// scene (one small SVG per piece) and the end screen (one SVG) share them. People stand in a 100 × 200 box, feet
// on its bottom edge, facing a little to the left (the counter); the dog in 70 × 60; the frituur in 300 × 360;
// an order is centred on 0,0 (about 34 units tall); the street is 700 × 560 with the pavement at 480.

// tantrum = a short strop after the wrong snack (arms flailing, shouting), before stomping off.
export type Pose = 'wait' | 'low' | 'frown' | 'served' | 'happy' | 'grumpy' | 'tantrum';
type Pt = readonly [number, number];

interface Body {
    head: readonly [number, number, number];
    torso: readonly [number, number, number, number, number];
    // Legs: from the hip to the ankle; left edges; width.
    legs: Pt;
    legX: Pt;
    legW: number;
    sh: readonly [Pt, Pt];
    arm: number;
}

const ADULT: Body = { head: [50, 40, 17], torso: [30, 60, 40, 60, 14], legs: [112, 193], legX: [35, 53], legW: 12, sh: [[35, 70], [65, 70]], arm: 44 };
const KID: Body = { head: [50, 99, 17], torso: [33, 117, 34, 38, 11], legs: [148, 194], legX: [37, 52], legW: 11, sh: [[38, 125], [62, 125]], arm: 30 };
const OPA: Body = { head: [48, 46, 16], torso: [29, 64, 42, 58, 15], legs: [114, 193], legX: [35, 53], legW: 12, sh: [[35, 74], [65, 74]], arm: 42 };

const bodyOf = (kind: CustomerKind) => (isKid(kind) ? KID : kind === 'opa' ? OPA : ADULT);

interface Arms { l: string; r: string; hl: Pt; hr: Pt }

function armsOf(b: Body, kind: CustomerKind, pose: Pose): Arms {
    const [[lx, ly], [rx, ry]] = b.sh;
    const a = b.arm;
    const cx = b.head[0];
    const arm = (s: Pt, e: Pt, h: Pt) => `M${s[0]} ${s[1]} Q${e[0]} ${e[1]} ${h[0]} ${h[1]}`;
    const make = (el: Pt, hl: Pt, er: Pt, hr: Pt): Arms => ({ l: arm([lx, ly], el, hl), r: arm([rx, ry], er, hr), hl, hr });
    const crossed = () => make([lx - 2, ly + a * 0.6], [cx + 11, ly + a * 0.42], [rx + 2, ry + a * 0.6], [cx - 11, ry + a * 0.42]);
    switch (pose) {
        // One hand takes the order over the counter, the other gives a thumbs up.
        case 'served': return make([lx - 14, ly + a * 0.55], [lx - 22, ly + a * 0.32], [rx + 14, ry + a * 0.05], [rx + 9, ry - a * 0.42]);
        // Walking off eating: the order up at the mouth.
        case 'happy': return make([lx - 12, ly + a * 0.7], [cx - 15, b.head[1] + b.head[2] + 9], [rx + 8, ry + a * 0.5], [rx + 9, ry + a * 0.95]);
        // Hands on the hips: "dat heb ik niet besteld".
        case 'frown': return make([lx - 13, ly + a * 0.45], [lx - 1, ly + a * 0.8], [rx + 13, ry + a * 0.45], [rx + 1, ry + a * 0.8]);
        case 'grumpy': return crossed();
        // A strop: both arms up and flailing (CSS swings them round the shoulders).
        case 'tantrum': return make([lx - 15, ly - a * 0.15], [lx - 12, ly - a * 0.72], [rx + 15, ry - a * 0.15], [rx + 12, ry - a * 0.72]);
        // Impatient: a grown-up looks at the watch, a kid folds the arms.
        case 'low': return isKid(kind) ? crossed() : make([lx - 5, ly + a * 0.5], [lx - 6, ly + a], [rx + 10, ry + a * 0.65], [cx + 3, ly + a * 0.38]);
        default: return make([lx - 5, ly + a * 0.5], [lx - 6, ly + a], [rx + 5, ry + a * 0.5], [rx + 6, ry + a]);
    }
}

function Hair({ kind, look, b }: { kind: CustomerKind; look: number; b: Body }): ReactNode {
    const [cx, cy, r] = b.head;
    const cap = `M${cx - r} ${cy - 2} Q${cx - r} ${cy - r - 3} ${cx} ${cy - r - 3} Q${cx + r} ${cy - r - 3} ${cx + r} ${cy - 2} Q${cx + r - 4} ${cy - r + 4} ${cx} ${cy - r + 5} Q${cx - r + 4} ${cy - r + 4} ${cx - r} ${cy - 2} Z`;
    const v = look % 3;
    if (kind === 'opa') {
        return (
            <>
                <path className="fr-hair is-grey" d={`M${cx - r} ${cy + 2} Q${cx - r - 3} ${cy - 6} ${cx - r + 3} ${cy - 8} L${cx - r + 4} ${cy + 1} Z M${cx + r} ${cy + 2} Q${cx + r + 3} ${cy - 6} ${cx + r - 3} ${cy - 8} L${cx + r - 4} ${cy + 1} Z`} />
                {/* The flat cap (een pet), its brim towards the counter. */}
                <path className="fr-cap" d={`M${cx - r - 1} ${cy - 5} Q${cx - r} ${cy - r - 7} ${cx + 3} ${cy - r - 6} Q${cx + r + 3} ${cy - r - 5} ${cx + r + 1} ${cy - 5} Z`} />
                <path className="fr-cap" d={`M${cx - r} ${cy - 5} L${cx - r - 10} ${cy - 3} Q${cx - r - 5} ${cy - 8} ${cx - r + 1} ${cy - 8} Z`} />
            </>
        );
    }
    if (kind === 'hond') {
        // The dog's owner wears a beanie with a bobble.
        return (
            <>
                <path className={`fr-beanie is-${look % 3}`} d={`M${cx - r - 1} ${cy - 3} Q${cx} ${cy - r - 14} ${cx + r + 1} ${cy - 3} Z`} />
                <rect className={`fr-beanie is-${look % 3}`} x={cx - r - 2} y={cy - 7} width={2 * r + 4} height={7} rx={3} />
                <circle className="fr-bobble" cx={cx + 1} cy={cy - r - 9} r={4.5} />
            </>
        );
    }
    const hair = `fr-hair is-${look % 4}`;
    if (kind === 'mama') {
        if (v === 0) return <path className={hair} d={`M${cx - r - 1} ${cy - 1} Q${cx - r} ${cy - r - 5} ${cx + 1} ${cy - r - 4} Q${cx + r + 1} ${cy - r - 4} ${cx + r + 1} ${cy - 1} Q${cx + 4} ${cy - r + 3} ${cx - 4} ${cy - r + 6} Q${cx - r + 2} ${cy - 6} ${cx - r - 1} ${cy - 1} Z`} />;
        if (v === 1) return <><circle className={hair} cx={cx + 3} cy={cy - r - 5} r={7} /><path className={hair} d={cap} /></>;
        return <path className={hair} d={cap} />;
    }
    if (kind === 'papa') {
        if (v === 2) {
            // A cap, its peak towards the counter.
            return (
                <>
                    <path className={`fr-peak is-${look % 3}`} d={`M${cx - r} ${cy - 3} Q${cx} ${cy - r - 9} ${cx + r} ${cy - 3} Z`} />
                    <path className={`fr-peak is-${look % 3}`} d={`M${cx - r + 3} ${cy - 4} L${cx - r - 13} ${cy - 1} Q${cx - r - 8} ${cy - 7} ${cx - r + 3} ${cy - 8} Z`} />
                </>
            );
        }
        return <path className={hair} d={cap} />;
    }
    if (kind === 'voetballer') return <path className={hair} d={cap} />;
    // Kids: pigtails, spikes or curls.
    if (v === 0) return <><circle className={hair} cx={cx - r - 4} cy={cy - 1} r={6} /><circle className={hair} cx={cx + r + 4} cy={cy - 1} r={6} /><path className={hair} d={cap} /></>;
    if (v === 1) return <path className={hair} d={`M${cx - r} ${cy - 2} L${cx - r + 1} ${cy - r - 3} L${cx - 7} ${cy - r} L${cx - 3} ${cy - r - 7} L${cx + 2} ${cy - r - 1} L${cx + 8} ${cy - r - 6} L${cx + r - 1} ${cy - r + 1} L${cx + r} ${cy - 2} Q${cx} ${cy - r + 5} ${cx - r} ${cy - 2} Z`} />;
    return <g className={hair}>{[-13, -6, 1, 8, 14].map((dx, i) => <circle key={i} cx={cx + dx} cy={cy - r + 1 + (i % 2) * 2 - (Math.abs(dx) < 9 ? 3 : 0)} r={6} />)}</g>;
}

// Long hair behind the head (mama's first look).
function HairBack({ kind, look, b }: { kind: CustomerKind; look: number; b: Body }): ReactNode {
    const [cx, cy, r] = b.head;
    if (kind === 'mama' && look % 3 === 0) return <path className={`fr-hair is-${look % 4}`} d={`M${cx - r - 3} ${cy} Q${cx - r - 5} ${cy + r + 12} ${cx - r + 3} ${cy + r + 15} L${cx + r - 3} ${cy + r + 15} Q${cx + r + 5} ${cy + r + 12} ${cx + r + 3} ${cy} Z`} />;
    if (kind === 'mama' && look % 3 === 2) return <path className={`fr-hair is-${look % 4}`} d={`M${cx + r - 3} ${cy - 9} Q${cx + r + 14} ${cy - 4} ${cx + r + 9} ${cy + 18} Q${cx + r + 4} ${cy + 4} ${cx + r - 4} ${cy + 1} Z`} />;
    return null;
}

function Face({ b, pose, kind }: { b: Body; pose: Pose; kind: CustomerKind }): ReactNode {
    const [cx, cy] = b.head;
    const e1 = cx - 6, e2 = cx + 5, ey = cy - 1;
    const glasses = kind === 'opa';
    const brows = pose === 'grumpy' || pose === 'tantrum' ? `M${e1 - 4} ${ey - 7} L${e1 + 3} ${ey - 4} M${e2 - 3} ${ey - 4} L${e2 + 4} ${ey - 7}`
        : pose === 'frown' ? `M${e1 - 4} ${ey - 8} Q${e1} ${ey - 10} ${e1 + 3} ${ey - 7} M${e2 - 3} ${ey - 5} L${e2 + 4} ${ey - 5}`
        : pose === 'low' ? `M${e1 - 4} ${ey - 4} L${e1 + 3} ${ey - 7} M${e2 - 3} ${ey - 7} L${e2 + 4} ${ey - 4}` : null;
    // Looking at the watch: the eyes go down to the right; otherwise a little to the left, at the counter.
    const look = pose === 'low' && !isKid(kind) ? [1.2, 1.6] : [-0.9, 0];
    return (
        <g className="fr-face">
            <circle className="fr-blush" cx={cx - 11} cy={cy + 5} r={3.4} />
            <circle className="fr-blush" cx={cx + 10} cy={cy + 5} r={3.4} />
            {pose === 'served' ? (
                <path className="fr-line" d={`M${e1 - 3} ${ey + 1} Q${e1} ${ey - 3} ${e1 + 3} ${ey + 1} M${e2 - 3} ${ey + 1} Q${e2} ${ey - 3} ${e2 + 3} ${ey + 1}`} />
            ) : (
                <g className="fr-eyes">
                    <circle className="fr-pupil" cx={e1 + look[0]} cy={ey + look[1]} r={2.5} />
                    <circle className="fr-pupil" cx={e2 + look[0]} cy={ey + look[1]} r={2.5} />
                </g>
            )}
            {glasses && <path className="fr-glasses" d={`M${e1 + 5} ${ey} a5 5 0 1 0 -10 0 a5 5 0 1 0 10 0 M${e2 + 5} ${ey} a5 5 0 1 0 -10 0 a5 5 0 1 0 10 0 M${e1 + 5} ${ey - 1} L${e2 - 5} ${ey - 1}`} />}
            {brows && <path className="fr-line" d={brows} />}
            {pose === 'served' ? <path className="fr-mouth-open" d={`M${cx - 7} ${cy + 6} Q${cx - 1} ${cy + 17} ${cx + 5} ${cy + 6} Z`} />
                : pose === 'happy' ? <ellipse className="fr-mouth-open fr-chew" cx={cx - 2} cy={cy + 8} rx={3.4} ry={2.8} />
                : pose === 'frown' ? <ellipse className="fr-mouth-open" cx={cx - 1} cy={cy + 9} rx={2.6} ry={3.2} />
                : pose === 'grumpy' ? <path className="fr-line" d={`M${cx - 6} ${cy + 10} Q${cx - 1} ${cy + 6} ${cx + 4} ${cy + 10}`} />
                : pose === 'tantrum' ? <ellipse className="fr-mouth-open fr-shout" cx={cx - 1} cy={cy + 9} rx={5} ry={4.5} />
                : pose === 'low' ? <path className="fr-line" d={`M${cx - 6} ${cy + 9} Q${cx - 3} ${cy + 7} ${cx} ${cy + 9} Q${cx + 3} ${cy + 11} ${cx + 5} ${cy + 9}`} />
                : <path className="fr-line" d={`M${cx - 6} ${cy + 7} Q${cx - 1} ${cy + 12} ${cx + 4} ${cy + 7}`} />}
            {pose === 'tantrum' && isKid(kind) && (
                // A kid's strop: tears spraying out sideways.
                <g className="fr-tears">
                    <path className="fr-tear" d={`M${e1 - 4} ${ey + 2} q-6 -2 -10 2`} />
                    <path className="fr-tear is-r" d={`M${e2 + 4} ${ey + 2} q6 -2 10 2`} />
                </g>
            )}
            {kind === 'opa' && <path className="fr-moustache" d={`M${cx - 9} ${cy + 6} Q${cx - 5} ${cy + 2} ${cx - 1} ${cy + 5} Q${cx + 3} ${cy + 2} ${cx + 7} ${cy + 6} Q${cx - 1} ${cy + 10} ${cx - 9} ${cy + 6} Z`} />}
        </g>
    );
}

function Legs({ b, kind, look }: { b: Body; kind: CustomerKind; look: number }): ReactNode {
    const [y0, y1] = b.legs;
    const shorts = kind === 'voetballer';
    return (
        <>
            {b.legX.map((x, i) => (
                <g key={i} className={`fr-leg is-${i ? 'b' : 'a'}`} style={{ transformOrigin: `${x + b.legW / 2}px ${y0}px` }}>
                    {shorts ? (
                        <>
                            <rect className="fr-skin-fill" x={x + 1} y={y0} width={b.legW - 2} height={y1 - y0} rx={4} />
                            {/* Striped football socks. */}
                            <rect className="fr-sock" x={x} y={y1 - 20} width={b.legW} height={20} rx={3} />
                            <path className="fr-sock-band" d={`M${x} ${y1 - 14} h${b.legW}`} />
                            <rect className={`fr-shirt is-${look % 6}`} x={x - 1} y={y0 - 2} width={b.legW + 2} height={14} rx={3} />
                        </>
                    ) : (
                        <rect className={`fr-pants is-${kind === 'opa' ? 1 : look % 3}`} x={x} y={y0} width={b.legW} height={y1 - y0} rx={5} />
                    )}
                    <ellipse className="fr-shoe" cx={x + b.legW / 2 - 3} cy={y1 + 2} rx={9} ry={4.6} />
                </g>
            ))}
        </>
    );
}

/** A customer in the 100 × 200 box; `item` = the order in hand (served: held out, happy: at the mouth). */
export function PersonG({ kind, look, pose, item }: { kind: CustomerKind; look: number; pose: Pose; item?: OrderKind | null }): ReactNode {
    const b = bodyOf(kind);
    const [cx, cy, r] = b.head;
    const [tx, ty, tw, th, trx] = b.torso;
    const arms = armsOf(b, kind, pose);
    const skin = `is-${look % 3}`;
    const shirt = `fr-shirt is-${look % 6}`;
    const hand = pose === 'served' ? arms.hl : pose === 'happy' ? arms.hl : null;
    // The arms swing round their shoulders (a strop).
    const oL = { transformOrigin: `${b.sh[0][0]}px ${b.sh[0][1]}px` };
    const oR = { transformOrigin: `${b.sh[1][0]}px ${b.sh[1][1]}px` };
    return (
        <g className={`fr-person is-${kind} is-${pose}`} style={{ '--skin': `var(--fr-skin-${look % 3})` } as CSSProperties}>
            <HairBack kind={kind} look={look} b={b} />
            <Legs b={b} kind={kind} look={look} />
            {/* The arm behind the body first, so a crossed arm lies over the shirt. */}
            <path className="fr-arm-line fr-limb is-r" d={arms.r} style={oR} />
            <path className={`fr-arm fr-limb is-r ${shirt}`} d={arms.r} style={oR} />
            <rect className={shirt} x={tx} y={ty} width={tw} height={th} rx={trx} />
            {kind === 'voetballer' && <path className="fr-stripe" d={`M${tx + tw * 0.33} ${ty + 2} V${ty + th - 2} M${tx + tw * 0.67} ${ty + 2} V${ty + th - 2}`} />}
            {kind === 'opa' && <path className="fr-buttons" d={`M${cx + 1} ${ty + 14} v0.1 M${cx + 1} ${ty + 26} v0.1 M${cx + 1} ${ty + 38} v0.1`} />}
            {kind === 'mama' && <path className="fr-collar" d={`M${cx - 8} ${ty + 1} L${cx} ${ty + 10} L${cx + 8} ${ty + 1}`} />}
            <path className="fr-arm-line fr-limb is-l" d={arms.l} style={oL} />
            <path className={`fr-arm fr-limb is-l ${shirt}`} d={arms.l} style={oL} />
            <circle className={`fr-hand fr-limb is-l ${skin}`} cx={arms.hl[0]} cy={arms.hl[1]} r={5} style={oL} />
            <circle className={`fr-hand fr-limb is-r ${skin}`} cx={arms.hr[0]} cy={arms.hr[1]} r={5} style={oR} />
            {pose === 'served' && <rect className={`fr-hand ${skin}`} x={arms.hr[0] - 2.5} y={arms.hr[1] - 12} width={5} height={9} rx={2.5} />}
            {pose === 'low' && !isKid(kind) && <circle className="fr-watch" cx={arms.hr[0] - 1} cy={arms.hr[1] + 4} r={3.6} />}
            {kind === 'opa' && (pose === 'tantrum'
                // Opa shakes his cane in the air.
                ? <path className="fr-cane fr-limb is-r" style={oR} d={`M${arms.hr[0]} ${arms.hr[1] + 10} L${arms.hr[0] + 4} ${arms.hr[1] - 34} Q${arms.hr[0] + 5} ${arms.hr[1] - 44} ${arms.hr[0] - 4} ${arms.hr[1] - 41}`} />
                : <path className="fr-cane" d={`M${arms.hr[0] + 4} ${b.legs[1] + 4} L${arms.hr[0] + 2} ${b.legs[0] + 4} Q${arms.hr[0] + 2} ${b.legs[0] - 6} ${arms.hr[0] - 6} ${b.legs[0] - 2}`} />)}
            <rect className={`fr-skin-fill ${skin}`} x={cx - 5} y={cy + r - 4} width={10} height={9} />
            <circle className={`fr-head ${skin}`} cx={cx} cy={cy} r={r} />
            <Hair kind={kind} look={look} b={b} />
            <Face b={b} pose={pose} kind={kind} />
            {kind === 'papa' && look % 3 === 1 && <path className={`fr-hair is-${look % 4}`} d={`M${cx - r + 3} ${cy + 3} Q${cx - 1} ${cy + r + 9} ${cx + r - 3} ${cy + 3} Q${cx + 3} ${cy + 9} ${cx - 1} ${cy + 13} Q${cx - 5} ${cy + 9} ${cx - r + 3} ${cy + 3} Z`} />}
            {kind === 'voetballer' && (
                // A football at the feet (it rolls along on the way out).
                <g transform={`translate(80 ${b.legs[1] - 6})`}><g className="fr-ball"><circle className="fr-ball-white" r={9} /><path className="fr-ball-patch" d="M0 -4 L3.8 -1.2 L2.4 3.2 L-2.4 3.2 L-3.8 -1.2 Z" /></g></g>
            )}
            {hand && item && (
                <g transform={pose === 'happy' ? `translate(${hand[0] - 5} ${hand[1] + 6}) scale(1.1)` : `translate(${hand[0]} ${hand[1] - 8}) scale(1.35)`}>
                    <g className={`fr-held is-${pose}`}><OrderG kind={item} /></g>
                </g>
            )}
        </g>
    );
}

/** The dog beside its owner (70 × 60, paws on the bottom edge). */
export function DogG({ pose }: { pose: Pose }): ReactNode {
    const sad = pose === 'low' || pose === 'grumpy' || pose === 'frown';
    const bark = pose === 'tantrum';
    return (
        <g className={`fr-dog is-${pose}`}>
            <path className="fr-dog-tail" d="M54 31 Q66 22 62 10" style={{ transformOrigin: '54px 31px' }} />
            {[18, 26, 44, 52].map((x, i) => <rect key={i} className="fr-dog-fur" x={x - 3} y={38} width={7} height={21} rx={3} />)}
            <ellipse className="fr-dog-fur" cx={36} cy={34} rx={21} ry={11} />
            <ellipse className="fr-dog-spot" cx={42} cy={31} rx={7} ry={5} />
            <g className="fr-dog-head" style={{ transformOrigin: '18px 30px' }}>
                <circle className="fr-dog-fur" cx={15} cy={21} r={11} />
                <ellipse className="fr-dog-snout" cx={6} cy={25} rx={7} ry={5} />
                <circle className="fr-pupil" cx={1} cy={22} r={2.4} />
                <circle className="fr-pupil" cx={13} cy={18} r={2.2} />
                <path className={`fr-dog-ear${sad ? ' is-down' : ''}`} d={sad ? 'M18 12 Q28 14 26 30 Q20 26 18 12 Z' : 'M17 11 Q27 4 27 20 Q21 18 17 11 Z'} />
                {pose === 'happy' ? (
                    // A bit of sausage for the dog too.
                    <rect className="fr-sausage" x={-9} y={25} width={14} height={5} rx={2.5} transform="rotate(-8 -2 27)" />
                ) : bark ? (
                    // Barking: the jaw drops open.
                    <path className="fr-mouth-open" d="M-1 26 L9 28 L2 33 Z" />
                ) : !sad && <path className="fr-tongue" d="M4 29 Q5 36 9 34 Q10 31 8 29 Z" />}
            </g>
        </g>
    );
}

// ── The orders ─────────────────────────────────────────────────────────────
const FRIES = ['M-10 -3 L-11 -16 L-7 -16 L-6 -3 Z', 'M-5 -3 L-4 -19 L0 -19 L-1 -3 Z', 'M0 -3 L3 -17 L7 -16 L4 -3 Z', 'M4 -3 L9 -13 L12 -11 L8 -3 Z'];

function Cone(): ReactNode {
    return (
        <>
            {FRIES.map((d, i) => <path key={i} className="fr-fry" d={d} />)}
            <path className="fr-paper" d="M-13 -4 L13 -4 L0 19 Z" />
            <path className="fr-paper-stripe" d="M-8 -4 L0 19 M8 -4 L0 19" />
        </>
    );
}

function Tray({ children }: { children?: ReactNode }): ReactNode {
    return (
        <>
            {children}
            <path className="fr-paper" d="M-16 1 L16 1 L12 12 L-12 12 Z" />
            {/* The little wooden frietvorkje. */}
            <path className="fr-fork" d="M8 2 L14 -14" />
        </>
    );
}

export function OrderG({ kind }: { kind: OrderKind }): ReactNode {
    switch (kind) {
        case 'friet': return <g className="fr-order"><Cone /></g>;
        case 'slijm': return (
            <g className="fr-order"><Cone />
                <path className="fr-slijm" d="M-10 -9 Q-12 -18 -3 -16 Q0 -24 6 -16 Q13 -16 10 -8 L9 -2 Q7 1 6 -3 L5 -6 Q0 -4 -5 -6 L-6 0 Q-8 3 -9 -1 Z" />
            </g>
        );
        case 'mayo': return <g className="fr-order"><Cone /><path className="fr-mayo" d="M-9 -9 Q-11 -17 -3 -16 Q-1 -23 5 -16 Q12 -16 9 -8 Q0 -5 -9 -9 Z" /></g>;
        case 'stoofvlees': return (
            <g className="fr-order"><Tray>
                {FRIES.map((d, i) => <path key={i} className="fr-fry" d={d} transform="translate(0 6) scale(1.1 .7)" />)}
                <path className="fr-stoof" d="M-14 2 Q-13 -7 -5 -6 Q1 -12 7 -6 Q15 -7 14 2 Z" />
            </Tray></g>
        );
        case 'curryworst': return (
            <g className="fr-order"><Tray>
                <rect className="fr-sausage" x={-15} y={-7} width={30} height={9} rx={4.5} />
                <path className="fr-curry" d="M-12 -6 l4 -3 l4 3 l4 -3 l4 3 l4 -3 l4 3" />
            </Tray></g>
        );
        case 'frikandel': return (
            <g className="fr-order"><Tray>
                <rect className="fr-frikandel" x={-16} y={-5} width={32} height={7} rx={3.5} />
                {/* Speciaal: a line of mayo and chopped onion on top. */}
                <path className="fr-mayo-line" d="M-13 -5 q3 -3 6 0 q3 3 6 0 q3 -3 6 0 q3 3 6 0" />
                {[-9, -2, 5, 11].map(x => <rect key={x} className="fr-onion" x={x} y={-9} width={3} height={3} />)}
            </Tray></g>
        );
        case 'augurk': return (
            <g className="fr-order">
                <path className="fr-stick" d="M0 19 L0 4" />
                <ellipse className="fr-pickle" cx={0} cy={-5} rx={7} ry={13} transform="rotate(8)" />
                {[[-2, -12], [3, -6], [-3, 0], [2, 4]].map(([x, y], i) => <circle key={i} className="fr-pickle-bump" cx={x} cy={y} r={1.3} />)}
            </g>
        );
    }
}

// ── The frituur ────────────────────────────────────────────────────────────
// The awning's stripes: narrow at the wall, wider at the scalloped front edge.
const STRIPES = 10;
const BULBS = Array.from({ length: 10 }, (_, i) => 44 + i * 23.5);
const STEAM = [[64, 234, 0], [94, 230, 1], [122, 236, 2]] as const;
const OIL_BUBBLES = [[52, 0], [70, 1], [88, 2], [104, 3], [122, 4], [62, 5], [114, 6]] as const;

// shrug = the wrong snack went out: an apologetic shrug, palm up.
export type CookPose = 'idle' | 'serve' | 'shrug';

/** The frituur (300 × 360, ground at 360): the sign, the awning, the window with its fryer and cook, the counter. */
export function KioskG({ cook, clipId, beat = 0 }: { cook: CookPose; clipId: string; beat?: number }): ReactNode {
    const arm = cook === 'serve' ? 'M232 244 Q262 238 290 246' : cook === 'shrug' ? 'M232 244 Q256 246 262 226' : 'M232 244 Q246 258 252 270';
    const hand: Pt = cook === 'serve' ? [290, 246] : cook === 'shrug' ? [262, 224] : [252, 270];
    return (
        <g className={`fr-kiosk is-${cook}`}>
            {/* The chimney over the fryer puffs now and then. */}
            <rect className="fr-chimney" x={66} y={78} width={20} height={36} rx={3} />
            {[0, 1, 2].map(k => <circle key={k} className="fr-puff" cx={76} cy={70} r={8} style={{ '--k': k } as CSSProperties} />)}
            <rect className="fr-post" x={60} y={88} width={8} height={24} />
            <rect className="fr-post" x={232} y={88} width={8} height={24} />
            <rect className="fr-board" x={28} y={20} width={244} height={72} rx={14} />
            <rect className="fr-board-inner" x={38} y={30} width={224} height={52} rx={9} />
            <text className="fr-name" x={150} y={70} textAnchor="middle">FRITUUR</text>
            {BULBS.map((x, i) => (
                <g key={i}>
                    <circle className={`fr-bulb is-${i % 2 ? 'b' : 'a'}`} cx={x} cy={25} r={3.6} />
                    <circle className={`fr-bulb is-${i % 2 ? 'a' : 'b'}`} cx={x} cy={87} r={3.6} />
                </g>
            ))}
            <rect className="fr-roof" x={4} y={108} width={292} height={16} rx={4} />
            <rect className="fr-wall" x={14} y={124} width={272} height={236} />
            {/* The window: the tiled back wall, the fryer, the cook. */}
            <rect className="fr-window-back" x={26} y={182} width={248} height={92} rx={6} />
            <clipPath id={clipId}><rect x={26} y={182} width={248} height={92} rx={6} /></clipPath>
            <g clipPath={`url(#${clipId})`}>
                <path className="fr-tiles" d="M26 202 H274 M26 222 H274 M26 242 H274 M26 262 H274 M66 182 V274 M106 182 V274 M146 182 V274 M186 182 V274 M226 182 V274" />
                {/* The menu above the fryer (lines, no prices). */}
                <rect className="fr-menu" x={40} y={190} width={78} height={30} rx={3} />
                <path className="fr-menu-line" d="M47 199 h40 M47 206 h56 M47 213 h32" />
                <g className={`fr-cook is-${cook}`}>
                    <path className="fr-apron" d="M188 276 L192 240 Q212 228 234 240 L238 276 Z" />
                    <path className="fr-scarf" d="M202 236 L213 248 L224 236 Z" />
                    <path className="fr-arm-line" d="M194 244 Q170 246 150 236" />
                    <path className="fr-arm is-cook" d="M194 244 Q170 246 150 236" />
                    <circle className="fr-hand is-1" cx={150} cy={236} r={5} />
                    <rect className="fr-skin-fill is-1" x={208} y={226} width={10} height={9} />
                    <circle className="fr-head is-1" cx={213} cy={218} r={15} />
                    <path className="fr-toque" d="M199 212 L199 200 Q191 192 199 186 Q203 176 213 182 Q223 174 229 186 Q237 192 227 200 L227 212 Z" />
                    <path className="fr-toque-band" d="M199 206 H227" />
                    <circle className="fr-pupil" cx={217} cy={216} r={2.2} />
                    <circle className="fr-pupil" cx={226} cy={216} r={2.2} />
                    <path className="fr-moustache is-dark" d="M213 223 Q218 219 222 222 Q226 219 230 223 Q222 228 213 223 Z" />
                    {cook === 'shrug' ? <path className="fr-line" d="M216 229 Q219 226 222 229 Q225 232 228 229" /> : <path className="fr-line" d="M216 227 Q222 232 228 227" />}
                    {cook === 'shrug' && <path className="fr-line" d="M213 209 Q217 206 220 209 M223 209 Q227 206 230 209" />}
                    {cook === 'shrug' && <path className="fr-sweat" d="M236 200 Q240 207 236 209 Q232 207 236 200 Z" />}
                    <g key={`arm-${beat}`} className="fr-cook-arm">
                        <path className="fr-arm-line" d={arm} />
                        <path className="fr-arm is-cook" d={arm} />
                        <circle className="fr-hand is-1" cx={hand[0]} cy={hand[1]} r={5} />
                        {cook === 'shrug' && <path className="fr-hand is-1" d={`M${hand[0] - 6} ${hand[1] - 2} Q${hand[0]} ${hand[1] - 9} ${hand[0] + 7} ${hand[1] - 4}`} />}
                    </g>
                </g>
                {/* The fryer: two baskets in bubbling oil. */}
                <rect className="fr-fryer" x={34} y={238} width={110} height={40} rx={5} />
                <rect className="fr-oil" x={40} y={240} width={98} height={9} rx={3} />
                {OIL_BUBBLES.map(([x, k]) => <circle key={k} className="fr-bubble-oil" cx={x} cy={244} r={2.6} style={{ '--k': k } as CSSProperties} />)}
                <g className="fr-basket" style={{ transformOrigin: '70px 246px' }}>
                    <path className="fr-basket-wire" d="M50 236 h40 v10 h-40 Z M60 236 v10 M70 236 v10 M80 236 v10" />
                    <path className="fr-handle" d="M90 238 L112 222 L122 222" />
                </g>
                <g className="fr-basket is-late" style={{ transformOrigin: '112px 246px' }}>
                    <path className="fr-handle" d="M124 240 L136 226 L146 226" />
                </g>
            </g>
            <rect className="fr-window-frame" x={26} y={182} width={248} height={92} rx={6} />
            {/* The awning, scalloped, over the window. */}
            <g className="fr-awning">
                {Array.from({ length: STRIPES }, (_, i) => {
                    const t0 = 8 + i * 28.4, t1 = t0 + 28.4, b0 = i * 30, b1 = b0 + 30;
                    return <path key={i} className={`fr-stripe-band is-${i % 2}`} d={`M${t0} 124 L${t1} 124 L${b1} 166 A15 11 0 0 1 ${b0} 166 Z`} />;
                })}
                <path className="fr-awning-edge" d={`M8 124 L292 124 L300 166 ${Array.from({ length: STRIPES }, (_, i) => `A15 11 0 0 1 ${300 - (i + 1) * 30} 166`).join(' ')} Z`} />
            </g>
            {/* The counter, its bottles and the bell. */}
            <rect className="fr-counter" x={16} y={272} width={292} height={13} rx={3} />
            <path className="fr-bottle is-ketchup" d="M160 272 L160 252 Q160 246 166 246 Q172 246 172 252 L172 272 Z M164 246 L166 238 L168 246" />
            <path className="fr-bottle is-mayo" d="M176 272 L176 254 Q176 248 182 248 Q188 248 188 254 L188 272 Z M180 248 L182 240 L184 248" />
            <g key={`bell-${beat}`} className="fr-bell" style={{ transformOrigin: '272px 272px' }}>
                <path className="fr-bell-dome" d="M260 271 Q260 257 272 257 Q284 257 284 271 Z" />
                <rect className="fr-bell-dome" x={270} y={252} width={4} height={6} rx={1.5} />
                <rect className="fr-bell-base" x={256} y={269} width={32} height={4} rx={2} />
            </g>
            {/* The painted cone on the front, under the counter. */}
            <g transform="translate(150 318) scale(1.5)"><Cone /></g>
            <path className="fr-wall-trim" d="M14 346 H286" />
            {/* Steam from the fryer, over the window and the awning. */}
            {STEAM.map(([x, y, k]) => <path key={k} className="fr-steam" d={`M${x} ${y} q-7 -12 0 -24 q7 -12 0 -24`} style={{ '--k': k } as CSSProperties} />)}
        </g>
    );
}

// ── The street ─────────────────────────────────────────────────────────────
// Flemish row houses behind the frituur, a stepped gable now and then; they run well past the scene on both sides.
const HOUSES = [
    { x: -560, w: 140, h: 250, gable: true, tone: 0 },
    { x: -420, w: 120, h: 210, gable: false, tone: 1 },
    { x: -300, w: 150, h: 270, gable: true, tone: 2 },
    { x: -150, w: 130, h: 230, gable: false, tone: 0 },
    { x: -20, w: 150, h: 290, gable: true, tone: 1 },
    { x: 130, w: 130, h: 240, gable: false, tone: 2 },
    { x: 260, w: 150, h: 300, gable: true, tone: 0 },
    { x: 410, w: 120, h: 250, gable: false, tone: 1 },
    { x: 530, w: 150, h: 280, gable: true, tone: 2 },
    { x: 680, w: 130, h: 230, gable: false, tone: 0 },
    { x: 810, w: 150, h: 270, gable: true, tone: 1 },
    { x: 960, w: 130, h: 240, gable: false, tone: 2 },
    { x: 1090, w: 150, h: 290, gable: true, tone: 0 },
] as const;
const GROUND = 480;

function House({ x, w, h, gable, tone }: (typeof HOUSES)[number]): ReactNode {
    const top = GROUND - h;
    const step = w / 5;
    // A stepped gable (trapgevel): three steps up each side to a little top.
    const outline = gable
        ? `M${x} ${GROUND} V${top + 40} H${x + step * 0.5} V${top + 26} H${x + step * 1.3} V${top + 12} H${x + step * 2} V${top} H${x + w - step * 2} V${top + 12} H${x + w - step * 1.3} V${top + 26} H${x + w - step * 0.5} V${top + 40} H${x + w} V${GROUND} Z`
        : `M${x} ${GROUND} V${top + 30} L${x + w / 2} ${top} L${x + w} ${top + 30} V${GROUND} Z`;
    const rows = Math.max(1, Math.floor((h - 110) / 62));
    return (
        <g className={`fr-house is-${tone}`}>
            <path className="fr-house-wall" d={outline} />
            {Array.from({ length: rows }, (_, r) => [0.22, 0.62].map((f, c) => (
                <rect key={`${r}-${c}`} className="fr-house-window" x={x + w * f} y={top + 52 + r * 62} width={w * 0.18} height={36} rx={3} />
            )))}
            <rect className="fr-house-door" x={x + w * 0.4} y={GROUND - 62} width={w * 0.2} height={62} rx={4} />
        </g>
    );
}

export function StreetG(): ReactNode {
    return (
        <g className="fr-street">
            {HOUSES.map(h => <House key={h.x} {...h} />)}
            <rect className="fr-pavement" x={-800} y={GROUND} width={2400} height={200} />
            <path className="fr-pavement-line" d={`M-800 ${GROUND} H1600 M-800 516 H1600 ${Array.from({ length: 40 }, (_, i) => `M${-780 + i * 60} ${GROUND} v36 M${-750 + i * 60} 516 v44`).join(' ')}`} />
            <rect className="fr-curb" x={-800} y={552} width={2400} height={12} />
            {/* A street lamp past the queue. */}
            <rect className="fr-lamp-post" x={664} y={250} width={8} height={GROUND - 250} />
            <path className="fr-lamp" d="M652 252 L684 252 L676 232 L660 232 Z" />
        </g>
    );
}

/** A cyclist who rides past behind the queue now and then (the loop is in CSS); facing right, wheels on the pavement. */
export function CyclistG(): ReactNode {
    const wheel = (x: number) => (
        <g transform={`translate(${x} 462)`}>
            <circle className="fr-tyre" r={16} />
            <g className="fr-spokes"><path d="M-14 0 H14 M0 -14 V14 M-10 -10 L10 10 M-10 10 L10 -10" /></g>
        </g>
    );
    return (
        <g className="fr-cyclist">
            {wheel(-26)}
            {wheel(28)}
            <path className="fr-frame" d="M-26 462 L-6 440 L20 440 L28 462 M-6 440 L0 462 L-26 462 M20 440 L17 426 L24 424 M-8 434 L-2 434" />
            <path className="fr-arm-line" d="M2 404 L22 424" style={{ strokeWidth: 11 }} />
            <path className="fr-arm fr-shirt is-4" d="M2 404 L22 424" style={{ strokeWidth: 6 }} />
            <path className="fr-pants is-0" d="M-10 428 L4 446 L0 462" style={{ fill: 'none', strokeWidth: 8 }} />
            <rect className="fr-shirt is-4" x={-14} y={398} width={22} height={34} rx={9} transform="rotate(18 -3 415)" />
            <circle className="fr-head is-1" cx={8} cy={388} r={10} />
            <path className="fr-helmet" d="M-3 386 Q-2 372 9 373 Q20 374 19 386 Z" />
            <circle className="fr-pupil" cx={13} cy={389} r={1.8} />
        </g>
    );
}

/** A pigeon that walks and pecks on the pavement (its own loop in CSS). */
export function PigeonG(): ReactNode {
    return (
        <g className="fr-pigeon">
            <g className="fr-pigeon-peck" style={{ transformOrigin: '10px 14px' }}>
                <ellipse className="fr-pigeon-body" cx={14} cy={14} rx={12} ry={8} />
                <circle className="fr-pigeon-body" cx={4} cy={6} r={5} />
                <path className="fr-pigeon-beak" d="M-1 6 L-5 7.5 L-1 8.5 Z" />
                <circle className="fr-pupil" cx={3} cy={5} r={1.2} />
                <path className="fr-pigeon-wing" d="M10 12 Q18 8 26 14 Q18 18 10 12 Z" />
            </g>
            <path className="fr-pigeon-leg" d="M12 21 v5 M17 21 v5" />
        </g>
    );
}
