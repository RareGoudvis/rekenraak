import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowCounterClockwise, ArrowUUpLeft, GameController, Heart, Star, Timer } from '@phosphor-icons/react';
import { SpelSignBox } from '../../SpelVisual';
import TwoTapButton from '../../../kiosk/TwoTapButton';
import SoundToggle from '../../SoundToggle';
import { useSpelMusic } from '../../music';
import { cueSound, play } from '../../sound';
import type { SkinScreenProps } from '../types';
import type { SoundCue } from '../../sound';
import DuelKeypad from '../touwtrekken/DuelKeypad';
import { SIDES, useDuelStore, type DuelMode, type Side } from '../touwtrekken/duelStore';
import { Scene, type Debris, type Flight } from './art';
import { aimAt, knockedOff } from './castle';
import { KASTEEL, livesOf } from './siege';
import '../../spelen.css';
import '../touwtrekken/touwtrekken.css';
import './kasteel.css';

// Kasteel for 2: two castles, two keypads on one screen (Touwtrekken's duel store and keypads). Each right
// answer fires that side's catapult at the other castle; the first castle at 0 loses, or at the time limit
// the one with more lives left wins. No help and no Nakijken in a duel. The stones fly by CSS.

const TEAM: Record<Side, string> = { left: 'Blauw', right: 'Oranje' };
const other = (s: Side): Side => (s === 'left' ? 'right' : 'left');

function formatClock(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}


interface DuelView {
    flights: Flight[];
    // Stones that hit each castle.
    landed: Record<Side, number>;
    debris: Debris[];
    fired: Record<Side, number>;
    // The end card is up (after the last stone and the crumbling).
    shown: boolean;
    next: number;
}
const freshView = (): DuelView => ({ flights: [], landed: { left: 0, right: 0 }, debris: [], fired: { left: 0, right: 0 }, shown: false, next: 1 });

export default function KasteelDuel({ meta, from, onExit }: SkinScreenProps) {
    const lives = livesOf(meta.chosen ?? {});
    const mode: DuelMode = meta.chosen?.manier === 'beurt' ? 'beurt' : 'samen';
    const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const flightMs = reduced ? 0 : KASTEEL.flightMs;
    // Straight into play (the mode was picked on the pre-start screen), before the first paint.
    const begin = () => {
        const d = useDuelStore.getState();
        d.setup({ meta, from, rule: { seconds: lives * KASTEEL.duelSecondsPerLife, target: lives } });
        d.start(mode);
    };
    useState(begin);
    const st = useDuelStore();
    useSpelMusic(meta.music, st.phase === 'play');
    const [now, setNow] = useState(() => Date.now());
    const [view, setView] = useState(freshView);
    const latest = useRef(view);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    const later = (ms: number, fn: () => void) => {
        const tm = setTimeout(() => { timers.current.delete(tm); fn(); }, ms);
        timers.current.add(tm);
    };
    const put = (v: DuelView) => { latest.current = v; setView(v); };
    const voice = (cue: SoundCue) => { const s = cueSound(meta.sounds, cue); if (s) play(s); };
    const live = useRef({ put, later, voice });
    useEffect(() => { live.current = { put, later, voice }; });

    useEffect(() => {
        const all = timers.current;
        // A remount (StrictMode) finds the duel stopped by the cleanup below: start it again.
        if (!useDuelStore.getState().sessie) begin();
        return () => { all.forEach(clearTimeout); useDuelStore.getState().stop(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount: the picks never change while mounted
    }, []);

    // A right answer fires at the other castle; the hit counts when the stone lands.
    useEffect(() => {
        const inAir = (v: DuelView, target: Side) => v.flights.filter(f => other(f.from) === target).length;
        const offs = [
            st.events.on('pull', ({ side }) => {
                const { put, later, voice } = live.current;
                const v = latest.current;
                const target = other(side);
                const before = Math.max(0, lives - v.landed[target] - inAir(v, target));
                const id = v.next;
                const flight: Flight = { id, from: side, big: false, aim: aimAt(Math.max(0, before - 1), lives, before), ms: flightMs };
                put({ ...v, next: id + 1, flights: [...v.flights, flight], fired: { ...v.fired, [side]: v.fired[side] + 1 } });
                voice('correct');
                later(flightMs, () => {
                    const w = latest.current;
                    const hp = Math.max(0, lives - w.landed[target]);
                    const off = knockedOff(hp, Math.max(0, hp - 1), lives);
                    const debris: Debris[] = reduced ? [] : off.length
                        ? off.map((b, i) => ({ id: id * 10 + i, side: target, x: b.x + b.w / 2, y: b.y + b.h / 2, chunks: 3 }))
                        : [{ id: id * 10, side: target, x: flight.aim.x, y: flight.aim.y, chunks: 1 }];
                    live.current.put({ ...w, flights: w.flights.filter(f => f.id !== id), landed: { ...w.landed, [target]: w.landed[target] + 1 }, debris: [...w.debris, ...debris] });
                    voice('hit');
                    if (debris.length) later(1400, () => { const x = latest.current; live.current.put({ ...x, debris: x.debris.filter(d => !debris.includes(d)) }); });
                });
            }),
            st.events.on('wrong', () => live.current.voice('wrong')),
        ];
        return () => offs.forEach(off => off());
    }, [st.events, lives, flightMs, reduced]);

    useEffect(() => {
        if (st.phase !== 'play') return;
        const id = window.setInterval(() => { const t = Date.now(); setNow(t); useDuelStore.getState().tick(t); }, 250);
        return () => window.clearInterval(id);
    }, [st.phase]);

    // The end card waits for the last stone and, when a castle fell, its crumbling.
    const flying = view.flights.length > 0;
    useEffect(() => {
        if (st.phase !== 'end' || flying || view.shown) return;
        const down = SIDES.some(s => lives - view.landed[s] <= 0);
        const tm = setTimeout(() => { live.current.put({ ...latest.current, shown: true }); live.current.voice('win'); }, down ? KASTEEL.endMs : 400);
        return () => clearTimeout(tm);
    }, [st.phase, flying, view.shown, view.landed, lives]);

    const leave = () => { useDuelStore.getState().stop(); onExit(); };
    const again = () => { timers.current.forEach(clearTimeout); timers.current.clear(); put(freshView()); st.again(); };
    if (!st.sessie) return null;

    const { left, right } = st.sides;
    const beurt = st.mode === 'beurt';
    const sharedClosed = beurt && (!!left.feedback?.correct || !!right.feedback?.correct || (left.locked && right.locked));
    const ended = st.phase === 'end';
    const seconds = st.rule.seconds;
    const msLeft = st.endsAt !== null ? Math.min(seconds * 1000, Math.max(0, st.endsAt - now)) : 0;
    const hpOf = (s: Side) => Math.max(0, lives - view.landed[s]);
    const castle = (s: Side) => ({ hp: hpOf(s), lives, team: s === 'left' ? 'blue' as const : 'orange' as const, name: TEAM[s], hit: view.landed[s], fired: view.fired[s], won: view.shown && st.winner === s });

    return (
        <div className={`oefen-app spel-app tt-app ks-duel${view.shown ? ' is-ended' : ''}${reduced ? ' is-still' : ''}`}>
            <header className="kiosk-topbar spel-topbar">
                <TwoTapButton label={<><ArrowUUpLeft aria-hidden /> <span>Terug</span></>} armName="Terug" groupLabel="Stoppen met spelen" confirm="Ja, stoppen" onConfirm={leave} />
                <span className="tt-mode-name">{beurt ? 'Om beurten' : 'Samen tegelijk'}</span>
                <span className="kiosk-topbar-right">
                    <SoundToggle />
                    {!ended && (
                        <span className="kiosk-timer" role="timer" aria-label={`Nog ${formatClock(msLeft)}`}>
                            <Timer aria-hidden /> {formatClock(msLeft)}
                        </span>
                    )}
                </span>
            </header>
            <main className="spel-stage tt-stage ks-duel-stage">
                <div className="tt-world ks-duel-world">
                    <Scene view="0 14 640 446" left={castle('left')} right={castle('right')} flights={reduced ? [] : view.flights} debris={view.debris} />
                </div>
                <div className="tt-halves">
                    {SIDES.map(side => {
                        const me = st.sides[side];
                        const closed = beurt ? sharedClosed : !!me.feedback;
                        const waiting = beurt && me.locked && !sharedClosed;
                        const got = !!me.feedback?.correct;
                        return (
                            <section key={side} className={`tt-half is-${side}${got ? ' is-got' : ''}`} aria-label={TEAM[side]} style={{ '--tt-team': `var(--tt-${side})` } as CSSProperties}>
                                <p className="tt-team">
                                    <span className="tt-team-name">{TEAM[side]}</span>
                                    <span className="tt-team-score" aria-label={`${me.score} juist`}><Star weight="fill" aria-hidden /> {me.score}</span>
                                </p>
                                {me.question && (
                                    <SpelSignBox className={`tt-sign${closed ? ' is-solved' : ''}`} question={me.question} feedback={closed ? { expected: me.question.answer } : null} flash={closed}
                                        choices={me.question.choices} views={me.question.views} answer={me.question.answer} answerClassName="tt-sign-answer" breakAtRelation />
                                )}
                                <p className="tt-note" aria-live="polite">
                                    {got ? 'Raak!' : waiting ? 'Nu mag de ander.' : closed && me.feedback ? 'Bijna!' : ' '}
                                </p>
                                <DuelKeypad label={`Cijfers ${TEAM[side]}`} questionKey={me.question?.key ?? ''} onAnswer={g => st.answer(side, g)}
                                    disabled={ended || !me.question || !!me.feedback || me.locked} />
                            </section>
                        );
                    })}
                </div>
                {view.shown && st.winner && (
                    <div className="tt-end ks-duel-end" role="dialog" aria-modal="true" aria-labelledby="ks-end-title">
                        <h1 id="ks-end-title" className="oefen-title">{st.winner === 'draw' ? 'Gelijkspel!' : `${TEAM[st.winner]} wint!`}</h1>
                        <p className="oefen-lead">Goed gespeeld, allebei!</p>
                        <dl className="tt-end-scores">
                            {SIDES.map(side => (
                                <div key={side} className={`is-${side}`}>
                                    <dt>{TEAM[side]}</dt>
                                    <dd aria-label={`${st.sides[side].score} juist`}><Star weight="fill" aria-hidden /> {st.sides[side].score}</dd>
                                    <dd className="ks-end-lives" aria-label={`nog ${hpOf(side)} levens`}><Heart weight="fill" aria-hidden /> {hpOf(side)}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="spel-end-more">
                            <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big" onClick={again} autoFocus>
                                <ArrowCounterClockwise aria-hidden /> Nog eens?
                            </button>
                            <button type="button" className="kiosk-btn" onClick={leave}><GameController aria-hidden /> Ander spel</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
