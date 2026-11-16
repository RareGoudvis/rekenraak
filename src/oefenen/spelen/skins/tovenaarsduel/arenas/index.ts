import { createElement, useState, type ComponentType, type CSSProperties } from 'react';
import Lab from './Lab';
import Kerker from './Kerker';
import School from './School';
import { pickArena, readLastArena, saveLastArena, type ArenaArtProps, type ArenaKind, type ArenaSide } from './pick';
import './arenas.css';

// Tovenaarsduel's backdrops: a full-bleed layer behind the wizards. The floor line is y 560 of the 1600 x 700
// art; the art crops from the top on a wide band (xMidYMax slice). Every loop is CSS; a big hit (impact + 1)
// restarts the reactions through a parity class (is-p0 / is-p1, twin keyframes) and remounts the one-shots.

const ART: Record<ArenaKind, ComponentType<ArenaArtProps>> = { lab: Lab, kerker: Kerker, school: School };

export interface ArenaProps {
    kind: ArenaKind;
    // A counter the game raises on every big hit (Vuurbal, Bliksem).
    impact: number;
    // The side that was hit: its half of the arena reacts harder.
    side: ArenaSide;
}

const BOX: CSSProperties = { position: 'absolute', inset: 0, overflow: 'hidden' };

function Arena({ kind, impact, side }: ArenaProps) {
    const [seen, setSeen] = useState({ impact, kind });
    const [hit, setHit] = useState<{ n: number; side: ArenaSide }>({ n: 0, side: null });
    // Only a raise is a hit; a new arena starts calm (its elements would otherwise replay the last reaction).
    if (impact !== seen.impact || kind !== seen.kind) {
        setSeen({ impact, kind });
        if (kind !== seen.kind) setHit({ n: 0, side: null });
        else if (impact > seen.impact) setHit({ n: hit.n + 1, side });
    }
    const react = hit.n ? ` is-p${hit.n % 2} is-hit-${hit.side ?? 'mid'}` : '';
    return createElement('div', { className: `tva tva-${kind}${react}`, style: BOX, 'aria-hidden': true },
        createElement(ART[kind], { n: hit.n, side: hit.side }),
        // A warm flash over the half that was hit.
        hit.n > 0 && createElement('div', { key: hit.n, className: `tva-hitflash is-${hit.side ?? 'mid'}` }));
}

export default Arena;
export { pickArena, readLastArena, saveLastArena };
export type { ArenaKind, ArenaSide };
