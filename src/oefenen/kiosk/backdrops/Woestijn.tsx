import { Air, Corner, Far, Ground, Sticker, Trav } from './parts';
import Weather from './Weather';

// Leerjaar 6: the desert: dunes and pyramids far off, a saguaro in bloom, a camel with a saddle blanket, a smiling sun.

const Bloom = ({ x, y, r }: { x: number; y: number; r: number }) => (
    <g>
        {[0, 72, 144, 216, 288].map(a => (
            <circle key={a} className="ks-pink" cx={x + Math.cos((a - 90) * Math.PI / 180) * r} cy={y + Math.sin((a - 90) * Math.PI / 180) * r} r={r * 0.8} />
        ))}
    </g>
);

const Saguaro = () => (
    <>
        <Sticker>
            <rect className="ks-cactus" x="48" y="98" width="24" height="72" rx="12" />
            <rect className="ks-cactus" x="48" y="146" width="60" height="24" rx="12" />
            <rect className="ks-cactus" x="154" y="74" width="24" height="72" rx="12" />
            <rect className="ks-cactus" x="124" y="122" width="54" height="24" rx="12" />
            <rect className="ks-cactus" x="94" y="52" width="44" height="190" rx="22" />
            <Bloom x={116} y={50} r={7} />
            <Bloom x={166} y={72} r={5} />
        </Sticker>
        <rect className="ks-shade" x="122" y="62" width="12" height="176" rx="6" />
        <rect className="ks-shade" x="62" y="104" width="7" height="58" rx="3.5" />
        <rect className="ks-shade" x="168" y="80" width="7" height="58" rx="3.5" />
        <rect className="ks-shade" x="56" y="162" width="40" height="6" rx="3" />
        <rect className="ks-shade" x="138" y="138" width="34" height="6" rx="3" />
        <rect className="ks-shine" x="100" y="70" width="5" height="140" rx="2.5" />
        <path className="ks-fine" d="M110 66 V236 M124 66 V236 M60 106 V148 M166 82 V124" />
        <path className="ks-fine" d="M106 92 l-5 -3 M106 128 l-5 -3 M106 170 l-5 -3 M128 108 l5 -3 M128 150 l5 -3 M128 196 l5 -3" />
        <circle className="ks-honey ks-ns" cx="116" cy="50" r="3.5" />
        <circle className="ks-honey ks-ns" cx="166" cy="72" r="2.5" />
    </>
);

const Barrel = () => (
    <>
        <Sticker>
            <ellipse className="ks-cactus" cx="200" cy="218" rx="26" ry="22" />
            <Bloom x={200} y={196} r={5} />
        </Sticker>
        <path className="ks-shade" d="M212 200 Q228 208 226 224 Q222 238 206 239 Q222 222 212 200 Z" />
        <path className="ks-fine" d="M200 202 V238 M187 203 Q179 219 187 236 M213 203 Q221 219 213 236" />
        <circle className="ks-honey ks-ns" cx="200" cy="196" r="2.5" />
    </>
);

// A tumbleweed: a loose ball of twigs.
const Tumbleweed = () => (
    <>
        <circle className="ks-belly ks-ns" cx="0" cy="0" r="21" />
        <path className="ks-twig" d="M-20 -6 Q0 -26 18 -10 Q26 8 6 20 Q-16 24 -20 4 Q-14 -14 4 -12 Q16 -2 4 10 Q-8 12 -8 0 M-14 14 Q4 4 16 14 M-6 -20 Q-2 -4 -18 8" />
    </>
);

const Camel = () => (
    <>
        {/* The far legs: one shade darker, behind the body. */}
        <Sticker>
            <rect className="ks-camel-dark" x="84" y="150" width="13" height="80" rx="6.5" />
            <ellipse className="ks-camel-dark" cx="91" cy="200" rx="8" ry="7" />
            <ellipse className="ks-camel-dark" cx="93" cy="232" rx="10" ry="5" />
            <rect className="ks-camel-dark" x="134" y="150" width="13" height="80" rx="6.5" />
            <ellipse className="ks-camel-dark" cx="141" cy="200" rx="8" ry="7" />
            <ellipse className="ks-camel-dark" cx="143" cy="232" rx="10" ry="5" />
        </Sticker>
        <Sticker>
            <g className="ks-swish" style={{ transformOrigin: '54px 132px' }}>
                <path className="ks-rope is-camel" d="M54 132 Q40 150 44 174" />
                <ellipse className="ks-camel-dark" cx="44" cy="180" rx="5" ry="8" />
            </g>
            <rect className="ks-sand-dark" x="64" y="150" width="15" height="82" rx="7.5" />
            <ellipse className="ks-sand-dark" cx="71" cy="200" rx="9" ry="8" />
            <ellipse className="ks-sand-dark" cx="73" cy="233" rx="11" ry="5" />
            <rect className="ks-sand-dark" x="150" y="150" width="15" height="82" rx="7.5" />
            <ellipse className="ks-sand-dark" cx="157" cy="200" rx="9" ry="8" />
            <ellipse className="ks-sand-dark" cx="159" cy="233" rx="11" ry="5" />
            <path className="ks-sand-dark" d="M54 142 Q54 118 74 110 Q90 80 112 80 Q136 80 148 106 Q156 116 166 120 Q178 130 172 152 Q162 174 110 174 Q56 174 54 142 Z" />
            <g className="ks-nod" style={{ transformOrigin: '170px 140px' }}>
                <path className="ks-sand-dark" d="M150 124 Q172 130 180 106 Q186 90 188 68 L210 68 Q208 104 198 128 Q184 160 156 162 Z" />
                <ellipse className="ks-sand-dark" cx="192" cy="48" rx="5" ry="8" transform="rotate(-20 192 48)" />
                <ellipse className="ks-sand-dark" cx="204" cy="62" rx="22" ry="14" />
                <ellipse className="ks-sand-dark" cx="221" cy="69" rx="13" ry="11" />
            </g>
        </Sticker>
        <path className="ks-shade" d="M56 150 Q110 184 170 154 Q162 174 110 174 Q62 172 56 150 Z" />
        <path className="ks-gloss" d="M90 100 Q98 88 110 86" />
        <path className="ks-fine" d="M150 112 Q160 120 162 132" />
        <g className="ks-nod" style={{ transformOrigin: '170px 140px' }}>
            <path className="ks-shade" d="M196 70 Q204 104 188 136 Q176 156 160 160 Q184 140 190 108 Z" />
            {/* A red halter (cheek strap and noseband) with two tassels, the one bright touch. */}
            <Sticker><path className="ks-rope is-red" d="M196 54 L213 66 M213 58 Q210 70 215 81" /></Sticker>
            {[[211, 80], [218, 81]].map(([x, y]) => (
                <g key={x}>
                    <path className="ks-fine" d={`M${x} ${y} v5`} />
                    <circle className="ks-honey" cx={x} cy={y + 7} r="2.6" />
                </g>
            ))}
            <circle className="ks-eye ks-blink" cx="207" cy="58" r="2.8" />
            <path className="ks-line" d="M204 53 l-2 -4 M208 52 l0 -4.5" />
            <path className="ks-line" d="M228 63 q3 2 2 5" />
            <path className="ks-mouth" d="M214 76 Q222 80 230 74" />
            <ellipse className="ks-cheek" cx="212" cy="68" rx="5" ry="3.5" />
        </g>
    </>
);

export default function Woestijn() {
    return (
        <>
            <Far side="l">
                <path className="ks-far1 ks-ns" d="M0 64 Q70 30 150 60 Q210 82 280 58 Q360 32 480 116 V120 H0 Z" />
                <path className="ks-shade" d="M150 60 Q210 82 280 58 Q236 88 196 86 Z" />
                <path className="ks-line" d="M0 64 Q70 30 150 60 Q210 82 280 58 Q360 32 480 116" />
                <path className="ks-far2 ks-ns" d="M0 92 Q90 66 200 88 Q300 106 480 118 V120 H0 Z" />
                <path className="ks-line" d="M0 92 Q90 66 200 88 Q300 106 480 118" />
            </Far>
            <Far side="r">
                <path className="ks-far1" d="M250 104 L330 26 L410 104 Z" />
                <path className="ks-shade" d="M330 26 L410 104 L346 104 Z" />
                <path className="ks-far1" d="M384 104 L430 60 L476 104 Z" />
                <path className="ks-shade" d="M430 60 L476 104 L438 104 Z" />
                <path className="ks-wood" d="M157 104 Q153 80 161 60 L166 61 Q159 82 164 104 Z" />
                <path className="ks-leaf" d="M164 60 Q148 50 136 62 Q150 56 164 60 Z M164 60 Q182 48 194 60 Q178 56 164 60 Z M164 60 Q156 42 162 34 Q164 48 164 60 Z" />
                <path className="ks-far2 ks-ns" d="M0 118 Q120 80 240 100 Q360 112 480 92 V120 H0 Z" />
                <path className="ks-line" d="M0 118 Q120 80 240 100 Q360 112 480 92" />
            </Far>
            <Ground back />
            <Ground />
            <Trav vb="0 0 90 40" w="clamp(50px, 5vw, 90px)" top="16%" dur={34} delay={-8} at="6vw">
                <g className="ks-flap"><path className="ks-line" d="M6 22 q8 -8 16 0 q8 -8 16 0" /></g>
                <g className="ks-flap" style={{ animationDelay: '-0.2s' }}><path className="ks-line" d="M50 10 q6 -6 12 0 q6 -6 12 0" /></g>
            </Trav>
            <Trav vb="-30 -40 60 70" w="clamp(36px, 3.4vw, 64px)" bottom="calc(var(--ks-ground-h) * 0.3)" dur={22} delay={-6} at="70vw">
                <g className="ks-bounce"><g className="ks-roll"><Tumbleweed /></g></g>
            </Trav>
            <Air side="r">
                <g className="ks-spin">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                        <path key={a} className="ks-ray" d={`M${112 + Math.cos(a * Math.PI / 180) * 32} ${40 + Math.sin(a * Math.PI / 180) * 32} L${112 + Math.cos(a * Math.PI / 180) * 40} ${40 + Math.sin(a * Math.PI / 180) * 40}`} />
                    ))}
                </g>
                <circle className="ks-sun" cx="112" cy="40" r="24" />
                <path className="ks-mouth" d="M101 38 q4 -4 8 0 M115 38 q4 -4 8 0 M104 46 Q112 53 120 46" />
                <ellipse className="ks-cheek" cx="99" cy="45" rx="4" ry="2.5" />
                <ellipse className="ks-cheek" cx="125" cy="45" rx="4" ry="2.5" />
            </Air>
            <Corner side="l">
                <Sticker>
                    <ellipse className="ks-rock" cx="26" cy="232" rx="15" ry="9" />
                    <ellipse className="ks-rock" cx="48" cy="236" rx="8" ry="6" />
                </Sticker>
                <Saguaro />
                <Barrel />
            </Corner>
            <Corner side="r">
                <Camel />
            </Corner>
            <Weather kind="sand" />
        </>
    );
}
