import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SkinEndingProps, SkinProps } from '../../skins/types';
import { mulberry32, seedOf } from '../../distractors';
import { Clouds } from '../../scene';
import type { BoardCell, SpelBoard } from '../board';
import { Bee, Branch, Crown, FrontFlowers, Hills, Wasp } from './art';
import Comb from './HoneyComb';
import Meadow from './Meadow';
import WaspChallenge from './WaspChallenge';
import QueenFight from './QueenFight';
import { viewAt, waspRule, waspSchedule, waspSums, type WaspRule, type WaspVerdict } from './hive';
import { bossDue, bossRule, bossSums, type BossRule, type BossVerdict } from './boss';
import type { SpelQuestion } from '../../spelQuestion';
import { levelOf } from '../../levels/levels';
import './honingraat.css';

// Honingraat (Lente): find every sum that makes the target, on a honeycomb, then in a flower meadow, then a
// comb again (hive.ts viewAt). A full board: the bee flies happily on while the scene scrolls to the next one.
// Normaal and up (options.niveau): after every meadow a wasp comes for the nest (WaspChallenge, hive.ts waspRule); it
// can claim the nest (onFail). Makkelijk has no wasp. Moeilijk and Onmogelijk end with the Wespenkoningin (QueenFight,
// boss.ts): the session keeps the full last board open (BoardRound.finale) until she flees (onFinish) or flies off
// with the honey (onFail). The session checks every cell.

// The scroll from one board to the next (honingraat.css hx-scroll lasts as long).
export const SCROLL_MS = 1500;

function BoardView(props: Parameters<typeof Comb>[0]) {
    return viewAt(props.board.index) === 'comb' ? <Comb {...props} /> : <Meadow {...props} />;
}

export default function Honingraat({ board, phase, onBoardPick, sound, options, progress, onFail, onFinish, onReport }: SkinProps) {
    const level = levelOf(options);
    const total = progress.board?.total ?? 3;
    const [schedule] = useState(() => waspSchedule(total));
    const [last, setLast] = useState(board ?? null);
    // The board the scene scrolls away from, while the next one comes in.
    const [leaving, setLeaving] = useState<SpelBoard | null>(null);
    // Every cell of the boards already played (the wasp's sums come from them).
    const [played, setPlayed] = useState<readonly BoardCell[]>([]);
    const [wasp, setWasp] = useState<{ seed: number; rule: WaspRule } | null>(null);
    // Battles fought so far (Onmogelijk's wasps grow with them).
    const [battles, setBattles] = useState(0);
    if ((board ?? null) !== last) {
        setLast(board ?? null);
        if (board && last && board.key !== last.key) {
            setLeaving(last);
            setPlayed(p => [...p, ...last.cells]);
            const rule = schedule.includes(board.index) ? waspRule(level, battles) : null;
            if (rule) { setWasp({ seed: seedOf(board.key), rule }); setBattles(battles + 1); }
        }
    }
    useEffect(() => {
        if (!leaving) return;
        const id = window.setTimeout(() => setLeaving(null), SCROLL_MS);
        return () => window.clearTimeout(id);
    }, [leaving]);
    // The queen: once the last board is full and the session waits (phase back to play after its pause).
    // Her sums are drawn once, when she comes: from every board played, the full last one included.
    const [boss, setBoss] = useState<{ seed: number; rule: BossRule; sums: SpelQuestion[]; pool: SpelQuestion[] } | null>(null);
    const queen = bossRule(level);
    if (!boss && queen && !wasp && !leaving && phase === 'play' && bossDue(board, total)) {
        const seed = seedOf(`${board.key}|koningin`);
        const cells = [...played, ...board.cells];
        setBoss({ seed, rule: queen, sums: bossSums(cells, mulberry32(seed), queen), pool: cells.map(c => c.question) });
    }
    const fail = useRef(onFail);
    const live = useRef({ onFinish, onReport });
    useEffect(() => { fail.current = onFail; live.current = { onFinish, onReport }; });
    const sums = useMemo(() => (wasp ? waspSums(played, mulberry32(wasp.seed), wasp.rule.sums) : []), [wasp, played]);
    const waspOn = !!wasp && !leaving && sums.length > 0;
    const waspDone = (v: WaspVerdict) => { if (v === 'claimed') fail.current(); else setWasp(null); };
    const bossDone = (v: BossVerdict) => {
        if (v === 'fled') { live.current.onFinish?.({ title: 'De koningin is gevlucht!' }); return; }
        // The end screen names her, not the wasp of the battles (the round's failTitle).
        live.current.onReport?.({ title: 'Oei! De koningin heeft de honing. Nog eens?' });
        fail.current();
    };
    const bossOn = !!boss && boss.sums.length > 0;

    const paused = phase === 'help';
    const active = !leaving && !wasp && !boss;
    return (
        <div className={`hx-root${paused ? ' is-paused' : ''}${leaving ? ' is-scrolling' : ''}`}>
            <span className="hx-sun" aria-hidden />
            <Clouds layer="far" outline={false} count={3} size={[90, 150]} band={[3, 20]} speed={110} seed={11} paused={paused} />
            <Clouds layer="near" count={2} size={[120, 180]} band={[6, 26]} speed={80} seed={4} paused={paused} />
            <span className="hx-ground" aria-hidden />
            {/* The far hills and the front flowers pan by a copy on each scroll (remounted, so it plays again). */}
            <span key={`h-${leaving?.key ?? 'rest'}`} className="hx-hills-wrap" aria-hidden><Hills /></span>
            <span key={`f-${leaving?.key ?? 'rest'}`} className="hx-front-wrap" aria-hidden><FrontFlowers /></span>
            <div className="hx-views">
                {leaving && (
                    <div key={leaving.key} className="hx-view is-leaving" inert>
                        <BoardView board={leaving} phase={phase} sound={sound} active={false} leaving />
                    </div>
                )}
                {board?.target && (
                    <div key={board.key} className={`hx-view${leaving ? ' is-entering' : ''}${waspOn || bossOn ? ' is-under-attack' : ''}`} inert={!active}>
                        <BoardView board={board} phase={phase} onBoardPick={onBoardPick} sound={sound} active={active} />
                    </div>
                )}
            </div>
            {leaving && <span className="hx-traveller" aria-hidden><span className="hx-traveller-loop"><Bee mood="happy" /></span></span>}
            {bossOn && <QueenFight sums={boss.sums} rule={boss.rule} pool={boss.pool} seed={boss.seed} paused={paused} onDone={bossDone} />}
            {waspOn && <WaspChallenge sums={sums} rule={{ ...wasp.rule, sums: sums.length, need: Math.min(wasp.rule.need, sums.length) }} pool={played.map(c => c.question)} seed={wasp.seed} sound={sound} paused={paused} onDone={waspDone} />}
        </div>
    );
}

/** The end screen's picture: a full comb with dancing bees (and the queen's lost crown), or the wasp on the nest, bees peeking. */
export function HoningraatEnding({ outcome, options }: SkinEndingProps) {
    const claimed = outcome === 'failed';
    // A won round on a queen's level means she fled: her crown lies in the grass.
    const crown = !claimed && bossRule(levelOf(options)) !== null;
    return (
        <div className={`spel-ending hx-ending${claimed ? ' is-claimed' : ' is-party'}`} aria-hidden>
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
            {crown && <span className="hx-ending-crown"><Crown /></span>}
        </div>
    );
}
