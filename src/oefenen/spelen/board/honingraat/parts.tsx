import type { CSSProperties, ReactNode } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import type { BoardTarget, SpelBoard } from '../board';
import { Bee, type BeeMood } from './art';
import type { HiveView } from './hive';
import { HEX } from './view';

// What the comb and the meadow share: the target sign, the found pips, the bee that flies to each find.

export function Sign({ target, cleared, view }: { target: BoardTarget; cleared: boolean; view: HiveView }) {
    if (cleared) return <p className="hx-sign" aria-live="polite">{view === 'comb' ? 'Alle honing is binnen!' : 'Alle nectar is binnen!'}</p>;
    // A pack's comb (the breuken): its own words before the target.
    if (target.kind === 'pack') return <p className="hx-sign" aria-live="polite">{target.lead} <span className="hx-sign-n kiosk-math">{target.n}</span></p>;
    const n = <span className="hx-sign-n kiosk-math">{formatMathNumber(target.n)}</span>;
    return <p className="hx-sign" aria-live="polite">{target.kind === 'eq' ? <>Zoek alle sommen die {n} zijn</> : <>Zoek alle sommen groter dan {n}</>}</p>;
}

/** The sign and one pip per cell to find. */
export function Top({ board, view }: { board: SpelBoard; view: HiveView }) {
    const toFind = board.cells.filter(c => c.match);
    const found = toFind.filter(c => c.state === 'solved').length;
    return (
        <div className="hx-top">
            <Sign target={board.target!} cleared={found === toFind.length} view={view} />
            <span className="hx-count" role="img" aria-label={`${found} van ${toFind.length} gevonden`}>
                {toFind.map((c, i) => (
                    <svg key={i} className={`hx-pip${c.state === 'solved' ? ' is-on' : ''}`} viewBox="0 0 100 116" aria-hidden><polygon points={HEX} /></svg>
                ))}
            </span>
        </div>
    );
}

/** The player's bee, perched on its last find (or beside the board), facing the way it flew. */
export function BoardBee({ x, y, face, mood, landed, hidden, still, children }: {
    x: number; y: number; face: 1 | -1; mood: BeeMood; landed: boolean; hidden?: boolean; still: boolean; children?: ReactNode;
}) {
    return (
        <span className={`hx-bee${landed ? ' is-landed' : ''}${hidden ? ' is-gone' : ''}${still ? ' is-still' : ''}`} style={{ '--bx': x, '--by': y, '--face': face } as CSSProperties} aria-hidden>
            <span className="hx-bee-turn"><Bee mood={mood} /></span>
            {children}
        </span>
    );
}
