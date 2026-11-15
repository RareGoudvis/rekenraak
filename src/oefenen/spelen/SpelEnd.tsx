import { Suspense, useState } from 'react';
import { ArrowCounterClockwise, CheckCircle, GameController, Star, Trash } from '@phosphor-icons/react';
import TwoTapButton from '../kiosk/TwoTapButton';
import { progressOf, useSpelStore } from './useSpelStore';
import { skinById } from './skins/registry';
import { SpelChoiceFace, SpelLine, SpelQuestionLine } from './SpelVisual';
import { answerTextOf, viewOfValue } from './spelFormat';
import FullscreenExitButton from '../kiosk/FullscreenExitButton';
import type { SpelMistake } from './useSpelStore';

// An answer as the game showed it (spelFormat answerTextOf: −9, € 7,50, half drie) or a small picture; an empty given =
// a miss (the zombie reached the door before an answer); a board's claim reads as words ("meer dan 50").
const answerCell = (q: SpelMistake['question'], v: string) => {
    if (v === '') return 'geen';
    const view = viewOfValue(q, v);
    return view?.visual ? <span className={`spel-end-pic is-${view.visual.kind}`}><SpelChoiceFace value={v} view={view} /></span> : <SpelLine text={answerTextOf(q, v)} />;
};

// After a round: the numbers, the mistakes, and Nakijken (the mistakes again, Oefenen-style) as the big button.
// A lost or failed round reads friendly: never red, never "verloren".
export default function SpelEnd({ reducedMotion = false }: { reducedMotion?: boolean }) {
    const st = useSpelStore();
    const { meta, sessie, history, score, bestStreak, helped, mistakes, climb, result, outcome, nakijken, restart, otherGame } = st;
    const [wiped, setWiped] = useState(false);
    const timed = !!meta?.timed;
    const goal = meta?.round.goal;
    // A goal round's question count is only a cap: count what was asked.
    const total = goal ? history.length : sessie?.total ?? history.length;
    const title = result?.title ?? (outcome === 'failed' ? meta?.failTitle ?? 'Oei! Nog eens?'
        : outcome === 'lost' && goal ? `Bijna! ${climb} van ${goal}`
        : outcome === 'won' && meta?.winTitle ? meta.winTitle
        : timed ? 'De tijd is om!' : goal && climb >= goal ? 'De toren is af!' : 'Klaar!');
    const Ending = meta ? skinById(meta.id)?.Ending : undefined;
    return (
        <main className="oefen-center spel-end">
            {Ending && outcome && (
                <Suspense fallback={null}>
                    <Ending outcome={outcome} progress={progressOf(st)} options={meta?.chosen ?? {}} reducedMotion={reducedMotion} />
                </Suspense>
            )}
            <h1 className="oefen-title">{title}</h1>
            <p className="oefen-lead">{result?.lead ?? `${timed ? `${score} juist` : `${score} van ${total} juist`}${helped > 0 ? `, ${helped} met hulp` : ''}`}</p>
            {/* A skin's own line (Race: the gap to your own record on this device). */}
            {result?.detail && <p className="spel-end-record">{wiped ? 'Je scores zijn gewist.' : result.detail}</p>}
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
                                    <td className="kiosk-math"><SpelQuestionLine question={m.question} /></td>
                                    <td className="kiosk-math is-given">{answerCell(m.question, m.given)}</td>
                                    <td className="kiosk-math">{answerCell(m.question, m.question.answer)}</td>
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
                <FullscreenExitButton />
                {result?.wipe && !wiped && (
                    <TwoTapButton label={<><Trash aria-hidden /> <span>Wis mijn scores</span></>} groupLabel="Mijn scores op dit toestel wissen"
                        confirm="Ja, wissen" onConfirm={() => { result.wipe?.(); setWiped(true); }} />
                )}
            </div>
        </main>
    );
}
