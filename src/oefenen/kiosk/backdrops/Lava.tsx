import type { CSSProperties } from 'react';
import { Air, Cloud, Corner, Far, Ground, Sticker, Trav } from './parts';
import Weather from './Weather';

// Leerjaar 3: lava land, the friendly kind: small volcanoes far off, a baby dinosaur among ferns, a smiling volcano
// puffing smoke, a pterodactyl gliding past the sun.

const Puff = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
        <Sticker>
            <circle className="ks-smoke" cx="-12" cy="3" r="9" />
            <circle className="ks-smoke" cx="12" cy="3" r="9" />
            <circle className="ks-smoke" cx="0" cy="-4" r="12" />
        </Sticker>
    </g>
);

// A fern frond from (0, 0) along +x: a stem with leaflets on both sides, shrinking to the tip.
const Frond = ({ x, y, a, len }: { x: number; y: number; a: number; len: number }) => (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
        <Sticker>
            <path className="ks-rope is-fern" d={`M0 0 Q${len * 0.5} ${-len * 0.08} ${len} 0`} />
            {[0.18, 0.32, 0.46, 0.6, 0.74, 0.88].map(t => (
                <g key={t}>
                    <ellipse className="ks-fern" cx={len * t} cy={-7} rx={9 * (1.1 - t * 0.7)} ry="3.6" transform={`rotate(-35 ${len * t} -7)`} />
                    <ellipse className="ks-fern" cx={len * t} cy={7} rx={9 * (1.1 - t * 0.7)} ry="3.6" transform={`rotate(35 ${len * t} 7)`} />
                </g>
            ))}
        </Sticker>
    </g>
);

const Dino = () => (
    <>
        <Sticker>
            <rect className="ks-dino-dark" x="104" y="196" width="16" height="38" rx="7" />
            <rect className="ks-dino-dark" x="142" y="194" width="16" height="38" rx="7" />
        </Sticker>
        <Sticker>
            {[[80, 166], [97, 158], [115, 155], [133, 158], [150, 140], [158, 122]].map(([x, y]) => (
                <path key={x} className="ks-orange" d={`M${x - 8} ${y + 5} Q${x - 2} ${y - 8} ${x} ${y - 12} Q${x + 2} ${y - 8} ${x + 8} ${y + 5} Z`} />
            ))}
            <g className="ks-swish" style={{ transformOrigin: '78px 190px' }}>
                <path className="ks-dino" d="M78 172 Q42 176 16 210 Q12 218 22 216 Q50 206 80 206 Z" />
            </g>
            <ellipse className="ks-dino" cx="112" cy="188" rx="46" ry="32" />
            <path className="ks-dino" d="M134 170 Q146 150 150 120 L174 118 Q172 160 152 200 Z" />
            <ellipse className="ks-dino" cx="170" cy="106" rx="27" ry="19" />
            <ellipse className="ks-dino" cx="188" cy="113" rx="14" ry="12" />
            <rect className="ks-dino" x="88" y="198" width="18" height="36" rx="8" />
            <rect className="ks-dino" x="126" y="198" width="18" height="36" rx="8" />
            <ellipse className="ks-dino" cx="99" cy="234" rx="12" ry="5" />
            <ellipse className="ks-dino" cx="137" cy="234" rx="12" ry="5" />
            <ellipse className="ks-dino" cx="160" cy="180" rx="5" ry="9" transform="rotate(-35 160 180)" />
        </Sticker>
        <ellipse className="ks-belly ks-ns" cx="122" cy="198" rx="28" ry="14" />
        <path className="ks-fine" d="M106 192 q16 4 32 0 M106 202 q16 4 32 0" />
        <circle className="ks-dino-dark ks-ns" cx="94" cy="174" r="5" />
        <circle className="ks-dino-dark ks-ns" cx="111" cy="168" r="4" />
        <circle className="ks-dino-dark ks-ns" cx="80" cy="190" r="4" />
        <circle className="ks-dino-dark ks-ns" cx="162" cy="96" r="3" />
        <path className="ks-shade" d="M68 196 Q112 228 156 196 Q150 220 112 220 Q76 218 68 196 Z" />
        <circle className="ks-white" cx="174" cy="99" r="7.5" />
        <circle className="ks-eye ks-blink" cx="176" cy="100" r="4" />
        <circle className="ks-white ks-ns" cx="177.5" cy="98" r="1.4" />
        <path className="ks-mouth" d="M180 118 Q190 124 198 115" />
        <circle className="ks-eye" cx="196" cy="106" r="1.6" />
        <ellipse className="ks-cheek" cx="178" cy="114" rx="5" ry="3" />
    </>
);

const RISING: { delay: number; s: number }[] = [
    { delay: 0, s: 0.8 },
    { delay: -2, s: 1 },
    { delay: -4, s: 1.1 },
];

const Volcano = () => (
    <>
        {RISING.map(p => (
            <g key={p.delay} className="ks-rise" style={{ '--delay': `${p.delay}s`, transformOrigin: '122px 76px' } as CSSProperties}>
                <Puff x={122} y={74} s={p.s} />
            </g>
        ))}
        <Sticker>
            <path className="ks-terra" d="M10 240 L82 104 Q90 90 104 90 L140 90 Q154 90 162 104 L234 240 Z" />
            <path className="ks-lava" d="M84 102 Q92 88 106 88 L138 88 Q152 88 160 102 L166 116 Q162 126 156 118 L152 136 Q146 146 140 134 L136 120 Q128 130 121 120 Q116 146 108 140 L104 124 Q98 132 90 122 Z" />
        </Sticker>
        <ellipse className="ks-glow ks-pulse" cx="122" cy="92" rx="20" ry="5" />
        <path className="ks-shade" d="M162 106 L234 240 L186 240 Q178 170 156 124 Z" />
        <path className="ks-gloss" d="M74 132 L48 184" />
        <path className="ks-fine" d="M56 214 l10 -6 l8 3 M190 196 l-8 -8 l6 -5 M178 226 l8 -6" />
        <circle className="ks-eye ks-blink" cx="104" cy="160" r="6.5" />
        <circle className="ks-eye ks-blink" cx="140" cy="160" r="6.5" />
        <circle className="ks-white ks-ns" cx="102" cy="157.5" r="2" />
        <circle className="ks-white ks-ns" cx="138" cy="157.5" r="2" />
        <ellipse className="ks-cheek" cx="92" cy="178" rx="9" ry="6" />
        <ellipse className="ks-cheek" cx="152" cy="178" rx="9" ry="6" />
        <path className="ks-mouthfill" d="M108 180 Q122 198 136 180 Q122 186 108 180 Z" />
        <Sticker>
            <ellipse className="ks-rock" cx="22" cy="232" rx="18" ry="11" />
            <ellipse className="ks-rock" cx="44" cy="236" rx="9" ry="6" />
            <ellipse className="ks-rock" cx="222" cy="232" rx="15" ry="10" />
        </Sticker>
    </>
);

const Ptero = () => (
    <g transform="translate(46 22)">
        <g className="ks-flap" style={{ animationDuration: '0.9s' }}>
            <Sticker><path className="ks-terra" d="M-4 0 Q-22 -16 -38 -4 Q-24 -6 -14 6 Z M4 0 Q22 -16 38 -4 Q24 -6 14 6 Z" /></Sticker>
        </g>
        <Sticker>
            <ellipse className="ks-terra" cx="0" cy="2" rx="8" ry="6" />
            <circle className="ks-terra" cx="9" cy="-4" r="6" />
            <path className="ks-terra" d="M13 -6 L28 -2 L14 0 Z M5 -8 L-4 -14 L4 -4 Z" />
        </Sticker>
        <circle className="ks-eye" cx="10.5" cy="-5" r="1.5" />
    </g>
);

export default function Lava() {
    return (
        <>
            <Far side="l">
                <path className="ks-far1 ks-ns" d="M0 80 L60 48 L100 66 L150 30 L200 70 L260 58 L330 92 L480 116 V120 H0 Z" />
                <path className="ks-shade" d="M60 48 L100 66 L80 68 Z M150 30 L200 70 L168 74 Z" />
                <path className="ks-line" d="M0 80 L60 48 L100 66 L150 30 L200 70 L260 58 L330 92 L480 116" />
                <path className="ks-far2 ks-ns" d="M0 100 Q100 84 200 96 Q320 110 480 118 V120 H0 Z" />
                <path className="ks-line" d="M0 100 Q100 84 200 96 Q320 110 480 118" />
            </Far>
            <Far side="r">
                <Puff x={330} y={26} s={0.7} />
                <path className="ks-far1 ks-ns" d="M0 116 L140 92 L200 78 L280 104 L300 98 L322 46 Q330 40 338 46 L360 98 L480 70 V120 H0 Z" />
                <path className="ks-lava ks-ns" d="M322 46 Q330 40 338 46 L342 56 Q338 62 334 56 Q330 64 326 56 Q322 60 318 56 Z" />
                <path className="ks-shade" d="M338 46 L360 98 L342 98 Z" />
                <path className="ks-line" d="M0 116 L140 92 L200 78 L280 104 L300 98 L322 46 Q330 40 338 46 L360 98 L480 70" />
                <path className="ks-far2 ks-ns" d="M0 118 Q120 100 240 106 Q360 112 480 96 V120 H0 Z" />
                <path className="ks-line" d="M0 118 Q120 100 240 106 Q360 112 480 96" />
            </Far>
            <Ground back />
            <Ground />
            <Cloud top="10%" w="clamp(90px, 10vw, 180px)" dur={120} delay={-50} />
            <Cloud top="38%" w="clamp(70px, 7vw, 130px)" dur={150} delay={-100} />
            <Trav vb="0 0 92 40" w="clamp(60px, 6vw, 120px)" top="18%" dur={30} delay={-12}><Ptero /></Trav>
            <Air side="r"><circle className="ks-sun" cx="110" cy="38" r="26" /><path className="ks-gloss" d="M94 30 Q98 20 108 18" /></Air>
            <Corner side="l">
                <g className="ks-sway"><Frond x={24} y={238} a={-100} len={100} /><Frond x={30} y={238} a={-60} len={110} /></g>
                <g className="ks-sway" style={{ animationDelay: '-2s' }}><Frond x={200} y={238} a={-80} len={80} /><Frond x={206} y={238} a={-45} len={70} /></g>
                <Dino />
            </Corner>
            <Corner side="r">
                <Volcano />
            </Corner>
            <Weather kind="embers" />
        </>
    );
}
