import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowCounterClockwise, ArrowUUpLeft, GameController, Star, Timer, UsersThree, Users } from '@phosphor-icons/react';
import { SpelSignBox } from '../../SpelVisual';
import TwoTapButton from '../../../kiosk/TwoTapButton';
import SoundToggle from '../../SoundToggle';
import { useSpelMusic } from '../../music';
import { play } from '../../sound';
import type { SkinScreenProps } from '../types';
import DuelKeypad from './DuelKeypad';
import { DUEL, SIDES, useDuelStore, type Side } from './duelStore';
import '../../spelen.css';
import './touwtrekken.css';

// Touwtrekken: two pupils, one screen. Each right answer pulls the flag one step to that side; 5 steps
// wins, or after 2 minutes the side the flag leans to. No help and no Nakijken in a duel: a wrong answer
// only shows the right one. The rope moves by CSS transition; no animation loop.

const TEAM: Record<Side, string> = { left: 'Blauw', right: 'Oranje' };
// One rope step in scene units (the scene is 1000 wide, the flag starts at 500).
const STEP = 30;

function formatClock(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// A friendly bear facing right, feet at (0, 0), hands on the rope at (44, -55).
function Bear() {
    return (
        <g className="tt-bear-art">
            <rect className="tt-leg" x="-18" y="-40" width="14" height="38" rx="6" />
            <rect className="tt-leg" x="4" y="-40" width="14" height="38" rx="6" />
            <ellipse className="tt-shoe" cx="-8" cy="-2" rx="13" ry="6" />
            <ellipse className="tt-shoe" cx="14" cy="-2" rx="13" ry="6" />
            <ellipse className="tt-shirt" cx="0" cy="-62" rx="28" ry="31" />
            <circle className="tt-fur" cx="-17" cy="-130" r="9" />
            <circle className="tt-fur" cx="19" cy="-130" r="9" />
            <circle className="tt-fur" cx="0" cy="-108" r="27" />
            <ellipse className="tt-muzzle" cx="9" cy="-100" rx="13" ry="10" />
            <circle className="tt-dot" cx="16" cy="-104" r="4.5" />
            <circle className="tt-dot" cx="-4" cy="-115" r="3.6" />
            <circle className="tt-dot" cx="12" cy="-117" r="3.6" />
            <path className="tt-smile" d="M3 -94 Q10 -89 17 -94" />
            <path className="tt-arm" d="M6 -76 L44 -55" />
            <path className="tt-arm" d="M-4 -66 L40 -55" />
            <circle className="tt-hand" cx="44" cy="-55" r="7" />
        </g>
    );
}

function Scene({ rope, winner, pulls }: { rope: number; winner: Side | 'draw' | null; pulls: Record<Side, number> }) {
    const win = DUEL.steps * STEP;
    return (
        <svg className="tt-scene" viewBox="0 0 1000 260" preserveAspectRatio="xMidYMax meet" aria-hidden>
            <rect className="tt-grass" x="-600" y="220" width="2200" height="40" />
            {/* The middle and the two winning lines stay put; the rope and the bears move. */}
            <path className="tt-mid" d="M500 180 L500 240" />
            {SIDES.map(side => {
                const x = 500 + (side === 'left' ? -win : win);
                return (
                    <g key={side} className={`tt-mark is-${side}`}>
                        <path className="tt-mark-line" d={`M${x} 196 L${x} 240`} />
                        <path className="tt-mark-flag" d={`M${x} 196 L${x + (side === 'left' ? -26 : 26)} 204 L${x} 212 Z`} />
                    </g>
                );
            })}
            <g className="tt-pull" style={{ transform: `translateX(${rope * STEP}px)` }} data-rope={rope}>
                <path className="tt-rope" d="M258 165 L742 165" />
                <path className="tt-rope-twist" d="M258 165 L742 165" />
                <path className="tt-flag" d="M500 163 L486 204 L514 204 Z" />
                {SIDES.map(side => (
                    <g key={side} className={`tt-bear is-${side}`} transform={side === 'left' ? 'translate(214 220)' : 'translate(786 220) scale(-1 1)'}>
                        <g key={pulls[side]} className={`tt-bear-move${winner === side ? ' is-cheer' : pulls[side] ? ' is-heave' : ''}`}>
                            <Bear />
                        </g>
                    </g>
                ))}
            </g>
        </svg>
    );
}


function Setup({ onExit }: { onExit(): void }) {
    const start = useDuelStore(s => s.start);
    return (
        <div className="oefen-app spel-app tt-app">
            <main className="oefen-center tt-setup">
                <h1 className="oefen-title">Touwtrekken</h1>
                <p className="oefen-lead">Twee spelers aan één bord. Trek de vlag {DUEL.steps} stappen naar jouw kant!</p>
                <div className="zelf-grid zelf-grid-choices spel-modes">
                    <button type="button" className="zelf-choice zelf-choice-big spel-mode" onClick={() => start('samen')}>
                        <UsersThree weight="duotone" aria-hidden /> Samen tegelijk
                        <span className="tt-mode-sub">Elk een eigen som</span>
                    </button>
                    <button type="button" className="zelf-choice zelf-choice-big spel-mode" onClick={() => start('beurt')}>
                        <Users weight="duotone" aria-hidden /> Om beurten
                        <span className="tt-mode-sub">Eén som: wie eerst juist is, trekt</span>
                    </button>
                </div>
                <p className="tt-setup-note">Na 2 minuten wint wie de vlag het dichtst bij zich heeft.</p>
                <button type="button" className="kiosk-btn" onClick={onExit}><ArrowUUpLeft aria-hidden /> Terug</button>
            </main>
        </div>
    );
}

export default function Touwtrekken({ meta, from, onExit }: SkinScreenProps) {
    // A fresh pre-start screen for this choice before the first paint (never last game's end screen).
    useState(() => useDuelStore.getState().setup({ meta, from }));
    const st = useDuelStore();
    useSpelMusic(meta.music, st.phase === 'play');
    const [now, setNow] = useState(() => Date.now());
    // Who pulled last, per side: restarts that bear's heave.
    const [pulls, setPulls] = useState<Record<Side, number>>({ left: 0, right: 0 });

    useEffect(() => () => useDuelStore.getState().stop(), []);
    useEffect(() => st.events.on('pull', ({ side }) => setPulls(p => ({ ...p, [side]: p[side] + 1 }))), [st.events]);
    // The duel has its own events: a pull plonks, a miss plops, the end plays the jingle (silent while sound is off).
    useEffect(() => {
        const offs = [st.events.on('pull', () => play('plok')), st.events.on('wrong', () => play('plop')), st.events.on('end', () => play('jingle'))];
        return () => offs.forEach(off => off());
    }, [st.events]);
    useEffect(() => {
        if (st.phase !== 'play') return;
        const id = window.setInterval(() => { const t = Date.now(); setNow(t); useDuelStore.getState().tick(t); }, 250);
        return () => window.clearInterval(id);
    }, [st.phase]);

    const leave = () => { useDuelStore.getState().stop(); onExit(); };
    if (st.phase === 'setup' || !st.sessie) return <Setup onExit={leave} />;

    const { left, right } = st.sides;
    const beurt = st.mode === 'beurt';
    // Om beurten: the shared sum is closed once someone got it, or both missed it.
    const sharedClosed = beurt && (!!left.feedback?.correct || !!right.feedback?.correct || (left.locked && right.locked));
    const ended = st.phase === 'end';
    // Clamped: the first render after Start may still hold the setup screen's time.
    const msLeft = st.endsAt !== null ? Math.min(DUEL.seconds * 1000, Math.max(0, st.endsAt - now)) : 0;

    return (
        <div className={`oefen-app spel-app tt-app${ended ? ' is-ended' : ''}`}>
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
            <main className="spel-stage tt-stage">
                <div className="tt-world"><Scene rope={st.rope} winner={st.winner} pulls={pulls} /></div>
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
                                    {got ? 'Trek!' : waiting ? 'Nu mag de ander.' : closed && me.feedback ? 'Bijna!' : ' '}
                                </p>
                                <DuelKeypad label={`Cijfers ${TEAM[side]}`} questionKey={me.question?.key ?? ''} onAnswer={g => st.answer(side, g)}
                                    disabled={ended || !me.question || !!me.feedback || me.locked} />
                            </section>
                        );
                    })}
                </div>
                {ended && st.winner && (
                    <div className="tt-end" role="dialog" aria-modal="true" aria-labelledby="tt-end-title">
                        <h1 id="tt-end-title" className="oefen-title">{st.winner === 'draw' ? 'Gelijkspel!' : `${TEAM[st.winner]} wint!`}</h1>
                        <dl className="tt-end-scores">
                            {SIDES.map(side => (
                                <div key={side} className={`is-${side}`}><dt>{TEAM[side]}</dt><dd><Star weight="fill" aria-hidden /> {st.sides[side].score}</dd></div>
                            ))}
                        </dl>
                        <div className="spel-end-more">
                            <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big" onClick={() => st.again()} autoFocus>
                                <ArrowCounterClockwise aria-hidden /> Nog eens?
                            </button>
                            <button type="button" className="kiosk-btn" onClick={st.toSetup}><Users aria-hidden /> Andere manier</button>
                            <button type="button" className="kiosk-btn" onClick={leave}><GameController aria-hidden /> Ander spel</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
