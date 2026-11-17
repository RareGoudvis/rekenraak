import type { CSSProperties } from 'react';
import type { SkierPose } from './run';

// The Skislalom drawings: code-drawn SVG, flat fills under the thick --spel-ink outline (slalom.css colours them).
// Everything stands with its feet at (0, 0) and moves by CSS; Slalom.tsx only says where and how big.

// ── The skier, seen from behind ───────────────────────────────────────────────

function Skis() {
    return (
        <g className="sl-skis">
            {/* Seen from behind and above: the tails near us, the tips pointing down the slope, curling up. */}
            <path className="sl-ski" d="M-30 18 Q-30 12 -28 10 L-15 -44 Q-14 -54 -18 -56 Q-23 -54 -22 -44 L-31 -2 Q-34 10 -30 18 Z" />
            <path className="sl-ski" d="M30 18 Q30 12 28 10 L15 -44 Q14 -54 18 -56 Q23 -54 22 -44 L31 -2 Q34 10 30 18 Z" />
            <path className="sl-ski-stripe" d="M-29 12 L-26 0 M29 12 L26 0" />
        </g>
    );
}

function Poles({ up = false }: { up?: boolean }) {
    // Held low and trailing behind (a racer's tuck), or flung up in the air.
    return up
        ? <path className="sl-pole" d="M-34 -98 L-58 -150 M34 -98 L58 -150" />
        : <path className="sl-pole" d="M-34 -78 L-48 -4 M34 -78 L48 -4" />;
}

function Helmet() {
    return (
        <g className="sl-head">
            <circle className="sl-helmet" cx="0" cy="-136" r="19" />
            <path className="sl-helmet-stripe" d="M-6 -154 Q0 -156 6 -154 L5 -118 Q0 -117 -5 -118 Z" />
            {/* The goggles' strap round the back of the helmet. */}
            <path className="sl-strap" d="M-19 -134 Q0 -127 19 -134" />
        </g>
    );
}

/** The racer on his skis: the tuck deepens with --sl-crouch (slalom.css), the whole of him leans in a carve. */
export function Skier({ pose }: { pose: SkierPose }) {
    if (pose === 'sit') return <SkierSitting />;
    return (
        <svg className={`sl-skier-art is-${pose}`} viewBox="-70 -170 140 182" aria-hidden>
            <ellipse className="sl-shadow" cx="0" cy="10" rx="44" ry="10" />
            <Skis />
            <g className="sl-legs">
                <path className="sl-boot" d="M-28 -2 h16 v-16 q-8 -4 -16 0 Z M12 -2 h16 v-16 q-8 -4 -16 0 Z" />
                <path className="sl-pants" d="M-27 -16 Q-30 -40 -24 -64 L24 -64 Q30 -40 27 -16 L12 -16 Q10 -36 0 -44 Q-10 -36 -12 -16 Z" />
            </g>
            <g className="sl-upper">
                <path className="sl-jacket" d="M-30 -66 Q-34 -96 -24 -114 Q0 -124 24 -114 Q34 -96 30 -66 Q0 -58 -30 -66 Z" />
                {/* A race bib with a star (never a number: the thumbnails never show one). */}
                <path className="sl-bib" d="M-16 -108 L16 -108 L18 -72 L-18 -72 Z" />
                <path className="sl-bib-star" d="M0 -100 L3 -93 L10 -92 L5 -87 L6 -80 L0 -84 L-6 -80 L-5 -87 L-10 -92 L-3 -93 Z" />
                <path className="sl-arm-ink" d="M-26 -108 Q-40 -94 -34 -78 M26 -108 Q40 -94 34 -78" />
                <path className="sl-arm" d="M-26 -108 Q-40 -94 -34 -78 M26 -108 Q40 -94 34 -78" />
                <circle className="sl-glove" cx="-34" cy="-78" r="6" />
                <circle className="sl-glove" cx="34" cy="-78" r="6" />
                <Poles />
                <Helmet />
            </g>
        </svg>
    );
}

// After a tumble: sitting in the snow, a heap of snow on the helmet, dizzy stars going round.
function SkierSitting() {
    return (
        <svg className="sl-skier-art is-sit" viewBox="-70 -170 140 182" aria-hidden>
            <ellipse className="sl-mound" cx="0" cy="0" rx="60" ry="14" />
            <path className="sl-pants" d="M-36 -2 Q-40 -26 -26 -40 L26 -40 Q40 -26 36 -2 Q0 6 -36 -2 Z" />
            <path className="sl-jacket" d="M-28 -36 Q-32 -64 -22 -84 Q0 -94 22 -84 Q32 -64 28 -36 Q0 -28 -28 -36 Z" />
            <path className="sl-bib" d="M-14 -78 L14 -78 L16 -46 L-16 -46 Z" />
            {/* Arms out, a bit dazed. */}
            <path className="sl-arm-ink" d="M-22 -78 Q-44 -70 -52 -54 M22 -78 Q44 -70 52 -54" />
            <path className="sl-arm" d="M-22 -78 Q-44 -70 -52 -54 M22 -78 Q44 -70 52 -54" />
            <circle className="sl-glove" cx="-52" cy="-54" r="6" />
            <circle className="sl-glove" cx="52" cy="-54" r="6" />
            <g transform="translate(0 30)">
                <Helmet />
                <path className="sl-snowcap" d="M-16 -152 Q-14 -166 -2 -164 Q4 -174 12 -164 Q22 -162 18 -150 Q0 -146 -16 -152 Z" />
            </g>
            <g transform="translate(0 -142)">
                <g className="sl-dizzy">
                    {[0, 120, 240].map(a => <path key={a} className="sl-dizzy-star" transform={`rotate(${a}) translate(26 0)`} d="M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z" />)}
                </g>
            </g>
        </svg>
    );
}

/** One ski or pole flying off in the tumble, landing stuck in the snow (its arc is slalom.css .sl-fly-*). */
export function FlyingBit({ kind }: { kind: 'ski-l' | 'ski-r' | 'pole-l' | 'pole-r' }) {
    const ski = kind.startsWith('ski');
    return (
        <span className={`sl-fly is-${kind}`} aria-hidden>
            <svg viewBox={ski ? '-8 -70 16 76' : '-4 -80 8 84'}>
                {ski
                    ? <path className="sl-ski" d="M-5 4 L5 4 L4 -58 Q3 -68 0 -68 Q-3 -68 -4 -58 Z" />
                    : <><path className="sl-pole" d="M0 2 L0 -76" /><circle className="sl-glove" cx="0" cy="-74" r="3.5" /></>}
            </svg>
        </span>
    );
}

// ── Beside the piste ──────────────────────────────────────────────────────────

/** A snowy pine; v picks one of three shapes. */
export function Pine({ v }: { v: number }) {
    const shapes = [
        // Tall and slim.
        { tiers: [[-34, -12, -70], [-28, -52, -110], [-20, -92, -150]], trunk: 12 },
        // Wide and full.
        { tiers: [[-44, -12, -64], [-36, -46, -98], [-26, -80, -130]], trunk: 14 },
        // Small and heavy with snow.
        { tiers: [[-38, -10, -54], [-30, -40, -84], [-20, -68, -108]], trunk: 12 },
    ][v % 3];
    return (
        <svg className="sl-pine-art" viewBox="-50 -156 100 160" aria-hidden>
            <rect className="sl-trunk" x={-shapes.trunk / 2} y="-16" width={shapes.trunk} height="18" rx="3" />
            {shapes.tiers.map(([w, base, top], i) => (
                <g key={i}>
                    <path className="sl-needles" d={`M${w} ${base} Q0 ${base + 8} ${-w} ${base} L4 ${top + 4} Q0 ${top - 2} -4 ${top + 4} Z`} />
                    {/* Snow lying on each tier: a wavy cap. */}
                    <path className="sl-pine-snow" d={`M${w * 0.62} ${base - (base - top) * 0.36} Q${w * 0.3} ${base - (base - top) * 0.28} 0 ${base - (base - top) * 0.4} Q${-w * 0.3} ${base - (base - top) * 0.28} ${-w * 0.62} ${base - (base - top) * 0.36} L3 ${top + 6} Q0 ${top + 1} -3 ${top + 6} Z`} />
                </g>
            ))}
        </svg>
    );
}

const HAT = ['M-9 -6 Q0 -16 9 -6 Z', 'M-9 -6 Q-8 -14 0 -15 Q8 -14 9 -6 Z'];

/** Fans behind a net fence, waving; one has a flag. Colours come from the seed. */
export function Crowd({ seed }: { seed: number }) {
    const people = [-48, -18, 14, 44];
    return (
        <svg className="sl-crowd-art" viewBox="-70 -104 140 108" aria-hidden>
            {people.map((x, i) => {
                const tone = (seed + i * 2) % 6;
                const hat = (seed + i) % 6;
                const tall = (seed + i) % 2 ? 0 : 8;
                return (
                    <g key={i} className="sl-fan" style={{ '--i': i, '--tone': `var(--spel-fill-${tone})`, '--hat': `var(--spel-fill-${hat})` } as CSSProperties} transform={`translate(${x} ${-tall})`}>
                        {i === 1 && (
                            <g className="sl-fan-flag">
                                <path className="sl-flagstick" d="M14 -46 L14 -96" />
                                <path className="sl-fanflag" d="M14 -96 Q26 -100 38 -94 Q30 -86 38 -78 Q26 -82 14 -78 Z" />
                            </g>
                        )}
                        <path className="sl-fan-body" d="M-15 -14 Q-16 -44 0 -46 Q16 -44 15 -14 Z" />
                        <path className="sl-fan-scarf" d="M-9 -44 Q0 -40 9 -44 L9 -38 Q0 -34 -9 -38 Z M4 -38 L8 -24 L13 -26 L9 -39 Z" />
                        <path className="sl-fan-arm" d={i === 1 ? 'M10 -38 Q14 -44 14 -52' : 'M-12 -38 Q-22 -50 -20 -62 M12 -38 Q22 -50 20 -62'} />
                        <g transform="translate(0 -56)">
                            <circle className="sl-fan-face" r="10" />
                            <circle className="sl-fan-eye" cx="-3.5" cy="-1" r="1.5" />
                            <circle className="sl-fan-eye" cx="3.5" cy="-1" r="1.5" />
                            <path className="sl-fan-mouth" d="M-4 3 Q0 7 4 3 Z" />
                            <path className="sl-fan-hat" d={HAT[i % 2]} />
                            <circle className="sl-fan-pom" cy={i % 2 ? -16 : -15} r="3.5" />
                        </g>
                    </g>
                );
            })}
            {/* The net fence in front of them. */}
            <path className="sl-fence" d="M-68 -30 Q0 -36 68 -30 L68 0 Q0 -4 -68 0 Z" />
            <path className="sl-fence-net" d="M-56 -31 L-56 -1 M-36 -32 L-36 -2 M-16 -33 L-16 -2 M4 -33 L4 -2 M24 -33 L24 -2 M44 -32 L44 -2 M-66 -16 Q0 -21 66 -16" />
        </svg>
    );
}

/** The snowman beside the piste; laughing = eyes squeezed shut, mouth wide, shaking. */
export function Snowman({ laughing }: { laughing: boolean }) {
    return (
        <svg className={`sl-snowman-art${laughing ? ' is-laughing' : ''}`} viewBox="-50 -132 100 136" aria-hidden>
            <ellipse className="sl-mound" cx="0" cy="0" rx="44" ry="8" />
            <path className="sl-stickarm" d="M-22 -58 L-44 -76 L-48 -72 M-38 -71 L-42 -82 M22 -58 L44 -76 L48 -72 M38 -71 L42 -82" />
            <circle className="sl-ball" cx="0" cy="-24" r="26" />
            <circle className="sl-ball" cx="0" cy="-66" r="19" />
            <circle className="sl-coal" cx="0" cy="-64" r="2.5" />
            <circle className="sl-coal" cx="0" cy="-54" r="2.5" />
            <g className="sl-snowhead">
                <circle className="sl-ball" cx="0" cy="-98" r="15" />
                {laughing
                    ? <path className="sl-coal-line" d="M-9 -103 L-4 -100 L-9 -97 M9 -103 L4 -100 L9 -97" />
                    : <><circle className="sl-coal" cx="-5" cy="-102" r="2.4" /><circle className="sl-coal" cx="5" cy="-102" r="2.4" /></>}
                <path className="sl-carrot" d="M0 -97 L16 -94 L0 -92 Z" />
                {laughing
                    ? <path className="sl-snow-mouth" d="M-8 -90 Q0 -78 8 -90 Z" />
                    : <path className="sl-coal-line" d="M-6 -89 Q0 -85 6 -89" />}
                <path className="sl-snowscarf" d="M-15 -86 Q0 -80 15 -86 L15 -80 Q0 -74 -15 -80 Z M6 -80 L10 -64 L16 -66 L12 -81 Z" />
                <path className="sl-snowhat" d="M-14 -110 L14 -110 L12 -114 L10 -132 L-10 -132 L-12 -114 Z" />
                <path className="sl-snowhat-band" d="M-12 -116 L12 -116 L11.5 -121 L-11.5 -121 Z" />
            </g>
        </svg>
    );
}

/** A soft bump in the piste, for the feeling of speed. */
export function Ripple() {
    return (
        <svg className="sl-ripple-art" viewBox="-60 -14 120 16" aria-hidden>
            <path className="sl-ripple" d="M-56 0 Q-20 -12 0 -10 Q20 -12 56 0 Q20 -4 0 -4 Q-20 -4 -56 0 Z" />
        </svg>
    );
}

/** The record flag beside the piste: here your best run ended. */
export function RecordFlag() {
    return (
        <span className="sl-record-flag" aria-hidden>
            <svg viewBox="-10 -120 90 124">
                <path className="sl-flagstick" d="M0 2 L0 -116" />
                <path className="sl-recflag" d="M0 -116 Q36 -122 72 -112 Q62 -98 72 -84 Q36 -92 0 -86 Z" />
            </svg>
            <span className="sl-record-text">Record</span>
        </span>
    );
}

// ── The gate ──────────────────────────────────────────────────────────────────

/** One lane of a gate: two poles and a flapping banner with a white plate for the number (an HTML label over it). */
export function GateArt() {
    return (
        <svg className="sl-gate-art" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden>
            <path className="sl-gpole" d="M8 120 L8 2 M92 120 L92 2" />
            <g className="sl-banner">
                <path className="sl-cloth" d="M8 4 Q50 0 92 4 L92 52 Q71 58 50 52 Q29 46 8 52 Z" />
                <path className="sl-cloth-fold" d="M8 46 Q29 40 50 46 Q71 52 92 46" />
                <rect className="sl-plate" x="20" y="9" width="60" height="36" rx="8" />
            </g>
            <path className="sl-pennant is-l" d="M8 2 L-4 8 L8 14 Z" />
            <path className="sl-pennant is-r" d="M92 2 L104 8 L92 14 Z" />
        </svg>
    );
}

// ── Far away ──────────────────────────────────────────────────────────────────

/** The mountains over the slope's crest, with a cable car crossing the valley. */
export function Mountains() {
    return (
        <svg className="sl-mountains" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax slice" aria-hidden>
            <path className="sl-peak-far" d="M0 420 L0 250 L140 150 L250 220 L400 90 L540 210 L660 150 L800 260 L960 110 L1120 230 L1250 120 L1420 240 L1600 160 L1600 420 Z" />
            <path className="sl-peak-far-snow" d="M400 90 L452 134 L428 128 L404 150 L382 124 L356 128 Z M960 110 L1012 152 L986 146 L962 168 L940 142 L912 148 Z M1250 120 L1296 160 L1272 154 L1250 172 L1230 150 L1206 156 Z" />
            <path className="sl-peak" d="M0 420 L0 300 L120 230 L260 320 L420 190 L560 300 L700 240 L820 330 L1000 200 L1160 320 L1300 250 L1460 330 L1600 280 L1600 420 Z" />
            <path className="sl-peak-snow" d="M420 190 L476 238 L450 232 L424 256 L398 230 L370 236 Z M1000 200 L1058 250 L1030 244 L1002 266 L978 240 L948 246 Z M120 230 L160 256 L138 254 L118 268 L100 248 Z" />
            {/* The cable car: a pylon on each side, the cable sagging a little, two cabins riding it (slalom.css sl-ride). */}
            <path className="sl-pylon" d="M196 300 L208 196 L220 300 M200 262 L216 262 M190 196 L226 196" />
            <path className="sl-pylon" d="M1372 300 L1384 150 L1396 300 M1376 250 L1392 250 M1366 150 L1402 150" />
            <path className="sl-cable" d="M208 198 Q800 230 1384 152" />
            <g className="sl-cabin-track">
                {[0, 1].map(i => (
                    <g key={i} className="sl-cabin" style={{ '--i': i } as CSSProperties}>
                        <path className="sl-hanger" d="M0 0 L0 16" />
                        <rect className="sl-cabin-box" x="-16" y="14" width="32" height="26" rx="6" />
                        <rect className="sl-cabin-window" x="-11" y="19" width="22" height="10" rx="3" />
                    </g>
                ))}
            </g>
        </svg>
    );
}

/** The end screen: the skier at the finish arch, the snowman cheering beside him. */
export function FinishScene() {
    return (
        <svg className="sl-finish-art" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice" aria-hidden>
            <rect className="sl-finish-sky" x="0" y="0" width="400" height="220" />
            <path className="sl-peak" d="M0 120 L60 70 L120 110 L200 50 L280 105 L340 72 L400 110 L400 220 L0 220 Z" />
            <path className="sl-peak-snow" d="M200 50 L224 70 L212 68 L200 78 L188 68 L176 70 Z" />
            <path className="sl-finish-snow" d="M0 150 Q200 128 400 150 L400 220 L0 220 Z" />
            <path className="sl-gpole" d="M110 190 L110 60 M290 190 L290 60" />
            <path className="sl-finish-banner" d="M104 60 L296 60 L296 92 L104 92 Z" />
            <path className="sl-finish-check" d="M104 60 h16 v16 h-16 Z M136 60 h16 v16 h-16 Z M168 60 h16 v16 h-16 Z M200 60 h16 v16 h-16 Z M232 60 h16 v16 h-16 Z M264 60 h16 v16 h-16 Z M120 76 h16 v16 h-16 Z M152 76 h16 v16 h-16 Z M184 76 h16 v16 h-16 Z M216 76 h16 v16 h-16 Z M248 76 h16 v16 h-16 Z M280 76 h16 v16 h-16 Z" />
        </svg>
    );
}
