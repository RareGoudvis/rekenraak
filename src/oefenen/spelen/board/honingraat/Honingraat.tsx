import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SkinEndingProps, SkinProps } from '../../skins/types';
import { mulberry32, seedOf } from '../../distractors';
import { Clouds } from '../../scene';
import type { BoardCell, SpelBoard } from '../board';
import { Bee, Branch, FrontFlowers, Hills, Wasp } from './art';
import Comb from './HoneyComb';
import Meadow from './Meadow';
import WaspChallenge from './WaspChallenge';
import { viewAt, waspSchedule, waspSums, type WaspVerdict } from './hive';
import './honingraat.css';

// Honingraat (Lente): find every sum that makes the target, on a honeycomb, then in a flower meadow, then a
// comb again (hive.ts viewAt). A full board: the bee flies happily on while the scene scrolls to the next one.
// Moeilijk (options.niveau): now and then a wasp comes for the nest before a comb (WaspChallenge); it can
// claim the nest (onFail). The session checks every cell; reduced motion: no scroll, no loops, instant states.

// The scroll from one board to the next (honingraat.css hx-scroll lasts as long).
export const SCROLL_MS = 1500;

function BoardView(props: Parameters<typeof Comb>[0]) {
    return viewAt(props.board.index) === 'comb' ? <Comb {...props} /> : <Meadow {...props} />;
}

export default function Honingraat({ board, phase, onBoardPick, reducedMotion, sound, options, progress, onFail }: SkinProps) {
    const hard = options.niveau === 'moeilijk';
    const [schedule] = useState(() => waspSchedule(progress.board?.total ?? 3, mulberry32(seedOf(board?.key ?? 'honing'))));
    const [last, setLast] = useState(board ?? null);
    // The board the scene scrolls away from, while the next one comes in.
    const [leaving, setLeaving] = useState<SpelBoard | null>(null);
    // Every cell of the boards already played (the wasp's sums come from them).
    const [played, setPlayed] = useState<readonly BoardCell[]>([]);
    const [wasp, setWasp] = useState<{ seed: number } | null>(null);
    if ((board ?? null) !== last) {
        setLast(board ?? null);
        if (board && last && board.key !== last.key) {
            if (!reducedMotion) setLeaving(last);
            setPlayed(p => [...p, ...last.cells]);
            if (hard && schedule.includes(board.index)) setWasp({ seed: seedOf(board.key) });
        }
    }
    useEffect(() => {
        if (!leaving) return;
        const id = window.setTimeout(() => setLeaving(null), SCROLL_MS);
        return () => window.clearTimeout(id);
    }, [leaving]);
    const fail = useRef(onFail);
    useEffect(() => { fail.current = onFail; });
    const sums = useMemo(() => (wasp ? waspSums(played, mulberry32(wasp.seed)) : []), [wasp, played]);
    const waspOn = !!wasp && !leaving && sums.length > 0;
    const waspDone = (v: WaspVerdict) => { if (v === 'claimed') fail.current(); else setWasp(null); };

    const paused = phase === 'help';
    const active = !leaving && !wasp;
    return (
        <div className={`hx-root${paused ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${leaving ? ' is-scrolling' : ''}`}>
            <span className="hx-sun" aria-hidden />
            <Clouds layer="far" outline={false} count={3} size={[90, 150]} band={[3, 20]} speed={110} seed={11} paused={paused} reducedMotion={reducedMotion} />
            <Clouds layer="near" count={2} size={[120, 180]} band={[6, 26]} speed={80} seed={4} paused={paused} reducedMotion={reducedMotion} />
            <span className="hx-ground" aria-hidden />
            {/* The far hills and the front flowers pan by a copy on each scroll (remounted, so it plays again). */}
            <span key={`h-${leaving?.key ?? 'rest'}`} className="hx-hills-wrap" aria-hidden><Hills /></span>
            <span key={`f-${leaving?.key ?? 'rest'}`} className="hx-front-wrap" aria-hidden><FrontFlowers /></span>
            <div className="hx-views">
                {leaving && (
                    <div key={leaving.key} className="hx-view is-leaving" inert>
                        <BoardView board={leaving} phase={phase} reducedMotion={reducedMotion} sound={sound} active={false} leaving />
                    </div>
                )}
                {board?.target && (
                    <div key={board.key} className={`hx-view${leaving ? ' is-entering' : ''}${waspOn ? ' is-under-attack' : ''}`} inert={!active}>
                        <BoardView board={board} phase={phase} onBoardPick={onBoardPick} reducedMotion={reducedMotion} sound={sound} active={active} />
                    </div>
                )}
            </div>
            {leaving && <span className="hx-traveller" aria-hidden><span className="hx-traveller-loop"><Bee mood="happy" /></span></span>}
            {waspOn && <WaspChallenge sums={sums} pool={played.map(c => c.question)} seed={wasp.seed} reducedMotion={reducedMotion} sound={sound} paused={paused} onDone={waspDone} />}
        </div>
    );
}

/** The end screen's picture: a full comb with dancing bees, or the wasp sitting on the nest, bees peeking. */
export function HoningraatEnding({ outcome, reducedMotion }: SkinEndingProps) {
    const claimed = outcome === 'failed';
    return (
        <div className={`spel-ending hx-ending${claimed ? ' is-claimed' : ' is-party'}${reducedMotion ? ' is-still' : ''}`} aria-hidden>
            <span className="hx-ending-branch"><Branch /></span>
            <svg className="hx-ending-comb" viewBox="0 0 220 170">
                <path className="hx-slab-wax" d="M30 10 L190 10 C210 10 214 30 214 60 C214 130 160 166 110 166 C60 166 6 130 6 60 C6 30 10 10 30 10 Z" />
                {[[60, 50], [110, 50], [160, 50], [85, 93], [135, 93], [60, 136], [110, 136], [160, 136], [35, 93], [185, 93]].map(([x, y], i) => (
                    <polygon key={i} className={`hx-ending-cell${claimed && i % 3 === 0 ? ' is-empty' : ''}`} transform={`translate(${x - 25} ${y - 28.9}) scale(.5)`} points="50,2 98,29.7 98,85.8 50,113.5 2,85.8 2,29.7" />
                ))}
                <path className="hx-slab-rim" d="M30 10 L190 10 C210 10 214 30 214 60 C214 130 160 166 110 166 C60 166 6 130 6 60 C6 30 10 10 30 10 Z" />
            </svg>
            {claimed ? (
                <>
                    <span className="hx-ending-wasp"><Wasp mood="grin" /></span>
                    {[0, 1].map(i => <span key={i} className="hx-ending-bee is-peek" style={{ '--e': i } as CSSProperties}><span className="hx-bee-turn"><Bee mood="worried" /></span></span>)}
                </>
            ) : (
                [0, 1, 2].map(i => <span key={i} className="hx-ending-bee" style={{ '--e': i } as CSSProperties}><span className="hx-bee-turn"><Bee mood="happy" pollen={i === 1} /></span></span>)
            )}
        </div>
    );
}
