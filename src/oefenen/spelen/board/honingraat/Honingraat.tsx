import { useId, useState, type CSSProperties } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import type { SkinProps } from '../../skins/types';
import { answerFace, sumFace, type BoardFace, type BoardTarget, type SpelBoard } from '../board';
import { combLayout } from './comb';
import './honingraat.css';

// Honingraat (Lente): a honeycomb of sums; find every sum that makes the target. A right cell: the bee
// flies there and the cell fills with honey. A wrong cell gives a soft bzz shake, then shows its own
// answer and closes (the session logs it). Untimed; three honeycombs. CSS only, still under reduced motion.

const HEX = '50,2 98,29.7 98,85.8 50,113.5 2,85.8 2,29.7';

const faceText = (face: BoardFace) => (face.kind === 'text' ? face.text : face.label);

function Bee() {
    return (
        <svg className="hx-bee-art" viewBox="0 0 80 64" aria-hidden>
            <g transform="rotate(-24 34 14)"><ellipse className="hx-wing" cx="34" cy="14" rx="13" ry="17" /></g>
            <g transform="rotate(20 48 14)"><ellipse className="hx-wing" cx="48" cy="14" rx="13" ry="17" /></g>
            <ellipse className="hx-bee-body" cx="40" cy="40" rx="26" ry="19" />
            <path className="hx-bee-stripe" d="M30 23 Q26 40 30 57 M44 22 Q40 40 44 58" />
            <path className="hx-bee-sting" d="M14 40 L5 37 L14 45 Z" />
            <circle className="hx-bee-eye" cx="56" cy="35" r="3.6" />
            <path className="hx-bee-smile" d="M54 45 Q59 49 63 44" />
            <path className="hx-bee-feeler" d="M60 24 Q64 12 70 10 M64 27 Q72 18 77 18" />
        </svg>
    );
}

function Sign({ target, cleared }: { target: BoardTarget; cleared: boolean }) {
    if (cleared) return <p className="hx-sign" aria-live="polite">Alle honing is binnen!</p>;
    const n = <span className="hx-sign-n kiosk-math">{formatMathNumber(target.n)}</span>;
    return <p className="hx-sign" aria-live="polite">{target.kind === 'eq' ? <>Zoek alle sommen die {n} zijn</> : <>Zoek alle sommen groter dan {n}</>}</p>;
}

function Comb({ board, phase, onBoardPick, reducedMotion }: Pick<SkinProps, 'phase' | 'onBoardPick' | 'reducedMotion'> & { board: SpelBoard }) {
    const uid = useId();
    const layout = combLayout(board.cells.length);
    // Where the bee is: its hive corner, or the cell it just filled.
    const [beeAt, setBeeAt] = useState<number | null>(null);
    const [bzz, setBzz] = useState<number | null>(null);
    // The session's verdict on the last pick arrives as the board: follow it (state adjusted during render).
    const [seenFocus, setSeenFocus] = useState<SpelBoard['focus']>(board.focus);
    // Every pick moves the focus to a new cell (a picked cell closes), so a focus change is a new verdict.
    if (board.focus !== seenFocus) {
        setSeenFocus(board.focus);
        const f = board.focus;
        if (f !== null && board.cells[f].state === 'solved') setBeeAt(f);
        else if (f !== null && board.cells[f].state === 'missed') setBzz(f);
    }
    const target = board.target!;
    const toFind = board.cells.filter(c => c.match);
    const found = toFind.filter(c => c.state === 'solved').length;
    const cleared = found === toFind.length;
    // One size for every sum on the comb: the longest decides.
    const long = board.cells.some(c => faceText(sumFace(c.question)).length > 7);

    const pick = (i: number) => {
        const c = board.cells[i];
        if (phase !== 'play' || c.state !== 'open') return;
        onBoardPick?.(i, '');
    };

    const bee = beeAt !== null ? layout.cells[beeAt] : { x: layout.width - 0.15, y: -0.2 };
    return (
        <>
            <div className="hx-top">
                <Sign target={target} cleared={cleared} />
                <span className="hx-count" role="img" aria-label={`${found} van ${toFind.length} gevonden`}>
                    {toFind.map((c, i) => (
                        <svg key={i} className={`hx-pip${c.state === 'solved' ? ' is-on' : ''}`} viewBox="0 0 100 116" aria-hidden><polygon points={HEX} /></svg>
                    ))}
                </span>
            </div>
            <div className="hx-comb-wrap">
                <div className={`hx-comb${cleared ? ' is-cleared' : ''}${long ? ' is-long' : ''}`} role="group" aria-label="Honingraat"
                    style={{ '--hx-cols': layout.width, '--hx-rows-h': layout.height } as CSSProperties}>
                    {board.cells.map((c, i) => {
                        const { x, y } = layout.cells[i];
                        const sum = faceText(sumFace(c.question));
                        const state = c.state === 'solved' ? ' is-honey' : c.state === 'missed' ? ' is-missed' : '';
                        const label = c.state === 'solved' ? `${sum}, honing` : c.state === 'missed' ? `${sum} is ${faceText(answerFace(c.question))}` : sum;
                        return (
                            <button key={`${board.key}-${i}`} type="button" className={`hx-cell${state}${bzz === i ? ' is-bzz' : ''}`}
                                style={{ '--x': x, '--y': y, '--i': i } as CSSProperties} disabled={phase !== 'play' || c.state !== 'open'}
                                onClick={() => pick(i)} onAnimationEnd={e => { if (e.animationName === 'hx-bzz') setBzz(null); }} aria-label={label}>
                                <svg className="hx-hex" viewBox="0 0 100 115.5" aria-hidden>
                                    <clipPath id={`${uid}-${i}`}><polygon points={HEX} /></clipPath>
                                    <polygon className="hx-wax" points={HEX} />
                                    <g clipPath={`url(#${uid}-${i})`}>
                                        <rect className="hx-honey" x="0" y="0" width="100" height="116" />
                                        <ellipse className="hx-shine" cx="30" cy="34" rx="11" ry="5" transform="rotate(-28 30 34)" />
                                    </g>
                                    <polygon className="hx-rim" points={HEX} />
                                </svg>
                                <span className="hx-sum kiosk-math" aria-hidden>{sum}</span>
                                {c.state === 'missed' && <span className="hx-own kiosk-math" aria-hidden>= {faceText(answerFace(c.question))}</span>}
                            </button>
                        );
                    })}
                    <span className={`hx-bee${beeAt !== null ? ' is-landed' : ''}${reducedMotion ? ' is-still' : ''}`} style={{ '--bx': bee.x, '--by': bee.y } as CSSProperties} aria-hidden>
                        <Bee />
                    </span>
                </div>
            </div>
        </>
    );
}

export default function Honingraat({ board, phase, onBoardPick, reducedMotion }: SkinProps) {
    return (
        <div className={`hx-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <span className="hx-sun" aria-hidden />
            {board?.target && <Comb key={board.key} board={board} phase={phase} onBoardPick={onBoardPick} reducedMotion={reducedMotion} />}
        </div>
    );
}
