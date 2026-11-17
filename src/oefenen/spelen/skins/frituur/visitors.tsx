import type { CSSProperties, ReactNode } from 'react';
import type { OrderKind, VisitorKind } from './rule';
import { OrderG, type Pose } from './art';

// Frituur's fantastic visitors: each stands in the same 100 × 200 box as the people (feet on the bottom edge,
// facing a little to the left), wears the same poses and has its own idle loop, happy moment and strop (frituur.css,
// .fr-visitor.is-<kind>). SYNC: VISITOR_TOP in rule.ts holds each one's top for the patience bar.

type Pt = readonly [number, number];

/** An eye: white with a pupil looking at the counter; a happy arc when served; small and fierce in a strop. */
function Eye({ x, y, r, pose }: { x: number; y: number; r: number; pose: Pose }): ReactNode {
    if (pose === 'served') return <path className="fr-line" d={`M${x - r * 0.75} ${y + r * 0.2} Q${x} ${y - r * 0.8} ${x + r * 0.75} ${y + r * 0.2}`} />;
    const p = pose === 'tantrum' ? 0.32 : 0.5;
    return (
        <g className="fr-v-eyeball" style={{ transformOrigin: `${x}px ${y}px` }}>
            <circle className="fr-v-eye" cx={x} cy={y} r={r} />
            <circle className="fr-pupil" cx={x - r * 0.28} cy={y + (pose === 'low' ? r * 0.3 : 0)} r={r * p} />
        </g>
    );
}

/** A brow over an eye: angry in a strop or grumbling, worried when impatient; none otherwise. */
function Brow({ x, y, r, pose, side }: { x: number; y: number; r: number; pose: Pose; side: -1 | 1 }): ReactNode {
    const top = y - r * 1.35;
    // side -1 = the left eye: angry brows slope down to the nose, worried ones up.
    if (pose === 'tantrum' || pose === 'grumpy') return <path className="fr-line" d={`M${x - r} ${top + side * r * 0.35} L${x + r} ${top - side * r * 0.35}`} />;
    if (pose === 'low') return <path className="fr-line" d={`M${x - r} ${top - side * r * 0.3} L${x + r} ${top + side * r * 0.3}`} />;
    return null;
}

/** A mouth `w` wide by the pose: a smile, a wobble, a grin, chewing, a frown, or a shout. */
function Mouth({ x, y, w, pose }: { x: number; y: number; w: number; pose: Pose }): ReactNode {
    switch (pose) {
        case 'served': return <path className="fr-mouth-open" d={`M${x - w} ${y - 1} Q${x} ${y + w * 1.3} ${x + w} ${y - 1} Z`} />;
        case 'happy': return <ellipse className="fr-mouth-open fr-chew" cx={x} cy={y + 1} rx={w * 0.45} ry={w * 0.38} />;
        case 'tantrum': return <ellipse className="fr-mouth-open fr-shout" cx={x} cy={y + 2} rx={w * 0.7} ry={w * 0.6} />;
        case 'frown': return <ellipse className="fr-mouth-open" cx={x} cy={y + 1} rx={w * 0.35} ry={w * 0.42} />;
        case 'grumpy': return <path className="fr-line" d={`M${x - w} ${y + 3} Q${x} ${y - 3} ${x + w} ${y + 3}`} />;
        case 'low': return <path className="fr-line" d={`M${x - w} ${y + 1} Q${x - w / 2} ${y - 2} ${x} ${y + 1} Q${x + w / 2} ${y + 4} ${x + w} ${y + 1}`} />;
        default: return <path className="fr-line" d={`M${x - w} ${y} Q${x} ${y + w * 0.8} ${x + w} ${y}`} />;
    }
}

interface Limbs { l: string; r: string; hl: Pt; hr: Pt }

// Arms from two shoulders `len` long, posed like the people's (art.tsx armsOf).
function limbsOf(sl: Pt, sr: Pt, len: number, pose: Pose): Limbs {
    const mid = (sl[0] + sr[0]) / 2;
    const arm = (s: Pt, e: Pt, h: Pt) => `M${s[0]} ${s[1]} Q${e[0]} ${e[1]} ${h[0]} ${h[1]}`;
    const make = (el: Pt, hl: Pt, er: Pt, hr: Pt): Limbs => ({ l: arm(sl, el, hl), r: arm(sr, er, hr), hl, hr });
    switch (pose) {
        case 'served': return make([sl[0] - len * 0.4, sl[1] + len * 0.5], [sl[0] - len * 0.6, sl[1] + len * 0.2], [sr[0] + len * 0.35, sr[1]], [sr[0] + len * 0.25, sr[1] - len * 0.75]);
        case 'happy': return make([sl[0] - len * 0.35, sl[1] + len * 0.6], [sl[0] - len * 0.15, sl[1] - len * 0.05], [sr[0] + len * 0.2, sr[1] + len * 0.5], [sr[0] + len * 0.2, sr[1] + len * 0.95]);
        case 'tantrum': return make([sl[0] - len * 0.4, sl[1] - len * 0.1], [sl[0] - len * 0.3, sl[1] - len * 0.75], [sr[0] + len * 0.4, sr[1] - len * 0.1], [sr[0] + len * 0.3, sr[1] - len * 0.75]);
        case 'frown': return make([sl[0] - len * 0.35, sl[1] + len * 0.4], [sl[0], sl[1] + len * 0.75], [sr[0] + len * 0.35, sr[1] + len * 0.4], [sr[0], sr[1] + len * 0.75]);
        case 'low':
        case 'grumpy': return make([sl[0], sl[1] + len * 0.6], [mid + len * 0.3, sl[1] + len * 0.4], [sr[0], sr[1] + len * 0.6], [mid - len * 0.3, sr[1] + len * 0.4]);
        default: return make([sl[0] - len * 0.15, sl[1] + len * 0.5], [sl[0] - len * 0.2, sl[1] + len], [sr[0] + len * 0.15, sr[1] + len * 0.5], [sr[0] + len * 0.2, sr[1] + len]);
    }
}

/** Two arms (outline, colour, hand); `cls` gives the colour. They swing round the shoulders in a strop. */
function Arms({ sl, sr, len, pose, cls, w = 8, hand = 5 }: { sl: Pt; sr: Pt; len: number; pose: Pose; cls: string; w?: number; hand?: number }): ReactNode {
    const a = limbsOf(sl, sr, len, pose);
    const side = (d: string, h: Pt, s: Pt, k: 'l' | 'r') => {
        const o: CSSProperties = { transformOrigin: `${s[0]}px ${s[1]}px` };
        return (
            <g key={k}>
                <path className={`fr-limb is-${k} fr-v-limb-line`} d={d} style={{ ...o, strokeWidth: w + 6 }} />
                <path className={`fr-limb is-${k} fr-v-limb ${cls}`} d={d} style={{ ...o, strokeWidth: w }} />
                <circle className={`fr-limb is-${k} fr-v-hand ${cls}`} cx={h[0]} cy={h[1]} r={hand} style={o} />
            </g>
        );
    };
    return <>{side(a.r, a.hr, sr, 'r')}{side(a.l, a.hl, sl, 'l')}</>;
}

/** The order in a visitor's hand: held out when served, near the mouth on the way out. */
function Held({ at, pose, item }: { at: Pt; pose: Pose; item?: OrderKind | null }): ReactNode {
    if (!item || (pose !== 'served' && pose !== 'happy')) return null;
    return (
        <g transform={pose === 'happy' ? `translate(${at[0] - 4} ${at[1] + 6}) scale(1.1)` : `translate(${at[0]} ${at[1] - 8}) scale(1.35)`}>
            <g className={`fr-held is-${pose}`}><OrderG kind={item} /></g>
        </g>
    );
}

const handOf = (sl: Pt, sr: Pt, len: number, pose: Pose) => limbsOf(sl, sr, len, pose).hl;

// ── The visitors ───────────────────────────────────────────────────────────
// One-eyed green alien with two antennae (its little UFO parks behind it: UfoG).
function Alien({ pose, item }: { pose: Pose; item?: OrderKind | null }): ReactNode {
    const sl: Pt = [24, 140], sr: Pt = [76, 140];
    return (
        <>
            {(pose === 'served' || pose === 'happy') && <ellipse className="fr-v-halo" cx={50} cy={134} rx={44} ry={60} />}
            <g className="fr-v-antennae" style={{ transformOrigin: '50px 92px' }}>
                <path className="fr-v-stalk" d="M42 92 Q36 76 30 68 M58 92 Q64 76 70 68" />
                <circle className="fr-v-alien fr-v-bobble" cx={30} cy={64} r={5.5} />
                <circle className="fr-v-alien fr-v-bobble" cx={70} cy={64} r={5.5} />
            </g>
            <rect className="fr-v-alien" x={32} y={176} width={12} height={18} rx={5} />
            <rect className="fr-v-alien" x={56} y={176} width={12} height={18} rx={5} />
            <ellipse className="fr-v-shoe" cx={36} cy={196} rx={10} ry={4.5} />
            <ellipse className="fr-v-shoe" cx={62} cy={196} rx={10} ry={4.5} />
            <Arms sl={sl} sr={sr} len={30} pose={pose} cls="fr-v-alien" w={7} />
            <path className="fr-v-alien fr-v-glow" d="M50 84 Q82 84 84 128 Q86 170 72 182 L28 182 Q14 170 16 128 Q18 84 50 84 Z" />
            <circle className="fr-v-spot" cx={30} cy={160} r={4} /><circle className="fr-v-spot" cx={70} cy={152} r={3} /><circle className="fr-v-spot" cx={64} cy={170} r={2.5} />
            <Eye x={48} y={116} r={14} pose={pose} />
            <Brow x={48} y={116} r={12} pose={pose} side={1} />
            <Mouth x={48} y={146} w={9} pose={pose} />
            <Held at={handOf(sl, sr, 30, pose)} pose={pose} item={item} />
        </>
    );
}

// Tall purple alien with three eyes and one antenna.
function Drieoog({ pose, item }: { pose: Pose; item?: OrderKind | null }): ReactNode {
    const sl: Pt = [22, 110], sr: Pt = [78, 110];
    return (
        <>
            {(pose === 'served' || pose === 'happy') && <ellipse className="fr-v-halo" cx={50} cy={110} rx={44} ry={92} />}
            <g className="fr-v-antennae" style={{ transformOrigin: '50px 38px' }}>
                <path className="fr-v-stalk" d="M50 38 L50 24" />
                <circle className="fr-v-three fr-v-bobble" cx={50} cy={20} r={6} />
            </g>
            <ellipse className="fr-v-shoe" cx={36} cy={196} rx={11} ry={4.5} />
            <ellipse className="fr-v-shoe" cx={64} cy={196} rx={11} ry={4.5} />
            <Arms sl={sl} sr={sr} len={42} pose={pose} cls="fr-v-three" w={7} />
            <path className="fr-v-three fr-v-glow" d="M50 34 Q80 34 80 78 L82 178 Q82 192 70 192 L30 192 Q18 192 18 178 L20 78 Q20 34 50 34 Z" />
            {/* A silver space-suit belt. */}
            <rect className="fr-v-metal" x={19} y={124} width={62} height={10} rx={3} />
            <circle className="fr-v-light" cx={50} cy={129} r={3} />
            {[[33, 68, 8], [50, 60, 9], [67, 68, 8]].map(([x, y, r], i) => <Eye key={i} x={x} y={y} r={r} pose={pose} />)}
            <Brow x={50} y={60} r={8} pose={pose} side={1} />
            <Mouth x={49} y={92} w={10} pose={pose} />
            <Held at={handOf(sl, sr, 42, pose)} pose={pose} item={item} />
        </>
    );
}

// A furry space monster: an orange blob with horns, spots and one big tooth.
function Monster({ pose, item }: { pose: Pose; item?: OrderKind | null }): ReactNode {
    const sl: Pt = [14, 150], sr: Pt = [86, 150];
    return (
        <>
            <path className="fr-v-horn" d="M28 112 Q18 90 28 80 Q32 98 40 106 Z" />
            <path className="fr-v-horn" d="M72 112 Q82 90 72 80 Q68 98 60 106 Z" />
            <ellipse className="fr-v-monster" cx={32} cy={194} rx={13} ry={6} />
            <ellipse className="fr-v-monster" cx={68} cy={194} rx={13} ry={6} />
            <Arms sl={sl} sr={sr} len={26} pose={pose} cls="fr-v-monster" w={9} hand={6} />
            <g className="fr-v-squish" style={{ transformOrigin: '50px 194px' }}>
                <path className="fr-v-monster" d="M50 98 Q91 98 91 148 Q92 192 70 194 L30 194 Q8 192 9 148 Q9 98 50 98 Z" />
                <path className="fr-v-fur" d="M34 101 L38 92 L43 100 L49 90 L55 100 L61 92 L66 101" />
                <circle className="fr-v-spot is-dark" cx={22} cy={170} r={5} /><circle className="fr-v-spot is-dark" cx={78} cy={176} r={4} />
                <Eye x={37} y={128} r={8} pose={pose} />
                <Eye x={61} y={126} r={9.5} pose={pose} />
                <Brow x={37} y={128} r={7} pose={pose} side={-1} />
                <Brow x={61} y={126} r={8} pose={pose} side={1} />
                <Mouth x={48} y={156} w={14} pose={pose} />
                {pose !== 'tantrum' && <rect className="fr-v-tooth" x={42} y={155} width={7} height={8} rx={1.5} />}
            </g>
            <Held at={handOf(sl, sr, 26, pose)} pose={pose} item={item} />
        </>
    );
}

// An octopus with a bucket of sea water; served, it juggles three fries.
const TENTACLES = ['M24 136 Q10 156 20 172 Q28 186 16 196', 'M36 140 Q30 162 38 178 Q44 190 36 198', 'M50 142 Q50 166 46 180 Q44 192 52 198',
    'M62 140 Q70 160 62 176 Q56 190 66 198', 'M74 136 Q86 150 84 166'];
function Octopus({ pose, item }: { pose: Pose; item?: OrderKind | null }): ReactNode {
    const hand: Pt = pose === 'served' ? [6, 128] : pose === 'happy' ? [26, 132] : [8, 150];
    const reach = pose === 'tantrum' ? 'M22 132 Q4 120 10 98' : `M22 132 Q8 140 ${hand[0]} ${hand[1]}`;
    return (
        <>
            {pose === 'tantrum' && (
                // A harmless puff of ink.
                <g className="fr-v-ink">{[[18, 176, 12], [34, 186, 10], [6, 186, 8], [26, 162, 7]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>
            )}
            {/* The bucket on the right tentacle. */}
            <g className="fr-v-bucket" style={{ transformOrigin: '86px 162px' }}>
                <path className="fr-v-handle" d="M76 168 Q88 150 100 168" />
                <path className="fr-v-pail" d="M74 168 L102 168 L98 192 L78 192 Z" />
                <path className="fr-v-water" d="M76 172 L100 172 L99 178 L77 178 Z" />
            </g>
            {TENTACLES.map((d, i) => (
                <g key={i} className="fr-v-tent" style={{ transformOrigin: `${24 + i * 12}px 138px`, '--k': i } as CSSProperties}>
                    <path className="fr-v-limb-line" d={d} style={{ strokeWidth: 15 }} />
                    <path className="fr-v-limb fr-v-octo" d={d} style={{ strokeWidth: 9 }} />
                </g>
            ))}
            <g className="fr-limb is-l" style={{ transformOrigin: '22px 132px' }}>
                <path className="fr-v-limb-line" d={reach} style={{ strokeWidth: 15 }} />
                <path className="fr-v-limb fr-v-octo" d={reach} style={{ strokeWidth: 9 }} />
            </g>
            <path className="fr-v-octo" d="M50 64 Q87 64 87 106 Q87 136 66 142 L34 142 Q13 136 13 106 Q13 64 50 64 Z" />
            <circle className="fr-v-spot is-light" cx={66} cy={82} r={5} /><circle className="fr-v-spot is-light" cx={76} cy={98} r={3.5} /><circle className="fr-v-spot is-light" cx={28} cy={84} r={3} />
            <Eye x={38} y={104} r={8} pose={pose} />
            <Eye x={60} y={102} r={8} pose={pose} />
            <Brow x={38} y={104} r={7} pose={pose} side={-1} />
            <Brow x={60} y={102} r={7} pose={pose} side={1} />
            <Mouth x={49} y={124} w={7} pose={pose} />
            {(pose === 'served' || pose === 'happy') && (
                // Juggling three fries over its head.
                <g className="fr-v-juggle" style={{ transformOrigin: '50px 44px' }}>
                    {[0, 1, 2].map(i => <rect key={i} className="fr-fry fr-v-fry" x={46} y={12} width={8} height={22} rx={2.5} transform={`rotate(${i * 120} 50 44)`} />)}
                </g>
            )}
            <Held at={hand} pose={pose} item={item} />
        </>
    );
}

// A red crab on eye stalks, two big claws up.
function Krab({ pose, item }: { pose: Pose; item?: OrderKind | null }): ReactNode {
    const legs = 'M24 170 L8 186 L4 196 M28 176 L16 192 L14 198 M34 180 L28 194 L28 199 M76 170 L92 186 L96 196 M72 176 L84 192 L86 198 M66 180 L72 194 L72 199';
    const claw = (x: number, flip: 1 | -1, k: 'l' | 'r') => (
        <g className={`fr-limb is-${k} fr-v-claw`} style={{ transformOrigin: `${50 - flip * 26}px 160px` }}>
            <path className="fr-v-limb-line" d={`M${50 - flip * 26} 160 Q${x + flip * 2} 152 ${x} 136`} style={{ strokeWidth: 12 }} />
            <path className="fr-v-limb fr-v-crab" d={`M${50 - flip * 26} 160 Q${x + flip * 2} 152 ${x} 136`} style={{ strokeWidth: 6 }} />
            <g className="fr-v-pincer" style={{ transformOrigin: `${x}px 132px` }}>
                <path className="fr-v-crab" d={`M${x} 136 Q${x - flip * 14} 128 ${x - flip * 8} 114 Q${x - flip * 1} 106 ${x + flip * 6} 112 L${x + flip * 1} 122 Z`} />
            </g>
            <path className="fr-v-crab" d={`M${x} 136 Q${x + flip * 12} 132 ${x + flip * 12} 120 L${x + flip * 4} 124 Z`} />
        </g>
    );
    const hand: Pt = [8, 116];
    return (
        <>
            <path className="fr-v-crab-legs" d={legs} />
            <path className="fr-v-stalk is-crab" d="M42 156 L38 128 M58 156 L62 128" />
            {claw(12, 1, 'l')}
            {claw(88, -1, 'r')}
            <ellipse className="fr-v-crab" cx={50} cy={166} rx={34} ry={19} />
            <path className="fr-v-crab-shell" d="M26 160 Q50 150 74 160" />
            <Eye x={38} y={122} r={6.5} pose={pose} />
            <Eye x={62} y={122} r={6.5} pose={pose} />
            <Brow x={38} y={122} r={6} pose={pose} side={-1} />
            <Brow x={62} y={122} r={6} pose={pose} side={1} />
            <Mouth x={49} y={172} w={7} pose={pose} />
            <Held at={hand} pose={pose} item={item} />
        </>
    );
}

// A fish in a diving helmet full of water, on a yellow diving suit.
function Vis({ pose, item }: { pose: Pose; item?: OrderKind | null }): ReactNode {
    const sl: Pt = [30, 92], sr: Pt = [70, 92];
    return (
        <>
            <rect className="fr-v-suit" x={32} y={132} width={15} height={56} rx={6} />
            <rect className="fr-v-suit" x={53} y={132} width={15} height={56} rx={6} />
            <ellipse className="fr-v-boot" cx={38} cy={193} rx={12} ry={6} />
            <ellipse className="fr-v-boot" cx={62} cy={193} rx={12} ry={6} />
            <Arms sl={sl} sr={sr} len={40} pose={pose} cls="fr-v-suit" w={10} hand={6} />
            <rect className="fr-v-suit" x={27} y={80} width={46} height={60} rx={17} />
            <rect className="fr-v-metal" x={31} y={72} width={38} height={11} rx={4} />
            <circle className="fr-v-glass" cx={50} cy={46} r={31} />
            <g className="fr-v-fish">
                <path className="fr-v-fishy" d="M60 48 L70 40 L70 56 Z" />
                <ellipse className="fr-v-fishy" cx={47} cy={48} rx={14} ry={9} />
                <path className="fr-v-fin" d="M44 40 Q48 32 54 40" />
                <Eye x={40} y={45} r={3.6} pose={pose} />
                {pose === 'tantrum' ? <ellipse className="fr-mouth-open fr-shout" cx={34.5} cy={51} rx={2.6} ry={2.4} /> : <circle className="fr-line" cx={34} cy={51} r={1.6} />}
            </g>
            {[0, 1, 2].map(i => <circle key={i} className="fr-v-bubble" cx={58 - i * 8} cy={34} r={2.4 - i * 0.4} style={{ '--k': i } as CSSProperties} />)}
            <path className="fr-v-shine" d="M30 30 Q36 20 46 18" />
            <Held at={handOf(sl, sr, 40, pose)} pose={pose} item={item} />
        </>
    );
}

// A friendly box robot with a screen for a face and a light on its antenna.
function Robot({ pose, item }: { pose: Pose; item?: OrderKind | null }): ReactNode {
    const sl: Pt = [22, 100], sr: Pt = [78, 100];
    const eyes = pose === 'served' ? 'M36 58 q3 -6 6 0 q3 -6 6 0 l-6 7 Z M52 58 q3 -6 6 0 q3 -6 6 0 l-6 7 Z'
        : pose === 'tantrum' || pose === 'grumpy' ? 'M35 54 L47 59 L47 63 L35 60 Z M65 54 L53 59 L53 63 L65 60 Z'
        : pose === 'low' ? 'M35 60 h12 v3 h-12 Z M53 60 h12 v3 h-12 Z'
        : 'M37 54 h8 v10 h-8 Z M55 54 h8 v10 h-8 Z';
    const mouth = pose === 'tantrum' ? 'M38 72 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4' : pose === 'served' || pose === 'happy' ? 'M40 69 Q50 76 60 69' : pose === 'grumpy' || pose === 'low' ? 'M40 72 H60' : 'M41 70 Q50 74 59 70';
    return (
        <>
            <path className="fr-v-stalk" d="M50 38 L50 24" />
            <circle className="fr-v-light fr-v-antenna-light" cx={50} cy={20} r={5.5} />
            <rect className="fr-v-metal" x={30} y={146} width={14} height={40} rx={4} />
            <rect className="fr-v-metal" x={56} y={146} width={14} height={40} rx={4} />
            <rect className="fr-v-boot" x={25} y={185} width={23} height={11} rx={4} />
            <rect className="fr-v-boot" x={52} y={185} width={23} height={11} rx={4} />
            <Arms sl={sl} sr={sr} len={40} pose={pose} cls="fr-v-metal" w={8} hand={6} />
            <rect className="fr-v-metal" x={21} y={90} width={58} height={58} rx={9} />
            <rect className="fr-v-panel" x={33} y={102} width={34} height={22} rx={4} />
            {[[40, 113, 0], [50, 113, 1], [60, 113, 2]].map(([x, y, k]) => <circle key={k} className={`fr-v-button is-${k}`} cx={x} cy={y} r={3.4} />)}
            <rect className="fr-v-metal" x={44} y={82} width={12} height={10} />
            <g className="fr-v-head" style={{ transformOrigin: '50px 82px' }}>
                <rect className="fr-v-metal" x={17} y={50} width={7} height={18} rx={2} />
                <rect className="fr-v-metal" x={76} y={50} width={7} height={18} rx={2} />
                <rect className="fr-v-metal" x={22} y={36} width={56} height={48} rx={9} />
                <rect className="fr-v-screen" x={28} y={42} width={44} height={36} rx={6} />
                <path className="fr-v-screen-ink" d={eyes} />
                <path className="fr-v-screen-line" d={mouth} />
            </g>
            <Held at={handOf(sl, sr, 40, pose)} pose={pose} item={item} />
        </>
    );
}

// A little dragon kid: round snout, small horns and wings, a curly tail. Served, it puffs a heart of smoke.
function Draak({ pose, item }: { pose: Pose; item?: OrderKind | null }): ReactNode {
    const sl: Pt = [34, 128], sr: Pt = [66, 128];
    return (
        <>
            <g className="fr-v-tail" style={{ transformOrigin: '66px 172px' }}>
                <path className="fr-v-limb-line" d="M62 174 Q90 180 92 156 Q92 146 84 146" style={{ strokeWidth: 16 }} />
                <path className="fr-v-limb fr-v-dragon" d="M62 174 Q90 180 92 156 Q92 146 84 146" style={{ strokeWidth: 10 }} />
                <path className="fr-v-dragon" d="M84 146 L78 138 L90 136 Z" />
            </g>
            <path className="fr-v-wing" d="M60 124 Q76 98 92 106 Q84 112 86 120 Q78 118 74 128 Q68 124 60 130 Z" />
            <rect className="fr-v-dragon" x={34} y={172} width={13} height={20} rx={5} />
            <rect className="fr-v-dragon" x={53} y={172} width={13} height={20} rx={5} />
            <ellipse className="fr-v-dragon" cx={39} cy={194} rx={10} ry={5} />
            <ellipse className="fr-v-dragon" cx={60} cy={194} rx={10} ry={5} />
            <Arms sl={sl} sr={sr} len={24} pose={pose} cls="fr-v-dragon" w={7} />
            <path className="fr-v-dragon" d="M50 114 Q72 116 72 148 Q72 180 50 182 Q28 180 28 148 Q28 116 50 114 Z" />
            <path className="fr-v-belly" d="M50 124 Q62 126 62 150 Q62 174 50 176 Q38 174 38 150 Q38 126 50 124 Z" />
            <path className="fr-v-belly-line" d="M40 138 H60 M39 150 H61 M40 162 H60" />
            <path className="fr-v-horn" d="M42 80 L38 68 L48 76 Z" />
            <path className="fr-v-horn" d="M58 78 L60 66 L64 78 Z" />
            <circle className="fr-v-dragon" cx={50} cy={96} r={21} />
            <ellipse className="fr-v-dragon" cx={32} cy={104} rx={13} ry={9.5} />
            <circle className="fr-pupil" cx={24} cy={101} r={1.4} />
            <circle className="fr-pupil" cx={30} cy={100} r={1.4} />
            <Eye x={44} y={89} r={5.6} pose={pose} />
            <Eye x={58} y={89} r={5.6} pose={pose} />
            <Brow x={44} y={89} r={5} pose={pose} side={-1} />
            <Brow x={58} y={89} r={5} pose={pose} side={1} />
            <Mouth x={32} y={109} w={6} pose={pose} />
            {pose === 'served' && <path className="fr-v-heart" d="M24 70 q-5 -6 0 -9 q3 -2 5 1 q2 -3 5 -1 q5 3 0 9 l-5 5 Z" />}
            {pose === 'tantrum' && (
                // A tiny harmless flame burp that turns into smoke.
                <g className="fr-v-burp"><path className="fr-v-flame" d="M18 106 Q6 100 4 108 Q0 104 -4 110 Q2 114 18 110 Z" /></g>
            )}
            <Held at={handOf(sl, sr, 24, pose)} pose={pose} item={item} />
        </>
    );
}

// A big, soft yeti with a blue face; in a strop it drums on its chest.
function Yeti({ pose, item }: { pose: Pose; item?: OrderKind | null }): ReactNode {
    const sl: Pt = [16, 94], sr: Pt = [84, 94];
    return (
        <>
            {pose === 'tantrum' && <g className="fr-v-snow">{[[14, 190], [34, 196], [66, 196], [88, 190]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} style={{ '--k': i } as CSSProperties} />)}</g>}
            <ellipse className="fr-v-yeti" cx={32} cy={194} rx={15} ry={6} />
            <ellipse className="fr-v-yeti" cx={68} cy={194} rx={15} ry={6} />
            <Arms sl={sl} sr={sr} len={pose === 'tantrum' ? 34 : 62} pose={pose} cls="fr-v-yeti" w={13} hand={8} />
            <path className="fr-v-yeti" d="M50 20 Q86 22 88 70 L91 150 Q91 186 74 192 L26 192 Q9 186 9 150 L12 70 Q14 22 50 20 Z" />
            <path className="fr-v-fur" d="M30 28 L34 18 L40 25 L46 15 L52 24 L58 15 L64 25 L70 18 L72 30" />
            <path className="fr-v-fur" d="M22 128 l4 6 l4 -6 M68 140 l4 6 l4 -6 M40 170 l4 6 l4 -6" />
            <ellipse className="fr-v-yeti-face" cx={47} cy={62} rx={22} ry={24} />
            <ellipse className="fr-v-nose" cx={46} cy={64} rx={4.5} ry={3} />
            <Eye x={39} y={54} r={4.6} pose={pose} />
            <Eye x={56} y={54} r={4.6} pose={pose} />
            <Brow x={39} y={54} r={5} pose={pose} side={-1} />
            <Brow x={56} y={54} r={5} pose={pose} side={1} />
            <Mouth x={47} y={75} w={9} pose={pose} />
            <Held at={handOf(sl, sr, 62, pose)} pose={pose} item={item} />
        </>
    );
}

const DRAW: Record<VisitorKind, (p: { pose: Pose; item?: OrderKind | null }) => ReactNode> = {
    alien: Alien, drieoog: Drieoog, monster: Monster, octopus: Octopus, krab: Krab, vis: Vis, robot: Robot, draak: Draak, yeti: Yeti,
};

/** A visitor in the 100 × 200 box; `item` = the order in hand (served: held out, happy: near the mouth). */
export function VisitorG({ kind, pose, item }: { kind: VisitorKind; pose: Pose; item?: OrderKind | null }): ReactNode {
    const Draw = DRAW[kind];
    return <g className={`fr-visitor is-${kind} is-${pose}`}><Draw pose={pose} item={item} /></g>;
}

/** The aliens' little UFO, parked on three legs behind them (70 × 60, legs on the bottom edge). */
export function UfoG({ pose }: { pose: Pose }): ReactNode {
    return (
        <g className={`fr-ufo is-${pose}`}>
            <path className="fr-ufo-leg" d="M18 40 L10 58 M52 40 L60 58 M35 42 L35 58" />
            <g className="fr-ufo-body">
                <ellipse className="fr-v-glass" cx={35} cy={28} rx={15} ry={13} />
                <ellipse className="fr-v-metal" cx={35} cy={36} rx={33} ry={10} />
                {[12, 24, 35, 46, 58].map((x, i) => <circle key={x} className={`fr-ufo-light is-${i % 2}`} cx={x} cy={37 + (i % 2 ? 1 : 0)} r={2.8} />)}
            </g>
        </g>
    );
}
