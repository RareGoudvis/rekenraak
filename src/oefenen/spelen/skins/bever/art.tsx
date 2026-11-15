import type { CSSProperties } from 'react';
import type { BeaverFace } from './family';

// The Bever's drawings, each in its own frame (feet or base at 0,0; the beavers face left, upstream).
// Behaviour lives in Bever.tsx and bever.css; these only draw.

// The big beaver, ~70 high. carry = a stick in his paws (he puts it down: .bv-act in bever.css).
export function BeaverArt({ face = 'busy', hat = false, carry = false }: { face?: BeaverFace | 'laugh'; hat?: boolean; carry?: boolean }) {
    const happy = face === 'happy' || face === 'laugh';
    return (
        <g className="bv-beaver-art">
            {/* The far arm: hidden behind the body until he cheers (it swings up). */}
            <g className="bv-arm-back"><ellipse className="bv-fur" cx="2" cy="-30" rx="5" ry="11" /></g>
            <ellipse className="bv-tail" cx="26" cy="-9" rx="22" ry="8" transform="rotate(-18 26 -9)" />
            <path className="bv-tail-line" d="M14 -12 L36 -14 M16 -5 L38 -8" />
            <ellipse className="bv-fur" cx="4" cy="-25" rx="20" ry="24" />
            <ellipse className="bv-belly" cx="-4" cy="-21" rx="11" ry="16" />
            <ellipse className="bv-fur" cx="-6" cy="-3" rx="10" ry="4.5" />
            <circle className="bv-fur" cx="-2" cy="-64" r="5" />
            <circle className="bv-fur" cx="-10" cy="-53" r="16" />
            <ellipse className="bv-snout" cx="-23" cy="-49" rx="10" ry="7.5" />
            <circle className="bv-nose" cx="-31" cy="-52" r="3.5" />
            <rect className="bv-tooth" x="-26" y="-43" width="7" height="8" rx="1.5" />
            {happy ? (
                <>
                    <path className="bv-line" d="M-17 -58 Q-13 -63 -9 -58" />
                    <path className="bv-mouth" d="M-30 -45 Q-24 -36 -16 -44" />
                </>
            ) : (
                <>
                    <circle className="bv-eye" cx="-13" cy="-58" r={face === 'worried' ? 4.4 : 3.6} />
                    <circle className="bv-glint" cx="-12" cy="-59.5" r="1.3" />
                </>
            )}
            {face === 'worried' && (
                <>
                    {/* Brow up at the snout end, a small round mouth, a drop of sweat at the back of the head. */}
                    <path className="bv-line" d="M-20 -68 L-8 -65" />
                    <ellipse className="bv-mouth-o" cx="-22" cy="-40" rx="2.6" ry="3.2" />
                    <path className="bv-sweat" d="M4 -66 q-4 6 0 8 q4 -2 0 -8 Z" />
                </>
            )}
            {carry && (
                <g className="bv-carried">
                    <rect className="bv-wood" x="-50" y="-40" width="56" height="10" rx="5" />
                    <ellipse className="bv-end" cx="-45" cy="-35" rx="2.6" ry="3.4" />
                </g>
            )}
            <g className="bv-arm-g"><ellipse className="bv-fur bv-arm" cx="-17" cy="-28" rx="5" ry="10" transform="rotate(25 -17 -28)" /></g>
            {/* Wiping his brow flicks a drop off (bever.css shows it only then). */}
            <path className="bv-flick" d="M-4 -70 q-4 6 0 8 q4 -2 0 -8 Z" />
            {hat && (
                <g className="bv-hat">
                    <path d="M-20 -66 L-8 -96 L4 -66 Z" />
                    <circle cx="-8" cy="-97" r="4.5" />
                </g>
            )}
        </g>
    );
}

export type BabyLook = 'play' | 'watch' | 'nervous' | 'happy';

// A baby beaver, ~38 high. Its near paw (.bv-paw) holds a pine cone or holds on; the far paw (.bv-paw-back,
// behind the body at rest) is the one that waves up behind its head, where the big head never hides it.
export function BabyArt({ look = 'play', hat = false, cone = false }: { look?: BabyLook; hat?: boolean; cone?: boolean }) {
    return (
        <g className="bv-baby-art">
            <g className="bv-paw-back"><ellipse className="bv-fur" cx="4" cy="-12" rx="3.4" ry="7" /></g>
            <ellipse className="bv-tail" cx="13" cy="-4" rx="10" ry="4" transform="rotate(-15 13 -4)" />
            <ellipse className="bv-fur" cx="2" cy="-12" rx="10" ry="12" />
            <ellipse className="bv-belly" cx="-2" cy="-10" rx="6" ry="8" />
            <circle className="bv-fur" cx="3" cy="-36" r="3.4" />
            <circle className="bv-fur" cx="-4" cy="-28" r="10" />
            <ellipse className="bv-snout" cx="-12.5" cy="-25" rx="5.5" ry="4.5" />
            <circle className="bv-nose" cx="-17" cy="-27" r="2.2" />
            <rect className="bv-tooth" x="-15" y="-21.5" width="4" height="4.5" rx="1" />
            {look === 'happy' ? (
                <>
                    <path className="bv-line" d="M-9 -31 Q-6.5 -34.5 -4 -31" />
                    <path className="bv-mouth" d="M-17 -22 Q-13 -17 -9 -22" />
                </>
            ) : look === 'nervous' ? (
                <>
                    {/* Big round eyes and a drop of sweat: the water is close. */}
                    <circle className="bv-eye-white" cx="-6.5" cy="-30" r="3.8" />
                    <circle className="bv-eye" cx="-7.5" cy="-31" r="1.7" />
                    <path className="bv-line" d="M-11 -37 L-3 -35.5" />
                    <path className="bv-sweat" d="M6 -40 q-3 5 0 6.5 q3 -1.5 0 -6.5 Z" />
                </>
            ) : (
                <>
                    {/* Watching = the eye turned up at the dam. */}
                    <circle className="bv-eye" cx="-6.5" cy={look === 'watch' ? -31.5 : -30} r="2.4" />
                    <circle className="bv-glint" cx="-6" cy={look === 'watch' ? -32.3 : -30.8} r=".8" />
                </>
            )}
            <g className="bv-paw">
                <ellipse className="bv-fur" cx="-8" cy="-13" rx="3.2" ry="6" transform="rotate(20 -8 -13)" />
                {cone && (
                    <g className="bv-cone">
                        <ellipse cx="-12" cy="-8" rx="3.6" ry="4.6" />
                        <path d="M-15 -9 L-9 -9 M-15 -6 L-9 -6" />
                    </g>
                )}
            </g>
            {hat && (
                <g className="bv-hat">
                    <path d="M-12 -36 L-5 -54 L2 -36 Z" />
                    <circle cx="-5" cy="-55" r="2.8" />
                </g>
            )}
        </g>
    );
}

// The family's lodge on the dry side: a dome of mud and sticks, ~80 wide and ~54 high, the door at the bottom.
export function Lodge() {
    return (
        <g className="bv-lodge">
            <path className="bv-lodge-mud" d="M-42 0 C-42 -32 -22 -54 0 -54 C22 -54 42 -32 42 0 Z" />
            {['is-line', 'is-fill'].map(c => <path key={c} className={`bv-lodge-stick ${c}`} d="M-38 -12 L-10 -24 M8 -44 L34 -28 M-28 -38 L-4 -47 M12 -16 L40 -10 M-6 -34 L18 -32 M-32 -24 L-20 -30" />)}
            {[[-38, -12], [34, -28], [-28, -38], [40, -10]].map(([x, y], k) => <circle key={k} className="bv-end" cx={x} cy={y} r="2.4" />)}
            <path className="bv-door" d="M-12 0 L-12 -9 A12 12 0 0 1 12 -9 L12 0 Z" />
            <g className="bv-flower" transform="translate(18 -47)">
                <path className="bv-flower-stem" d="M0 0 Q2 -6 0 -11" />
                <circle className="bv-flower-head" cx="0" cy="-13" r="3.6" />
            </g>
        </g>
    );
}

// A clump of reeds growing up from 0,0; each stem sways on its own beat (bever.css), heights vary a little.
export function Reeds({ n, h }: { n: number; h: number }) {
    return (
        <g className="bv-reeds">
            {Array.from({ length: n }, (_, i) => {
                const hh = h - ((i * 5) % 3) * 12;
                const bend = i % 2 ? 5 : -4;
                return (
                    <g key={i} transform={`translate(${i * 8} 0)`}>
                        <g className="bv-reed" style={{ '--k': i } as CSSProperties}>
                            {/* Stem and blade drawn twice: the dark outline, then the green inside. */}
                            {['is-line', 'is-fill'].map(c => (
                                <g key={c} className={c}>
                                    <path className="bv-reed-stem" d={`M0 0 Q${bend} ${-hh / 2} ${bend / 2} ${-hh}`} />
                                    <path className="bv-reed-stem" d={`M0 -4 Q${-bend * 2.4} ${-hh * 0.35} ${-bend * 3.2} ${-hh * 0.55}`} />
                                </g>
                            ))}
                            {i % 3 !== 1 && <rect className="bv-reed-head" x={bend / 2 - 3.5} y={-hh - 15} width="7" height="17" rx="3.5" />}
                        </g>
                    </g>
                );
            })}
        </g>
    );
}

// A bird crossing the sky now and then (flapping M), and a dragonfly hovering over the pond.
export function Bird() {
    return (
        <g className="bv-bird">
            <path className="bv-bird-wing" d="M-11 0 Q-5 -7 0 0 Q5 -7 11 0" />
        </g>
    );
}

export function Dragonfly() {
    return (
        <g className="bv-dfly">
            <g className="bv-dfly-wings">
                <ellipse cx="-3" cy="-6" rx="3" ry="7.5" transform="rotate(-28 -3 -6)" />
                <ellipse cx="3" cy="-6" rx="3" ry="7.5" transform="rotate(28 3 -6)" />
            </g>
            <rect className="bv-dfly-body" x="-12" y="-2" width="23" height="4.4" rx="2.2" />
            <circle className="bv-dfly-head" cx="-13" cy="0" r="3.2" />
        </g>
    );
}

// A drifting cloud for the HTML sky (its own little SVG, so it can slide across the world box).
export function Cloud() {
    return (
        <svg className="bv-cloud" viewBox="0 0 90 46" aria-hidden>
            <path d="M15 43 Q2 43 4 31 Q6 21 18 23 Q20 8 37 8 Q52 8 56 21 Q68 14 76 25 Q87 27 85 37 Q83 43 72 43 Z" />
        </svg>
    );
}
