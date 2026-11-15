import { useId } from 'react';
import { Air, Cloud, Corner, Far, Ground, Sticker, Trav } from './parts';
import Weather from './Weather';

// Leerjaar 5: a snow landscape: snowy mountains far off, pines with snow on every tier, a bunny, a snowman with a
// robin on his arm, and snow falling slowly over the whole sky.

// The three tiers of a pine around its trunk foot (0, 0), widest first; each later tier hangs over the one below.
const TIERS = [
    'M-58 -30 L-12 -100 L12 -100 L58 -30 Q44 -22 29 -30 Q14 -22 0 -30 Q-14 -22 -29 -30 Q-44 -22 -58 -30 Z',
    'M-46 -78 L-8 -138 L8 -138 L46 -78 Q34 -70 23 -78 Q12 -70 0 -78 Q-12 -70 -23 -78 Q-34 -70 -46 -78 Z',
    'M-34 -124 L0 -176 L34 -124 Q23 -116 11 -124 Q0 -116 -11 -124 Q-23 -116 -34 -124 Z',
];
// The scalloped lower edge of tier 2 and 3, drawn over the tier below.
const EDGES = [
    'M-46 -78 Q-34 -70 -23 -78 Q-12 -70 0 -78 Q12 -70 23 -78 Q34 -70 46 -78',
    'M-34 -124 Q-23 -116 -11 -124 Q0 -116 11 -124 Q23 -116 34 -124',
];
// Snow lying on tier 1 and 2, just under the tier above (clipped to its own tier).
const SNOW = [
    'M-50 -76 Q-34 -66 -23 -76 Q-12 -66 0 -76 Q12 -66 23 -76 Q34 -66 50 -76 L50 -62 Q40 -56 30 -61 Q18 -54 6 -60 Q-6 -53 -18 -60 Q-30 -54 -40 -61 Q-46 -57 -50 -62 Z',
    'M-38 -122 Q-23 -112 -11 -122 Q0 -112 11 -122 Q23 -112 38 -122 L38 -108 Q28 -102 18 -107 Q8 -100 -2 -106 Q-12 -100 -22 -106 Q-30 -101 -38 -107 Z',
];

const Pine = ({ x, s }: { x: number; s: number }) => {
    const id = useId();
    return (
        <g transform={`translate(${x} 238) scale(${s})`}>
            <defs>
                {TIERS.map((d, i) => <clipPath key={d} id={`${id}t${i}`}><path d={d} /></clipPath>)}
                <clipPath id={`${id}all`}>{TIERS.map(d => <path key={d} d={d} />)}</clipPath>
            </defs>
            <g className="ks-under">
                <rect x="-9" y="-36" width="18" height="36" rx="3" />
                {TIERS.map(d => <path key={d} d={d} />)}
            </g>
            <rect className="ks-wood ks-ns" x="-9" y="-36" width="18" height="36" rx="3" />
            {TIERS.map((d, i) => (
                <g key={d}>
                    <path className="ks-pine ks-ns" d={d} />
                    {i > 0 && <path className="ks-line" d={EDGES[i - 1]} />}
                    {i < 2 && <path className="ks-white ks-ns" d={SNOW[i]} clipPath={`url(#${id}t${i})`} />}
                </g>
            ))}
            <path className="ks-white ks-ns" d="M0 -176 L15 -153 Q10 -147 5 -152 Q0 -145 -5 -152 Q-10 -147 -15 -153 Z" />
            <rect className="ks-shade" x="6" y="-180" width="60" height="152" clipPath={`url(#${id}all)`} />
        </g>
    );
};

const Bunny = () => (
    <g transform="translate(122 0)"><g className="ks-hop" style={{ animationDelay: '-3s' }}>
        <Sticker>
            <ellipse className="ks-white" cx="-10" cy="-30" rx="4.5" ry="13" transform="rotate(-12 -10 -30)" />
            <ellipse className="ks-white" cx="2" cy="-29" rx="4.5" ry="13" transform="rotate(14 2 -29)" />
            <circle className="ks-white" cx="-22" cy="-6" r="6" />
            <ellipse className="ks-white" cx="-6" cy="-6" rx="17" ry="14" />
            <circle className="ks-white" cx="-2" cy="-20" r="11" />
        </Sticker>
        <ellipse className="ks-pink ks-ns" cx="-10" cy="-31" rx="2" ry="8" transform="rotate(-12 -10 -31)" />
        <ellipse className="ks-pink ks-ns" cx="2" cy="-30" rx="2" ry="8" transform="rotate(14 2 -30)" />
        <circle className="ks-eye ks-blink" cx="3" cy="-21" r="2" />
        <circle className="ks-pink ks-ns" cx="9" cy="-17" r="1.8" />
        <ellipse className="ks-cheek" cx="1" cy="-14" rx="3.5" ry="2.2" />
        <path className="ks-shade" d="M-23 -2 Q-6 10 11 -2 Q8 8 -6 8 Q-20 8 -23 -2 Z" />
    </g></g>
);

const BALLS: [number, number, number][] = [[130, 192, 44], [130, 126, 32], [130, 76, 25]];

const Snowman = () => {
    const id = useId();
    return (
        <>
            <defs>{BALLS.map(([x, y, r], i) => <clipPath key={i} id={`${id}b${i}`}><circle cx={x} cy={y} r={r} /></clipPath>)}</defs>
            <Sticker><path className="ks-rope is-wood" d="M104 120 L64 96 M78 104 L70 86" /></Sticker>
            <g className="ks-wave" style={{ transformOrigin: '158px 120px' }}>
                <Sticker><path className="ks-rope is-wood" d="M156 120 L198 94 M186 101 L194 84" /></Sticker>
            </g>
            <Sticker>
                {BALLS.map(([x, y, r]) => <circle key={y} className="ks-snowshade" cx={x} cy={y} r={r} />)}
                <rect className="ks-hat" x="102" y="50" width="56" height="9" rx="4.5" />
                <rect className="ks-hat" x="111" y="16" width="38" height="38" rx="5" />
            </Sticker>
            {BALLS.map(([x, y, r], i) => (
                <circle key={y} className="ks-white ks-ns" cx={x - 6} cy={y - 6} r={r - 3} clipPath={`url(#${id}b${i})`} />
            ))}
            <rect className="ks-red ks-ns" x="111" y="40" width="38" height="8" />
            <rect className="ks-shine" x="116" y="20" width="5" height="18" rx="2.5" />
            {/* Scarf around the neck, its end hanging on the left. */}
            <path className="ks-red" d="M120 106 L110 140 L124 142 L131 110 Z" />
            <path className="ks-stripe-w" d="M115 124 L127 126 M113 133 L125 135" />
            <path className="ks-line" d="M112 142 l-1 6 M117 142 l0 6 M122 143 l1 6" />
            <path className="ks-red" d="M104 98 Q130 110 156 98 L158 108 Q130 122 102 108 Z" />
            <circle className="ks-eye ks-blink" cx="121" cy="71" r="3.2" />
            <circle className="ks-eye ks-blink" cx="139" cy="71" r="3.2" />
            <path className="ks-orange" d="M130 79 L156 88 L130 87 Z" />
            <path className="ks-fine" d="M139 81 l1 5 M147 84 l0.5 3" />
            {[[118, 92], [124, 95], [131, 96], [138, 95]].map(([x, y]) => <circle key={x} className="ks-eye" cx={x} cy={y} r="1.8" />)}
            <ellipse className="ks-cheek" cx="113" cy="82" rx="4.5" ry="3" />
            {[124, 140, 154].map(y => <circle key={y} className="ks-eye" cx="130" cy={y} r="3" />)}
            <circle className="ks-eye" cx="130" cy="178" r="3.5" />
            {/* A robin on the end of the left arm. */}
            <g className="ks-bob">
                <Sticker>
                    <path className="ks-wood" d="M66 86 L56 82 L60 92 Z" />
                    <ellipse className="ks-wood" cx="74" cy="88" rx="11" ry="8.5" />
                    <circle className="ks-wood" cx="82" cy="80" r="6.5" />
                    <path className="ks-honey" d="M87 79 L94 81 L87 83 Z" />
                </Sticker>
                <ellipse className="ks-red ks-ns" cx="79" cy="90" rx="5.5" ry="5" />
                <circle className="ks-eye" cx="83.5" cy="78.5" r="1.5" />
            </g>
        </>
    );
};

// A low drift of snow around a foot, outlined only along its top.
const Mound = ({ x, w }: { x: number; w: number }) => (
    <>
        <path className="ks-white ks-ns" d={`M${x - w} 242 Q${x} ${226} ${x + w} 242 Z`} />
        <path className="ks-line" d={`M${x - w} 242 Q${x} ${226} ${x + w} 242`} />
    </>
);

const Flake = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
        <g className="ks-spin">
            <Sticker><path className="ks-rope is-snow" d="M0 -11 V11 M-9.5 -5.5 L9.5 5.5 M-9.5 5.5 L9.5 -5.5 M-3 -8 L0 -5 L3 -8 M-3 8 L0 5 L3 8" /></Sticker>
        </g>
    </g>
);

export default function Sneeuw() {
    return (
        <>
            <Far side="l">
                <path className="ks-far1 ks-ns" d="M0 72 L56 30 L92 56 L150 12 L214 70 L262 46 L330 92 L480 116 V120 H0 Z" />
                <path className="ks-shade" d="M56 30 L92 56 L74 60 Z M150 12 L214 70 L176 76 Z M262 46 L330 92 L290 90 Z" />
                <path className="ks-white ks-ns" d="M56 30 L70 41 Q64 46 60 41 Q55 47 50 41 Q46 45 43 40 Z M150 12 L172 32 Q166 37 160 31 Q154 39 148 31 Q140 37 133 30 Z M262 46 L274 54 Q270 58 266 54 Q261 59 256 54 Q252 57 249 53 Z" />
                <path className="ks-line" d="M0 72 L56 30 L92 56 L150 12 L214 70 L262 46 L330 92 L480 116" />
                <path className="ks-far2 ks-ns" d="M0 98 Q120 82 240 98 Q360 112 480 118 V120 H0 Z" />
                <path className="ks-line" d="M0 98 Q120 82 240 98 Q360 112 480 118" />
            </Far>
            <Far side="r">
                <path className="ks-far1 ks-ns" d="M0 116 L120 86 L200 40 L240 62 L320 16 L390 60 L430 44 L480 70 V120 H0 Z" />
                <path className="ks-shade" d="M200 40 L240 62 L222 66 Z M320 16 L390 60 L352 66 Z M430 44 L480 70 L456 72 Z" />
                <path className="ks-white ks-ns" d="M200 40 L214 48 Q209 53 204 48 Q199 54 194 48 Q190 51 187 47 Z M320 16 L342 30 Q336 35 330 29 Q324 37 318 29 Q311 35 303 28 Z M430 44 L442 50 Q437 55 432 50 Q427 55 422 50 Z" />
                <path className="ks-line" d="M0 116 L120 86 L200 40 L240 62 L320 16 L390 60 L430 44 L480 70" />
                <path className="ks-far2 ks-ns" d="M0 118 Q120 100 240 104 Q360 108 480 94 V120 H0 Z" />
                <path className="ks-line" d="M0 118 Q120 100 240 104 Q360 108 480 94" />
            </Far>
            <Ground back />
            <Ground />
            <Cloud top="10%" w="clamp(90px, 10vw, 180px)" dur={120} delay={-35} at="10vw" />
            <Cloud top="32%" w="clamp(70px, 7vw, 130px)" dur={150} delay={-100} at="84vw" />
            <Trav vb="0 0 60 24" w="clamp(36px, 3vw, 60px)" top="24%" dur={36} delay={-10} at="88vw">
                <g className="ks-flap"><path className="ks-line" d="M6 14 q10 -10 20 0 q10 -10 20 0" /></g>
            </Trav>
            <Air side="l"><Flake x={34} y={30} /><Flake x={92} y={54} s={0.7} /><Flake x={136} y={24} s={0.55} /></Air>
            <Air side="r"><Flake x={30} y={50} s={0.6} /><Flake x={82} y={24} s={0.85} /><Flake x={134} y={52} /></Air>
            <Corner side="l">
                <Pine x={70} s={1.15} />
                <Pine x={180} s={0.84} />
                <Mound x={70} w={56} />
                <Mound x={180} w={42} />
                <g transform="translate(0 232)"><Bunny /></g>
            </Corner>
            <Corner side="r">
                <Snowman />
                <Mound x={130} w={62} />
            </Corner>
            <Weather kind="snow" />
        </>
    );
}
