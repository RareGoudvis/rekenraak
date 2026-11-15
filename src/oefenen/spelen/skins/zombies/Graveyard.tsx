import type { CSSProperties } from 'react';

// The scene behind the zombies: a friendly night graveyard (sky, a big moon, stars, far hills, a dead tree,
// an iron fence, rounded tombstones, drifting fog and now and then a bat). Decoration only: no text, no numbers.
// CSS draws every colour and movement (zombies.css); reduced motion stills it all.

const STARS: readonly [number, number, number][] = [
    [8, 10, 1], [19, 26, 0.7], [31, 8, 0.9], [44, 20, 0.6], [56, 6, 1], [63, 30, 0.7], [72, 14, 0.8], [91, 34, 0.6], [38, 36, 0.5],
];

// Tombstones along the back row: left in % of the street, height in zombie widths, shape, tilt.
type Stone = { at: number; h: number; shape: 0 | 1 | 2; tilt: number };
const STONES: readonly Stone[] = [
    { at: 33, h: 0.42, shape: 0, tilt: -4 },
    { at: 44, h: 0.3, shape: 2, tilt: 6 },
    { at: 57, h: 0.48, shape: 1, tilt: 0 },
    { at: 70, h: 0.34, shape: 0, tilt: 8 },
    { at: 81, h: 0.4, shape: 2, tilt: -3 },
];

const STONE_PATHS = [
    'M8 78 L8 32 Q8 6 30 6 Q52 6 52 32 L52 78 Z',
    'M8 78 L8 30 L17 30 Q17 10 30 10 Q43 10 43 30 L52 30 L52 78 Z',
    'M10 78 L10 44 Q10 22 30 22 Q50 22 50 44 L50 78 Z',
];
// A carved line or two and a crack: shapes only, never letters.
const STONE_MARKS = ['M20 36 Q30 30 40 36 M22 48 L38 48 M44 60 L39 66 L42 70', 'M22 40 L38 40 M24 52 L36 52 M14 64 L19 68', 'M20 50 Q30 44 40 50 M36 62 L40 68'];

function Tombstone({ shape }: { shape: Stone['shape'] }) {
    return (
        <svg className="zb-grave-art" viewBox="0 0 60 80" aria-hidden>
            <path className="zb-grave-stone" d={STONE_PATHS[shape]} />
            <path className="zb-grave-mark" d={STONE_MARKS[shape]} />
            <path className="zb-grave-moss" d="M4 79 Q8 70 12 78 Q15 68 19 78 M42 78 Q46 69 49 78 Q53 71 56 79" />
        </svg>
    );
}

// Branches drawn twice: a dark outline stroke, then the bark stroke on top (the same trick as the zombie arms).
const BRANCHES: readonly [string, number][] = [
    ['M104 300 C102 250 98 214 103 172', 30],
    ['M86 300 C96 290 100 280 101 266', 12],
    ['M124 300 C114 292 108 282 106 266', 12],
    ['M103 178 C88 152 70 138 44 130', 15],
    ['M68 138 C60 122 58 108 64 92', 8],
    ['M52 132 C42 124 34 122 22 124', 7],
    ['M104 182 C122 152 142 138 168 132', 13],
    ['M142 140 C150 120 162 112 176 112', 7],
    ['M160 134 C170 140 178 150 182 162', 6],
    ['M103 176 C106 142 97 112 104 78', 13],
    ['M102 112 C88 100 82 88 80 72', 7],
    ['M104 94 C116 84 122 72 120 56', 7],
];

function DeadTree() {
    return (
        <svg className="zb-tree" viewBox="0 0 200 300" aria-hidden>
            {BRANCHES.map(([d, w]) => <path key={`o${d}`} className="zb-tree-line" d={d} style={{ strokeWidth: w + 7 }} />)}
            {BRANCHES.map(([d, w]) => <path key={d} className="zb-tree-bark" d={d} style={{ strokeWidth: w }} />)}
            <ellipse className="zb-tree-hole" cx="103" cy="232" rx="6" ry="9" />
        </svg>
    );
}

function Bat() {
    return (
        <span className="zb-bat-fly" aria-hidden>
            <svg className="zb-bat" viewBox="0 0 64 34">
                <g className="zb-bat-wing is-left"><path d="M28 16 Q18 2 2 8 Q8 12 6 18 Q12 16 14 22 Q20 16 28 20 Z" /></g>
                <g className="zb-bat-wing is-right"><path d="M36 16 Q46 2 62 8 Q56 12 58 18 Q52 16 50 22 Q44 16 36 20 Z" /></g>
                <path className="zb-bat-body" d="M25 10 L27 3 L30 9 L34 9 L37 3 L39 10 Q42 18 32 26 Q22 18 25 10 Z" />
                <circle className="zb-bat-eye" cx="29" cy="14" r="2.6" />
                <circle className="zb-bat-eye" cx="35" cy="14" r="2.6" />
            </svg>
        </span>
    );
}

export default function Graveyard({ small = false }: { small?: boolean }) {
    return (
        <div className={`zb-yard${small ? ' is-small' : ''}`} aria-hidden>
            <span className="zb-halo" />
            <svg className="zb-moon" viewBox="0 0 100 100">
                <circle className="zb-moon-face" cx="50" cy="50" r="46" />
                <circle className="zb-moon-crater" cx="34" cy="38" r="9" />
                <circle className="zb-moon-crater" cx="62" cy="62" r="12" />
                <circle className="zb-moon-crater" cx="66" cy="30" r="5" />
            </svg>
            {STARS.map(([x, y, s], i) => (
                <svg key={i} className="zb-twinkle" viewBox="0 0 20 20" style={{ left: `${x}%`, top: `${y}%`, '--s': s, '--i': i } as CSSProperties}>
                    <path d="M10 0 Q11.5 8.5 20 10 Q11.5 11.5 10 20 Q8.5 11.5 0 10 Q8.5 8.5 10 0 Z" />
                </svg>
            ))}
            {!small && <Bat />}
            <svg className="zb-hills" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0 20 L0 11 Q14 3 30 9 Q46 15 61 7 Q79 -1 100 9 L100 20 Z" />
            </svg>
            <DeadTree />
            <svg className="zb-fence" viewBox="0 0 4000 60" preserveAspectRatio="xMinYMax slice">
                <defs>
                    <pattern id="zb-fence-bar" width="20" height="60" patternUnits="userSpaceOnUse">
                        <path d="M8 60 L8 12 L10 3 L12 12 L12 60 Z" />
                    </pattern>
                </defs>
                <rect x="0" y="0" width="4000" height="60" fill="url(#zb-fence-bar)" />
                <rect x="0" y="20" width="4000" height="4" />
                <rect x="0" y="46" width="4000" height="4" />
            </svg>
            {STONES.map((s, i) => (
                <span key={i} className="zb-grave" style={{ left: `${s.at}%`, '--h': s.h, '--tilt': `${s.tilt}deg` } as CSSProperties}>
                    <Tombstone shape={s.shape} />
                </span>
            ))}
            <span className="zb-fog is-back" />
        </div>
    );
}

// Low fog in front of the zombies' feet (drawn after them, under the signs).
export const FrontFog = () => <span className="zb-fog is-front" aria-hidden />;
