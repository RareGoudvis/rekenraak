import { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowUUpLeft, Lifebuoy, Star, Timer } from '@phosphor-icons/react';
import TwoTapButton from '../kiosk/TwoTapButton';
import StepsPanel from '../kiosk/StepsPanel';
import { stepsVisualFor } from '../../components/steps/stepsVisuals';
import { progressOf, useSpelStore } from './useSpelStore';
import { skinById } from './skins/registry';
import type { SkinPhase } from './skins/types';
import SpelEnd from './SpelEnd';
import './spelen.css';


const REDUCED = '(prefers-reduced-motion: reduce)';
const subscribeMotion = (fn: () => void) => {
    const mq = window.matchMedia?.(REDUCED);
    mq?.addEventListener('change', fn);
    return () => mq?.removeEventListener('change', fn);
};
const reducedNow = () => window.matchMedia?.(REDUCED).matches ?? false;

function useReducedMotion(): boolean {
    return useSyncExternalStore(subscribeMotion, reducedNow, () => false);
}

function formatClock(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Timed rounds tick four times a second (a smooth clock for the skin); untimed rounds never tick.
function useGameClock(timed: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    const tick = useSpelStore(s => s.tick);
    useEffect(() => {
        if (!timed) return;
        const id = window.setInterval(() => { const t = Date.now(); setNow(t); tick(t); }, 250);
        return () => window.clearInterval(id);
    }, [timed, tick]);
    return now;
}

// "Hoe los ik dit op?": the round waits; the sum, its steps (one line per tap) and the MAB blocks where they apply.
function HelpPanel() {
    const question = useSpelStore(s => s.question);
    const help = useSpelStore(s => s.help);
    const sessie = useSpelStore(s => s.sessie);
    const closeHelp = useSpelStore(s => s.closeHelp);
    const [cardRevealed, setCardRevealed] = useState<number | null>(null);
    const onVisual = useCallback((n: number | null) => setCardRevealed(n), []);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeHelp(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [closeHelp]);
    if (!question || !help || !sessie) return null;
    const typeId = sessie.types[question.slot].typeId;
    const visual = help.lines ? stepsVisualFor(typeId, question.exercise, help.lines, 'kiosk', { grade: sessie.grade, noMab: sessie.noMab }) : undefined;
    const cardVisual = visual?.slot === 'card' && cardRevealed !== null ? visual(cardRevealed) : null;
    return (
        <div className="spel-help" role="dialog" aria-modal="true" aria-labelledby="spel-help-title">
            <div className={`spel-help-card${help.lines ? '' : ' is-tip'}`}>
                <section className="spel-help-sum">
                    <h2 id="spel-help-title" className="spel-help-title">Zo los je het op</h2>
                    <p className="spel-help-question kiosk-math">{question.text}</p>
                    {cardVisual}
                </section>
                <section className="spel-help-steps">
                    {help.lines ? (
                        <StepsPanel lines={help.lines} handig={help.handig} onNext={() => closeHelp()} startOpen nextLabel="Verder spelen"
                            visual={visual} onVisual={onVisual} />
                    ) : (
                        <div className="kiosk-steps">
                            <p className="kiosk-steps-lead">{question.facts.op === '+' ? 'Begin bij het grootste getal en tel verder.' : 'Begin bij het eerste getal en tel terug.'}</p>
                            <button type="button" className="kiosk-btn kiosk-btn-big" onClick={() => closeHelp()} autoFocus>Verder spelen</button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

// The game shell: top bar (Terug, progress, score, Hoe los ik dit op?), the skin, the help panel, the end screen.
export default function SpelScreen() {
    const st = useSpelStore();
    const reducedMotion = useReducedMotion();
    const now = useGameClock(!!st.meta?.timed && st.phase !== 'end');
    const entry = st.meta ? skinById(st.meta.id) : null;
    if (st.phase === 'end') return <div className="oefen-app"><SpelEnd /></div>;
    if (!st.meta || !entry?.Component) return null;
    const Skin = entry.Component;
    const progress = progressOf(st, now);
    const phase = st.phase as SkinPhase;
    const at = Math.min(progress.answered + (phase === 'play' || phase === 'help' ? 1 : 0), progress.total ?? Infinity);
    return (
        <div className="oefen-app spel-app">
            <header className="kiosk-topbar spel-topbar">
                <TwoTapButton
                    label={<><ArrowUUpLeft aria-hidden /> <span>Terug</span></>}
                    armName="Terug"
                    groupLabel="Stoppen met spelen"
                    confirm="Ja, stoppen"
                    onConfirm={st.otherGame}
                />
                {progress.goal ? (
                    // A goal round counts toward the goal, not the question cap.
                    <span className="kiosk-progress spel-progress" aria-label={`${progress.goal.count} van ${progress.goal.target}`}>
                        {`${progress.goal.count} / ${progress.goal.target}`}
                    </span>
                ) : (
                    <span className="kiosk-progress spel-progress" aria-label={progress.total !== null ? `Vraag ${at} van ${progress.total}` : `Vraag ${at}`}>
                        {progress.total !== null ? `${at} / ${progress.total}` : at}
                    </span>
                )}
                <span className="kiosk-topbar-right">
                    {progress.msLeft !== null && (
                        <span className="kiosk-timer" role="timer" aria-label={`Nog ${formatClock(progress.msLeft)}`}>
                            <Timer aria-hidden /> {formatClock(progress.msLeft)}
                        </span>
                    )}
                    <span className="spel-score" aria-label={`${progress.score} punten`}><Star weight="fill" aria-hidden /> {progress.score}</span>
                    <button type="button" className="kiosk-btn spel-help-btn" onClick={() => st.openHelp()} disabled={phase !== 'play'}>
                        <Lifebuoy aria-hidden /> <span>Hoe los ik dit op?</span>
                    </button>
                </span>
            </header>
            <main className="spel-stage">
                <Suspense fallback={<p className="oefen-lead spel-loading">Even laden…</p>}>
                    <Skin
                        question={st.question ? { key: st.question.key, text: st.question.text, index: progress.answered - (phase === 'right' || phase === 'wrong' ? 1 : 0) } : null}
                        choices={st.meta.input === 'choice' ? st.question?.choices ?? null : null}
                        phase={phase}
                        feedback={st.feedback}
                        onAnswer={st.answer}
                        onHelp={() => st.openHelp()}
                        onMiss={() => st.miss()}
                        progress={progress}
                        events={st.events}
                        reducedMotion={reducedMotion}
                    />
                </Suspense>
                {phase === 'help' && <HelpPanel />}
            </main>
        </div>
    );
}
