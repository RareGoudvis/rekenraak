import { ArrowCounterClockwise, CheckCircle, GameController, Star } from '@phosphor-icons/react';
import { formatMathNumber } from '../../services/math/formatters';
import { useSpelStore } from './useSpelStore';

// An empty given = a miss (the zombie reached the door before an answer).
const num = (v: string) => v === '' ? 'geen' : formatMathNumber(Number(v));

// After a round: the numbers, the mistakes, and Nakijken (the mistakes again, Oefenen-style) as the big button.
export default function SpelEnd() {
    const { meta, sessie, history, score, bestStreak, helped, mistakes, climb, nakijken, restart, otherGame } = useSpelStore();
    const timed = !!meta?.timed;
    const goal = meta?.round.goal;
    // A goal round's question count is only a cap: count what was asked.
    const total = goal ? history.length : sessie?.total ?? history.length;
    const title = timed ? 'De tijd is om!' : goal && climb >= goal ? 'De toren is af!' : 'Klaar!';
    return (
        <main className="oefen-center spel-end">
            <h1 className="oefen-title">{title}</h1>
            <p className="oefen-lead">{timed ? `${score} juist` : `${score} van ${total} juist`}</p>
            <dl className="spel-end-stats">
                <div><dt>Juist</dt><dd><Star weight="fill" aria-hidden /> {score}</dd></div>
                <div><dt>Langste reeks</dt><dd>{bestStreak}</dd></div>
                <div><dt>Foutjes</dt><dd>{mistakes.length}</dd></div>
                <div><dt>Met hulp</dt><dd>{helped}</dd></div>
            </dl>
            {mistakes.length > 0 ? (
                <>
                    <table className="kiosk-table kiosk-errors spel-end-errors">
                        <thead>
                            <tr><th scope="col">Oefening</th><th scope="col">Jouw antwoord</th><th scope="col">Juist antwoord</th></tr>
                        </thead>
                        <tbody>
                            {mistakes.map((m, i) => (
                                <tr key={i}>
                                    <td className="kiosk-math">{m.question.text}</td>
                                    <td className="kiosk-math is-given">{num(m.given)}</td>
                                    <td className="kiosk-math">{num(m.question.answer)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big spel-end-main" onClick={nakijken} autoFocus>
                        <CheckCircle weight="bold" aria-hidden /> Nakijken
                    </button>
                </>
            ) : (
                <p className="spel-end-clean">Geen foutjes. Super!</p>
            )}
            <div className="spel-end-more">
                <button type="button" className={`kiosk-btn${mistakes.length ? '' : ' kiosk-btn-primary kiosk-btn-big'}`} onClick={restart} autoFocus={!mistakes.length}>
                    <ArrowCounterClockwise aria-hidden /> Opnieuw spelen
                </button>
                <button type="button" className="kiosk-btn" onClick={otherGame}>
                    <GameController aria-hidden /> Ander spel
                </button>
            </div>
        </main>
    );
}
