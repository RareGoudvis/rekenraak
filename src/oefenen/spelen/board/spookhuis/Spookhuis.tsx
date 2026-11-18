import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { SkinEndingProps, SkinProps } from '../../skins/types';
import { mulberry32, seedOf } from '../../distractors';
import { answerFace, cardLines, isLoneBreuk, isWordCard, lineChars, sumFace, type BoardFace, type SpelBoard } from '../board';
import { cardLook, gridOf } from '../hartjes/hearts';
import { SpelText, SpelVisual } from '../../SpelVisual';
import { Burst } from '../../scene';
import {
    beamAt, beamRadius, flightOf, roomOf, flipperVisit, loneCard, tiltOf, FLIP_BACK_MS, FLIPPER_FLIGHT_MS, FLIPPER_TURN_MS, MISTAKE_FLIP_BACK_MS,
    MISTAKE_MS, PAIR_HIT_MS, PAIR_MOMENT_MS, PAIR_TAIL_MS, SWEEP_PX, FLOOR_DARK, ROOM_DARK, type Pt,
} from './haunt';
import { THEMES, type SpookTheme, type ThemeInfo } from './themes';
import { nextTheme, readLastTheme } from './pick';
import { playSpook } from './sounds';
import { BeamContext, BeamStore } from './art/beam';
import type { ThemeArt } from './art/types';
import { ART } from './art';
import './spookhuis.css';

// Spookhuis: Hartjes koppelen's memory (the same board round, session checks and strikes, board/session.ts) on the floor
// of a dark haunted place: the cards are almost invisible and a soft flashlight follows the pointer (on a finger it
// shines a little above it, and stays where the finger was; a focused card is lit for the keyboard). A turned card
// lights up by itself. Now and then the place's visitor (a friendly ghost, a zombie, a ghost pirate) comes by and
// turns a lone open card back: never a mistake. A pair flies together and the visitor pops out; a logged mistake
// turns the sum's card into a pumpkin, a brain jelly or a rusty anchor for a moment. A cleared board turns the
// lights on; the last one brings the whole crowd out. One of three places per round (pick.ts), the look only.

// The flipper's clock ticks this often (play time only, so "Hoe los ik dit op?" stops it).
const TICK_MS = 100;
// Before the pupil moves the light, it sweeps slowly over the cards by itself (a hint that it can move): one loop.
const IDLE_LOOP_MS = 9000;
// The room's cheer after a pair (ms): about the pair moment's visitor; SYNC: art/<theme>.css .is-cheer-N animations.
const CHEER_MS = 1800;

// A card = one side of one sum: id = cell * 2 (the sum) or cell * 2 + 1 (its answer). SYNC: board/hartjes/Hartjes.tsx.
const cellOf = (id: number) => id >> 1;
const isSum = (id: number) => id % 2 === 0;

function shuffled(n: number, key: string): number[] {
    const rng = mulberry32(seedOf(key));
    const out = Array.from({ length: n }, (_, i) => i);
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// A keyboard focus (not a tap) lights the card; an engine without :focus-visible lights nothing.
const focusVisible = (el: Element) => { try { return el.matches(':focus-visible'); } catch { return false; } };
const faceText = (face: BoardFace) => (face.kind === 'text' ? face.text : face.label);
const px = (v: number) => `${Math.round(v)}px`;
const centreIn = (el: Element, box: DOMRect): Pt => { const r = el.getBoundingClientRect(); return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }; };

function Face({ face }: { face: BoardFace }) {
    if (face.kind === 'picture') return <span className={`sph-pic is-${face.visual.kind}`}><SpelVisual visual={face.visual} /></span>;
    return <span className={`sph-text kiosk-math${isLoneBreuk(face.text) ? ' is-breuk' : ''}${isWordCard(face.text) ? ' is-words' : ''}`}>{cardLines(face.text).map((l, i) => <span key={i} className="sph-line"><SpelText text={l} /></span>)}</span>;
}

function CardFront({ solved }: { solved: boolean }) {
    return (
        <svg className="sph-face-art" viewBox="0 0 100 86" preserveAspectRatio="none" aria-hidden>
            <rect className={`sph-face-paper${solved ? ' is-solved' : ''}`} x={3} y={3} width={94} height={80} rx={9} />
            <path className="sph-face-corner" d="M8 20 Q8 8 20 8 M80 8 Q92 8 92 20 M92 66 Q92 78 80 78 M20 78 Q8 78 8 66" />
        </svg>
    );
}

interface CardProps { id: number; board: SpelBoard; art: ThemeArt; theme: ThemeInfo; up: boolean; nope: boolean; merging: boolean; mistake: boolean; tilt: number; disabled: boolean; onTap(): void; onFocusCard(el: HTMLElement): void }

function Card({ id, board, art, theme, up, nope, merging, mistake, tilt, disabled, onTap, onFocusCard }: CardProps) {
    const cell = board.cells[cellOf(id)];
    const q = cell.question;
    const solved = cell.state === 'solved';
    const open = up || solved;
    const face = isSum(id) ? sumFace(q) : answerFace(q);
    // Once turned up, a closed card plays its turn back (a fresh board's cards never do).
    const [wasOpen, setWasOpen] = useState(open);
    if (open && !wasOpen) setWasOpen(true);
    const label = solved ? `${faceText(sumFace(q))} is ${faceText(answerFace(q))}, gevonden` : open ? faceText(face) : theme.closed;
    const Back = art.CardBack;
    return (
        <button type="button" className={`sph-card${open ? ' is-open' : wasOpen ? ' is-shut' : ''}${solved ? ' is-solved' : ''}${isSum(id) ? ' is-sum' : ' is-answer'}${nope ? ' is-nope' : ''}${merging ? ' is-merging' : ''}${mistake ? ' is-mistake' : ''}`}
            style={{ '--tilt': `${tilt}deg` } as CSSProperties} onClick={onTap} disabled={disabled || open} aria-label={label} data-cell={cellOf(id)}
            onFocus={e => { if (focusVisible(e.currentTarget)) onFocusCard(e.currentTarget); }}>
            {/* The poof behind the card, so it puffs out around the picture. */}
            {mistake && <Burst kind="smoke" x="50%" y="50%" spread={95} count={9} seed={id + 11} />}
            <span className="sph-flip">
                <span className="sph-side sph-back" aria-hidden><svg className="sph-back-art" viewBox="0 0 100 86" preserveAspectRatio="none"><Back /></svg></span>
                <span className="sph-side sph-front" aria-hidden>
                    <CardFront solved={solved} />
                    <Face face={face} />
                    {/* A glint sweeps the face as it lands. */}
                    <span className="sph-shine" />
                    {mistake && <span className="sph-mistake"><art.Mistake /></span>}
                </span>
            </span>
        </button>
    );
}

// The face a flying card carries in the pair moment.
function FlyCard({ id, board, side }: { id: number; board: SpelBoard; side: 'a' | 'b' }) {
    const q = board.cells[cellOf(id)].question;
    return (
        <span className={`sph-fly is-${side}`}>
            <span className="sph-card is-open is-solved"><span className="sph-fly-face"><CardFront solved /><Face face={isSum(id) ? sumFace(q) : answerFace(q)} /></span></span>
        </span>
    );
}

/** A found pair's moment over the board: both cards fly together, a puff, and the place's visitor pops out. Never blocks a tap. */
function PairMoment({ cell, board, art, theme, grid }: { cell: number; board: SpelBoard; art: ThemeArt; theme: ThemeInfo; grid: RefObject<HTMLDivElement | null> }) {
    const ref = useRef<HTMLDivElement>(null);
    const [hit, setHit] = useState(false);
    useLayoutEffect(() => {
        const box = grid.current, el = ref.current;
        const sum = box?.querySelector(`.sph-slot [data-cell="${cell}"].is-sum`), ans = box?.querySelector(`.sph-slot [data-cell="${cell}"].is-answer`);
        if (!box || !el || !sum || !ans) return;
        const o = box.getBoundingClientRect();
        const a = centreIn(sum, o), b = centreIn(ans, o);
        // The visitor pops out where they meet, kept inside the board so it is never cut off.
        const w = sum.getBoundingClientRect().width;
        const mid = { x: Math.max(w * .6, Math.min(o.width - w * .6, (a.x + b.x) / 2)), y: Math.max(w * .75, Math.min(o.height - w * .4, (a.y + b.y) / 2)) };
        const off = (a.x <= b.x ? -1 : 1) * .2 * w;
        const vars: Record<string, number> = { ax: a.x, ay: a.y, bx: b.x, by: b.y, mx: mid.x, my: mid.y, oa: off, ob: -off };
        for (const [k, v] of Object.entries(vars)) el.style.setProperty(`--${k}`, px(v));
    }, [cell, grid]);
    useEffect(() => {
        const t = window.setTimeout(() => { setHit(true); playSpook(theme.pairSound); }, PAIR_HIT_MS);
        return () => window.clearTimeout(t);
    }, [theme]);
    return (
        <div ref={ref} className="sph-moment" aria-hidden>
            <FlyCard id={cell * 2} board={board} side="a" />
            <FlyCard id={cell * 2 + 1} board={board} side="b" />
            {/* The puff where the cards met, behind the visitor; the sparkles fly out around it. */}
            {hit && <Burst kind="smoke" x="var(--mx)" y="calc(var(--my) + var(--sph-w) * .25)" spread={90} count={8} seed={cell + 4} />}
            <span className="sph-pop"><art.Pop /></span>
            {hit && art.popPieces && <Burst kind="pieces" x="var(--mx)" y="calc(var(--my) - var(--sph-w) * .2)" spread={170} count={16} color={art.popPieces === 'confetti' ? undefined : art.popPieces} seed={cell + 7} />}
            {hit && <Burst kind="sparkle" x="var(--mx)" y="calc(var(--my) - var(--sph-w) * .2)" spread={150} count={10} seed={cell + 9} />}
        </div>
    );
}

interface Visit { id: number; trick: boolean; card: number | null; elapsed: number; turned: boolean; style: CSSProperties }

interface BoardProps extends Pick<SkinProps, 'phase' | 'onBoardPick' | 'onBoardFocus' | 'sound'> {
    board: SpelBoard; art: ThemeArt; theme: ThemeInfo; beam: BeamStore; last: boolean;
    moveBeam(p: Pt): void; onLit(lit: boolean): void; onPair(): void; root: RefObject<HTMLDivElement | null>;
}

function SpookBoard({ board, phase, onBoardPick, onBoardFocus, sound, art, theme, beam, last, moveBeam, onLit, onPair, root }: BoardProps) {
    const order = useMemo(() => shuffled(board.cells.length * 2, board.key), [board.key, board.cells.length]);
    const seed = useMemo(() => seedOf(board.key), [board.key]);
    const [up, setUp] = useState<number[]>([]);
    const [flourish, setFlourish] = useState<number | null>(null);
    const [mistake, setMistake] = useState<number | null>(null);
    const [visit, setVisit] = useState<Visit | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const soundRef = useRef(sound);
    useLayoutEffect(() => { soundRef.current = sound; });
    const solved = (id: number) => board.cells[cellOf(id)].state === 'solved';

    // The session's verdict arrives as the board: a newly solved sum stays open and gets its moment (adjusted during render).
    const solvedCount = board.cells.filter(c => c.state === 'solved').length;
    const [seenSolved, setSeenSolved] = useState(solvedCount);
    if (solvedCount !== seenSolved) {
        setSeenSolved(solvedCount);
        setFlourish(board.focus);
        setUp([]);
    }
    // A sum just logged as a mistake: its card turns into the place's mistake picture for a moment.
    const broken = board.cells.filter(c => cardLook(c) !== 'whole').length;
    const [seenBroken, setSeenBroken] = useState(broken);
    if (broken !== seenBroken) {
        setSeenBroken(broken);
        if (broken > seenBroken) setMistake(board.focus);
    }
    useEffect(() => {
        if (mistake === null) return;
        playSpook(theme.mistakeSound);
        const t = window.setTimeout(() => setMistake(null), MISTAKE_MS);
        return () => window.clearTimeout(t);
    }, [mistake, theme]);

    // Two cards up that are no pair turn back after a moment (a little longer after a logged mistake).
    const mistakeRef = useRef(mistake);
    useLayoutEffect(() => { mistakeRef.current = mistake; });
    useEffect(() => {
        if (up.length < 2) return;
        const t = window.setTimeout(() => { setUp([]); soundRef.current('nomatch'); }, mistakeRef.current !== null ? MISTAKE_FLIP_BACK_MS : FLIP_BACK_MS);
        return () => window.clearTimeout(t);
    }, [up]);
    useEffect(() => {
        if (flourish === null) return;
        onPair();
        const t = window.setTimeout(() => setFlourish(null), PAIR_TAIL_MS);
        return () => window.clearTimeout(t);
        // onPair is the root's stable setter wrapper.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flourish]);

    const found = solvedCount;
    const cleared = found === board.cells.length;
    useEffect(() => { onLit(cleared); }, [cleared, onLit]);
    useEffect(() => { if (cleared) playSpook('licht'); }, [cleared]);

    // The flipper's clock: play time since its last visit, how long one card has lain open alone, and its flight.
    const upRef = useRef(up);
    useLayoutEffect(() => { upRef.current = up; });
    const clock = useRef({ since: 0, lone: 0, loneId: null as number | null, visits: 0 });
    // The flight's own clock lives in a ref (ticks may come faster than renders); the state only draws it.
    const visitRef = useRef<Visit | null>(null);
    useEffect(() => {
        if (phase !== 'play' || cleared) return;
        const t = window.setInterval(() => {
            const c = clock.current;
            const v = visitRef.current;
            if (v) {
                const elapsed = v.elapsed + TICK_MS;
                let turned = v.turned;
                if (!turned && elapsed >= FLIPPER_TURN_MS) {
                    turned = true;
                    // The card is turned back only if it still lies open alone (the pupil may have turned its partner).
                    if (v.trick && v.card !== null && loneCard(upRef.current) === v.card) setUp([]);
                    playSpook(theme.flipperSound);
                }
                if (elapsed >= FLIPPER_FLIGHT_MS) { visitRef.current = null; setVisit(null); c.since = 0; return; }
                visitRef.current = { ...v, elapsed, turned };
                if (turned !== v.turned) setVisit(visitRef.current);
                return;
            }
            c.since += TICK_MS;
            const lone = loneCard(upRef.current);
            if (lone !== c.loneId) { c.loneId = lone; c.lone = 0; } else if (lone !== null) c.lone += TICK_MS;
            const call = flipperVisit(c.since, c.lone);
            if (call === 'none') return;
            const box = root.current?.getBoundingClientRect();
            if (!box) return;
            const slot = call === 'trick' ? gridRef.current?.querySelector(`.sph-slot[data-id="${lone}"]`) : null;
            const target = slot ? centreIn(slot, box) : { x: box.width / 2, y: box.height * .4 };
            const size = slot ? slot.getBoundingClientRect().width : Math.min(220, box.width * .16);
            const f = flightOf(target, { w: box.width, h: box.height }, size);
            const style = { '--f0x': px(f.from.x), '--f0y': px(f.from.y), '--f1x': px(f.at.x), '--f1y': px(f.at.y), '--f2x': px(f.to.x), '--f2y': px(f.to.y), '--fs': px(size), '--fdir': f.from.x < f.to.x ? 1 : -1 } as CSSProperties;
            c.visits++;
            visitRef.current = { id: c.visits, trick: call === 'trick', card: call === 'trick' ? lone : null, elapsed: 0, turned: false, style };
            setVisit(visitRef.current);
        }, TICK_MS);
        return () => window.clearInterval(t);
    }, [phase, cleared, root, theme]);

    const tap = (id: number) => {
        if (phase !== 'play' || up.length >= 2 || up.includes(id) || solved(id)) return;
        sound('flip');
        if (isSum(id)) onBoardFocus?.(cellOf(id));
        if (!up.length) { setUp([id]); return; }
        const first = up[0];
        setUp([first, id]);
        // A sum and an answer: the session checks the pair. Only a sum turned first can count as a strike.
        if (isSum(first) !== isSum(id)) {
            const sum = isSum(first) ? first : id;
            const ans = isSum(first) ? id : first;
            onBoardPick?.(cellOf(sum), board.cells[cellOf(ans)].question.answer, isSum(first));
        }
    };
    const focusCard = (el: HTMLElement) => {
        const box = root.current?.getBoundingClientRect();
        if (box) moveBeam(centreIn(el, box));
    };

    // The floor's dark sits over the board, so its light hole needs the board's place in the stage.
    useLayoutEffect(() => {
        // The root's ref is not attached yet while its children's layout effects run: find it from the board.
        const g = gridRef.current, r = g?.closest<HTMLElement>('.sph-root');
        if (!g || !r) return;
        const place = () => {
            const o = r.getBoundingClientRect(), b = g.getBoundingClientRect();
            const gx = b.left - o.left, gy = b.top - o.top;
            g.style.setProperty('--gx', px(gx));
            g.style.setProperty('--gy', px(gy));
            // The cards' own box (layout offsets: the slots' entrance animation scales them): the room's
            // furniture goes in the free sides and the strip above it (art/<theme>.css, data-room).
            const slots = [...g.querySelectorAll<HTMLElement>('.sph-slot')];
            if (!slots.length) return;
            const left = gx + Math.min(...slots.map(s => s.offsetLeft));
            const right = gx + Math.max(...slots.map(s => s.offsetLeft + s.offsetWidth));
            const top = gy + Math.min(...slots.map(s => s.offsetTop));
            const side = Math.max(0, Math.min(left, o.width - right));
            r.style.setProperty('--sph-side', px(side));
            r.style.setProperty('--sph-ctop', px(top));
            r.dataset.room = roomOf(side);
            beam.attach(r);
            beam.resize(beamRadius(slots[0].offsetWidth / 1.08));
        };
        place();
        const ro = new ResizeObserver(place);
        ro.observe(r);
        ro.observe(g);
        return () => ro.disconnect();
    }, [beam]);

    const nope = up.length === 2 && isSum(up[0]) !== isSum(up[1]) && !up.some(solved);
    const chars = Math.max(...board.cells.map(c => { const f = sumFace(c.question); return f.kind === 'text' ? lineChars(cardLines(f.text)) : 1; }));
    // Word answers (Frans: "choisissez") fit their card too, all at one size.
    const answerChars = Math.max(...board.cells.map(c => { const f = answerFace(c.question); return f.kind === 'text' ? lineChars(cardLines(f.text)) : 1; }));
    const pairs = board.cells.some(c => c.question.pair);
    const grid = gridOf(order.length);
    const shape = {
        '--sph-cols-l': grid.landscape.cols, '--sph-rows-l': grid.landscape.rows, '--sph-cols-p': grid.portrait.cols, '--sph-rows-p': grid.portrait.rows,
        '--sph-cols-t': grid.tall.cols, '--sph-rows-t': grid.tall.rows, '--sph-cols-s': grid.short.cols, '--sph-rows-s': grid.short.rows,
        '--sph-chars': chars, '--sph-answer-chars': answerChars, '--sph-moment-ms': `${PAIR_MOMENT_MS}ms`, '--sph-floor-dark': FLOOR_DARK,
    } as CSSProperties;
    const Flipper = art.Flipper;
    return (
        <>
            <div className="sph-top">
                <p className="sph-sign" aria-live="polite">{cleared ? theme.lit : pairs ? 'Zoek wat bij elkaar hoort' : 'Zoek de som en haar antwoord'}</p>
                <span className="sph-count" role="img" aria-label={`${found} van ${board.cells.length} paren`}>
                    {board.cells.map((c, i) => <span key={i} className="sph-mark"><art.Mark on={c.state === 'solved'} /></span>)}
                </span>
            </div>
            <div ref={gridRef} className="sph-grid" style={shape} role="group" aria-label={`Kaarten in ${theme.name.toLowerCase()}`}>
                <div className="sph-floor-dark" aria-hidden />
                {order.map((id, k) => (
                    <div key={id} className={`sph-slot${up.includes(id) || solved(id) ? ' is-up' : ''}`} data-id={id} style={{ '--k': k } as CSSProperties}>
                        <Card id={id} board={board} art={art} theme={theme} up={up.includes(id)} nope={nope && up.includes(id)} merging={flourish === cellOf(id)}
                            mistake={mistake === cellOf(id) && isSum(id) && up.includes(id)} tilt={tiltOf(seed, id)} disabled={phase !== 'play'} onTap={() => tap(id)} onFocusCard={focusCard} />
                    </div>
                ))}
                {flourish !== null && <PairMoment key={flourish} cell={flourish} board={board} art={art} theme={theme} grid={gridRef} />}
            </div>
            {visit && (
                <div key={visit.id} className={`sph-flipper${visit.trick ? ' is-trick' : ''}${visit.turned ? ' is-turned' : ''}`} style={visit.style} aria-hidden>
                    <span className="sph-flipper-turn"><Flipper trick={visit.trick} /></span>
                    {visit.turned && <span className="sph-says">{theme.flipperSays}</span>}
                </div>
            )}
            {cleared && last && <div className="sph-party" aria-hidden><art.Party /></div>}
        </>
    );
}

export default function Spookhuis({ board, phase, onBoardPick, onBoardFocus, sound, progress }: SkinProps) {
    const [theme] = useState<SpookTheme>(() => nextTheme(import.meta.env.DEV && typeof location !== 'undefined' ? new URLSearchParams(location.search).get('spook') : null));
    const art = ART[theme];
    const info = THEMES[theme];
    const rootRef = useRef<HTMLDivElement>(null);
    const [beam] = useState(() => new BeamStore());
    const [lit, setLit] = useState(false);
    // A pair found: the room cheers for a moment (candles flare, portraits grin, ...: art/<theme>.css .is-cheer-N);
    // the count alternates the class so two pairs in a row both play.
    const [cheer, setCheer] = useState(0);
    const [cheering, setCheering] = useState(false);
    useEffect(() => {
        if (!cheer) return;
        const t = window.setTimeout(() => setCheering(false), CHEER_MS);
        return () => window.clearTimeout(t);
    }, [cheer]);
    const onPair = useMemo(() => () => { setCheer(n => n + 1); setCheering(true); }, []);
    // The pupil has not moved the light yet: it sweeps by itself.
    const [idle, setIdle] = useState(true);
    const sweep = useRef<{ id: number | null; x: number; y: number; swept: boolean }>({ id: null, x: 0, y: 0, swept: false });

    const moveBeam = useMemo(() => (p: Pt) => beam.move(p), [beam]);

    useLayoutEffect(() => {
        beam.attach(rootRef.current);
        const r = rootRef.current;
        if (!r) return;
        const b = r.getBoundingClientRect();
        moveBeam({ x: b.width / 2, y: b.height * .55 });
    }, [beam, moveBeam]);

    // The idle sweep: a slow loop over the middle of the cards until the first pointer or key.
    useEffect(() => {
        if (!idle) return;
        let raf = 0;
        const t0 = performance.now();
        const step = (now: number) => {
            const r = rootRef.current;
            if (r && phase === 'play') {
                const b = r.getBoundingClientRect();
                const a = ((now - t0) / IDLE_LOOP_MS) * Math.PI * 2;
                moveBeam({ x: b.width / 2 + Math.sin(a) * b.width * .26, y: b.height * .56 + Math.sin(a * 2) * b.height * .16 });
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [idle, phase, moveBeam]);

    const pointAt = (e: ReactPointerEvent<HTMLDivElement>) => {
        const r = rootRef.current?.getBoundingClientRect();
        if (!r) return;
        setIdle(false);
        moveBeam(beamAt({ x: e.clientX - r.left, y: e.clientY - r.top }, e.pointerType, beam.r));
    };
    const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        sweep.current = { id: e.pointerId, x: e.clientX, y: e.clientY, swept: false };
        pointAt(e);
    };
    const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const s = sweep.current;
        if (s.id === e.pointerId && Math.hypot(e.clientX - s.x, e.clientY - s.y) > SWEEP_PX) s.swept = true;
        // A finger only moves the light while it touches; a mouse or pen moves it on hover too.
        if (e.pointerType !== 'touch' || s.id === e.pointerId) pointAt(e);
    };
    const onUp = (e: ReactPointerEvent<HTMLDivElement>) => { if (sweep.current.id === e.pointerId) sweep.current.id = null; };

    const last = !!progress.board && progress.board.index >= progress.board.total - 1;
    const roomStyle = { '--sph-room-dark': ROOM_DARK, '--sph-flight-ms': `${FLIPPER_FLIGHT_MS}ms`, '--sph-mistake-ms': `${MISTAKE_MS}ms` } as CSSProperties;
    return (
        <BeamContext.Provider value={beam}>
            <div ref={rootRef} className={`sph-root is-${theme}${lit ? ' is-lit' : ''}${cheering ? ` is-cheer-${cheer % 2}` : ''}${idle ? ' is-idle' : ''}${board?.cells.some(c => c.question.pair?.sum.visual) ? ' has-pictures' : ''}${phase === 'help' ? ' is-paused' : ''}`}
                style={roomStyle} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                onKeyDown={() => setIdle(false)}
                onClickCapture={e => { if (sweep.current.swept) { e.stopPropagation(); e.preventDefault(); sweep.current.swept = false; } }}>
                <div className="sph-room" aria-hidden><art.Room lit={lit} /></div>
                {board && <SpookBoard key={board.key} board={board} phase={phase} onBoardPick={onBoardPick} onBoardFocus={onBoardFocus} sound={sound} art={art} theme={info}
                    beam={beam} last={last} moveBeam={p => { setIdle(false); moveBeam(p); }} onLit={setLit} onPair={onPair} root={rootRef} />}
                <div className="sph-room-dark" aria-hidden />
                <div className="sph-glow" aria-hidden />
                <div className="sph-life" aria-hidden><art.Life lit={lit} /></div>
            </div>
        </BeamContext.Provider>
    );
}

/** The end screen's picture: the place just played with the lights on and its whole crowd. */
export function SpookhuisEnding(props: SkinEndingProps) {
    void props;
    const theme = readLastTheme() ?? 'klassiek';
    const art = ART[theme];
    return (
        <div className={`spel-ending sph-ending is-${theme}`} aria-hidden>
            <div className="sph-room"><art.Room lit /></div>
            <div className="sph-party"><art.Party /></div>
        </div>
    );
}
