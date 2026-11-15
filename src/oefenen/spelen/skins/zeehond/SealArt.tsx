import type { CSSProperties } from 'react';
import { sealShape, type SealLook } from './pod';

// One seal, drawn in code (120 × 104): the look picks fur, spots, whiskers, lashes and a hat / bow / scarf;
// `girth` (0 thin … GROW_STEPS round) shapes the body, the head stays the same. A pup is a little smaller.

const WHISKERS = {
    long: 'M46 44 L35 41 M46 47 L36 49 M74 44 L85 41 M74 47 L84 49',
    short: 'M47 44 L40 42 M47 47 L41 48 M73 44 L80 42 M73 47 L79 48',
    curly: 'M47 44 Q38 44 36 38 M47 47 Q37 50 35 45 M73 44 Q82 44 84 38 M73 47 Q83 50 85 45',
} as const;

function Wear({ wear }: { wear: SealLook['wear'] }) {
    if (wear === 'hat') return (
        <g className="zh-wear zh-hat">
            <path className="zh-hat-cap" d="M33 25 C34 4 86 4 87 25 Z" />
            <rect className="zh-hat-band" x="30" y="20" width="60" height="10" rx="5" />
            <circle className="zh-hat-pom" cx="60" cy="5" r="6.5" />
        </g>
    );
    if (wear === 'bow') return (
        <g className="zh-wear zh-bow" transform="rotate(18 80 14)">
            <path className="zh-bow-loop" d="M80 14 L66 6 L67 22 Z M80 14 L94 6 L93 22 Z" />
            <circle className="zh-bow-knot" cx="80" cy="14" r="4" />
        </g>
    );
    if (wear === 'scarf') return (
        <g className="zh-wear zh-scarf">
            <path className="zh-scarf-band" d="M36 56 Q60 68 84 56 L86 64 Q60 77 34 64 Z" />
            <path className="zh-scarf-end" d="M72 66 L78 86 L88 84 L82 63 Z" />
            <path className="zh-scarf-stripe" d="M75 72 L84 70 M77 78 L86 76" />
        </g>
    );
    return null;
}

export default function SealArt({ look, girth }: { look: SealLook; girth: number }) {
    const shape = sealShape(girth);
    const spot = (x: number, y: number, r: number) => <ellipse className="zh-spot-fur" cx={x} cy={y} rx={r} ry={r * 0.8} />;
    const { hw } = shape;
    return (
        <svg className="zh-art" viewBox="0 0 120 104" aria-hidden style={{ '--fill': `var(--zh-fur-${look.fur})` } as CSSProperties}>
            <g transform={look.pup ? 'translate(60 104) scale(.86) translate(-60 -104)' : undefined}>
                <g className="zh-grow">
                    <path className="zh-tail" d={shape.tail} />
                    <path className="zh-body" d={shape.body} />
                    <ellipse className="zh-belly" cx="60" cy="84" rx={shape.belly.rx} ry={shape.belly.ry} />
                    {look.spots && <g>{spot(60 - hw * 0.62, 84, 3.4)}{spot(60 + hw * 0.66, 76, 4)}{spot(60 + hw * 0.5, 92, 2.8)}{spot(60 - hw * 0.4, 70, 2.6)}</g>}
                </g>
                {look.wear === 'scarf' && <Wear wear="scarf" />}
                <g className="zh-head">
                    <circle className="zh-skull" cx="60" cy="36" r="28" />
                    {look.spots && <g>{spot(78, 18, 3)}{spot(41, 22, 2.4)}</g>}
                    {look.pup && <path className="zh-tuft" d="M54 9 Q57 2 60 8 Q63 2 66 9" />}
                    <g className="zh-face">
                        <circle className="zh-cheek" cx="40" cy="44" r="5" />
                        <circle className="zh-cheek" cx="80" cy="44" r="5" />
                        <g className="zh-eyes-open">
                            <circle className="zh-eye" cx="48" cy="31" r={look.pup ? 6.4 : 5} />
                            <circle className="zh-eye" cx="72" cy="31" r={look.pup ? 6.4 : 5} />
                            <circle className="zh-glint" cx="50" cy="29" r={look.pup ? 2.4 : 1.8} />
                            <circle className="zh-glint" cx="74" cy="29" r={look.pup ? 2.4 : 1.8} />
                            {look.lashes && <path className="zh-lash" d="M42 27 L38 24 M44 25 L41 21 M78 27 L82 24 M76 25 L79 21" />}
                        </g>
                        {/* Fed: happy ^ ^ eyes; a wrong seal shuts them and looks away. */}
                        <path className="zh-eyes-happy" d="M42 33 Q48 25 54 33 M66 33 Q72 25 78 33" />
                        <path className="zh-eyes-shut" d="M42 31 Q48 36 54 31 M66 31 Q72 36 78 31" />
                        <ellipse className="zh-muzzle" cx="54" cy="44" rx="8" ry="6" />
                        <ellipse className="zh-muzzle" cx="66" cy="44" rx="8" ry="6" />
                        <ellipse className="zh-nose" cx="60" cy="39.5" rx="5" ry="3.5" />
                        <path className="zh-whisker" d={WHISKERS[look.whiskers]} />
                        <path className="zh-mouth" d="M55 51 Q60 55 65 51" />
                        <ellipse className="zh-mouth-open" cx="60" cy="52.5" rx="4.2" ry="3.4" />
                    </g>
                    {look.wear !== 'scarf' && <Wear wear={look.wear} />}
                </g>
                <g transform={`translate(${-shape.flip} 0)`}><path className="zh-flip zh-flip-l" d="M38 64 C26 70 18 80 20 88 C28 86 38 78 44 70 Z" /></g>
                <g transform={`translate(${shape.flip} 0)`}><path className="zh-flip zh-flip-r" d="M82 64 C94 70 102 80 100 88 C92 86 82 78 76 70 Z" /></g>
            </g>
        </svg>
    );
}
