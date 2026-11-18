import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowCounterClockwise, ArrowRight, GameController, Heart, Star, Timer, Trophy } from '@phosphor-icons/react';
import Burst from '../scene/Burst';
import { useDuelStore } from './duelStore';
import { winsNeeded } from './rules';
import { teamStyle, type Teams } from './teams';
import { SIDES, type DuelBestOf, type Side } from './types';

// The duel HUD pieces (DuelScreen puts them together; a game may use any of them in its own layout).

function formatClock(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The lives as hearts; a lost one pops and stays as an empty outline. */
export function Hearts({ lives, max, side }: { lives: number; max: number; side: Side }) {
    return (
        <span className={`duel-hearts is-${side}`} role="img" aria-label={`${lives} van ${max} levens`} data-lives={lives}>
            {Array.from({ length: max }, (_, i) => {
                const full = side === 'left' ? i < lives : i >= max - lives;
                return <Heart key={i} weight="fill" className={`duel-heart${full ? '' : ' is-lost'}`} aria-hidden />;
            })}
        </span>
    );
}

/** The round's score beside the lives: right answers, or points (points = true); it pops on every change (keyed by value). */
export function ScoreStar({ value, points = false, className = '' }: { value: number; points?: boolean; className?: string }) {
    return (
        <span key={value} className={`duel-score-star ${className}`} role="img" aria-label={points ? `${value} ${value === 1 ? 'punt' : 'punten'}` : `${value} juist`} data-score={value}>
            <Star weight="fill" aria-hidden />{value}
        </span>
    );
}

/** The sum's countdown (every level but Makkelijk), a ring that empties (CSS, restarted per sum by its key). */
export function TimerRing({ ms, running }: { ms: number; running: boolean }) {
    return (
        <span className={`duel-ring${running ? '' : ' is-stopped'}`} style={{ '--dur': `${ms}ms` } as CSSProperties} role="timer" aria-label={`${Math.round(ms / 1000)} seconden`}>
            <svg viewBox="0 0 44 44" aria-hidden>
                <circle className="duel-ring-bg" cx="22" cy="22" r="18" />
                <circle className="duel-ring-fill" cx="22" cy="22" r="18" pathLength="100" transform="rotate(-90 22 22)" />
            </svg>
            <Timer className="duel-ring-icon" weight="bold" aria-hidden />
        </span>
    );
}

/** Round wins as dots: filled per won round, as many as the match needs. */
export function RoundDots({ wins, bestOf, side }: { wins: number; bestOf: DuelBestOf; side: Side }) {
    const need = winsNeeded(bestOf);
    return (
        <span className={`duel-dots is-${side}`} role="img" aria-label={`${wins} ${wins === 1 ? 'ronde' : 'rondes'} gewonnen`}>
            {Array.from({ length: need }, (_, i) => <span key={i} className={`duel-dot${i < wins ? ' is-won' : ''}`} aria-hidden />)}
        </span>
    );
}

/** The top bar's middle: both names, their round dots and the round number. */
export function Scoreline({ teams }: { teams: Teams }) {
    const { sides, config, round } = useDuelStore();
    return (
        <span className="duel-scoreline">
            {SIDES.map(side => (
                <span key={side} className={`duel-score is-${side}`} style={teamStyle(teams[side])}>
                    <span className="duel-name">{teams[side].name}</span>
                    {config.bestOf > 1 && <RoundDots wins={sides[side].wins} bestOf={config.bestOf} side={side} />}
                </span>
            ))}
            <span className="duel-round">{config.bestOf > 1 ? `Ronde ${round}` : 'Eén ronde'}</span>
        </span>
    );
}

/** The round clock (a game with roundSeconds): ticks on its own, four times a second. */
export function RoundClock() {
    const endsAt = useDuelStore(s => s.roundEndsAt);
    const total = useDuelStore(s => (s.config.roundSeconds ?? 0) * 1000);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (endsAt === null) return;
        const id = window.setInterval(() => setNow(Date.now()), 250);
        return () => window.clearInterval(id);
    }, [endsAt]);
    if (!total) return null;
    const left = endsAt === null ? total : Math.min(total, Math.max(0, endsAt - now));
    return <span className={`kiosk-timer duel-clock${left <= 10_000 && endsAt !== null ? ' is-low' : ''}`} role="timer" aria-label={`Nog ${formatClock(left)}`}><Timer aria-hidden /> {formatClock(left)}</span>;
}

/** The computer's half (1 speler): a friendly robot face that thinks, then shows what it typed. */
export function BotCard({ thinking, given, correct }: { thinking: boolean; given: string | null; correct: boolean | null }) {
    return (
        <div className={`duel-bot${thinking ? ' is-thinking' : ''}${correct === true ? ' is-right' : correct === false ? ' is-wrong' : ''}`} aria-live="polite">
            <svg className="duel-bot-face" viewBox="0 0 120 110" aria-hidden>
                <path className="duel-bot-antenna" d="M60 22 V8" />
                <circle className="duel-bot-bulb" cx="60" cy="7" r="6" />
                <rect className="duel-bot-head" x="14" y="22" width="92" height="74" rx="22" />
                <rect className="duel-bot-screen" x="26" y="34" width="68" height="44" rx="14" />
                <g className="duel-bot-eyes">
                    <circle cx="46" cy="52" r="7" /><circle cx="74" cy="52" r="7" />
                </g>
                <path className="duel-bot-mouth" d={correct === false ? 'M48 70 Q60 64 72 70' : 'M48 66 Q60 74 72 66'} />
                <rect className="duel-bot-ear" x="4" y="46" width="12" height="26" rx="5" />
                <rect className="duel-bot-ear" x="104" y="46" width="12" height="26" rx="5" />
            </svg>
            <p className="duel-bot-bubble">
                {given !== null
                    ? <span className="kiosk-math duel-bot-given">{given === '' ? '…' : given}</span>
                    : thinking ? <span className="duel-bot-dots" aria-label="Denkt na"><i /><i /><i /></span> : <span>&nbsp;</span>}
            </p>
        </div>
    );
}

/** "Ronde 2" while the round gets ready, then a short "Start!" that fades out by itself (CSS). */
export function ReadyBanner() {
    const phase = useDuelStore(s => s.phase);
    const round = useDuelStore(s => s.round);
    const bestOf = useDuelStore(s => s.config.bestOf);
    if (phase === 'ready') return <p className="duel-banner is-ready" key={`r${round}`}>{bestOf > 1 ? `Ronde ${round}` : 'Klaar?'}</p>;
    if (phase === 'play') return <p className="duel-banner is-go" key={`g${round}`} aria-hidden>Start!</p>;
    return null;
}

// Confetti from a few points, again every 1.3 s while the card is up.
function Confetti() {
    const [wave, setWave] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setWave(w => (w < 4 ? w + 1 : w)), 1300);
        return () => window.clearInterval(id);
    }, []);
    return (
        <div className="duel-confetti" aria-hidden>
            {['15%', '50%', '85%'].map((x, i) => <Burst key={`${wave}-${i}`} kind="pieces" x={x} y={i === 1 ? '18%' : '30%'} spread={240} count={26} seed={wave * 3 + i + 1} />)}
        </div>
    );
}

interface CardProps { teams: Teams; onNext(): void; onExit(): void; onAgain(): void; art?: ReactNode }

/** Between rounds: who won it, the round dots, Volgende ronde. At the end of the match: the winner, confetti, Nog eens / Ander spel. */
export function DuelCard({ teams, onNext, onExit, onAgain, art }: CardProps) {
    const { phase, card, roundWinner, matchWinner, sides, config, round } = useDuelStore();
    if (!card || (phase !== 'roundEnd' && phase !== 'matchEnd')) return null;
    const solo = config.players === 1;
    const match = phase === 'matchEnd' && matchWinner;
    const title = match
        ? (solo ? (matchWinner === 'left' ? 'Jij wint!' : 'De computer wint!') : `${teams[matchWinner].name} wint!`)
        : roundWinner === 'draw' ? 'Gelijk!'
            : solo ? (roundWinner === 'left' ? `Jij wint ronde ${round}!` : `De computer wint ronde ${round}.`)
                : `${teams[roundWinner!].name} wint ronde ${round}!`;
    const lead = match
        ? (solo && matchWinner === 'right' ? 'Bijna! Nog eens?' : solo ? 'Super gespeeld!' : 'Goed gespeeld, allebei!')
        : roundWinner === 'draw' ? 'Niemand krijgt een punt.' : config.bestOf > 1 ? `Wie eerst ${winsNeeded(config.bestOf)} rondes wint, wint.` : '';
    return (
        <div className={`duel-card-wrap${match ? ' is-match' : ''}`}>
            {match && <Confetti />}
            <div className={`duel-card${match ? ' is-match' : ''}`} role="dialog" aria-modal="true" aria-labelledby="duel-card-title"
                style={matchWinner || (roundWinner && roundWinner !== 'draw') ? teamStyle(teams[(matchWinner || roundWinner) as Side]) : undefined}>
                {match && <Trophy className="duel-trophy" weight="fill" aria-hidden />}
                {art}
                <h1 id="duel-card-title" className="oefen-title duel-card-title">{title}</h1>
                {lead && <p className="oefen-lead duel-card-lead">{lead}</p>}
                <dl className="duel-card-scores">
                    {SIDES.map(side => (
                        <div key={side} className={`is-${side}${(match ? matchWinner : roundWinner) === side ? ' is-winner' : ''}`} style={teamStyle(teams[side])}>
                            <dt>{teams[side].name}</dt>
                            {config.bestOf > 1 && <dd><RoundDots wins={sides[side].wins} bestOf={config.bestOf} side={side} /></dd>}
                            <dd className="duel-card-right" aria-label={`${match ? sides[side].totalRight : sides[side].right} juist`}>
                                <Star weight="fill" aria-hidden /> {match ? sides[side].totalRight : sides[side].right}
                            </dd>
                        </div>
                    ))}
                </dl>
                <div className="spel-end-more">
                    {match ? (
                        <>
                            <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big" onClick={onAgain} autoFocus>
                                <ArrowCounterClockwise aria-hidden /> Nog eens
                            </button>
                            <button type="button" className="kiosk-btn" onClick={onExit}><GameController aria-hidden /> Ander spel</button>
                        </>
                    ) : (
                        <button type="button" className="kiosk-btn kiosk-btn-primary kiosk-btn-big" onClick={onNext} autoFocus>
                            Volgende ronde <ArrowRight aria-hidden />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
