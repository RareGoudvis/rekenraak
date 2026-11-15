import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SkinEndingProps, SkinProps } from '../types';
import { SpelChoiceFace, SpelSign } from '../../SpelVisual';
import { choiceLabel, faceChars, faceKind, pictureClass, signClass } from '../../spelChoice';
import type { SpelChoiceView } from '../../content/pack';
import { Burst, replay } from '../../scene';
import { beltDone, beltStep, isOff, parcelAt, runStart } from './belt';
import { LABEL_Y, presentLooks, TOYS, type PresentLook } from './presents';
import { pressureFrom, pressureMood, sputters, PRESSURE } from './pressure';
import { Bin, CrateBack, CrateFront, Gear, Lamp, MachineHead, PresentArt, RobotArm, ToyArt } from './FabriekArt';
import './pakjesband.css';

// Speelgoedfabriek (skin id pakjesband): a wrapping machine sends four presents along a belt, each with an answer.
// Tap (or 1–4) the right one: it lifts, spins, gets a star stamp and flies into the crate. A wrong one bounces
// back with a boing and heats the machine's pressure gauge (pressure.ts); right answers cool it. Too hot and the
// machine sputters: steam, toys everywhere, the friendly early end (onFail). The rightmost present reaching the
// belt's end is a miss (onMiss) and drops in the bin. One rAF loop moves the belt (a transform per present); the
// belt stands still outside play. Under reduced motion the presents stand still and there is no deadline.

// A right present's flight into the crate, longer than the session's right flash: the next sum comes meanwhile.
export const FLY_MS = 1100;
// The sputter plays this long before the end screen; inside the wrong flash (SPEL_FLASH_MS.wrong = 1600).
export const SPUTTER_MS = 1300;

// Toys popping out of the sputtering machine: where they land, in shares of the scene (x, y) and their spin.
const POPS: readonly [number, number, number][] = [[.22, .9, -200], [.36, .82, 160], [.5, .93, -120], [.62, .86, 240], [.78, .91, -160], [.88, .84, 120], [.14, .8, 200], [.44, .96, -260]];

// The hopper's mouth in the scene (pakjesband.css: .pk-machine and its head).
const HOPPER_X = 'calc(.5% + var(--pk-mw) * .41)';
const HOPPER_Y = 'calc(var(--pk-belt) * 100% - var(--pk-door-h) - var(--pk-mw) * .95)';

const STACK = [...presentLooks('stapel', 4), ...presentLooks('stapel-2', 2)];

interface Flyer { key: string; look: PresentLook; value: string; view?: SpelChoiceView; left: number; top: number; size: number; dx: number; dy: number }

function Stamp() {
    return (
        <span className="pk-stamp" aria-hidden>
            <svg viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="17" />
                <path d="M20 7 L23.5 15.5 L32.5 16 L25.5 21.8 L27.8 30.6 L20 25.6 L12.2 30.6 L14.5 21.8 L7.5 16 L16.5 15.5 Z" />
            </svg>
        </span>
    );
}

/** The art and label of one present, in a slot or in flight. */
function Present({ look, uid, value, view, stamped }: { look: PresentLook; uid: string; value: string; view?: SpelChoiceView; stamped?: boolean }) {
    // The label stays on the shape's calm front face, also on a smaller present (the art scales from its foot).
    const labelTop = 100 - (100 - LABEL_Y[look.shape]) * look.size;
    const side = (1 - look.size) * 50;
    return (
        <>
            <PresentArt look={look} uid={uid} style={{ left: `${side}%`, top: `${(1 - look.size) * 100}%`, width: `${look.size * 100}%`, height: `${look.size * 100}%` }} />
            <span className={`pk-num kiosk-math is-${faceKind(view)}`} style={{ top: `${labelTop}%`, '--face-chars': faceChars(view) } as CSSProperties} aria-hidden><SpelChoiceFace value={value} view={view} /></span>
            {stamped && <Stamp />}
        </>
    );
}

export default function Pakjesband({ question, choices, views, phase, feedback, onAnswer, onMiss, onFail, progress, events, reducedMotion }: SkinProps) {
    const uid = useId();
    const [picked, setPicked] = useState<{ key: string; index: number } | null>(null);
    const [flyer, setFlyer] = useState<Flyer | null>(null);
    const options = useMemo(() => choices ?? [], [choices]);
    const looks = useMemo(() => presentLooks(question?.key ?? '', Math.max(4, options.length)), [question?.key, options.length]);
    const pickedNow = picked && question && picked.key === question.key ? picked : null;
    const answerIdx = feedback ? options.indexOf(feedback.expected) : -1;
    const missed = !!feedback && feedback.given === '';

    // The pressure gauge follows the session's counts (met hulp never heats it); kept as derived state.
    const [meter, setMeter] = useState({ p: 0, right: progress.right, mistakes: progress.mistakes });
    if (meter.right !== progress.right || meter.mistakes !== progress.mistakes) {
        setMeter({ p: pressureFrom(meter.p, meter, progress), right: progress.right, mistakes: progress.mistakes });
    }
    const pressure = meter.p;
    const mood = pressureMood(pressure);
    const sputter = sputters(pressure);

    const root = useRef<HTMLDivElement>(null);
    const field = useRef<HTMLDivElement>(null);
    const machine = useRef<HTMLDivElement>(null);
    const crate = useRef<HTMLSpanElement>(null);
    const parcels = useRef<(HTMLDivElement | null)[]>([]);
    const track = useRef(0);
    // Where the picked present was when tapped (the belt moves): a right answer's flight starts there.
    const launch = useRef<Flyer | null>(null);
    const run = useRef(runStart());
    const live = useRef({ phase, reducedMotion, onMiss, onFail, key: question?.key, missedKey: undefined as string | undefined });
    useLayoutEffect(() => { live.current = { ...live.current, phase, reducedMotion, onMiss, onFail, key: question?.key }; });

    const placeAll = () => {
        const still = live.current.reducedMotion;
        parcels.current.forEach((el, i) => {
            if (!el) return;
            const r = still ? -1 : run.current;
            const at = Math.min(parcelAt(i, r), 1.06);
            el.style.transform = `translate3d(${(at * track.current).toFixed(1)}px, 0, 0)`;
            el.classList.toggle('is-off', !still && isOff(i, r));
            // Its spot on the belt (tests, debugging).
            el.dataset.at = at.toFixed(3);
        });
    };
    const placeRef = useRef(placeAll);
    useLayoutEffect(() => { placeRef.current = placeAll; });

    // A new sum: the belt starts again from the left with four fresh presents.
    useLayoutEffect(() => {
        run.current = runStart();
        placeRef.current();
    }, [question?.key]);

    const hasQuestion = !!question;
    useLayoutEffect(() => {
        const el = field.current;
        const box = root.current;
        if (!el || !box || !hasQuestion) return;
        const remeasure = () => {
            const parcel = el.querySelector<HTMLElement>('.pk-slot');
            track.current = Math.max(0, el.clientWidth - (parcel?.offsetWidth ?? 0));
            // The scene's size for the CSS that throws things across it (the sputter's toys, a present into the bin).
            box.style.setProperty('--rw', `${box.clientWidth}px`);
            box.style.setProperty('--rh', `${box.clientHeight}px`);
            placeRef.current();
        };
        remeasure();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(remeasure);
        ro.observe(el);
        ro.observe(box);
        return () => ro.disconnect();
    }, [hasQuestion]);
    // After every render: a className change must not drop the loop's is-off, and reduced motion places still.
    useLayoutEffect(() => { placeRef.current(); });

    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        const frame = (t: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never jumps the belt.
            const dt = last === null ? 0 : Math.min(0.1, Math.max(0, (t - last) / 1000));
            last = t;
            const st = live.current;
            // Only while the sum waits: still during a flash, under "Hoe los ik dit op?" and under reduced motion.
            if (st.phase !== 'play' || st.reducedMotion) return;
            run.current = beltStep(run.current, dt);
            placeRef.current();
            if (beltDone(run.current) && st.missedKey !== st.key) {
                // Once per sum; the session's wrong flash follows.
                live.current = { ...st, missedKey: st.key, phase: 'wrong' };
                st.onMiss();
            }
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    // A mistake (a wrong present or a miss): the machine jolts. A right present takes off for the crate.
    useEffect(() => {
        const offWrong = events.on('wrong', () => { if (!live.current.reducedMotion) replay(machine.current, 'spel-shake'); });
        const offRight = events.on('correct', () => {
            const from = launch.current;
            launch.current = null;
            if (from && from.key === live.current.key && !live.current.reducedMotion) setFlyer(from);
        });
        return () => { offWrong(); offRight(); };
    }, [events]);

    // Too much pressure: the machine sputters for a moment, then the round ends.
    useEffect(() => {
        if (!sputter) return;
        const id = window.setTimeout(() => live.current.onFail(), SPUTTER_MS);
        return () => window.clearTimeout(id);
    }, [sputter]);

    // The flight is over: the present is in the crate.
    useEffect(() => {
        if (!flyer) return;
        const id = window.setTimeout(() => setFlyer(f => (f === flyer ? null : f)), reducedMotion ? 0 : FLY_MS);
        return () => window.clearTimeout(id);
    }, [flyer, reducedMotion]);

    const pick = (i: number) => {
        if (phase !== 'play' || !question || options[i] === undefined) return;
        setPicked({ key: question.key, index: i });
        const p = parcels.current[i]?.getBoundingClientRect();
        const box = root.current?.getBoundingClientRect();
        const c = crate.current?.getBoundingClientRect();
        launch.current = p && box ? {
            key: question.key, look: looks[i], value: options[i], view: views?.[i],
            left: p.left - box.left, top: p.top - box.top, size: p.width,
            dx: c ? c.left + c.width / 2 - (p.left + p.width / 2) : box.right - 80 - p.right,
            dy: c ? c.top + c.height / 2 - (p.top + p.height / 2) : box.bottom - 60 - p.bottom,
        } : null;
        onAnswer(options[i]);
    };
    const pickRef = useRef(pick);
    useLayoutEffect(() => { pickRef.current = pick; });

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            const i = ['1', '2', '3', '4'].indexOf(e.key);
            if (i >= 0) { e.preventDefault(); pickRef.current(i); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (!question) return <div className="pk-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    // Presents in the crate: the one still flying lands when its flight ends.
    const pile = Math.max(0, progress.right - (flyer ? 1 : 0));
    const moving = phase === 'play' && !reducedMotion;

    return (
        <div ref={root} className={`pk-root is-${mood}${views ? ' has-pictures' : ''}${pictureClass(views)}${moving ? ' is-moving' : ''}${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${sputter ? ' is-sputter' : ''}`}>
            <div className="pk-wall" aria-hidden>
                <span className="pk-pipe" />
                <Gear className="pk-gear is-big" />
                <Gear className="pk-gear is-small" />
                <span className="pk-cord is-a" /><Lamp className="pk-hanging is-a" />
                <span className="pk-cord is-b" /><Lamp className="pk-hanging is-b" />
            </div>
            <div className="pk-floor" aria-hidden />

            <div className="pk-top">
                <p className={`pk-sign kiosk-math${flash ? ' is-solved' : ''}${signClass(question)}`} aria-live="polite">
                    <SpelSign question={question} feedback={feedback} flash={flash} choices={options} views={views} answerClassName="pk-sign-answer" />
                </p>
            </div>

            {/* The feed pipe drops toys into the machine's hopper. */}
            <span className="pk-feed" aria-hidden>
                {!reducedMotion && !sputter && TOYS.slice(0, 3).map((t, k) => <span key={t} className="pk-feed-toy" style={{ '--k': k } as CSSProperties}><ToyArt kind={TOYS[(k * 2 + progress.answered) % TOYS.length]} /></span>)}
            </span>
            <div ref={machine} className="pk-machine" aria-hidden>
                <div className="pk-machine-rattle">
                    <MachineHead className="pk-head-art" pressure={pressure} mood={mood} />
                    <div className="pk-mbody"><span className="pk-door" /></div>
                    {(mood === 'warm' || mood === 'high') && !reducedMotion && <span className="pk-valve-puff"><span /><span /></span>}
                </div>
                {progress.mistakes > 0 && <Burst key={`steam-${progress.mistakes}`} kind="smoke" x="84%" y="calc(var(--pk-mw) * .02)" spread={46} count={7} seed={progress.mistakes} reducedMotion={reducedMotion} />}
            </div>

            <div className="pk-line">
                <div ref={field} className="pk-field" role="group" aria-label="Kies het antwoord">
                    {options.map((c, i) => {
                        const state = pickedNow?.index === i ? (phase === 'right' ? ' is-down' : phase === 'wrong' ? ' is-bounce' : '')
                            : flash && i === answerIdx && !feedback?.correct ? (missed ? ' is-missed' : ' is-answer')
                            : flash ? ' is-rest' : '';
                        return (
                            <div key={`${question.key}-${i}`} ref={el => { parcels.current[i] = el; }} className={`pk-slot${state}`}>
                                <div className="pk-hop" style={{ '--i': i } as CSSProperties}>
                                    <button type="button" className="pk-parcel" disabled={phase !== 'play'} aria-label={choiceLabel(c, views?.[i])}
                                        // A moving target: the tap counts where the finger lands.
                                        onPointerDown={e => { if (e.button === 0) pick(i); }}
                                        onClick={() => pick(i)}>
                                        <Present look={looks[i]} uid={`${uid}-${i}`} value={c} view={views?.[i]} stamped={reducedMotion && state === ' is-down'} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className={`pk-belt${moving ? ' is-running' : ''}`} aria-hidden>
                    {Array.from({ length: 9 }, (_, r) => <span key={r} className="pk-roller" />)}
                </div>
                {[30, 80].map(x => <span key={x} className="pk-post" style={{ left: `${x}%` }} aria-hidden />)}
            </div>

            {/* Presents already made, waiting on the floor (no labels: only the belt's presents are answers). */}
            <div className="pk-stack" aria-hidden>
                {STACK.map((l, k) => <PresentArt key={k} look={l} uid={`${uid}-stack-${k}`} className={`is-${k}`} />)}
            </div>
            <Bin className="pk-bin-art" />
            <RobotArm key={`arm-${pile}`} className={`pk-robot-art${pile > 0 ? ' is-cheer' : ''}`} />
            <div key={`crate-${pile}`} className={`pk-crate${pile > 0 ? ' is-bump' : ''}`} aria-hidden>
                <CrateBack pile={pile} />
                <span ref={crate} className="pk-crate-mouth" />
                <CrateFront className="pk-crate-front-art" />
                {pile > 0 && !reducedMotion && <Burst kind="sparkle" x="50%" y="30%" spread={70} count={9} seed={pile} />}
            </div>
            {flyer && (
                <div key={flyer.key} className="pk-flyer" style={{ left: flyer.left, top: flyer.top, width: flyer.size, height: flyer.size, '--dx': `${flyer.dx}px`, '--dy': `${flyer.dy}px` } as CSSProperties} aria-hidden>
                    <Present look={flyer.look} uid={`${uid}-fly`} value={flyer.value} view={flyer.view} stamped />
                </div>
            )}

            {sputter && (
                <div className="pk-pops" aria-hidden>
                    <Burst kind="smoke" x={HOPPER_X} y={HOPPER_Y} spread={110} count={12} seed={11} reducedMotion={reducedMotion} />
                    <Burst kind="pieces" x={HOPPER_X} y={HOPPER_Y} spread={140} count={16} seed={5} reducedMotion={reducedMotion} />
                    {POPS.map(([x, y, r], k) => (
                        <span key={k} className="pk-pop-toy" style={{ '--tx': x, '--ty': y, '--tr': `${r}deg`, '--k': k } as CSSProperties}>
                            <ToyArt kind={TOYS[k % TOYS.length]} />
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

// The end screen's picture: the machine sputtered (steam, toys on the floor, dizzy eyes) or a full crate.
export function FabriekEnding({ outcome, reducedMotion }: SkinEndingProps) {
    const failed = outcome === 'failed';
    const looks = presentLooks('ending', 4);
    return (
        <div className={`spel-ending pk-ending${failed ? ' is-failed' : ' is-done'}${reducedMotion ? ' is-still' : ''}`}>
            <svg viewBox="0 0 560 240" preserveAspectRatio="xMidYMax meet" aria-hidden>
                <rect className="pk-end-wall" x="-400" y="-100" width="1360" height="300" />
                <rect className="pk-end-floor" x="-400" y="196" width="1360" height="200" />
                {failed ? <>
                    <g className="pk-end-machine"><MachineHead x={70} y={36} width={150} height={150} pressure={PRESSURE.max} mood="burst" /></g>
                    <rect className="pk-end-body" x={70} y={185} width={150} height={20} />
                    {[[120, 30, 26], [160, 14, 20], [200, 34, 16]].map(([cx, cy, r], k) => <circle key={k} className="pk-end-steam" cx={cx} cy={cy} r={r} style={{ '--k': k } as CSSProperties} />)}
                    {[[250, 168, 'teddy', -20], [300, 180, 'ball', 0], [352, 172, 'duck', 15], [404, 182, 'car', -8], [450, 166, 'rocket', 70], [40, 176, 'block', 12], [496, 178, 'teddy', 160]].map(([x, y, kind, r], k) => (
                        <g key={k} transform={`rotate(${r} ${Number(x) + 18} ${Number(y) + 18})`}><ToyArt kind={kind as typeof TOYS[number]} x={Number(x)} y={Number(y)} width={36} height={36} /></g>
                    ))}
                </> : <>
                    <g className="pk-end-machine"><MachineHead x={50} y={36} width={150} height={150} pressure={0} mood="happy" /></g>
                    <rect className="pk-end-body" x={50} y={185} width={150} height={20} />
                    <CrateBack x={280} y={70} width={190} height={152} pile={8} />
                    {looks.map((l, k) => <PresentArt key={k} look={l} uid={`end-${k}`} x={300 + k * 36} y={66 + (k % 2) * 8} width={40} height={40} />)}
                    <CrateFront x={280} y={70} width={190} height={152} />
                </>}
            </svg>
        </div>
    );
}
