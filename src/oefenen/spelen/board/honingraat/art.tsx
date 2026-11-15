import type { CSSProperties } from 'react';

// Honingraat's drawings: the bees, the wasp, a flower head, the branch, the skep and the hills. Flat fills
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
