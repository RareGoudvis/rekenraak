import { Air, Cloud, Corner, Far, Ground, Hill, Sticker, Trav } from './parts';
import Weather from './Weather';

// Leerjaar 2: soft, round, friendly monsters: two peek over the hills, duck away now and then and look around;
// little winged ones fly across, mushroom hills far off, soap bubbles in the air.

// A small round monster with wings, flying across (facing right).
const Flyer = ({ cls }: { cls: string }) => (
    <g>
        <g className="ks-flap" style={{ animationDuration: '0.3s' }}>
            <Sticker>
                <ellipse className="ks-white" cx="-18" cy="-8" rx="13" ry="7" transform="rotate(-20 -18 -8)" />
                <ellipse className="ks-white" cx="18" cy="-8" rx="13" ry="7" transform="rotate(20 18 -8)" />
            </Sticker>
        </g>
        <Sticker><circle className={cls} cx="0" cy="0" r="18" /></Sticker>
        <path className="ks-shade" d="M-14 8 Q0 22 14 8 Q10 18 0 18 Q-10 18 -14 8 Z" />
        <circle className="ks-white" cx="3" cy="-3" r="7" />
        <circle className="ks-eye ks-blink" cx="5" cy="-2" r="3.2" />
        <path className="ks-mouth" d="M-3 8 Q3 12 9 7" />
    </g>
);

const Mushroom = ({ x, y, s }: { x: number; y: number; s: number }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path className="ks-belly" d="M-6 0 L-7 22 H7 L6 0 Z" />
        <path className="ks-pink" d="M-22 2 Q-20 -22 0 -24 Q20 -22 22 2 Z" />
        <circle className="ks-white ks-ns" cx="-9" cy="-10" r="3.5" />
        <circle className="ks-white ks-ns" cx="7" cy="-14" r="3" />
        <circle className="ks-white ks-ns" cx="12" cy="-4" r="2.5" />
    </g>
);

const Teal = () => (
    <g className="ks-peek" style={{ animationDelay: '-2s' }}>
        <Sticker>
            <path className="ks-teal" d="M86 100 Q78 72 80 54 Q96 70 108 90 Z M150 90 Q164 70 176 56 Q176 78 168 102 Z" />
            <circle className="ks-teal" cx="128" cy="160" r="76" />
            <ellipse className="ks-teal" cx="56" cy="168" rx="12" ry="22" transform="rotate(30 56 168)" />
        </Sticker>
        <path className="ks-belly ks-ns" d="M84 92 Q82 76 82 64 Q92 76 100 88 Z M156 88 Q166 74 172 64 Q172 78 166 96 Z" />
        <path className="ks-shade" d="M168 104 Q210 150 196 196 Q170 230 128 236 Q190 200 168 104 Z" />
        <path className="ks-gloss" d="M78 128 Q86 104 108 92" />
        <circle className="ks-white" cx="104" cy="132" r="17" />
        <circle className="ks-white" cx="152" cy="132" r="17" />
        <g className="ks-look">
            <circle className="ks-eye ks-blink" cx="106" cy="136" r="7.5" />
            <circle className="ks-eye ks-blink" cx="150" cy="136" r="7.5" />
            <circle className="ks-white ks-ns" cx="103" cy="133" r="2.2" />
            <circle className="ks-white ks-ns" cx="147" cy="133" r="2.2" />
        </g>
        <path className="ks-mouthfill" d="M108 164 Q128 184 148 164 Q128 170 108 164 Z" />
        <path className="ks-white" d="M116 166 l3 6 l3 -5 Z M134 167 l3 5 l3 -6 Z" />
        <ellipse className="ks-cheek" cx="90" cy="158" rx="9" ry="5.5" />
        <ellipse className="ks-cheek" cx="166" cy="158" rx="9" ry="5.5" />
        <circle className="ks-shade" cx="168" cy="190" r="7" />
        <circle className="ks-shade" cx="92" cy="198" r="5" />
    </g>
);

const Pink = () => (
    <g className="ks-peek" style={{ animationDelay: '-7.5s' }}>
        <g className="ks-sway" style={{ animationDuration: '3s' }}>
            <Sticker>
                <path className="ks-rope is-wood" d="M124 80 Q120 50 134 32" />
                <circle className="ks-honey" cx="135" cy="28" r="10" />
            </Sticker>
            <circle className="ks-shine" cx="132" cy="25" r="3" />
        </g>
        <Sticker>
            <ellipse className="ks-pink" cx="124" cy="152" rx="66" ry="76" />
            <g className="ks-wave" style={{ transformOrigin: '186px 150px' }}>
                <ellipse className="ks-pink" cx="200" cy="124" rx="11" ry="26" transform="rotate(25 200 124)" />
            </g>
        </Sticker>
        <path className="ks-shade" d="M160 96 Q196 140 184 190 Q170 222 128 228 Q178 190 160 96 Z" />
        <path className="ks-gloss" d="M74 140 Q78 110 96 92" />
        <circle className="ks-white" cx="124" cy="126" r="25" />
        <g className="ks-look" style={{ animationDelay: '-3s' }}>
            <circle className="ks-eye ks-blink" cx="127" cy="129" r="11" />
            <circle className="ks-white ks-ns" cx="123" cy="124" r="3.2" />
        </g>
        <path className="ks-mouthfill" d="M100 166 Q124 192 148 166 Q124 174 100 166 Z" />
        <ellipse className="ks-red ks-ns" cx="124" cy="178" rx="9" ry="4" />
        <ellipse className="ks-cheek" cx="90" cy="160" rx="9" ry="5.5" />
        <ellipse className="ks-cheek" cx="158" cy="160" rx="9" ry="5.5" />
    </g>
);

export default function Monsters() {
    return (
        <>
            <Far side="l">
                <path className="ks-far1 ks-ns" d="M0 60 Q50 30 110 50 Q170 70 230 44 Q300 20 360 60 Q420 96 480 116 V120 H0 Z" />
                <path className="ks-line" d="M0 60 Q50 30 110 50 Q170 70 230 44 Q300 20 360 60 Q420 96 480 116" />
                <Mushroom x={110} y={34} s={0.8} />
                <Mushroom x={290} y={26} s={1} />
                <path className="ks-far2 ks-ns" d="M0 96 Q100 76 200 92 Q320 110 480 118 V120 H0 Z" />
                <path className="ks-line" d="M0 96 Q100 76 200 92 Q320 110 480 118" />
            </Far>
            <Far side="r">
                <path className="ks-far1 ks-ns" d="M0 116 Q90 96 160 70 Q230 40 300 60 Q380 84 480 44 V120 H0 Z" />
                <path className="ks-line" d="M0 116 Q90 96 160 70 Q230 40 300 60 Q380 84 480 44" />
                <Mushroom x={230} y={30} s={0.9} />
                <Mushroom x={420} y={46} s={0.7} />
                <path className="ks-far2 ks-ns" d="M0 118 Q120 100 240 104 Q360 108 480 90 V120 H0 Z" />
                <path className="ks-line" d="M0 118 Q120 100 240 104 Q360 108 480 90" />
            </Far>
            <Ground back />
            <Ground />
            <Cloud top="12%" w="clamp(90px, 10vw, 180px)" dur={120} delay={-40} />
            <Cloud top="40%" w="clamp(70px, 7vw, 130px)" dur={150} delay={-110} />
            <Trav vb="-36 -30 72 56" w="clamp(44px, 4vw, 80px)" top="20%" dur={34} delay={-6}>
                <g className="ks-bob"><Flyer cls="ks-teal" /></g>
            </Trav>
            <Trav vb="-36 -30 72 56" w="clamp(38px, 3.4vw, 66px)" top="50%" dur={44} delay={-26} rev>
                <g className="ks-bob"><Flyer cls="ks-pink" /></g>
            </Trav>
            <Air side="r">
                <circle className="ks-sun" cx="112" cy="38" r="24" />
                <path className="ks-gloss" d="M98 30 Q102 21 110 19" />
            </Air>
            <Corner side="l">
                <Teal />
                <Hill d="M-4 244 V184 Q60 150 132 180 Q200 206 244 236 V244 Z" top="M-4 184 Q60 150 132 180 Q200 206 244 236" />
            </Corner>
            <Corner side="r">
                <Pink />
                <Hill d="M-4 236 Q40 170 120 176 Q200 186 244 176 V244 H-4 Z" top="M-4 236 Q40 170 120 176 Q200 186 244 176" />
            </Corner>
            <Weather kind="bubbles" />
        </>
    );
}
