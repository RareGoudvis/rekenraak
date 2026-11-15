import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Burst, CrackLines, type CrackStage } from '../../scene';
import { Bee, Branch } from './art';
import { combDecor, combLayout, COMB_RIM, type DecorKind } from './comb';
import { BoardBee, CellTexts, Top } from './parts';
import { BEE_START, boardChars, cellTexts, HEX, usePicks, type ViewProps } from './view';

// The honeycomb board: a wild comb hanging from a branch, its cells to find inside a rim of wax with honey,
// eggs and larvae, honey dripping off the bottom and worker bees busy round it. A right cell fills with honey
// (the bee flies there), a wrong one cracks with a shake and shows its own answer.

// The SVG's units: one cell width = 100.
const U = 100;
// A pointy-top hexagon's half height in those units (100 × 115.5 box).
const HALF_H = 57.735;

function slabBox(cols: number, rowsH: number) {
    const L = -COMB_RIM.side * U, R = (cols + COMB_RIM.side) * U, T = -COMB_RIM.top * U, B = (rowsH + COMB_RIM.bottom) * U;
    return { L, R, T, B };
}

// A rounded slab of wax: flat where it hangs from the branch, bellied at the bottom.
function slabPath(cols: number, rowsH: number): string {
    const { L, R, T, B } = slabBox(cols, rowsH);
    const mid = (T + B) / 2, cx = (L + R) / 2;
    return `M${L + 70} ${T} L${R - 70} ${T} C${R - 10} ${T} ${R} ${T + 40} ${R} ${T + 110} L${R} ${mid} C${R} ${B - 60} ${R - 110} ${B} ${cx} ${B} `
        + `C${L + 110} ${B} ${L} ${B - 60} ${L} ${mid} L${L} ${T + 110} C${L} ${T + 40} ${L + 10} ${T} ${L + 70} ${T} Z`;
}

// A piece broken out of a cracked cell's edge (in the cell's 100 × 115.5 box), in turn per cell.
const CHIPS = ['M62 8 L98 29.7 L98 46 L86 40 L80 26 L68 22 Z', 'M2 29.7 L30 13 L36 24 L22 30 L14 44 L2 46 Z', 'M98 70 L98 85.8 L72 101 L74 88 L86 82 Z'];

// Honey oozing over the bottom edge: x from the centre, length; a drop forms at each tip and falls.
const DRIPS: readonly [number, number][] = [[-150, 44], [40, 58], [170, 36]];

function Decor({ x, y, kind }: { x: number; y: number; kind: DecorKind }) {
    // A little smaller than a cell: the decor reads as cells sunk in the wax, the cells to find as tiles on top.
    return (
        <g className={`hx-decor is-${kind}`} transform={`translate(${x * U - 44} ${y * U - HALF_H * 0.88}) scale(.88)`}>
            <polygon className="hx-decor-cell" points={HEX} />
            {kind === 'honey' && <ellipse className="hx-decor-shine" cx="32" cy="38" rx="10" ry="4.5" transform="rotate(-28 32 38)" />}
            {kind === 'capped' && <ellipse className="hx-decor-cap" cx="50" cy="58" rx="34" ry="38" />}
            {kind === 'egg' && <ellipse className="hx-egg" cx="50" cy="58" rx="8" ry="14" transform="rotate(18 50 58)" />}
            {kind === 'larva' && (
                // A plump grub curled into a C, with its segments.
                <>
                    <path className="hx-larva" d="M30 60 C30 40 52 33 65 43 C74 50 72 64 63 67 C56 69 54 61 49 61 C43 61 44 74 35 73 C31 72 30 66 30 60 Z" />
                    <path className="hx-larva-seg" d="M40 46 Q44 52 40 58 M53 40 Q54 47 49 52 M64 47 Q60 52 56 53" />
                </>
            )}
        </g>
    );
}

function Slab({ n, cols, rowsH, uid, still }: { n: number; cols: number; rowsH: number; uid: string; still: boolean }) {
    const { L, R, T, B } = slabBox(cols, rowsH);
    const cx = (L + R) / 2;
    const extra = 120;
    const d = slabPath(cols, rowsH);
    return (
        <svg className="hx-slab" viewBox={`${L - 6} ${T - 6} ${R - L + 12} ${B - T + 12 + extra}`} aria-hidden
            style={{ '--sl': COMB_RIM.side + 0.06, '--st': COMB_RIM.top + 0.06, '--sw': (R - L + 12) / U, '--sh': (B - T + 12 + extra) / U } as CSSProperties}>
            <defs><clipPath id={`${uid}-slab`}><path d={d} /></clipPath></defs>
            <path className="hx-slab-wax" d={d} />
            <g clipPath={`url(#${uid}-slab)`}>
                {combDecor(n).map(c => <Decor key={`${c.x}|${c.y}`} {...c} />)}
            </g>
            <path className="hx-slab-rim" d={d} />
            {DRIPS.map(([dx, len], i) => {
                const x = cx + dx, y0 = B - 40;
                return (
                    <g key={i} className="hx-drip" style={{ '--k': i } as CSSProperties}>
                        <path className="hx-drip-honey" d={`M${x - 18} ${y0} C${x - 16} ${y0 + len * 0.45} ${x - 6} ${y0 + len * 0.55} ${x - 7} ${y0 + len - 4} A9 9 0 1 0 ${x + 7} ${y0 + len - 4} C${x + 6} ${y0 + len * 0.55} ${x + 16} ${y0 + len * 0.45} ${x + 18} ${y0} Z`} />
                        {!still && <path className="hx-drop" style={{ transformOrigin: `${x}px ${y0 + len + 4}px` }} d={`M${x} ${y0 + len - 2} C${x + 6} ${y0 + len + 6} ${x + 7} ${y0 + len + 12} ${x} ${y0 + len + 14} C${x - 7} ${y0 + len + 12} ${x - 6} ${y0 + len + 6} ${x} ${y0 + len - 2} Z`} />}
                    </g>
                );
            })}
        </svg>
    );
}

function Workers({ happy }: { happy: boolean }) {
    return (
        <>
            {(['a', 'b', 'c'] as const).map((k, i) => (
                <span key={k} className={`hx-worker is-${k}`} aria-hidden>
                    <span className="hx-worker-turn"><Bee mood={happy ? 'happy' : 'busy'} pollen={i === 1} /></span>
                </span>
            ))}
        </>
    );
}

export default function Comb({ board, phase, onBoardPick, reducedMotion, sound, active, leaving }: ViewProps) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
    const layout = combLayout(board.cells.length);
    const { beeAt, face, fresh } = usePicks(board, i => layout.cells[i]);
    // The crack of the cell just missed: short cracks first, then they grow and branch.
    const [stage, setStage] = useState<CrackStage>(2);
    const [shaking, setShaking] = useState<number | null>(null);
    const [seenFresh, setSeenFresh] = useState<number | null>(null);
    if (fresh !== seenFresh) {
        setSeenFresh(fresh);
        if (fresh !== null) { setStage(reducedMotion ? 2 : 1); setShaking(fresh); }
    }
    // The shell hands a new sound() each render: the crack sounds once per wrong cell.
    const voice = useRef(sound);
    useEffect(() => { voice.current = sound; });
    useEffect(() => { if (fresh !== null) voice.current('barricade'); }, [fresh]);
    useEffect(() => {
        if (stage !== 1) return;
        const id = window.setTimeout(() => setStage(2), 170);
        return () => window.clearTimeout(id);
    }, [stage]);

    const toFind = board.cells.filter(c => c.match);
    const cleared = toFind.every(c => c.state === 'solved');
    const pick = (i: number) => {
        if (!active || phase !== 'play' || board.cells[i].state !== 'open') return;
        onBoardPick?.(i, '');
    };
    const start = { x: BEE_START.x, y: layout.height / 2 };
    const bee = beeAt !== null ? layout.cells[beeAt] : start;
    const at = (i: number) => ({ x: `calc(${layout.cells[i].x} * var(--hx-w))`, y: `calc(${layout.cells[i].y} * var(--hx-w))` });
    return (
        <>
            <Top board={board} view="comb" />
            <div className="hx-comb-wrap">
                <div className={`hx-comb${cleared ? ' is-cleared' : ''}${fresh !== null ? ' is-thud' : ''}`} role="group" aria-label="Honingraat"
                    style={{ '--hx-cols': layout.width, '--hx-rows-h': layout.height, '--hx-chars': boardChars(board) } as CSSProperties}>
                    <span className="hx-branch-wrap" aria-hidden><Branch /></span>
                    {/* After the branch: the trunk hides where the branch is cut off. */}
                    <span className="hx-trunk" aria-hidden />
                    <Slab n={board.cells.length} cols={layout.width} rowsH={layout.height} uid={uid} still={reducedMotion} />
                    <Workers happy={cleared} />
                    {board.cells.map((c, i) => {
                        const { x, y } = layout.cells[i];
                        const { sum, own, showOwn, label } = cellTexts(board, i, 'honing');
                        const chip = CHIPS[i % CHIPS.length];
                        const state = c.state === 'solved' ? ' is-honey' : c.state === 'missed' ? ' is-missed' : '';
                        return (
                            <button key={`${board.key}-${i}`} type="button" className={`hx-cell${state}${shaking === i ? ' is-bzz' : ''}`}
                                style={{ '--x': x, '--y': y, '--i': i } as CSSProperties} disabled={!active || phase !== 'play' || c.state !== 'open'}
                                onClick={() => pick(i)} onAnimationEnd={e => { if (e.animationName === 'hx-bzz') setShaking(null); }} aria-label={label}>
                                <svg className="hx-hex" viewBox="0 0 100 115.5" aria-hidden>
                                    <clipPath id={`${uid}-${i}`}><polygon points={HEX} /></clipPath>
                                    <polygon className="hx-wax" points={HEX} />
                                    <g clipPath={`url(#${uid}-${i})`}>
                                        <rect className="hx-honey" x="0" y="0" width="100" height="116" />
                                        <ellipse className="hx-shine" cx="30" cy="34" rx="11" ry="5" transform="rotate(-28 30 34)" />
                                        {c.state === 'missed' && <path className="hx-chip" d={chip} />}
                                        {c.state === 'missed' && (
                                            <CrackLines width={100} height={115.5} stage={fresh === i ? stage : 2} seed={i + 3} origin={[50, 30]} reducedMotion={reducedMotion || fresh !== i} />
                                        )}
                                    </g>
                                    <polygon className="hx-rim" points={HEX} />
                                </svg>
                                <CellTexts sum={sum} own={showOwn ? own : undefined} />
                            </button>
                        );
                    })}
                    <BoardBee x={bee.x} y={bee.y} face={face} mood={fresh !== null ? 'worried' : cleared ? 'happy' : 'busy'} landed={beeAt !== null} hidden={leaving} still={reducedMotion} />
                    {fresh !== null && <Burst key={`crumb-${fresh}`} kind="pieces" {...at(fresh)} spread={70} count={9} seed={fresh + 1} color="var(--hx-wax-deep)" reducedMotion={reducedMotion} />}
                    {beeAt !== null && <Burst key={`honey-${beeAt}`} kind="sparkle" {...at(beeAt)} spread={60} count={7} seed={beeAt + 2} reducedMotion={reducedMotion} />}
                </div>
            </div>
        </>
    );
}
