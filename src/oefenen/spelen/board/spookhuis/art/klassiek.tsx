import { useId, type CSSProperties } from 'react';
import { useFollow } from './beam';
import './klassiek.css';

// Klassiek spookhuis: an old parlour at night. Under the dark: striped wallpaper, floorboards, a moonlit window whose
// shutter creaks, two portraits whose eyes follow the light (they grin when it finds them), a grandfather clock and a
// candelabra. Above it: the moon, the window's light on the floor, candle flames, bats, a spider bobbing on its thread.
// Friendly sheet ghosts turn cards back and pop out of a pair; a mistake is a silly pumpkin. Now and then a little ghost
// peeks out from behind the clock, dust drifts in the moonlight, the cobweb sways; a found pair makes the room cheer.

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

function WindowFrame() {
    return (
        <svg viewBox="0 0 120 160">
            <path className="sph-k-curtain" d="M4 8 Q20 6 30 10 L26 60 L32 96 L22 92 L28 130 L8 150 Z" />
            <path className="sph-k-curtain" d="M116 8 Q100 6 90 10 L96 52 L88 84 L98 90 L92 128 L112 150 Z" />
            <path className="sph-k-wood" d="M22 150 V60 A38 38 0 0 1 98 60 V150 Z" />
            <path className="sph-k-sky" d="M30 144 V61 A30 30 0 0 1 90 61 V144 Z" />
            {[[44, 82, 1.6], [76, 104, 1.2], [58, 120, 1.4], [82, 72, 1]].map(([x, y, r], i) => <circle key={i} className="sph-k-star" cx={x} cy={y} r={r} />)}
            <path className="sph-k-bar" d="M60 32 V144 M30 98 H90" />
            <path className="sph-k-crack" d="M70 110 L76 116 L73 121 L80 128" />
            <rect className="sph-k-wood" x={14} y={144} width={92} height={10} rx={3} />
            {/* The right shutter hangs on one hinge and creaks to and fro. */}
            <g className="sph-k-shutter">
                <path className="sph-k-shutter-wood" d="M98 66 L118 70 L118 140 L98 144 Z" />
                <path className="sph-k-shutter-slat" d="M101 80 H115 M101 92 H115 M101 104 H115 M101 116 H115 M101 128 H115" />
            </g>
        </svg>
    );
}

function WindowGlow() {
    return (
        <svg viewBox="0 0 120 160">
            <circle className="sph-k-moon-halo" cx={47} cy={64} r={22} />
            <circle className="sph-k-moon" cx={47} cy={64} r={13} />
            <circle className="sph-k-moon-dent" cx={42} cy={60} r={3} />
            <circle className="sph-k-moon-dent" cx={52} cy={69} r={2} />
            <path className="sph-k-bar is-glow" d="M60 32 V144 M30 98 H90" />
        </svg>
    );
}

interface PortraitProps { who: 'heer' | 'kat' }

function Portrait({ who }: PortraitProps) {
    const ref = useFollow<HTMLSpanElement>(160);
    return (
        <span ref={ref} className={`sph-k-portrait is-${who}`}>
            <svg viewBox="0 0 100 124">
                <rect className="sph-k-frame" x={3} y={3} width={94} height={118} rx={12} />
                <rect className="sph-k-canvas" x={14} y={14} width={72} height={96} rx={6} />
                {who === 'heer' ? (
                    <g>
                        <path className="sph-k-coat" d="M18 110 Q22 82 50 80 Q78 82 82 110 Z" />
                        <path className="sph-k-collar" d="M42 82 L50 94 L58 82" />
                        <circle className="sph-k-skin" cx={50} cy={58} r={20} />
                        <rect className="sph-k-hat" x={33} y={20} width={34} height={22} rx={3} />
                        <rect className="sph-k-hat" x={26} y={39} width={48} height={6} rx={3} />
                        <path className="sph-k-mustache" d="M50 66 Q42 60 34 66 Q38 70 44 68 Q48 67 50 66 Q52 67 56 68 Q62 70 66 66 Q58 60 50 66 Z" />
                        <path className="sph-k-grin" d="M42 72 Q50 78 58 72" />
                    </g>
                ) : (
                    <g>
                        <path className="sph-k-ruff" d="M22 104 Q24 84 50 84 Q76 84 78 104 Z" />
                        <path className="sph-k-cat" d="M30 70 L28 36 L42 48 Q50 45 58 48 L72 36 L70 70 Q68 88 50 88 Q32 88 30 70 Z" />
                        <path className="sph-k-cat-ear" d="M31 42 L38 48 M69 42 L62 48" />
                        <path className="sph-k-nose" d="M47 68 L53 68 L50 72 Z" />
                        <path className="sph-k-whisker" d="M40 72 L24 70 M40 75 L25 78 M60 72 L76 70 M60 75 L75 78" />
                        <path className="sph-k-grin" d="M44 76 Q50 81 56 76" />
                    </g>
                )}
                {(who === 'heer' ? [[42, 56], [58, 56]] : [[41, 60], [59, 60]]).map(([x, y], i) => (
                    <g key={i}>
                        <ellipse className="sph-k-eye" cx={x} cy={y} rx={5.5} ry={6} />
                        <circle className="sph-k-pupil" cx={x} cy={y} r={2.6} />
                    </g>
                ))}
            </svg>
        </span>
    );
}

function Clock() {
    return (
        <svg viewBox="0 0 60 170">
            <path className="sph-k-clock" d="M8 26 Q8 6 30 4 Q52 6 52 26 V58 H46 V140 H52 V164 H8 V140 H14 V58 H8 Z" />
            <circle className="sph-k-clock-face" cx={30} cy={30} r={15} />
            {Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return <circle key={i} className="sph-k-tick" cx={30 + Math.sin(a) * 12} cy={30 - Math.cos(a) * 12} r={1} />; })}
            <path className="sph-k-hand is-hour" d="M30 30 L36 25" />
            <path className="sph-k-hand is-minute" d="M30 30 L30 19" />
            <rect className="sph-k-clock-glass" x={19} y={66} width={22} height={66} rx={10} />
            <g className="sph-k-pendulum">
                <path className="sph-k-rod" d="M30 62 V112" />
                <circle className="sph-k-bob" cx={30} cy={116} r={7} />
            </g>
        </svg>
    );
}

function Candelabra({ glow }: { glow?: boolean }) {
    if (glow) {
        return (
            <svg viewBox="0 0 80 110">
                {[[22, 26], [40, 16], [58, 26]].map(([x, y], i) => (
                    <g key={i} className="sph-k-flame" style={v({ '--i': i })}>
                        <circle className="sph-k-flame-halo" cx={x} cy={y - 4} r={10} />
                        <path className="sph-k-flame-fire" d={`M${x} ${y - 12} Q${x + 5} ${y - 4} ${x} ${y} Q${x - 5} ${y - 4} ${x} ${y - 12} Z`} />
                    </g>
                ))}
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 80 110">
            <path className="sph-k-table" d="M6 66 H74 V74 H6 Z M14 74 L18 108 M66 74 L62 108 M40 74 V108" />
            <path className="sph-k-brass" d="M40 64 V36 M22 44 Q22 52 40 52 Q58 52 58 44 M32 64 H48" />
            {[[22, 26], [40, 16], [58, 26]].map(([x, y], i) => <rect key={i} className="sph-k-candle" x={x - 4} y={y} width={8} height={y === 16 ? 22 : 18} rx={2} />)}
            <path className="sph-k-drip" d="M18 30 V36 M44 20 V27" />
        </svg>
    );
}

function Cobweb() {
    const spokes = [0, 22, 45, 67, 90];
    return (
        <svg viewBox="0 0 100 100">
            {spokes.map(a => { const r = (a * Math.PI) / 180; return <path key={a} className="sph-k-web" d={`M100 0 L${100 - Math.cos(r) * 100} ${Math.sin(r) * 100}`} />; })}
            {[30, 52, 74, 94].map(d => (
                <path key={d} className="sph-k-web" d={spokes.map((a, i) => { const r = (a * Math.PI) / 180; const k = i % 2 ? d * .92 : d; return `${i ? 'Q' + (100 - Math.cos(r - .2) * k * .96).toFixed(1) + ' ' + (Math.sin(r - .2) * k * .96).toFixed(1) + ' ' : 'M'}${(100 - Math.cos(r) * k).toFixed(1)} ${(Math.sin(r) * k).toFixed(1)}`; }).join(' ')} />
            ))}
        </svg>
    );
}

/** A little ghost behind the grandfather clock (same box as the clock): now and then it peeks out, looks round, ducks back. */
function PeekGhost() {
    const id = useId();
    return (
        <svg viewBox="0 0 60 170">
            {/* Only what is left of the clock's side shows: the rest of it is behind the clock. */}
            <defs><clipPath id={`${id}c`}><rect x={-80} y={0} width={88} height={170} /></clipPath></defs>
            <g clipPath={`url(#${id}c)`}>
                <g className="sph-k-peek">
                    <path className="sph-k-sheet" d="M-26 100 V62 Q-26 36 0 36 Q26 36 26 62 V100 Z" />
                    <g className="sph-k-peek-eyes">
                        <ellipse className="sph-k-ghost-eye" cx={-12} cy={60} rx={4} ry={5.4} />
                        <ellipse className="sph-k-ghost-eye" cx={1} cy={60} rx={4} ry={5.4} />
                        <circle className="sph-k-ghost-glint" cx={-11} cy={58} r={1.4} />
                        <circle className="sph-k-ghost-glint" cx={2} cy={58} r={1.4} />
                    </g>
                    <path className="sph-k-peek-mouth" d="M-10 72 Q-5 77 0 72" />
                </g>
            </g>
            {/* Its little hand curls round the clock's edge. */}
            <g className="sph-k-peek is-hand">{[80, 88, 96].map(y => <rect key={y} className="sph-k-sheet" x={9} y={y} width={10} height={7} rx={3.5} />)}</g>
        </svg>
    );
}

/** A little round bat; wings flap (CSS), hang = upside down, clapping its wings. */
export function Bat({ hang }: { hang?: boolean }) {
    return (
        <svg className={`sph-k-batart${hang ? ' is-hang' : ''}`} viewBox="0 0 80 50">
            <g className="sph-k-wing is-l"><path d="M34 24 Q22 6 4 14 Q10 18 8 24 Q14 22 16 30 Q22 24 26 32 Q30 26 34 30 Z" /></g>
            <g className="sph-k-wing is-r"><path d="M46 24 Q58 6 76 14 Q70 18 72 24 Q66 22 64 30 Q58 24 54 32 Q50 26 46 30 Z" /></g>
            <path className="sph-k-batbody" d="M32 12 L34 20 Q40 17 46 20 L48 12 L50 22 Q54 30 48 38 Q40 44 32 38 Q26 30 30 22 Z" />
            <circle className="sph-k-bateye" cx={36} cy={27} r={3.6} />
            <circle className="sph-k-bateye" cx={44} cy={27} r={3.6} />
            <circle className="sph-k-batpupil" cx={36.6} cy={27.6} r={1.6} />
            <circle className="sph-k-batpupil" cx={44.6} cy={27.6} r={1.6} />
            <path className="sph-k-batsmile" d="M37 33 Q40 36 43 33" />
            <path className="sph-k-fang" d="M38.4 33.8 L39.2 36 L40 34.4" />
        </svg>
    );
}

/** A friendly sheet ghost: round, rosy cheeks, a happy mouth; wave = one arm waves, reach = one arm reaches down. */
export function SheetGhost({ arm = 'rest' }: { arm?: 'rest' | 'wave' | 'reach' }) {
    return (
        <svg className={`sph-k-ghost is-${arm}`} viewBox="0 0 100 110">
            <g className="sph-k-ghost-bob">
                <g className="sph-k-ghost-arm is-back"><path d="M24 54 Q10 58 8 68 Q16 70 26 64" /></g>
                <path className="sph-k-sheet" d="M18 92 V48 Q18 12 50 12 Q82 12 82 48 V92 Q76 86 70 94 Q64 102 58 94 Q52 86 46 96 Q40 104 34 94 Q28 86 18 92 Z" />
                <path className="sph-k-sheet-shine" d="M30 34 Q34 22 46 20" />
                <ellipse className="sph-k-ghost-eye" cx={39} cy={46} rx={5} ry={6.5} />
                <ellipse className="sph-k-ghost-eye" cx={61} cy={46} rx={5} ry={6.5} />
                <circle className="sph-k-ghost-glint" cx={40.5} cy={43.5} r={1.8} />
                <circle className="sph-k-ghost-glint" cx={62.5} cy={43.5} r={1.8} />
                <ellipse className="sph-k-cheek" cx={31} cy={58} rx={5} ry={3} />
                <ellipse className="sph-k-cheek" cx={69} cy={58} rx={5} ry={3} />
                <path className="sph-k-ghost-mouth" d="M43 60 Q50 70 57 60 Z" />
                <g className="sph-k-ghost-arm is-front"><path d="M76 54 Q92 50 94 40 Q86 38 76 46" /></g>
            </g>
        </svg>
    );
}

/** A pumpkin: silly = the mistake's face (crossed eyes, tongue out), lit = a lantern glowing from inside. */
export function Pumpkin({ face }: { face: 'silly' | 'lit' | 'off' }) {
    return (
        <svg className={`sph-k-pumpkin is-${face}`} viewBox="0 0 100 92">
            <path className="sph-k-stem" d="M48 20 Q46 8 54 4 L58 8 Q53 12 54 20 Z" />
            <path className="sph-k-leaf" d="M56 12 Q70 2 78 10 Q68 16 58 16 Z" />
            <path className="sph-k-pumpkin-body" d="M50 20 Q66 14 82 24 Q98 38 92 62 Q84 88 50 86 Q16 88 8 62 Q2 38 18 24 Q34 14 50 20 Z" />
            <path className="sph-k-rib" d="M50 22 Q40 52 50 84 M50 22 Q60 52 50 84 M30 22 Q16 52 30 82 M70 22 Q84 52 70 82" />
            {face === 'silly' ? (
                <>
                    <path className="sph-k-xeye" d="M28 40 L38 50 M38 40 L28 50 M62 40 L72 50 M72 40 L62 50" />
                    <path className="sph-k-silly-mouth" d="M32 62 Q50 76 68 62" />
                    <path className="sph-k-tongue" d="M48 68 Q50 80 58 76 Q60 70 58 67" />
                </>
            ) : (
                <>
                    <path className="sph-k-cut" d="M28 48 L36 36 L44 48 Z M56 48 L64 36 L72 48 Z" />
                    <path className="sph-k-cut" d="M26 60 Q50 80 74 60 L66 62 L62 68 L56 63 L50 70 L44 63 L38 68 L34 62 Z" />
                </>
            )}
        </svg>
    );
}

export function Room({ lit }: { lit: boolean }) {
    return (
        <div className={`sph-k-room${lit ? ' is-lit' : ''}`}>
            <span className="sph-k-skirting" />
            <span className="sph-k-window"><WindowFrame /></span>
            <span className="sph-k-p1"><Portrait who="heer" /></span>
            <span className="sph-k-p2"><Portrait who="kat" /></span>
            <span className="sph-k-cobweb"><Cobweb /></span>
            <span className="sph-k-clockbox"><Clock /></span>
            <span className="sph-k-candles"><Candelabra /></span>
            <span className="sph-k-rug" />
        </div>
    );
}

export function Life({ lit }: { lit: boolean }) {
    return (
        <div className={`sph-k-life${lit ? ' is-lit' : ''}`}>
            <span className="sph-k-shaft" />
            <span className="sph-k-window is-glow"><WindowGlow /></span>
            <span className="sph-k-candles is-glow"><Candelabra glow /></span>
            <span className="sph-k-motes">{[12, 30, 46, 22, 58, 38, 70, 50].map((x, i) => <i key={i} style={v({ '--i': i, '--x': `${x}%` })} />)}</span>
            <span className="sph-k-clockbox is-peek"><PeekGhost /></span>
            <span className="sph-k-spider">
                <svg viewBox="0 0 40 120">
                    <path className="sph-k-thread" d="M20 0 V78" />
                    <g className="sph-k-spider-body">
                        <path className="sph-k-legs" d="M14 80 L4 72 M14 84 L2 84 M14 88 L4 96 M26 80 L36 72 M26 84 L38 84 M26 88 L36 96" />
                        <circle className="sph-k-spider-fill" cx={20} cy={85} r={10} />
                        <circle className="sph-k-bateye" cx={16} cy={84} r={3} />
                        <circle className="sph-k-bateye" cx={24} cy={84} r={3} />
                        <circle className="sph-k-batpupil" cx={16} cy={85} r={1.4} />
                        <circle className="sph-k-batpupil" cx={24} cy={85} r={1.4} />
                        <path className="sph-k-batsmile" d="M17 90 Q20 92 23 90" />
                    </g>
                </svg>
            </span>
            {[0, 1, 2].map(i => <span key={i} className="sph-k-bat" style={v({ '--i': i })}><span className="sph-k-bat-bob"><Bat /></span></span>)}
        </div>
    );
}

export function Party() {
    return (
        <>
            <span className="sph-k-rail" />
            {[0, 1, 2, 3].map(i => <span key={`b${i}`} className="sph-k-hanger" style={v({ '--i': i, '--x': `${[8, 21, 79, 92][i]}%` })}><Bat hang /></span>)}
            {[0, 1, 2].map(i => <span key={`g${i}`} className="sph-k-crowd" style={v({ '--i': i })}><SheetGhost arm="wave" /></span>)}
            {[0, 1].map(i => <span key={`p${i}`} className="sph-k-lantern" style={v({ '--i': i })}><Pumpkin face="lit" /></span>)}
        </>
    );
}

export function CardBack() {
    return (
        <g className="sph-k-back">
            <rect className="sph-k-back-fill" x={3} y={3} width={94} height={80} rx={9} />
            <rect className="sph-k-back-line" x={10} y={10} width={80} height={66} rx={6} />
            <path className="sph-k-back-ghost" d="M38 62 V40 Q38 24 50 24 Q62 24 62 40 V62 Q58 58 55 62 Q52 66 50 62 Q47 58 44 62 Q41 66 38 62 Z" />
            <circle className="sph-k-back-eye" cx={46} cy={40} r={2.2} />
            <circle className="sph-k-back-eye" cx={54} cy={40} r={2.2} />
            {[[20, 20], [80, 22], [22, 66], [78, 64]].map(([x, y], i) => <circle key={i} className="sph-k-back-dot" cx={x} cy={y} r={2} />)}
        </g>
    );
}

export const Flipper = ({ trick }: { trick: boolean }) => <SheetGhost arm={trick ? 'reach' : 'wave'} />;
export const Pop = () => <SheetGhost arm="wave" />;
export const Mistake = () => <Pumpkin face="silly" />;
export const Mark = ({ on }: { on: boolean }) => <Pumpkin face={on ? 'lit' : 'off'} />;
