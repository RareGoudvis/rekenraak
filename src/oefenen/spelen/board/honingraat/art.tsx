import type { CSSProperties } from 'react';

// Honingraat's drawings: the bees, the wasp, the Wespenkoningin and her honey pots, a flower head, the branch, the
// skep and the hills. Flat fills
// under the --spel-ink outline (honingraat.css colours them); decoration only, never a number.

export type BeeMood = 'busy' | 'happy' | 'worried';

/** A bee facing right (80 × 64); the caller mirrors it to face left. */
export function Bee({ mood = 'busy', pollen = false }: { mood?: BeeMood; pollen?: boolean }) {
    return (
        <svg className="hx-bee-art" viewBox="0 0 80 64" aria-hidden>
            <g transform="rotate(-24 34 14)"><ellipse className="hx-wing" cx="34" cy="14" rx="13" ry="17" /></g>
            <g transform="rotate(20 48 14)"><ellipse className="hx-wing is-front" cx="48" cy="14" rx="13" ry="17" /></g>
            <ellipse className="hx-bee-body" cx="40" cy="40" rx="26" ry="19" />
            <path className="hx-bee-stripe" d="M30 23 Q26 40 30 57 M44 22 Q40 40 44 58" />
            <path className="hx-bee-sting" d="M14 40 L5 37 L14 45 Z" />
            {mood === 'happy'
                ? <path className="hx-bee-line" d="M52 35 Q56 30 60 35" />
                : <circle className="hx-bee-eye" cx="56" cy="35" r="3.6" />}
            {mood === 'worried'
                ? <ellipse className="hx-bee-eye" cx="59" cy="47" rx="2.6" ry="3.4" />
                : <path className="hx-bee-line" d={mood === 'happy' ? 'M52 44 Q58 52 64 43' : 'M54 45 Q59 49 63 44'} />}
            <path className="hx-bee-line" d="M60 24 Q64 12 70 10 M64 27 Q72 18 77 18" />
            {pollen && <><circle className="hx-pollen" cx="32" cy="59" r="4.5" /><circle className="hx-pollen" cx="47" cy="60" r="4" /></>}
        </svg>
    );
}

export type WaspMood = 'cheeky' | 'grin' | 'dizzy';

/** The wasp facing right (110 × 70): long and pointy, thin wings, cheeky brows; silly, never scary. */
export function Wasp({ mood = 'cheeky' }: { mood?: WaspMood }) {
    return (
        <svg className="hx-wasp-art" viewBox="0 0 110 70" aria-hidden>
            <g transform="rotate(-30 52 18)"><ellipse className="hx-wasp-wing" cx="52" cy="18" rx="9" ry="20" /></g>
            <g transform="rotate(14 64 18)"><ellipse className="hx-wasp-wing" cx="64" cy="18" rx="8" ry="18" /></g>
            {/* The abdomen: an egg narrowing to the sting. */}
            <path className="hx-wasp-body" d="M8 44 C10 30 26 26 42 30 C52 33 56 38 56 44 C56 50 52 55 42 58 C26 62 10 58 8 44 Z" />
            <path className="hx-wasp-stripe" d="M22 30 Q18 44 22 59 M34 28 Q30 44 34 60 M45 31 Q42 44 45 57" />
            <path className="hx-wasp-sting" d="M9 41 L1 44 L9 47 Z" />
            <ellipse className="hx-wasp-body" cx="66" cy="42" rx="11" ry="10" />
            <circle className="hx-wasp-body" cx="88" cy="38" r="14" />
            {mood === 'dizzy' ? (
                <path className="hx-wasp-line" d="M86 30 L92 36 M92 30 L86 36 M96 30 L102 36 M102 30 L96 36" />
            ) : (
                <>
                    <circle className="hx-wasp-eye" cx="90" cy="34" r="3.4" />
                    <circle className="hx-wasp-eye" cx="99" cy="34" r="3" />
                    <path className="hx-wasp-line" d="M84 26 L94 29 M96 28 L104 25" />
                </>
            )}
            <path className="hx-wasp-line" d={mood === 'grin' ? 'M86 43 Q94 52 102 42' : mood === 'dizzy' ? 'M88 46 Q93 43 98 46' : 'M88 45 Q95 49 101 43'} />
            <path className="hx-wasp-line" d="M92 25 Q94 12 102 8 M98 27 Q106 16 109 16" />
            <path className="hx-wasp-line" d="M60 51 L56 62 M68 52 L68 63 M74 50 L80 60" />
        </svg>
    );
}

// Petal colours, in turn per flower (honingraat.css --hx-petal-N).
export const PETALS = 5;

/** A flower head (100 × 100): a ring of short petals round a big cream heart, room for a sum of two lines and its answer. */
export function FlowerHead({ tone }: { tone: number }) {
    return (
        <svg className="hx-head" viewBox="0 0 100 100" style={{ '--petal': `var(--hx-petal-${tone % PETALS})` } as CSSProperties} aria-hidden>
            <g className="hx-petals">
                {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(a => (
                    <ellipse key={a} className="hx-petal" cx="50" cy="14" rx="12" ry="14" transform={`rotate(${a} 50 50)`} />
                ))}
            </g>
            <circle className="hx-heart" cx="50" cy="50" r="39" />
        </svg>
    );
}

/** A flower's stem (50 × 100), from the heart down: a leaf on one side, a tuft of grass where it meets the bed. */
export function FlowerStem({ flip }: { flip: boolean }) {
    return (
        <svg className="hx-stem-art" viewBox="0 0 50 100" aria-hidden>
            <g transform={flip ? 'translate(50 0) scale(-1 1)' : undefined}>
                <path className="hx-stem-rim" d="M25 0 C27 34 22 62 25 92" />
                <path className="hx-stem" d="M25 0 C27 34 22 62 25 92" />
                <path className="hx-stem-leaf" d="M25 62 C30 50 42 46 49 52 C42 62 32 64 25 62 Z" />
                <path className="hx-stem-tuft" d="M12 98 L17 84 L21 96 L25 80 L29 96 L33 84 L38 98 Z" />
            </g>
        </svg>
    );
}

/** The branch the comb hangs from: bark from off the left edge, a few leaves, a twig at the end (1400 × 120). */
export function Branch() {
    return (
        <svg className="hx-branch" viewBox="0 0 1400 120" preserveAspectRatio="xMaxYMid slice" aria-hidden>
            <path className="hx-bark" d="M-20 52 C300 40 700 70 1000 56 C1180 48 1300 40 1384 30 C1392 29 1396 38 1388 42 C1300 58 1180 72 1000 80 C700 94 300 74 -20 84 Z" />
            <path className="hx-bark-line" d="M120 66 C260 60 380 70 470 68 M760 76 C860 74 930 72 980 68 M1120 62 C1200 56 1260 52 1300 48" />
            <path className="hx-bark" d="M1180 60 C1220 30 1250 18 1290 10 C1296 9 1298 16 1292 18 C1256 28 1230 44 1204 66 Z" />
            {[[1300, 12, -30], [1388, 34, 20], [1240, 26, -60], [980, 58, 160], [640, 70, 200], [300, 60, -20], [1120, 80, 150]].map(([x, y, a], i) => (
                <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
                    <path className="hx-leaf" d="M0 0 C14 -16 40 -18 54 0 C40 18 14 16 0 0 Z" />
                    <path className="hx-leaf-vein" d="M4 0 L46 0" />
                </g>
            ))}
        </svg>
    );
}

/** A straw skep on a little stand (120 × 130), the bees' home in the garden. */
export function Skep() {
    return (
        <svg className="hx-skep" viewBox="0 0 120 130" aria-hidden>
            <rect className="hx-stand" x="24" y="104" width="72" height="12" rx="4" />
            <path className="hx-stand" d="M34 114 L30 130 M86 114 L90 130" />
            <path className="hx-straw" d="M18 106 C14 60 30 14 60 12 C90 14 106 60 102 106 Z" />
            <path className="hx-straw-line" d="M22 88 Q60 96 98 88 M22 70 Q60 78 98 70 M28 52 Q60 60 92 52 M38 34 Q60 41 82 34" />
            <path className="hx-door" d="M48 106 L48 96 Q60 84 72 96 L72 106 Z" />
        </svg>
    );
}

// Copies side by side, so a pan of one copy's width loops; enough to cover a wide stage at the strip's height.
export const HILL_COPIES = 4;
export const FRONT_COPIES = 6;

// Each ridge starts and ends at the same height, so a copy joins the next.
const FAR_RIDGE = 'M-1 56 C60 30 120 34 170 52 C220 70 270 30 330 34 C370 37 390 50 401 56';
const NEAR_RIDGE = 'M-1 78 C50 58 110 62 150 74 C200 88 250 60 310 62 C350 64 380 72 401 78';

/** Two rows of soft hills (400 × 100 per copy); the strip keeps its aspect, honingraat.css sets its height. */
export function Hills() {
    const copy = (dx: number) => (
        <g transform={`translate(${dx} 0)`} key={dx}>
            {/* Fill and outline apart: only the ridge is outlined, so the copies meet without a seam. */}
            {[[FAR_RIDGE, ' is-far'], [NEAR_RIDGE, '']].map(([ridge, cls]) => (
                <g key={ridge} className={`hx-hill${cls}`}>
                    <path className="hx-hill-fill" d={`${ridge} L401 100 L-1 100 Z`} />
                    <path className="hx-hill-line" d={ridge} />
                </g>
            ))}
            <g className="hx-tree"><path d="M96 66 L96 56" /><circle cx="96" cy="50" r="8" /></g>
            <g className="hx-tree"><path d="M282 64 L282 52" /><circle cx="282" cy="45" r="10" /></g>
        </g>
    );
    return <svg className="hx-hills" viewBox={`0 0 ${400 * HILL_COPIES} 100`} aria-hidden>{Array.from({ length: HILL_COPIES }, (_, i) => copy(i * 400))}</svg>;
}

// Little flowers and tufts along the front edge (drawn twice, as the hills): x, height, tone.
const FRONT: readonly [number, number, number][] = [[24, 22, 0], [70, 16, 2], [118, 26, 1], [170, 18, 3], [226, 24, 4], [276, 15, 0], [330, 22, 2], [374, 18, 1]];

/** The meadow's front edge: grass tufts and small flowers, a strip that pans faster than the hills. */
export function FrontFlowers() {
    const copy = (dx: number) => (
        <g transform={`translate(${dx} 0)`} key={dx}>
            {FRONT.map(([x, h, tone], i) => (
                <g key={i} style={{ '--petal': `var(--hx-petal-${tone})` } as CSSProperties}>
                    <path className="hx-tuft" d={`M${x - 10} 60 Q${x - 6} ${46 - h / 3} ${x - 2} 60 Q${x + 2} ${44 - h / 2} ${x + 6} 60 Q${x + 10} ${48 - h / 3} ${x + 12} 60`} />
                    <path className="hx-stem-line" d={`M${x + 18} 60 L${x + 18} ${60 - h}`} />
                    <circle className="hx-front-petal" cx={x + 18} cy={60 - h} r="6" />
                    <circle className="hx-front-heart" cx={x + 18} cy={60 - h} r="2.4" />
                </g>
            ))}
        </g>
    );
    return <svg className="hx-front" viewBox={`0 0 ${400 * FRONT_COPIES} 60`} aria-hidden>{Array.from({ length: FRONT_COPIES }, (_, i) => copy(i * 400))}</svg>;
}

export type QueenMood = 'cheeky' | 'ouch' | 'grin' | 'sore';

/** The Wespenkoningin facing right (170 × 130): a round, silly queen wasp with lashes, a blush and a little crown. */
export function Queen({ mood = 'cheeky' }: { mood?: QueenMood }) {
    return (
        <svg className="hx-q-art" viewBox="0 0 170 130" aria-hidden>
            <g transform="rotate(-28 84 40)"><ellipse className="hx-wasp-wing" cx="84" cy="40" rx="14" ry="30" /></g>
            <g transform="rotate(12 102 40)"><ellipse className="hx-wasp-wing" cx="102" cy="40" rx="12" ry="27" /></g>
            {/* The abdomen: a big round egg narrowing to a small sting. */}
            <path className="hx-wasp-body" d="M12 80 C14 56 42 48 64 54 C80 58 88 68 88 80 C88 92 80 102 64 106 C42 112 14 104 12 80 Z" />
            <path className="hx-wasp-stripe" d="M32 56 Q25 80 32 106 M50 52 Q43 80 50 109 M68 57 Q62 80 68 103" />
            <path className="hx-wasp-sting" d="M13 76 L2 80 L13 84 Z" />
            {mood === 'sore' && (
                <>
                    {/* A sore bottom: a rosy glow and a sticking plaster. */}
                    <ellipse className="hx-q-sore" cx="26" cy="88" rx="14" ry="11" />
                    <g transform="rotate(-30 26 88)">
                        <rect className="hx-q-plaster" x="12" y="82" width="28" height="12" rx="6" />
                        <path className="hx-wasp-line" d="M22 85 L22 91 M30 85 L30 91" />
                    </g>
                </>
            )}
            <path className="hx-wasp-line" d="M96 88 L88 108 M106 90 L106 112 M114 88 L122 106" />
            <ellipse className="hx-wasp-body" cx="102" cy="76" rx="16" ry="15" />
            {/* A frilly royal collar between body and head. */}
            <path className="hx-q-collar" d="M112 62 L118 70 L114 76 L121 82 L116 88 L124 92 L128 84 L132 92 L136 82 L128 62 Z" />
            <circle className="hx-wasp-body" cx="134" cy="66" r="24" />
            <circle className="hx-q-blush" cx="128" cy="76" r="5.5" />
            {mood === 'ouch' ? (
                <path className="hx-wasp-line" d="M131 56 L139 60 L131 64 M157 56 L149 60 L157 64" />
            ) : mood === 'grin' ? (
                <path className="hx-wasp-line" d="M132 62 Q137 55 142 62 M147 62 Q152 55 157 62" />
            ) : mood === 'sore' ? (
                <path className="hx-wasp-line" d="M132 56 L140 64 M140 56 L132 64 M147 56 L155 64 M155 56 L147 64" />
            ) : (
                <>
                    <circle className="hx-wasp-eye" cx="138" cy="61" r="4.6" />
                    <circle className="hx-wasp-eye" cx="151" cy="61" r="4.2" />
                    {/* Long lashes and one raised brow: cheeky, never cross. */}
                    <path className="hx-q-lash" d="M134 56 L131 52 M138 55 L138 50 M148 55 L146 51 M152 55 L153 50" />
                    <path className="hx-wasp-line" d="M131 48 L141 50 M146 47 L156 43" />
                </>
            )}
            {mood === 'ouch' ? <ellipse className="hx-wasp-eye" cx="146" cy="78" rx="5" ry="6.5" />
                : mood === 'grin' ? <path className="hx-q-mouth" d="M132 73 Q145 90 158 71 Z" />
                    : mood === 'sore' ? <path className="hx-wasp-line" d="M134 80 Q138 76 142 80 Q146 84 150 80 Q154 76 157 79" />
                        : <path className="hx-wasp-line" d="M134 76 Q146 84 157 72" />}
            <path className="hx-wasp-line" d="M128 44 Q122 28 128 20 M146 44 Q152 30 162 28" />
            <circle className="hx-wasp-eye" cx="128" cy="20" r="3" />
            <circle className="hx-wasp-eye" cx="162" cy="28" r="3" />
            <g className="hx-q-crown"><CrownShape /></g>
        </svg>
    );
}

function CrownShape() {
    return (
        <>
            <path className="hx-q-gold" d="M118 47 L119 26 L127 36 L134 21 L141 36 L149 26 L150 47 Z" />
            <circle className="hx-q-gem" cx="134" cy="40" r="3.6" />
            <circle className="hx-q-gold" cx="119" cy="25" r="2.8" />
            <circle className="hx-q-gold" cx="134" cy="20" r="2.8" />
            <circle className="hx-q-gold" cx="149" cy="25" r="2.8" />
        </>
    );
}

/** The queen's crown on its own (the end screen: she lost it as she fled). */
export function Crown() {
    return <svg className="hx-crown-art" viewBox="114 16 40 34" aria-hidden><CrownShape /></svg>;
}

/** A honey pot with a cloth lid (60 × 60), on the queen's shelf or in her legs. */
export function HoneyPot() {
    return (
        <svg className="hx-pot-art" viewBox="0 0 60 60" aria-hidden>
            <path className="hx-pot-jar" d="M14 20 C5 28 5 48 13 56 L47 56 C55 48 55 28 46 20 Z" />
            <path className="hx-pot-shine" d="M16 32 C14 38 14 44 17 49" />
            <polygon className="hx-pot-label" transform="translate(21 30) scale(.18)" points="50,2 98,29.7 98,85.8 50,113.5 2,85.8 2,29.7" />
            <path className="hx-pot-lid" d="M10 12 C20 7 40 7 50 12 L48 22 C38 18 22 18 12 22 Z" />
            <path className="hx-pot-string" d="M12 20 C24 17 36 17 48 20" />
            <path className="hx-pot-drip" d="M40 21 C41 27 44 29 44 32 C44 35 40 35 40 32 Z" />
        </svg>
    );
}
