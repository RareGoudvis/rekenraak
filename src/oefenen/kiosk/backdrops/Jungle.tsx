import { Air, Cloud, Corner, Far, Ground, Sticker, Trav } from './parts';
import Weather from './Weather';

// Leerjaar 4: the jungle: a tree line far off, big leaves with a hibiscus and a frog, a macaw on a branch, vines
// and a butterfly at the top.

// A leaf from its stem end (0, 0) along +x: midrib and three pairs of side veins.
const Leaf = ({ x, y, a, len, w = 0.34, dark }: { x: number; y: number; a: number; len: number; w?: number; dark?: boolean }) => (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
        <Sticker><path className={dark ? 'ks-leaf-dark' : 'ks-leaf'} d={`M0 0 Q${len * 0.4} ${-len * w} ${len} 0 Q${len * 0.4} ${len * w} 0 0 Z`} /></Sticker>
        <path className="ks-shade" d={`M0 0 Q${len * 0.4} ${len * w} ${len} 0 Q${len * 0.45} ${len * w * 0.4} 0 0 Z`} />
        <path className="ks-fine" d={`M3 0 Q${len * 0.5} ${-len * 0.02} ${len * 0.92} 0`} />
        {([[0.3, 0.42], [0.5, 0.36], [0.7, 0.22]] as const).map(([t, h]) => (
            <path key={t} className="ks-fine" d={`M${len * t} 0 L${len * (t + 0.1)} ${-len * w * h} M${len * t} 0 L${len * (t + 0.1)} ${len * w * h}`} />
        ))}
    </g>
);

const Hibiscus = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x} ${y})`}>
        <Sticker>
            {[0, 72, 144, 216, 288].map(a => (
                <ellipse key={a} className="ks-hibiscus" cx="0" cy="-11" rx="9" ry="12" transform={`rotate(${a})`} />
            ))}
        </Sticker>
        <circle className="ks-red ks-ns" cx="0" cy="0" r="6" />
        <path className="ks-line" d="M0 0 L10 -14" />
        {[[10, -14], [12, -10], [7, -16]].map(([cx, cy]) => <circle key={cx} className="ks-honey" cx={cx} cy={cy} r="2" />)}
    </g>
);

const Frog = () => (
    <g transform="translate(176 0)"><g className="ks-hop">
        <Sticker>
            <ellipse className="ks-frog" cx="-24" cy="226" rx="12" ry="10" />
            <ellipse className="ks-frog" cx="24" cy="226" rx="12" ry="10" />
            <ellipse className="ks-frog" cx="0" cy="216" rx="28" ry="20" />
            <circle className="ks-frog" cx="-14" cy="196" r="10" />
            <circle className="ks-frog" cx="14" cy="196" r="10" />
            <ellipse className="ks-frog" cx="-14" cy="234" rx="9" ry="5" />
            <ellipse className="ks-frog" cx="14" cy="234" rx="9" ry="5" />
        </Sticker>
        <ellipse className="ks-belly ks-ns" cx="0" cy="224" rx="15" ry="10" />
        <circle className="ks-white" cx="-14" cy="196" r="6" />
        <circle className="ks-white" cx="14" cy="196" r="6" />
        <circle className="ks-eye ks-blink" cx="-13" cy="197" r="3" />
        <circle className="ks-eye ks-blink" cx="15" cy="197" r="3" />
        <path className="ks-mouth" d="M-12 212 Q0 220 12 212" />
        <ellipse className="ks-cheek" cx="-18" cy="210" rx="4" ry="2.5" />
        <ellipse className="ks-cheek" cx="18" cy="210" rx="4" ry="2.5" />
        <circle className="ks-leaf-dark ks-ns" cx="-6" cy="204" r="2.5" />
        <circle className="ks-leaf-dark ks-ns" cx="20" cy="220" r="3" />
    </g></g>
);

// A scarlet macaw facing left, swaying a little on its perch.
const Macaw = () => (
    <>
        {/* The long tail hangs behind the branch. */}
        <g className="ks-tilt" style={{ transformOrigin: '140px 160px' }}>
            <Sticker>
                <path className="ks-red" d="M134 150 L146 150 L166 226 Q160 234 153 228 Z" />
                <path className="ks-blue" d="M144 148 L152 148 L178 214 Q174 222 166 218 Z" />
            </Sticker>
        </g>
        <Sticker>
            <path className="ks-wood" d="M248 132 Q170 142 66 164 Q56 170 66 176 Q170 162 248 152 Z" />
            <path className="ks-rope is-wood" d="M100 162 Q90 146 76 140" />
        </Sticker>
        <path className="ks-fine" d="M200 144 l14 -2 M172 150 l10 -1 M96 166 l10 -2" />
        <Leaf x={76} y={140} a={-160} len={30} w={0.4} />
        <Leaf x={78} y={140} a={-110} len={26} w={0.4} dark />
        <Leaf x={236} y={138} a={-70} len={34} w={0.4} />
        <g className="ks-tilt" style={{ transformOrigin: '140px 160px' }}>
            <Sticker>
                <path className="ks-red" d="M144 88 Q168 98 164 132 Q160 156 142 162 Q122 160 118 134 Q116 102 144 88 Z" />
                <circle className="ks-red" cx="128" cy="92" r="20" />
                <path className="ks-belly" d="M112 84 Q94 82 94 100 Q96 108 102 108 Q102 98 112 98 Z" />
                <path className="ks-hat" d="M104 104 Q108 112 115 104 L112 98 Z" />
            </Sticker>
            <g className="ks-wing-beat" style={{ transformOrigin: '146px 104px' }}>
                <Sticker><path className="ks-blue" d="M146 102 Q172 108 166 140 L156 172 Q140 154 136 134 Q132 112 146 102 Z" /></Sticker>
                <path className="ks-honey ks-ns" d="M146 102 Q168 106 168 122 Q152 127 138 120 Q137 108 146 102 Z" />
                <path className="ks-leaf ks-ns" d="M138 120 Q152 127 168 122 L167 132 Q150 137 137 130 Z" />
                <path className="ks-fine" d="M146 140 L156 166 M152 136 L161 156 M140 134 L149 158" />
            </g>
            <path className="ks-shade" d="M122 140 Q132 158 142 162 Q124 162 118 140 Z" />
            <ellipse className="ks-white" cx="121" cy="90" rx="8" ry="9" />
            <path className="ks-fine" d="M116 84 l3 1 M116 92 l3 0 M118 97 l3 -1" />
            <circle className="ks-eye ks-blink" cx="121" cy="89" r="3.5" />
            <path className="ks-fine" d="M106 90 Q110 96 107 104" />
        </g>
        <path className="ks-hat" d="M128 158 q3 6 8 0 M140 156 q3 6 8 0" />
    </>
);

// A vine along the top edge with a loose end hanging down.
const Vine = () => (
    <>
        <path className="ks-line" d="M0 4 Q50 50 100 26 T 168 14 M60 38 Q58 60 64 78" />
        <Leaf x={24} y={26} a={70} len={22} w={0.45} />
        <Leaf x={52} y={36} a={130} len={20} w={0.45} dark />
        <Leaf x={92} y={30} a={60} len={22} w={0.45} />
        <Leaf x={130} y={18} a={110} len={20} w={0.45} dark />
        <Leaf x={62} y={60} a={20} len={18} w={0.45} />
        <Leaf x={62} y={70} a={150} len={16} w={0.45} dark />
    </>
);

const Butterfly = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x} ${y}) rotate(-15)`}>
        <g className="ks-flap" style={{ animationDuration: '0.35s' }}>
            <Sticker>
                <ellipse className="ks-orange" cx="-9" cy="-6" rx="9" ry="7" />
                <ellipse className="ks-orange" cx="9" cy="-6" rx="9" ry="7" />
                <ellipse className="ks-hibiscus" cx="-6" cy="6" rx="6" ry="5" />
                <ellipse className="ks-hibiscus" cx="6" cy="6" rx="6" ry="5" />
            </Sticker>
            <circle className="ks-white ks-ns" cx="-10" cy="-7" r="2.5" />
            <circle className="ks-white ks-ns" cx="10" cy="-7" r="2.5" />
        </g>
        <path className="ks-line" d="M0 -9 V9 M0 -9 Q-3 -15 -6 -16 M0 -9 Q3 -15 6 -16" />
    </g>
);

export default function Jungle() {
    return (
        <>
            <Far side="l">
                <path className="ks-far1 ks-ns" d="M0 58 Q14 34 40 42 Q56 18 84 32 Q104 14 128 34 Q150 24 168 44 Q192 34 210 56 Q240 50 262 68 Q300 66 330 84 Q400 90 480 116 V120 H0 Z" />
                <path className="ks-line" d="M0 58 Q14 34 40 42 Q56 18 84 32 Q104 14 128 34 Q150 24 168 44 Q192 34 210 56 Q240 50 262 68 Q300 66 330 84 Q400 90 480 116" />
                <path className="ks-far2 ks-ns" d="M0 90 Q40 72 80 84 Q120 70 160 86 Q220 82 280 100 Q380 108 480 118 V120 H0 Z" />
                <path className="ks-line" d="M0 90 Q40 72 80 84 Q120 70 160 86 Q220 82 280 100 Q380 108 480 118" />
            </Far>
            <Far side="r">
                <path className="ks-far1 ks-ns" d="M0 116 Q80 96 150 82 Q180 58 210 64 Q232 30 262 40 Q290 16 320 34 Q348 22 372 44 Q400 30 430 50 Q460 44 480 54 V120 H0 Z" />
                <path className="ks-line" d="M0 116 Q80 96 150 82 Q180 58 210 64 Q232 30 262 40 Q290 16 320 34 Q348 22 372 44 Q400 30 430 50 Q460 44 480 54" />
                <path className="ks-wood" d="M118 100 Q112 70 122 44 L127 45 Q118 72 124 100 Z" />
                <path className="ks-leaf-dark" d="M124 44 Q104 34 92 48 Q108 40 124 44 Z M124 44 Q146 32 158 46 Q140 40 124 44 Z M124 44 Q116 24 124 16 Q126 32 124 44 Z M124 44 Q108 50 102 64 Q114 52 124 44 Z" />
                <path className="ks-far2 ks-ns" d="M0 118 Q100 96 200 100 Q300 104 380 88 Q430 80 480 84 V120 H0 Z" />
                <path className="ks-line" d="M0 118 Q100 96 200 100 Q300 104 380 88 Q430 80 480 84" />
            </Far>
            <Ground back />
            <Ground />
            <Cloud top="8%" w="clamp(90px, 10vw, 180px)" dur={130} delay={-20} />
            <Cloud top="30%" w="clamp(70px, 7vw, 130px)" dur={160} delay={-90} />
            <Trav vb="-20 -20 40 40" w="clamp(26px, 2.4vw, 44px)" top="40%" dur={40} delay={-14} rev>
                <g className="ks-bob"><Butterfly x={0} y={0} /></g>
            </Trav>
            <Air side="l"><Vine /></Air>
            <Air side="r">
                <g transform="translate(160 0) scale(-1 1)"><Vine /></g>
            </Air>
            <Corner side="l">
                <g className="ks-sway-l">
                    <Leaf x={0} y={238} a={-78} len={168} dark />
                    <Leaf x={0} y={238} a={-48} len={196} />
                </g>
                <g className="ks-sway-l" style={{ animationDelay: '-2.2s' }}>
                    <Leaf x={8} y={240} a={-20} len={160} dark />
                    <Leaf x={40} y={240} a={-62} len={118} />
                    <Leaf x={20} y={240} a={-4} len={110} />
                    <Hibiscus x={92} y={128} />
                    <Hibiscus x={150} y={170} />
                </g>
                <Frog />
            </Corner>
            <Corner side="r">
                <Macaw />
            </Corner>
            <Weather kind="rain" />
        </>
    );
}
