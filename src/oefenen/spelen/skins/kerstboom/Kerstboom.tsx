import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import SpelKeypad from '../../SpelKeypad';
import { Burst, Snow } from '../../scene';
import type { SkinEndingProps, SkinProps } from '../types';
import {
    DECOR, DECOR_ALL, FLOOR, FLOOR_BALL_Y, STAR_AT, VIEW_H, VIEW_W, VIEW_X, bulbsOf, decorAt, floorSpot, hungFor, presentsFor,
    rollSpin, type BaublePattern, type BaubleShape, type Decor, type Present, type Pt,
} from './tree';
import { startDrops, stepDrops, type Fallen } from './drops';
import './kerstboom.css';

// Kerstboom versieren: the calm Kerst game. A fir tree in a warm living room at evening, snow falling outside;
// each right answer hangs the next decoration, the star goes on top last. Two counted mistakes in a row knock
// a bauble off (drops.ts): it rolls onto the floor and stays, and the next right answer hangs a fresh one in the gap.

// The fallen bauble's first touch of the floor (the "tink"), into its kb-fall animation.
const LAND_MS = 560;

const pctX = (x: number) => `${((x - VIEW_X) / VIEW_W) * 100}%`;
const pctY = (y: number) => `${(y / VIEW_H) * 100}%`;

function starPath(cx: number, cy: number, r: number, inner = 0.45): string {
    const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * inner : r;
        return `${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
    });
    return `M${pts.join(' L')} Z`;
}

// The three tiers, bottom first: the outline and its shaded right half.
const TIERS: readonly [string, string][] = [
    ['M160 150 L265 288 Q237 300 210 290 Q185 300 160 290 Q135 300 110 290 Q83 300 55 288 Z', 'M160 150 L265 288 Q237 300 210 290 Q185 300 160 290 Z'],
    ['M160 92 L245 218 Q217 228 188 220 Q160 230 132 220 Q103 228 75 218 Z', 'M160 92 L245 218 Q217 228 188 220 Q160 230 160 230 Z'],
    ['M160 40 L220 148 Q190 158 160 150 Q130 158 100 148 Z', 'M160 40 L220 148 Q190 158 160 150 Z'],
];

const BODY: Record<BaubleShape, string> = {
    round: 'M0 -11 A11 11 0 1 1 0 11 A11 11 0 1 1 0 -11 Z',
    drop: 'M0 -11 C8 -11 11 -4 10 1 C9 6 4 10 0 18 C-4 10 -9 6 -10 1 C-11 -4 -8 -11 0 -11 Z',
    onion: 'M0 -12 C3 -8 12 -5 12 2 C12 8 7 11 2 12 L0 15 L-2 12 C-7 11 -12 8 -12 2 C-12 -5 -3 -8 0 -12 Z',
};

function Pattern({ pattern }: { pattern: BaublePattern }) {
    if (pattern === 'stripes') return <path className="kb-pat-band" d="M-14 -4 L14 -4 M-14 5 L14 5" />;
    if (pattern === 'zigzag') return <path className="kb-pat-line" d="M-14 1 L-9 -3 L-4 1 L1 -3 L6 1 L11 -3 L16 1" />;
    if (pattern === 'dots') return <g className="kb-pat-dot">{[[-5, -3], [4, -6], [5, 4], [-3, 6], [-9, 3]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.9" />)}</g>;
    return null;
}

/** A bauble drawn round its own centre (0, 0); `hook` adds the cap's loop for one that hangs. */
function BaubleBody({ shape, pattern, c, clip, hook }: { shape: BaubleShape; pattern: BaublePattern; c: number; clip: string; hook: boolean }) {
    return (
        <>
            {hook && <path className="kb-hook" d="M0 -16 L0 -23" />}
            <rect className="kb-cap" x="-4" y="-16" width="8" height="5.5" rx="1.5" />
            <path className="kb-ball" d={BODY[shape]} style={{ fill: `var(--kb-ball-${c})` }} />
            <g clipPath={`url(#${clip}-${shape})`}><Pattern pattern={pattern} /></g>
            <path className="kb-ball-rim" d={BODY[shape]} />
            <path className="kb-shine" d="M-6 -2 A6 6 0 0 1 -1 -7" />
        </>
    );
}

function Ornament({ d, isNew, clip, i }: { d: Decor; isNew: boolean; clip: string; i: number }) {
    const nw = isNew ? ' is-new' : '';
    if (d.kind === 'tinsel') {
        const path = `M${d.from.join(' ')} Q${d.via.join(' ')} ${d.to.join(' ')}`;
        return (
            <g className={`kb-decor kb-tinsel${nw}`}>
                <path className="kb-tinsel-edge" d={path} pathLength={100} />
                <path className="kb-tinsel-gold" d={path} pathLength={100} />
                <path className="kb-tinsel-glint" d={path} />
            </g>
        );
    }
    if (d.kind === 'lights') {
        const path = `M${d.from.join(' ')} Q${d.via.join(' ')} ${d.to.join(' ')}`;
        return (
            <g className={`kb-decor kb-lights${nw}`}>
                <path className="kb-wire" d={path} pathLength={100} />
                {bulbsOf(d).map(([x, y], b) => (
                    <g key={b} className="kb-bulb" style={{ '--b': b, '--t': (b * 3 + i) % 5 } as CSSProperties}>
                        <circle className="kb-bulb-glow" cx={x} cy={y + 6} r="7.5" style={{ fill: `var(--kb-bulb-${(b + i) % 4})` }} />
                        <rect className="kb-socket" x={x - 2.5} y={y - 1} width="5" height="4" rx="1" />
                        <ellipse className="kb-bulb-glass" cx={x} cy={y + 6.5} rx="3.6" ry="4.8" style={{ fill: `var(--kb-bulb-${(b + i) % 4})` }} />
                    </g>
                ))}
            </g>
        );
    }
    if (d.kind === 'cane') {
        const hook = 'M0 26 L0 0 A7 7 0 0 1 14 0 L14 3';
        return (
            <g className={`kb-decor kb-cane${nw}`} transform={`translate(${d.x - (d.flip ? -7 : 7)} ${d.y - 10})${d.flip ? ' scale(-1 1)' : ''}`}>
                <path className="kb-cane-edge" d={hook} />
                <path className="kb-cane-white" d={hook} />
                <path className="kb-cane-red" d={hook} />
            </g>
        );
    }
    if (d.kind === 'starlet') {
        return (
            <g className={`kb-decor kb-starlet${nw}`}>
                <path className="kb-hook" d={`M${d.x} ${d.y - 18} L${d.x} ${d.y - 9}`} />
                <path className="kb-starlet-body" d={starPath(d.x, d.y, 10)} />
            </g>
        );
    }
    return (
        <g transform={`translate(${d.x} ${d.y})`}>
            <g className={`kb-decor kb-bauble${nw}`}>
                <BaubleBody shape={d.shape} pattern={d.pattern} c={d.c} clip={clip} hook />
            </g>
        </g>
    );
}

function PresentBox({ p, isNew }: { p: Present; isNew: boolean }) {
    const { x, w, h, base } = p;
    const y = base - h;
    const mid = x + w / 2;
    return (
        <g className={`kb-present${isNew ? ' is-new' : ''}`} style={{ '--paper': `var(--kb-paper-${p.c})` } as CSSProperties}>
            <rect className="kb-box" x={x} y={y} width={w} height={h} rx="2.5" />
            <rect className="kb-box-lid" x={x - 2} y={y - 2} width={w + 4} height={Math.min(8, h / 3)} rx="2" />
            <path className="kb-ribbon" d={`M${mid} ${y - 2} L${mid} ${base}`} />
            <path className="kb-bow" d={`M${mid} ${y - 2} C${mid - 13} ${y - 13} ${mid - 13} ${y + 1} ${mid} ${y - 2} C${mid + 13} ${y - 13} ${mid + 13} ${y + 1} ${mid} ${y - 2} Z`} />
        </g>
    );
}

/** The sleeping cat on the rug, in a striped scarf; it opens its eyes when the tree is finished. */
function Cat({ awake, twitch }: { awake: boolean; twitch: number }) {
    return (
        <g className="kb-cat" transform="translate(28 326)">
            <g className="kb-cat-breathe">
                <path className="kb-cat-tail-line" d="M30 8 C48 10 48 -8 36 -12" />
                <path className="kb-cat-tail" d="M30 8 C48 10 48 -8 36 -12" />
                <ellipse className="kb-cat-fur" cx="14" cy="6" rx="28" ry="13" />
                <path className="kb-cat-stripe" d="M10 -5 Q13 0 10 5 M20 -5 Q23 0 20 5 M30 -2 Q32 2 30 6" />
            </g>
            <g className="kb-cat-head">
                <path key={twitch} className={`kb-cat-ear${twitch ? ' is-twitch' : ''}`} d="M-20 -6 L-17 -21 L-9 -12 Z" />
                <path className="kb-cat-ear" d="M-6 -12 L1 -21 L2 -6 Z" />
                <circle className="kb-cat-fur" cx="-9" cy="0" r="12" />
                {awake
                    ? <g className="kb-cat-eye-open"><circle cx="-14" cy="-1" r="2.2" /><circle cx="-4" cy="-1" r="2.2" /></g>
                    : <path className="kb-cat-eye" d="M-17 -1 Q-14 2 -11 -1 M-7 -1 Q-4 2 -1 -1" />}
                <path className="kb-cat-nose" d="M-10.5 3.5 L-7.5 3.5 L-9 5.5 Z" />
            </g>
            <path className="kb-scarf" d="M-15 9 Q-8 14 1 9 L2 13 Q-8 19 -16 13 Z" />
            <path className="kb-scarf-end" d="M-3 12 L-1 24 L5 22 L2 11 Z" />
            {!awake && <path className="kb-zz" d="M-22 -30 L-15 -30 L-22 -24 L-15 -24 M-31 -42 L-26 -42 L-31 -38 L-26 -38" />}
        </g>
    );
}

/** A bauble that fell from `spot`: it drops to the floor, bounces once and rolls to its floor spot. */
function FallenBauble({ f, clip }: { f: Fallen; clip: string }) {
    const d = DECOR[f.spot];
    if (d.kind !== 'bauble') return null;
    const x = floorSpot(f.n);
    const dx = d.x - x;
    return (
        <g transform={`translate(${x} ${FLOOR_BALL_Y})`}>
            <g className="kb-fall" style={{ '--dx': `${dx}px`, '--dy': `${d.y - FLOOR_BALL_Y}px` } as CSSProperties}>
                <g className="kb-roll" style={{ '--spin': `${rollSpin(dx, d.shape)}deg` } as CSSProperties}>
                    <BaubleBody shape={d.shape} pattern={d.pattern} c={d.c} clip={clip} hook={false} />
                </g>
            </g>
        </g>
    );
}

interface SceneProps {
    hung: number;
    lit: boolean;
    // Decoration indices that just went up (DECOR.length = the star): they pop in.
    popped?: readonly number[];
    gaps?: readonly number[];
    fallen?: readonly Fallen[];
    twitch?: number;
    paused?: boolean;
    reducedMotion?: boolean;
}

/** The room with the tree: `hung` decorations (the star at DECOR_ALL) minus the gaps, lit when finished. */
export function KerstScene({ hung, lit, popped = [], gaps = [], fallen = [], twitch = 0, paused = false, reducedMotion = false }: SceneProps) {
    const clip = `kb${useId().replace(/:/g, '')}`;
    const star = hung >= DECOR_ALL;
    const shown = DECOR.map((d, i) => ({ d, i })).filter(({ i }) => i < hung && !gaps.includes(i));
    // Garlands and light strings go on first so the ornaments hang in front of them.
    const lines = shown.filter(({ d }) => d.kind === 'lights' || d.kind === 'tinsel');
    const hangers = shown.filter(({ d }) => d.kind !== 'lights' && d.kind !== 'tinsel');
    const presents = presentsFor(hung);
    const view = `${VIEW_X} 0 ${VIEW_W} ${VIEW_H}`;
    const glass = { x: 2, y: 40, w: 80, h: 108 };
    return (
        <div className={`kb-scene${lit ? ' is-lit' : ''}`}>
            <div className="kb-stage">
                <svg className="kb-svg" viewBox={view} aria-hidden>
                    <defs>
                        <pattern id={`${clip}-paper`} width="28" height="40" patternUnits="userSpaceOnUse">
                            <rect className="kb-wall" width="28" height="40" />
                            <rect className="kb-wall-stripe" x="20" width="6" height="40" />
                            <circle className="kb-wall-dot" cx="10" cy="20" r="1.6" />
                        </pattern>
                        <radialGradient id={`${clip}-lamp`}>
                            <stop offset="0" className="kb-lamp-stop-0" />
                            <stop offset="1" className="kb-lamp-stop-1" />
                        </radialGradient>
                        <linearGradient id={`${clip}-sky`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" className="kb-sky-stop-0" />
                            <stop offset="1" className="kb-sky-stop-1" />
                        </linearGradient>
                    </defs>
                    <rect x={-2000} y={-2000} width={4000} height={2000 + FLOOR} fill={`url(#${clip}-paper)`} />
                    <circle className="kb-lamp-light" cx="300" cy="74" r="150" fill={`url(#${clip}-lamp)`} />
                    <circle className="kb-tree-light" cx="160" cy="190" r="170" fill={`url(#${clip}-lamp)`} />
                    <rect x={glass.x} y={glass.y} width={glass.w} height={glass.h} fill={`url(#${clip}-sky)`} />
                    <path className="kb-moon" d="M24 52 A10 10 0 1 0 32 70 A8 8 0 1 1 24 52 Z" />
                    <path className="kb-outside-hill" d={`M${glass.x} 132 Q30 118 54 128 Q70 122 ${glass.x + glass.w} 126 L${glass.x + glass.w} 148 L${glass.x} 148 Z`} />
                    <path className="kb-outside-fir" d="M20 126 L28 104 L36 126 Z M54 124 L60 108 L66 124 Z" />
                    <rect className="kb-floor" x={-2000} y={FLOOR} width={4000} height={2000} />
                    {[312, 330, 352].map(y => <path key={y} className="kb-plank" d={`M-2000 ${y} L2000 ${y}`} />)}
                </svg>
                <div className="kb-snow-pane" style={{ left: pctX(glass.x), top: pctY(glass.y), width: `${(glass.w / VIEW_W) * 100}%`, height: `${(glass.h / VIEW_H) * 100}%` }}>
                    <Snow density={16} size={[2, 5]} fall={[5, 9]} full paused={paused} reducedMotion={reducedMotion} seed={7} />
                </div>
                <svg className="kb-svg" viewBox={view} aria-hidden>
                    <defs>
                        {(Object.keys(BODY) as BaubleShape[]).map(s => <clipPath key={s} id={`${clip}-${s}`}><path d={BODY[s]} /></clipPath>)}
                    </defs>
                    <g className="kb-window">
                        <path className="kb-window-snow" d={`M${glass.x} ${glass.y + glass.h} Q${glass.x + 20} ${glass.y + glass.h - 9} ${glass.x + 40} ${glass.y + glass.h - 4} Q${glass.x + 62} ${glass.y + glass.h - 10} ${glass.x + glass.w} ${glass.y + glass.h} Z`} />
                        <rect className="kb-frame" x={glass.x} y={glass.y} width={glass.w} height={glass.h} rx="3" />
                        <path className="kb-frame-bar" d={`M${glass.x + glass.w / 2} ${glass.y} L${glass.x + glass.w / 2} ${glass.y + glass.h} M${glass.x} ${glass.y + glass.h / 2} L${glass.x + glass.w} ${glass.y + glass.h / 2}`} />
                        <rect className="kb-sill" x={glass.x - 7} y={glass.y + glass.h} width={glass.w + 14} height="8" rx="3" />
                        <path className="kb-curtain" d={`M${glass.x - 14} ${glass.y - 10} L${glass.x + 6} ${glass.y - 10} Q${glass.x + 2} ${glass.y + 50} ${glass.x + 10} ${glass.y + 84} Q${glass.x - 4} ${glass.y + 120} ${glass.x - 2} ${glass.y + 148} L${glass.x - 20} ${glass.y + 148} Z`} />
                        <path className="kb-curtain" d={`M${glass.x + glass.w + 14} ${glass.y - 10} L${glass.x + glass.w - 6} ${glass.y - 10} Q${glass.x + glass.w - 2} ${glass.y + 50} ${glass.x + glass.w - 10} ${glass.y + 84} Q${glass.x + glass.w + 4} ${glass.y + 120} ${glass.x + glass.w + 2} ${glass.y + 148} L${glass.x + glass.w + 20} ${glass.y + 148} Z`} />
                        <rect className="kb-rail" x={glass.x - 20} y={glass.y - 14} width={glass.w + 40} height="6" rx="3" />
                    </g>
                    <g className="kb-sconce">
                        <path className="kb-sconce-arm" d="M300 104 L300 80" />
                        <rect className="kb-sconce-plate" x="295" y="96" width="10" height="16" rx="3" />
                        <path className="kb-sconce-shade" d="M290 58 L310 58 L318 80 L282 80 Z" />
                    </g>
                    <rect className="kb-skirting" x={-2000} y={FLOOR - 7} width={4000} height="7" />
                    <ellipse className="kb-rug" cx="150" cy="338" rx="188" ry="22" />
                    <ellipse className="kb-rug-edge" cx="150" cy="338" rx="176" ry="17" />
                    <Cat awake={lit} twitch={twitch} />
                    <g className="kb-tree">
                        <rect className="kb-trunk" x="148" y="284" width="24" height="30" />
                        {TIERS.map(([full, shade]) => (
                            <g key={full}>
                                <path className="kb-tier" d={full} />
                                <path className="kb-tier-shade" d={shade} />
                                <path className="kb-tier-line" d={full} />
                            </g>
                        ))}
                        {lines.map(({ d, i }) => <Ornament key={i} d={d} i={i} clip={clip} isNew={popped.includes(i)} />)}
                        {hangers.map(({ d, i }) => <Ornament key={i} d={d} i={i} clip={clip} isNew={popped.includes(i)} />)}
                        {star && (
                            <g className={`kb-star${popped.includes(DECOR.length) ? ' is-new' : ''}`}>
                                {lit && <path className="kb-star-rays" d={starPath(STAR_AT[0], STAR_AT[1], 40, 0.2)} />}
                                <path className="kb-star-body" d={starPath(STAR_AT[0], STAR_AT[1], 22)} />
                            </g>
                        )}
                    </g>
                    <path className="kb-skirt" d="M74 314 Q76 300 160 300 Q244 300 246 314 Q238 318 228 314 Q218 322 204 316 Q190 324 174 317 Q160 325 146 317 Q130 324 116 316 Q102 322 92 314 Q82 318 74 314 Z" />
                    {presents.map(p => <PresentBox key={p.at + p.x} p={p} isNew={popped.length > 0 && p.at === hung} />)}
                    {fallen.map(f => <FallenBauble key={f.n} f={f} clip={clip} />)}
                </svg>
                {popped.map(i => {
                    const [x, y]: Pt = i === DECOR.length ? STAR_AT : decorAt(DECOR[i]);
                    const big = i === DECOR.length;
                    return <Burst key={`${hung}-${i}`} kind="sparkle" x={pctX(x)} y={pctY(y)} spread={big ? 110 : 62} count={big ? 14 : 9} seed={i + 3} reducedMotion={reducedMotion} />;
                })}
            </div>
        </div>
    );
}

export default function Kerstboom({ question, phase, feedback, onAnswer, progress, events, reducedMotion, sound }: SkinProps) {
    const target = progress.goal?.target ?? DECOR_ALL;
    const hung = hungFor(progress.goal?.count ?? progress.right, target);
    const counters = { right: progress.right, mistakes: progress.mistakes, hung };
    const [st, setSt] = useState(() => ({ hung, popped: [] as number[], drops: startDrops(progress.right, progress.mistakes) }));
    const drops = stepDrops(st.drops, counters);
    if (st.hung !== hung || drops !== st.drops) {
        const grown = Array.from({ length: Math.max(0, hung - st.hung) }, (_, k) => st.hung + k);
        setSt({ hung, popped: [...grown, ...drops.refilled], drops });
    }
    const [sway, setSway] = useState(0);
    useEffect(() => events.on('wrong', () => setSway(s => s + 1)), [events]);

    // The tink when a fallen bauble touches the floor.
    const voice = useRef(sound);
    useEffect(() => { voice.current = sound; });
    const fallenN = st.drops.fallen.length;
    useEffect(() => {
        if (fallenN === 0) return;
        const id = window.setTimeout(() => voice.current('hit'), reducedMotion ? 0 : LAND_MS);
        return () => window.clearTimeout(id);
    }, [fallenN, reducedMotion]);

    if (!question) return <div className="kb-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const lit = hung >= DECOR_ALL;

    return (
        <div className={`kb-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${sway ? ` is-sway-${sway % 2}` : ''}`}>
            <div className="kb-world">
                <KerstScene hung={hung} lit={lit} popped={st.popped} gaps={st.drops.gaps} fallen={st.drops.fallen} twitch={fallenN}
                    paused={phase === 'help'} reducedMotion={reducedMotion} />
            </div>
            <div className="kb-panel">
                <SpelSignBox className={`kb-sign${flash ? ' is-solved' : ''}`} question={question} feedback={feedback} flash={flash} answerClassName="kb-sign-answer" />
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

/** The end screen: the tree as far as it got, lit and twinkling when finished. */
export function KerstboomEnding({ progress, reducedMotion }: SkinEndingProps) {
    const target = progress.goal?.target ?? DECOR_ALL;
    const hung = hungFor(progress.goal?.count ?? progress.right, target);
    return (
        <div className={`spel-ending kb-ending${reducedMotion ? ' is-still' : ''}`}>
            <KerstScene hung={hung} lit={hung >= DECOR_ALL} reducedMotion={reducedMotion} />
        </div>
    );
}
