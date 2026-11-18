import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import SpelKeypad from '../../SpelKeypad';
import { Burst } from '../../scene';
import type { SkinEndingProps, SkinProps } from '../types';
import {
    BASE_FRONT_BUSH, CATCHABLE, FISH_SCALE, CATCH_MS, CLASS_OF, ENTER_MS, GLASS, NOSE_AT, PAW_AT, SAND_Y, SCHOOL, SPOT_OF, TANK_GOAL, TAP_MS, VIEW_H, VIEW_W, WATER_TOP,
    crawlAt, entryX, facing, hideBlend, hideSpots, isJackpot, orderFor, pathFor, shownOf, startTank, stepTank, swimAt, tapBlend,
    type ItemKind, type SwimPath, type TankState,
} from './tank';
import { Bubbles, CatArt, FrontBush, NappingCat, Room, StandArt, SwimmerArt, TankBack, TankFront, type CatAct } from './art';
import { playAquarium, type AquariumSound } from './sounds';
import './aquarium.css';

// Aquarium: the calm summer game. A tank on a cabinet in a cosy room; each right answer drops the next fish, plant or
// decoration in (tank.ts), and a fish taps the glass so the hungry cat beside it jumps back. A mistake: the cat's paw
// reaches into the water and a fish hides behind a plant; two in a row and the cat scoops the newest fish out and trots
// off with it (one off the climb, onSetback). One round in 10 ends on a rare white goldfish. The fish swim on seeded
// paths in game time (a rAF loop moves them through refs), so React renders only when the tank or an act changes.

// The round's draw; the end screen draws the tank as it was left (the same chunk).
let lastTank: { order: ItemKind[]; shown: number[] } | null = null;

const JACKPOT_TITLE = 'Een zeldzame witte goudvis!';
// When the cat's CSS acts end (aquarium.css: the startle starts at the tap, 1000 ms, and lasts 1300 ms; the reach 1500 ms).
const STARTLE_DONE_MS = 2400;
const REACH_DONE_MS = 1600;

// Dev builds: ?aquarium=<seed> a fixed round (screenshots, tests: no white goldfish), ?goudvis=wit forces the white goldfish.
function devRound(): { seed?: number; jackpot?: boolean } {
    if (!import.meta.env.DEV || typeof location === 'undefined') return {};
    const q = new URLSearchParams(location.search);
    const seed = Number(q.get('aquarium'));
    const fixed = Number.isFinite(seed) && seed > 0;
    const white = q.get('goudvis') === 'wit';
    return { ...(fixed && { seed }), ...((fixed || white) && { jackpot: white }) };
}

const pctX = (x: number) => `${(x / VIEW_W) * 100}%`;
const pctY = (y: number) => `${(y / VIEW_H) * 100}%`;
const ease = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// What the fish do now: tap the glass (a right answer), hide (a mistake), or get scooped (the catch).
export interface FishAct { n: number; type: 'tap' | 'hide' | 'catch'; pos: number | null }
interface CatState { n: number; act: CatAct; fish: ItemKind | null }

interface SceneProps {
    order: readonly ItemKind[];
    // Positions in the tank, and those that just went in (they drop or swim in).
    shown: readonly number[];
    added?: readonly number[];
    seed: number;
    act?: FishAct | null;
    cat?: CatState;
    // A fish on its way up to the paw (still in the tank until it is scooped).
    lifted?: number | null;
    paused?: boolean;
    ending?: boolean;
}

type Pt = { x: number; y: number };

interface Swimmer { key: string; pos: number; kind: ItemKind; path: SwimPath; lag: number; dx: number; dy: number }

/** The room and the living tank; the cat beside it (asleep on the end screen). */
export function AquaScene({ order, shown, added = [], seed, act = null, cat = { n: 0, act: 'idle', fish: null }, lifted = null, paused = false, ending = false }: SceneProps) {
    const clip = `aq${useId().replace(/:/g, '')}`;
    const inTank = useMemo(() => (lifted !== null && !shown.includes(lifted) ? [...shown, lifted] : [...shown]), [shown, lifted]);
    const items = inTank.map(pos => ({ pos, kind: order[pos] }));
    const swimmers = useMemo(() => inTank.flatMap((pos): Swimmer[] => {
        const kind = order[pos];
        const path = pathFor(kind, seed + pos);
        if (!path) return [];
        if (kind === 'neons') return SCHOOL.map((s, i) => ({ key: `${pos}-${i}`, pos, kind, path, ...s }));
        return [{ key: `${pos}`, pos, kind, path, lag: 0, dx: 0, dy: 0 }];
    }), [inTank, order, seed]);
    const hiding = useMemo(() => hideSpots(inTank.map(p => order[p])), [inTank, order]);

    const els = useRef(new Map<string, SVGGElement>());
    const pupils = useRef<SVGGElement | null>(null);
    const head = useRef<SVGGElement | null>(null);
    const clock = useRef(0);
    const born = useRef(new Map<number, number>());
    const actAt = useRef<{ n: number; at: number }>({ n: -1, at: 0 });
    const live = useRef({ swimmers, act, paused, hiding, lifted });
    useLayoutEffect(() => { live.current = { swimmers, act, paused, hiding, lifted }; });

    // A new swimmer enters from the surface where it splashed in.
    useLayoutEffect(() => {
        for (const pos of added) {
            if (pathFor(order[pos], seed + pos)) born.current.set(pos, clock.current);
        }
    }, [added, order, seed]);

    useEffect(() => {
        let raf = 0;
        let last: number | null = null;
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            // A long gap (a hidden tab) never jumps the fish.
            const dt = last === null ? 0 : Math.min(100, Math.max(0, now - last));
            last = now;
            const L = live.current;
            if (!L.paused) clock.current += dt;
            const ms = clock.current;
            if (L.act && L.act.n !== actAt.current.n) actAt.current = { n: L.act.n, at: ms };
            const since = L.act ? ms - actAt.current.at : Infinity;
            const seen: { watch: Pt | null; first: Pt | null } = { watch: null, first: null };
            const turn = Math.floor(ms / 4200);
            L.swimmers.forEach((s, i) => {
                const el = els.current.get(s.key);
                if (!el) return;
                const crawler = CLASS_OF[s.kind] === 'crawler';
                const t = ms / 1000 - s.lag;
                const p = crawler ? crawlAt(s.path, t) : swimAt(s.path, t);
                let x = p.x + s.dx;
                let y = p.y + s.dy;
                let face = facing(p.vx);
                const b = born.current.get(s.pos);
                if (b !== undefined && ms - b < ENTER_MS) {
                    const k = ease((ms - b) / ENTER_MS);
                    x = lerp(entryX(s.path) + s.dx, x, k);
                    y = lerp(WATER_TOP - 12 + s.dy, y, k);
                }
                if (L.act && L.act.pos === s.pos) {
                    if (L.act.type === 'hide') {
                        const k = hideBlend(since);
                        const spot = L.hiding.reduce((a, h) => (Math.abs(h - x) < Math.abs(a - x) ? h : a), L.hiding[0]);
                        x = lerp(x, spot + s.dx * 0.4, k);
                        y = lerp(y, SAND_Y - 14 + s.dy * 0.4, k);
                        if (k > 0.05 && k < 1) face = Math.sign(spot - x) || face;
                    } else if (L.act.type === 'tap') {
                        const k = tapBlend(since);
                        x = lerp(x, NOSE_AT.x - s.path.size / 2 - 1, k);
                        y = lerp(y, NOSE_AT.y, k);
                        face = lerp(face, 1, Math.min(1, k * 3));
                    } else if (L.act.type === 'catch' && L.lifted === s.pos) {
                        const k = ease(since / CATCH_MS.up);
                        x = lerp(x, PAW_AT.x - 4, k);
                        y = lerp(y, PAW_AT.y + 6, k);
                        face = lerp(face, 1, k);
                    }
                    seen.watch = { x, y };
                }
                // The puffer and the crab never turn their faces flat: they keep a little width through the turn.
                const sx = s.kind === 'krab' ? 1 : s.kind === 'zeepaardje' ? (face < 0 ? -1 : 1) : Math.abs(face) < 0.12 ? 0.12 * (face < 0 ? -1 : 1) : face;
                const tilt = crawler || s.kind === 'zeepaardje' ? 0 : Math.max(-22, Math.min(22, (Math.atan2(p.vy, Math.abs(p.vx) + 3) * 180) / Math.PI)) * (sx < 0 ? -1 : 1);
                el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt.toFixed(1)}) scale(${sx.toFixed(3)} 1)`);
                if (CATCHABLE.has(s.kind) || s.kind === 'witteGoudvis') {
                    const pick = turn % Math.max(1, L.swimmers.length);
                    if (i === pick || !seen.first) seen.first = { x, y };
                }
            });
            // The cat watches the fish of the moment, else one it picks every few seconds.
            const look = seen.watch ?? seen.first;
            if (pupils.current) {
                const dx = look ? Math.max(-2.4, Math.min(1.2, (look.x - 304) / 30)) : -1;
                const dy = look ? Math.max(-1.8, Math.min(1.8, (look.y - 146) / 24)) : 0;
                pupils.current.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
            }
            if (head.current) {
                const deg = look ? Math.max(-8, Math.min(10, (look.y - 146) / 5)) : 0;
                head.current.setAttribute('transform', `rotate(${deg.toFixed(1)} -12 -44)`);
            }
        };
        raf = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf);
    }, []);

    const stands = items.filter(it => SPOT_OF[it.kind]);
    const back = stands.filter(it => !SPOT_OF[it.kind]!.front);
    const front = stands.filter(it => SPOT_OF[it.kind]!.front);
    const isNew = (pos: number) => added.includes(pos);
    const stand = (it: { pos: number; kind: ItemKind }) => (
        <g key={it.pos} transform={`translate(${SPOT_OF[it.kind]!.x} ${SAND_Y + 3})`} className={`aq-stand${isNew(it.pos) ? ' is-new' : ''}`}>
            <g className="aq-drop" style={{ '--drop': `${SAND_Y - 40}px` } as CSSProperties}><StandArt kind={it.kind} /></g>
            {isNew(it.pos) && <ellipse className="aq-sand-puff" cx="0" cy="0" rx="14" ry="4" />}
        </g>
    );
    const catchN = cat.act === 'catch' ? cat.n : null;
    const view = ending ? '36 86 344 148' : `0 0 ${VIEW_W} ${VIEW_H}`;
    const svg = (
        <svg className="aq-svg" viewBox={view} preserveAspectRatio={ending ? 'xMidYMid slice' : undefined} aria-hidden>
            <Room clip={clip} />
            <TankBack clip={clip} />
            <g clipPath={`url(#${clip}-tank-clip)`}>
                {back.map(stand)}
                {swimmers.map(s => (
                    <g key={s.key} ref={el => { if (el) els.current.set(s.key, el); else els.current.delete(s.key); }}
                        className={`aq-swimmer is-${s.kind}${isNew(s.pos) ? ' is-new' : ''}`} style={{ '--d': `${-((s.pos * 1.7 + s.lag) % 9)}s` } as CSSProperties}
                        transform={`translate(${s.path.cx} ${s.path.cy})`}>
                        <g className="aq-swim-scale" transform={`scale(${FISH_SCALE})`}><SwimmerArt kind={s.kind} /></g>
                    </g>
                ))}
                <g transform={`translate(${BASE_FRONT_BUSH} ${SAND_Y + 6})`}><FrontBush /></g>
                {front.map(stand)}
                {catchN !== null && <g key={catchN} className="aq-catch-bubbles"><Bubbles x={PAW_AT.x - 2} y={PAW_AT.y + 26} n={6} cls="aq-burst-bubbles" /></g>}
            </g>
            <TankFront clip={clip} />
            <g transform="translate(330 222) scale(1.25)">
                {ending ? <NappingCat /> : (
                    <g key={`${cat.act}-${cat.n}`} className={`aq-cat is-${cat.act}`}>
                        <CatArt act={cat.act} fish={cat.fish} pupils={el => { pupils.current = el; }} head={el => { head.current = el; }} />
                        {cat.act === 'startle' && <path className="aq-cat-bang" d="M-4 -98 L-2 -88 L0 -98 Z M-2 -84.6 a1.4 1.4 0 1 0 0.1 0" />}
                    </g>
                )}
            </g>
        </svg>
    );
    if (ending) return svg;
    return (
        <div className="aq-scene">
            <div className="aq-stage">
                {svg}
                {added.map(pos => {
                    const kind = order[pos];
                    const path = pathFor(kind, seed + pos);
                    const x = SPOT_OF[kind]?.x ?? (path ? entryX(path) : (GLASS.x0 + GLASS.x1) / 2);
                    const white = kind === 'witteGoudvis';
                    return (
                        <span key={`${pos}-${added.join('.')}`}>
                            <Burst kind="splash" x={pctX(x)} y={pctY(WATER_TOP)} spread={white ? 60 : 40} count={white ? 12 : 8} seed={pos + 5} />
                            {white && <Burst kind="sparkle" x={pctX(x)} y={pctY(WATER_TOP + 30)} spread={140} count={18} seed={pos + 9} />}
                        </span>
                    );
                })}
                {cat.act === 'reach' && <Burst key={`r${cat.n}`} kind="splash" className="aq-dip-splash" x={pctX(PAW_AT.x)} y={pctY(WATER_TOP)} spread={30} count={6} seed={cat.n + 4} />}
                {catchN !== null && (
                    <span key={`s${catchN}`}>
                        <Burst kind="splash" className="aq-scoop-splash" x={pctX(PAW_AT.x)} y={pctY(WATER_TOP)} spread={44} count={9} seed={catchN + 2} />
                        <span className="aq-nom" style={{ left: pctX(VIEW_W - 30), top: pctY(180) }}>Nom nom!</span>
                    </span>
                )}
            </div>
        </div>
    );
}

// The act's fish: a right answer sends a single swimmer to the glass (not one still swimming in), a mistake scares the newest.
function tapFish(order: readonly ItemKind[], s: TankState): number | null {
    const free = shownOf(s).filter(p => (CATCHABLE.has(order[p]) || order[p] === 'witteGoudvis') && !s.added.includes(p));
    return free.length ? free[(s.right * 7) % free.length] : null;
}
function hideFish(order: readonly ItemKind[], s: TankState): number | null {
    const free = shownOf(s).filter(p => CATCHABLE.has(order[p]) || order[p] === 'neons');
    return free.length ? free[free.length - 1] : null;
}

export default function Aquarium({ question, phase, feedback, onAnswer, progress, onReport, onSetback }: SkinProps) {
    const [round] = useState(() => {
        const dev = devRound();
        const seed = dev.seed ?? Math.floor(Math.random() * 2 ** 31);
        const jackpot = dev.jackpot ?? isJackpot(Math.random());
        return { seed, order: orderFor(seed, jackpot) };
    });
    const count = progress.goal?.count ?? progress.right;
    const counters = { count, right: progress.right, mistakes: progress.mistakes };
    const [tank, setTank] = useState(() => startTank(count, progress.right, progress.mistakes));
    const next = stepTank(tank, round.order, counters);
    if (next !== tank) setTank(next);
    const shown = useMemo(() => shownOf(tank), [tank]);

    const [act, setAct] = useState<FishAct | null>(null);
    const [cat, setCat] = useState<CatState>({ n: 0, act: 'idle', fish: null });
    const [lifted, setLifted] = useState<number | null>(null);
    const catBusy = useRef(0);
    const timers = useRef<number[]>([]);
    useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)); }, []);
    const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
    const voice = (ms: number, name: AquariumSound) => later(ms, () => playAquarium(name));
    // The cat sits back at ease once its act is over (unless a newer act took over).
    const settle = (n: number, ms: number) => later(ms, () => setCat(k => (k.n === n ? { n: n + 0.5, act: 'idle', fish: null } : k)));

    const live = useRef({ onSetback, onReport });
    useLayoutEffect(() => { live.current = { onSetback, onReport }; });
    useEffect(() => { lastTank = { order: round.order, shown }; }, [round, shown]);

    // The moments: compare the tank with the one before (counted answers only move it).
    const prev = useRef(tank);
    useEffect(() => {
        const was = prev.current;
        prev.current = tank;
        if (tank === was) return;
        const now = performance.now();
        const catFree = now >= catBusy.current;
        const n = (act?.n ?? 0) + 1;
        if (tank.right < was.right || tank.mistakes < was.mistakes) { setAct(null); setLifted(null); setCat({ n, act: 'idle', fish: null }); return; }
        if (tank.right > was.right) {
            const pos = tapFish(round.order, tank);
            setAct({ n, type: 'tap', pos });
            const white = tank.added.some(p => round.order[p] === 'witteGoudvis');
            voice(140, white ? 'glitter' : 'plons');
            // No fish free to tap yet (the first one is still swimming in): the cat just watches it come.
            if (pos !== null) voice(TAP_MS.tap, 'tik');
            if (pos !== null && catFree) { setCat({ n, act: 'startle', fish: null }); voice(TAP_MS.tap + 90, 'mrrp'); settle(n, STARTLE_DONE_MS); }
            if (white) live.current.onReport?.({ title: JACKPOT_TITLE });
            return;
        }
        if (tank.caught.length > was.caught.length) {
            const c = tank.caught[tank.caught.length - 1];
            setAct({ n, type: 'catch', pos: c.pos });
            setLifted(c.pos);
            setCat({ n, act: 'catch', fish: c.kind });
            catBusy.current = now + CATCH_MS.done;
            live.current.onSetback?.();
            later(CATCH_MS.scoop, () => setLifted(l => (l === c.pos ? null : l)));
            settle(n, CATCH_MS.done);
            voice(480, 'swish');
            voice(CATCH_MS.scoop, 'plons');
            voice(CATCH_MS.nom, 'nomnom');
            voice(CATCH_MS.back + 500, 'mlem');
            return;
        }
        if (tank.mistakes > was.mistakes) {
            setAct({ n, type: 'hide', pos: hideFish(round.order, tank) });
            if (catFree) { setCat({ n, act: 'reach', fish: null }); voice(420, 'swish'); settle(n, REACH_DONE_MS); }
            voice(520, 'blub');
        }
        // `act` is read for its counter only; the moments follow the tank.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tank]);

    if (!question) return <div className="aq-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    return (
        <div className={`aq-root${phase === 'help' ? ' is-paused' : ''}`}>
            <div className="aq-world">
                <AquaScene order={round.order} shown={shown} added={tank.added} seed={round.seed} act={act} cat={cat} lifted={lifted} paused={phase === 'help'} />
            </div>
            <div className="aq-panel">
                <SpelSignBox className={`aq-sign${flash ? ' is-solved' : ''}`} question={question} feedback={feedback} flash={flash} answerClassName="aq-sign-answer" />
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

/** The end screen: the tank as it was left, still swimming, and the cat that gave up and naps. */
export function AquariumEnding({ progress }: SkinEndingProps) {
    const [tank] = useState(() => {
        if (lastTank) return lastTank;
        const order = orderFor(1, false);
        return { order, shown: Array.from({ length: Math.min(TANK_GOAL, progress.goal?.count ?? progress.right) }, (_, i) => i) };
    });
    return (
        <div className="spel-ending aq-ending">
            <AquaScene order={tank.order} shown={tank.shown} seed={7} ending />
        </div>
    );
}
