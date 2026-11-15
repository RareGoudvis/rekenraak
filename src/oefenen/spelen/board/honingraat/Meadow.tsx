import type { CSSProperties } from 'react';
import { Burst } from '../../scene';
import { FlowerHead, PETALS, Skep } from './art';
import { combLayout } from './comb';
import { BoardBee, Top } from './parts';
import { BEE_START, cellTexts, usePicks, type ViewProps } from './view';

// The flower meadow board (every second board): the same cells as flowers in a raised bed. A right flower
// opens and gives a drop of nectar (the bee visits), a wrong one wilts and shows its own answer.

const U = 100;
// The bed's edge and the ground the stems grow from, in cell widths (the heads sit on the comb's grid).
const BED = { side: 0.45, top: 0.25, ground: 0.5 } as const;
// A wilted head hangs this far over (cell widths), as honingraat.css moves it.
const DROOP = { x: 0.04, y: 0.22 } as const;

function Bed({ cells, cols, rowsH, wilted }: { cells: { x: number; y: number }[]; cols: number; rowsH: number; wilted: readonly boolean[] }) {
    const L = -BED.side * U, R = (cols + BED.side) * U, G = (rowsH + BED.ground) * U;
    const box = { x: L - 6, y: -10, w: R - L + 12, h: G + 40 };
    // A low mound of grass the stems grow out of, rounded over the top.
    const T = (rowsH - BED.top) * U, cx = (L + R) / 2;
    const mound = `M${L} ${G + 20} C${L} ${T + 40} ${L + 80} ${T} ${cx} ${T - 6} C${R - 80} ${T} ${R} ${T + 40} ${R} ${G + 20} Z`;
    return (
        <svg className="hx-bed-art" viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} aria-hidden
            style={{ '--bl': -box.x / U, '--bt': -box.y / U, '--bw': box.w / U, '--bh': box.h / U } as CSSProperties}>
            <path className="hx-bed-ground" d={mound} />
            {cells.map((c, i) => {
                const x = c.x * U, y = c.y * U;
                const ground = G - 4 - (i % 3) * 8;
                const stem = wilted[i]
                    ? `M${x} ${ground} C${x} ${ground - 70} ${x - 6} ${y + 30} ${x + DROOP.x * U} ${y + DROOP.y * U + 26}`
                    : `M${x} ${ground} C${x + 6} ${ground - 40} ${x - 6} ${y + 60} ${x} ${y + 30}`;
                const mid = y + 30 + (ground - y - 30) * 0.55;
                return (
                    <g key={i} className={`hx-plant${wilted[i] ? ' is-wilted' : ''}`}>
                        <path className="hx-stem-rim" d={stem} />
                        <path className="hx-stem" d={stem} />
                        <path className="hx-stem-leaf" d={`M${x} ${mid} C${x + 10} ${mid - 22} ${x + 34} ${mid - 24} ${x + 44} ${mid - 12} C${x + 30} ${mid + 2} ${x + 12} ${mid + 4} ${x} ${mid} Z`}
                            transform={i % 2 ? `translate(${2 * x} 0) scale(-1 1)` : undefined} />
                    </g>
                );
            })}
        </svg>
    );
}

export default function Meadow({ board, phase, onBoardPick, reducedMotion, active, leaving }: ViewProps) {
    const layout = combLayout(board.cells.length);
    const { beeAt, face, fresh } = usePicks(board, i => layout.cells[i]);
    const toFind = board.cells.filter(c => c.match);
    const cleared = toFind.every(c => c.state === 'solved');
    const long = board.cells.some((_, i) => cellTexts(board, i, '').sum.length > 7);
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
                <div className={`hx-meadow${cleared ? ' is-cleared' : ''}${long ? ' is-long' : ''}`} role="group" aria-label="Bloemenweide"
                    style={{ '--hx-cols': layout.width, '--hx-rows-h': layout.height } as CSSProperties}>
                    <span className="hx-skep-wrap" aria-hidden><Skep /></span>
                    <Bed cells={layout.cells} cols={layout.width} rowsH={layout.height} wilted={board.cells.map(c => c.state === 'missed')} />
                    {board.cells.map((c, i) => {
                        const { x, y } = layout.cells[i];
                        const { sum, own, showOwn, label } = cellTexts(board, i, 'nectar');
                        const state = c.state === 'solved' ? ' is-open' : c.state === 'missed' ? ' is-wilted' : '';
                        return (
                            <button key={`${board.key}-${i}`} type="button" className={`hx-flower${state}${fresh === i ? ' is-wilting' : ''}`}
                                style={{ '--x': x, '--y': y, '--i': i, '--droop-x': DROOP.x, '--droop-y': DROOP.y } as CSSProperties}
                                disabled={!active || phase !== 'play' || c.state !== 'open'} onClick={() => pick(i)} aria-label={label}>
                                <span className="hx-flower-art">
                                    <FlowerHead tone={(i * 3) % PETALS} />
                                    <span className="hx-sum kiosk-math" aria-hidden>{sum}</span>
                                    {showOwn && <span className="hx-own kiosk-math" aria-hidden>= {own}</span>}
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
