import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { SpelSignBox } from '../../SpelVisual';
import SpelKeypad from '../../SpelKeypad';
import { Burst, Clouds, Snow } from '../../scene';
import type { SkinEndingProps, SkinProps } from '../types';
import { BlockHalves, IceBlock, Penguin, Seal } from './art';
import { crackedIds, towerStart, towerStep, type TowerChange } from './climb';
import { BH, CAM_X, GROUND, VIEW_H, VIEW_W, WATER, blockLook, onScreen, penguinMood, towerScale, type BlockLook } from './tower';
import './pinguintoren.css';

// Pinguïntoren: the calm game. Each right answer stacks an ice block and the penguin hops onto it, happier the
// higher he gets. A mistake cracks the two lowest blocks; the next one breaks them into the sea (climb.ts).
// No red, no clock. Snow when it opens, drifting clouds, now and then a seal.

// When a break's pieces fly and when they splash into the sea, ms after the mistake.
const SHATTER_MS = 300;
const SPLASH_MS = 1000;
// How long it snows when the game opens.
const SNOW_MS = 7000;

const blockX = (look: BlockLook) => VIEW_W / 2 - look.width / 2 + look.dx;
const blockY = (i: number) => GROUND - (i + 1) * BH;
// Where the seals come up, in world units beside the floe (each moves with the camera, like the floe).
const SEALS = [{ x: 22, side: 'left' }, { x: 219, side: 'right' }] as const;

function Floe({ under = false }: { under?: boolean }) {
    return <path className={`pt-floe${under ? ' is-under' : ''}`} d={`M46 ${GROUND + 14} L58 ${GROUND} L182 ${GROUND} L194 ${GROUND + 14} Z`} />;
}

export default function Pinguintoren({ question, phase, feedback, onAnswer, progress, events, reducedMotion, sound }: SkinProps) {
    const goal = progress.goal?.target ?? 20;
    const count = progress.goal?.count ?? progress.score;
    // One seed per round: the blocks' tints and sizes, and which one holds the frozen creature.
    const [seed] = useState(() => Math.floor(Math.random() * 1e6));
    const [state, setState] = useState(() => towerStart(count, progress.mistakes));
    const tower = towerStep(state, count, progress.mistakes, question?.key ?? null);
    if (tower !== state) setState(tower);
    const [wobble, setWobble] = useState(0);
    useEffect(() => events.on('wrong', () => setWobble(w => w + 1)), [events]);
    const [snowing, setSnowing] = useState(true);
    useEffect(() => { const t = window.setTimeout(() => setSnowing(false), SNOW_MS); return () => window.clearTimeout(t); }, []);
    // A break plays in beats: the pieces fly, then they splash.
    const [beat, setBeat] = useState({ n: -1, step: 0 });
    const say = useRef(sound);
    useEffect(() => { say.current = sound; });

    const qKey = question?.key ?? null;
    // The wrong flash's sound: a crack, a break (the splash follows), or a soft plop (empty floe, met hulp).
    const wrongCue: TowerChange | 'other' | null = phase === 'wrong' && qKey ? (tower.at === qKey ? tower.change : 'other') : null;
    useEffect(() => {
        if (!wrongCue) return;
        say.current(wrongCue === 'crack' || wrongCue === 'break' ? 'barricade' : 'miss');
        if (wrongCue !== 'break') return;
        const t = window.setTimeout(() => say.current('hit'), reducedMotion ? 0 : SPLASH_MS);
        return () => window.clearTimeout(t);
    }, [wrongCue, qKey, reducedMotion]);
    const breakN = tower.change === 'break' ? tower.n : -1;
    useEffect(() => {
        if (breakN < 0 || reducedMotion) return;
        const a = window.setTimeout(() => setBeat({ n: breakN, step: 1 }), SHATTER_MS);
        const b = window.setTimeout(() => setBeat({ n: breakN, step: 2 }), SPLASH_MS);
        return () => { window.clearTimeout(a); window.clearTimeout(b); };
    }, [breakN, reducedMotion]);

    if (!question) return <div className="pt-root" />;
    const flash = phase === 'right' || phase === 'wrong';

    const height = tower.blocks.length;
    const scale = towerScale(height, goal);
    const cam = { transform: `scale(${scale})` };
    const looks = tower.blocks.map(id => blockLook(id, seed));
    const top = height - 1;
    const goalY = GROUND - goal * BH;
    const cracked = crackedIds(tower);
    const fresh = tower.at === qKey;
    const mood = penguinMood(height, goal, { wrong: phase === 'wrong', cracked: tower.cracked });
    const moving = !reducedMotion;
    const broke = tower.change === 'break' && moving;
    const brokeLooks = tower.broken.map(id => blockLook(id, seed));
    const beatNow = beat.n === tower.n ? beat.step : 0;
    const drop = tower.broken.length * BH;
    // Splashes land beside the floe where the halves fall in; pieces fly from the middle of the broken blocks.
    const splashAt = (x: number) => ({ left: onScreen(x, 0, scale).left, top: `${(WATER / VIEW_H) * 100}%` });
    const shatterAt = onScreen(CAM_X, GROUND - drop / 2, scale);
    const healAt = onScreen(CAM_X, GROUND - Math.min(2, height) * BH / 2, scale);

    return (
        <div className={`pt-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}`}>
            <Clouds className="pt-sky" layer="far" outline={false} count={3} band={[3, 22]} size={[90, 150]} seed={4} paused={phase === 'help'} reducedMotion={reducedMotion} />
            <Clouds className="pt-sky" layer="near" count={2} band={[6, 26]} size={[120, 180]} seed={9} paused={phase === 'help'} reducedMotion={reducedMotion} />
            <div className="pt-sea" />
            <div className="pt-world">
                <div className="pt-stage">
                    <svg className="pt-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
                        <defs>
                            {/* Screen space, outside the camera: what is above or below the waterline. */}
                            <clipPath id="pt-above"><rect x={-2000} y={-2000} width={4000 + VIEW_W} height={2000 + WATER} /></clipPath>
                            <clipPath id="pt-below"><rect x={-2000} y={WATER} width={4000 + VIEW_W} height={VIEW_H} /></clipPath>
                        </defs>
                        {moving && (
                            <g clipPath="url(#pt-above)">
                                {SEALS.map(s => (
                                    <g key={s.side} className="pt-seal-spot" style={{ transform: `translate(${CAM_X + (s.x - CAM_X) * scale}px, ${WATER}px) scale(${scale})` }}>
                                        <g className={`pt-seal-pop is-${s.side}`}><Seal /></g>
                                    </g>
                                ))}
                            </g>
                        )}
                        <g className="pt-cam" style={cam}>
                            <Floe />
                            <g className="pt-goal">
                                <path className="pt-goal-line" d={`M40 ${goalY} L200 ${goalY}`} />
                                <path className="pt-pole" d={`M200 ${goalY} L200 ${goalY - 44}`} />
                                <path className="pt-flag" d={`M200 ${goalY - 44} L236 ${goalY - 36} L200 ${goalY - 26} Z`} />
                                <text className="pt-goal-num" x={196} y={goalY - 8} textAnchor="end">{goal}</text>
                            </g>
                        </g>
                        {/* The floe's part under water, a shade of the sea. */}
                        <g clipPath="url(#pt-below)"><g className="pt-cam" style={cam}><Floe under /></g></g>
                        <g className="pt-cam" style={cam}>
                            {/* Two identical wobble animations, alternated, so each mistake restarts it without a remount. */}
                            <g className={`pt-tower${wobble ? ` is-wobble-${wobble % 2}` : ''}`}>
                                {/* After a break the tower above drops down by the broken blocks. */}
                                <g key={tower.breaks} className={broke ? 'pt-settle' : undefined} style={broke ? { '--drop': `${drop}px` } as CSSProperties : undefined}>
                                    {tower.blocks.map((id, i) => {
                                        const crack = cracked.includes(id);
                                        const cls = [
                                            i === top && tower.change === 'up' && fresh ? 'is-new' : '',
                                            crack && tower.change === 'crack' && moving ? 'spel-shake' : '',
                                        ].filter(Boolean).join(' ');
                                        return <IceBlock key={id} look={looks[i]} x={blockX(looks[i])} y={blockY(i)} crack={crack ? 2 : 0} crackSeed={id + 3} className={cls} reducedMotion={reducedMotion} />;
                                    })}
                                    {/* A right answer on cracked blocks: the cracks freeze shut. */}
                                    {tower.change === 'heal' && moving && tower.blocks.slice(0, 2).map((id, i) => (
                                        <g key={`${tower.n}-${id}`} className="pt-healing">
                                            <IceBlock look={looks[i]} x={blockX(looks[i])} y={blockY(i)} crack={2} crackSeed={id + 3} className="is-ghost" />
                                        </g>
                                    ))}
                                    <g className="pt-penguin" style={{ transform: `translate(${VIEW_W / 2 + (height ? looks[top].dx : 0)}px, ${GROUND - height * BH}px)` }}>
                                        <g key={tower.n} className={tower.change === 'up' ? 'pt-hop' : tower.change === 'break' ? 'pt-totter' : tower.change === 'heal' ? 'pt-land' : ''}>
                                            <g className={mood === 'dance' ? 'pt-dance' : mood === 'scared' ? 'pt-shiver' : undefined}>
                                                <Penguin mood={mood} />
                                            </g>
                                        </g>
                                    </g>
                                </g>
                            </g>
                        </g>
                        {/* The broken blocks: a moment whole with grown cracks, then their halves fly apart into the sea. */}
                        {broke && (
                            <g clipPath="url(#pt-above)">
                                <g className="pt-cam" style={cam}>
                                    <g key={tower.n} className="pt-shatter">
                                        {brokeLooks.map((look, i) => <BlockHalves key={i} look={look} x={blockX(look)} y={blockY(i)} i={i} />)}
                                        <g className="pt-shatter-whole">
                                            {brokeLooks.map((look, i) => <IceBlock key={i} look={look} x={blockX(look)} y={blockY(i)} crack={2} crackSeed={tower.broken[i] + 3} className="spel-shake" />)}
                                        </g>
                                    </g>
                                </g>
                            </g>
                        )}
                    </svg>
                    {broke && beatNow >= 1 && <Burst key={`p${tower.n}`} kind="pieces" x={shatterAt.left} y={shatterAt.top} spread={150} count={10} color="var(--pt-ice-1)" seed={tower.n} />}
                    {broke && beatNow >= 2 && (
                        <>
                            <Burst key={`l${tower.n}`} kind="splash" {...xy(splashAt(CAM_X - 100))} spread={70} seed={tower.n + 1} />
                            <Burst key={`r${tower.n}`} kind="splash" {...xy(splashAt(CAM_X + 100))} spread={70} seed={tower.n + 2} />
                        </>
                    )}
                    {tower.change === 'crack' && fresh && moving && <Burst key={`c${tower.n}`} kind="pieces" x={healAt.left} y={healAt.top} spread={40} count={8} color="var(--pt-ice-0)" seed={tower.n} />}
                    {tower.change === 'heal' && fresh && moving && <Burst key={`h${tower.n}`} kind="sparkle" x={healAt.left} y={healAt.top} spread={70} seed={tower.n} />}
                </div>
            </div>
            <Snow className="pt-snow" full falling={snowing} density={40} size={[4, 9]} seed={seed % 97} paused={phase === 'help'} reducedMotion={reducedMotion} />

            <div className="pt-panel">
                {/* One size for the sum and its answer, fitted to the panel (SpelSignBox). */}
                <SpelSignBox className={`pt-sign${flash ? ' is-solved' : ''}`} question={question} feedback={feedback} flash={flash} answerClassName="pt-sign-answer" />
                <SpelKeypad questionKey={question.key} onAnswer={onAnswer} disabled={phase !== 'play'} />
            </div>
        </div>
    );
}

const xy = (p: { left: string; top: string }) => ({ x: p.left, y: p.top });

/** The end screen: the penguin dances on top of his tower under the flag, or waves from a smaller one. */
export function PinguintorenEnding({ outcome, progress, reducedMotion }: SkinEndingProps) {
    const won = outcome === 'won';
    const goal = progress.goal?.target ?? 20;
    const n = won ? 4 : Math.max(1, Math.min(4, Math.round(((progress.goal?.count ?? 0) / goal) * 4)));
    const looks = Array.from({ length: n }, (_, i) => blockLook(i, 11));
    const top = GROUND - n * BH;
    const pole = VIEW_W / 2 + 52;
    return (
        <div className={`spel-ending pt-ending${reducedMotion ? ' is-still' : ''}`}>
            <svg viewBox={`-160 ${GROUND - 4 * BH - 86} 560 ${WATER + 14 - (GROUND - 4 * BH - 86)}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
                <g style={{ transform: `translate(${30}px, ${WATER}px)` }}><Seal /></g>
                <rect className="pt-ending-sea" x={-400} y={WATER} width={1200} height={200} />
                <Floe />
                {looks.map((look, i) => <IceBlock key={i} look={look} x={blockX(look)} y={blockY(i)} />)}
                {won && (
                    <g className="pt-goal">
                        <path className="pt-pole" d={`M${pole} ${top} L${pole} ${top - 76}`} />
                        <path className="pt-flag" d={`M${pole} ${top - 76} L${pole + 36} ${top - 68} L${pole} ${top - 58} Z`} />
                    </g>
                )}
                <g style={{ transform: `translate(${VIEW_W / 2 - 8}px, ${top}px)` }}>
                    <g className={won ? 'pt-dance' : undefined}><Penguin mood={won ? 'dance' : 'smile'} /></g>
                </g>
            </svg>
        </div>
    );
}
