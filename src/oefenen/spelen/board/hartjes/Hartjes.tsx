import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SkinProps } from '../../skins/types';
import { mulberry32, seedOf } from '../../distractors';
import { answerFace, sumFace, type BoardFace, type SpelBoard } from '../board';
import './hartjes.css';

// Hartjes koppelen (Valentijn): memory. Each sum and its answer lie face down on two hearts; tap two to
// turn them. A sum with its own answer stays open with a sparkle, any other two turn back after a moment.
// The session checks every sum + answer pick and keeps the mistakes (board/session.ts); this only turns
// cards. 3D flips in CSS; under reduced motion a card simply shows its other side.

// Long enough to read both cards, short enough to keep the game going.
const FLIP_BACK_MS = 1200;

const HEART = 'M50 90 C22 70 4 54 4 32 C4 15 16 4 30 4 C40 4 46 10 50 19 C54 10 60 4 70 4 C84 4 96 15 96 32 C96 54 78 70 50 90 Z';

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

// Text today; a picture face (breuk, klok) draws from its own table once the packs come, its label meanwhile.
function Face({ face }: { face: BoardFace }) {
    const text = faceText(face);
    return <span className="hj-text kiosk-math">{text}</span>;
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

function Card({ id, board, up, onTap, disabled, sparkle, still }: { id: number; board: SpelBoard; up: boolean; onTap(): void; disabled: boolean; sparkle: boolean; still: boolean }) {
    const cell = board.cells[cellOf(id)];
    const q = cell.question;
    const solved = cell.state === 'solved';
    const open = up || solved;
    const face = isSum(id) ? sumFace(q) : answerFace(q);
    const label = solved ? `${faceText(sumFace(q))} is ${faceText(answerFace(q))}, gevonden` : open ? faceText(face) : 'Hartje, dicht';
    return (
        <button type="button" className={`hj-card${open ? ' is-open' : ''}${solved ? ' is-solved' : ''}${isSum(id) ? ' is-sum' : ' is-answer'}${still ? ' is-still' : ''}`}
            onClick={onTap} disabled={disabled || open} aria-label={label} data-cell={cellOf(id)}>
            <span className="hj-flip">
                <span className="hj-side hj-back" aria-hidden>
                    <svg className="hj-heart" viewBox="0 0 100 94"><path className="hj-heart-back" d={HEART} /><path className="hj-heart-mini" transform="translate(32 28) scale(.36)" d={HEART} /></svg>
                </span>
                <span className="hj-side hj-front" aria-hidden>
                    <svg className="hj-heart" viewBox="0 0 100 94"><path className="hj-heart-front" d={HEART} /></svg>
                    <Face face={face} />
                </span>
            </span>
            {sparkle && <Sparkle />}
        </button>
    );
}

function HartjesBoard({ board, phase, onBoardPick, onBoardFocus, sound, reducedMotion }: Pick<SkinProps, 'phase' | 'onBoardPick' | 'onBoardFocus' | 'sound' | 'reducedMotion'> & { board: SpelBoard }) {
    const order = useMemo(() => shuffled(board.cells.length * 2, board.key), [board.key, board.cells.length]);
    // The cards turned up and not yet paired (at most two).
    const [up, setUp] = useState<number[]>([]);
    const [sparkle, setSparkle] = useState<number | null>(null);
    const solved = (id: number) => board.cells[cellOf(id)].state === 'solved';
    // The shell hands a new sound function every render; the flip-back timer must not restart on it.
    const soundRef = useRef(sound);
    useLayoutEffect(() => { soundRef.current = sound; });

    // The session's verdict arrives as the board: a newly solved sum stays open and sparkles (adjusted during render).
    const solvedCount = board.cells.filter(c => c.state === 'solved').length;
    const [seenSolved, setSeenSolved] = useState(solvedCount);
    if (solvedCount !== seenSolved) {
        setSeenSolved(solvedCount);
        setSparkle(board.focus);
        setUp([]);
    }

    // Two cards up that are no pair turn back after a moment.
    useEffect(() => {
        if (up.length < 2) return;
        const t = window.setTimeout(() => { setUp([]); soundRef.current('nomatch'); }, FLIP_BACK_MS);
        return () => window.clearTimeout(t);
    }, [up]);

    useEffect(() => {
        if (sparkle === null) return;
        const t = window.setTimeout(() => setSparkle(null), 900);
        return () => window.clearTimeout(t);
    }, [sparkle]);

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

    const found = board.cells.filter(c => c.state === 'solved').length;
    const cleared = found === board.cells.length;
    // One size for every sum on the board: the longest decides.
    const long = board.cells.some(c => faceText(sumFace(c.question)).length > 7);
    return (
        <>
            <div className="hj-top">
                <p className="hj-sign" aria-live="polite">{cleared ? 'Alle hartjes gevonden!' : 'Zoek de som en haar antwoord'}</p>
                <span className="hj-count" role="img" aria-label={`${found} van ${board.cells.length} paren`}>
                    {board.cells.map((c, i) => (
                        <svg key={i} className={`hj-dot${c.state === 'solved' ? ' is-on' : ''}`} viewBox="0 0 100 94" aria-hidden><path d={HEART} /></svg>
                    ))}
                </span>
            </div>
            <div className={`hj-grid${long ? ' is-long' : ''}`} role="group" aria-label="Hartjes">
                {order.map((id, k) => (
                    <div key={id} className="hj-slot" style={{ '--k': k } as CSSProperties}>
                        <Card id={id} board={board} up={up.includes(id)} onTap={() => tap(id)} disabled={phase !== 'play'}
                            sparkle={sparkle === cellOf(id) && !reducedMotion} still={reducedMotion} />
                    </div>
                ))}
            </div>
        </>
    );
}

export default function Hartjes({ board, phase, onBoardPick, onBoardFocus, sound, reducedMotion }: SkinProps) {
    return (
        <div className={`hj-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <svg className="hj-deco" viewBox="0 0 100 94" aria-hidden><path d={HEART} /></svg>
            {board && <HartjesBoard key={board.key} board={board} phase={phase} onBoardPick={onBoardPick} onBoardFocus={onBoardFocus} sound={sound} reducedMotion={reducedMotion} />}
        </div>
    );
}
