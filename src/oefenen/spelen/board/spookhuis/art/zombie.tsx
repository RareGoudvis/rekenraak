import { useId, type CSSProperties } from 'react';
import './zombie.css';

// Zombiehuis: the cellar of an old boarded-up farmhouse at night. Under the dark: a stone wall, floorboards, a shelf
// of jars, crates and a barrel, a boarded window. Above it: a bare bulb that flickers (flies circling it), zombies
// shuffling past behind the window's planks, now and then a zombie hand popping out of the floor to wave. Silly, never
// scary (the Zombies game's style: round, green, googly eyes). A zombie shambles across to turn cards back ("Breinnn!"),
// a pair makes one dance, a mistake is a wobbly brain jelly. The pair counter is a row of little bulbs. The jars bubble,
// a cobweb sways in the corner, now and then a zombie peeks over the barrel; a found pair makes the cellar cheer.

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

type Pose = 'shamble' | 'reach' | 'dance';

/** A round silly zombie: googly eyes (one bigger), a stitched shirt, arms out. */
export function Zombie({ pose = 'shamble', shirt = 0 }: { pose?: Pose; shirt?: number }) {
    return (
        <svg className={`sph-z-zombie is-${pose}`} viewBox="0 0 100 130" style={v({ '--shirt': `var(--spel-fill-${shirt % 6})` })}>
            <g className="sph-z-bob">
                <g className="sph-z-leg is-b"><rect className="sph-z-pants" x={54} y={94} width={14} height={26} rx={6} /><ellipse className="sph-z-shoe" cx={60} cy={122} rx={11} ry={5} /></g>
                <g className="sph-z-leg is-a"><rect className="sph-z-pants" x={32} y={94} width={14} height={26} rx={6} /><ellipse className="sph-z-shoe" cx={38} cy={122} rx={11} ry={5} /></g>
                <g className="sph-z-arm is-b"><path className="sph-z-arm-ink" d="M40 78 L10 74" /><path className="sph-z-arm-skin is-back" d="M40 78 L10 74" /></g>
                <ellipse className="sph-z-skin" cx={50} cy={78} rx={25} ry={24} />
                <path className="sph-z-shirt" d="M25 78 Q50 62 75 78 L76 96 L69 102 L62 95 L55 103 L48 95 L41 103 L34 95 L27 101 L24 94 Z" />
                <path className="sph-z-stitch" d="M44 72 V90 M40 76 H48 M40 82 H48 M40 88 H48" />
                <g className="sph-z-head">
                    <circle className="sph-z-skin" cx={50} cy={38} r={26} />
                    <path className="sph-z-hair" d="M40 14 Q45 4 51 12 Q56 4 62 13" />
                    <circle className="sph-z-eye" cx={39} cy={35} r={10} />
                    <circle className="sph-z-eye" cx={62} cy={32} r={7.5} />
                    <circle className="sph-z-pupil" cx={36} cy={38} r={4.4} />
                    <circle className="sph-z-pupil" cx={64} cy={30} r={3.4} />
                    <path className="sph-z-mouth" d="M36 52 Q48 60 62 50" />
                    <rect className="sph-z-tooth" x={45} y={54} width={6} height={6} rx={1} />
                    <path className="sph-z-patch" d="M66 46 L74 42 M68 49 L72 40" />
                </g>
                <g className="sph-z-arm is-a"><path className="sph-z-arm-ink" d="M38 72 L6 68" /><path className="sph-z-arm-skin" d="M38 72 L6 68" /></g>
            </g>
        </svg>
    );
}

function Bulb({ glow }: { glow?: boolean }) {
    if (glow) {
        return (
            <svg viewBox="0 0 100 200" className="sph-z-bulbglow">
                <path className="sph-z-cone" d="M50 92 L-60 200 L160 200 Z" />
                <circle className="sph-z-halo" cx={50} cy={92} r={30} />
                <circle className="sph-z-glass is-on" cx={50} cy={92} r={13} />
                {[0, 1, 2].map(i => <circle key={i} className="sph-z-fly" cx={50} cy={92} r={2.2} style={v({ '--i': i })} />)}
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 100 200">
            <path className="sph-z-wire" d="M50 0 V76" />
            <rect className="sph-z-socket" x={43} y={72} width={14} height={10} rx={2} />
            <circle className="sph-z-glass" cx={50} cy={92} r={13} />
        </svg>
    );
}

function Window() {
    return (
        <svg viewBox="0 0 120 120">
            <rect className="sph-z-frame" x={6} y={6} width={108} height={108} rx={4} />
            <rect className="sph-z-pane" x={16} y={16} width={88} height={88} />
            <path className="sph-z-plank" d="M2 28 L118 40 L118 56 L2 44 Z" />
            <path className="sph-z-plank" d="M2 74 L118 64 L118 80 L2 90 Z" />
            <path className="sph-z-plank" d="M30 2 L46 2 L50 118 L34 118 Z" />
            <circle className="sph-z-nail" cx={10} cy={36} r={2} />
            <circle className="sph-z-nail" cx={110} cy={48} r={2} />
            <circle className="sph-z-nail" cx={110} cy={72} r={2} />
            <circle className="sph-z-nail" cx={42} cy={10} r={2} />
        </svg>
    );
}

/** The window's glass above the dark: the moon and, now and then, a zombie shuffling past behind the planks. */
function WindowLife() {
    const id = useId();
    return (
        <svg viewBox="0 0 120 120">
            <defs><clipPath id={`${id}pane`}><rect x={16} y={16} width={88} height={88} /></clipPath></defs>
            <g clipPath={`url(#${id}pane)`}>
                <rect className="sph-z-pane is-glow" x={16} y={16} width={88} height={88} />
                <circle className="sph-z-moon" cx={78} cy={34} r={11} />
                <g className="sph-z-passer"><g transform="translate(0 48) scale(.62)"><Zombie /></g></g>
            </g>
            <path className="sph-z-plank" d="M2 28 L118 40 L118 56 L2 44 Z" />
            <path className="sph-z-plank" d="M2 74 L118 64 L118 80 L2 90 Z" />
            <path className="sph-z-plank" d="M30 2 L46 2 L50 118 L34 118 Z" />
        </svg>
    );
}

function Shelf() {
    return (
        <svg viewBox="0 0 120 150">
            <path className="sph-z-wood" d="M4 52 H116 V60 H4 Z M4 112 H116 V120 H4 Z M10 60 V150 M110 60 V150" />
            {[[14, 26, 1], [40, 20, 2], [66, 30, 3], [90, 24, 0]].map(([x, h, c], i) => (
                <g key={i}>
                    <rect className="sph-z-jar" x={x} y={52 - h} width={20} height={h} rx={5} style={v({ '--c': `var(--spel-fill-${c})` })} />
                    <rect className="sph-z-lid" x={x + 2} y={48 - h} width={16} height={6} rx={2} />
                    {/* Whatever is in the jar bubbles away. */}
                    {[0, 1].map(k => <circle key={k} className="sph-z-bub" cx={x + 7 + k * 6} cy={49} r={1.8 - k * .4} style={v({ '--h': h - 9, '--i': i * 2 + k })} />)}
                </g>
            ))}
            {[[16, 22], [46, 30], [80, 26]].map(([x, h], i) => <rect key={i} className="sph-z-box" x={x} y={112 - h} width={26} height={h} rx={2} />)}
        </svg>
    );
}

function Crates() {
    return (
        <svg viewBox="0 0 120 110">
            <rect className="sph-z-box" x={6} y={46} width={58} height={60} rx={3} />
            <path className="sph-z-boxline" d="M6 46 L64 106 M64 46 L6 106" />
            <ellipse className="sph-z-barrel" cx={90} cy={70} rx={24} ry={36} />
            <path className="sph-z-hoop" d="M66 52 Q90 58 114 52 M66 88 Q90 94 114 88" />
            <rect className="sph-z-box" x={20} y={8} width={40} height={38} rx={3} />
            <path className="sph-z-boxline" d="M20 27 H60" />
        </svg>
    );
}

/** A zombie peeking over the barrel (the crates' box): it rises, looks round with its googly eyes, sinks back. */
function PeekZombie() {
    const id = useId();
    return (
        <svg viewBox="0 0 120 110">
            <defs><clipPath id={`${id}b`}><rect x={60} y={-80} width={60} height={116} /></clipPath></defs>
            <g clipPath={`url(#${id}b)`}>
                <g className="sph-z-peek">
                    <circle className="sph-z-skin" cx={90} cy={22} r={17} />
                    <path className="sph-z-hair" d="M83 6 Q87 0 91 6 Q95 0 99 7" />
                    <g className="sph-z-peek-eyes">
                        <circle className="sph-z-eye" cx={83} cy={20} r={6.5} />
                        <circle className="sph-z-eye" cx={98} cy={18} r={5} />
                        <circle className="sph-z-pupil" cx={82} cy={22} r={2.8} />
                        <circle className="sph-z-pupil" cx={99} cy={17} r={2.2} />
                    </g>
                    <path className="sph-z-mouth" d="M84 31 Q91 35 97 30" />
                </g>
            </g>
            {/* Its fingers on the barrel's rim. */}
            <g className="sph-z-peek is-hand">
                {[76, 82, 98, 104].map(x => <rect key={x} className="sph-z-handskin" x={x - 2.6} y={30} width={5.2} height={9} rx={2.6} />)}
            </g>
        </svg>
    );
}

/** A cobweb for a corner, swaying a little. */
function ZWeb() {
    return (
        <svg viewBox="0 0 100 100">
            {[0, 30, 60, 90].map(a => { const r = (a * Math.PI) / 180; return <path key={a} className="sph-z-web" d={`M0 0 L${Math.cos(r) * 96} ${Math.sin(r) * 96}`} />; })}
            {[30, 56, 82].map(d => <path key={d} className="sph-z-web" d={`M${d} 0 Q${d * .78} ${d * .3} ${d * .87} ${d * .5} Q${d * .55} ${d * .62} ${d * .5} ${d * .87} Q${d * .3} ${d * .78} 0 ${d}`} />)}
        </svg>
    );
}

/** A zombie hand from the floor: rises, waves its fingers, sinks back. */
function Hand({ wave }: { wave?: boolean }) {
    return (
        <svg viewBox="0 0 60 90" className={`sph-z-hand${wave ? ' is-wave' : ''}`}>
            <g className="sph-z-hand-rise">
                <path className="sph-z-handskin" d="M22 90 V50 L14 30 Q12 24 17 23 Q21 23 23 30 L24 22 Q24 14 29 14 Q33 14 33 22 L34 16 Q35 9 40 10 Q44 11 43 18 L43 26 Q45 20 49 22 Q52 24 50 32 L44 52 V90 Z" />
                <path className="sph-z-cuff" d="M18 74 H48 V90 H18 Z" />
            </g>
            <path className="sph-z-dirt" d="M2 88 Q12 76 22 84 Q30 74 40 82 Q50 76 58 88 Z" />
        </svg>
    );
}

/** A brain jelly on a plate: the mistake, wobbling. */
function Jelly() {
    return (
        <svg viewBox="0 0 100 90" className="sph-z-jelly">
            <ellipse className="sph-z-plate" cx={50} cy={78} rx={44} ry={9} />
            <g className="sph-z-wobble">
                <path className="sph-z-brain" d="M14 74 Q6 52 20 40 Q20 22 40 22 Q50 12 62 22 Q82 20 84 40 Q96 54 86 74 Z" />
                <path className="sph-z-fold" d="M50 24 Q46 40 52 52 Q48 62 50 74 M30 36 Q38 42 34 52 Q28 58 34 66 M70 34 Q62 44 68 52 Q74 60 66 68" />
                <circle className="sph-z-shine" cx={30} cy={44} r={4} />
                <circle className="sph-z-jeye" cx={40} cy={56} r={3} />
                <circle className="sph-z-jeye" cx={60} cy={56} r={3} />
                <path className="sph-z-jmouth" d="M44 64 Q50 69 56 64" />
            </g>
        </svg>
    );
}

/** One pair in the counter: a little light bulb, on once found. */
function BulbMark({ on }: { on: boolean }) {
    return (
        <svg viewBox="0 0 40 40" className={`sph-z-mark${on ? ' is-on' : ''}`}>
            <circle className="sph-z-mark-glass" cx={20} cy={16} r={12} />
            <rect className="sph-z-mark-base" x={14} y={27} width={12} height={9} rx={2} />
            <path className="sph-z-mark-wire" d="M16 20 Q20 12 24 20" />
        </svg>
    );
}

export function Room({ lit }: { lit: boolean }) {
    return (
        <div className={`sph-z-room${lit ? ' is-lit' : ''}`}>
            <span className="sph-z-skirting" />
            <span className="sph-z-window"><Window /></span>
            <span className="sph-z-shelf"><Shelf /></span>
            <span className="sph-z-crates"><Crates /></span>
            <span className="sph-z-bulb"><Bulb /></span>
        </div>
    );
}

export function Life({ lit }: { lit: boolean }) {
    return (
        <div className={`sph-z-life${lit ? ' is-lit' : ''}`}>
            <span className="sph-z-bulb is-glow"><Bulb glow /></span>
            <span className="sph-z-window is-glow"><WindowLife /></span>
            <span className="sph-z-handbox"><Hand /></span>
            <span className="sph-z-crates is-peek"><PeekZombie /></span>
            <span className="sph-z-webbox"><ZWeb /></span>
        </div>
    );
}

export function Party() {
    return (
        <>
            {[0, 1, 2].map(i => <span key={`z${i}`} className="sph-z-dancer" style={v({ '--i': i })}><Zombie pose="dance" shirt={i * 2 + 1} /></span>)}
            {[0, 1].map(i => <span key={`h${i}`} className="sph-z-cheer" style={v({ '--i': i })}><Hand wave /></span>)}
            <span className="sph-z-disco"><Bulb glow /></span>
        </>
    );
}

export function CardBack() {
    return (
        <g className="sph-z-back">
            <rect className="sph-z-back-fill" x={3} y={3} width={94} height={80} rx={9} />
            <path className="sph-z-back-grain" d="M10 24 Q50 18 90 26 M10 46 Q50 40 90 48 M10 66 Q50 60 90 68" />
            <path className="sph-z-back-hand" d="M44 64 V48 L39 38 Q38 35 41 35 L44 40 V31 Q44 28 47 28 Q50 28 50 31 V38 L51 30 Q52 27 55 28 Q57 29 56 32 L55 40 Q57 36 60 37 Q62 39 60 43 L56 52 V64 Z" />
            {[[12, 12], [88, 12], [12, 74], [88, 74]].map(([x, y], i) => <circle key={i} className="sph-z-back-nail" cx={x} cy={y} r={2.4} />)}
        </g>
    );
}

export const Flipper = ({ trick }: { trick: boolean }) => <Zombie pose={trick ? 'reach' : 'shamble'} shirt={3} />;
export const Pop = () => <Zombie pose="dance" shirt={0} />;
export const Mistake = Jelly;
export const Mark = BulbMark;
