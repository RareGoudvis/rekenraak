import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { PersonSimpleSki } from '@phosphor-icons/react';
import type { SkinEndingProps, SkinProps } from '../types';
import type { SpelChoiceView } from '../../content/pack';
import { SpelChoiceFace, SpelSign } from '../../SpelVisual';
import { choiceLabel, faceChars, faceKind, signClass, viewFor } from '../../spelChoice';
import { formatSpelNumber } from '../../spelFormat';
import { Burst, Clouds, Snow } from '../../scene';
import { BANK_MS, GEAR_ORDER, SLALOM, STEPS, answerRun, gearCounts, gearOf, isJump, isWipedOut, laneX, openGate, paceOf, pieceLost, poseOf, project, spawnGate, startRun, tickRun, unitOf, VIEW, type Box, type GateEnd, type GearPiece, type SkierPose, type SlRun } from './run';
import { levelOf } from '../../levels/levels';
import { formatMetres, loadBestM, saveIfLonger, slalomResult } from './records';
import { Crowd, FinishScene, FlyingBit, GateArt, GearIcon, Mountains, Pine, RecordFlag, Ripple, Skier, SkierInBank, Snowman } from './art';
import { playSlalom } from './sounds';
import './slalom.css';

// Skislalom: down a snowy slope behind the skier. Each sum comes on a gate with three numbered flags; tap one (or 1–3)
// and he carves into that lane and shoots through. Right = a step faster (5 steps), 3 in a row = a little jump;
// wrong = a tumble (skis everywhere, a snowman laughs), back to step 1. A gate reached without an answer slips past
// (a step slower) and the same sum comes on the next one. Two minutes; the score is the metres, with a best per card
// on this device. One rAF loop moves the world (run.ts), outside React; renders happen only on a moment. The levels:
// the gate's time follows the shared clock (run.ts paceOf), Makkelijk's tumble costs no speed; a best per level.

const KEYS = ['1', '2', '3'];
// The skier's carve from lane to lane (ms); SYNC: slalom.css .sl-skier transition.
const CARVE_MS = 320;
// The turn's lean, edge, pole plant and spray, both ways (ms); SYNC: slalom.css .sl-skier-turn.
const TURN_MS = 680;
// A piece of gear in the air (ms); SYNC: slalom.css .sl-fly.is-helmet.
const FLY_MS = 900;
// From this speed step on he tucks, poles under his arms.
const TUCK_STEP = 4;
// The snowbank he slides into, this far beside the piste's middle (m): an outer lane and a bit, always on screen.
const BANK_X = 2.4;
// The roll before he slides into the snowbank (ms; SLALOM.rollMs is the roll of a normal tumble).
const BANK_ROLL_MS = 600;
// The flying bits per piece of gear lost.
const FLY_OF: Record<GearPiece, readonly ('helmet' | 'pole-l' | 'pole-r' | 'ski-l' | 'ski-r')[]> = {
    helm: ['helmet'], stokken: ['pole-l', 'pole-r'], ski: ['ski-l'], laatsteSki: ['ski-r'],
};
// Back from between the flags (a miss) to a lane.
const MISS_BACK_MS = 650;
// How long a jump hangs in the air, and a callout stays.
const JUMP_MS = 640;
const CALL_MS = 1100;
// The fans jump this long after a gate taken right.
const CHEER_MS = 900;
// The snowman pops up this far down the slope at the tumble, beside the skier's lane (m); he slides by afterwards.
const SNOWMAN_D = 5;
const SNOWMAN_X = 3.1;
// A passed gate never comes nearer than this on screen (m behind the skier) while it fades.
const PAST_MAX_M = 1.5;
// Scenery: how far down the slope each kind repeats (m), and how many there are.
const TREE_SPAN = 120;
const TREES = 18;
const CROWD_SPAN = 150;
const CROWDS = 3;
const RIPPLE_SPAN = 60;
const RIPPLES = 7;
// Objects fade in over this last stretch below the crest (m).
const FADE_IN_M = 18;
// The end lines are kept up to date every this many ms of game time.
const REPORT_MS = 1000;

interface GateView {
    id: number;
    values: string[];
    views: SpelChoiceView[] | null;
    picked: number | null;
    end: GateEnd | null;
    // The right value (a wrong flash marks its flag).
    expected: string | null;
}

interface Prop { kind: 'tree' | 'crowd' | 'ripple'; d: number; x: number; v: number; span: number }

// Seeded so every run starts with the same slope; recycled props get a fresh place from Math.random.
function startProps(): Prop[] {
    const out: Prop[] = [];
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < TREES; i++) {
        const side = i % 2 ? 1 : -1;
        out.push({ kind: 'tree', d: (i + rnd() * 0.8) * (TREE_SPAN / TREES) - 8, x: side * (VIEW.pisteM + 1 + rnd() * 6), v: i % 3, span: TREE_SPAN });
    }
    for (let i = 0; i < CROWDS; i++) out.push({ kind: 'crowd', d: 20 + i * (CROWD_SPAN / CROWDS), x: (i % 2 ? 1 : -1) * (VIEW.pisteM + 0.6), v: i * 3 + 1, span: CROWD_SPAN });
    for (let i = 0; i < RIPPLES; i++) out.push({ kind: 'ripple', d: i * (RIPPLE_SPAN / RIPPLES) + rnd() * 4, x: (rnd() - 0.5) * 9, v: i, span: RIPPLE_SPAN });
    return out;
}

// Speed lines fan out from the vanishing point over the snow beside the skier (deg from straight down).
const LINE_ANGLES = [24, 34, 44, 54, 64, 74, -24, -34, -44, -54, -64, -74];

// What each scenery node draws (its kind and look never change; only its place does).
const PROP_LOOKS = startProps();

function recycle(p: Prop): Prop {
    const d = p.d + p.span;
    if (p.kind === 'tree') return { ...p, d, x: Math.sign(p.x) * (VIEW.pisteM + 1 + Math.random() * 6) };
    if (p.kind === 'ripple') return { ...p, d, x: (Math.random() - 0.5) * 9 };
    return { ...p, d };
}

type Moment = { kind: 'hop' | 'miss' | 'fast' | 'record'; n: number } | null;
type Spray = { n: number; x: number; kind: 'carve' | 'land' | 'tumble' };

export default function Slalom({ question, choices, views, phase, feedback, onAnswer, onReport, onFail, onHold, progress, events, runKey: cardKey, options: picked }: SkinProps) {
    const options = choices ?? [];
    const level = levelOf(picked);
    // A best per card and level (the levels ski at different paces).
    const runKey = cardKey ? `${cardKey}|${level}` : undefined;
    // The round's game time (the session clock: help and the rotate prompt stop it); the pace follows it.
    const elapsedMs = progress.msTotal !== null && progress.msLeft !== null ? progress.msTotal - progress.msLeft : 0;
    const pace = paceOf(level, elapsedMs);
    const root = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<Box>({ w: 1280, h: 728 });
    const boxRef = useRef(box);
    const [bestBefore] = useState(() => (runKey ? loadBestM(runKey) : null));
    const [first] = useState(() => startRun(pace, level === 'makkelijk'));
    const run = useRef<SlRun>(first);
    const props = useRef<Prop[]>(startProps());
    const snowman = useRef<{ d: number; x: number } | null>(null);
    const [gateViews, setGateViews] = useState<GateView[]>([]);
    const [pose, setPose] = useState<SkierPose>('ski');
    const [step, setStep] = useState(1);
    // The skier's place across the piste (m) and which way he leans while carving there.
    const [skierX, setSkierX] = useState(laneX(1));
    // The latest turn (its way and a count that restarts the animation), the latest wobble.
    const [turn, setTurn] = useState<{ dir: 'l' | 'r'; n: number } | null>(null);
    const turnN = useRef(0);
    const [wobble, setWobble] = useState(0);
    // Moeilijk / Onmogelijk: the falls so far cost gear (run.ts); the pieces in the air; all gone = in the snowbank.
    const gearOn = gearCounts(level);
    const [falls, setFalls] = useState(0);
    const fallsRef = useRef(0);
    const [flying, setFlying] = useState<{ n: number; kinds: readonly ('helmet' | 'pole-l' | 'pole-r' | 'ski-l' | 'ski-r')[] } | null>(null);
    const [bank, setBank] = useState<'off' | 'roll' | 'in' | 'done'>('off');
    const bankRef = useRef(false);
    const [jump, setJump] = useState(0);
    const [moment, setMoment] = useState<Moment>(null);
    const [spray, setSpray] = useState<Spray | null>(null);
    const [snowmanOn, setSnowmanOn] = useState(false);
    const [cheer, setCheer] = useState(false);

    const gateEls = useRef(new Map<number, HTMLDivElement>());
    const propEls = useRef<(HTMLDivElement | null)[]>([]);
    const snowmanEl = useRef<HTMLDivElement>(null);
    const recordEl = useRef<HTMLDivElement>(null);
    const metresEl = useRef<HTMLSpanElement>(null);
    const timers = useRef(new Set<number>());
    const after = (ms: number, fn: () => void) => {
        const t = window.setTimeout(() => { timers.current.delete(t); fn(); }, ms);
        timers.current.add(t);
    };
    useEffect(() => { const all = timers.current; return () => all.forEach(t => window.clearTimeout(t)); }, []);

    const live = useRef({ phase, options, views, qKey: question?.key ?? '', onReport, onHold, runKey, skierX, pace, gearOn });
    useLayoutEffect(() => { live.current = { ...live.current, phase, options, views, qKey: question?.key ?? '', onReport, onHold, runKey, skierX, pace, gearOn }; });

    // In the snowbank: the end screen once he has laughed a while (never under help).
    const failed = useRef(false);
    useEffect(() => {
        if (bank !== 'done' || failed.current || phase === 'help') return;
        failed.current = true;
        onFail();
    }, [bank, phase, onFail]);

    // The scene's size: the loop places everything in px from it.
    useLayoutEffect(() => {
        const el = root.current;
        if (!el) return;
        const measure = () => {
            const b = { w: el.clientWidth || 1280, h: el.clientHeight || 728 };
            if (b.w !== boxRef.current.w || b.h !== boxRef.current.h) { boxRef.current = b; setBox(b); }
        };
        measure();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        ro?.observe(el);
        return () => ro?.disconnect();
    }, []);

    const carveTo = (x: number) => {
        const from = live.current.skierX;
        if (Math.abs(x - from) < 0.1) return;
        const n = ++turnN.current;
        setTurn({ dir: x < from ? 'l' : 'r', n });
        setSkierX(x);
        live.current.skierX = x;
        setSpray(s => ({ n: (s?.n ?? 0) + 1, x: (from + x) / 2, kind: 'carve' }));
        playSlalom('carve');
        // Over: no class left to replay the turn when he gets up from a tumble.
        after(Math.max(CARVE_MS, TURN_MS) + 40, () => setTurn(t => (t && t.n === n ? null : t)));
    };

    // A fall on Moeilijk / Onmogelijk: the next piece flies off; the last one = he slides into the snowbank.
    const loseGear = (tumble: boolean) => {
        if (!live.current.gearOn || bankRef.current) return;
        const n = fallsRef.current + 1;
        fallsRef.current = n;
        setFalls(n);
        const piece = pieceLost(n);
        if (piece) {
            setFlying(f => ({ n: (f?.n ?? 0) + 1, kinds: FLY_OF[piece] }));
            after(FLY_MS, () => setFlying(f => (f && f.kinds === FLY_OF[piece] ? null : f)));
            playSlalom('whoops');
        }
        if (!tumble) setWobble(w => w + 1);
        if (!isWipedOut(n)) return;
        bankRef.current = true;
        const st = live.current;
        st.onHold?.(true);
        const m = run.current.metres;
        if (st.runKey) saveIfLonger(st.runKey, m);
        st.onReport?.(slalomResult(m, bestBefore, true));
        setBank('roll');
        after(tumble ? BANK_ROLL_MS : 0, () => {
            setBank('in');
            // On his bottom across to the side he is on, into the snowbank there (still on screen).
            const edge = (live.current.skierX < 0 ? -1 : 1) * BANK_X;
            setSkierX(edge);
            live.current.skierX = edge;
            after(700, () => { playSlalom('plof'); setSpray(s => ({ n: (s?.n ?? 0) + 1, x: edge, kind: 'tumble' })); });
            after(BANK_MS, () => setBank('done'));
        });
    };

    const flash = (kind: NonNullable<Moment>['kind']) => {
        setMoment(m => ({ kind, n: (m?.n ?? 0) + 1 }));
        after(CALL_MS, () => setMoment(m => (m?.kind === kind ? null : m)));
    };

    // The session's verdict on the open gate.
    useEffect(() => {
        const mark = (correct: boolean, expected: string) => {
            const g = openGate(run.current);
            if (!g) return;
            run.current = answerRun(run.current, correct);
            setGateViews(list => list.map(v => (v.id === g.id ? { ...v, end: correct ? 'right' : 'wrong', expected } : v)));
        };
        const offRight = events.on('correct', ({ streak, given }) => {
            const was = run.current.step;
            mark(true, given);
            if (isJump(streak)) {
                after(SLALOM.passMs - 60, () => {
                    setJump(j => j + 1);
                    playSlalom('jump');
                    flash('hop');
                    after(JUMP_MS, () => setSpray(s => ({ n: (s?.n ?? 0) + 1, x: live.current.skierX, kind: 'land' })));
                });
            }
            // Just reached the top step (a jump has the moment to itself).
            else if (was < STEPS && run.current.step === STEPS) after(SLALOM.passMs, () => flash('fast'));
        });
        const offWrong = events.on('wrong', ({ expected }) => mark(false, expected));
        const offTime = events.on('timeUp', () => {
            const st = live.current;
            const m = run.current.metres;
            if (st.runKey) saveIfLonger(st.runKey, m);
            st.onReport?.(slalomResult(m, bestBefore));
        });
        return () => { offRight(); offWrong(); offTime(); };
        // flash / after / setters only touch refs and state setters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, bestBefore]);

    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        let shownM = -1;
        let shownStep = 1;
        let shownPose: SkierPose = 'ski';
        let shownFast = -1;
        let reportIn = REPORT_MS;
        let recordSeen = bestBefore === null;
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never jumps the slope.
            const dt = last === null ? 0 : Math.min(100, Math.max(0, t - last));
            last = t;
            const st = live.current;
            // Help, or he is in the snowbank: the slope stands still.
            if (st.phase === 'help' || bankRef.current) return;

            let r = run.current.pace === st.pace ? run.current : { ...run.current, pace: st.pace };
            if (st.phase === 'play' && st.qKey && st.options.length && !openGate(r)) {
                r = spawnGate(r);
                const g = r.gates[r.gates.length - 1];
                setGateViews(list => [...list, { id: g.id, values: [...st.options], views: st.views ?? null, picked: null, end: null, expected: null }]);
            }
            const before = r;
            const { run: next, news } = tickRun(r, dt);
            run.current = next;
            r = next;

            if (r.gates.length !== before.gates.length || news.missed !== null) {
                const ids = new Set(r.gates.map(g => g.id));
                setGateViews(list => list.filter(v => ids.has(v.id)).map(v => (v.id === news.missed ? { ...v, end: 'miss' } : v)));
            }
            if (news.missed !== null) {
                // Squeezed between two flags (through no gate at all), then back into a lane.
                const lanes = st.options.length;
                const side = st.skierX <= 0 ? -1 : 1;
                carveTo(lanes === 2 ? 0 : side * VIEW.laneM / 2);
                flash('miss');
                playSlalom('miss');
                // He squeezes through, wobbling; on Moeilijk / Onmogelijk it costs a piece of gear.
                if (live.current.gearOn) loseGear(false);
                else setWobble(w => w + 1);
                after(MISS_BACK_MS, () => carveTo(lanes === 2 ? laneX(side < 0 ? 0 : 1, 2) : laneX(1)));
            }
            if (news.passed) {
                const end = news.passed.end;
                if (end === 'right') { playSlalom('gate'); setCheer(true); after(CHEER_MS, () => setCheer(false)); }
                if (end === 'wrong') {
                    playSlalom('tumble');
                    setSpray(s => ({ n: (s?.n ?? 0) + 1, x: live.current.skierX, kind: 'tumble' }));
                    snowman.current = { d: SNOWMAN_D, x: live.current.skierX > 0.5 ? -SNOWMAN_X : SNOWMAN_X };
                    setSnowmanOn(true);
                    after(SLALOM.rollMs, () => playSlalom('laugh'));
                    loseGear(true);
                }
            }
            if (news.gotUp) playSlalom('up');

            const p = poseOf(r);
            if (p !== shownPose) { shownPose = p; setPose(p); }
            if (r.step !== shownStep) { shownStep = r.step; setStep(r.step); }

            const m = Math.floor(r.metres);
            if (m !== shownM && metresEl.current) { shownM = m; metresEl.current.textContent = formatMetres(m); }
            if (!recordSeen && bestBefore !== null && r.metres > bestBefore) { recordSeen = true; flash('record'); playSlalom('record'); }
            reportIn -= dt;
            if (reportIn <= 0) {
                reportIn = REPORT_MS;
                if (st.runKey) saveIfLonger(st.runKey, r.metres);
                st.onReport?.(slalomResult(r.metres, bestBefore));
            }

            const b = boxRef.current;
            const el = root.current;
            // Speed lines and spray grow with the speed (a shoot-through tops it up).
            const fast = Math.round(Math.min(1, Math.max(0.12, (r.speed - SLALOM.speeds[0] * 0.8) / (SLALOM.speeds[STEPS - 1] - SLALOM.speeds[0] * 0.8))) * 20) / 20;
            if (fast !== shownFast && el) { shownFast = fast; el.style.setProperty('--sl-fast', String(fast)); }

            const place = (node: HTMLElement | null | undefined, d: number, x: number, extra = '') => {
                if (!node) return;
                const q = project(b, d, x);
                node.style.transform = `translate3d(${q.x.toFixed(1)}px, ${q.y.toFixed(1)}px, 0) scale(${q.s.toFixed(4)})${extra}`;
                node.style.zIndex = String(Math.round(3000 - d * 20));
            };
            const advance = r.metres - before.metres;
            const list = props.current;
            for (let i = 0; i < list.length; i++) {
                let pr = { ...list[i], d: list[i].d - advance };
                // Past the camera: back to the crest.
                if (pr.d < -VIEW.camM * 0.55) pr = recycle(pr);
                list[i] = pr;
                const node = propEls.current[i];
                place(node, pr.d, pr.x);
                if (node) node.style.opacity = String(Math.max(0, Math.min(1, (pr.span - 2 - pr.d) / FADE_IN_M)));
            }
            for (const g of r.gates) {
                const node = gateEls.current.get(g.id);
                place(node, Math.max(g.d, -PAST_MAX_M), 0);
                // Gone through: it fades fast, so the big near poles never hide the slope.
                if (node) node.style.opacity = g.pastMs === null ? '' : String((1 - Math.min(1, g.pastMs / SLALOM.fadeMs)) ** 2);
            }
            if (snowman.current) {
                snowman.current = { ...snowman.current, d: snowman.current.d - advance };
                place(snowmanEl.current, snowman.current.d, snowman.current.x);
                if (snowman.current.d < -VIEW.camM * 0.5) { snowman.current = null; setSnowmanOn(false); }
            }
            const toRecord = bestBefore !== null ? bestBefore - r.metres : -1;
            if (recordEl.current) {
                recordEl.current.style.display = toRecord > -6 && toRecord < 90 ? '' : 'none';
                if (toRecord > -6 && toRecord < 90) place(recordEl.current, toRecord, -(VIEW.pisteM - 0.4));
            }
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
        // carveTo / flash only touch refs and setters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bestBefore]);

    const open = gateViews.find(v => v.end === null) ?? null;
    const tap = (gateId: number, lane: number) => {
        const g = openGate(run.current);
        // Still in the snow after a tumble (or in the snowbank for good): the flags wait.
        if (phase !== 'play' || !question || !g || g.id !== gateId || run.current.down > 0 || bankRef.current) return;
        const v = gateViews.find(x => x.id === gateId);
        const value = v?.values[lane];
        if (value === undefined) return;
        setGateViews(list => list.map(x => (x.id === gateId ? { ...x, picked: lane } : x)));
        carveTo(laneX(lane, v!.values.length));
        onAnswer(value);
    };
    const tapRef = useRef(tap);
    useLayoutEffect(() => { tapRef.current = tap; });
    const openId = open?.id ?? null;
    const openRef = useRef(openId);
    useLayoutEffect(() => { openRef.current = openId; });
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const i = KEYS.indexOf(e.key);
            if (i >= 0 && openRef.current !== null) { e.preventDefault(); tapRef.current(openRef.current, i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!question) return <div className="sl-root" />;
    const flashing = phase === 'right' || phase === 'wrong';
    const u = unitOf(box);
    const skier = project(box, 0, skierX);
    const shownPose: SkierPose = bank === 'roll' ? 'roll' : bank === 'in' || bank === 'done' ? 'bank' : pose;
    const down = shownPose === 'roll' || shownPose === 'sit';
    const gear = gearOn ? gearOf(falls) : undefined;
    const callout = moment?.kind === 'hop' ? 'Hop!' : moment?.kind === 'miss' ? 'Te laat!' : moment?.kind === 'fast' ? 'Topsnelheid!' : moment?.kind === 'record' ? 'Nieuw record!' : null;

    return (
        <div ref={root}
            className={`sl-root${phase === 'help' ? ' is-paused' : ''}${views ? ' has-pictures' : ''}${bank !== 'off' ? ' is-bank' : ''}`}
            style={{ '--sl-crouch': (step - 1) / (STEPS - 1), '--sl-unit': `${u.toFixed(2)}px` } as CSSProperties}>
            <div className="sl-sky" aria-hidden>
                <Clouds layer="far" outline={false} count={3} band={[4, 20]} speed={90} />
                <Mountains />
            </div>
            <Ground box={box} />
            <div className="sl-lines" aria-hidden>{LINE_ANGLES.map((a, i) => <i key={i} style={{ '--a': `${a}deg`, '--i': i } as CSSProperties} />)}</div>

            <div className={`sl-world${cheer ? ' is-cheer' : ''}`} aria-hidden>
                {PROP_LOOKS.map((p, i) => (
                    <div key={i} ref={el => { propEls.current[i] = el; }} className={`sl-prop is-${p.kind}`}>
                        {p.kind === 'tree' ? <Pine v={p.v} /> : p.kind === 'crowd' ? <Crowd seed={p.v} /> : <Ripple />}
                    </div>
                ))}
                <div ref={recordEl} className="sl-prop is-record" style={{ display: 'none' }}><RecordFlag /></div>
                {snowmanOn && (
                    <div ref={snowmanEl} className="sl-prop is-snowman">
                        <Snowman laughing={down} />
                        {down && <span className="sl-bubble">Hihi!</span>}
                    </div>
                )}
            </div>

            <div className="sl-gates" role="group" aria-label="Kies het antwoord">
                {gateViews.map(v => {
                    const isOpen = v.end === null;
                    return (
                        <div key={v.id} ref={el => { if (el) gateEls.current.set(v.id, el); else gateEls.current.delete(v.id); }}
                            className={`sl-gate${isOpen ? ' is-open' : ` is-${v.end} is-gone`}`} data-gate={v.id}>
                            {v.values.map((value, lane) => {
                                const face = viewFor(v.values, v.views, value);
                                const mine = v.picked === lane;
                                const state = mine && v.end === 'right' ? ' is-right' : mine && v.end === 'wrong' ? ' is-wrong'
                                    : v.end === 'wrong' && value === v.expected ? ' is-answer' : '';
                                const chars = face ? faceChars(face) : formatSpelNumber(value).length;
                                return (
                                    <button key={lane} type="button" className={`sl-flag is-lane-${lane}${state}`}
                                        style={{ '--lane-x': `${(laneX(lane, v.values.length) * u).toFixed(1)}px`, '--sl-chars': chars } as CSSProperties}
                                        disabled={!isOpen || phase !== 'play'} tabIndex={isOpen ? 0 : -1} aria-hidden={!isOpen}
                                        aria-label={choiceLabel(value, face)}
                                        onPointerDown={e => { if (e.button === 0) tap(v.id, lane); }}
                                        onClick={() => tap(v.id, lane)}>
                                        <GateArt />
                                        <span className={`sl-num kiosk-math is-${faceKind(face)}`} style={{ '--face-chars': faceChars(face) } as CSSProperties} aria-hidden>
                                            <SpelChoiceFace value={value} view={face} />
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <div className={`sl-skier is-${shownPose}`} key={`j${jump}`}
                style={{ transform: `translate3d(${skier.x.toFixed(1)}px, ${skier.y.toFixed(1)}px, 0)` }} aria-hidden>
                <div className={`sl-skier-body${jump ? ' is-jump' : ''}`}>
                    <span className="sl-spray-trail" />
                    <div key={`t${turn?.n ?? 'rest'}`} className={`sl-skier-turn${turn && shownPose === 'ski' ? ` is-${turn.dir}` : ''}`}>
                        <div key={`w${wobble}`} className={`sl-skier-wob${wobble && shownPose === 'ski' ? ' is-on' : ''}`}>
                            <Skier pose={shownPose} gear={gear} tuck={step >= TUCK_STEP && shownPose === 'ski'} />
                        </div>
                    </div>
                </div>
                {/* A tumble: skis and poles fly off and come back; with gear at stake only the piece he loses goes. */}
                {down && !gearOn && <><FlyingBit kind="ski-l" /><FlyingBit kind="ski-r" /><FlyingBit kind="pole-l" /><FlyingBit kind="pole-r" /></>}
                {flying && <span key={`f${flying.n}`}>{flying.kinds.map(k => <FlyingBit key={k} kind={k} />)}</span>}
                {(bank === 'in' || bank === 'done') && <span className="sl-bubble is-laugh">Hahaha!</span>}
            </div>
            {spray && (
                <Burst key={`s${spray.n}`} kind="smoke" className="sl-spray" color="var(--sl-spray)"
                    x={project(box, 0, spray.x).x} y={box.h * VIEW.ground - 6} spread={spray.kind === 'carve' ? u * 0.5 : u * 0.8} count={spray.kind === 'carve' ? 8 : 14} seed={spray.n} />
            )}
            <Snow density={36} full size={[4, 10]} fall={[7, 12]} paused={phase === 'help'} />

            {/* In the snowbank the run is over: no next sum above him. */}
            {bank === 'off' && (
                <div className="sl-top">
                    <p className={`sl-sign kiosk-math${flashing ? ' is-solved' : ''}${signClass(question)}`} aria-live="polite">
                        <SpelSign question={question} feedback={feedback} flash={flashing} choices={options} views={views} answerClassName="sl-sign-answer" />
                    </p>
                </div>
            )}
            <div className="sl-hud">
                <p className="sl-metres" aria-label="Afstand"><PersonSimpleSki weight="bold" aria-hidden /> <span ref={metresEl}>0 m</span></p>
                <span className="sl-speed" role="img" aria-label={`Snelheid ${step} van ${STEPS}`}>
                    {Array.from({ length: STEPS }, (_, i) => <i key={i} className={i < step ? 'is-on' : ''} style={{ '--i': i } as CSSProperties} />)}
                </span>
                {bestBefore !== null && <small className="sl-best">Record {formatMetres(bestBefore)}</small>}
                {gear && (
                    // His gear: a lost piece greys out with a cross; the last ski wobbles when it is the only thing left.
                    <span className="sl-gear" role="img" aria-label={`Nog ${GEAR_ORDER.length - Math.min(falls, GEAR_ORDER.length)} van ${GEAR_ORDER.length} stukken`}>
                        {GEAR_ORDER.map((piece, i) => (
                            <span key={piece} className={`sl-gear-item${i < falls ? ' is-lost' : ''}${i === falls - 1 ? ' is-new' : ''}${i === falls && falls === GEAR_ORDER.length - 1 ? ' is-next' : ''}`}>
                                <GearIcon piece={piece} />
                            </span>
                        ))}
                    </span>
                )}
            </div>
            {callout && <p key={`c${moment!.n}`} className={`sl-call is-${moment!.kind}`} aria-live="polite">{callout}</p>}
            {progress.streak >= SLALOM.jumpEvery && !flashing && <span className="sl-streak" aria-hidden>{progress.streak}×</span>}
        </div>
    );
}

// The slope from the crest down: deep snow beside the groomed piste, whose edges run to the vanishing point.
function Ground({ box }: { box: Box }) {
    const { w, h } = box;
    const top = h * VIEW.horizon;
    const edge = (x: number) => {
        const near = project(box, 0, x);
        // Past the skier the edge goes on to the bottom of the scene, on the same line.
        const k = (h - top) / Math.max(1, near.y - top);
        return { x: w / 2 + (near.x - w / 2) * k, y: h };
    };
    const l = edge(-VIEW.pisteM);
    const r = edge(VIEW.pisteM);
    const grooves = [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5].map(x => edge(x));
    return (
        <svg className="sl-ground" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
            <path className="sl-snowfield" d={`M0 ${top - 6} Q${w / 2} ${top - 16} ${w} ${top - 6} L${w} ${h} L0 ${h} Z`} />
            <path className="sl-piste" d={`M${w / 2 - 6} ${top - 11} L${w / 2 + 6} ${top - 11} L${r.x} ${r.y} L${l.x} ${l.y} Z`} />
            {grooves.map((g, i) => <path key={i} className="sl-groove" d={`M${w / 2} ${top - 10} L${g.x} ${g.y}`} />)}
            <path className="sl-bank" d={`M${w / 2 - 6} ${top - 11} L${l.x} ${l.y} M${w / 2 + 6} ${top - 11} L${r.x} ${r.y}`} />
            <path className="sl-crest" d={`M0 ${top - 6} Q${w / 2} ${top - 16} ${w} ${top - 6}`} />
        </svg>
    );
}

/** The end screen's picture: the finish arch on the snow, the skier through it (or in the snowbank) and the snowman cheering. */
export function SlalomEnding({ outcome }: SkinEndingProps) {
    // All gear gone: no finish, he laughs in the snowbank beside the cheering snowman.
    const inBank = outcome === 'failed';
    return (
        <div className="spel-ending sl-ending">
            <FinishScene />
            <div className={`sl-ending-skier${inBank ? ' is-bank' : ''}`}>{inBank ? <SkierInBank /> : <Skier pose="ski" />}</div>
            <div className="sl-ending-snowman"><Snowman laughing /></div>
            <Snow density={18} full size={[3, 7]} />
        </div>
    );
}
