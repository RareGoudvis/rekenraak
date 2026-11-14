import type { ReactNode } from 'react';

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
    return <svg className={`ks-corner ks-corner-${side}`} viewBox="0 0 240 240">{children}</svg>;
}

/** Something light in a top corner beside the title (a bee, a flake, a vine; 160 × 80 units), hidden on small screens. */
export function Air({ side, children }: { side: 'l' | 'r'; children: ReactNode }) {
    return <svg className={`ks-air ks-air-${side}`} viewBox="0 0 160 80">{children}</svg>;
}

/** A hill in front of a corner drawing: filled like the ground, outlined only along its top. */
export function Hill({ d, top }: { d: string; top: string }) {
    return <><path className="ks-hill" d={d} /><path className="ks-hill-edge" d={top} /></>;
}
