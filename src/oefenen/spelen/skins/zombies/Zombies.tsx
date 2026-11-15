import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SpelSign } from '../../SpelVisual';
import { useSignChars } from '../../signContext';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { SHAMBLE, ZOMBIE, joinAt, offStreetAt, paceOf, shamble, shambleRate, speedAt, stepCloser, strideOf, targetSpeed, walk, zombieSpeed, type Walker } from './walk';
import { DEFENCE, defenceAfter, fearOf, hitOf, shooterOf, zombieLevelOf, type Fear, type ZombieLevel } from './defence';
import Graveyard, { FrontFog } from './Graveyard';
import './zombies.css';

// Zombies: silly round zombies shuffle in from the right, the front one holding the sum on a sign. A right
// answer flops it over in a puff of smoke; a wrong one brings it a step closer. At the barricade it bumps
// (a boing) and that sum counts as a mistake: a small barricade breaks (Normaal), else one survivor is
// caught and turns into a silly green zombie. All caught = the friendly early end; survivors left at the end cheer.
// One small rAF loop moves them and drives their shamble (positions and poses live outside React); the rest is CSS.

type Mood = 'walk' | 'flop' | 'boing';
interface Zombie { id: number; mood: Mood }

const PUFFS = 6;
// SYNC: zombies.css --zb-hit: the dart's flight; the zombie it hits goes down after it.
const DART_MS = 260;
// How long the shooter holds the tube up, and how long a knocked-down zombie lies before it goes.
const SHOT_MS = 650;
const FALLEN_MS = 1100;
const START: Zombie[] = Array.from({ length: ZOMBIE.count }, (_, id) => ({ id, mood: 'walk' }));

// What the loop moves per zombie: its lane, the parts of its body and the sign it holds.
interface Rig { lane: HTMLDivElement; held: HTMLElement | null; plate: HTMLElement | null; plateW: number; parts: Record<string, SVGGElement | null> }
// The street in px: the track (a lane's 100 %), where it starts, the whole street and one zombie.
interface Size { track: number; left: number; street: number; zombie: number }
const PARTS = ['legA', 'legB', 'upper', 'head', 'armA', 'armB'] as const;
// The walk cycle per zombie: p = cycles walked, amp = how far into a stride (0 = standing), lag = a step still gliding (%).
interface Gait { p: number; amp: number; lag: number }

function rigOf(lane: HTMLDivElement): Rig {
    const parts: Rig['parts'] = {};
    for (const k of PARTS) parts[k] = lane.querySelector<SVGGElement>(`[data-part=${k}]`);
    const plate = lane.querySelector<HTMLElement>('.zb-plate');
    return { lane, held: lane.querySelector<HTMLElement>('.zb-held'), plate, plateW: plate?.offsetWidth ?? 0, parts };
}

// Moves one zombie's lane; data-x is its spot on the street (tests, debugging).
function place(rig: Rig | undefined, x: number, shown: number) {
    if (!rig) return;
    rig.lane.style.transform = `translateX(${shown.toFixed(3)}%)`;
    rig.lane.dataset.x = x.toFixed(1);
}

// Hips, shoulders and neck in the art's own units (viewBox 0 0 100 130).
function pose(rig: Rig | undefined, g: Gait, size: Size, shown: number) {
    if (!rig) return;
    const o = shamble(g.p, g.amp);
    const set = (k: (typeof PARTS)[number], t: string) => rig.parts[k]?.setAttribute('transform', t);
    set('legA', `translate(0 ${o.liftA.toFixed(2)}) rotate(${o.legA.toFixed(2)} 40 98)`);
    set('legB', `translate(0 ${o.liftB.toFixed(2)}) rotate(${o.legB.toFixed(2)} 61 98)`);
    set('upper', `translate(0 ${o.bob.toFixed(2)}) rotate(${o.lean.toFixed(2)} 50 98)`);
    set('head', `rotate(${o.head.toFixed(2)} 50 62)`);
    set('armA', `rotate(${o.armA.toFixed(2)} 38 72)`);
    set('armB', `rotate(${o.armB.toFixed(2)} 40 84)`);
    // The sign stays level and readable; it only follows the top of the head sideways.
    if (rig.held) {
        const rad = Math.PI / 180;
        const dx = 87 * Math.sin(o.lean * rad) + 51 * Math.sin(o.head * rad);
        const follow = (dx / 100) * size.zombie;
        rig.held.style.transform = `translateX(${follow.toFixed(2)}px)`;
        // A wide sum near either end of the street slides in, so it is never cut off.
        if (rig.plate && size.street > 0) {
            const centre = size.left + (shown / 100) * size.track + size.zombie / 2 + follow;
            const half = rig.plateW / 2;
            const edge = 6;
            const shift = Math.min(0, size.street - edge - (centre + half)) || Math.max(0, edge - (centre - half));
            rig.plate.style.transform = shift ? `translateX(${shift.toFixed(2)}px)` : '';
        }
    }
}

function ZombieArt() {
    return (
        <svg className="zb-art" viewBox="0 0 100 130" aria-hidden>
            <g data-part="legB">
                <rect className="zb-pants is-back" x="54" y="94" width="14" height="28" rx="6" />
                <ellipse className="zb-shoe" cx="57" cy="124" rx="11" ry="5" />
            </g>
            <g data-part="legA">
                <rect className="zb-pants" x="33" y="94" width="14" height="28" rx="6" />
                <ellipse className="zb-shoe" cx="36" cy="124" rx="11" ry="5" />
            </g>
            <g data-part="upper">
                {/* The far arm behind the body, the near one in front: arms out, the zombie way. */}
                <g data-part="armB">
                    <path className="zb-arm-line" d="M40 84 L9 84" />
                    <path className="zb-arm-skin is-back" d="M40 84 L9 84" />
                </g>
                <ellipse className="zb-skin" cx="50" cy="76" rx="27" ry="27" />
                <path className="zb-shirt" d="M23 78 Q50 62 77 78 L78 94 L71 101 L64 94 L57 102 L50 94 L43 102 L36 94 L29 101 L22 94 Z" />
                <g data-part="head">
                    <circle className="zb-skin" cx="50" cy="38" r="27" />
                    <path className="zb-hair" d="M42 13 Q47 3 53 11 Q57 4 62 12" />
                    <circle className="zb-eye" cx="38" cy="35" r="10" />
                    <circle className="zb-eye" cx="61" cy="32" r="8" />
                    <circle className="zb-pupil" cx="34" cy="38" r="4.5" />
                    <circle className="zb-pupil" cx="63" cy="29" r="3.5" />
                    <path className="zb-mouth" d="M36 53 Q48 62 61 51" />
                    <rect className="zb-tooth" x="44" y="55" width="6" height="6" rx="1" />
                </g>
                <g data-part="armA">
                    <path className="zb-arm-line" d="M38 72 L6 68" />
                    <path className="zb-arm-skin" d="M38 72 L6 68" />
                </g>
            </g>
        </svg>
    );
}

// A survivor: a round little person. Caught = the same one as a silly green zombie (googly eyes, arms out).
// Standing, the face and arms follow the group's fear; hug = arms round the neighbour(s); shooting = a blowdart tube.
type Pose = 'stand' | 'cheer' | 'zombie';
type Hug = 'none' | 'left' | 'right' | 'self';
const HAIR = [
    'M10 22 Q12 6 30 6 Q48 6 50 22 Q40 14 30 16 Q20 14 10 22 Z',
    'M9 24 Q10 4 30 5 Q50 4 51 24 L46 18 L40 22 L34 16 L28 22 L22 16 L16 22 Z',
    'M12 20 Q14 4 32 6 Q48 8 48 20 Q44 12 36 12 Q34 20 24 14 Q18 14 12 20 Z',
];
const STAND_ARMS: Record<Fear, string> = {
    calm: 'M16 52 L10 72 M44 52 L50 72',
    // Hands wringing in front.
    worried: 'M16 52 L25 66 M44 52 L35 66',
    // Hands up by the cheeks.
    scared: 'M16 52 L11 36 M44 52 L49 36',
};
const HUG_ARMS: Record<Exclude<Hug, 'none'>, string> = {
    left: 'M16 52 L-4 60 M44 52 L49 36',
    right: 'M16 52 L11 36 M44 52 L64 60',
    self: 'M16 52 L40 64 M44 52 L20 64',
};

export function SurvivorArt({ i, pose, fear = 'calm', hug = 'none', shooting = false }: { i: number; pose: Pose; fear?: Fear; hug?: Hug; shooting?: boolean }) {
    const z = pose === 'zombie';
    const arms = pose === 'cheer' ? 'M16 52 L6 30 M44 52 L54 30' : z ? 'M18 52 L56 46 M20 62 L58 60'
        : shooting ? 'M16 52 L38 38 M44 52 L54 36' : hug !== 'none' ? HUG_ARMS[hug] : STAND_ARMS[fear];
    const face = pose === 'cheer' ? 'cheer' : shooting ? 'calm' : fear;
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
                    {face !== 'calm' && face !== 'cheer' && <path className="zb-sv-brow" d={face === 'scared' ? 'M17 21 L26 16 M34 16 L43 21' : 'M18 20 L26 18 M34 18 L42 20'} />}
                    <circle className="zb-pupil" cx="23" cy="26" r={face === 'scared' ? 2 : 2.6} />
                    <circle className="zb-pupil" cx="37" cy="26" r={face === 'scared' ? 2 : 2.6} />
                    {face === 'cheer' ? <path className="zb-sv-open" d="M22 33 Q30 44 38 33 Z" />
                        : face === 'scared' ? <ellipse className="zb-sv-open" cx="30" cy="37" rx="3.6" ry="4.6" />
                        : face === 'worried' ? <path className="zb-mouth" d="M23 37 Q26.5 34 30 37 Q33.5 40 37 37" />
                        : !shooting && <path className="zb-mouth" d="M23 34 Q30 39 37 34" />}
                    {face === 'scared' && <path className="zb-sv-sweat" d="M47 12 Q51 19 47 21 Q43 19 47 12 Z" />}
                    {/* The blowdart: a plain tube at the lips, pointing at the zombies. */}
                    {shooting && <rect className="zb-tube" x="30" y="31" width="34" height="6" rx="3" transform="rotate(-8 30 34)" />}
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

interface Shot { n: number; k: number; from: [number, number]; to: [number, number] }

function Camp({ level, hits, reducedMotion, shot, cheery }: { level: ZombieLevel; hits: number; reducedMotion: boolean; shot: Shot | null; cheery: boolean }) {
    const { survivors: total, barricades: bars } = DEFENCE[level];
    const d = defenceAfter(level, hits);
    const fear = fearOf(level, hits);
    // Two or fewer left: they hold on to each other (one alone hugs itself).
    const hugOf = (k: number): Hug => (fear !== 'scared' ? 'none' : d.survivors === 1 ? 'self' : k === 0 ? 'right' : k === 1 ? 'left' : 'none');
    return (
        <div className="zb-camp">
            <div className={`zb-crew is-${fear}${cheery ? ' is-cheery' : ''}`}>
                {Array.from({ length: total }, (_, k) => {
                    // The one nearest the barricade is caught first.
                    const caught = total - 1 - k < d.caught;
                    const shooting = !caught && shot?.k === k;
                    return (
                        <span key={k} className={`zb-sv${caught ? ' is-caught' : ''}${shooting ? ' is-shooting' : ''}`} style={{ '--k': k } as CSSProperties}
                            data-k={k} data-survivor={caught ? 'caught' : 'safe'}>
                            <span className="zb-sv-body"><SurvivorArt i={k} pose={caught ? 'zombie' : 'stand'} fear={fear} hug={hugOf(k)} shooting={shooting} /></span>
                            {shooting && !reducedMotion && <span key={shot.n} className="zb-pfft" aria-hidden>pfft</span>}
                        </span>
                    );
                })}
            </div>
            {bars > 0 && (
                <div className="zb-barricades">
                    {BARRICADES.slice(0, bars).map((kind, b) => {
                        const broken = b >= d.barricades;
                        return (
                            <span key={b} className={`zb-bar${broken ? ' is-broken' : ''}`} data-barricade={broken ? 'broken' : 'up'}>
                                <span className="zb-bar-up"><Barricade kind={kind} /></span>
                                {/* What is left: planks on the ground, so the pupil sees which one fell. */}
                                {broken && (
                                    <svg className="zb-rubble" viewBox="0 0 44 14" aria-hidden>
                                        <rect className="zb-wood" x="2" y="6" width="26" height="6" rx="2" transform="rotate(-6 15 9)" />
                                        <rect className="zb-wood" x="16" y="3" width="24" height="6" rx="2" transform="rotate(9 28 6)" />
                                    </svg>
                                )}
                                {broken && !reducedMotion && (
                                    <span className="zb-splinters">{[0, 1, 2, 3].map(s => <span key={s} className="zb-splinter" style={{ '--s': s } as CSSProperties} />)}</span>
                                )}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// A friendly dart: a cork tip, a little shaft, a feather tail.
function Dart({ shot }: { shot: Shot }) {
    const [fx, fy] = shot.from;
    const [tx, ty] = shot.to;
    const angle = (Math.atan2(ty - fy, tx - fx) * 180) / Math.PI;
    return (
        <span className="zb-dart" aria-hidden
            style={{ '--fx': `${fx}px`, '--fy': `${fy}px`, '--tx': `${tx}px`, '--ty': `${ty}px`, '--ang': `${angle}deg` } as CSSProperties}>
            <svg className="zb-dart-art" viewBox="0 0 40 14">
                <path className="zb-dart-feather" d="M2 2 L12 7 L2 12 L6 7 Z" />
                <rect className="zb-dart-shaft" x="8" y="5.5" width="22" height="3" rx="1.5" />
                <circle className="zb-dart-cork" cx="32" cy="7" r="5" />
            </svg>
        </span>
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
    // Zombies a dart knocked down lie on a moment longer than their sum (their fall outlasts the right flash).
    const [fallen, setFallen] = useState<Zombie[]>([]);
    const [seenKey, setSeenKey] = useState(question?.key);
    if (question && question.key !== seenKey) {
        setSeenKey(question.key);
        const down = line.filter(z => z.mood === 'flop');
        if (down.length) setFallen(f => [...f, ...down]);
        setLine(l => {
            const stay = l.filter(z => z.mood === 'walk');
            let id = Math.max(...l.map(z => z.id)) + 1;
            while (stay.length < ZOMBIE.count) stay.push({ id: id++, mood: 'walk' });
            return stay;
        });
    }

    // The walk lives outside React: each zombie's spot and pace, its gait, its rig, and the street's size in px.
    const walkers = useRef(new Map<number, Walker>());
    const gaits = useRef(new Map<number, Gait>());
    const rigs = useRef(new Map<number, Rig>());
    const size = useRef<Size>({ track: 0, left: 0, street: 0, zombie: 0 });
    const live = useRef({ phase, streak: progress.streak, onMiss, onFail, sound, misses: progress.misses, level, line, reducedMotion });
    useLayoutEffect(() => { live.current = { phase, streak: progress.streak, onMiss, onFail, sound, misses: progress.misses, level, line, reducedMotion }; });

    const [shot, setShot] = useState<Shot | null>(null);
    const shots = useRef(0);
    useEffect(() => {
        if (!shot) return;
        const t = setTimeout(() => setShot(null), SHOT_MS);
        return () => clearTimeout(t);
    }, [shot]);
    // Play time so far (help pauses it): the zombies slowly speed up over the game.
    const played = useRef(0);
    const mounted = useRef(false);
    useEffect(() => { mounted.current = true; }, []);
    // One stable ref callback for every lane (its zombie id rides on data-zid): a re-render never re-attaches a lane.
    const attachLane = useCallback((el: HTMLDivElement | null) => {
        if (!el) return;
        const id = Number(el.dataset.zid);
        const rig = rigOf(el);
        rigs.current.set(id, rig);
        if (!walkers.current.has(id)) {
            const xs = [...walkers.current.values()].map(w => w.x);
            const last = xs.length ? Math.max(...xs) : null;
            // The first line stands on the street, a gap apart; a newcomer comes in from off screen.
            const x = mounted.current ? joinAt(last, offStreetAt(size.current.track, size.current.zombie)) : last === null ? ZOMBIE.start : last + ZOMBIE.gap;
            walkers.current.set(id, { x, v: targetSpeed(xs.length, paceOf(id), zombieSpeed(live.current.streak)), pace: paceOf(id) });
            // Out of step with the others from the first frame.
            gaits.current.set(id, { p: (id * 0.37) % 1, amp: 0, lag: 0 });
        }
        const w = walkers.current.get(id)!;
        place(rig, w.x, w.x);
        pose(rig, gaits.current.get(id)!, size.current, w.x);
        return () => { rigs.current.delete(id); };
    }, []);
    // A new sum or the answer on the sign changes its width: the edge clamp needs it.
    useLayoutEffect(() => { for (const rig of rigs.current.values()) rig.plateW = rig.plate?.offsetWidth ?? 0; });
    useEffect(() => {
        if (!fallen.length) return;
        const t = setTimeout(() => setFallen(f => f.slice(1)), FALLEN_MS);
        return () => clearTimeout(t);
    }, [fallen]);
    // Forget the zombies that left.
    useEffect(() => {
        const ids = new Set([...line, ...fallen].map(z => z.id));
        for (const map of [walkers.current, gaits.current]) for (const id of [...map.keys()]) if (!ids.has(id)) map.delete(id);
    }, [line, fallen]);

    // The street's size: a lane's % becomes px for the stride, and the edge where a zombie comes into view.
    const street = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const el = street.current;
        if (!el) return;
        const measure = () => {
            const track = el.querySelector<HTMLElement>('.zb-track');
            const zombie = el.querySelector<HTMLElement>('.zb-zombie');
            size.current = { track: track?.clientWidth ?? 0, left: track?.offsetLeft ?? 0, street: el.clientWidth, zombie: zombie?.offsetWidth ?? 0 };
            for (const rig of rigs.current.values()) rig.plateW = rig.plate?.offsetWidth ?? 0;
        };
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        const offRight = events.on('correct', () => {
            const st = live.current;
            const front = st.line[0];
            setLine(l => l.map((z, i) => (i === 0 ? { ...z, mood: 'flop' } : z)));
            // A survivor still safe (in turn) puffs a dart at the zombie this answer stops.
            const k = shooterOf(defenceAfter(st.level, st.misses).survivors, shots.current++);
            const el = street.current;
            const sv = el?.querySelector<HTMLElement>(`.zb-sv[data-k="${k}"]`);
            const art = front ? rigs.current.get(front.id)?.lane.querySelector('.zb-art') : null;
            if (!el || k < 0) return;
            const box = el.getBoundingClientRect();
            const a = sv?.getBoundingClientRect();
            const b = art?.getBoundingClientRect();
            const from: [number, number] = a ? [a.right - box.left, a.top - box.top + a.height * 0.3] : [0, 0];
            const to: [number, number] = b ? [b.left - box.left + b.width * 0.35, b.top - box.top + b.height * 0.3] : from;
            setShot(v => ({ n: (v?.n ?? 0) + 1, k, from, to }));
        });
        const offWrong = events.on('wrong', ({ given }) => {
            const front = live.current.line[0];
            // An empty answer is the bump at the door: that zombie already says boing.
            if (!front || given === '') return;
            const w = walkers.current.get(front.id);
            const g = gaits.current.get(front.id);
            if (!w || !g) return;
            const x = stepCloser(w.x);
            // The game spot moves at once; the drawn zombie lunges after it (at once under reduced motion).
            if (!live.current.reducedMotion) g.lag += w.x - x;
            w.x = x;
            place(rigs.current.get(front.id), w.x, w.x + g.lag);
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
            // Under "Hoe los ik dit op?" everything holds, mid-stride; a right or wrong flash never stops the walk.
            const going = st.phase === 'play' || st.phase === 'right' || st.phase === 'wrong';
            if (!going || !dt) return;
            played.current += dt * 1000;
            const { track, zombie } = size.current;
            const walking = st.line.filter(z => z.mood === 'walk');
            if (walking.length) {
                const step = walk(walking.map(z => walkers.current.get(z.id)!), dt, zombieSpeed(st.streak) * speedAt(played.current, st.level), offStreetAt(track, zombie));
                walking.forEach((z, i) => walkers.current.set(z.id, step.line[i]));
                // At the door during a flash it waits there; the bump counts once the next sum is up.
                if (step.atDoor && st.phase === 'play') {
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
            }
            for (const z of live.current.line) {
                const w = walkers.current.get(z.id);
                const g = gaits.current.get(z.id);
                if (!w || !g) continue;
                // A lunge (a wrong answer's step) glides out quickly, with quick steps of its own.
                let lunged = 0;
                if (g.lag > 0) {
                    lunged = g.lag < 0.05 ? g.lag : g.lag * (1 - Math.exp(-dt * 9));
                    g.lag -= lunged;
                }
                if (st.reducedMotion) g.amp = 0;
                else {
                    const stepping = z.mood === 'walk';
                    g.p += shambleRate(stepping ? w.v : 0, track, zombie) * dt + strideOf(lunged, track, zombie);
                    g.amp += ((stepping ? 1 : 0) - g.amp) * Math.min(1, dt / SHAMBLE.settle);
                }
                const rig = rigs.current.get(z.id);
                place(rig, w.x, w.x + g.lag);
                pose(rig, g, size.current, w.x + g.lag);
            }
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    // The front sign's longest line (a long sum breaks before its "="): its font fits the sign's width (zombies.css).
    const signChars = useSignChars({ question, feedback, breakAtRelation: true });
    if (!question) return <div className="zb-root" />;
    const flash = phase === 'right' || phase === 'wrong';

    return (
        <div data-niveau={level} className={`zb-root is-${level === 'moeilijk' ? 'moeilijk' : 'normaal'}${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`} style={{ '--zb-hit': `${reducedMotion ? 0 : DART_MS}ms` } as CSSProperties}>
            <div className="zb-street" ref={street}>
                <Graveyard />
                <div className="zb-ground" aria-hidden />
                <Camp level={level} hits={progress.misses} reducedMotion={reducedMotion} shot={shot} cheery={phase === 'right' && progress.streak >= 3} />
                <div className="zb-track">
                    {[...line, ...fallen].map((z, i) => {
                        const down = i >= line.length;
                        const front = i === 0;
                        return (
                            <div key={z.id} ref={attachLane} data-zid={z.id} className="zb-lane" data-zombie={down ? 'down' : front ? 'front' : 'back'}
                                style={{ zIndex: ZOMBIE.count - i }}>
                                <div className={`zb-zombie is-${z.mood}`} style={{ '--zb-shirt': `var(--spel-fill-${z.id % 6})` } as CSSProperties}>
                                    <div className="zb-body">
                                        <div className="zb-held">
                                            <div className="zb-plate">
                                                <p className={`zb-sign kiosk-math${front ? ' is-front' : ''}`} style={front ? { '--sign-chars': signChars } as CSSProperties : undefined} aria-live={front ? 'polite' : undefined} aria-hidden={!front}>
                                                    {!front ? '?' : <SpelSign question={question} feedback={feedback} flash={flash} answerClassName="zb-sign-answer" breakAtRelation />}
                                                </p>
                                            </div>
                                            <span className="zb-pole" aria-hidden />
                                        </div>
                                        <ZombieArt />
                                        {(z.mood === 'boing' || z.mood === 'flop') && !reducedMotion && (
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
                {shot && !reducedMotion && <Dart key={shot.n} shot={shot} />}
                <FrontFog />
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
            <Graveyard small />
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
