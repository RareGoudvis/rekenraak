import { useId, type CSSProperties } from 'react';
import { useFollow } from './beam';
import './schip.css';

// Spookschip: the hold of a sunken ghost ship. Under the dark: curved planks and ribs, portholes, barrels, a skeleton
// pirate on a barrel (his skull turns to the light), a treasure chest. Above it: green glowing water behind the
// portholes with bubbles and a little fish, lanterns swinging on their hooks, the chest's glow, a parrot skeleton
// bobbing on a beam. The whole hold rocks a little. Goofy, never scary: round skulls, eye patches, big grins.
// A ghost pirate floats by to turn cards back ("Arrr!"), a pair pops a chest open with coins, a mistake is a rusty anchor.
// A friendly octopus peeks in at a porthole now and then, a crab scuttles across the floor, a found pair makes the hold cheer.

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

// A bone: an ink stroke with the bone colour on top, so thin bones keep the sticker outline.
const Bone = ({ d }: { d: string }) => <><path className="sph-s-bone-ink" d={d} /><path className="sph-s-bone" d={d} /></>;

function Porthole({ glow, octo }: { glow?: boolean; octo?: boolean }) {
    const id = useId();
    if (!glow) {
        return (
            <svg viewBox="0 0 100 100">
                <circle className="sph-s-rim" cx={50} cy={50} r={44} />
                <circle className="sph-s-water is-dim" cx={50} cy={50} r={32} />
                {[0, 60, 120, 180, 240, 300].map(a => { const r = (a * Math.PI) / 180; return <circle key={a} className="sph-s-bolt" cx={50 + Math.cos(r) * 38} cy={50 + Math.sin(r) * 38} r={2.6} />; })}
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 100 100">
            <defs><clipPath id={`${id}w`}><circle cx={50} cy={50} r={32} /></clipPath></defs>
            <circle className="sph-s-glowring" cx={50} cy={50} r={40} />
            <g clipPath={`url(#${id}w)`}>
                <circle className="sph-s-water" cx={50} cy={50} r={32} />
                <path className="sph-s-weed" d="M30 84 Q24 70 32 60 Q38 50 30 40 M66 86 Q74 72 66 62" />
                <g className="sph-s-fish"><path d="M0 0 Q8 -7 16 0 Q8 7 0 0 Z M16 0 L23 -5 L23 5 Z" /><circle cx={5} cy={-1} r={1.3} /></g>
                {[0, 1, 2].map(i => <circle key={i} className="sph-s-bubble" cx={40 + i * 9} cy={84} r={2.4 + (i % 2)} style={v({ '--i': i })} />)}
                {octo && (
                    // The octopus rises into the porthole, has a look, waves a tentacle and sinks back.
                    <g className="sph-s-octo">
                        <path className="sph-s-octo-arm is-wave" d="M64 74 Q78 66 76 52 Q74 46 70 50" />
                        <path className="sph-s-octo-skin" d="M32 92 Q30 56 50 54 Q70 56 68 92 Z" />
                        <circle className="sph-s-octo-eye" cx={43} cy={70} r={5.4} />
                        <circle className="sph-s-octo-eye" cx={57} cy={70} r={5.4} />
                        <circle className="sph-s-octo-pupil" cx={44} cy={71} r={2.4} />
                        <circle className="sph-s-octo-pupil" cx={58} cy={71} r={2.4} />
                        <path className="sph-s-octo-smile" d="M45 80 Q50 84 55 80" />
                        <circle className="sph-s-octo-spot" cx={50} cy={60} r={2.2} />
                        <circle className="sph-s-octo-spot" cx={38} cy={64} r={1.6} />
                    </g>
                )}
            </g>
            <circle className="sph-s-glass" cx={50} cy={50} r={32} />
            <path className="sph-s-glint" d="M30 38 Q34 28 44 24" />
        </svg>
    );
}

function Lantern({ glow }: { glow?: boolean }) {
    return (
        <svg viewBox="0 0 60 130" className="sph-s-lanternart">
            <g className="sph-s-swing">
                <path className="sph-s-rope" d="M30 0 V40" />
                {glow ? (
                    <>
                        <circle className="sph-s-lamp-halo" cx={30} cy={80} r={26} />
                        <path className="sph-s-flame" d="M30 66 Q37 78 30 88 Q23 78 30 66 Z" />
                    </>
                ) : (
                    <>
                        <path className="sph-s-iron" d="M20 46 H40 L44 56 H16 Z" />
                        <rect className="sph-s-lamp" x={16} y={56} width={28} height={44} rx={6} />
                        <path className="sph-s-iron" d="M16 100 H44 L40 108 H20 Z M22 56 V100 M38 56 V100" />
                        <circle className="sph-s-ring" cx={30} cy={42} r={5} />
                    </>
                )}
            </g>
        </svg>
    );
}

/** The ship's treasure chest; open = the lid flips up and coins spill (the pair moment). */
export function Chest({ open, glow }: { open?: boolean; glow?: boolean }) {
    if (glow) {
        return (
            <svg viewBox="0 0 120 100">
                <path className="sph-s-chestglow" d="M18 52 Q60 30 102 52 L102 58 Q60 40 18 58 Z" />
                <ellipse className="sph-s-chesthalo" cx={60} cy={56} rx={58} ry={30} />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 120 100" className={`sph-s-chest${open ? ' is-open' : ''}`}>
            {open && <ellipse className="sph-s-chesthalo is-open" cx={60} cy={40} rx={60} ry={34} />}
            <rect className="sph-s-chestbox" x={12} y={52} width={96} height={44} rx={5} />
            <path className="sph-s-band" d="M12 66 H108 M34 52 V96 M86 52 V96" />
            {open && (
                <g className="sph-s-hoard">
                    <path className="sph-s-gold" d="M18 54 Q30 38 44 46 Q56 34 70 44 Q84 36 100 54 Z" />
                    {[[30, 46], [46, 40], [62, 42], [78, 40], [92, 48], [54, 48]].map(([x, y], i) => <circle key={i} className="sph-s-coin" cx={x} cy={y} r={5} />)}
                    <path className="sph-s-gem" d="M58 32 L64 26 L70 32 L64 40 Z" />
                </g>
            )}
            <g className="sph-s-lid">
                <path className="sph-s-chestbox" d="M10 54 Q10 20 60 18 Q110 20 110 54 Z" />
                <path className="sph-s-band" d="M34 22 Q32 36 34 54 M86 22 Q88 36 86 54" />
            </g>
            <rect className="sph-s-lock" x={52} y={48} width={16} height={16} rx={3} />
            <circle className="sph-s-keyhole" cx={60} cy={55} r={2.2} />
        </svg>
    );
}

/** A goofy skeleton pirate on a barrel; his skull turns towards the light and grins when it finds him. */
function Skeleton({ cheer }: { cheer?: boolean }) {
    const ref = useFollow<SVGGElement>(220);
    return (
        <svg viewBox="0 0 100 150" className={`sph-s-skel${cheer ? ' is-cheer' : ''}`}>
            {!cheer && (
                <g>
                    <ellipse className="sph-s-barrel" cx={50} cy={124} rx={34} ry={24} />
                    <path className="sph-s-hoop" d="M18 114 Q50 122 82 114 M18 134 Q50 142 82 134" />
                </g>
            )}
            <g className="sph-s-skel-body">
                <path className="sph-s-coat" d="M30 104 Q28 70 50 66 Q72 70 70 104 Z" />
                <path className="sph-s-rib" d="M42 76 H58 M41 84 H59 M42 92 H58 M50 72 V98" />
                <g className="sph-s-arm is-l"><Bone d="M34 74 L18 92 L14 104" /></g>
                <g className="sph-s-arm is-r"><Bone d="M66 74 L82 92 L86 104" />{cheer && <path className="sph-s-hatwave" d="M80 100 Q86 88 98 94 L94 104 Z" />}</g>
                <Bone d="M40 104 L36 128 M60 104 L64 128" />
                <g ref={ref} className="sph-s-skull">
                    <path className="sph-s-bonefill" d="M28 42 Q28 18 50 18 Q72 18 72 42 Q72 52 64 56 V64 H36 V56 Q28 52 28 42 Z" />
                    <path className="sph-s-hat" d="M22 26 Q50 2 78 26 Q66 20 50 22 Q34 20 22 26 Z" />
                    <path className="sph-s-hatband" d="M30 24 Q50 14 70 24" />
                    <circle className="sph-s-socket" cx={41} cy={40} r={7} />
                    <path className="sph-s-patch" d="M54 33 H68 V44 Q61 50 54 44 Z M30 30 L54 36 M68 36 L74 32" />
                    <circle className="sph-s-glint" cx={41} cy={40} r={2.6} />
                    <path className="sph-s-nose" d="M48 48 L50 44 L52 48 Z" />
                    <path className="sph-s-teeth" d="M38 56 H62 M42 52 V60 M48 52 V60 M54 52 V60 M60 52 V60" />
                </g>
            </g>
        </svg>
    );
}

/** The parrot's skeleton on its perch: bobs its head, flaps on the party. */
function Parrot({ flap }: { flap?: boolean }) {
    return (
        <svg viewBox="0 0 80 90" className={`sph-s-parrot${flap ? ' is-flap' : ''}`}>
            <path className="sph-s-perch" d="M4 72 H76" />
            <g className="sph-s-parrot-bob">
                <Bone d="M34 70 L32 58 M44 70 L46 58" />
                <g className="sph-s-pwing"><path className="sph-s-bonefill" d="M30 40 Q14 46 18 62 Q26 56 32 52 Z" /><path className="sph-s-feather" d="M20 50 L28 48 M20 56 L29 52" /></g>
                <path className="sph-s-bonefill" d="M32 58 Q26 44 34 34 Q42 28 50 34 Q56 44 48 58 Z" />
                <path className="sph-s-rib" d="M35 42 H47 M35 48 H47" />
                <path className="sph-s-bonefill" d="M34 34 Q30 16 44 14 Q56 14 56 26 Q56 34 48 36 Z" />
                <path className="sph-s-beak" d="M54 20 Q66 22 60 34 Q58 28 54 28 Z" />
                <circle className="sph-s-socket" cx={46} cy={24} r={4.4} />
                <circle className="sph-s-glint" cx={46} cy={24} r={1.6} />
                <path className="sph-s-crest" d="M40 14 Q34 4 42 2 M44 14 Q44 6 50 6" />
            </g>
        </svg>
    );
}

/** A little crab, scuttling sideways along the floor, claws snapping. */
function Crab() {
    return (
        <svg viewBox="0 0 80 50" className="sph-s-crab-art">
            <g className="sph-s-crab-legs">
                <path className="sph-s-crab-leg" d="M22 32 L10 40 L6 48 M24 36 L14 46 M56 32 L68 40 L72 48 M54 36 L64 46" />
            </g>
            <g className="sph-s-claw is-l"><path className="sph-s-crab-shell" d="M18 22 Q4 18 6 8 Q12 4 16 10 Q12 12 14 16 Q18 14 20 10 Q24 16 18 22 Z" /></g>
            <g className="sph-s-claw is-r"><path className="sph-s-crab-shell" d="M62 22 Q76 18 74 8 Q68 4 64 10 Q68 12 66 16 Q62 14 60 10 Q56 16 62 22 Z" /></g>
            <path className="sph-s-crab-shell" d="M14 34 Q14 18 40 18 Q66 18 66 34 Q60 42 40 42 Q20 42 14 34 Z" />
            <path className="sph-s-crab-stalk" d="M34 20 V12 M46 20 V12" />
            <circle className="sph-s-octo-eye" cx={34} cy={11} r={4} />
            <circle className="sph-s-octo-eye" cx={46} cy={11} r={4} />
            <circle className="sph-s-octo-pupil" cx={34.6} cy={11.6} r={1.8} />
            <circle className="sph-s-octo-pupil" cx={46.6} cy={11.6} r={1.8} />
            <path className="sph-s-octo-smile" d="M35 30 Q40 34 45 30" />
        </svg>
    );
}

/** A friendly ghost pirate: a see-through green-white ghost with a tricorn, an eye patch and a curly beard. */
function GhostPirate({ reach }: { reach?: boolean }) {
    return (
        <svg viewBox="0 0 100 110" className={`sph-s-ghost${reach ? ' is-reach' : ''}`}>
            <g className="sph-s-ghost-bob">
                <path className="sph-s-ghostbody" d="M20 94 V52 Q20 22 50 22 Q80 22 80 52 V94 Q74 88 68 96 Q62 104 56 96 Q50 88 44 98 Q38 106 32 96 Q26 88 20 94 Z" />
                <path className="sph-s-tricorn" d="M14 30 Q30 4 50 14 Q70 4 86 30 Q68 22 50 26 Q32 22 14 30 Z" />
                <circle className="sph-s-skullmark" cx={50} cy={18} r={3.4} />
                <ellipse className="sph-s-ghosteye" cx={40} cy={46} rx={4.6} ry={6} />
                <circle className="sph-s-glint is-eye" cx={41.5} cy={43.5} r={1.6} />
                <path className="sph-s-patch" d="M54 40 H66 V50 Q60 55 54 50 Z M22 36 L54 42 M66 42 L78 38" />
                <path className="sph-s-beard" d="M34 60 Q36 76 50 80 Q64 76 66 60 Q58 66 50 64 Q42 66 34 60 Z" />
                <path className="sph-s-ghostmouth" d="M43 60 Q50 66 57 60" />
                <g className="sph-s-ghostarm"><path className="sph-s-ghostbody" d="M76 58 Q92 54 96 44 Q88 40 78 50" /></g>
            </g>
        </svg>
    );
}

function Anchor() {
    return (
        <svg viewBox="0 0 100 100" className="sph-s-anchor">
            <circle className="sph-s-anchorline" cx={50} cy={14} r={8} />
            <path className="sph-s-anchorline" d="M50 22 V84 M34 34 H66 M16 62 Q22 88 50 86 Q78 88 84 62 M10 66 L16 58 L24 66 M90 66 L84 58 L76 66" />
            <path className="sph-s-rust" d="M46 44 l6 3 M47 60 l5 -2 M28 78 l5 2 M66 80 l4 -3" />
            <path className="sph-s-seaweed" d="M58 30 Q66 36 60 44 Q54 50 62 56" />
        </svg>
    );
}

function Coin({ on }: { on: boolean }) {
    return (
        <svg viewBox="0 0 40 40" className={`sph-s-mark${on ? ' is-on' : ''}`}>
            <circle className="sph-s-markcoin" cx={20} cy={20} r={15} />
            <circle className="sph-s-markrim" cx={20} cy={20} r={10} />
            <path className="sph-s-markx" d="M16 16 L24 24 M24 16 L16 24" />
        </svg>
    );
}

export function Room({ lit }: { lit: boolean }) {
    return (
        <div className={`sph-s-room${lit ? ' is-lit' : ''}`}>
            <span className="sph-s-ribs" />
            <span className="sph-s-port is-a"><Porthole /></span>
            <span className="sph-s-port is-b"><Porthole /></span>
            <span className="sph-s-lantern is-a"><Lantern /></span>
            <span className="sph-s-lantern is-b"><Lantern /></span>
            <span className="sph-s-skelbox"><Skeleton /></span>
            <span className="sph-s-chestbox-at"><Chest /></span>
        </div>
    );
}

export function Life({ lit }: { lit: boolean }) {
    return (
        <div className={`sph-s-life${lit ? ' is-lit' : ''}`}>
            <span className="sph-s-port is-a"><Porthole glow octo /></span>
            <span className="sph-s-port is-b"><Porthole glow /></span>
            <span className="sph-s-lantern is-a"><Lantern glow /></span>
            <span className="sph-s-lantern is-b"><Lantern glow /></span>
            <span className="sph-s-chestbox-at"><Chest glow /></span>
            <span className="sph-s-parrotbox"><Parrot /></span>
            {[0, 1, 2, 3].map(i => <span key={i} className="sph-s-drip" style={v({ '--i': i })} />)}
            <span className="sph-s-crab"><span className="sph-s-crab-walk"><Crab /></span></span>
        </div>
    );
}

export function Party() {
    return (
        <>
            {[0, 1].map(i => <span key={`s${i}`} className="sph-s-crew" style={v({ '--i': i })}><Skeleton cheer /></span>)}
            <span className="sph-s-partychest"><Chest open /></span>
            <span className="sph-s-partyparrot"><Parrot flap /></span>
            {[0, 1, 2, 3, 4, 5].map(i => <span key={`c${i}`} className="sph-s-rain" style={v({ '--i': i })}><Coin on /></span>)}
        </>
    );
}

export function CardBack() {
    return (
        <g className="sph-s-back">
            <rect className="sph-s-back-fill" x={3} y={3} width={94} height={80} rx={9} />
            <path className="sph-s-back-coast" d="M12 60 Q20 40 34 46 Q42 30 56 38 Q66 26 80 36 Q90 44 86 62 Q70 70 50 66 Q28 72 12 60 Z" />
            <path className="sph-s-back-path" d="M24 58 Q36 48 46 54 Q56 60 62 46" />
            <path className="sph-s-back-x" d="M60 38 L70 48 M70 38 L60 48" />
            <path className="sph-s-back-rose" d="M20 16 V30 M13 23 H27" />
        </g>
    );
}

export const Flipper = ({ trick }: { trick: boolean }) => <GhostPirate reach={trick} />;
export const Pop = () => <Chest open />;
export const Mistake = Anchor;
export const Mark = Coin;
