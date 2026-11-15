import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SkinProps } from '../../skins/types';
import { mulberry32, seedOf } from '../../distractors';
import { answerFace, cardLines, isLoneBreuk, lineChars, sumFace, type BoardFace, type SpelBoard } from '../board';
import { SpelText, SpelVisual } from '../../SpelVisual';
import { Burst } from '../../scene';
import { BallArt, CountMark, HEART, HeartArt } from './Art';
import { cardLook, gridOf, lookOf, type CardLook } from './hearts';
import './hartjes.css';

// Hartjes koppelen (Valentijn): memory. Each sum and its answer lie face down on two hearts (or footballs);
// tap two to turn them. A sum with its own answer stays open with a sparkle (a "Goal!"), any other two turn
// back after a moment. A sum logged as a mistake breaks its heart (a flat ball) for the rest of the board;
// pairing it later sticks a plaster on. The session checks every pick and keeps the mistakes
// (board/session.ts); this only turns cards. 3D flips in CSS; under reduced motion a card simply shows its other side.

// Long enough to read both cards, short enough to keep the game going.
const FLIP_BACK_MS = 1200;
const FLOURISH_MS = 900;

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
    return <span className={`hj-text kiosk-math${isLoneBreuk(face.text) ? ' is-breuk' : ''}`}>{cardLines(face.text).map((l, i) => <span key={i} className="hj-line"><SpelText text={l} /></span>)}</span>;
}

function Sparkle() {
    return (
        <svg className="hj-sparkle" viewBox="0 0 100 100" aria-hidden>
            {[[18, 20, 1], [82, 18, .8], [88, 70, 1], [14, 74, .7], [50, 4, .9]].map(([x, y, s], i) => (
                <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
                    <path style={{ '--i': i } as CSSProperties} d="M0 -9 L2.5 -2.5 L9 0 L2.5 2.5 L0 9 L-2.5 2.5 L-9 0 L-2.5 -2.5 Z" />
                </g>
            ))}
        </svg>
    );
}

interface CardProps { id: number; board: SpelBoard; ball: boolean; up: boolean; nope: boolean; onTap(): void; disabled: boolean; flourish: boolean; puff: boolean; reducedMotion: boolean }

function Card({ id, board, ball, up, nope, onTap, disabled, flourish, puff, reducedMotion }: CardProps) {
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
        <button type="button" className={`hj-card${open ? ' is-open' : ''}${solved ? ' is-solved' : ''}${isSum(id) ? ' is-sum' : ' is-answer'} is-${look}${nope ? ' is-nope' : ''}`}
            onClick={onTap} disabled={disabled || open} aria-label={label} data-cell={cellOf(id)}>
            <span className="hj-flip">
                <span className="hj-side hj-back" aria-hidden><Art side="back" look={look} /></span>
                <span className="hj-side hj-front" aria-hidden>
                    <Art side="front" look={look} />
                    <Face face={face} />
                </span>
            </span>
            {flourish && !ball && !reducedMotion && <Sparkle />}
            {flourish && ball && <Burst kind="pieces" x="50%" y="45%" spread={70} count={12} seed={id + 1} reducedMotion={reducedMotion} />}
            {puff && <Burst kind="smoke" x="50%" y="30%" spread={40} count={6} seed={id + 3} reducedMotion={reducedMotion} />}
        </button>
    );
}

function HartjesBoard({ board, phase, onBoardPick, onBoardFocus, sound, reducedMotion, ball }: Pick<SkinProps, 'phase' | 'onBoardPick' | 'onBoardFocus' | 'sound' | 'reducedMotion'> & { board: SpelBoard; ball: boolean }) {
    const order = useMemo(() => shuffled(board.cells.length * 2, board.key), [board.key, board.cells.length]);
    // The cards turned up and not yet paired (at most two).
    const [up, setUp] = useState<number[]>([]);
    const [flourish, setFlourish] = useState<number | null>(null);
    const [puff, setPuff] = useState<number | null>(null);
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
        const t = window.setTimeout(() => { setUp([]); soundRef.current('nomatch'); }, FLIP_BACK_MS);
        return () => window.clearTimeout(t);
    }, [up]);

    useEffect(() => {
        if (flourish === null) return;
        const t = window.setTimeout(() => setFlourish(null), FLOURISH_MS);
        return () => window.clearTimeout(t);
    }, [flourish]);
    useEffect(() => {
        if (puff === null) return;
        const t = window.setTimeout(() => setPuff(null), FLOURISH_MS);
        return () => window.clearTimeout(t);
    }, [puff]);

    const tap = (id: number) => {
        if (phase !== 'play' || up.length >= 2 || up.includes(id) || solved(id)) return;
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
    // A pack's pairs (a pizza and its breuk, a breuk and its vereenvoudigde breuk) are no sum and answer.
    const pairs = board.cells.some(c => c.question.pair);
    const grid = gridOf(order.length);
    const shape = {
        '--hj-cols-l': grid.landscape.cols, '--hj-rows-l': grid.landscape.rows, '--hj-cols-p': grid.portrait.cols,
        '--hj-rows-p': grid.portrait.rows, '--hj-cols-t': grid.tall.cols, '--hj-rows-t': grid.tall.rows, '--hj-cols-s': grid.short.cols, '--hj-rows-s': grid.short.rows,
        '--hj-chars': chars,
    } as CSSProperties;
    return (
        <>
            <div className="hj-top">
                <p className="hj-sign" aria-live="polite">{cleared ? (ball ? 'Alle ballen gevonden!' : 'Alle hartjes gevonden!') : pairs ? 'Zoek wat bij elkaar hoort' : 'Zoek de som en haar antwoord'}</p>
                <span className="hj-count" role="img" aria-label={`${found} van ${board.cells.length} paren`}>
                    {board.cells.map((c, i) => <CountMark key={i} ball={ball} on={c.state === 'solved'} />)}
                </span>
            </div>
            <div className="hj-grid" style={shape} role="group" aria-label={ball ? 'Ballen' : 'Hartjes'}>
                {order.map((id, k) => (
                    <div key={id} className="hj-slot" style={{ '--k': k } as CSSProperties}>
                        <Card id={id} board={board} ball={ball} up={up.includes(id)} nope={nope && up.includes(id)} onTap={() => tap(id)} disabled={phase !== 'play'}
                            flourish={flourish === cellOf(id)} puff={puff === cellOf(id) && isSum(id) && ball} reducedMotion={reducedMotion} />
                    </div>
                ))}
                {ball && flourish !== null && <p className="hj-goal" aria-hidden>Goal!</p>}
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

export default function Hartjes({ board, phase, onBoardPick, onBoardFocus, sound, reducedMotion, options }: SkinProps) {
    const ball = lookOf(options) === 'voetballen';
    return (
        <div className={`hj-root${ball ? ' is-ball' : ''}${board?.cells.some(c => c.question.pair?.sum.visual) ? ' has-pictures' : ''}${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            {ball ? <Pitch /> : <svg className="hj-deco" viewBox="0 0 100 94" aria-hidden><path d={HEART} /></svg>}
            {board && <HartjesBoard key={board.key} board={board} phase={phase} onBoardPick={onBoardPick} onBoardFocus={onBoardFocus} sound={sound} reducedMotion={reducedMotion} ball={ball} />}
        </div>
    );
}
