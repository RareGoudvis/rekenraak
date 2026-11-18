import type { ReactNode } from 'react';
import type { FransCardId } from './fransCards';
import type { WoordCardId } from './woordCards';
import './frans.css';

// The Frans cards' pictures (owner 2026-11-18: a drawn French touch, never a maths screenshot): flat fills with the
// ink outline, as the game thumbnails. One scene per card, each with a little speech bubble in French.

// Its width follows the text: Nunito 900 at 26 px is about 15 px a letter.
const Bubble = ({ x, y, text }: { x: number; y: number; text: string }) => {
    const w = text.length * 15 + 30;
    return (
    <g className="fr-bubble">
        <path d={`M${x + 22} ${y + 50} l-8 22 l28 -22 z`} />
        <rect x={x} y={y} width={w} height={54} rx={18} />
        {/* Hides the outline where the tail joins the bubble. */}
        <rect className="fr-bubble-join" x={x + 20} y={y + 46} width={24} height={6} />
        <text x={x + w / 2} y={y + 36}>{text}</text>
    </g>
    );
};

const Sky = () => (
    <>
        <rect className="fr-sky" x="0" y="0" width="480" height="300" />
        <path className="fr-cloud" d="M48 74 a22 22 0 0 1 40 -12 a18 18 0 0 1 30 14 a14 14 0 0 1 -4 28 h-62 a16 16 0 0 1 -4 -30 z" />
        <rect className="fr-ground" x="-4" y="250" width="488" height="54" />
    </>
);

// avoir & être: the Eiffel tower with a flag.
const EIFFEL = (
    <>
        <Sky />
        <path className="fr-steel" d="M240 30 l10 40 h-20 z M228 70 h24 l14 70 h-52 z M212 140 h56 l30 112 h-36 q-22 -52 -44 0 h-36 z" />
        <path className="fr-steel-dark" d="M222 160 h36 M216 182 h48 M232 92 h16 M236 110 h8" />
        <rect className="fr-steel" x="204" y="136" width="72" height="10" rx="3" />
        <rect className="fr-steel" x="222" y="66" width="36" height="8" rx="3" />
        <path className="fr-pole" d="M240 30 v-18" />
        <path className="fr-flag-blue" d="M240 12 h12 v14 h-12 z" />
        <path className="fr-flag-white" d="M252 12 h12 v14 h-12 z" />
        <path className="fr-flag-red" d="M264 12 h12 v14 h-12 z" />
        <Bubble x={300} y={60} text="Bonjour !" />
    </>
);

// Onregelmatig: a beret with its little stalk.
const BERET = (
    <>
        <Sky />
        <ellipse className="fr-shadow" cx="230" cy="250" rx="130" ry="14" />
        <path className="fr-beret" d="M100 186 q0 -86 130 -92 q140 4 140 84 q0 26 -40 30 h-190 q-40 -2 -40 -22 z" />
        <path className="fr-beret-band" d="M118 206 q112 22 224 0 v18 q-112 22 -224 0 z" />
        <path className="fr-beret-stalk" d="M228 96 q4 -22 16 -26" />
        <Bubble x={286} y={34} text="Oh là là !" />
    </>
);

// -er: a croissant on a plate: a fat middle and two smaller rolls each side, curling down.
const CROISSANT = (
    <>
        <Sky />
        <ellipse className="fr-plate" cx="228" cy="228" rx="170" ry="32" />
        <ellipse className="fr-plate-in" cx="228" cy="224" rx="126" ry="20" />
        <ellipse className="fr-crust" cx="102" cy="208" rx="18" ry="24" transform="rotate(-62 102 208)" />
        <ellipse className="fr-crust" cx="354" cy="208" rx="18" ry="24" transform="rotate(62 354 208)" />
        <ellipse className="fr-crust" cx="132" cy="182" rx="28" ry="36" transform="rotate(-48 132 182)" />
        <ellipse className="fr-crust" cx="324" cy="182" rx="28" ry="36" transform="rotate(48 324 182)" />
        <ellipse className="fr-crust" cx="176" cy="160" rx="38" ry="48" transform="rotate(-24 176 160)" />
        <ellipse className="fr-crust" cx="280" cy="160" rx="38" ry="48" transform="rotate(24 280 160)" />
        <ellipse className="fr-crust" cx="228" cy="150" rx="46" ry="58" />
        <path className="fr-crust-line" d="M206 112 q22 -10 44 0 M200 150 q28 -12 56 0 M206 186 q22 -10 44 0" />
        <Bubble x={334} y={36} text="Miam !" />
    </>
);

// -ir en -re: a baguette and a wedge of cheese.
const BAGUETTE = (
    <>
        <Sky />
        <ellipse className="fr-shadow" cx="240" cy="250" rx="170" ry="12" />
        <path className="fr-cheese" d="M290 244 v-64 l120 -30 v94 z" />
        <path className="fr-cheese-top" d="M290 180 l120 -30 l-40 -14 z" />
        <circle className="fr-hole" cx="330" cy="210" r="9" />
        <circle className="fr-hole" cx="372" cy="196" r="6" />
        <circle className="fr-hole" cx="360" cy="228" r="7" />
        <path className="fr-crust" d="M60 220 q-14 -14 4 -28 l190 -102 q22 -10 30 8 q6 14 -10 26 l-190 102 q-14 6 -24 -6 z" />
        <path className="fr-crust-line" d="M112 182 l20 10 M150 160 l20 10 M188 138 l20 10 M226 116 l20 10" />
        <Bubble x={200} y={18} text="Bon appétit !" />
    </>
);

// Alles door elkaar: the flag with a beret on its pole and a croissant beside it.
const FLAG = (
    <>
        <Sky />
        <path className="fr-pole" d="M150 250 v-196" />
        <path className="fr-flag-blue" d="M150 60 q40 -12 80 0 v96 q-40 -12 -80 0 z" />
        <path className="fr-flag-white" d="M230 60 q40 12 80 0 v96 q-40 12 -80 0 z" />
        <path className="fr-flag-red" d="M310 60 q40 -12 80 0 v96 q-40 -12 -80 0 z" />
        <path className="fr-beret" d="M120 54 q0 -26 30 -28 q32 2 32 26 q0 8 -10 8 h-44 q-8 0 -8 -6 z" />
        <path className="fr-beret-stalk" d="M150 26 q2 -8 8 -10" />
        <ellipse className="fr-crust" cx="318" cy="228" rx="12" ry="16" transform="rotate(-50 318 228)" />
        <ellipse className="fr-crust" cx="390" cy="228" rx="12" ry="16" transform="rotate(50 390 228)" />
        <ellipse className="fr-crust" cx="336" cy="214" rx="18" ry="24" transform="rotate(-24 336 214)" />
        <ellipse className="fr-crust" cx="372" cy="214" rx="18" ry="24" transform="rotate(24 372 214)" />
        <ellipse className="fr-crust" cx="354" cy="208" rx="22" ry="28" />
        <Bubble x={36} y={150} text="Oui !" />
    </>
);

// A tear-off calendar page: two rings, a red head with the French word, a big date, an optional foot line.
const CalendarPage = ({ x, y, head, day, foot }: { x: number; y: number; head: string; day: string; foot?: string }) => (
    <g className="fr-cal">
        <rect className="fr-cal-back" x={x + 10} y={y + 10} width="180" height="210" rx="14" transform={`rotate(4 ${x + 100} ${y + 115})`} />
        <rect className="fr-cal-page" x={x} y={y} width="180" height="210" rx="14" />
        <path className="fr-cal-head" d={`M${x} ${y + 62} v-48 q0 -14 14 -14 h152 q14 0 14 14 v48 z`} />
        <rect className="fr-cal-ring" x={x + 40} y={y - 14} width="12" height="28" rx="6" />
        <rect className="fr-cal-ring" x={x + 128} y={y - 14} width="12" height="28" rx="6" />
        <text className="fr-cal-head-text" x={x + 90} y={y + 44}>{head}</text>
        <text className="fr-cal-day" x={x + 90} y={y + (foot ? 152 : 168)}>{day}</text>
        {foot && <text className="fr-cal-foot" x={x + 90} y={y + 192}>{foot}</text>}
    </g>
);

const Sun = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
    <g>
        <path className="fr-sun-ray" d={[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
            const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
            return `M${cx + c * (r + 8)} ${cy + s * (r + 8)} L${cx + c * (r + 22)} ${cy + s * (r + 22)}`;
        }).join(' ')} />
        <circle className="fr-sun" cx={cx} cy={cy} r={r} />
    </g>
);

const Snowflake = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
    <g>
        <circle className="fr-snow-disc" cx={cx} cy={cy} r={r + 14} />
        <path className="fr-snow" d={[0, 60, 120].map(a => {
            const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
            return `M${cx - c * r} ${cy - s * r} L${cx + c * r} ${cy + s * r}`;
        }).join(' ')} />
        <path className="fr-snow" d={[0, 60, 120, 180, 240, 300].map(a => {
            const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
            const tx = cx + c * r * 0.6, ty = cy + s * r * 0.6;
            const l = (d: number) => { const k = ((a + d) * Math.PI) / 180; return `${tx + Math.cos(k) * r * 0.32} ${ty + Math.sin(k) * r * 0.32}`; };
            return `M${l(150)} L${tx} ${ty} L${l(-150)}`;
        }).join(' ')} />
    </g>
);

// Dagen: a French calendar page, lundi the 3rd.
const DAGEN = (
    <>
        <Sky />
        <ellipse className="fr-shadow" cx="240" cy="262" rx="120" ry="10" />
        <CalendarPage x={150} y={40} head="lundi" day="3" />
        <Sun cx={402} cy={70} r={24} />
    </>
);

// Maanden: the year as a cycle, the summer sun of juillet and the snow of janvier, an arrow each way.
const MAANDEN = (
    <>
        <Sky />
        <path className="fr-cycle" d="M170 78 Q240 18 310 78 M310 190 Q240 250 170 190" />
        {/* Arrow heads along each arc's end tangent. */}
        <path className="fr-cycle-head" d="M316 84 L296.4 79.1 L308.2 65.5 z M164 184 L183.6 188.9 L171.8 202.5 z" />
        <Sun cx={130} cy={118} r={36} />
        <Snowflake cx={350} cy={118} r={30} />
        <g className="fr-tag"><rect x="80" y="178" width="100" height="40" rx="14" /><text x="130" y="206">juillet</text></g>
        <g className="fr-tag"><rect x="296" y="178" width="108" height="40" rx="14" /><text x="350" y="206">janvier</text></g>
    </>
);

// Dagen en maanden: a full date page, dimanche 14 juillet (le quatorze juillet), with the flag beside it.
const DAGEN_MAANDEN = (
    <>
        <Sky />
        <ellipse className="fr-shadow" cx="200" cy="262" rx="120" ry="10" />
        <CalendarPage x={110} y={40} head="juillet" day="14" foot="dimanche" />
        <path className="fr-pole" d="M336 250 v-170" />
        <path className="fr-flag-blue" d="M336 86 q17 -6 34 0 v54 q-17 -6 -34 0 z" />
        <path className="fr-flag-white" d="M370 86 q17 6 34 0 v54 q-17 6 -34 0 z" />
        <path className="fr-flag-red" d="M404 86 q17 -6 34 0 v54 q-17 -6 -34 0 z" />
    </>
);

// A die face with its pips (value 1 to 6) at (x, y), size s.
const PIPS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]],
};
const Die = ({ x, y, s, value, tilt }: { x: number; y: number; s: number; value: 5 | 6; tilt: number }) => (
    <g transform={`rotate(${tilt} ${x + s / 2} ${y + s / 2})`}>
        <rect className="fr-die" x={x} y={y} width={s} height={s} rx={s * 0.18} />
        {PIPS[value].map(([px, py], i) => <circle key={i} className="fr-pip" cx={x + px * s} cy={y + py * s} r={s * 0.08} />)}
    </g>
);

// Getallen tot 20: two dice, five and six: onze!
const DICE = (
    <>
        <Sky />
        <ellipse className="fr-shadow" cx="220" cy="256" rx="130" ry="10" />
        <Die x={110} y={130} s={110} value={5} tilt={-10} />
        <Die x={236} y={140} s={104} value={6} tilt={8} />
        <Bubble x={300} y={42} text="onze !" />
    </>
);

// Tientallen: a rekenrek, five rods of ten beads (five red, five white): cinquante.
const REKENREK = (
    <>
        <Sky />
        <rect className="fr-wood" x="96" y="56" width="22" height="200" rx="6" />
        <rect className="fr-wood" x="340" y="56" width="22" height="200" rx="6" />
        {[0, 1, 2, 3, 4].map(r => (
            <g key={r}>
                <path className="fr-rod" d={`M118 ${88 + r * 36} H340`} />
                {Array.from({ length: 10 }, (_, b) => <circle key={b} className={b < 5 ? 'fr-bead-red' : 'fr-bead-white'} cx={136 + b * 20} cy={88 + r * 36} r={11} />)}
            </g>
        ))}
        <Bubble x={292} y={10} text="cinquante !" />
    </>
);

// Getallen tot 100: a school board with 72 in both forms, France and Belgium.
const BOARD = (
    <>
        <Sky />
        <rect className="fr-wood" x="66" y="34" width="348" height="216" rx="14" />
        <rect className="fr-chalkboard" x="80" y="48" width="320" height="188" rx="8" />
        <text className="fr-chalk is-big" x="240" y="118">72</text>
        <text className="fr-chalk" x="240" y="166">soixante-douze</text>
        <text className="fr-chalk is-small" x="240" y="204">septante-deux</text>
        <rect className="fr-chalk-stick" x="300" y="222" width="34" height="9" rx="3" />
    </>
);

export type FransPictureId = FransCardId | WoordCardId;

const SCENES: Readonly<Record<FransPictureId, ReactNode>> = {
    'avoir-etre': EIFFEL,
    onregelmatig: BERET,
    er: CROISSANT,
    'ir-re': BAGUETTE,
    alles: FLAG,
    dagen: DAGEN,
    maanden: MAANDEN,
    'dagen-maanden': DAGEN_MAANDEN,
    'getallen-20': DICE,
    tientallen: REKENREK,
    'getallen-100': BOARD,
};

/** A Frans card's picture, as wide as a game thumbnail (480 × 300). */
export function FransPicture({ card }: { card: FransPictureId }) {
    return <svg className="fr-art" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" aria-hidden>{SCENES[card]}</svg>;
}

/** The Frans badge on the Keuze screen: a small beret. */
export const FransBadge = () => (
    <svg className="fr-art fr-badge" viewBox="0 0 24 24" aria-hidden>
        <path className="fr-beret" d="M3 15 q0 -8 9 -8.5 q9.5 .5 9.5 8 q0 2 -3 2.2 h-12.5 q-3 0 -3 -1.7 z" />
        <path className="fr-beret-stalk" d="M12 6.5 q.4 -2.4 2 -3" />
    </svg>
);
