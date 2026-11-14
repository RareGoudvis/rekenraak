import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { ZOMBIE, joinAt, stepCloser, walk, zombieSpeed } from './walk';
import { DEFENCE, defenceAfter, hitOf, zombieLevelOf, type ZombieLevel } from './defence';
import './zombies.css';

// Zombies: silly round zombies shuffle in from the right, the front one holding the sum on a sign. A right
// answer flops it over in a puff of smoke; a wrong one brings it a step closer. At the barricade it bumps
// (a boing) and that sum counts as a mistake: a small barricade breaks (Normaal), else one survivor is
// caught and turns into a silly green zombie. All caught = the friendly early end; survivors left at the end cheer.
// One small rAF loop moves them (positions live outside React); everything else is CSS.

type Mood = 'walk' | 'flop' | 'boing';
interface Zombie { id: number; mood: Mood }

const PUFFS = 6;
const START: Zombie[] = Array.from({ length: ZOMBIE.count }, (_, id) => ({ id, mood: 'walk' }));

// Moves one zombie's lane; data-x is its spot on the street (tests, debugging).
function place(el: HTMLDivElement | undefined, x: number | undefined) {
    if (!el || x === undefined) return;
    el.style.transform = `translateX(${x}%)`;
    el.dataset.x = x.toFixed(1);
}

function ZombieArt() {
    return (
        <svg className="zb-art" viewBox="0 0 100 130" aria-hidden>
            <g className="zb-leg zb-leg-a">
                <rect className="zb-pants" x="33" y="96" width="14" height="26" rx="6" />
                <ellipse className="zb-shoe" cx="36" cy="124" rx="11" ry="5" />
            </g>
            <g className="zb-leg zb-leg-b">
                <rect className="zb-pants" x="54" y="96" width="14" height="26" rx="6" />
                <ellipse className="zb-shoe" cx="57" cy="124" rx="11" ry="5" />
            </g>
            <ellipse className="zb-skin" cx="50" cy="76" rx="27" ry="27" />
            <path className="zb-shirt" d="M23 78 Q50 62 77 78 L78 94 L71 101 L64 94 L57 102 L50 94 L43 102 L36 94 L29 101 L22 94 Z" />
            <circle className="zb-skin" cx="50" cy="38" r="27" />
            <path className="zb-hair" d="M42 13 Q47 3 53 11 Q57 4 62 12" />
            <circle className="zb-eye" cx="38" cy="35" r="10" />
            <circle className="zb-eye" cx="61" cy="32" r="8" />
            <circle className="zb-pupil" cx="34" cy="38" r="4.5" />
            <circle className="zb-pupil" cx="63" cy="29" r="3.5" />
            <path className="zb-mouth" d="M36 53 Q48 62 61 51" />
            <rect className="zb-tooth" x="44" y="55" width="6" height="6" rx="1" />
            {/* Arms out front, the zombie way: an outline stroke under a skin stroke. */}
            <path className="zb-arm-line" d="M38 72 L6 68" />
            <path className="zb-arm-skin" d="M38 72 L6 68" />
            <path className="zb-arm-line" d="M40 84 L9 84" />
            <path className="zb-arm-skin" d="M40 84 L9 84" />
        </svg>
    );
}

// A survivor: a round little person. Caught = the same one as a silly green zombie (googly eyes, arms out).
type Pose = 'stand' | 'cheer' | 'zombie';
const HAIR = [
    'M10 22 Q12 6 30 6 Q48 6 50 22 Q40 14 30 16 Q20 14 10 22 Z',
    'M9 24 Q10 4 30 5 Q50 4 51 24 L46 18 L40 22 L34 16 L28 22 L22 16 L16 22 Z',
    'M12 20 Q14 4 32 6 Q48 8 48 20 Q44 12 36 12 Q34 20 24 14 Q18 14 12 20 Z',
];

export function SurvivorArt({ i, pose }: { i: number; pose: Pose }) {
    const z = pose === 'zombie';
    const arms = pose === 'cheer' ? 'M16 52 L6 30 M44 52 L54 30' : z ? 'M18 52 L56 46 M20 62 L58 60' : 'M16 52 L10 72 M44 52 L50 72';
    return (
        <svg className="zb-sv-art" viewBox="0 0 60 100" aria-hidden>
            <rect className="zb-pants" x="18" y="74" width="10" height="20" rx="4" />
            <rect className="zb-pants" x="32" y="74" width="10" height="20" rx="4" />
            <path className="zb-sv-arm-line" d={arms} />
            <path className={z ? 'zb-sv-arm is-green' : 'zb-sv-arm'} d={arms} />
            <rect className="zb-sv-shirt" x="13" y="44" width="34" height="36" rx="12" />
            <circle className={z ? 'zb-skin' : 'zb-sv-skin'} cx="30" cy="26" r="19" />
            <path className="zb-sv-hair" d={HAIR[i % HAIR.length]} />
            {z ? (
                <>
                    <circle className="zb-eye" cx="22" cy="26" r="7" />
                    <circle className="zb-eye" cx="39" cy="24" r="5.5" />
                    <circle className="zb-pupil" cx="20" cy="28" r="3" />
                    <circle className="zb-pupil" cx="41" cy="22" r="2.4" />
                    <path className="zb-mouth" d="M22 37 Q30 42 38 35" />
                </>
            ) : (
                <>
                    <circle className="zb-pupil" cx="23" cy="26" r="2.6" />
                    <circle className="zb-pupil" cx="37" cy="26" r="2.6" />
                    <path className={pose === 'cheer' ? 'zb-sv-open' : 'zb-mouth'} d={pose === 'cheer' ? 'M22 33 Q30 44 38 33 Z' : 'M23 34 Q30 39 37 34'} />
                </>
            )}
        </svg>
    );
}

// The small barricades in front of the group, left to right: a crate, a fence, a crate (the right one breaks first).
function Barricade({ kind }: { kind: 'crate' | 'fence' }) {
    return kind === 'crate' ? (
        <svg className="zb-bar-art" viewBox="0 0 44 44" aria-hidden>
            <rect className="zb-wood" x="3" y="3" width="38" height="38" rx="3" />
            <path className="zb-wood-line" d="M3 3 L41 41 M3 14 L41 14 M3 30 L41 30" />
        </svg>
    ) : (
        <svg className="zb-bar-art" viewBox="0 0 52 44" aria-hidden>
            <rect className="zb-wood" x="2" y="14" width="48" height="8" rx="2" />
            <rect className="zb-wood" x="2" y="30" width="48" height="8" rx="2" />
            {[6, 22, 38].map(x => <path key={x} className="zb-wood" d={`M${x} 42 L${x} 8 L${x + 4} 2 L${x + 8} 8 L${x + 8} 42 Z`} />)}
        </svg>
    );
}

const BARRICADES = ['crate', 'fence', 'crate'] as const;

function Camp({ level, hits, reducedMotion }: { level: ZombieLevel; hits: number; reducedMotion: boolean }) {
    const { survivors: total, barricades: bars } = DEFENCE[level];
    const d = defenceAfter(level, hits);
    return (
        <div className="zb-camp">
            <div className="zb-crew">
                {Array.from({ length: total }, (_, k) => {
                    // The one nearest the barricade is caught first.
                    const caught = total - 1 - k < d.caught;
                    return (
                        <span key={k} className={`zb-sv${caught ? ' is-caught' : ''}`} style={{ '--k': k } as CSSProperties} data-survivor={caught ? 'caught' : 'safe'}>
                            <span className="zb-sv-body"><SurvivorArt i={k} pose={caught ? 'zombie' : 'stand'} /></span>
                        </span>
                    );
                })}
            </div>
            {bars > 0 && (
                <div className="zb-barricades">
                    {BARRICADES.slice(0, bars).map((kind, b) => {
                        const broken = b >= d.barricades;
                        return (
                            <span key={b} className={`zb-bar${broken ? ' is-broken' : ''}${broken && reducedMotion ? ' is-gone' : ''}`} data-barricade={broken ? 'broken' : 'up'}>
                                <Barricade kind={kind} />
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Star({ i }: { i: number }) {
    return (
        <span className="zb-orbit" style={{ '--i': i } as CSSProperties}>
            <svg className="zb-star" viewBox="0 0 20 20" aria-hidden>
                <path d="M10 1 L12.6 7 L19 7.6 L14 11.8 L15.6 18.4 L10 14.8 L4.4 18.4 L6 11.8 L1 7.6 L7.4 7 Z" />
            </svg>
        </span>
    );
}

export default function Zombies({ question, phase, feedback, onAnswer, onMiss, onFail, sound, progress, options, events, reducedMotion }: SkinProps) {
    const level = zombieLevelOf(options);
    const [line, setLine] = useState<Zombie[]>(START);
    // A new question: the zombie that flopped or bumped leaves, a newcomer joins at the back.
    const [seenKey, setSeenKey] = useState(question?.key);
    if (question && question.key !== seenKey) {
        setSeenKey(question.key);
        setLine(l => {
            const stay = l.filter(z => z.mood === 'walk');
            let id = Math.max(...l.map(z => z.id)) + 1;
            while (stay.length < ZOMBIE.count) stay.push({ id: id++, mood: 'walk' });
            return stay;
        });
    }
    const [wobble, setWobble] = useState({ n: 0, id: -1 });

    // Positions in % of the street, outside React: the loop writes them straight to the lanes.
    const xs = useRef(new Map<number, number>());
    const lanes = useRef(new Map<number, HTMLDivElement>());
    const live = useRef({ phase, streak: progress.streak, onMiss, onFail, sound, misses: progress.misses, level, line });
    useLayoutEffect(() => { live.current = { phase, streak: progress.streak, onMiss, onFail, sound, misses: progress.misses, level, line }; });

    const attach = (id: number, el: HTMLDivElement | null) => {
        if (!el) { lanes.current.delete(id); return; }
        lanes.current.set(id, el);
        if (!xs.current.has(id)) xs.current.set(id, joinAt(xs.current.size ? Math.max(...xs.current.values()) : null));
        place(el, xs.current.get(id));
    };
    // Forget the zombies that left.
    useEffect(() => {
        const ids = new Set(line.map(z => z.id));
        for (const id of [...xs.current.keys()]) if (!ids.has(id)) xs.current.delete(id);
    }, [line]);

    useEffect(() => {
        const offRight = events.on('correct', () => setLine(l => l.map((z, i) => (i === 0 ? { ...z, mood: 'flop' } : z))));
        const offWrong = events.on('wrong', ({ given }) => {
            const front = live.current.line[0];
            // An empty answer is the bump at the door: that zombie already says boing.
            if (!front || given === '') return;
            xs.current.set(front.id, stepCloser(xs.current.get(front.id) ?? ZOMBIE.start));
            place(lanes.current.get(front.id), xs.current.get(front.id));
            setWobble(w => ({ n: w.n + 1, id: front.id }));
        });
        return () => { offRight(); offWrong(); };
    }, [events]);

    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never teleports the zombies.
            const dt = last === null ? 0 : Math.min(0.1, Math.max(0, (t - last) / 1000));
            last = t;
            const st = live.current;
            // Only while the sum waits for an answer: still during a flash and under "Hoe los ik dit op?".
            if (st.phase !== 'play') return;
            const walking = st.line.filter(z => z.mood === 'walk');
            if (!walking.length) return;
            const step = walk(walking.map(z => xs.current.get(z.id) ?? ZOMBIE.start), dt, zombieSpeed(st.streak));
            walking.forEach((z, i) => { xs.current.set(z.id, step.xs[i]); place(lanes.current.get(z.id), step.xs[i]); });
            if (step.atDoor) {
                const front = walking[0].id;
                // Stop at once; the session's wrong flash follows from onMiss.
                live.current = { ...st, phase: 'wrong', misses: st.misses + 1, line: st.line.map(z => (z.id === front ? { ...z, mood: 'boing' } : z)) };
                setLine(l => l.map(z => (z.id === front ? { ...z, mood: 'boing' } : z)));
                const hit = hitOf(st.level, st.misses + 1);
                st.onMiss();
                // The last survivor: the end screen voices it (the fail cue).
                if (hit === 'last') st.onFail();
                else st.sound(hit === 'barricade' ? 'barricade' : 'caught');
            }
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    if (!question) return <div className="zb-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [lhs] = question.text.split('?');

    return (
        <div className={`zb-root is-${level}${phase === 'play' ? ' is-moving' : ''}${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <div className="zb-street">
                <span className="zb-moon" aria-hidden />
                <div className="zb-ground" aria-hidden />
                <Camp level={level} hits={progress.misses} reducedMotion={reducedMotion} />
                <div className="zb-track">
                    {line.map((z, i) => {
                        const front = i === 0;
                        const wob = front && z.mood === 'walk' && wobble.id === z.id ? ` is-wobble-${wobble.n % 2}` : '';
                        return (
                            <div key={z.id} ref={el => attach(z.id, el)} className="zb-lane" data-zombie={front ? 'front' : 'back'}
                                style={{ zIndex: ZOMBIE.count - i }}>
                                <div className={`zb-zombie is-${z.mood}${wob}`} style={{ '--zb-shirt': `var(--spel-fill-${z.id % 6})` } as CSSProperties}>
                                    <div className="zb-body">
                                        <p className={`zb-sign kiosk-math${front ? ' is-front' : ''}`} aria-live={front ? 'polite' : undefined} aria-hidden={!front}>
                                            {!front ? '?'
                                                : flash && feedback ? <>{lhs}<span className="zb-sign-answer">{formatMathNumber(Number(feedback.expected))}</span></>
                                                : question.text}
                                        </p>
                                        <span className="zb-pole" aria-hidden />
                                        <ZombieArt />
                                        {z.mood === 'boing' && !reducedMotion && (
                                            <span className="zb-dizzy" aria-hidden>{[0, 1, 2].map(s => <Star key={s} i={s} />)}</span>
                                        )}
                                    </div>
                                    {z.mood === 'flop' && !reducedMotion && (
                                        <span className="zb-smoke" aria-hidden>
                                            {Array.from({ length: PUFFS }, (_, p) => <span key={p} className="zb-puff" style={{ '--a': `${(360 / PUFFS) * p}deg` } as CSSProperties} />)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="zb-controls">
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

// The end screen: the survivors left cheer (they made it to the end); the caught ones dance as silly zombies.
export function ZombiesEnding({ outcome, progress, options, reducedMotion }: SkinEndingProps) {
    const level = zombieLevelOf(options);
    const total = DEFENCE[level].survivors;
    const caught = outcome === 'failed' ? total : defenceAfter(level, progress.misses).caught;
    return (
        <div className={`spel-ending zb-ending${reducedMotion ? ' is-still' : ''}`}>
            <span className="zb-moon" aria-hidden />
            <div className="zb-ground" aria-hidden />
            <div className="zb-party">
                {Array.from({ length: total }, (_, k) => {
                    const z = total - 1 - k < caught;
                    return (
                        <span key={k} className={`zb-sv ${z ? 'is-dance' : 'is-cheer'}`} style={{ '--k': k } as CSSProperties} data-survivor={z ? 'caught' : 'safe'}>
                            <span className="zb-sv-body"><SurvivorArt i={k} pose={z ? 'zombie' : 'cheer'} /></span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
