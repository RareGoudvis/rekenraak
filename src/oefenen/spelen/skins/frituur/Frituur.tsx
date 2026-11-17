import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import SpelKeypad from '../../SpelKeypad';
import { Burst, Clouds } from '../../scene';
import type { SkinEndingProps, SkinProps } from '../types';
import { FRITUUR, headTopOf, isLow, newCounter, nextSum, patienceShare, serve, tick, timedOut, walkOff, wrongOrder, wrongOrderOf, type Counter, type Customer } from './rule';
import { frituurResult, loadBest, saveIfBest } from './records';
import { playFrituur } from './sounds';
import { CyclistG, DogG, KioskG, OrderG, PersonG, PigeonG, StreetG, type CookPose, type Pose } from './art';
import './frituur.css';

// Frituur: a Flemish frituur seen from the pavement, a queue of up to three customers at its counter. The first one's
// speech bubble holds the sum; a right answer sends the order over the counter and the customer off eating, a wrong
// one brings out the wrong snack and walks them off grumbling, as does an empty patience bar
// (onMiss). Score = customers helped; the best per card and length stays on this device (records.ts).
// The queue lives in a ref driven by game time (only while the sum waits); React renders only when it changes.

// The queue's spots, % of the scene's width (the counter ends at 45 %). SYNC: .fr-patience and .fr-bubble in frituur.css.
const SLOTS = [56, 72, 88] as const;

function commitTo(ref: MutableRefObject<Counter>, set: Dispatch<SetStateAction<Counter>>, next: Counter) {
    const was = ref.current;
    ref.current = next;
    if (next.rev !== was.rev) set(next);
}

function CustomerArt({ c, pose, item }: { c: Customer; pose: Pose; item?: Customer['order'] | null }) {
    return (
        <>
            <svg className="fr-person-art" viewBox="0 0 100 200" aria-hidden><PersonG kind={c.kind} look={c.look} pose={pose} item={item} /></svg>
            {c.kind === 'hond' && <svg className="fr-dog-art" viewBox="0 0 70 60" aria-hidden><DogG pose={pose} /></svg>}
        </>
    );
}

export default function Frituur({ question, phase, feedback, onAnswer, onMiss, onReport, progress, events, options, runKey }: SkinProps) {
    const clipId = `fr${useId().replace(/:/g, '')}`;
    const [first] = useState(() => newCounter(Math.floor(Math.random() * 2 ** 31)));
    const counter = useRef(first);
    const [view, setView] = useState(first);
    const [low, setLow] = useState(false);
    const lowRef = useRef(false);
    const fillRef = useRef<HTMLSpanElement | null>(null);
    const bestKey = `${runKey ?? 'frituur'}|${options.tijd ?? '3'}`;
    const [bestBefore] = useState(() => loadBest(bestKey));
    const timers = useRef<number[]>([]);
    useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);

    // The latest props for the loop and the event handlers (they are set up once).
    const live = useRef({ phase, streak: progress.streak, onMiss, onReport, bestKey, bestBefore, asking: !!question });
    useLayoutEffect(() => { live.current = { phase, streak: progress.streak, onMiss, onReport, bestKey, bestBefore, asking: !!question }; });

    // The end lines from the start ("Je hielp 0 klanten"), then after every customer.
    useEffect(() => { live.current.onReport?.(frituurResult(0, live.current.bestBefore)); }, []);

    useEffect(() => {
        const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
        const offs = [
            events.on('correct', () => {
                const next = serve(counter.current);
                commitTo(counter, setView, next);
                const { bestKey: key, bestBefore: before } = live.current;
                saveIfBest(key, next.servedCount);
                live.current.onReport?.(frituurResult(next.servedCount, before));
                playFrituur('sizzle');
                later(240, () => playFrituur('ding'));
                later(520, () => playFrituur('yum'));
            }),
            events.on('wrong', ({ given }) => {
                // An empty given is our own deadline: the loop already walked that customer off.
                if (given === '') return;
                const before = counter.current;
                const next = wrongOrder(before);
                commitTo(counter, setView, next);
                playFrituur('huh');
                if (next.queue[0] !== before.queue[0]) later(380, () => playFrituur('grumble'));
            }),
        ];
        return () => offs.forEach(off => off());
    }, [events]);

    // A new sum: a served customer leaves eating, the next one steps up.
    const key = question?.key;
    useLayoutEffect(() => {
        if (key) commitTo(counter, setView, nextSum(counter.current, live.current.streak));
    }, [key]);

    // Game time at the counter: the bar drains only while the sum waits (help and the flashes freeze it).
    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never empties a bar at once.
            const dt = last === null ? 0 : Math.min(100, Math.max(0, t - last));
            last = t;
            const st = live.current;
            if (st.phase === 'play' && st.asking) {
                counter.current = tick(counter.current, dt);
                if (timedOut(counter.current)) {
                    commitTo(counter, setView, walkOff(counter.current, 'grumpy', 0));
                    playFrituur('grumble');
                    st.onMiss();
                }
            }
            const c = counter.current;
            fillRef.current?.style.setProperty('--left', patienceShare(c.patience).toFixed(4));
            const l = !c.served && isLow(c.patience);
            if (l !== lowRef.current) { lowRef.current = l; setLow(l); }
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    if (!question) return <div className="fr-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const front = view.queue[0];
    const wrongShown = phase === 'wrong' && !!feedback && feedback.given !== '';
    const frowning = wrongShown && view.wrongs > 0;
    const pose: Pose = view.served ? 'served' : frowning ? 'frown' : low ? 'low' : 'wait';
    const cook: CookPose = view.served ? 'serve' : wrongShown ? 'oops' : 'idle';
    const cls = ['fr-root', phase === 'help' && 'is-paused', view.served && 'is-served', wrongShown && 'is-wrong'].filter(Boolean).join(' ');
    return (
        <div className={cls}>
            <div className="fr-world">
                <span className="fr-sun" aria-hidden />
                <Clouds layer="far" outline={false} count={3} band={[2, 18]} size={[90, 150]} seed={5} paused={phase === 'help'} />
                <Clouds layer="near" count={2} band={[4, 22]} size={[110, 170]} seed={11} paused={phase === 'help'} />
                <div className="fr-scene">
                    <svg className="fr-backdrop" viewBox="0 0 700 560" preserveAspectRatio="xMidYMax meet" aria-hidden>
                        <StreetG />
                        <CyclistG />
                        <g transform="translate(600 486)"><PigeonG /></g>
                    </svg>
                    <svg className="fr-kiosk-art" viewBox="0 0 300 360" aria-hidden><KioskG cook={cook} clipId={clipId} beat={view.servedCount} /></svg>
                    {wrongShown && (
                        // The wrong snack on the counter; the cook takes it back.
                        <svg key={`w${progress.mistakes}`} className="fr-wrong-order" viewBox="-20 -22 40 44" aria-hidden>
                            <OrderG kind={wrongOrderOf(front.order, progress.mistakes)} />
                        </svg>
                    )}
                    {view.queue.map((c, slot) => (
                        <div key={c.id} className={`fr-cust is-slot-${slot}${c.id >= FRITUUR.queue ? ' is-new' : ''}${slot === 0 ? ` is-${pose}` : ''}`}
                            style={{ '--x': SLOTS[slot], '--top': headTopOf(c.kind), zIndex: 10 - slot } as CSSProperties}>
                            <div key={slot} className="fr-step">
                                <div className="fr-idle" style={{ '--k': c.id % 5 } as CSSProperties}>
                                    <CustomerArt c={c} pose={slot === 0 ? pose : 'wait'} item={slot === 0 && view.served ? c.order : null} />
                                </div>
                            </div>
                            {slot === 0 && frowning && <span key={`h${view.wrongs}`} className="fr-huh" aria-hidden>?!</span>}
                            {slot === 0 && pose === 'low' && (
                                // Fuming a little: two puffs of steam from the head.
                                <svg className="fr-fume" viewBox="0 0 40 40" aria-hidden>
                                    <circle cx={12} cy={30} r={7} /><circle cx={26} cy={18} r={9} />
                                </svg>
                            )}
                        </div>
                    ))}
                    {view.leaving.map(l => (
                        <div key={l.customer.id} className={`fr-cust fr-leaver is-${l.mood}`} style={{ '--x': SLOTS[0], '--top': headTopOf(l.customer.kind) } as CSSProperties}>
                            <div className="fr-leave">
                                <div className="fr-walking">
                                    <CustomerArt c={l.customer} pose={l.mood} item={l.mood === 'happy' ? l.customer.order : null} />
                                </div>
                                <span className="fr-say" aria-hidden>{l.mood === 'happy' ? 'Mmm!' : 'Hmpf!'}</span>
                            </div>
                        </div>
                    ))}
                    {!view.served && (
                        <div key={front.id} className={`fr-patience${low ? ' is-low' : ''}`} style={{ '--top': headTopOf(front.kind), '--left': patienceShare(view.patience) } as CSSProperties}
                            role="img" aria-label={low ? 'De klant wordt ongeduldig' : 'Het geduld van de klant'}>
                            <span ref={fillRef} className="fr-patience-fill" />
                        </div>
                    )}
                    {view.served && <Burst key={`s${view.servedCount}`} kind="sparkle" x={`${SLOTS[0]}%`} y="52%" spread={70} seed={view.servedCount} />}
                    <div key={`t${question.key}`} className="fr-tail" style={{ '--top': headTopOf(front.kind) } as CSSProperties} aria-hidden>
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path className="fr-tail-fill" d="M0 0 L100 0 L64 100 Z" />
                            <path d="M0 0 L64 100 L100 0" />
                        </svg>
                    </div>
                    <div key={question.key} className="fr-bubble">
                        <SpelSignBox className="fr-sign" question={question} feedback={feedback} flash={flash} answerClassName="fr-sign-answer" />
                    </div>
                </div>
            </div>
            <div className="fr-panel">
                <div className="fr-tally" role="status" aria-label={`${view.servedCount} ${view.servedCount === 1 ? 'klant' : 'klanten'} geholpen`}>
                    <svg className="fr-tally-cone" viewBox="-20 -22 40 44" aria-hidden><OrderG kind="friet" /></svg>
                    <span className="fr-tally-num" key={view.servedCount}>{view.servedCount}</span>
                    <span className="fr-tally-label">geholpen{bestBefore > 0 && <small> · record {bestBefore}</small>}</span>
                </div>
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

// The end screen: the frituur with three happy customers eating in front of it.
const END_CUSTOMERS: readonly (Customer & { x: number })[] = [
    { id: 0, kind: 'kind', look: 0, order: 'friet', x: 345 },
    { id: 1, kind: 'opa', look: 1, order: 'stoofvlees', x: 440 },
    { id: 2, kind: 'hond', look: 2, order: 'mayo', x: 530 },
];

export function FrituurEnding(_: SkinEndingProps) {
    const clipId = `fre${useId().replace(/:/g, '')}`;
    return (
        <div className="spel-ending fr-ending">
            <svg viewBox="20 110 640 390" preserveAspectRatio="xMidYMax meet" aria-hidden>
                <StreetG />
                <g transform="translate(40 120)"><KioskG cook="serve" clipId={clipId} /></g>
                {END_CUSTOMERS.map((c, i) => (
                    <g key={c.id} transform={`translate(${c.x} 262) scale(1.15)`}>
                        <g className="fr-party" style={{ '--k': i } as CSSProperties}>
                            <PersonG kind={c.kind} look={c.look} pose="happy" item={c.order} />
                            {c.kind === 'hond' && <g transform="translate(62 140)"><DogG pose="happy" /></g>}
                        </g>
                    </g>
                ))}
            </svg>
        </div>
    );
}
