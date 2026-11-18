import type { ReactNode } from 'react';
import type { FransCardId } from './fransCards';
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

const SCENES: Readonly<Record<FransCardId, ReactNode>> = {
    'avoir-etre': EIFFEL,
    onregelmatig: BERET,
    er: CROISSANT,
    'ir-re': BAGUETTE,
    alles: FLAG,
};

/** A Frans card's picture, as wide as a game thumbnail (480 × 300). */
export function FransPicture({ card }: { card: FransCardId }) {
    return <svg className="fr-art" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" aria-hidden>{SCENES[card]}</svg>;
}

/** The Frans badge on the Keuze screen: a small beret. */
export const FransBadge = () => (
    <svg className="fr-art fr-badge" viewBox="0 0 24 24" aria-hidden>
        <path className="fr-beret" d="M3 15 q0 -8 9 -8.5 q9.5 .5 9.5 8 q0 2 -3 2.2 h-12.5 q-3 0 -3 -1.7 z" />
        <path className="fr-beret-stalk" d="M12 6.5 q.4 -2.4 2 -3" />
    </svg>
);
