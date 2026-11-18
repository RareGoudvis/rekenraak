import { useEffect, type ReactNode } from 'react';
import { ArrowUUpLeft } from '@phosphor-icons/react';
import TwoTapButton from '../../kiosk/TwoTapButton';
import RotatePrompt from '../../kiosk/RotatePrompt';
import { UPRIGHT_PHONE, useMedia } from '../../kiosk/useMedia';
import SoundToggle from '../SoundToggle';
import { SpelSignBox } from '../SpelVisual';
import { useSpelMusic } from '../music';
import { cueSound, play, type SoundCue } from '../sound';
import type { SkinMeta } from '../skins/types';
import DuelKeypad from './DuelKeypad';
import { BotCard, DuelCard, Hearts, ReadyBanner, RoundClock, Scoreline, ScoreStar, TimerRing } from './DuelHud';
import { teamStyle, teamsOf, type Team } from './teams';
import { useDuelStore } from './duelStore';
import { useDuelEvent } from './useDuel';
import { SIDES, type Side } from './types';
import '../spelen.css';
import './duel.css';

// The shared duel screen: the top bar (Terug, names + round dots, the round clock, sound), the game's scene
// in the band on top with the lives in its corners, two halves below (a keypad each, or the computer), the
// "Ronde N" banner and the round / match cards. A game passes its scene and a few words; the engine runs it.

export interface DuelScreenProps {
    meta: SkinMeta;
    onExit(): void;
    // The game's picture for the band on top (absolutely fills .duel-world).
    scene: ReactNode;
    // The game's root class (its colours, --duel-scene-h for a taller band).
    className?: string;
    // Team names and colours over Blauw / Oranje (Jij / Computer).
    teams?: Partial<Record<Side, Partial<Team>>>;
    // Hearts in the band's corners; false when the scene shows the lives itself (the castles' bars, the rope).
    hearts?: boolean;
    // The score beside the lives counts the round's points instead of its right answers (Kikkers en vliegjes).
    points?: boolean;
    // The score star in the band's corners; false when the scene's own HUD shows it (Robotduel, Kasteel).
    score?: boolean;
    // The call on a right answer ("Raak!", "Trek!").
    rightNote?: string;
    // A picture on the round / match card (the winner's pose).
    cardArt?: ReactNode;
}

// The generic sounds of a duel; a game sets a cue to null in meta.sounds to voice that moment itself.
// 1 speler: the computer's win is the soft 'lost' cue, never a cheer.
function useDuelSounds(meta: SkinMeta, solo: boolean) {
    const voice = (cue: SoundCue) => { const s = cueSound(meta.sounds, cue); if (s) play(s); };
    useDuelEvent('right', () => voice('correct'));
    useDuelEvent('wrong', () => voice('wrong'));
    useDuelEvent('timeout', () => voice('miss'));
    useDuelEvent('roundEnd', ({ winner }) => { if (winner === 'left' || (winner === 'right' && !solo)) play('cheer'); });
    useDuelEvent('matchEnd', ({ winner }) => voice(solo && winner === 'right' ? 'lost' : 'win'));
}

export default function DuelScreen({ meta, onExit, scene, className = '', teams: over, hearts = true, points = false, score = true, rightNote = 'Raak!', cardArt }: DuelScreenProps) {
    const st = useDuelStore();
    const { config, phase, sides } = st;
    const teams = teamsOf(config, over);
    // A phone held upright: "Draai je toestel" over the duel, and the match waits (every clock stands still).
    const upright = useMedia(UPRIGHT_PHONE);
    useEffect(() => {
        const d = useDuelStore.getState();
        if (upright) d.pause(); else d.resume();
    }, [upright, phase]);
    useSpelMusic(meta.music, !upright && (phase === 'ready' || phase === 'play' || phase === 'roundEnd'));
    useDuelSounds(meta, config.players === 1);
    const leave = () => { useDuelStore.getState().stop(); onExit(); };
    if (phase === 'idle') return null;

    const shared = config.stream === 'shared';
    const between = phase === 'roundEnd' || phase === 'matchEnd';
    const maxLives = st.rule.maxLives?.(config) ?? config.lives;

    return (
        <div className={`oefen-app spel-app duel-app ${className}${between ? ' is-between' : ''}${config.players === 1 ? ' is-solo' : ''}${st.paused ? ' is-paused' : ''}${st.pad ? ' is-pad' : ''}`} data-phase={phase}>
            <header className="kiosk-topbar spel-topbar duel-topbar">
                <TwoTapButton label={<><ArrowUUpLeft aria-hidden /> <span>Terug</span></>} armName="Terug" groupLabel="Stoppen met spelen" confirm="Ja, stoppen" onConfirm={leave} />
                <Scoreline teams={teams} />
                <span className="kiosk-topbar-right">
                    <RoundClock />
                    <SoundToggle />
                </span>
            </header>
            <main className="spel-stage duel-stage">
                <div className="duel-world">
                    {scene}
                    {(hearts || score) && SIDES.map(side => (
                        <span key={side} className={`duel-corner is-${side}`} style={teamStyle(teams[side])}>
                            {hearts && <Hearts lives={sides[side].lives} max={Math.max(maxLives, sides[side].lives)} side={side} />}
                            {score && <ScoreStar value={points ? sides[side].points : sides[side].right} points={points} />}
                        </span>
                    ))}
                    <ReadyBanner />
                </div>
                <div className="duel-halves">
                    {SIDES.map(side => {
                        const me = sides[side];
                        const q = me.question;
                        const fb = me.feedback;
                        const bot = config.players === 1 && side === 'right';
                        // The sum is over for this side: answered, timed out, or (shared) taken by the other.
                        const closed = !!fb;
                        const got = !!fb?.correct;
                        const otherGot = shared && !!sides[side === 'left' ? 'right' : 'left'].feedback?.correct;
                        const note = got ? rightNote
                            : otherGot ? 'De ander was sneller!'
                                : fb && fb.given === '' ? (shared ? 'Niemand had hem.' : 'Te laat!')
                                    : fb ? 'Bijna!'
                                        : shared && me.out ? 'Nu mag de ander.'
                                            : shared && me.locked ? 'Even wachten…' : ' ';
                        return (
                            <section key={side} className={`duel-half is-${side}${got ? ' is-got' : ''}${bot ? ' is-bot' : ''}`} aria-label={teams[side].name} style={teamStyle(teams[side])}>
                                {/* The half's colour says whose it is; the clock ring sits beside the sum, on the outer edge. */}
                                <div className="duel-ask">
                                    {q && (
                                        <SpelSignBox className={`duel-sign${closed ? ' is-solved' : ''}`} question={q} feedback={closed ? { expected: q.answer } : null} flash={closed}
                                            choices={q.choices} views={q.views} answer={q.answer} answerClassName="duel-sign-answer" breakAtRelation />
                                    )}
                                    {me.limitMs !== null && q && (
                                        <TimerRing key={`${q.key}-${st.round}`} ms={me.limitMs} running={!closed && !me.out && phase === 'play' && !st.paused} />
                                    )}
                                </div>
                                <p className="duel-note" aria-live="polite">{note}</p>
                                {bot
                                    ? <BotCard thinking={phase === 'play' && !st.paused && !!q && !fb && !me.locked} given={fb && fb.given !== '' ? fb.given : null} correct={fb && fb.given !== '' ? fb.correct : null} />
                                    : <DuelKeypad label={`${st.pad ? 'Keuzes' : 'Cijfers'} ${teams[side].name}`} questionKey={q?.key ?? ''} onAnswer={g => st.answer(side, g)} keyboard={config.players === 1}
                                        question={q} feedback={fb}
                                        disabled={phase !== 'play' || !q || closed || me.locked || me.out} />}
                            </section>
                        );
                    })}
                </div>
                <DuelCard teams={teams} art={cardArt} onNext={() => st.nextRound()} onAgain={() => st.again()} onExit={leave} />
            </main>
            {upright && <RotatePrompt />}
        </div>
    );
}
