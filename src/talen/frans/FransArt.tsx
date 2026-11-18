import type { ReactNode } from 'react';
import type { FransTopic } from './fransZelf';
import './frans.css';

// The Frans cards' pictures (owner 2026-11-18: a drawn French touch, never a maths screenshot): flat fills with the
// ink outline, as the game thumbnails. One scene per card.

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

// Werkwoorden: the Eiffel tower with a flag.
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

// Getallen: a school board with 72 in both forms, France and Belgium.
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

const SCENES: Readonly<Record<FransTopic, ReactNode>> = {
    werkwoorden: EIFFEL,
    woorden: DAGEN_MAANDEN,
    getallen: BOARD,
};

/** A Frans card's picture, as wide as a game thumbnail (480 × 300). */
export function FransPicture({ card }: { card: FransTopic }) {
    return <svg className="fr-art" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" aria-hidden>{SCENES[card]}</svg>;
}

/** The Frans badge on the Keuze screen: a small beret. */
export const FransBadge = () => (
    <svg className="fr-art fr-badge" viewBox="0 0 24 24" aria-hidden>
        <path className="fr-beret" d="M3 15 q0 -8 9 -8.5 q9.5 .5 9.5 8 q0 2 -3 2.2 h-12.5 q-3 0 -3 -1.7 z" />
        <path className="fr-beret-stalk" d="M12 6.5 q.4 -2.4 2 -3" />
    </svg>
);
