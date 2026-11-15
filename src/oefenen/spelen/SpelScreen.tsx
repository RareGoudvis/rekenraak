import { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowUUpLeft, Lifebuoy, Star, Timer } from '@phosphor-icons/react';
import TwoTapButton from '../kiosk/TwoTapButton';
import StepsPanel from '../kiosk/StepsPanel';
import { stepsVisualFor } from '../../components/steps/stepsVisuals';
import { mabOnlyFor } from '../../services/stepsAvailability';
import { progressOf, useSpelStore } from './useSpelStore';
import { skinById } from './skins/registry';
import type { SkinPhase } from './skins/types';
import { powerOfTen, type SumFacts } from './distractors';
import SpelEnd from './SpelEnd';
import { SpelQuestionLine, SpelVisual } from './SpelVisual';
import { signSize } from './spelChoice';
import { cueSound, play, useSpelSounds } from './sound';
import SoundToggle from './SoundToggle';
import { useSpelMusic } from './music';
import FullscreenExitButton from '../kiosk/FullscreenExitButton';
import { formatMathNumber } from '../../services/math/formatters';
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
    const ctx = { grade: sessie.grade, noMab: sessie.noMab };
    // A fact without steps (3 + 4) gets the MAB picture alone where MAB applies, before the counting tip.
    const lines = help.lines ?? mabOnlyFor(typeId, question.exercise, question.constraints, ctx);
    const visual = lines ? stepsVisualFor(typeId, question.exercise, lines, 'kiosk', ctx) : undefined;
    const cardVisual = visual?.slot === 'card' && cardRevealed !== null ? visual(cardRevealed) : null;
    return (
        <div className="spel-help" role="dialog" aria-modal="true" aria-labelledby="spel-help-title">
            <div className={`spel-help-card${lines ? '' : ' is-tip'}`}>
                <section className="spel-help-sum">
                    <h2 id="spel-help-title" className="spel-help-title">Zo los je het op</h2>
                    {question.help ? (
                        // A pack question (the klok): its picture with the part that matters marked, and a short tip.
                        <>
                            {question.help.visual && <span className={`spel-help-pic is-${question.help.visual.kind}`}><SpelVisual visual={question.help.visual} /></span>}
                            <p className="spel-help-tip">{question.help.tip}</p>
                        </>
                    ) : <p className="spel-help-question kiosk-math"><SpelQuestionLine question={question} /></p>}
                    {cardVisual}
                </section>
                <section className="spel-help-steps">
                    {lines ? (
                        <StepsPanel lines={lines} handig={help.handig} onNext={() => closeHelp()} startOpen nextLabel="Verder spelen" doneText="Klaar! Nu weet je hoe het moet."
                            visual={visual} onVisual={onVisual} />
                    ) : (
                        <div className="kiosk-steps">
                            {/* A pack's tip already stands beside its picture. */}
                            {!question.help && <p className="kiosk-steps-lead">{question.facts ? helpTip(question.facts) : null}</p>}
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
    const entry = st.meta ? skinById(st.meta.id) : null;
    // A game with its own session and screen (Touwtrekken, Kasteel for 2); the round above only holds its choice.
    const own = !!entry?.Screen && (!entry.screenWhen || st.meta?.chosen?.[entry.screenWhen.id] === entry.screenWhen.value);
    const now = useGameClock(!!st.meta?.timed && st.phase !== 'end' && !own);
    useSpelSounds(st.events, st.meta?.sounds);
    // A game with its own screen plays its music itself (it knows its own end screen).
    useSpelMusic(st.meta?.music, !own && !!entry?.Component && st.phase !== 'end');
    if (own && entry?.Screen && st.meta && st.from) {
        const Screen = entry.Screen;
        return <Suspense fallback={<p className="oefen-lead spel-loading">Even laden…</p>}><Screen meta={st.meta} from={st.from} onExit={st.otherGame} /></Suspense>;
    }
    if (st.phase === 'end') return <div className="oefen-app"><SpelEnd reducedMotion={reducedMotion} /></div>;
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
                {progress.board ? (
                    // A board round counts boards (Hartjes: 2, Honingraat: 3).
                    <span className="kiosk-progress spel-progress" aria-label={`${progress.board.index + 1} van ${progress.board.total}`}>
                        {`${progress.board.index + 1} / ${progress.board.total}`}
                    </span>
                ) : progress.goal ? (
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
                    <FullscreenExitButton />
                    {progress.msLeft !== null && (
                        <span className="kiosk-timer" role="timer" aria-label={`Nog ${formatClock(progress.msLeft)}`}>
                            <Timer aria-hidden /> {formatClock(progress.msLeft)}
                        </span>
                    )}
                    <SoundToggle />
                    <span className="spel-score" aria-label={`${progress.score} punten`}><Star weight="fill" aria-hidden /> {progress.score}</span>
                    {/* A board round has no sum to explain until the pupil picks one. */}
                    {st.question && (
                        <button type="button" className="kiosk-btn spel-help-btn" onClick={() => st.openHelp()} disabled={phase !== 'play'}>
                            <Lifebuoy aria-hidden /> <span>Hoe los ik dit op?</span>
                        </button>
                    )}
                </span>
            </header>
            <main className="spel-stage" data-sign={signSize(st.question?.text)}>
                <Suspense fallback={<p className="oefen-lead spel-loading">Even laden…</p>}>
                    <Skin
                        question={st.question ? { key: st.question.key, text: st.question.text, index: progress.answered - (phase === 'right' || phase === 'wrong' ? 1 : 0), visual: st.question.visual } : null}
                        choices={st.meta.input === 'choice' ? st.question?.choices ?? null : null}
                        board={st.board}
                        onBoardPick={(cell, given, strike) => st.boardPick(cell, given, strike)}
                        onBoardFocus={st.boardFocus}
                        views={st.meta.input === 'choice' ? st.question?.views ?? null : null}
                        phase={phase}
                        feedback={st.feedback}
                        onAnswer={st.answer}
                        onHelp={() => st.openHelp()}
                        onMiss={() => st.miss()}
                        onFail={() => st.fail()}
                        sound={cue => { const s = cueSound(st.meta?.sounds, cue); if (s) play(s); }}
                        progress={progress}
                        options={st.meta.chosen ?? {}}
                        events={st.events}
                        reducedMotion={reducedMotion}
                        runKey={st.from ? `${st.meta.id}:${st.from.choice.key}` : undefined}
                        onFinish={st.finish}
                        onReport={st.report}
                        onHold={on => st.hold(on)}
                    />
                </Suspense>
                {phase === 'help' && <HelpPanel />}
            </main>
        </div>
    );
}

// × / : 10, 100, 1000 past the tafel van 10: the digits shift, shown on a fixed example (47) so the tip teaches the rule.
function shiftTip(f: SumFacts): string | null {
    const p = powerOfTen(f);
    const [x = 0, y = 0] = f.operands;
    // 7 × 10 and 70 : 10 are the tafel van 10: its jumps below.
    if (p === null || (p === 10 && (f.op === 'x' ? (p === y ? x : y) : f.answer) <= 10)) return null;
    const places = ['één plaats', 'twee plaatsen', 'drie plaatsen'][String(p).length - 2];
    const n = formatMathNumber;
    return f.op === 'x' ? `Elk cijfer schuift ${places} op: 47 × ${n(p)} = ${n(47 * p)}.` : `Elk cijfer schuift ${places} terug: ${n(47 * p)} : ${n(p)} = 47.`;
}

// The help without worked steps: count on or back for + / −; for the tafels the jumps of the tafel, up to the answer
// (that is the help: 7 × 6 = six jumps of 7). Keeps to ten jumps so a big product does not flood the panel.
function helpTip(f: SumFacts): string {
    const shift = shiftTip(f);
    if (shift) return shift;
    const [x = 0, y = 0] = f.operands;
    const jumps = (step: number, n: number) => Array.from({ length: n }, (_, i) => (i + 1) * step).join(', ');
    if (f.op === 'x' && y >= 1 && y <= 10) return `Tel in sprongen van ${x}: ${jumps(x, y)}.`;
    if (f.op === ':' && y >= 1 && f.answer >= 1 && f.answer <= 10) return `Spring in sprongen van ${y} tot ${x}: ${jumps(y, f.answer)}. Tel je sprongen.`;
    if (f.op === 'x') return 'Zoek de tafel en tel in sprongen.';
    if (f.op === ':') return 'Welke tafel helpt? Tel in sprongen van de deler.';
    return f.op === '+' ? 'Begin bij het grootste getal en tel verder.' : 'Begin bij het eerste getal en tel terug.';
}
