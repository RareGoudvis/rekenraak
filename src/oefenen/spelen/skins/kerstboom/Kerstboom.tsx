import { useEffect, useState, type CSSProperties } from 'react';
import { formatMathNumber } from '../../../../services/math/formatters';
import SpelKeypad from '../../SpelKeypad';
import type { SkinEndingProps, SkinProps } from '../types';
import { DECOR, DECOR_ALL, FLOOR, LIGHTS, VIEW_H, VIEW_W, hungFor, type Decor } from './tree';
import './kerstboom.css';

// Kerstboom versieren: the calm Kerst game. A bare fir tree in a cosy room; each right answer hangs the next
// bauble or garland, the star goes on top last. A mistake never takes one off. The finished tree lights up.

const STAR = 'M160 14 L168 32 L188 33 L172 45 L178 64 L160 53 L142 64 L148 45 L132 33 L152 32 Z';

function Ornament({ d, isNew }: { d: Decor; isNew: boolean }) {
    if (d.kind === 'tinsel') {
        return (
            <g className={`kb-tinsel${isNew ? ' is-new' : ''}`}>
                <path className="kb-tinsel-edge" d={d.d} pathLength={100} />
                <path className="kb-tinsel-gold" d={d.d} pathLength={100} />
                <path className="kb-tinsel-glint" d={d.d} pathLength={100} />
            </g>
        );
    }
    const { x, y, c } = d;
    return (
        <g className={`kb-bauble${isNew ? ' is-new' : ''}`} style={{ transformOrigin: `${x}px ${y - 20}px` }}>
            <path className="kb-hook" d={`M${x} ${y - 20} L${x} ${y - 14}`} />
            <rect className="kb-cap" x={x - 4} y={y - 15} width="8" height="5" rx="1.5" />
            <circle className="kb-ball" cx={x} cy={y} r="11" style={{ fill: `var(--kb-ball-${c})` }} />
            <path className="kb-shine" d={`M${x - 6} ${y - 2} A6 6 0 0 1 ${x - 1} ${y - 7}`} />
        </g>
    );
}

function Present({ x, w, h, c }: { x: number; w: number; h: number; c: number }) {
    const y = FLOOR + 10 - h;
    return (
        <g className="kb-present" style={{ fill: `var(--kb-ball-${c})` }}>
            <rect x={x} y={y} width={w} height={h} rx="3" />
            <path className="kb-ribbon" d={`M${x + w / 2} ${y} L${x + w / 2} ${y + h} M${x} ${y + h / 2} L${x + w} ${y + h / 2}`} />
            <path className="kb-bow" d={`M${x + w / 2} ${y} Q${x + w / 2 - 12} ${y - 12} ${x + w / 2 - 2} ${y - 1} Q${x + w / 2 + 12} ${y - 12} ${x + w / 2 + 2} ${y - 1}`} />
        </g>
    );
}

/** The room with the tree: `hung` decorations (the star at DECOR_ALL), lit when finished. */
export function KerstScene({ hung, lit, newest = -1 }: { hung: number; lit: boolean; newest?: number }) {
    const star = hung >= DECOR_ALL;
    return (
        <svg className="kb-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMax meet" aria-hidden>
            <rect className="kb-wall" x={-2000} y={-2000} width={4000 + VIEW_W} height={2000 + FLOOR} />
            <rect className="kb-floor" x={-2000} y={FLOOR} width={4000 + VIEW_W} height={2000} />
            <g className="kb-window">
                <rect x="12" y="44" width="72" height="92" rx="6" />
                <circle className="kb-moon" cx="64" cy="66" r="10" />
                {[[26, 60], [44, 82], [30, 104], [58, 96], [72, 118], [40, 124], [22, 84]].map(([x, y]) => <circle key={`${x}-${y}`} className="kb-snow" cx={x} cy={y} r="2.6" />)}
                <path className="kb-frame" d="M48 44 L48 136 M12 90 L84 90" />
                <rect className="kb-sill" x="6" y="134" width="84" height="8" rx="3" />
            </g>
            <ellipse className="kb-rug" cx="160" cy={FLOOR + 22} rx="128" ry="16" />
            <g className={`kb-tree${lit ? ' is-lit' : ''}`}>
                {lit && <circle className="kb-glow" cx="160" cy="180" r="130" />}
                <rect className="kb-trunk" x="146" y="286" width="28" height="18" />
                <path className="kb-pot" d="M122 304 L198 304 L190 338 L130 338 Z" />
                <rect className="kb-pot-rim" x="116" y="298" width="88" height="12" rx="5" />
                <path className="kb-tier" d="M160 150 L265 288 Q237 300 210 290 Q185 300 160 290 Q135 300 110 290 Q83 300 55 288 Z" />
                <path className="kb-tier" d="M160 92 L245 218 Q217 228 188 220 Q160 230 132 220 Q103 228 75 218 Z" />
                <path className="kb-tier" d="M160 40 L220 148 Q190 158 160 150 Q130 158 100 148 Z" />
                {lit && LIGHTS.map(([x, y], i) => <circle key={i} className="kb-light" cx={x} cy={y} r="4" style={{ '--i': i % 7 } as CSSProperties} />)}
                {DECOR.slice(0, Math.min(hung, DECOR.length)).map((d, i) => <Ornament key={i} d={d} isNew={i === newest} />)}
                {star && (
                    <g className={`kb-star${newest === DECOR.length ? ' is-new' : ''}`}>
                        <path d={STAR} />
                    </g>
                )}
            </g>
            {lit && (
                <g className="kb-presents">
                    <Present x={62} w={40} h={30} c={1} />
                    <Present x={214} w={34} h={26} c={0} />
                    <Present x={250} w={26} h={20} c={2} />
                </g>
            )}
        </svg>
    );
}

export default function Kerstboom({ question, phase, feedback, onAnswer, progress, events, reducedMotion }: SkinProps) {
    const target = progress.goal?.target ?? DECOR_ALL;
    const hung = hungFor(progress.goal?.count ?? progress.right, target);
    // The decoration that just went up (it swings in); none after a mistake or on mount.
    const [seen, setSeen] = useState({ hung, newest: -1 });
    if (seen.hung !== hung) setSeen({ hung, newest: hung > seen.hung ? hung - 1 : -1 });
    const [sway, setSway] = useState(0);
    useEffect(() => events.on('wrong', () => setSway(s => s + 1)), [events]);

    if (!question) return <div className="kb-root" />;
    const flash = phase === 'right' || phase === 'wrong';
    const [before, after = ''] = question.text.split('?');
    const lit = hung >= DECOR_ALL;

    return (
        <div className={`kb-root${phase === 'help' ? ' is-paused' : ''}${reducedMotion ? ' is-still' : ''}${sway ? ` is-sway-${sway % 2}` : ''}`}>
            <div className="kb-world">
                <KerstScene hung={hung} lit={lit} newest={seen.newest} />
            </div>
            <div className="kb-panel">
                <p className={`kb-sign kiosk-math${flash ? ' is-solved' : ''}`} aria-live="polite">
                    {flash && feedback
                        ? <>{before}<span className="kb-sign-answer">{formatMathNumber(Number(feedback.expected))}</span>{after}</>
                        : question.text}
                </p>
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
            <KerstScene hung={hung} lit={hung >= DECOR_ALL} />
        </div>
    );
}
