import { Air, Cloud, Corner, Far, Ground, Sticker, Trav } from './parts';
import Weather from './Weather';

// Leerjaar 1: a spring meadow: hills with round trees far off, a beehive on a stump with a bee buzzing round it,
// flowers swaying in the wind, bees and clouds drifting by and blossom petals in the air.

// A flower on a stem from the ground; it sways from its foot.
const Flower = ({ x, y, r, pink, delay = 0 }: { x: number; y: number; r: number; pink?: boolean; delay?: number }) => (
    <g className="ks-sway" style={{ animationDelay: `${delay}s` }}>
        <Sticker>
            <path className="ks-rope is-leaf" d={`M${x} 242 Q${x - 4} ${(y + 242) / 2} ${x} ${y}`} />
            <path className="ks-leaf" d={`M${x - 1} ${y + (242 - y) * 0.6} q-18 -10 -22 -2 q8 10 22 2 Z`} />
            {[0, 60, 120, 180, 240, 300].map(a => (
                <circle key={a} className={pink ? 'ks-pink' : 'ks-white'} cx={x + Math.cos(a * Math.PI / 180) * r * 1.25} cy={y + Math.sin(a * Math.PI / 180) * r * 1.25} r={r * 0.85} />
            ))}
        </Sticker>
        <circle className="ks-honey" cx={x} cy={y} r={r * 0.8} />
        <circle className="ks-shine" cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.25} />
    </g>
);

const Tulip = ({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) => (
    <g className="ks-sway" style={{ animationDelay: `${delay}s` }}>
        <Sticker>
            <path className="ks-rope is-leaf" d={`M${x} 242 Q${x + 4} ${(y + 242) / 2} ${x} ${y + 10}`} />
            <path className="ks-leaf" d={`M${x} 232 q-6 -40 -24 -50 q4 30 24 50 Z`} />
            <path className="ks-red" d={`M${x - 14} ${y - 8} L${x - 7} ${y + 2} L${x} ${y - 10} L${x + 7} ${y + 2} L${x + 14} ${y - 8} Q${x + 16} ${y + 16} ${x} ${y + 16} Q${x - 16} ${y + 16} ${x - 14} ${y - 8} Z`} />
        </Sticker>
        <path className="ks-shade" d={`M${x + 3} ${y + 2} L${x + 7} ${y + 2} L${x + 14} ${y - 8} Q${x + 16} ${y + 16} ${x} ${y + 16} Q${x + 8} ${y + 10} ${x + 3} ${y + 2} Z`} />
    </g>
);

const Bee = ({ flip }: { flip?: boolean }) => (
    <g transform={flip ? 'scale(-1 1)' : undefined}>
        <g className="ks-flap" style={{ animationDuration: '0.18s' }}>
            <ellipse className="ks-wing" cx="-4" cy="-13" rx="7" ry="10" transform="rotate(-20 -4 -13)" />
            <ellipse className="ks-wing" cx="5" cy="-12" rx="6" ry="9" transform="rotate(20 5 -12)" />
        </g>
        <Sticker>
            <path className="ks-honey" d="M-17 0 L-23 2 L-17 4 Z" />
            <ellipse className="ks-honey" cx="0" cy="0" rx="16" ry="11" />
        </Sticker>
        <path className="ks-stripe" d="M-5 -10 V10 M3 -10.5 V10.5" />
        <circle className="ks-eye" cx="10" cy="-2" r="2" />
        <path className="ks-mouth" d="M9 4 q3 2 5 -1" />
        <path className="ks-line" d="M10 -9 q2 -8 7 -9" />
    </g>
);

const Hive = () => (
    <>
        <Sticker>
            <path className="ks-wood-dark" d="M44 198 L50 242 H180 L186 198 Z" />
            <ellipse className="ks-wood" cx="115" cy="198" rx="71" ry="11" />
            <path className="ks-honey" d="M62 196 Q58 94 115 84 Q172 94 168 196 Z" />
        </Sticker>
        <ellipse className="ks-fine" cx="115" cy="198" rx="40" ry="5" />
        <path className="ks-fine" d="M70 214 v20 M104 216 v22 M150 214 v22" />
        <path className="ks-line" d="M74 112 Q115 100 156 112 M64 140 Q115 128 166 140 M62 168 Q115 156 168 168" />
        <path className="ks-shade" d="M140 92 Q170 104 168 196 L146 196 Q152 130 140 92 Z" />
        <path className="ks-gloss" d="M80 150 Q80 116 96 100" />
        <ellipse className="ks-hole" cx="115" cy="180" rx="14" ry="10" />
        <path className="ks-honey" d="M102 196 q0 10 5 10 q5 0 5 -10 Z" />
        <g transform="translate(78 118)"><g className="ks-buzz"><g transform="scale(0.7)"><Bee /></g></g></g>
    </>
);

export default function Bijen() {
    return (
        <>
            <Far side="l">
                <path className="ks-far1 ks-ns" d="M0 70 Q60 40 130 60 Q200 80 260 58 Q340 34 420 70 Q450 84 480 116 V120 H0 Z" />
                <path className="ks-line" d="M0 70 Q60 40 130 60 Q200 80 260 58 Q340 34 420 70 Q450 84 480 116" />
                {[[70, 50, 14], [100, 54, 10], [300, 48, 13]].map(([x, y, r]) => (
                    <g key={x}><path className="ks-wood" d={`M${x - 2} ${y} h4 v16 h-4 Z`} /><circle className="ks-leaf" cx={x} cy={y - r * 0.6} r={r} /></g>
                ))}
                <path className="ks-far2 ks-ns" d="M0 96 Q100 76 200 92 Q320 110 480 118 V120 H0 Z" />
                <path className="ks-line" d="M0 96 Q100 76 200 92 Q320 110 480 118" />
            </Far>
            <Far side="r">
                <path className="ks-far1 ks-ns" d="M0 116 Q100 90 180 70 Q260 44 340 62 Q410 76 480 50 V120 H0 Z" />
                <path className="ks-line" d="M0 116 Q100 90 180 70 Q260 44 340 62 Q410 76 480 50" />
                {[[250, 48, 14], [380, 64, 11], [410, 62, 9]].map(([x, y, r]) => (
                    <g key={x}><path className="ks-wood" d={`M${x - 2} ${y} h4 v16 h-4 Z`} /><circle className="ks-leaf" cx={x} cy={y - r * 0.6} r={r} /></g>
                ))}
                <path className="ks-far2 ks-ns" d="M0 118 Q120 100 240 104 Q360 108 480 90 V120 H0 Z" />
                <path className="ks-line" d="M0 118 Q120 100 240 104 Q360 108 480 90" />
            </Far>
            <Ground back />
            <Ground />
            <Cloud top="14%" w="clamp(90px, 10vw, 180px)" dur={110} delay={-30} at="8vw" />
            <Cloud top="34%" w="clamp(70px, 7vw, 130px)" dur={140} delay={-95} at="82vw" />
            <Trav vb="-30 -30 60 60" w="clamp(34px, 3vw, 56px)" top="22%" dur={38} delay={-8} at="12vw">
                <g className="ks-bob"><Bee /></g>
            </Trav>
            <Trav vb="-30 -30 60 60" w="clamp(28px, 2.4vw, 46px)" top="55%" dur={46} delay={-30} at="88vw" rev>
                <g className="ks-bob"><Bee /></g>
            </Trav>
            <Air side="r">
                <circle className="ks-sun" cx="112" cy="38" r="26" />
                <path className="ks-gloss" d="M96 30 Q100 20 110 18" />
            </Air>
            <Corner side="l">
                <Hive />
                <Flower x={20} y={196} r={7} pink delay={-1} />
                <Flower x={214} y={178} r={8} delay={-2.5} />
            </Corner>
            <Corner side="r">
                <Flower x={50} y={150} r={10} delay={-0.5} />
                <Tulip x={92} y={130} delay={-3} />
                <Flower x={136} y={110} r={12} pink delay={-1.8} />
                <Tulip x={176} y={156} delay={-4} />
                <Flower x={208} y={170} r={9} delay={-2.2} />
                <g className="ks-sway" style={{ animationDelay: '-1s' }}>
                    <Sticker>
                        <path className="ks-leaf" d="M0 242 Q10 200 20 242 Q30 210 36 242 Q46 214 52 242 Z" />
                        <path className="ks-leaf" d="M150 242 Q160 206 170 242 Q178 216 186 242 Q196 212 204 242 Z" />
                    </Sticker>
                </g>
                {/* A ladybird on the big pink flower. */}
                <g transform="translate(152 94) rotate(-30)">
                    <Sticker><ellipse className="ks-red" cx="0" cy="0" rx="7" ry="6" /><circle className="ks-hat" cx="7" cy="0" r="3.5" /></Sticker>
                    <path className="ks-line" d="M0 -6 V6" />
                    <circle className="ks-eye" cx="-3" cy="-2" r="1.3" />
                    <circle className="ks-eye" cx="-2" cy="3" r="1.3" />
                    <circle className="ks-eye" cx="3" cy="-2.5" r="1.1" />
                </g>
            </Corner>
            <Weather kind="petals" />
        </>
    );
}
