import type { CSSProperties } from 'react';
import type { Side } from '../../duel/types';
import { BUG_SCALE, FROG_AT, type BugKind } from './pond';

// Kikkers en vliegjes: the pictures. One SVG, 1000 × 300 scene units (pond.ts), y down; the frogs sit on big
// lily pads at FROG_AT and face each other (the right one is the left one mirrored). Flat fills under the
// thick --spel-ink outline. What moves by itself (water, reeds, pads, breathing, blinking) is CSS; the bugs'
// places and the frogs' pupils are set every frame by Kikkers.tsx.


// ── The pond around the frogs ───────────────────────────────────────────────

// Cattails: [x, height, lean]; the far ones are smaller and paler.
const REEDS_BACK: [number, number, number][] = [[268, 46, -4], [284, 58, 3], [300, 40, 6], [690, 52, -5], [706, 40, 4], [722, 60, -2]];
const REEDS_SIDE: [number, number, number][] = [[-160, 150, 5], [-120, 190, -3], [-80, 160, 6], [-40, 120, -6], [12, 140, 4], [40, 104, -5],
    [960, 104, 5], [988, 140, -4], [1040, 120, 6], [1080, 160, -6], [1120, 190, 3], [1160, 150, -5]];
// Little lily pads on the water: [x, y, rx, flower]
const PADS: [number, number, number, boolean][] = [[372, 236, 34, true], [470, 272, 26, false], [560, 226, 22, false], [640, 266, 36, true], [-120, 250, 40, false], [1110, 248, 44, true]];
// Sun glints on the water: [x, y, delay s]
const GLINTS: [number, number, number][] = [[330, 168, 0], [450, 150, 1.1], [520, 188, 2.3], [610, 160, 0.6], [700, 200, 1.7], [400, 210, 2.9], [-60, 180, 1.4], [1060, 176, 0.3]];
// Ripple rings that open now and then: [x, y, delay s]
const RIPPLES: [number, number, number][] = [[420, 196, 0], [590, 248, 1.8], [500, 160, 3.1], [690, 216, 4.4], [330, 270, 5.2]];
// Clouds: [x, y, size]; the high ones only show on a tall band (and the thumbnail).
const CLOUDS: [number, number, number][] = [[120, 52, 30], [640, 34, 26], [900, 70, 22], [-260, 40, 34], [1260, 50, 30], [420, -60, 40], [80, -130, 34], [820, -110, 44]];
// Far trees on the bank: [x, r]
const TREES: [number, number][] = [[-300, 50], [-200, 38], [-60, 46], [60, 36], [230, 30], [420, 26], [600, 34], [780, 30], [930, 44], [1060, 40], [1200, 48], [1320, 36]];

/** A lily pad round (0, 0) with its notch (a wedge to the centre) pointing right. */
const padPath = (rx: number, ry: number, notchDeg = 16) => {
    const a = (notchDeg * Math.PI) / 180;
    const x = (rx * Math.cos(a)).toFixed(1);
    const y = (ry * Math.sin(a)).toFixed(1);
    return `M0 0 L${x} ${-y} A${rx} ${ry} 0 1 0 ${x} ${y} Z`;
};

function Cattail({ x, h, lean, far }: { x: number; h: number; lean: number; far?: boolean }) {
    return (
        <g transform={`translate(${x} 0)`}><g className={`kv-reed${far ? ' is-far' : ''}`} style={{ animationDelay: `${(x % 7) * -0.4}s` }}>
            <path className="kv-reed-leaf" d={`M0 0 Q${-lean * 3} ${-h * 0.5} ${-lean * 2 - 10} ${-h * 0.72}`} />
            <path className="kv-reed-stem" d={`M0 0 L${lean} ${-h}`} />
            <rect className="kv-reed-head" x={lean - 5} y={-h - 4} width="10" height={h * 0.26} rx="5" />
            <path className="kv-reed-stem" d={`M${lean} ${-h - 4} L${lean} ${-h - 14}`} />
        </g></g>
    );
}

function LilyPad({ x, y, rx, flower, i }: { x: number; y: number; rx: number; flower: boolean; i: number }) {
    const ry = rx * 0.4;
    return (
        <g transform={`translate(${x} ${y})`}><g className="kv-lily" style={{ animationDelay: `${i * -0.9}s` }}>
            <path className="kv-lily-pad" d={padPath(rx, ry, i % 2 ? 22 : 14)} transform={i % 2 ? 'scale(-1 1)' : undefined} />
            <path className="kv-lily-vein" d={`M0 0 L${-rx * 0.6} ${-ry * 0.5} M0 0 L${-rx * 0.5} ${ry * 0.55} M0 0 L${rx * 0.1} ${-ry * 0.8}`} />
            {flower && (
                <g className="kv-flower" transform={`translate(${-rx * 0.25} ${-ry * 0.4})`}>
                    {[-34, 0, 34, -64, 64].map(r => <ellipse key={r} className="kv-petal" cx="0" cy="-9" rx="5" ry="11" transform={`rotate(${r})`} />)}
                    <circle className="kv-flower-heart" cx="0" cy="-3" r="4.5" />
                </g>
            )}
        </g></g>
    );
}

/** Everything behind the frogs: the sky's sun, the far bank, the water and what floats and grows on it. */
export function PondBack() {
    return (
        <g className="kv-back">
            {/* The sky in the picture itself, so the horizon matches it on any band shape (a tall band shows more sky). */}
            <defs>
                <linearGradient id="kv-sky-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="128">
                    <stop offset="0" className="kv-sky-top" />
                    <stop offset="1" className="kv-sky-low" />
                </linearGradient>
            </defs>
            <rect x="-900" y="-1200" width="2800" height="1330" fill="url(#kv-sky-grad)" />
            {CLOUDS.map(([x, y, r], i) => (
                <g key={i} transform={`translate(${x} ${y})`}>
                    <g className="kv-cloud" style={{ animationDelay: `${i * -7}s` }}>
                        <path d={`M${-r * 1.6} 0 A${r * 0.6} ${r * 0.6} 0 0 1 ${-r * 0.7} ${-r * 0.5} A${r} ${r} 0 0 1 ${r * 0.8} ${-r * 0.45} A${r * 0.55} ${r * 0.55} 0 0 1 ${r * 1.6} 0 Z`} />
                    </g>
                </g>
            ))}
            <g className="kv-sun" transform="translate(330 56)">
                <g className="kv-sun-rays">{Array.from({ length: 12 }, (_, i) => <path key={i} className="kv-ray" d="M0 -46 L6 -34 L-6 -34 Z" transform={`rotate(${i * 30})`} />)}</g>
                <circle className="kv-sun-disc" r="28" />
                <path className="kv-sun-smile" d="M-10 4 Q0 12 10 4" />
                <circle className="kv-sun-eye" cx="-8" cy="-5" r="2.6" />
                <circle className="kv-sun-eye" cx="8" cy="-5" r="2.6" />
            </g>
            <path className="kv-hill" d="M-900 132 Q-640 82 -380 122 Q-160 90 60 120 Q260 86 470 118 Q690 84 900 116 Q1120 88 1340 120 Q1600 86 1900 130 L1900 150 L-900 150 Z" />
            {TREES.map(([x, r]) => (
                <g key={x} className="kv-tree" transform={`translate(${x} 128)`}>
                    <path className="kv-trunk" d={`M0 0 L0 ${-r * 0.8}`} />
                    <circle className="kv-crown" cx="0" cy={-r * 1.1} r={r * 0.62} />
                    <circle className="kv-crown" cx={-r * 0.42} cy={-r * 0.8} r={r * 0.46} />
                    <circle className="kv-crown" cx={r * 0.44} cy={-r * 0.78} r={r * 0.44} />
                </g>
            ))}
            <rect className="kv-water" x="-900" y="126" width="2800" height="260" />
            <rect className="kv-water-far" x="-900" y="126" width="2800" height="20" />
            <path className="kv-bank" d="M-900 128 L1900 128" />
            <g className="kv-streaks">
                {[[150, 150, 90], [380, 176, 70], [620, 142, 110], [800, 186, 80], [-200, 170, 120], [1200, 160, 100], [520, 214, 60], [260, 236, 70], [760, 244, 90]].map(([x, y, w], i) => (
                    <path key={i} className="kv-streak" d={`M${x} ${y} l${w} 0`} style={{ animationDelay: `${i * -1.3}s` }} />
                ))}
            </g>
            {REEDS_BACK.map(([x, h, lean]) => <g key={x} transform="translate(0 132)"><Cattail x={x} h={h} lean={lean} far /></g>)}
            {RIPPLES.map(([x, y, d], i) => (
                <g key={i} transform={`translate(${x} ${y})`}><ellipse className="kv-ripple" rx="30" ry="7" style={{ animationDelay: `${d}s` }} /></g>
            ))}
            {GLINTS.map(([x, y, d], i) => <g key={i} transform={`translate(${x} ${y})`}><path className="kv-glint" d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" style={{ animationDelay: `${d}s` }} /></g>)}
            {PADS.map(([x, y, rx, flower], i) => <LilyPad key={i} x={x} y={y} rx={rx} flower={flower} i={i} />)}
            {/* A small fish jumps now and then in the middle of the pond. */}
            <g className="kv-fish-jump" transform="translate(500 250)">
                <g className="kv-fish">
                    <path className="kv-fish-body" d="M-14 0 Q0 -10 14 0 Q0 10 -14 0 Z" />
                    <path className="kv-fish-body" d="M-14 0 L-24 -7 L-22 0 L-24 7 Z" />
                    <circle className="kv-fish-eye" cx="8" cy="-2" r="1.8" />
                </g>
                <ellipse className="kv-fish-ring" rx="22" ry="5" />
            </g>
            {/* A little blue dragonfly rests on a far reed, glints, and darts off and back. */}
            <g className="kv-blue-fly" transform="translate(706 82)">
                <g className="kv-blue-dart"><BlueDragonfly /></g>
            </g>
        </g>
    );
}

function BlueDragonfly() {
    return (
        <g className="kv-bluefly">
            <ellipse className="kv-wing is-blue" cx="-2" cy="-6" rx="10" ry="3" transform="rotate(-18)" />
            <ellipse className="kv-wing is-blue" cx="2" cy="-6" rx="10" ry="3" transform="rotate(18)" />
            <path className="kv-bluefly-body" d="M-18 0 L6 0" />
            <circle className="kv-bluefly-head" cx="8" cy="0" r="3" />
        </g>
    );
}

/** In front of the frogs: tall reeds at the sides (wide screens see more of them). */
export function PondFront() {
    return (
        <g className="kv-front">
            {REEDS_SIDE.map(([x, h, lean]) => <g key={x} transform="translate(0 304)"><Cattail x={x} h={h} lean={lean} /></g>)}
        </g>
    );
}

// ── A frog ──────────────────────────────────────────────────────────────────

export type FrogPose = 'idle' | 'cheer' | 'flop' | 'still';

export interface FrogProps {
    side: Side;
    pose: FrogPose;
    // Counters that restart a one-shot: a snap (mouth open, lunge), a gulp (cheeks), a burp, a mistake (dizzy), a golden dragonfly seen.
    snap: number;
    gulp: number;
    burp: number;
    hurt: number;
    notice: number;
    // The pupils' group, moved every frame to look at a bug.
    pupilsRef?: (el: SVGGElement | null) => void;
}

const EYE_AT = [[6, -130], [48, -128]] as const;

function Eyes({ pupilsRef }: { pupilsRef?: FrogProps['pupilsRef'] }) {
    return (
        <g className="kv-eyes">
            {EYE_AT.map(([x, y]) => <circle key={x} className="kv-skin" cx={x} cy={y} r="20" />)}
            {EYE_AT.map(([x, y]) => <circle key={x} className="kv-eye-white" cx={x} cy={y} r="14" />)}
            <g ref={pupilsRef} className="kv-pupils">
                {EYE_AT.map(([x, y]) => (
                    <g key={x}>
                        <circle className="kv-pupil" cx={x + 2} cy={y} r="7.5" />
                        <circle className="kv-shine" cx={x + 4.5} cy={y - 3} r="2.4" />
                    </g>
                ))}
            </g>
            {/* The lids come down for a blink (CSS, now and then). */}
            {EYE_AT.map(([x, y]) => <circle key={x} className="kv-lid" cx={x} cy={y} r="15" />)}
        </g>
    );
}

// Swirly eyes for a dizzy frog (over the whites).
function SwirlEyes() {
    return (
        <g className="kv-swirl">
            {EYE_AT.map(([x, y]) => (
                <g key={x} transform={`translate(${x} ${y})`}>
                    <circle className="kv-eye-white" r="14.5" />
                    <g className="kv-swirl-spin"><path className="kv-swirl-line" d="M0 0 C3 -2 4 3 0 4 C-5 5 -7 -1 -4 -5 C0 -9 8 -7 9 0 C10 7 3 11 -3 10" /></g>
                </g>
            ))}
        </g>
    );
}

// Little stars that circle a dizzy frog's head.
function DizzyStars() {
    return (
        <g className="kv-stars" transform="translate(28 -166)">
            {[0, 1, 2].map(i => (
                <g key={i} className="kv-star-orbit" style={{ animationDelay: `${i * -0.33}s` }}>
                    <path className="kv-dizzy-star" d="M0 -8 L2.4 -2.4 L8 -2 L3.6 1.8 L5 7.6 L0 4.6 L-5 7.6 L-3.6 1.8 L-8 -2 L-2.4 -2.4 Z" />
                </g>
            ))}
        </g>
    );
}

/** A frog on its lily pad, facing the middle; its moments restart on their counters. */
export function Frog({ side, pose, snap, gulp, burp, hurt, notice, pupilsRef }: FrogProps) {
    const at = FROG_AT[side];
    const dizzy = pose === 'flop';
    return (
        <g className={`kv-frog-at is-${side}`} transform={`translate(${at.x} ${at.y})${side === 'right' ? ' scale(-1 1)' : ''}`}>
            {/* Ripples under the pad while the winner jumps. */}
            {pose === 'cheer' && <g className="kv-win-rings">{[0, 1, 2].map(i => <ellipse key={i} className="kv-ripple is-win" cy="6" rx="70" ry="14" style={{ animationDelay: `${i * 0.5}s` }} />)}</g>}
            <g className="kv-pad-bob" style={{ animationDelay: side === 'left' ? '0s' : '-1.7s' }}>
                <path className="kv-pad" transform="translate(12 6)" d={padPath(94, 23, 18)} />
                <path className="kv-lily-vein" d="M12 6 L-58 -6 M12 6 L-66 16 M12 6 L-8 -14 M12 6 L44 24" />
                <g className={`kv-frog is-${pose}`}>
                    <g key={`h${hurt}`} className={hurt ? 'kv-sway' : undefined}>
                        <g key={`s${snap}`} className={snap ? 'kv-lunge' : undefined}>
                            <g className="kv-breathe" style={{ animationDelay: side === 'left' ? '0s' : '-1.1s' }}>
                                <ellipse className="kv-skin-dark" cx="-30" cy="-3" rx="30" ry="7" />
                                <path className="kv-toes" d="M-58 -2 l-8 4 M-50 1 l-6 6" />
                                <ellipse className="kv-skin" cx="-34" cy="-30" rx="32" ry="26" />
                                <path className="kv-skin" d="M-50 -42 C-58 -92 -18 -118 22 -112 C62 -106 72 -70 62 -40 C54 -12 22 -4 0 -4 C-28 -4 -46 -16 -50 -42 Z" />
                                <ellipse className="kv-belly" cx="28" cy="-42" rx="28" ry="32" />
                                <circle className="kv-spot" cx="-30" cy="-36" r="7" />
                                <circle className="kv-spot" cx="-14" cy="-80" r="5" />
                                <circle className="kv-spot" cx="-44" cy="-20" r="4" />
                                <ellipse className="kv-skin" cx="24" cy="-96" rx="52" ry="33" />
                                {/* The throat sac: it blows up when the frog croaks. */}
                                <ellipse className="kv-sac" cx="40" cy="-62" rx="24" ry="17" />
                                <path className="kv-scarf" d="M-28 -72 Q18 -52 62 -66 L64 -54 Q18 -38 -26 -60 Z" />
                                <path className="kv-scarf kv-scarf-tail" d="M-24 -68 L-48 -76 L-44 -58 Z" />
                                <path className="kv-arm" d="M30 -50 Q44 -30 46 -8" />
                                <path className="kv-arm-in" d="M30 -50 Q44 -30 46 -8" />
                                <ellipse className="kv-hand" cx="50" cy="-5" rx="12" ry="5" />
                                <ellipse className="kv-blush" cx="56" cy="-82" rx="9" ry="5" />
                                <circle className="kv-nostril" cx="70" cy="-106" r="1.8" />
                                <circle className="kv-nostril" cx="63" cy="-108" r="1.8" />
                                <path className="kv-smile" d="M10 -82 Q42 -64 74 -86" />
                                {snap > 0 && <g key={`m${snap}`} className="kv-mouth-open"><path d="M40 -80 Q60 -68 76 -86 Q62 -92 40 -80 Z" /></g>}
                                {gulp > 0 && <g key={`g${gulp}`} className="kv-cheeks"><circle className="kv-skin" cx="52" cy="-78" r="14" /><ellipse className="kv-blush" cx="54" cy="-78" rx="8" ry="5" /></g>}
                                {burp > 0 && <g key={`b${burp}`} className="kv-burp"><circle className="kv-bubble" cx="84" cy="-92" r="8" /><circle className="kv-bubble" cx="96" cy="-106" r="5" /></g>}
                                <g key={`e${notice}`} className={notice ? 'kv-wide' : undefined}><Eyes pupilsRef={pupilsRef} /></g>
                                {notice > 0 && <g key={`n${notice}`} className="kv-notice"><path className="kv-notice-mark" d="M24 -214 Q36 -214 33 -200 L28 -176 L20 -176 L15 -200 Q12 -214 24 -214 Z" /><circle className="kv-notice-mark" cx="24" cy="-164" r="6" /></g>}
                                {hurt > 0 && !dizzy && <g key={`d${hurt}`} className="kv-daze"><SwirlEyes /><DizzyStars /></g>}
                                {dizzy && <g className="kv-daze is-held"><SwirlEyes /><DizzyStars /></g>}
                            </g>
                        </g>
                    </g>
                </g>
            </g>
        </g>
    );
}

// ── Bugs ────────────────────────────────────────────────────────────────────

/** A bug at (0, 0), facing right. */
export function BugArt({ kind }: { kind: BugKind }) {
    if (kind === 'dragonfly') {
        return (
            <g className="kv-bug is-dragonfly">
                <circle className="kv-glow" r="40" />
                <g className="kv-wings is-fast">
                    <ellipse className="kv-wing is-gold" cx="-6" cy="-18" rx="30" ry="7.5" transform="rotate(-32 -6 -18)" />
                    <ellipse className="kv-wing is-gold" cx="10" cy="-18" rx="30" ry="7.5" transform="rotate(28 10 -18)" />
                </g>
                <g className="kv-wings is-fast is-low">
                    <ellipse className="kv-wing is-gold" cx="-10" cy="-9" rx="26" ry="6.5" transform="rotate(-12 -10 -9)" />
                    <ellipse className="kv-wing is-gold" cx="12" cy="-9" rx="26" ry="6.5" transform="rotate(10 12 -9)" />
                </g>
                <path className="kv-df-edge" d="M0 0 L-54 3" />
                <path className="kv-df-tail" d="M0 0 L-54 3" />
                {[-44, -34, -24, -14].map(x => <path key={x} className="kv-df-band" d={`M${x} -2.5 L${x} 5`} />)}
                <ellipse className="kv-df-chest" cx="4" cy="0" rx="11" ry="8.5" />
                <circle className="kv-df-head" cx="18" cy="-1" r="7.5" />
                <circle className="kv-df-eye" cx="20" cy="-5" r="5" />
                <circle className="kv-shine" cx="21.5" cy="-6.5" r="1.8" />
                <path className="kv-df-smile" d="M18 3 Q22 6 25 2" />
                {[[-34, -30, 0], [30, -28, 0.4], [-14, 24, 0.8], [26, 18, 0.2]].map(([x, y, d]) => (
                    <g key={x} transform={`translate(${x} ${y})`}><path className="kv-twinkle" d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" style={{ animationDelay: `${d}s` }} /></g>
                ))}
            </g>
        );
    }
    if (kind === 'beetle') {
        return (
            <g className="kv-bug is-beetle">
                <g className="kv-wings"><ellipse className="kv-wing" cx="-8" cy="-14" rx="12" ry="7" transform="rotate(-30)" /><ellipse className="kv-wing" cx="2" cy="-15" rx="12" ry="7" transform="rotate(16)" /></g>
                <path className="kv-antenna" d="M14 -5 Q20 -14 26 -12 M14 3 Q22 -2 28 2" />
                <circle className="kv-beetle-head" cx="12" cy="0" r="7" />
                <circle className="kv-beetle-shell" cx="-2" cy="0" r="14" />
                <path className="kv-beetle-split" d="M-16 0 L12 0" />
                <circle className="kv-beetle-spot" cx="-7" cy="-6" r="3" />
                <circle className="kv-beetle-spot" cx="3" cy="-7" r="2.4" />
                <circle className="kv-beetle-spot" cx="-6" cy="6" r="2.6" />
                <circle className="kv-beetle-spot" cx="4" cy="6" r="2.2" />
                <circle className="kv-shine is-shell" cx="-6" cy="-9" r="2.6" />
                <circle className="kv-bug-eye" cx="15" cy="-3" r="2.6" />
            </g>
        );
    }
    return (
        <g className="kv-bug is-fly">
            <g className="kv-wings"><ellipse className="kv-wing" cx="-5" cy="-11" rx="11" ry="6" transform="rotate(-28)" /><ellipse className="kv-wing" cx="3" cy="-11" rx="11" ry="6" transform="rotate(22)" /></g>
            <path className="kv-fly-legs" d="M-6 6 l-4 6 M0 7 l-1 6 M5 6 l2 6" />
            <ellipse className="kv-fly-body" cx="-3" cy="0" rx="11" ry="8" />
            <path className="kv-fly-stripe" d="M-8 -6 Q-10 0 -8 6 M-2 -7 Q-4 0 -2 7" />
            <circle className="kv-fly-head" cx="9" cy="-1" r="6.5" />
            <circle className="kv-bug-eye is-fly" cx="12" cy="-4" r="4" />
            <circle className="kv-shine" cx="13" cy="-5.5" r="1.3" />
        </g>
    );
}

// ── A catch ─────────────────────────────────────────────────────────────────

export interface Snap { id: number; side: Side; kind: BugKind; points: number; at: { x: number; y: number }; len: number; angle: number }

/** The tongue from a frog's mouth to the bug and back with the bug stuck on its tip (CSS keyframes, --len). */
export function Tongue({ snap }: { snap: Snap }) {
    const mouth = { x: FROG_AT[snap.side].x + (snap.side === 'left' ? 66 : -66), y: FROG_AT[snap.side].y - 80 };
    return (
        <g transform={`translate(${mouth.x} ${mouth.y}) rotate(${snap.angle})`} style={{ '--len': snap.len } as CSSProperties}>
            <g className="kv-tongue">
                <path className="kv-tongue-edge" d={`M0 0 L${snap.len} 0`} />
                <path className="kv-tongue-fill" d={`M0 0 L${snap.len} 0`} />
            </g>
            <g className="kv-tip">
                <circle className="kv-tongue-tip" r="9" />
                <g className="kv-stuck" transform={`rotate(${-snap.angle}) scale(${snap.side === 'left' ? -1 : 1} 1) rotate(-20)`}>
                    <g transform={`scale(${BUG_SCALE[snap.kind]})`}><BugArt kind={snap.kind} /></g>
                </g>
            </g>
        </g>
    );
}


/** "+2" where the bug was caught, floating up; the dragonfly's +5 in gold with a burst of stars. */
export function Popup({ snap }: { snap: Snap }) {
    const gold = snap.kind === 'dragonfly';
    return (
        <g className={`kv-popup is-${snap.kind}`} transform={`translate(${snap.at.x} ${snap.at.y})`}>
            {gold && (
                <g className="kv-burst">
                    <circle className="kv-burst-ring" r="30" />
                    {Array.from({ length: 10 }, (_, i) => (
                        <g key={i} transform={`rotate(${i * 36})`}>
                            <path className="kv-burst-star" d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" style={{ '--d': `${46 + (i % 3) * 14}px` } as CSSProperties} />
                        </g>
                    ))}
                </g>
            )}
            <g className="kv-plus">
                <text className="kv-plus-text" textAnchor="middle" dominantBaseline="central">+{snap.points}</text>
            </g>
        </g>
    );
}

/** Water drops and a ring: a frog slips (small) or flops (big). */
export function Splash({ x, y, big }: { x: number; y: number; big?: boolean }) {
    const drops = big ? [-50, -30, -12, 10, 30, 52] : [-24, -8, 10, 26];
    return (
        <g className={`kv-splash${big ? ' is-big' : ''}`} transform={`translate(${x} ${y})`}>
            <ellipse className="kv-ripple is-splash" rx={big ? 60 : 34} ry={big ? 12 : 7} />
            {drops.map((dx, i) => (
                <circle key={dx} className="kv-drop" r={big ? 6 : 4.5} style={{ '--dx': `${dx}px`, '--dy': `${-(big ? 56 : 34) - (i % 2) * 18}px`, animationDelay: `${i * 25}ms` } as CSSProperties} />
            ))}
        </g>
    );
}
