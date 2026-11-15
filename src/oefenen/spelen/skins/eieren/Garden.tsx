import type { CSSProperties } from 'react';
import { Clouds } from '../../scene';

// The spring garden behind the eggs: clouds, a fence, a tree, bushes with a bunny peeking out, flowers,
// butterflies. Decorative only (no numbers, no pointer events); moves in CSS and stands still under reduced motion.

const PICKET = 'M6 58 V20 L21 6 L36 20 V58 Z';

function Fence() {
    return (
        <svg className="egg-fence" aria-hidden>
            <defs>
                <pattern id="egg-picket" width="44" height="58" patternUnits="userSpaceOnUse">
                    <rect className="egg-rail" x="-2" y="26" width="48" height="8" />
                    <rect className="egg-rail" x="-2" y="44" width="48" height="8" />
                    <path className="egg-picket" d={PICKET} />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#egg-picket)" />
        </svg>
    );
}

function Tree() {
    return (
        <svg className="egg-tree" viewBox="0 0 120 160" aria-hidden>
            <path className="egg-trunk" d="M50 158 L54 80 L70 80 L76 158 Z" />
            <path className="egg-trunk-line" d="M62 100 L62 130" />
            <g className="egg-crown">
                <circle cx="60" cy="48" r="34" /><circle cx="30" cy="66" r="26" /><circle cx="92" cy="66" r="26" /><circle cx="60" cy="78" r="26" />
            </g>
            <circle className="egg-blossom" cx="44" cy="40" r="5" /><circle className="egg-blossom" cx="76" cy="52" r="5" />
            <circle className="egg-blossom" cx="36" cy="72" r="5" /><circle className="egg-blossom" cx="88" cy="78" r="5" /><circle className="egg-blossom" cx="62" cy="68" r="5" />
        </svg>
    );
}

function Bush({ className }: { className: string }) {
    return (
        <svg className={`egg-bush ${className}`} viewBox="0 0 120 60" aria-hidden>
            <g className="egg-bush-body"><circle cx="30" cy="38" r="22" /><circle cx="62" cy="30" r="27" /><circle cx="94" cy="39" r="21" /><rect x="10" y="40" width="102" height="18" rx="9" /></g>
            <circle className="egg-blossom" cx="40" cy="30" r="4" /><circle className="egg-blossom" cx="78" cy="22" r="4" /><circle className="egg-blossom" cx="100" cy="42" r="4" /><circle className="egg-blossom" cx="58" cy="46" r="4" />
        </svg>
    );
}

function Bunny() {
    return (
        <svg className="egg-bunny" viewBox="0 0 60 70" aria-hidden>
            <g className="egg-ear egg-ear-l"><ellipse cx="20" cy="18" rx="7" ry="17" /><ellipse className="egg-ear-in" cx="20" cy="19" rx="3" ry="11" /></g>
            <g className="egg-ear egg-ear-r"><ellipse cx="40" cy="18" rx="7" ry="17" /><ellipse className="egg-ear-in" cx="40" cy="19" rx="3" ry="11" /></g>
            <ellipse className="egg-bunny-head" cx="30" cy="48" rx="21" ry="19" />
            <circle className="egg-bunny-eye" cx="22" cy="46" r="2.8" /><circle className="egg-bunny-eye" cx="38" cy="46" r="2.8" />
            <path className="egg-bunny-nose" d="M27 52 L33 52 L30 56 Z" />
            <path className="egg-bunny-mouth" d="M30 56 Q26 61 23 58 M30 56 Q34 61 37 58" />
        </svg>
    );
}

function Flower({ k }: { k: number }) {
    return (
        <svg className="egg-flower" viewBox="0 0 40 60" aria-hidden style={{ '--k': k } as CSSProperties}>
            <path className="egg-stem" d="M20 58 Q18 40 20 26" />
            <path className="egg-leaf" d="M20 46 Q10 40 8 46 Q14 52 20 46 Z" />
            <g className="egg-petals" style={{ fill: `var(--spel-fill-${k % 6})` }}>
                {[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="20" cy="12" rx="6" ry="9" transform={`rotate(${a} 20 22)`} />)}
            </g>
            <circle className="egg-heart" cx="20" cy="22" r="6" />
        </svg>
    );
}

function Butterfly({ k }: { k: number }) {
    return (
        <span className={`egg-fly egg-fly-${k}`} aria-hidden>
            <svg viewBox="0 0 40 30">
                <g className="egg-wing egg-wing-l"><ellipse cx="12" cy="11" rx="10" ry="9" /><ellipse cx="14" cy="22" rx="7" ry="6" /></g>
                <g className="egg-wing egg-wing-r"><ellipse cx="28" cy="11" rx="10" ry="9" /><ellipse cx="26" cy="22" rx="7" ry="6" /></g>
                <path className="egg-fly-body" d="M20 6 L20 26" />
            </svg>
        </span>
    );
}

/** Everything behind the grass line (sky, fence, tree, bushes, bunny). */
export function GardenBack({ reducedMotion, paused }: { reducedMotion: boolean; paused: boolean }) {
    return (
        <>
            <Clouds layer="far" outline={false} count={3} band={[2, 22]} seed={11} reducedMotion={reducedMotion} paused={paused} />
            <Clouds layer="near" count={2} band={[6, 20]} size={[70, 120]} seed={5} reducedMotion={reducedMotion} paused={paused} />
            <Tree />
            <Fence />
            <Bush className="egg-bush-a" />
            <div className="egg-peek"><Bunny /><Bush className="egg-bush-b" /></div>
        </>
    );
}

/** Flowers in the front and butterflies over the field. */
export function GardenFront() {
    return (
        <>
            <div className="egg-flowers">{[0, 1, 2, 3, 4, 5, 6].map(k => <Flower key={k} k={k} />)}</div>
            <Butterfly k={0} />
            <Butterfly k={1} />
        </>
    );
}
