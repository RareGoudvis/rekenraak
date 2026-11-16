import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkinScreenProps } from '../types';
import DuelScreen from '../../duel/DuelScreen';
import { teamsOf, type Teams } from '../../duel/teams';
import { ScoreStar } from '../../duel/DuelHud';
import { useDuelStore } from '../../duel/duelStore';
import { useDuelEvent, useDuelMatch } from '../../duel/useDuel';
import { SIDES, otherSide, type Side } from '../../duel/types';
import { CardWizard, GlowDefs, Impact, Portrait, Shot, SpellIcon, Wizard, type ImpactView, type WizardView } from './art';
import Arena, { pickArena, readLastArena, saveLastArena, type ArenaKind } from './arenas';
import { FLOOR, MODEL, VIEW, WIZ_X } from './geometry';
import {
    SPELLS, SPELL_NAME, TOVER, TOVER_RULE, freshMarks, healthTone, ladderStep, markHit, nextSpellOf, parseLandTag, shieldOf, spellOf, spellOfFlight,
    type AttackSpell, type Spell, type WizardMarks,
} from './rule';
import { CAST_SOUND, playTover, stepSound } from './sounds';
import './tovenaarsduel.css';

// Tovenaarsduel on the duel engine (rule.ts: the spell follows the streak, IJspijl 1, Vuurbal 2, Bliksem 3, then a
// Schild). This file turns the engine's events into the scene's moments: the cast (launch: the pose, the charge,
// the spell in the air), the impact (land: a burst, hit-stop, a shake and a flash scaled to the damage, the number
// flying off the health bar, the marks it leaves), the shield, the fizzle on a wrong answer, the defeat.

const ARENA_NAME: Record<ArenaKind, string> = { lab: 'Het laboratorium', kerker: 'De kerker', school: 'De tovenaarsschool' };

/** The next match's arena: never the same one twice in a row on this device; dev builds take ?arena=lab|kerker|school. */
function nextArena(): ArenaKind {
    const forced = import.meta.env.DEV ? new URLSearchParams(location.search).get('arena') : null;
    const k = forced === 'lab' || forced === 'kerker' || forced === 'school' ? forced : pickArena(readLastArena());
    saveLastArena(k);
    return k;
}

// How long an impact's burst and a number off the bar stay.
const IMPACT_MS = 1400;
const POP_MS = 1300;

interface Pop { id: number; side: Side; text: string; kind: Spell | 'blok' }
interface Fx {
    cast: Record<Side, { n: number; spell: Spell }>;
    hit: Record<Side, { n: number; spell: AttackSpell; amount: number }>;
    chill: Record<Side, number>;
    oops: Record<Side, number>;
    shieldN: Record<Side, number>;
    marks: Record<Side, WizardMarks>;
    impacts: ImpactView[];
    pops: Pop[];
    // Screen shakes so far and how hard the latest is (1..3, the damage); flashes (lightning) so far.
    shake: { n: number; power: number };
    flash: number;
    // Big hits (Vuurbal, Bliksem) the arena reacts to, and the side hit last.
    jolt: number;
    look: Side | null;
}
const both = <T,>(v: T): Record<Side, T> => ({ left: v, right: v });
const freshFx = (): Fx => ({
    cast: both({ n: 0, spell: 'ijs' as Spell }), hit: both({ n: 0, spell: 'ijs' as AttackSpell, amount: 0 }), chill: both(0), oops: both(0), shieldN: both(0),
    marks: { left: freshMarks(), right: freshMarks() }, impacts: [], pops: [], shake: { n: 0, power: 1 }, flash: 0, jolt: 0, look: null,
});

// The health bars on top: a face, the name and the round's score, a bar with the number, the spell ladder (the next lit).
function Bars({ teams, pops }: { teams: Teams; pops: Pop[] }) {
    const sides = useDuelStore(s => s.sides);
    const max = useDuelStore(s => s.config.lives);
    const phase = useDuelStore(s => s.phase);
    return (
        <div className="tv-hud">
            {SIDES.map(side => {
                const me = sides[side];
                const next = nextSpellOf(me.streak);
                return (
                    <div key={side} className={`tv-bar is-${side} is-${healthTone(me.lives, max)}`}>
                        <Portrait side={side} />
                        <div className="tv-bar-main">
                            <span className="tv-bar-top">
                                <span className="tv-bar-name">{teams[side].name}</span>
                                <ScoreStar value={me.right} className="tv-score" />
                            </span>
                            <span className="tv-health" role="img" aria-label={`${me.lives} van ${max} levens`} data-lives={me.lives}>
                                <span className="tv-health-fill" style={{ '--f': me.lives / Math.max(1, max) } as CSSProperties} />
                                <span className="tv-health-num">{me.lives}</span>
                                {pops.filter(p => p.side === side).map(p => <span key={p.id} className={`tv-pop is-${p.kind}`} aria-hidden>{p.text}</span>)}
                            </span>
                            <span className="tv-ladder" role="img" aria-label={`Volgende spreuk: ${SPELL_NAME[next]}`}>
                                {SPELLS.map((s, i) => (
                                    <span key={s} className={`tv-step is-${s}${s === next && phase === 'play' ? ' is-next' : ''}${i < ladderStep(me.streak) ? ' is-done' : ''}`}>
                                        <svg viewBox="-15 -15 30 30" aria-hidden><SpellIcon spell={s} /></svg>
                                    </span>
                                ))}
                            </span>
                        </div>
                        {!!me.flags.shield && <span className="tv-shield-chip" role="img" aria-label="Schild"><svg viewBox="-15 -15 30 30" aria-hidden><SpellIcon spell="schild" /></svg></span>}
                    </div>
                );
            })}
        </div>
    );
}

// Magic fireworks over the round's winner, in its colour.
function Fireworks({ side }: { side: Side }) {
    const at = side === 'left' ? [[60, 10], [220, -20], [400, 30], [140, 70]] : [[740, 10], [580, -20], [400, 30], [660, 70]];
    return (
        <g className={`tv-fireworks is-${side}`}>
            {at.map(([x, y], k) => (
                <g key={k} transform={`translate(${x} ${y})`}>
                    <g className="tv-firework" style={{ '--k': k } as CSSProperties}>
                        {Array.from({ length: 12 }, (_, i) => <path key={i} className={i % 3 ? 'tv-ray' : 'tv-ray is-star'} transform={`rotate(${i * 30})`} d="M12 0 L38 0" />)}
                    </g>
                </g>
            ))}
        </g>
    );
}

export default function Tovenaarsduel({ meta, from, onExit }: SkinScreenProps) {
    const st = useDuelMatch(meta, from, TOVER_RULE);
    const [arena, setArena] = useState<ArenaKind>(nextArena);
    const [fx, setFx] = useState(freshFx);
    const ids = useRef(1);
    // A match has been played on this screen: the next match ("Nog eens") gets a new arena.
    const played = useRef(false);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
    useEffect(() => {
        const all = timers.current;
        return () => all.forEach(clearTimeout);
    }, []);
    const later = (ms: number, fn: () => void) => {
        const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms);
        timers.current.add(t);
    };
    const solo = st.config.players === 1;

    useDuelEvent('roundStart', ({ round }) => {
        timers.current.forEach(clearTimeout);
        timers.current.clear();
        setFx(freshFx());
        if (round === 1 && played.current) { played.current = false; setArena(nextArena()); }
    });
    useDuelEvent('play', () => { played.current = true; playTover('gong'); });
    // The chime climbs with the streak; the shield goes up at once (no flight).
    useDuelEvent('right', ({ side, streak }) => {
        playTover(stepSound(ladderStep(streak - 1) + 1));
        if (spellOf(streak) === 'schild') {
            setFx(v => ({ ...v, cast: { ...v.cast, [side]: { n: v.cast[side].n + 1, spell: 'schild' } }, shieldN: { ...v.shieldN, [side]: v.shieldN[side] + 1 } }));
            playTover('shieldUp');
        }
    });
    // The cast: the pose, the charge at the staff, the spell in the air (Shot draws the flight).
    useDuelEvent('launch', ({ flight }) => {
        const spell = spellOfFlight(flight);
        setFx(v => ({ ...v, cast: { ...v.cast, [flight.from]: { n: v.cast[flight.from].n + 1, spell } } }));
        playTover(CAST_SOUND[spell]);
    });
    // The impact (the land's effect): burst, shake, flash, the number off the bar, the marks.
    useDuelEvent('effect', ({ by, cause, effect }) => {
        if (cause !== 'land') return;
        const landed = parseLandTag(effect.tag);
        if (!landed) return;
        const { spell, blocked } = landed;
        const side = otherSide(by);
        const amount = blocked ? 0 : TOVER.damage[spell];
        const id = ids.current++;
        const pop: Pop = { id, side, text: blocked ? 'Blok!' : `-${amount}`, kind: blocked ? 'blok' : spell };
        setFx(v => ({
            ...v,
            impacts: [...v.impacts, { id, spell, side, blocked, amount }],
            pops: [...v.pops, pop],
            hit: blocked ? v.hit : { ...v.hit, [side]: { n: v.hit[side].n + 1, spell, amount } },
            chill: spell === 'ijs' && !blocked ? { ...v.chill, [side]: v.chill[side] + 1 } : v.chill,
            marks: blocked ? v.marks : { ...v.marks, [side]: markHit(v.marks[side], spell) },
            shake: { n: v.shake.n + 1, power: blocked ? 1 : amount },
            flash: spell === 'bliksem' ? v.flash + 1 : v.flash,
            jolt: spell !== 'ijs' ? v.jolt + 1 : v.jolt,
            look: side,
        }));
        later(IMPACT_MS, () => setFx(v => ({ ...v, impacts: v.impacts.filter(i => i.id !== id) })));
        later(POP_MS, () => setFx(v => ({ ...v, pops: v.pops.filter(p => p.id !== id) })));
        if (blocked) playTover('shieldBlock');
        playTover(spell === 'ijs' ? 'iceShatter' : spell === 'vuur' ? 'fireBoom' : 'thunder');
    });
    useDuelEvent('damage', ({ lives }) => { if (lives === 0) later(120, () => playTover('poof')); });
    const fizzle = (side: Side) => {
        setFx(v => ({ ...v, oops: { ...v.oops, [side]: v.oops[side] + 1 } }));
        playTover('fizzle');
    };
    useDuelEvent('wrong', ({ side }) => fizzle(side));
    useDuelEvent('timeout', ({ side }) => fizzle(side));
    useDuelEvent('roundEnd', ({ winner }) => {
        if (winner === 'draw') return;
        [400, 1100, 1800].forEach(ms => later(ms, () => playTover('sparkle')));
    });
    // 1 speler lost: the engine's soft 'lost' cue; every other match end gets the fanfare.
    useDuelEvent('matchEnd', ({ winner }) => { if (!(solo && winner === 'right')) later(300, () => playTover('fanfare')); });

    const teams = teamsOf(st.config);
    const between = st.phase === 'roundEnd' || st.phase === 'matchEnd';
    const live = st.phase === 'play' || st.phase === 'ready';
    const max = st.config.lives;
    const wizard = (side: Side): WizardView => {
        const me = st.sides[side];
        return {
            side, model: MODEL[side], lives: me.lives, max, next: live ? nextSpellOf(me.streak) : null, step: live ? ladderStep(me.streak) : 0, streakKey: me.right,
            cast: fx.cast[side], hit: fx.hit[side], chill: fx.chill[side], oops: fx.oops[side], shield: shieldOf(me), shieldN: fx.shieldN[side],
            marks: fx.marks[side], won: between && st.roundWinner === side, ko: me.lives <= 0,
        };
    };
    const winner = between && st.roundWinner !== 'draw' ? st.roundWinner : null;
    const kos = SIDES.filter(s => st.sides[s].lives <= 0).length;
    const shake = fx.shake.n ? ` tv-shake-${fx.shake.n % 2} is-p${fx.shake.power}` : '';
    const placed = (side: Side) => (
        <g key={side} transform={side === 'left' ? `translate(${WIZ_X.left} ${FLOOR})` : `translate(${WIZ_X.right} ${FLOOR}) scale(-1 1)`}>
            <Wizard v={wizard(side)} />
        </g>
    );

    return (
        <DuelScreen meta={meta} onExit={onExit} className={`tv-app is-${arena}`} hearts={false} score={false} rightNote="Spreuk!"
            cardArt={winner ? <CardWizard side={winner} /> : undefined}
            scene={<>
                <div className={`tv-cam${shake}`}>
                    <Arena kind={arena} impact={fx.jolt} side={fx.look} />
                    <svg className={`tv-scene${between ? ' is-cheer' : ''}`} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMax meet"
                        role="img" aria-label={ARENA_NAME[arena]}>
                        <GlowDefs />
                        {winner && <Fireworks side={winner} />}
                        {/* A fixed order: moving a wizard in the DOM would restart its CSS animations. */}
                        {SIDES.map(placed)}
                        {st.flights.map(f => <Shot key={f.id} f={f} shielded={shieldOf(st.sides[f.to])} />)}
                        {fx.impacts.map(i => <Impact key={i.id} i={i} />)}
                    </svg>
                </div>
                {fx.flash > 0 && <div key={`f${fx.flash}`} className="tv-flash" aria-hidden />}
                <Bars teams={teams} pops={fx.pops} />
                {between && kos > 0 && <p className="tv-banner" key={`k${st.round}`}>Poef!</p>}
            </>} />
    );
}
