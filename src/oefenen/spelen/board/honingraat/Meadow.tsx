import { useSyncExternalStore, type CSSProperties } from 'react';
import { Burst } from '../../scene';
import { FlowerHead, FlowerStem, PETALS, Skep } from './art';
import { meadowLayout } from './comb';
import { BoardBee, CellTexts, Top } from './parts';
import { BEE_START, boardChars, cellTexts, usePicks, type ViewProps } from './view';

// The flower meadow board (every second board): the same cells as flowers on a grassy hill, on a clear grid with a gap
// between every two heads. A right flower opens and gives a drop of nectar (the bee visits), a wrong one droops and
// shows its own answer under the sum, inside its heart.

// A phone held upright gets rows of 3 and 2 (comb.ts meadowLayout); honingraat.css sizes the flowers to match.
const PORTRAIT = '(orientation: portrait)';
const onOrientation = (cb: () => void) => {
    const mq = window.matchMedia?.(PORTRAIT);
    mq?.addEventListener('change', cb);
    return () => mq?.removeEventListener('change', cb);
};
const usePortrait = () => useSyncExternalStore(onOrientation, () => window.matchMedia?.(PORTRAIT).matches ?? false, () => false);

export default function Meadow({ board, phase, onBoardPick, reducedMotion, active, leaving }: ViewProps) {
    const layout = meadowLayout(board.cells.length, usePortrait());
    const { beeAt, face, fresh } = usePicks(board, i => layout.cells[i]);
    const toFind = board.cells.filter(c => c.match);
    const cleared = toFind.every(c => c.state === 'solved');
    const pick = (i: number) => {
        if (!active || phase !== 'play' || board.cells[i].state !== 'open') return;
        onBoardPick?.(i, '');
    };
    const start = { x: BEE_START.x, y: layout.height / 2 };
    // The bee hovers just above a flower's heart, drinking.
    // honingraat.css perches a landed bee at (x + .36, y − .5): here that is on the flower's upper petals.
    const bee = beeAt !== null ? { x: layout.cells[beeAt].x - 0.1, y: layout.cells[beeAt].y + 0.1 } : start;
    const at = (i: number) => ({ x: `calc(${layout.cells[i].x} * var(--hx-w))`, y: `calc(${layout.cells[i].y} * var(--hx-w))` });
    return (
        <>
            <Top board={board} view="meadow" />
            <div className="hx-comb-wrap">
                <div className={`hx-meadow${cleared ? ' is-cleared' : ''}`} role="group" aria-label="Bloemenweide"
                    style={{ '--hx-cols': layout.width, '--hx-rows-h': layout.height, '--hx-chars': boardChars(board) } as CSSProperties}>
                    <span className="hx-skep-wrap" aria-hidden><Skep /></span>
                    <span className="hx-hill-bed" aria-hidden />
                    {board.cells.map((c, i) => {
                        const { x, y } = layout.cells[i];
                        const { sum, own, showOwn, label } = cellTexts(board, i, 'nectar');
                        const state = c.state === 'solved' ? ' is-open' : c.state === 'missed' ? ' is-wilted' : '';
                        return (
                            <button key={`${board.key}-${i}`} type="button" className={`hx-flower${state}${fresh === i ? ' is-wilting' : ''}`}
                                style={{ '--x': x, '--y': y, '--i': i } as CSSProperties}
                                disabled={!active || phase !== 'play' || c.state !== 'open'} onClick={() => pick(i)} aria-label={label}>
                                <span className="hx-stem-wrap" aria-hidden><FlowerStem flip={i % 2 === 1} /></span>
                                <span className="hx-flower-art">
                                    <FlowerHead tone={(i * 3) % PETALS} />
                                    <CellTexts sum={sum} own={showOwn ? own : undefined} />
                                </span>
                                {c.state === 'solved' && <span className="hx-nectar" aria-hidden />}
                            </button>
                        );
                    })}
                    <BoardBee x={bee.x} y={bee.y} face={face} mood={fresh !== null ? 'worried' : cleared ? 'happy' : 'busy'} landed={beeAt !== null} hidden={leaving} still={reducedMotion} />
                    {beeAt !== null && <Burst key={`nectar-${beeAt}`} kind="sparkle" {...at(beeAt)} spread={70} count={8} seed={beeAt + 4} reducedMotion={reducedMotion} />}
                </div>
            </div>
        </>
    );
}
