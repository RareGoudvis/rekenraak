import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SkinEndingProps, SkinProps } from '../types';
import type { SpelChoiceView } from '../../content/pack';
import { SpelChoiceFace, SpelSignBox } from '../../SpelVisual';
import { choiceLabel, faceChars, faceKind, pictureClass } from '../../spelChoice';
import { Burst } from '../../scene';
import { GRIJP, coinsLeft, crossed, idlePose, nearMissOf, poseAt, revealAt, timeline, type ClawGeom, type Job, type Pose, type Stage } from './claw';
import { HEAP, backPile, machineById, prizeBag, type MachineId, type Prize } from './machines';
import { forcedMachine, lastMachine, pickMachine, rememberMachine } from './pick';
import { ARCADES } from './arcades';
import { CoinArt, PanelBits } from './arcades/kit';
import { COUNTER, DISPLAY, DOOR, GLASS, SLOT, VIEW, pctOf } from './arcades/layout';
import { playGrijp } from './sounds';
import './grijp.css';

// Grijpmachine: a claw machine fills the screen, in one of five arcades (machines.ts, a new one per round, pick.ts).
// Four prizes on the heap hold the choices on their tags. Tap one (or 1–4): a coin goes in, the claw whirrs over, drops
// and shuts on it; only then does the answer go to the session (the reveal). Right: it lifts the prize, now and then
// nearly loses it on the way (claw.ts), drops it in the chute and it pops out onto the "Gewonnen" shelf. Wrong: the
// prize slips out at the top with a squeak and bounces back onto the heap (no loss, a logged mistake). A tap while the
// claw is still busy waits its turn. One rAF loop runs the claw on game time (frozen under help); CSS does the rest.

const KEYS = ['1', '2', '3', '4'];
// The heap's four places: x (% of the glass, the chute takes the left fifth) and how high on the heap (% from the bottom).
const SPOTS = [{ x: 30, y: 8 }, { x: 50.5, y: 17 }, { x: 71, y: 9 }, { x: 90, y: 18 }] as const;
// The untagged prizes piled up behind (x %, bottom %, scale): a heap that fills the lower half of the glass.
const PILE = [
    [26, 21, 0.62], [38, 28, 0.58], [44, 12, 0.64], [58, 29, 0.6], [63, 17, 0.58], [79, 28, 0.62], [96, 30, 0.54],
    [32, 36, 0.5], [52, 38, 0.5], [70, 37, 0.5], [87, 39, 0.48],
] as const;
// A picture question (a clock face) gets a taller display, up over the marquee, so the face stays big enough to read.
const TALL_DISPLAY = { ...DISPLAY, y: DISPLAY.y - 70, h: DISPLAY.h + 70 };
// A won prize's hop from the prize door to its place on the shelf.
const FLY_MS = 700;
// No answer from the session this long after the reveal (a test, a closed round): the plush just slips back.
const STUCK_MS = 1500;

// The last round's machine and prizes, for the end picture (same chunk).
let lastRun: { machine: MachineId; won: Prize[] } | null = null;

const initialMachine = (): MachineId => {
    const pinned = import.meta.env.DEV && typeof location !== 'undefined' ? forcedMachine(location.search) : null;
    return pinned ?? pickMachine(lastMachine());
};

interface Trip extends Job {
    key: string;
    value: string;
    view?: SpelChoiceView;
    prize: Prize;
    t: number;
    answered: boolean;
    waited: number;
    // The shown stage (React renders on a change only).
    shown: Stage | null;
    slipSaid: boolean;
    landSaid: boolean;
}
interface TripView { slot: number; stage: Stage; result: Job['result']; nearMiss: boolean; prize: Prize; value: string; view?: SpelChoiceView; dir: number }

const fmt = (n: number) => n.toFixed(1);

function Tag({ value, view, k }: { value: string; view?: SpelChoiceView; k: string }) {
    return (
        <span className="gm-tag-wrap" aria-hidden>
            <span className="gm-tag-string" />
            <span key={k} className={`gm-tag kiosk-math is-${faceKind(view)}`} style={{ '--face-chars': faceChars(view) } as CSSProperties}>
                <SpelChoiceFace value={value} view={view} />
            </span>
        </span>
    );
}

export default function Grijpmachine({ question, choices, views, phase, feedback, onAnswer, progress, events }: SkinProps) {
    const [machineId] = useState(initialMachine);
    const machine = machineById(machineId);
    const art = ARCADES[machineId];
    const [seed] = useState(() => Math.floor(Math.random() * 0x7fffffff));
    const [bag] = useState(() => prizeBag(machine, seed));
    const pile = useMemo(() => backPile(machine, seed, PILE.length), [machine, seed]);
    const [heap, setHeap] = useState<Prize[]>(bag.heap);
    const heapRef = useRef(heap);
    // Places refilled for this question (their new prize pops up).
    const [fresh, setFresh] = useState<{ key: string; slots: number[] }>({ key: '', slots: [] });
    const [won, setWon] = useState<Prize[]>([]);
    const [flyer, setFlyer] = useState<{ id: number; prize: Prize; x: number; y: number; dx: number; dy: number } | null>(null);
    const [landed, setLanded] = useState(-1);
    const [trip, setTrip] = useState<TripView | null>(null);
    // A tap while the claw is busy: that prize is next (a ring on its tag).
    const [queued, setQueued] = useState<{ key: string; slot: number } | null>(null);
    const options = choices ?? [];
    useEffect(() => { rememberMachine(machineId); }, [machineId]);
    useEffect(() => { lastRun = { machine: machineId, won: [] }; }, [machineId]);

    const root = useRef<HTMLDivElement>(null);
    const glass = useRef<HTMLDivElement>(null);
    const slotEls = useRef<(HTMLButtonElement | null)[]>([]);
    const claw = useRef<HTMLDivElement>(null);
    const head = useRef<HTMLDivElement>(null);
    const carried = useRef<HTMLDivElement>(null);
    const door = useRef<HTMLSpanElement>(null);
    const places = useRef<(HTMLSpanElement | null)[]>([]);
    const geom = useRef<ClawGeom | null>(null);
    const job = useRef<Trip | null>(null);
    const pending = useRef<{ key: string; slot: number } | null>(null);
    // Places whose prize was won on this question: empty until the next one refills them.
    const gone = useRef<{ key: string; slots: number[]; refills: Map<number, Prize> }>({ key: '', slots: [], refills: new Map() });
    const lastNear = useRef(false);
    const timers = useRef<number[]>([]);
    useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);
    const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };

    const live = useRef({ phase, key: question?.key ?? '', onAnswer });
    useLayoutEffect(() => { live.current = { phase, key: question?.key ?? '', onAnswer }; });

    const viewOf = (j: Trip, stage: Stage): TripView => ({
        slot: j.slot, stage, result: j.result, nearMiss: j.nearMiss, prize: j.prize, value: j.value, view: j.view,
        dir: geom.current ? Math.sign(geom.current.slots[j.slot].x - geom.current.homeX) : 1,
    });

    // A tap (or a key): the claw sets off at once, or after the trip it is on.
    const begin = (slot: number) => {
        const key = live.current.key;
        const value = options[slot];
        if (value === undefined || !geom.current) return;
        const j: Trip = {
            slot, result: null, nearMiss: false, key, value, view: views?.[slot], prize: heapRef.current[slot],
            t: 0, answered: false, waited: 0, shown: 'go', slipSaid: false, landSaid: false,
        };
        job.current = j;
        pending.current = null;
        setQueued(null);
        setTrip(viewOf(j, 'go'));
        playGrijp('coin');
        later(160, () => playGrijp('whirr'));
    };
    const pick = (slot: number) => {
        if (phase !== 'play' || !question || options[slot] === undefined) return;
        if (gone.current.key === question.key && gone.current.slots.includes(slot)) return;
        const j = job.current;
        if (j && j.key === question.key) return;
        if (j) { pending.current = { key: question.key, slot }; setQueued(pending.current); return; }
        begin(slot);
    };
    const pickRef = useRef(pick);
    useLayoutEffect(() => { pickRef.current = pick; });
    const beginRef = useRef(begin);
    useLayoutEffect(() => { beginRef.current = begin; });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const i = KEYS.indexOf(e.key);
            if (i >= 0) { e.preventDefault(); pickRef.current(i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // The session's verdict arrives right after the reveal.
    useEffect(() => {
        const offs = [
            events.on('correct', () => {
                const j = job.current;
                if (!j || j.result) return;
                j.result = 'right';
                j.nearMiss = nearMissOf(bag.roll(), lastNear.current);
                lastNear.current = j.nearMiss;
                const now = heapRef.current;
                const refill = bag.refill(now, j.slot);
                if (gone.current.key !== j.key) gone.current = { key: j.key, slots: [], refills: new Map() };
                gone.current.slots.push(j.slot);
                gone.current.refills.set(j.slot, refill);
                if (lastRun) lastRun.won.push(j.prize);
                setTrip(viewOf(j, 'lift'));
            }),
            events.on('wrong', () => {
                const j = job.current;
                if (!j || j.result) return;
                j.result = 'wrong';
                setTrip(viewOf(j, 'lift'));
            }),
        ];
        return () => offs.forEach(off => off());
    }, [events, bag]);

    // A new question: the places emptied by a win get a new prize that pops up out of the heap.
    const key = question?.key;
    useLayoutEffect(() => {
        if (!key) return;
        const g = gone.current;
        if (g.refills.size === 0) return;
        const next = heapRef.current.map((p, i) => g.refills.get(i) ?? p);
        heapRef.current = next;
        setHeap(next);
        setFresh({ key, slots: [...g.refills.keys()] });
        gone.current = { key: '', slots: [], refills: new Map() };
    }, [key]);

    // A won prize leaves the prize door and hops onto its place on the shelf.
    const payOut = (prize: Prize) => {
        const box = root.current?.getBoundingClientRect();
        const from = door.current?.getBoundingClientRect();
        const index = lastRun ? Math.max(0, lastRun.won.length - 1) : 0;
        const to = places.current[Math.min(index, places.current.length - 1)]?.getBoundingClientRect();
        const id = Date.now();
        if (box && from && to) {
            setFlyer({ id, prize, x: from.left - box.left + from.width / 2, y: from.top - box.top + from.height / 2, dx: to.left + to.width / 2 - (from.left + from.width / 2), dy: to.top + to.height / 2 - (from.top + from.height / 2) });
        }
        later(FLY_MS, () => {
            setFlyer(f => (f?.id === id ? null : f));
            setWon(w => [...w, prize]);
            setLanded(index);
            playGrijp('jingle');
        });
    };
    const payRef = useRef(payOut);
    useLayoutEffect(() => { payRef.current = payOut; });

    // ── Geometry: measured on mount and resize (never inside the loop) ──
    const hasQuestion = !!question;
    useLayoutEffect(() => {
        const el = glass.current;
        if (!el || !hasQuestion) return;
        const measure = () => {
            const w = el.clientWidth, h = el.clientHeight;
            if (w <= 0 || h <= 0) { geom.current = { w: 100, homeX: 10, restY: 2, slots: SPOTS.map(s => ({ x: s.x, grabY: 40, cx: s.x, cy: 70, h: 20 })), chuteY: 200 }; return; }
            const clawH = head.current?.offsetHeight ?? h * 0.2;
            const slots = SPOTS.map((_, i) => {
                const b = slotEls.current[i];
                const plush = b?.querySelector<HTMLElement>('.gm-plush');
                const left = b?.offsetLeft ?? 0, top = b?.offsetTop ?? 0, bw = b?.offsetWidth ?? 0, bh = b?.offsetHeight ?? 0;
                const pTop = top + (plush?.offsetTop ?? 0), pH = plush?.offsetHeight ?? bh;
                return { x: left + bw / 2, grabY: Math.max(h * 0.05, pTop + pH * 0.32 - clawH * 0.9), cx: left + bw / 2, cy: top + bh / 2, h: bh };
            });
            geom.current = { w, homeX: w * 0.095, restY: h * 0.015, slots, chuteY: h + (slots[0]?.h ?? 100) * 1.2 };
        };
        measure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [hasQuestion]);

    // ── The loop: the claw's trip on game time ──
    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        let clock = 0;
        const apply = (p: Pose, j: Trip | null) => {
            const c = claw.current;
            if (c) {
                c.style.setProperty('--x', fmt(p.x));
                c.style.setProperty('--y', fmt(p.y));
                c.style.setProperty('--rot', p.rot.toFixed(2));
                c.style.setProperty('--open', p.open.toFixed(3));
            }
            const cr = carried.current;
            if (cr) {
                if (p.prize) {
                    cr.style.visibility = 'visible';
                    cr.style.transform = `translate3d(${fmt(p.prize.x - cr.offsetWidth / 2)}px, ${fmt(p.prize.y - cr.offsetHeight / 2)}px, 0) rotate(${p.prize.rot.toFixed(1)}deg)`;
                } else cr.style.visibility = 'hidden';
            }
            const g = gone.current;
            slotEls.current.forEach((el, i) => {
                if (!el) return;
                // The carried prize leaves a gap only on its own question: a new sum refills the place at once.
                const away = (!!p.prize && j?.slot === i && j.key === live.current.key) || (g.key === live.current.key && g.slots.includes(i));
                if (away !== (el.dataset.away === '1')) el.dataset.away = away ? '1' : '';
            });
        };
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            const dt = last === null ? 0 : Math.min(100, Math.max(0, t - last));
            last = t;
            const g = geom.current;
            if (!g || live.current.phase === 'help') return;
            clock += dt;
            const j = job.current;
            if (!j) {
                const p = pending.current;
                if (p && p.key === live.current.key && live.current.phase === 'play') beginRef.current(p.slot);
                apply(idlePose(g, clock), null);
                return;
            }
            const reveal = revealAt(j, g);
            let next = j.t + dt;
            if (!j.result && next >= reveal) {
                next = reveal;
                if (!j.answered) {
                    j.answered = true;
                    if (live.current.phase === 'play' && live.current.key === j.key) live.current.onAnswer(j.value);
                }
                j.waited += dt;
                // The session never answered (a closed round, a test): the plush slips back, nothing counted.
                if (!j.result && j.waited > STUCK_MS) { j.result = 'wrong'; setTrip(viewOf(j, 'lift')); }
            }
            const stages = crossed(j, g, j.t, next);
            for (const s of stages) {
                if (s === 'drop') playGrijp('drop');
                if (s === 'grab') playGrijp('clack');
                if (s === 'hold') playGrijp('squeak');
                if (s === 'wobble') playGrijp('ooh');
                if (s === 'back') playGrijp('whirr');
                if (s === 'chute') playGrijp('thunk');
            }
            const prevT = j.t;
            j.t = next;
            const p = poseAt(j, j.t, g, clock);
            if (j.result === 'right' && stages.includes('carry') && !timeline(j, g).some(s => s.stage === 'carry' && s.at < prevT)) playGrijp('whirr');
            if (p.slipped && !j.slipSaid) { j.slipSaid = true; playGrijp('slip'); }
            if (p.slipped && !p.prize && !j.landSaid) { j.landSaid = true; playGrijp('boing'); }
            if (p.stage !== j.shown) { j.shown = p.stage; setTrip(viewOf(j, p.stage)); }
            apply(p, j);
            if (p.done) {
                job.current = null;
                setTrip(null);
                if (j.result === 'right') payRef.current(j.prize);
            }
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    if (!question) return <div className="gm-root" data-machine={machineId} />;
    const flash = phase === 'right' || phase === 'wrong';
    const paused = phase === 'help';
    const picSign = !!question.visual && question.visual.kind !== 'rij';
    const answerIdx = feedback ? options.indexOf(feedback.expected) : -1;
    const total = progress.total ?? GRIJP.questions;
    const coins = coinsLeft(progress, !!trip && !trip.result);
    const moving = trip && (trip.stage === 'go' || trip.stage === 'carry' || trip.stage === 'back')
        ? ((trip.stage === 'go' ? trip.dir : -trip.dir) > 0 ? 'r' : 'l') : '';
    const pressing = trip && (trip.stage === 'drop' || trip.stage === 'grab');
    const say = trip?.stage === 'wobble' ? 'Oei oei!' : trip?.result === 'wrong' && (trip.stage === 'lift' || trip.stage === 'back') ? 'Oeps!' : null;
    const { Room, WingL, WingR, Cabinet, Inside, Claw, Prize: PrizeArt } = art;
    const cls = ['gm-root', paused && 'is-paused', views && 'has-pictures', flyer && 'is-paying'].filter(Boolean).join(' ') + pictureClass(views);

    return (
        <div ref={root} className={cls} data-machine={machineId} data-move={moving} data-press={pressing ? '1' : ''}>
            <div className="gm-room" aria-hidden>
                <div className="gm-wall"><Room /></div>
                <div className="gm-floor" />
                {/* Now and then a lost coin rolls across the floor. */}
                <span className="gm-roll-coin"><CoinArt /></span>
            </div>
            <div className="gm-stage">
                <div className="gm-wing is-l" aria-hidden><WingL /></div>
                <div className="gm-wing is-r" aria-hidden><WingR /></div>
                <div className="gm-machine">
                    <span className="gm-kid" aria-hidden><KidArt /></span>
                    <svg className="gm-cab" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden>
                        <Cabinet />
                        <PanelBits />
                    </svg>
                    <div className="gm-display" style={pctOf(picSign ? TALL_DISPLAY : DISPLAY)}>
                        <SpelSignBox className="gm-sign" question={question} feedback={feedback} flash={flash} choices={options} views={views} answerClassName="gm-sign-answer" />
                    </div>
                    <div ref={glass} className="gm-glass" style={pctOf(GLASS)}>
                        <svg className="gm-inside" viewBox={`0 0 ${GLASS.w} ${GLASS.h}`} preserveAspectRatio="xMidYMax slice" aria-hidden><Inside /></svg>
                        <div className="gm-chute" aria-hidden><span className="gm-chute-hole" /></div>
                        <div className="gm-pile" aria-hidden>
                            {PILE.map(([x, y, s], k) => (
                                <span key={k} className="gm-pile-prize" style={{ '--sx': x, '--sy': y, '--s': s, '--k': k } as CSSProperties}>
                                    <svg viewBox="0 0 100 100" overflow="visible"><PrizeArt prize={pile[k]} /></svg>
                                </span>
                            ))}
                        </div>
                        <div className="gm-heap" role="group" aria-label="Kies het antwoord">
                            {options.slice(0, HEAP).map((c, i) => {
                                const view = views?.[i];
                                const mine = trip?.slot === i;
                                const state = mine && (trip.stage === 'grab' || trip.stage === 'hold') ? ' is-grabbed'
                                    : flash && i === answerIdx && feedback && !feedback.correct ? ' is-answer'
                                    : phase === 'wrong' && feedback?.given === c ? ' is-nope' : '';
                                const isFresh = fresh.key === question.key && fresh.slots.includes(i);
                                const isQueued = queued?.key === question.key && queued.slot === i;
                                return (
                                    <button key={i} type="button" ref={el => { slotEls.current[i] = el; }} className={`gm-slot${state}${isFresh ? ' is-fresh' : ''}${isQueued ? ' is-queued' : ''}`}
                                        disabled={phase !== 'play'} aria-label={choiceLabel(c, view)} data-away=""
                                        style={{ '--sx': SPOTS[i].x, '--sy': SPOTS[i].y, '--k': i } as CSSProperties}
                                        // The press counts at once (a wobbling target); the click is for keys and a second, ignored tap.
                                        onPointerDown={e => { if (e.button === 0) pick(i); }}
                                        onClick={() => pick(i)}>
                                        <span key={isFresh ? `f${question.key}` : 'p'} className="gm-plush">
                                            <span className="gm-wobble"><svg viewBox="0 0 100 100" overflow="visible" aria-hidden><PrizeArt prize={heap[i]} /></svg></span>
                                        </span>
                                        <Tag value={c} view={view} k={question.key} />
                                    </button>
                                );
                            })}
                        </div>
                        <div ref={carried} className="gm-slot gm-carried" aria-hidden style={{ visibility: 'hidden' }}>
                            {trip && (
                                <>
                                    <span className="gm-plush"><svg viewBox="0 0 100 100" overflow="visible"><PrizeArt prize={trip.prize} /></svg></span>
                                    <Tag value={trip.value} view={trip.view} k="c" />
                                </>
                            )}
                        </div>
                        <div ref={claw} className="gm-claw" aria-hidden>
                            <span className="gm-carriage" />
                            <span className="gm-cable" />
                            <div ref={head} className="gm-head"><Claw /></div>
                            {say && <span key={say} className="gm-say">{say}</span>}
                        </div>
                        <span className="gm-gantry" aria-hidden />
                        <span className="gm-shine" aria-hidden />
                    </div>
                    <div className="gm-counter" style={pctOf(COUNTER)} role="status" aria-label={`Nog ${coins} ${coins === 1 ? 'muntje' : 'muntjes'}`}>
                        <CoinArt />
                        <span className="gm-counter-text"><small>Nog</small> <b key={coins} className="kiosk-math">{coins}</b></span>
                    </div>
                    <span ref={door} className="gm-door-at" style={pctOf(DOOR)} aria-hidden />
                    {trip && trip.stage === 'go' && <span key={`coin${progress.answered}`} className="gm-coin-in" style={pctOf(SLOT)} aria-hidden><CoinArt /></span>}
                </div>
            </div>
            <div className="gm-shelf" role="img" aria-label={`Gewonnen: ${won.length} van ${total}`}>
                <span className="gm-shelf-label" aria-hidden>Gewonnen</span>
                <div className="gm-places" style={{ '--n': total } as CSSProperties}>
                    {Array.from({ length: total }, (_, i) => (
                        <span key={i} ref={el => { places.current[i] = el; }} className={`gm-place${won[i] ? ' is-won' : ''}${landed === i ? ' is-landed' : ''}`}>
                            {won[i] && <svg viewBox="0 0 100 100" overflow="visible" aria-hidden><PrizeArt prize={won[i]} /></svg>}
                            {landed === i && <Burst key={`l${i}`} kind="sparkle" x="50%" y="40%" spread={46} count={7} seed={i + 3} />}
                        </span>
                    ))}
                </div>
            </div>
            {flyer && (
                <span key={flyer.id} className="gm-flyer" style={{ left: flyer.x, top: flyer.y, '--dx': `${flyer.dx}px`, '--dy': `${flyer.dy}px` } as CSSProperties} aria-hidden>
                    <svg viewBox="0 0 100 100" overflow="visible"><PrizeArt prize={flyer.prize} /></svg>
                </span>
            )}
        </div>
    );
}

// A kid peeking round the machine now and then (grijp.css .gm-kid), hands on the cabinet's edge.
function KidArt() {
    return (
        <svg viewBox="0 0 100 120" aria-hidden>
            <circle className="o gm-kid-hair" cx={46} cy={48} r={34} />
            <circle className="o gm-kid-skin" cx={46} cy={56} r={29} />
            <path className="gm-kid-fringe o" d="M18 46 Q30 20 52 24 Q72 26 76 46 Q60 36 46 40 Q30 36 18 46 Z" />
            <g className="gm-eyes">
                <ellipse cx={34} cy={58} rx={4.4} ry={5.6} className="gm-kid-eye" />
                <ellipse cx={54} cy={58} rx={4.4} ry={5.6} className="gm-kid-eye" />
            </g>
            <ellipse cx={44} cy={74} rx={6} ry={4.5} className="gm-kid-mouth" />
            <ellipse cx={12} cy={86} rx={11} ry={9} className="o gm-kid-skin" />
            <ellipse cx={14} cy={36} rx={11} ry={9} className="o gm-kid-skin" />
        </svg>
    );
}

/** The end picture: the shelf full of the round's prizes, all waving, under a jackpot of confetti. */
export function GrijpEnding({ progress }: SkinEndingProps) {
    const run = lastRun;
    const machine = machineById(run?.machine ?? 'neon');
    const { Prize: PrizeArt } = ARCADES[machine.id];
    const [won] = useState<Prize[]>(() => (run?.won.length ? run.won : Array.from({ length: Math.max(1, progress.right) }, (_, i) => ({ kind: machine.prizes[i % machine.prizes.length], look: i % 3 }))));
    const [pop, setPop] = useState(0);
    useEffect(() => {
        const t0 = window.setTimeout(() => playGrijp('jackpot'), 650);
        const id = window.setInterval(() => setPop(n => n + 1), 900);
        return () => { window.clearTimeout(t0); window.clearInterval(id); };
    }, []);
    const rows = [won.slice(0, 8), won.slice(8, 16)].filter(r => r.length);
    return (
        <div className="spel-ending gm-ending" data-machine={machine.id}>
            <span className="gm-ending-lights" aria-hidden>{Array.from({ length: 16 }, (_, k) => <span key={k} className="gm-ending-bulb" style={{ '--k': k % 6, '--c': k % 3 } as CSSProperties} />)}</span>
            <span className="gm-ending-title" aria-hidden>JACKPOT!</span>
            <div className="gm-ending-shelves" aria-hidden>
                {rows.map((row, r) => (
                    <div key={r} className="gm-ending-row">
                        {row.map((p, i) => (
                            <span key={i} className="gm-ending-prize" style={{ '--k': r * 8 + i } as CSSProperties}>
                                <svg viewBox="0 0 100 100" overflow="visible"><PrizeArt prize={p} /></svg>
                            </span>
                        ))}
                        <span className="gm-ending-plank" />
                    </div>
                ))}
            </div>
            {/* The jackpot: confetti bursts, again and again, from both sides and the middle. */}
            <Burst key={`a${pop}`} kind="pieces" x={`${12 + ((pop * 37) % 30)}%`} y="26%" spread={170} count={24} seed={pop + 1} />
            <Burst key={`b${pop}`} kind="pieces" x={`${88 - ((pop * 23) % 30)}%`} y="22%" spread={170} count={24} seed={pop + 7} />
            {pop % 2 === 0 && <Burst key={`c${pop}`} kind="sparkle" x="50%" y="18%" spread={120} count={10} seed={pop + 3} />}
        </div>
    );
}
