import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Timer } from '@phosphor-icons/react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinProps } from '../types';
import { RACE, boostCar, brakeCar, drive, formatRaceTime, ghostAt, isTurbo, startCar, type RaceCar } from './track';
import { loadBest, raceResult, saveIfBest } from './records';
import './race.css';

// Race: the car drives on its own; a right answer is a boost, 5 in a row a turbo with a flame, a mistake a
// short stop. No countdown: the time to the finish is the score, against the pupil's own best run on this
// device (the see-through ghost car). One rAF loop moves the scene (outside React); the rest is CSS.

// Pixels per metre on the road, and how fast the far layers follow (parallax).
const PPM = 14;
const HILLS = 0.2;
const TREES = 0.55;
// Tile widths of the repeating layers (race.css draws them at these sizes).
const HILL_TILE = 800;
const TREE_TILE = 600;
const DASH = 80;
// The car rolls over the line before the end screen comes.
const FINISH_HOLD_MS = 1400;

type Fx = { kind: 'boost' | 'brake' | null; n: number };

function CarArt({ ghost = false }: { ghost?: boolean }) {
    return (
        <svg className={`rc-car-art${ghost ? ' is-ghost' : ''}`} viewBox="0 0 160 80" aria-hidden>
            <path className="rc-car-body" d="M8 52 Q8 38 22 36 L46 34 L62 16 Q66 12 74 12 L106 12 Q114 12 118 18 L130 34 L146 38 Q156 41 156 52 L156 58 Q156 62 150 62 L14 62 Q8 62 8 56 Z" />
            <path className="rc-car-window" d="M68 20 L104 20 Q108 20 110 24 L118 34 L60 34 Z" />
            <circle className="rc-driver" cx="90" cy="27" r="8" />
            <path className="rc-car-stripe" d="M20 46 L148 46" />
            <circle className="rc-car-light" cx="150" cy="46" r="4" />
            <g className="rc-wheel" style={{ transformOrigin: '40px 62px' }}>
                <circle className="rc-tyre" cx="40" cy="62" r="14" />
                <circle className="rc-hub" cx="40" cy="62" r="5" />
                <path className="rc-spoke" d="M40 50 L40 74 M28 62 L52 62" />
            </g>
            <g className="rc-wheel" style={{ transformOrigin: '124px 62px' }}>
                <circle className="rc-tyre" cx="124" cy="62" r="14" />
                <circle className="rc-hub" cx="124" cy="62" r="5" />
                <path className="rc-spoke" d="M124 50 L124 74 M112 62 L136 62" />
            </g>
        </svg>
    );
}

function Flame() {
    return (
        <svg className="rc-flame" viewBox="0 0 60 30" aria-hidden>
            <path className="rc-flame-out" d="M60 15 Q40 0 4 8 Q18 15 4 22 Q40 30 60 15 Z" />
            <path className="rc-flame-in" d="M60 15 Q46 7 24 11 Q32 15 24 19 Q46 23 60 15 Z" />
        </svg>
    );
}

function Hills() {
    return (
        <svg className="rc-hill-tile" viewBox={`0 0 ${HILL_TILE} 120`} preserveAspectRatio="none" aria-hidden>
            {/* Fill and outline apart: the tile edges get no stroke, so the tiles join without a seam. */}
            <path className="rc-hill" d={`M0 120 L0 70 Q100 10 200 60 Q300 110 400 50 Q500 0 600 55 Q700 100 ${HILL_TILE} 70 L${HILL_TILE} 120 Z`} />
            <path className="rc-hill-line" d={`M0 70 Q100 10 200 60 Q300 110 400 50 Q500 0 600 55 Q700 100 ${HILL_TILE} 70`} />
        </svg>
    );
}

function Trees() {
    return (
        <svg className="rc-tree-tile" viewBox={`0 0 ${TREE_TILE} 90`} aria-hidden>
            {[60, 250, 430].map(x => (
                <g key={x}>
                    <rect className="rc-trunk" x={x - 5} y="56" width="10" height="30" rx="3" />
                    <circle className="rc-leaves" cx={x} cy="40" r="26" />
                </g>
            ))}
            <path className="rc-bush" d="M140 86 Q140 66 160 68 Q172 56 186 68 Q204 66 204 86 Z" />
            <path className="rc-bush" d="M520 86 Q520 70 536 70 Q548 60 560 70 Q576 70 576 86 Z" />
        </svg>
    );
}

export default function Race({ question, phase, feedback, onAnswer, progress, events, reducedMotion, runKey, onFinish }: SkinProps) {
    // The best run so far on this device: the ghost (read once; a new record shows from the next run).
    const [ghost] = useState(() => (runKey ? loadBest(runKey) : null));
    const [fx, setFx] = useState<Fx>({ kind: null, n: 0 });
    const [done, setDone] = useState(false);
    const car = useRef<RaceCar>(startCar());
    // The layers the loop moves; written straight to the DOM, never through React.
    const root = useRef<HTMLDivElement>(null);
    const hills = useRef<HTMLDivElement>(null);
    const trees = useRef<HTMLDivElement>(null);
    const lines = useRef<HTMLDivElement>(null);
    const finishLine = useRef<HTMLDivElement>(null);
    const ghostCar = useRef<HTMLDivElement>(null);
    const meCar = useRef<HTMLSpanElement>(null);
    const meGhost = useRef<HTMLSpanElement>(null);
    const clock = useRef<HTMLSpanElement>(null);
    const live = useRef({ phase, onFinish, runKey, reducedMotion });
    useLayoutEffect(() => { live.current = { phase, onFinish, runKey, reducedMotion }; });

    useEffect(() => {
        let fxTimer = 0;
        const flash = (kind: 'boost' | 'brake', ms: number) => {
            setFx(f => ({ kind, n: f.n + 1 }));
            window.clearTimeout(fxTimer);
            fxTimer = window.setTimeout(() => setFx(f => ({ ...f, kind: null })), ms);
        };
        const offRight = events.on('correct', ({ streak }) => { car.current = boostCar(car.current, streak); flash('boost', 900); });
        const offWrong = events.on('wrong', () => { car.current = brakeCar(car.current); flash('brake', RACE.brakeSec * 1000); });
        return () => { offRight(); offWrong(); window.clearTimeout(fxTimer); };
    }, [events]);

    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        let shownTenth = -1;
        let finishTimer = 0;
        const move = (el: HTMLElement | null | undefined, px: number) => { if (el) el.style.transform = `translate3d(${px.toFixed(1)}px, 0, 0)`; };
        const meter = (el: HTMLElement | null | undefined, x: number) => { if (el) el.style.setProperty('--p', (x / RACE.length).toFixed(4)); };
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            const dt = last === null ? 0 : (t - last) / 1000;
            last = t;
            const st = live.current;
            // Under "Hoe los ik dit op?" the car and the clock wait.
            if (st.phase === 'help' || car.current.finishedAt !== null) return;
            const c = drive(car.current, dt);
            car.current = c;
            const tenth = Math.floor(c.t * 10);
            if (tenth !== shownTenth && clock.current) { shownTenth = tenth; clock.current.textContent = formatRaceTime(c.t * 1000); }
            const gx = ghost ? ghostAt(ghost, c.t) : null;
            meter(meCar.current, c.x);
            if (gx !== null) meter(meGhost.current, gx);
            if (root.current) root.current.dataset.x = c.x.toFixed(2);
            if (!st.reducedMotion) {
                const px = c.x * PPM;
                move(hills.current, -((px * HILLS) % HILL_TILE));
                move(trees.current, -((px * TREES) % TREE_TILE));
                move(lines.current, -(px % DASH));
                move(finishLine.current, (RACE.length - c.x) * PPM);
                if (gx !== null) move(ghostCar.current, (gx - c.x) * PPM);
            }
            if (c.finishedAt !== null) {
                const ms = Math.round(c.finishedAt * 1000);
                const best = st.runKey ? saveIfBest(st.runKey, { ms, trace: c.trace }) : { isNew: true, before: null };
                setDone(true);
                finishTimer = window.setTimeout(() => live.current.onFinish?.(raceResult(ms, best)), st.reducedMotion ? 600 : FINISH_HOLD_MS);
            }
        };
        raf = requestAnimationFrame(frame);
        return () => { cancelAnimationFrame(raf); window.clearTimeout(finishTimer); };
    }, [ghost]);

    if (!question) return <div className="rc-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [lhs] = question.text.split('?');
    const turbo = isTurbo(progress.streak);
    return (
        <div ref={root} className={`rc-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${done ? ' is-done' : ''}`}>
            <div className="rc-world">
                <div className="rc-sky" aria-hidden>
                    <span className="rc-sun" />
                    <span className="rc-cloud is-a" />
                    <span className="rc-cloud is-b" />
                </div>
                <div className="rc-hills" aria-hidden><div ref={hills} className="rc-strip"><Hills /><Hills /><Hills /></div></div>
                <div className="rc-trees" aria-hidden><div ref={trees} className="rc-strip"><Trees /><Trees /><Trees /><Trees /></div></div>
                <div className="rc-road" aria-hidden>
                    <div ref={lines} className="rc-lines" />
                    <div ref={finishLine} className="rc-finish" />
                    {ghost && <div ref={ghostCar} className="rc-car is-ghost"><CarArt ghost /></div>}
                    <div className={`rc-car is-me${fx.kind ? ` is-${fx.kind}` : ''}${turbo ? ' is-turbo' : ''}`} data-fx={fx.kind ?? undefined}>
                        {turbo && <Flame />}
                        {fx.kind === 'boost' && !reducedMotion && <span key={fx.n} className="rc-speed" />}
                        <CarArt />
                        {fx.kind === 'brake' && !reducedMotion && <span key={fx.n} className="rc-skid" />}
                    </div>
                </div>
                {/* The whole track at a glance: the car, the ghost, the finish. Under reduced motion this is the race. */}
                <div className="rc-meter" role="img" aria-label="Hoe ver je bent">
                    <span className="rc-meter-track" />
                    <span className="rc-meter-flag" />
                    {ghost && <span ref={meGhost} className="rc-meter-dot is-ghost" />}
                    <span ref={meCar} className="rc-meter-dot is-me" />
                </div>
                <p className="rc-clock" role="timer" aria-label="Je tijd">
                    <Timer weight="bold" aria-hidden /> <span ref={clock}>0:00,0</span>
                </p>
                {turbo && !done && <p className="rc-badge" aria-live="polite">Turbo!</p>}
                {done && <p className="rc-badge is-finish" aria-live="polite">Finish!</p>}
            </div>

            <div className="rc-panel">
                <p className={`rc-sign kiosk-math${flash ? ' is-solved' : ''}`} aria-live="polite">
                    {flash && feedback
                        ? <>{lhs}<span className="rc-sign-answer">{formatMathNumber(Number(feedback.expected))}</span></>
                        : question.text}
                </p>
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play' || done} />
            </div>
        </div>
    );
}
