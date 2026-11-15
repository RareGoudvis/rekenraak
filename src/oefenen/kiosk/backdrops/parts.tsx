import { useId, type CSSProperties, type ReactNode } from 'react';

// Shared pieces of the leerjaar scenes: the ground along the bottom and the corner drawings standing on it.
// Every scene keeps the middle of the screen sky; the drawings stay at the bottom corners and the far edges.

/** The ground: a wide hill across the bottom (stretched; the outline keeps its width). */
export function Ground({ back }: { back?: boolean }) {
    return (
        <svg className={`ks-ground${back ? ' is-back' : ''}`} viewBox="0 0 1180 100" preserveAspectRatio="none">
            <path d={back ? 'M0 30 Q 260 0 560 26 T 1180 16 V 104 H 0 Z' : 'M0 46 Q 320 14 640 40 T 1180 30 V 104 H 0 Z'} vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

/** A drawing standing on the ground in a bottom corner (240 × 240 units). */
export function Corner({ side, children }: { side: 'l' | 'r'; children: ReactNode }) {
    const id = useId();
    // Clipped just under the ground line, so a monster ducking behind its hill does not show below it.
    return (
        <svg className={`ks-corner ks-corner-${side}`} viewBox="0 0 240 240">
            <defs><clipPath id={id}><rect x="-400" y="-600" width="1040" height="844" /></clipPath></defs>
            <g clipPath={`url(#${id})`}>{children}</g>
        </svg>
    );
}

/** Something light in a top corner beside the title (a bee, a flake, a vine; 160 × 80 units), hidden on small screens. */
export function Air({ side, children }: { side: 'l' | 'r'; children: ReactNode }) {
    return <svg className={`ks-air ks-air-${side}`} viewBox="0 0 160 80">{children}</svg>;
}

/** The far distance at one edge (mountains, dunes, a tree line; 480 × 120 units), half hidden behind the back ground. */
export function Far({ side, children }: { side: 'l' | 'r'; children: ReactNode }) {
    return <svg className={`ks-far ks-far-${side}`} viewBox="0 0 480 120">{children}</svg>;
}

/** A hill in front of a corner drawing: filled like the ground, outlined only along its top. */
export function Hill({ d, top }: { d: string; top: string }) {
    return <><path className="ks-hill" d={d} /><path className="ks-hill-edge" d={top} /></>;
}

// Drawn twice, a solid outline underneath and the fills on top, so overlapping parts (an arm on a trunk, a neck on
// a body) merge into one figure with one outline instead of showing every seam.
export function Sticker({ children }: { children: ReactNode }) {
    return <g><g className="ks-under">{children}</g><g className="ks-over">{children}</g></g>;
}

/** Something crossing the whole width (a cloud, a bird, a tumbleweed); `at` is where it rests when motion is reduced. */
export function Trav({ vb, w, top, bottom, dur, delay = 0, at, rev, children }: {
    vb: string; w: string; top?: string; bottom?: string; dur: number; delay?: number; at: string; rev?: boolean; children: ReactNode;
}) {
    const style = { width: w, top, bottom, '--dur': `${dur}s`, '--delay': `${delay}s`, '--at': at } as CSSProperties;
    return <svg className={`ks-trav${rev ? ' is-rev' : ''}`} viewBox={vb} style={style}>{children}</svg>;
}

/** A soft cloud drifting across the sky. */
export function Cloud({ top, w, dur, delay, at }: { top: string; w: string; dur: number; delay: number; at: string }) {
    return (
        <Trav vb="0 0 120 50" w={w} top={top} dur={dur} delay={delay} at={at}>
            <Sticker>
                <ellipse className="ks-cloud" cx="60" cy="36" rx="50" ry="12" />
                <circle className="ks-cloud" cx="40" cy="28" r="15" />
                <circle className="ks-cloud" cx="66" cy="22" r="19" />
                <circle className="ks-cloud" cx="88" cy="30" r="12" />
            </Sticker>
            <path className="ks-shade" d="M14 40 Q60 52 106 40 Q100 48 60 48 Q22 48 14 40 Z" />
        </Trav>
    );
}
