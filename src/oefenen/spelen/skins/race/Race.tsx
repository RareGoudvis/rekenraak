import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import { GasPump, Gauge, Timer } from '@phosphor-icons/react';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { RACE, boostCar, drive, formatRaceTime, ghostAt, glideCar, isTurbo, resumeCar, startCar, stopCar, type RaceCar } from './track';
import { benzineResult, loadBest, loadBestKm, raceResult, saveIfBest, saveIfFarther } from './records';
import { FUEL, askLeft, formatKm, fuelRight, fuelStation, fuelTakesAnswers, fuelTick, fuelWrong, isStationQuestion, startFuel, stationProgress, type Fuel } from './benzine';
import { LAND_LABEL, gateOf, landOf, pinnedOf, raceModeOf, routeOf, segmentAt, type Gate } from './route';
import { Can, CarArt, Flame, Puff } from './Car';
import { Landscape, Sun, Weather } from './Scenery';
import { GateArt, Station } from './Gates';
import './race.css';
import './scenery.css';

// Race in two modes (options.modus). Tijdrit: to the finish, the time is the score against the pupil's own best
// run (the see-through ghost car); a mistake stops the car until the next right answer. Benzine: no finish, three
// jerrycans as lives, petrol stations with one timed sum (benzine.ts), the distance is the score. Both drive
// through landscapes (route.ts) with a gate between them. One rAF loop moves the scene, outside React.

// Pixels per metre on the road.
const PPM = 20;
// The old landscape fades out this long after the car passed its gate (scenery.css rc-fade-out).
const SWAP_MS = 1000;
// The landscape changes once the whole car is past the gate's middle (inside the tunnel, on the bridge).
const SWAP_LEAD = 3;
// The car rolls over the line before the end screen comes.
const FINISH_HOLD_MS = 1400;
// Spin per metre: the wheel's radius as a share of the car's width. SYNC: Car.tsx (r 18 in a 220 wide box).
const WHEEL_SHARE = 18 / 220;
// The middle line's dash period in px (race.css .rc-lines).
const DASH = 80;
// Benzine: the car rolls this far on its last drops.
const SPUTTER_M = 6;

type FxKind = 'boost' | 'brake' | 'cough' | 'refill' | 'station' | 'sputter';
type Fx = { kind: FxKind | null; n: number };
type Speed = 'stop' | 'cruise' | 'fast';


const devPins = () => (import.meta.env.DEV && typeof location !== 'undefined' ? pinnedOf(location.search) : { lands: [], gate: null });

export default function Race({ question, phase, feedback, onAnswer, onMiss, onFail, onReport, progress, events, reducedMotion, runKey, onFinish, options }: SkinProps) {
    const mode = raceModeOf(options);
    const benzine = mode === 'benzine';
    const [route] = useState(() => { const pin = devPins(); return routeOf(mode, Math.random, pin.lands, pin.gate); });
    // Tijdrit: the best run so far on this device (the ghost); Benzine: the farthest run. Read once per run.
    const [ghost] = useState(() => (!benzine && runKey ? loadBest(runKey) : null));
    const [bestKm] = useState(() => (benzine && runKey ? loadBestKm(runKey) : null));
    const [seg, setSeg] = useState(0);
    const [leaving, setLeaving] = useState<{ seg: number; gate: Gate | null } | null>(null);
    const [fuel, setFuel] = useState<Fuel>(startFuel);
    const [stationX, setStationX] = useState<number | null>(null);
    const [fx, setFx] = useState<Fx>({ kind: null, n: 0 });
    const [done, setDone] = useState(false);
    const car = useRef<RaceCar>(startCar());
    const fuelNow = useRef<Fuel>(startFuel());
    const root = useRef<HTMLDivElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    const meCar = useRef<HTMLDivElement>(null);
    const ghostCar = useRef<HTMLDivElement>(null);
    const meDot = useRef<HTMLSpanElement>(null);
    const ghostDot = useRef<HTMLSpanElement>(null);
    const readout = useRef<HTMLSpanElement>(null);
    const lines = useRef<HTMLDivElement>(null);
    // What the loop moves, re-read after every render (renders are rare: a gate, a phase, an effect).
    const nodes = useRef<{ strips: HTMLElement[]; movers: HTMLElement[]; wheels: SVGGElement[]; ghostWheels: SVGGElement[] }>({ strips: [], movers: [], wheels: [], ghostWheels: [] });
    const live = useRef({ phase, onFinish, onFail, onReport, onMiss, runKey, reducedMotion, qKey: question?.key ?? '', helpedKey: '' });
    useLayoutEffect(() => { live.current = { ...live.current, phase, onFinish, onFail, onReport, onMiss, runKey, reducedMotion, qKey: question?.key ?? '' }; });
    useLayoutEffect(() => {
        const el = root.current;
        if (!el) return;
        nodes.current = {
            strips: [...el.querySelectorAll<HTMLElement>('.rc-strip')],
            movers: [...el.querySelectorAll<HTMLElement>('[data-wx]')],
            wheels: [...el.querySelectorAll<SVGGElement>('.rc-car.is-me .rc-spin')],
            ghostWheels: [...el.querySelectorAll<SVGGElement>('.rc-car.is-ghost .rc-spin')],
        };
    });

    const setFuelBoth = (f: Fuel) => { fuelNow.current = f; setFuel(f); };

    // A station question on screen: the car pulls in at a pump that comes in from the right edge.
    const qKey = question?.key;
    const qIndex = question?.index ?? -1;
    useEffect(() => {
        if (!benzine || !qKey || !isStationQuestion(qIndex)) return;
        const f = fuelNow.current;
        const next = fuelStation(f);
        if (next === f) return;
        const nose = (meCar.current?.offsetLeft ?? 0) + (meCar.current?.offsetWidth ?? 0);
        const width = root.current?.offsetWidth ?? 1280;
        const metres = live.current.reducedMotion ? 1 : Math.max(24, (width - nose) / PPM + 8);
        car.current = glideCar(car.current, metres, FUEL.pullMs / 1000);
        fuelNow.current = next;
        setFuel(next);
        setStationX(car.current.glide?.to ?? car.current.x);
    }, [benzine, qKey, qIndex]);

    useEffect(() => {
        let fxTimer = 0;
        const flash = (kind: FxKind, ms: number) => {
            setFx(f => ({ kind, n: f.n + 1 }));
            window.clearTimeout(fxTimer);
            fxTimer = window.setTimeout(() => setFx(f => ({ ...f, kind: null })), ms);
        };
        const offHelp = events.on('help', () => { live.current.helpedKey = live.current.qKey; });
        const offRight = events.on('correct', ({ streak }) => {
            const f = fuelNow.current;
            // At the pump the car waits for the fuel (the loop drives it off when the refill is done).
            if (benzine && f.phase === 'ask') { setFuelBoth(fuelRight(f)); flash('refill', FUEL.refillMs); return; }
            car.current = boostCar(car.current, streak);
            flash('boost', 900);
        });
        const offWrong = events.on('wrong', ({ given }) => {
            if (!benzine) { car.current = stopCar(car.current); flash('brake', 1400); return; }
            const f = fuelNow.current;
            const counted = live.current.helpedKey !== live.current.qKey;
            const next = fuelWrong(f, counted, given === '');
            if (next === f) return;
            setFuelBoth(next);
            if (f.phase === 'ask') { car.current = resumeCar(car.current); flash('station', 1600); }
            else if (next.phase === 'sputter') { car.current = glideCar(car.current, SPUTTER_M, FUEL.sputterMs / 1000); flash('sputter', FUEL.sputterMs + FUEL.emptyMs); }
            else flash('cough', 1000);
        });
        return () => { offHelp(); offRight(); offWrong(); window.clearTimeout(fxTimer); };
    }, [events, benzine]);

    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        let shown = '';
        let shownSec = -1;
        let finishTimer = 0;
        let swapTimer = 0;
        let segNow = 0;
        let speed = 0;
        let speedShown: Speed | null = null;
        let missSent = false;
        let failed = false;
        const tiles = new WeakMap<Element, number>();
        const onResize = () => { for (const s of nodes.current.strips) tiles.delete(s); };
        window.addEventListener('resize', onResize);
        const tileOf = (strip: HTMLElement) => {
            let w = tiles.get(strip);
            if (w === undefined) { w = (strip.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0; tiles.set(strip, w); }
            return w;
        };
        const report = (empty: boolean) => {
            const st = live.current;
            const m = car.current.x;
            if (st.runKey) saveIfFarther(st.runKey, m);
            st.onReport?.(benzineResult(m, bestKm, empty));
        };
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            const dt = last === null ? 0 : Math.min(RACE.maxDt, (t - last) / 1000);
            last = t;
            const st = live.current;
            // Under "Hoe los ik dit op?" the car, the clock and the pump's timer wait.
            if (st.phase === 'help' || car.current.finishedAt !== null || failed) return;
            const prevX = car.current.x;

            if (benzine) {
                const f0 = fuelNow.current;
                const f = fuelTick(f0, dt * 1000);
                fuelNow.current = f;
                if (f.phase !== f0.phase) setFuel(f);
                // Full tank: off it goes with a boost (unless a right answer already drove it off).
                if (f0.phase === 'refill' && f.phase === 'drive' && car.current.stopped) car.current = boostCar(car.current, 1);
                // The pump's time ran out: a miss (the session logs it; the 'wrong' event drives the car on).
                if (f.phase === 'ask' && askLeft(f) <= 0 && !missSent && st.phase === 'play') { missSent = true; st.onMiss(); }
                if (fuelNow.current.phase !== 'ask') missSent = false;
                if (fuelNow.current.phase === 'empty' && fuelNow.current.ms >= FUEL.emptyMs) {
                    failed = true;
                    report(true);
                    setDone(true);
                    st.onFail();
                    return;
                }
                if (panel.current) panel.current.style.setProperty('--left', (askLeft(fuelNow.current) / FUEL.askMs).toFixed(3));
            }

            const c = drive(car.current, dt, benzine ? Infinity : RACE.length);
            car.current = c;
            const s = segmentAt(route, c.x - SWAP_LEAD);
            if (s !== segNow) {
                const gate = gateOf(route, s);
                segNow = s;
                setSeg(s);
                setLeaving({ seg: s - 1, gate });
                window.clearTimeout(swapTimer);
                swapTimer = window.setTimeout(() => setLeaving(null), SWAP_MS);
            }

            // The readout: Tijdrit's clock per tenth, Benzine's kilometres per 10 m.
            const text = benzine ? formatKm(c.x) : formatRaceTime(c.t * 1000);
            if (text !== shown && readout.current) { shown = text; readout.current.textContent = text; }
            if (benzine && Math.floor(c.t) !== shownSec) { shownSec = Math.floor(c.t); report(false); }

            const gx = ghost ? ghostAt(ghost, c.t) : null;
            if (meDot.current) meDot.current.style.setProperty('--p', (c.x / RACE.length).toFixed(4));
            if (gx !== null && ghostDot.current) ghostDot.current.style.setProperty('--p', (gx / RACE.length).toFixed(4));
            if (root.current) root.current.dataset.x = c.x.toFixed(2);

            if (dt > 0) speed = speed * 0.8 + ((c.x - prevX) / dt) * 0.2;
            const sp: Speed = c.stopped || speed < 0.3 ? 'stop' : speed > RACE.base * 2.5 ? 'fast' : 'cruise';
            if (sp !== speedShown && meCar.current) { speedShown = sp; meCar.current.dataset.speed = sp; }

            if (!st.reducedMotion) {
                const px = c.x * PPM;
                const { strips, movers, wheels, ghostWheels } = nodes.current;
                for (const strip of strips) {
                    const w = tileOf(strip);
                    const par = Number(strip.dataset.par);
                    if (w > 0) strip.style.transform = `translate3d(${(-((px * par) % w)).toFixed(1)}px, 0, 0)`;
                }
                if (lines.current) lines.current.style.transform = `translate3d(${(-(px % DASH)).toFixed(1)}px, 0, 0)`;
                for (const m of movers) m.style.transform = `translate3d(${((Number(m.dataset.wx) - c.x) * PPM).toFixed(1)}px, 0, 0)`;
                const r = (meCar.current?.offsetWidth ?? 200) * WHEEL_SHARE;
                const turn = (x: number) => `rotate(${((x * PPM / Math.max(1, r)) * 180 / Math.PI % 360).toFixed(1)}deg)`;
                for (const w of wheels) w.style.transform = turn(c.x);
                if (gx !== null) {
                    for (const w of ghostWheels) w.style.transform = turn(gx);
                    if (ghostCar.current) ghostCar.current.style.transform = `translate3d(${((gx - c.x) * PPM).toFixed(1)}px, 0, 0)`;
                }
            }
            if (c.finishedAt !== null) {
                const ms = Math.round(c.finishedAt * 1000);
                const best = st.runKey ? saveIfBest(st.runKey, { ms, trace: c.trace }) : { isNew: true, before: null };
                setDone(true);
                finishTimer = window.setTimeout(() => live.current.onFinish?.(raceResult(ms, best)), st.reducedMotion ? 600 : FINISH_HOLD_MS);
            }
        };
        raf = requestAnimationFrame(frame);
        return () => { cancelAnimationFrame(raf); window.clearTimeout(finishTimer); window.clearTimeout(swapTimer); window.removeEventListener('resize', onResize); };
    }, [ghost, benzine, route, bestKm]);

    if (!question) return <div className="rc-root" />;
    const land = landOf(route, seg);
    const flashing = phase === 'right' || phase === 'wrong';
    const atPump = benzine && (fuel.phase === 'pull' || fuel.phase === 'ready');
    // No turbo flame while pulling in or standing at the pump.
    const turbo = isTurbo(progress.streak) && !(benzine && ['pull', 'ready', 'ask', 'refill'].includes(fuel.phase));
    const asking = benzine && fuel.phase === 'ask';
    const takes = !benzine || fuelTakesAnswers(fuel);
    const gates = [seg, seg + 1].filter(i => gateOf(route, i) !== null);
    const showStation = benzine && stationX !== null && (!reducedMotion || ['pull', 'ready', 'ask', 'refill'].includes(fuel.phase));
    const next = stationProgress(progress.answered);
    const badge = done && !benzine ? 'Finish!'
        : benzine && (fuel.phase === 'sputter' || fuel.phase === 'empty') ? 'De tank is leeg!'
        : fuel.phase === 'pull' && benzine ? 'Tankstation!'
        : fuel.phase === 'ready' && benzine ? 'Maak je klaar!'
        : fx.kind === 'refill' ? 'Vol getankt!'
        : fx.kind === 'station' ? (fuel.lastStation === 'laat' ? 'Te laat! Rij maar verder.' : 'Net niet! Rij maar verder.')
        : turbo && !done ? 'Turbo!' : null;
    const carFx = fx.kind ? ` is-${fx.kind}` : '';
    return (
        <div ref={root} data-land={land} data-mode={mode}
            className={`rc-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${done ? ' is-done' : ''}`}>
            <div className="rc-world" role="img" aria-label={LAND_LABEL[land]}>
                {!reducedMotion && leaving && leaving.seg >= 0 && <Landscape key={leaving.seg} land={landOf(route, leaving.seg)} leaving />}
                <Landscape key={seg} land={land} leaving={false} />
                <div className="rc-road" aria-hidden>
                    <div ref={lines} className="rc-lines" />
                    {!benzine && <div className="rc-finish" data-wx={RACE.length} />}
                    {benzine && bestKm !== null && <div className="rc-recordflag" data-wx={bestKm}><span>Record</span></div>}
                    {!reducedMotion && gates.map(i => (
                        <div key={`b${i}`} className={`rc-gate is-${gateOf(route, i)} is-back`} data-wx={i * route.segment}>
                            <GateArt gate={gateOf(route, i)!} part="back" next={landOf(route, i)} />
                        </div>
                    ))}
                    {showStation && (
                        <div className="rc-station" data-wx={reducedMotion ? undefined : stationX}>
                            <Station busy={fx.kind === 'refill'} />
                        </div>
                    )}
                    {ghost && <div ref={ghostCar} className="rc-car is-ghost"><CarArt ghost /></div>}
                    <div ref={meCar} className={`rc-car is-me${carFx}${turbo ? ' is-turbo' : ''}`} data-fx={fx.kind ?? undefined}>
                        {!reducedMotion && <span className="rc-speedlines" />}
                        {turbo && <Flame />}
                        <CarArt />
                        {!reducedMotion && (fx.kind === 'brake' || fx.kind === 'cough' || fx.kind === 'sputter') && <Puff key={fx.n} className={`is-${fx.kind}`} />}
                        {fx.kind === 'refill' && <span key={fx.n} className="rc-drops" aria-hidden><i /><i /><i /></span>}
                    </div>
                    {!reducedMotion && gates.map(i => (
                        <div key={`f${i}`} className={`rc-gate is-${gateOf(route, i)} is-front`} data-wx={i * route.segment}>
                            <GateArt gate={gateOf(route, i)!} part="front" next={landOf(route, i)} />
                        </div>
                    ))}
                </div>
                <Weather key={`w${land}`} land={land} />

                {benzine ? (
                    <div className="rc-hud is-benzine">
                        <div className={`rc-cans${fx.kind === 'refill' ? ' is-filling' : ''}${fx.kind === 'cough' ? ' is-losing' : ''}`} role="img" aria-label={`Nog ${fuel.cans} van ${FUEL.cans} jerrycans benzine`}>
                            {Array.from({ length: FUEL.cans }, (_, i) => <span key={i} className={`rc-can-slot${i === fuel.cans && (fx.kind === 'cough' || fx.kind === 'sputter') ? ' is-lost' : ''}`} style={{ '--i': i } as CSSProperties}><Can full={i < fuel.cans} /></span>)}
                        </div>
                        <div className="rc-next" role="img" aria-label="Hoe ver tot het tankstation">
                            <GasPump weight="fill" aria-hidden />
                            <span className="rc-next-bar"><span style={{ '--p': Math.min(1, next.done / next.of) } as CSSProperties} /></span>
                        </div>
                    </div>
                ) : (
                    // The whole track at a glance: the car, the ghost, the finish, the three landscapes. Under reduced motion this is the race.
                    <div className="rc-meter" role="img" aria-label="Hoe ver je bent">
                        <span className="rc-meter-track">
                            {route.lands.map((l, i) => <span key={i} className="rc-meter-seg" data-land={l} />)}
                        </span>
                        <span className="rc-meter-flag" />
                        {ghost && <span ref={ghostDot} className="rc-meter-dot is-ghost" />}
                        <span ref={meDot} className="rc-meter-dot is-me" />
                    </div>
                )}
                <p className="rc-readout" role={benzine ? undefined : 'timer'} aria-label={benzine ? 'Gereden afstand' : 'Je tijd'}>
                    {benzine ? <Gauge weight="bold" aria-hidden /> : <Timer weight="bold" aria-hidden />}
                    {' '}<span ref={readout}>{benzine ? formatKm(0) : '0:00,0'}</span>
                    {benzine && bestKm !== null && <small className="rc-best">Record {formatKm(bestKm)}</small>}
                </p>
                {badge && <p key={badge} className={`rc-badge${badge === 'Finish!' ? ' is-finish' : ''}${fuel.phase === 'sputter' || fuel.phase === 'empty' ? ' is-empty' : ''}`} aria-live="polite">{badge}</p>}
            </div>

            <div ref={panel} className={`rc-panel${asking ? ' is-asking' : ''}`}>
                {atPump ? (
                    <p className="rc-sign is-wait" aria-live="polite"><GasPump weight="fill" aria-hidden /> Maak je klaar!</p>
                ) : (
                    <SpelSignBox className={`rc-sign${flashing ? ' is-solved' : ''}`} question={question} feedback={feedback} flash={flashing} answerClassName="rc-sign-answer" />
                )}
                {asking && <span className="rc-askbar" role="timer" aria-label="Tijd aan de pomp"><span /></span>}
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play' || done || !takes} />
            </div>
        </div>
    );
}

/** The end screen's picture: the car under the chequered flag, or beside its empty jerrycan with a smile. */
export function RaceEnding({ outcome, options, reducedMotion }: SkinEndingProps) {
    const empty = raceModeOf(options) === 'benzine' && outcome === 'failed';
    return (
        <div className={`spel-ending rc-ending${empty ? ' is-empty' : ''}${reducedMotion ? ' is-still' : ''}`} data-land="platteland">
            <div className="rc-sky" />
            <Sun className="rc-ending-sun" />
            <div className="rc-ending-road" />
            <div className="rc-ending-car"><CarArt />{empty && !reducedMotion && <Puff className="is-sputter" />}</div>
            {empty
                ? <span className="rc-ending-can"><Can full={false} /></span>
                : <span className="rc-ending-flag" aria-hidden />}
        </div>
    );
}
