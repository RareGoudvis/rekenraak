import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { SkinEndingProps, SkinProps } from '../types';
import { SpelChoiceFace, SpelSign } from '../../SpelVisual';
import { choiceLabel, faceChars, faceKind, signClass } from '../../spelChoice';
import { play } from '../../sound';
import { Burst, Clouds } from '../../scene';
import { FIRE, WINDOWS, decorOf, fireMood, fireStart, fireStep, flameScale, petOf, petWindow, rescuedOf, tooHot, windowsOf, type FireState, type Pet } from './fire';
import { GRIP, GROUND, HOLDERS, NOZZLE_LEN, PET_ROW, PIVOT, REST, RESIDENTS, SHEET, STAGE_H, STAGE_W, aimAt, pct, petSpot, rowOf, sprayPath, winBox, winCentre, winPercent } from './geometry';
import { Backdrop, BlockArt, FighterArt, Flames, LadderArt, PetArt, ResidentArt, SheetArt, Smoke, Sparks, TruckArt, WindowArt, type CrewPose, type CrowdMood, type FighterPose, type WinState } from './art';
import { playBrandweer } from './sounds';
import './brandweer.css';

// Brandweer: a 3 × 3 apartment block is on fire; the four options burn in four of its windows (the rest are dark, or
// hold a plant, a lamp or a waiting pet: never a person). Tap (or 1–4) the right window: the ladder swings to its
// floor and the hose sprays it out. The fire level (fire.ts) rises with the clock and per mistake and drops per
// window sprayed out; the truck's heat gauge, the flames and the smoke show it. A building fully out makes way for
// the next one; too hot = the crew shrugs and everyone waves from the lawn (the friendly early end, onFail).
// No rAF: the session's clock drives the fire, CSS loops make the scene live.

// The too-hot moment before the end screen.
export const TOO_HOT_MS = 1600;
// A pet's jump from its window into the sheet and over to the lawn; it lands in the sheet at JUMP_LAND.
export const JUMP_MS = 1800;
const JUMP_LAND = 0.42;
// The ladder rises from the cab a moment after the start (the first sum).
const RAISE_MS = 350;

const KEYS = ['1', '2', '3', '4'];
const v = (vars: Record<string, string | number>) => vars as CSSProperties;
const rad = (deg: number) => (deg * Math.PI) / 180;

// The nozzle's mouth in the stage for an aim (the basket stays level, so the grip is a plain offset from the tip).
function nozzleOf(row: number, target: { x: number; y: number }) {
    const { tip } = aimAt(row);
    const grip = { x: tip.x + GRIP.x, y: tip.y + GRIP.y };
    const angle = (Math.atan2(target.y - grip.y, target.x - grip.x) * 180) / Math.PI;
    return { angle, mouth: { x: grip.x + Math.cos(rad(angle)) * NOZZLE_LEN, y: grip.y + Math.sin(rad(angle)) * NOZZLE_LEN } };
}

const detailOf = (buildings: number, pets: number) => {
    const parts = [
        buildings > 0 && `${buildings} ${buildings === 1 ? 'gebouw' : 'gebouwen'} helemaal geblust`,
        pets > 0 && `${pets} ${pets === 1 ? 'dier' : 'dieren'} gered`,
    ].filter(Boolean);
    return parts.length ? `${parts.join(' en ')}!` : undefined;
};

interface Snap { key: string; buildings: number; rescued: number; supers: number; burnt: number[] }

export default function Brandweer({ question, choices, views, phase, feedback, onAnswer, onFail, onReport, progress, events }: SkinProps) {
    const options = choices ?? [];
    const elapsedMs = progress.msTotal !== null && progress.msLeft !== null ? progress.msTotal - progress.msLeft : 0;

    // The fire follows the session's counts (met hulp never heats it); kept as derived state.
    const [fire, setFire] = useState<FireState>(fireStart);
    const counts = { elapsedMs, right: progress.right, mistakes: progress.mistakes, streak: progress.streak };
    if (fire.elapsedMs !== counts.elapsedMs || fire.right !== counts.right || fire.mistakes !== counts.mistakes || fire.streak !== counts.streak) {
        setFire(fireStep(fire, counts));
    }
    const rescued = rescuedOf(progress.right);

    // What held when this sum came: the building, the pet in its window, the windows that burned before.
    const key = question?.key ?? '';
    const [snap, setSnap] = useState<Snap>({ key, buildings: fire.buildings, rescued, supers: fire.supers, burnt: [] });
    const petWin = petWindow(snap.rescued);
    const burning = question ? windowsOf(snap.key, options.length, petWin) : [];
    if (snap.key !== key) {
        const same = fire.buildings === snap.buildings;
        setSnap({ key, buildings: fire.buildings, rescued, supers: fire.supers, burnt: same ? [...new Set([...snap.burnt, ...burning])] : [] });
    }

    const [aim, setAim] = useState<{ key: string; win: number } | null>(null);
    const [raised, setRaised] = useState(false);
    useEffect(() => { const id = window.setTimeout(() => setRaised(true), RAISE_MS); return () => window.clearTimeout(id); }, []);

    // A pet jumps every RESCUE_EVERY right answers (keyed by its number, so the next sum never cuts it short).
    const [jump, setJump] = useState<{ n: number; from: number; pet: Pet } | null>(null);
    const [seenRescued, setSeenRescued] = useState(rescued);
    if (seenRescued !== rescued) {
        setSeenRescued(rescued);
        if (rescued > seenRescued) setJump({ n: rescued - 1, from: petWindow(rescued - 1), pet: petOf(rescued - 1) });
    }
    useEffect(() => {
        if (!jump) return;
        playBrandweer(jump.pet);
        const land = window.setTimeout(() => playBrandweer('bounce'), JUMP_MS * JUMP_LAND);
        const done = window.setTimeout(() => setJump(j => (j === jump ? null : j)), JUMP_MS);
        return () => { window.clearTimeout(land); window.clearTimeout(done); };
    }, [jump]);

    const live = useRef({ onFail, onReport });
    useLayoutEffect(() => { live.current = { onFail, onReport }; });

    // The end screen's line: buildings put out and pets saved.
    useEffect(() => {
        const detail = detailOf(fire.buildings, rescued);
        if (detail) live.current.onReport?.({ detail });
    }, [fire.buildings, rescued]);

    // A building fully out: the truck's bell and the crowd's cheer; the next building comes with the siren.
    useEffect(() => {
        if (fire.buildings === 0) return;
        playBrandweer('bel');
        play('cheer');
    }, [fire.buildings]);
    const look = snap.buildings;
    useEffect(() => { playBrandweer('sirene'); }, [look]);

    useEffect(() => {
        const offRight = events.on('correct', ({ streak }) => {
            playBrandweer(streak > 0 && streak % FIRE.streak === 0 ? 'super' : 'spray');
            playBrandweer('sis');
        });
        const offWrong = events.on('wrong', () => playBrandweer('dribble'));
        return () => { offRight(); offWrong(); };
    }, [events]);

    // Too hot: the crew shrugs for a moment, then the round ends. Never under help (the clock stands still there).
    const hot = tooHot(fire.level);
    const failed = useRef(false);
    useEffect(() => {
        if (!hot || failed.current || phase === 'help') return;
        const id = window.setTimeout(() => { failed.current = true; live.current.onFail(); }, TOO_HOT_MS);
        return () => window.clearTimeout(id);
    }, [hot, phase]);

    const pick = (i: number) => {
        if (phase !== 'play' || !question || options[i] === undefined || hot) return;
        setAim({ key: question.key, win: burning[i] });
        onAnswer(options[i]);
    };
    const pickRef = useRef(pick);
    useLayoutEffect(() => { pickRef.current = pick; });
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const i = KEYS.indexOf(e.key);
            if (i >= 0) { e.preventDefault(); pickRef.current(i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!question) return <div className="bw-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const mine = aim && aim.key === question.key ? aim.win : null;
    const sprayed = phase === 'right' && mine !== null;
    const dribble = phase === 'wrong' && mine !== null;
    // This right answer put the whole building out: every window steams.
    const allOut = phase === 'right' && fire.buildings > snap.buildings;
    const superNow = phase === 'right' && fire.supers > snap.supers;
    const answerWin = flash && feedback && !feedback.correct ? burning[options.indexOf(feedback.expected)] : undefined;
    const mood = fireMood(fire.level);
    const scale = flameScale(fire.level);

    const stateOf = (w: number): WinState => {
        const b = burning.indexOf(w);
        if (b >= 0) return (sprayed && w === mine) || allOut ? 'out' : 'fire';
        if (w === petWin && !(jump && jump.from === w)) return 'pet';
        return decorOf(w, look);
    };

    // The ladder: resting over the cab at first and when too hot, else raised to the floor it last sprayed (the middle one at the start).
    const row = mine !== null ? rowOf(mine) : aim ? rowOf(aim.win) : 1;
    const target = winCentre(mine ?? aim?.win ?? 4);
    // A tap before the ladder rose raises it at once.
    const up = (raised || aim !== null) && !hot;
    const a = up ? aimAt(row) : null;
    const nozzle = nozzleOf(row, target);
    const crewPose: CrewPose = hot ? 'shrug' : dribble ? 'oops' : allOut ? 'cheer' : 'aim';
    const crowd: CrowdMood = hot ? 'wave' : sprayed ? 'cheer' : mood === 'hot' ? 'oh' : 'watch';
    const holders: FighterPose = hot ? 'shrug' : allOut ? 'cheer' : 'hold';
    const lawnPets = rescued - (jump ? 1 : 0);

    const cls = ['bw-root', `is-${mood}`, phase === 'help' && 'is-paused', hot && 'is-toohot', phase === 'wrong' && 'is-wrong', allOut && 'is-allout'].filter(Boolean).join(' ');
    return (
        <div className={cls} style={v({ '--bw-heat': fire.level / FIRE.max })}>
            <div className="bw-sky" aria-hidden>
                <Clouds layer="far" outline={false} count={3} band={[2, 18]} size={[120, 200]} paused={phase === 'help'} seed={4} />
                <Clouds layer="mid" count={2} band={[6, 26]} size={[110, 170]} paused={phase === 'help'} seed={9} />
            </div>
            <div className="bw-glow" aria-hidden />
            <div className="bw-top">
                <p className={`bw-sign kiosk-math${flash ? ' is-solved' : ''}${signClass(question)}`} aria-live="polite">
                    <SpelSign question={question} feedback={feedback} flash={flash} choices={options} views={views} answerClassName="bw-sign-answer" />
                </p>
            </div>
            <div className="bw-scene">
                <div className="bw-stage">
                    <svg className="bw-svg" viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden>
                        <Backdrop />
                        <g key={`block-${look}`} className={look > 0 ? 'bw-arrive' : undefined}>
                            <BlockArt look={look} />
                            {Array.from({ length: WINDOWS }, (_, w) => (
                                <WindowArt key={w} i={w} state={stateOf(w)} pet={petOf(snap.rescued)} burnt={snap.burnt.includes(w) && stateOf(w) !== 'fire'} glow={mood === 'hot' && w !== petWin} />
                            ))}
                            {burning.map(w => stateOf(w) === 'fire' && (
                                <g key={`${question.key}-${w}`} className="bw-ignite">
                                    <Flames i={w} scale={scale} flare={dribble && w === mine} />
                                </g>
                            ))}
                            {burning.map(w => {
                                const b = winBox(w);
                                const out = stateOf(w) === 'out';
                                return <Smoke key={`s-${w}`} x={b.x + b.w / 2 + 20} y={b.y - 6} n={out ? 4 : 3} size={out ? 0.9 : mood === 'hot' ? 1.1 : 0.8} rise={out ? 150 : 110} dark={!out && mood === 'hot'} steam={out} />;
                            })}
                            {/* The roof: a thin plume while it is calm, a big dark one when it is hot. */}
                            <Smoke x={800} y={150} n={mood === 'hot' ? 7 : mood === 'warm' ? 5 : 3} size={mood === 'hot' ? 1.7 : mood === 'warm' ? 1.3 : 0.9} rise={260} dark={mood === 'hot'} />
                            {mood !== 'calm' && <Smoke x={1080} y={150} n={mood === 'hot' ? 6 : 4} size={mood === 'hot' ? 1.5 : 1.1} rise={240} dark={mood === 'hot'} />}
                            {burning.filter(w => stateOf(w) === 'fire').map(w => {
                                const b = winBox(w);
                                return <Sparks key={`k-${w}`} x={b.x + b.w / 2} y={b.y + 20} n={mood === 'hot' ? 6 : mood === 'warm' ? 4 : 2} />;
                            })}
                        </g>

                        {/* The rescue sheet in front of the door, and the crowd and the saved pets on the lawn. */}
                        <g transform={`translate(${HOLDERS[0]} ${GROUND + 26})`}><FighterArt pose={holders} /></g>
                        <g transform={`translate(${HOLDERS[1]} ${GROUND + 26})`}><FighterArt pose={holders} side={-1} /></g>
                        <g transform={`translate(${SHEET.x} ${SHEET.y})`}>
                            <g key={`sheet-${jump?.n ?? -1}`} className={jump ? 'bw-sheet-bounce' : undefined} style={v({ '--bw-jump': `${JUMP_MS}ms` })}><SheetArt rx={SHEET.rx} ry={SHEET.ry} /></g>
                        </g>
                        {RESIDENTS.map((x, i) => (
                            <g key={i} transform={`translate(${x} ${GROUND + 22}) scale(1.18)`}>
                                <g className="bw-person" style={v({ '--k': i })}><ResidentArt i={i} mood={crowd} /></g>
                            </g>
                        ))}
                        {Array.from({ length: Math.min(lawnPets, PET_ROW.max) }, (_, k) => {
                            const s = petSpot(k);
                            return <g key={k} transform={`translate(${s.x} ${s.y}) scale(.82)`}><g className="bw-lawn-pet" style={v({ '--k': k })}><PetArt pet={petOf(k)} pose="sit" /></g></g>;
                        })}
                        {jump && <Jumper key={jump.n} from={jump.from} to={petSpot(Math.min(jump.n, PET_ROW.max - 1))} pet={jump.pet} />}

                        <TruckArt level={fire.level} />
                        <LadderArt angle={a ? a.angle : REST.angle} ext={a ? a.ext : REST.ext} nozzle={up ? nozzle.angle : -20} pose={crewPose} />
                        {sprayed && up && (
                            <g key={`spray-${question.key}`} className={`bw-spray${superNow ? ' is-super' : ''}`}>
                                {superNow && [-70, -48, -26].map((lift, k) => (
                                    <path key={k} className={`bw-rainbow is-${k}`} d={sprayPath(nozzle.mouth, { x: target.x, y: target.y + lift })} pathLength={100} />
                                ))}
                                <path className="bw-jet" d={sprayPath(nozzle.mouth, target)} pathLength={100} />
                                <path className="bw-jet-core" d={sprayPath(nozzle.mouth, target)} pathLength={100} />
                            </g>
                        )}
                        {dribble && up && (
                            <g key={`drib-${question.key}`} className="bw-dribble" transform={`translate(${nozzle.mouth.x} ${nozzle.mouth.y})`}>
                                <path className="bw-jet is-weak" d="M0 0 q34 -8 50 44" pathLength={100} />
                                {[0, 1, 2, 3].map(k => <circle key={k} className="bw-drop" cx={44 + (k % 2) * 10} cy="40" r={10 - k * 2} style={v({ '--k': k })} />)}
                            </g>
                        )}
                    </svg>

                    <div key={`wins-${look}`} className={`bw-windows${look > 0 ? ' is-arrive' : ''}`} role="group" aria-label="Kies het antwoord">
                        {options.map((c, i) => {
                            const w = burning[i];
                            if (w === undefined) return null;
                            const face = views?.[i];
                            const st = w === mine ? (phase === 'right' ? ' is-hit' : phase === 'wrong' ? ' is-miss' : '') : w === answerWin ? ' is-answer' : flash ? ' is-rest' : '';
                            return (
                                <button key={`${question.key}-${i}`} type="button" className={`bw-window${st}`} style={winPercent(w)} data-window={w}
                                    disabled={phase !== 'play' || hot} aria-label={choiceLabel(c, face)}
                                    onPointerDown={e => { if (e.button === 0) pick(i); }}
                                    onClick={() => pick(i)}>
                                    <span className={`bw-num kiosk-math is-${faceKind(face)}`} style={v({ '--face-chars': faceChars(face), '--num-chars': choiceLabel(c, face).length })} aria-hidden><SpelChoiceFace value={c} view={face} /></span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="bw-fx" aria-hidden>
                        {sprayed && mine !== null && (() => {
                            const b = winBox(mine);
                            const c = pct(b.x + b.w / 2, b.y + b.h * 0.4);
                            return (
                                <span key={`fx-${question.key}`}>
                                    <Burst kind="splash" x={c.x} y={c.y} spread={superNow ? 90 : 60} count={superNow ? 14 : 9} seed={progress.right} />
                                    <Burst kind="smoke" x={c.x} y={pct(0, b.y + 16).y} spread={50} count={5} seed={progress.right + 3} />
                                </span>
                            );
                        })()}
                        {dribble && mine !== null && (() => {
                            const c = pct(winCentre(mine).x, winBox(mine).y);
                            return <Burst key={`flare-${question.key}`} kind="sparkle" x={c.x} y={c.y} spread={70} count={8} seed={progress.mistakes} />;
                        })()}
                        {superNow && <span key={`super-${fire.supers}`} className="bw-callout is-super" style={{ left: pct(PIVOT.x + 200, 0).x }}>Superstraal!</span>}
                        {allOut && (
                            <span key={`out-${fire.buildings}`}>
                                <span className="bw-callout is-out">Geblust!</span>
                                <Burst kind="pieces" x="58%" y="30%" spread={260} count={22} seed={fire.buildings} />
                            </span>
                        )}
                        {hot && <span className="bw-callout is-hot">Oei, te heet!</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// A pet's jump: out of its window, down into the sheet (a bounce), and over to its spot on the lawn.
function Jumper({ from, to, pet }: { from: number; to: { x: number; y: number }; pet: Pet }) {
    const b = winBox(from);
    const start = { x: b.x + b.w / 2, y: b.y + b.h - 12 };
    return (
        <g className="bw-jumper" style={v({
            '--fx': `${start.x}px`, '--fy': `${start.y}px`, '--sx': `${SHEET.x}px`, '--sy': `${SHEET.y - 8}px`,
            '--lx': `${to.x}px`, '--ly': `${to.y}px`, '--bw-jump': `${JUMP_MS}ms`,
        })}>
            <g className="bw-jumper-spin"><PetArt pet={pet} pose="jump" /></g>
        </g>
    );
}

// The end screen: held = the block is out, the crew and the residents cheer under a rainbow, the saved pets beside them;
// too hot = smoke over the block, the crew shrugs with sooty faces and everyone waves from the lawn, nobody hurt.
export function BrandweerEnding({ outcome, progress }: SkinEndingProps) {
    const failed = outcome === 'failed';
    const pets = Math.max(1, Math.min(4, rescuedOf(progress.right)));
    const aim = aimAt(1);
    return (
        <div className={`spel-ending bw-ending${failed ? ' is-failed' : ' is-won'}`}>
            <svg viewBox="20 330 1640 640" preserveAspectRatio="xMidYMax meet" aria-hidden>
                <rect className="bw-end-sky" x="-400" y="0" width="2600" height="1000" />
                <Backdrop />
                <BlockArt look={0} />
                {Array.from({ length: WINDOWS }, (_, w) => <WindowArt key={w} i={w} state={failed ? (w % 2 ? 'out' : 'dark') : decorOf(w, 0)} burnt={failed || w % 3 === 0} glow={false} />)}
                {failed ? (
                    <>
                        {[3, 7].map(w => <Flames key={w} i={w} scale={0.75} flare={false} />)}
                        <Smoke x={720} y={420} n={6} size={1.5} rise={260} dark />
                        <Smoke x={1120} y={600} n={5} size={1.3} rise={260} />
                    </>
                ) : (
                    <g className="bw-end-rainbow">
                        {[0, 1, 2].map(k => <path key={k} className={`bw-rainbow is-${k} is-still`} d={`M${560 + k * 22} 880 A ${400 - k * 22} ${380 - k * 22} 0 0 1 ${1340 - k * 22} 880`} />)}
                    </g>
                )}
                <TruckArt level={failed ? FIRE.max : 0} />
                <LadderArt angle={failed ? REST.angle : aim.angle} ext={failed ? REST.ext : aim.ext} nozzle={-10} pose={failed ? 'shrug' : 'cheer'} />
                <g transform={`translate(${HOLDERS[0]} ${GROUND + 26})`}><FighterArt pose={failed ? 'shrug' : 'cheer'} /></g>
                <g transform={`translate(${HOLDERS[1]} ${GROUND + 26})`}><FighterArt pose={failed ? 'shrug' : 'cheer'} side={-1} /></g>
                {RESIDENTS.map((x, i) => (
                    <g key={i} transform={`translate(${x} ${GROUND + 22}) scale(1.18)`}>
                        <g className="bw-person" style={v({ '--k': i })}><ResidentArt i={i} mood={failed ? 'wave' : 'cheer'} /></g>
                    </g>
                ))}
                {Array.from({ length: pets }, (_, k) => {
                    const s = petSpot(k);
                    return <g key={k} transform={`translate(${s.x} ${s.y}) scale(.82)`}><g className="bw-lawn-pet" style={v({ '--k': k })}><PetArt pet={petOf(k)} pose="sit" /></g></g>;
                })}
            </svg>
        </div>
    );
}
