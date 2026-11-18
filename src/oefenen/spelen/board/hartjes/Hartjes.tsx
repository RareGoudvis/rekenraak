import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import type { SkinEndingProps, SkinProps } from '../../skins/types';
import { mulberry32, seedOf } from '../../distractors';
import { answerFace, cardLines, isLoneBreuk, isWordCard, lineChars, sumFace, type BoardFace, type SpelBoard } from '../board';
import { SpelText, SpelVisual } from '../../SpelVisual';
import { Burst } from '../../scene';
import { BallArt, CountMark, GoalNet, HEART, HeartArt, KickBall } from './Art';
import { cardLook, gridOf, guessesLeft, pairMomentAt, PAIR_HIT_MS, PAIR_MOMENT_MS, PAIR_TAIL_MS, PAIRS_WRONG_MAX, type CardLook, type HartjesLook, type MomentBox } from './hearts';
import { levelOf, type Level } from '../../levels/levels';
import './hartjes.css';

// The pairs games: memory. Each sum and its answer lie face down on two hearts (Hartjes koppelen, Valentijn) or two
// footballs (Voetbalkaartjes, board/voetbalkaartjes/); tap two to turn them. A sum with its own answer stays open and
// gets a short moment: the two cards fly together into one big heart that bursts into little hearts, or into a ball
// that bounces off into a net. Any other two turn back after a moment. A sum logged as a mistake breaks its heart
// (a flat ball) for the rest of the board; pairing it later sticks a plaster on. The session checks every pick and
// keeps the mistakes (board/session.ts); this only turns cards. 3D flips in CSS. Onmogelijk: a board allows
// PAIRS_WRONG_MAX wrong guesses (two cards turned that are no pair); the last one ends the round, friendly (onFail).

// Long enough to read both cards, short enough to keep the game going.
const FLIP_BACK_MS = 1200;
// A mistake's puff of smoke (a ball going flat).
const PUFF_MS = 900;
// The little hearts the big heart bursts into: direction (deg), distance (card widths), size; stars in between.
const MINIS = [[-90, .95, 1], [-38, 1.05, .8], [12, .9, 1], [62, 1, .75], [118, .95, .9], [168, 1.05, .8], [212, .9, 1], [262, .75, .7]] as const;
const STAR = 'M50 2 L61 36 L96 47 L61 58 L50 92 L39 58 L4 47 L39 36 Z';

// A card = one side of one sum: id = cell * 2 (the sum) or cell * 2 + 1 (its answer).
const cellOf = (id: number) => id >> 1;
const isSum = (id: number) => id % 2 === 0;

function shuffled(n: number, key: string): number[] {
    const rng = mulberry32(seedOf(key));
    const out = Array.from({ length: n }, (_, i) => i);
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const faceText = (face: BoardFace) => (face.kind === 'text' ? face.text : face.label);

// A sum or answer as text, or a pack's picture (a breuk as a pizza) through the shared <SpelVisual>.
function Face({ face }: { face: BoardFace }) {
    if (face.kind === 'picture') return <span className={`hj-pic is-${face.visual.kind}`}><SpelVisual visual={face.visual} /></span>;
    // A long sum stands as a column sum ("5 918" over "− 2 499"); a breuk stacks.
    return <span className={`hj-text kiosk-math${isLoneBreuk(face.text) ? ' is-breuk' : ''}${isWordCard(face.text) ? ' is-words' : ''}`}>{cardLines(face.text).map((l, i) => <span key={i} className="hj-line"><SpelText text={l} /></span>)}</span>;
}

interface CardProps { id: number; board: SpelBoard; ball: boolean; up: boolean; nope: boolean; onTap(): void; disabled: boolean; merging: boolean; puff: boolean }

function Card({ id, board, ball, up, nope, onTap, disabled, merging, puff }: CardProps) {
    const cell = board.cells[cellOf(id)];
    const q = cell.question;
    const solved = cell.state === 'solved';
    const open = up || solved;
    const face = isSum(id) ? sumFace(q) : answerFace(q);
    // Only the sum's card carries its mistake: the answer card was never wrong.
    const look: CardLook = isSum(id) ? cardLook(cell) : 'whole';
    const Art = ball ? BallArt : HeartArt;
    const closed = ball ? 'Bal, dicht' : 'Hartje, dicht';
    const label = solved ? `${faceText(sumFace(q))} is ${faceText(answerFace(q))}, gevonden` : open ? faceText(face) : closed;
    return (
        <button type="button" className={`hj-card${open ? ' is-open' : ''}${solved ? ' is-solved' : ''}${isSum(id) ? ' is-sum' : ' is-answer'} is-${look}${nope ? ' is-nope' : ''}${merging ? ' is-merging' : ''}`}
            onClick={onTap} disabled={disabled || open} aria-label={label} data-cell={cellOf(id)}>
            <span className="hj-flip">
                <span className="hj-side hj-back" aria-hidden><Art side="back" look={look} /></span>
                <span className="hj-side hj-front" aria-hidden>
                    <Art side="front" look={look} />
                    <Face face={face} />
                </span>
            </span>
            {puff && <Burst kind="smoke" x="50%" y="30%" spread={40} count={6} seed={id + 3} />}
        </button>
    );
}

// The face a flying card carries: the found card's own front, open and coloured as found.
function Ghost({ id, board, ball, side }: { id: number; board: SpelBoard; ball: boolean; side: 'a' | 'b' }) {
    const q = board.cells[cellOf(id)].question;
    const Art = ball ? BallArt : HeartArt;
    return (
        <span className={`hj-ghost is-${side}`}>
            <span className="hj-card is-solved"><Art side="front" look="whole" /><Face face={isSum(id) ? sumFace(q) : answerFace(q)} /></span>
        </span>
    );
}

const px = (v: number) => `${Math.round(v)}px`;

/** A found pair's moment over the board: both cards fly together, then a heart bursts or a ball bounces into a net. Never blocks a tap. */
function PairMoment({ cell, board, ball, grid, sound }: { cell: number; board: SpelBoard; ball: boolean; grid: RefObject<HTMLDivElement | null>; sound: RefObject<SkinProps['sound']> }) {
    const ref = useRef<HTMLDivElement>(null);
    const [hit, setHit] = useState(false);
    // Measured before the first paint: the two cards' places in the board decide every path (CSS variables).
    useLayoutEffect(() => {
        const box = grid.current, el = ref.current;
        const card = (side: string) => box?.querySelector<HTMLElement>(`.hj-slot [data-cell="${cell}"].is-${side}`);
        const sum = card('sum'), ans = card('answer');
        if (!box || !el || !sum || !ans) return;
        const o = box.getBoundingClientRect();
        const rel = (r: DOMRect): MomentBox => ({ x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height });
        const at = pairMomentAt(rel(sum.getBoundingClientRect()), rel(ans.getBoundingClientRect()), { w: o.width, h: o.height });
        // The two cards meet side by side, each keeping its own side (they never cross).
        const off = (at.a[0] <= at.b[0] ? -1 : 1) * .2 * sum.getBoundingClientRect().width;
        const vars: Record<string, number> = { ax: at.a[0], ay: at.a[1], bx: at.b[0], by: at.b[1], mx: at.mid[0], my: at.mid[1], nx: at.net[0], ny: at.net[1], oa: off, ob: -off };
        for (const [k, v] of Object.entries(vars)) el.style.setProperty(`--${k}`, px(v));
        el.classList.toggle('is-net-left', at.netLeft);
    }, [cell, grid]);
    useEffect(() => {
        const t = window.setTimeout(() => { setHit(true); sound.current('launch'); }, PAIR_HIT_MS);
        return () => window.clearTimeout(t);
    }, [sound]);
    return (
        <div ref={ref} className={`hj-moment${ball ? ' is-ball' : ' is-heart'}`} aria-hidden>
            <Ghost id={cell * 2} board={board} ball={ball} side="a" />
            <Ghost id={cell * 2 + 1} board={board} ball={ball} side="b" />
            {ball ? (
                <>
                    <span className="hj-net"><GoalNet part="back" /></span>
                    <span className="hj-kick"><span className="hj-kick-arc"><KickBall /></span></span>
                    <span className="hj-net"><GoalNet part="front" /></span>
                    {hit && <Burst kind="pieces" x="var(--nx)" y="var(--ny)" spread={120} count={20} seed={cell + 5} />}
                    {hit && <p className="hj-goal">Goal!</p>}
                </>
            ) : (
                <>
                    <svg className="hj-big" viewBox="0 0 100 94"><path d={HEART} /><path className="hj-big-shine" d="M22 26 Q26 14 38 13" /></svg>
                    {MINIS.map(([deg, far, size], i) => (
                        <svg key={i} className={`hj-mini${i % 2 ? ' is-star' : ''}`} viewBox="0 0 100 94"
                            style={{ '--dx': Math.cos((deg * Math.PI) / 180) * far, '--dy': Math.sin((deg * Math.PI) / 180) * far, '--s': size, '--i': i } as CSSProperties}>
                            <path d={i % 2 ? STAR : HEART} />
                        </svg>
                    ))}
                    {hit && <Burst kind="sparkle" x="var(--mx)" y="var(--my)" spread={90} count={10} seed={cell + 2} />}
                </>
            )}
        </div>
    );
}

// Onmogelijk's wrong guesses left on this board: a small pill beside the pairs found; it shakes on each one.
function Tries({ left, ball }: { left: number; ball: boolean }) {
    return (
        <span key={left} className={`hj-tries${left <= 3 ? ' is-low' : ''}${left < PAIRS_WRONG_MAX ? ' is-hit' : ''}`} role="status" aria-label={`Nog ${left} ${left === 1 ? 'kans' : 'kansen'}`}>
            <CountMark ball={ball} on />
            <span aria-hidden>Nog <b>{left}</b> {left === 1 ? 'kans' : 'kansen'}</span>
        </span>
    );
}

interface BoardProps extends Pick<SkinProps, 'phase' | 'onBoardPick' | 'onBoardFocus' | 'sound' | 'onFail'> { board: SpelBoard; ball: boolean; top?: ReactNode; level: Level }

function HartjesBoard({ board, phase, onBoardPick, onBoardFocus, sound, onFail, ball, top, level }: BoardProps) {
    const order = useMemo(() => shuffled(board.cells.length * 2, board.key), [board.key, board.cells.length]);
    // The cards turned up and not yet paired (at most two).
    const [up, setUp] = useState<number[]>([]);
    // The sum whose pair was just found: its moment plays (keyed by the pair, so a quick second pair starts its own).
    const [flourish, setFlourish] = useState<number | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const [puff, setPuff] = useState<number | null>(null);
    // Two cards turned that were no pair, on this board (the component is keyed per board).
    const [wrongs, setWrongs] = useState(0);
    const left = guessesLeft(level, wrongs);
    const solved = (id: number) => board.cells[cellOf(id)].state === 'solved';
    // The shell hands a new sound function every render; the flip-back timer must not restart on it.
    const soundRef = useRef(sound);
    useLayoutEffect(() => { soundRef.current = sound; });

    // The session's verdict arrives as the board: a newly solved sum stays open and sparkles (adjusted during render).
    const solvedCount = board.cells.filter(c => c.state === 'solved').length;
    const [seenSolved, setSeenSolved] = useState(solvedCount);
    if (solvedCount !== seenSolved) {
        setSeenSolved(solvedCount);
        setFlourish(board.focus);
        setUp([]);
    }
    // A sum just logged as a mistake: its heart cracks (a ball goes flat with a puff).
    const broken = board.cells.filter(c => cardLook(c) === 'broken').length;
    const [seenBroken, setSeenBroken] = useState(broken);
    if (broken !== seenBroken) {
        setSeenBroken(broken);
        if (broken > seenBroken) setPuff(board.focus);
    }
    useEffect(() => {
        if (puff !== null) soundRef.current(ball ? 'caught' : 'hit');
    }, [puff, ball]);

    // Two cards up that are no pair turn back after a moment.
    useEffect(() => {
        if (up.length < 2) return;
        const t = window.setTimeout(() => { setUp([]); setWrongs(w => w + 1); soundRef.current('nomatch'); }, FLIP_BACK_MS);
        return () => window.clearTimeout(t);
    }, [up]);
    // The last wrong guess turned back: the friendly end (the store refuses an end under help, so it waits for that).
    const failRef = useRef(onFail);
    useLayoutEffect(() => { failRef.current = onFail; });
    const failed = useRef(false);
    useEffect(() => {
        if (left !== 0 || failed.current || phase === 'help') return;
        failed.current = true;
        failRef.current();
    }, [left, phase]);

    useEffect(() => {
        if (flourish === null) return;
        const t = window.setTimeout(() => setFlourish(null), PAIR_TAIL_MS);
        return () => window.clearTimeout(t);
    }, [flourish]);
    useEffect(() => {
        if (puff === null) return;
        const t = window.setTimeout(() => setPuff(null), PUFF_MS);
        return () => window.clearTimeout(t);
    }, [puff]);

    const tap = (id: number) => {
        if (phase !== 'play' || up.length >= 2 || up.includes(id) || solved(id) || left === 0) return;
        sound('flip');
        if (isSum(id)) onBoardFocus?.(cellOf(id));
        if (!up.length) { setUp([id]); return; }
        const first = up[0];
        setUp([first, id]);
        // A sum and an answer: the session checks the pair. Only a sum turned first can count as a strike.
        if (isSum(first) !== isSum(id)) {
            const sum = isSum(first) ? first : id;
            const ans = isSum(first) ? id : first;
            onBoardPick?.(cellOf(sum), board.cells[cellOf(ans)].question.answer, isSum(first));
        }
    };

    // A sum and an answer up that the session did not pair: both give a little "no" shake before turning back.
    const nope = up.length === 2 && isSum(up[0]) !== isSum(up[1]) && !up.some(solved);
    const found = board.cells.filter(c => c.state === 'solved').length;
    const cleared = found === board.cells.length;
    // One size for every sum on the board: its widest line decides (a picture has no length).
    const chars = Math.max(...board.cells.map(c => { const f = sumFace(c.question); return f.kind === 'text' ? lineChars(cardLines(f.text)) : 1; }));
    // Word answers (Frans: "choisissez") fit their heart too, all at one size.
    const answerChars = Math.max(...board.cells.map(c => { const f = answerFace(c.question); return f.kind === 'text' ? lineChars(cardLines(f.text)) : 1; }));
    // A pack's pairs (a pizza and its breuk, a breuk and its vereenvoudigde breuk) are no sum and answer.
    const pairs = board.cells.some(c => c.question.pair);
    const grid = gridOf(order.length);
    const shape = {
        '--hj-cols-l': grid.landscape.cols, '--hj-rows-l': grid.landscape.rows, '--hj-cols-p': grid.portrait.cols,
        '--hj-rows-p': grid.portrait.rows, '--hj-cols-t': grid.tall.cols, '--hj-rows-t': grid.tall.rows, '--hj-cols-s': grid.short.cols, '--hj-rows-s': grid.short.rows,
        '--hj-chars': chars, '--hj-answer-chars': answerChars, '--hj-moment-ms': `${PAIR_MOMENT_MS}ms`,
    } as CSSProperties;
    return (
        <>
            <div className="hj-top">
                {top}
                <p className="hj-sign" aria-live="polite">{cleared ? (ball ? 'Alle ballen gevonden!' : 'Alle hartjes gevonden!') : left === 0 ? 'Oei, geen kansen meer!' : pairs ? 'Zoek wat bij elkaar hoort' : 'Zoek de som en haar antwoord'}</p>
                <span className="hj-count" role="img" aria-label={`${found} van ${board.cells.length} paren`}>
                    {board.cells.map((c, i) => <CountMark key={i} ball={ball} on={c.state === 'solved'} />)}
                </span>
                {left !== null && <Tries left={left} ball={ball} />}
            </div>
            <div ref={gridRef} className="hj-grid" style={shape} role="group" aria-label={ball ? 'Ballen' : 'Hartjes'}>
                {order.map((id, k) => (
                    <div key={id} className="hj-slot" style={{ '--k': k } as CSSProperties}>
                        <Card id={id} board={board} ball={ball} up={up.includes(id)} nope={nope && up.includes(id)} onTap={() => tap(id)} disabled={phase !== 'play' || left === 0}
                            merging={flourish === cellOf(id)} puff={puff === cellOf(id) && isSum(id) && ball} />
                    </div>
                ))}
                {flourish !== null && <PairMoment key={flourish} cell={flourish} board={board} ball={ball} grid={gridRef} sound={soundRef} />}
            </div>
        </>
    );
}

// The pitch behind the balls: a halfway line and the centre circle, nothing else.
function Pitch() {
    return (
        <svg className="hj-pitch" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <path d="M200 -10 V310" />
            <circle cx={200} cy={150} r={70} />
            <circle className="hj-pitch-spot" cx={200} cy={150} r={5} />
        </svg>
    );
}

export interface PairsGameProps extends SkinProps {
    look: HartjesLook;
    // A game's own extra above the cards, beside the sign (Voetbalkaartjes: the scoreboard).
    top?: ReactNode;
}

/** The pairs game with its cards fixed: hearts (Hartjes koppelen) or footballs (Voetbalkaartjes). */
export function PairsGame({ board, phase, onBoardPick, onBoardFocus, sound, onFail, options, look, top }: PairsGameProps) {
    const ball = look === 'voetballen';
    const level = levelOf(options);
    return (
        <div className={`hj-root${ball ? ' is-ball' : ''}${board?.cells.some(c => c.question.pair?.sum.visual) ? ' has-pictures' : ''}${phase === 'help' ? ' is-paused' : ''}`}>
            {ball ? <Pitch /> : <svg className="hj-deco" viewBox="0 0 100 94" aria-hidden><path d={HEART} /></svg>}
            {board && <HartjesBoard key={board.key} board={board} phase={phase} onBoardPick={onBoardPick} onBoardFocus={onBoardFocus} sound={sound} onFail={onFail} ball={ball} top={top} level={level} />}
        </div>
    );
}

// A dizzy face for the fail picture: spiral eyes, a wobbly grin (in the card's own 100 × 94 box).
function DizzyFace() {
    const spiral = (x: number) => `M${x} 40 a3 3 0 1 1 3 3 a6 6 0 1 1 -6 -6 a9 9 0 1 1 9 9`;
    return (
        <g className="hj-dizzy">
            <path d={spiral(36)} />
            <path d={spiral(64)} />
            <path d="M36 62 Q43 56 50 62 T64 62" />
        </g>
    );
}

/** The end screen after Onmogelijk's last wrong guess: a dizzy heart (or ball) among the cards it lost track of. */
export function PairsEnding({ outcome, look }: Pick<SkinEndingProps, 'outcome'> & { look: HartjesLook }) {
    if (outcome !== 'failed') return null;
    const ball = look === 'voetballen';
    const Art = ball ? BallArt : HeartArt;
    return (
        <div className={`spel-ending hj-ending${ball ? ' is-ball' : ''}`} aria-hidden>
            {ball && <span className="hj-ending-net"><GoalNet part="back" /></span>}
            {ball && <span className="hj-ending-net"><GoalNet part="front" /></span>}
            {/* Turned cards lying about (the pitch keeps two: the goal stands on the right). */}
            {(ball ? [0, 1] : [0, 1, 2, 3]).map(i => <span key={i} className={`hj-ending-card${i % 2 ? ' is-up' : ''}${i > 1 ? ' is-right' : ''}`} style={{ '--e': i } as CSSProperties}><Art side="back" look="whole" /></span>)}
            <span className="hj-ending-hero">
                <span className="hj-ending-wobble">
                    <Art side="front" look="whole" />
                    <svg className="hj-ending-face" viewBox="0 0 100 94"><DizzyFace /></svg>
                </span>
            </span>
            {[0, 1, 2].map(i => <span key={i} className="hj-ending-what" style={{ '--e': i } as CSSProperties}>?</span>)}
        </div>
    );
}

export const HartjesEnding = ({ outcome }: SkinEndingProps) => <PairsEnding outcome={outcome} look="hartjes" />;

// Hartjes koppelen: hearts only (the footballs are their own game now, Voetbalkaartjes); a remembered look is ignored.
export default function Hartjes(props: SkinProps) {
    return <PairsGame {...props} look="hartjes" />;
}
