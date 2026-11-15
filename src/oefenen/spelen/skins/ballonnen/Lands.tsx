import { Snow } from '../../scene';
import { LANDS, type Land } from './scenery';

// The three Ballonnen landscapes, drawn in code: grasland, besneeuwde bergen, palmstrand. All three stay
// mounted so a switch is a crossfade (the new one fades in over the old, its ground rises a little).
// Stretched strips (preserveAspectRatio none) make the ground; props keep their shape and sit on it.

function Gras() {
    return (
        <>
            <svg className="bal-strip bal-gras-far" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
                <path d="M0 30 Q50 8 110 22 Q170 36 230 16 Q300 -2 400 24 L400 60 L0 60 Z" />
            </svg>
            <svg className="bal-prop bal-tree" style={{ left: '71%' }} viewBox="0 0 60 80" aria-hidden>
                <rect className="bal-trunk" x="25" y="44" width="10" height="34" rx="3" />
                <circle className="bal-crown" cx="30" cy="30" r="24" />
                <circle className="bal-crown-lit" cx="22" cy="22" r="8" />
            </svg>
            <svg className="bal-prop bal-tree is-small" style={{ left: '16%' }} viewBox="0 0 60 80" aria-hidden>
                <rect className="bal-trunk" x="25" y="44" width="10" height="34" rx="3" />
                <circle className="bal-crown" cx="30" cy="30" r="24" />
                <circle className="bal-crown-lit" cx="22" cy="22" r="8" />
            </svg>
            <svg className="bal-strip bal-gras-near" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
                <path d="M0 34 Q60 6 130 28 T260 24 T400 20 L400 60 L0 60 Z" />
            </svg>
        </>
    );
}

function Mountain({ left, className }: { left: string; className: string }) {
    return (
        <svg className={`bal-prop bal-mountain ${className}`} style={{ left }} viewBox="0 0 200 140" aria-hidden>
            <path className="bal-rock" d="M2 140 L84 24 Q100 4 116 24 L198 140 Z" />
            <path className="bal-rock-shade" d="M100 15 Q110 15 116 24 L198 140 L128 140 Q120 90 104 60 Z" />
            <path className="bal-snowcap" d="M60 58 L84 24 Q100 4 116 24 L140 58 Q130 50 121 60 Q111 49 101 61 Q91 49 81 60 Q71 50 60 58 Z" />
        </svg>
    );
}

function Pine({ left }: { left: string }) {
    return (
        <svg className="bal-prop bal-pine" style={{ left }} viewBox="0 0 50 80" aria-hidden>
            <rect className="bal-trunk" x="21" y="62" width="8" height="16" rx="2" />
            <path className="bal-needles" d="M25 2 L40 28 L33 28 L46 50 L37 50 L49 66 L1 66 L13 50 L4 50 L17 28 L10 28 Z" />
            <path className="bal-pine-snow" d="M25 2 L33 16 Q29 13 25 17 Q21 13 17 16 Z" />
        </svg>
    );
}

// The snowfall runs only while the mountains are shown (no flakes falling out of sight).
function Bergen({ snowing, reducedMotion, paused }: { snowing: boolean; reducedMotion: boolean; paused: boolean }) {
    return (
        <>
            <Mountain left="-8%" className="is-left" />
            <Mountain left="64%" className="is-right" />
            <Mountain left="26%" className="is-big" />
            <svg className="bal-strip bal-snowfield" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
                <path d="M0 28 Q70 10 150 26 Q230 40 300 20 Q350 8 400 22 L400 60 L0 60 Z" />
            </svg>
            <Pine left="9%" />
            <Pine left="86%" />
            {snowing && <Snow density={18} full size={[4, 10]} fall={[8, 13]} paused={paused} reducedMotion={reducedMotion} className="bal-snow" />}
        </>
    );
}

function Palm({ left, flip }: { left: string; flip?: boolean }) {
    return (
        <svg className={`bal-prop bal-palm${flip ? ' is-flip' : ''}`} style={{ left }} viewBox="0 0 120 190" aria-hidden>
            <path className="bal-palm-trunk" d="M58 186 Q52 120 66 58 L76 60 Q66 122 74 186 Z" />
            <path className="bal-palm-ring" d="M57 150 L73 150 M58 120 L73 121 M61 92 L74 93" />
            <g className="bal-fronds">
                <path className="bal-frond" d="M70 58 Q40 30 6 44 Q34 40 52 66 Z" />
                <path className="bal-frond" d="M70 58 Q100 28 116 48 Q94 40 80 66 Z" />
                <path className="bal-frond" d="M70 58 Q58 18 28 12 Q54 28 60 60 Z" />
                <path className="bal-frond" d="M70 58 Q90 16 112 22 Q90 30 78 62 Z" />
                <path className="bal-frond" d="M70 58 Q52 64 30 92 Q58 72 74 64 Z" />
                <circle className="bal-coconut" cx="64" cy="64" r="6" />
                <circle className="bal-coconut" cx="76" cy="66" r="6" />
            </g>
        </svg>
    );
}

function Strand() {
    return (
        <>
            <svg className="bal-prop bal-sun" viewBox="0 0 100 100" aria-hidden>
                <g className="bal-rays">
                    {Array.from({ length: 10 }, (_, i) => (
                        <path key={i} d="M50 6 L50 16" transform={`rotate(${i * 36} 50 50)`} />
                    ))}
                </g>
                <circle className="bal-sun-disc" cx="50" cy="50" r="24" />
            </svg>
            <svg className="bal-strip bal-sea" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
                <path d="M0 14 Q25 8 50 14 T100 14 T150 14 T200 14 T250 14 T300 14 T350 14 T400 14 L400 60 L0 60 Z" />
            </svg>
            <svg className="bal-strip bal-waves" viewBox="0 0 440 60" preserveAspectRatio="none" aria-hidden>
                <path d="M10 30 Q30 24 50 30 M120 40 Q140 34 160 40 M230 28 Q250 22 270 28 M330 42 Q350 36 370 42 M400 32 Q420 26 440 32" />
            </svg>
            <svg className="bal-prop bal-boat" viewBox="0 0 80 70" aria-hidden>
                <path className="bal-sail" d="M40 6 L40 48 L70 48 Z" />
                <path className="bal-sail is-front" d="M36 14 L36 48 L14 48 Z" />
                <path className="bal-hull" d="M6 50 L74 50 L64 66 L16 66 Z" />
            </svg>
            <svg className="bal-strip bal-sand" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
                <path d="M0 26 Q80 12 170 22 Q260 32 330 18 Q370 12 400 16 L400 60 L0 60 Z" />
            </svg>
            <Palm left="-3%" />
            <Palm left="87%" flip />
        </>
    );
}

export default function Lands({ land, switched, reducedMotion, paused }: { land: Land; switched: boolean; reducedMotion: boolean; paused: boolean }) {
    return (
        <div className={`bal-lands${switched ? ' is-switched' : ''}`} aria-hidden>
            {LANDS.map(l => (
                <div key={l} className={`bal-land is-${l}${l === land ? ' is-on' : ''}`}>
                    <div className="bal-land-sky" />
                    <div className="bal-ground">
                        {l === 'gras' && <Gras />}
                        {l === 'bergen' && <Bergen snowing={land === 'bergen'} reducedMotion={reducedMotion} paused={paused} />}
                        {l === 'strand' && <Strand />}
                    </div>
                </div>
            ))}
        </div>
    );
}
