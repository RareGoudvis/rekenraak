import type { CSSProperties, ReactNode } from 'react';
import type { DuelFlight, Side } from '../../duel/types';
import { CHEST, DOME, FLOOR, MODEL, ORB, SHOULDER, VIEW_TOP, landPoint, pathAt, releaseAt, toScene, type Model, type Pt, type Stage } from './geometry';
import { MAX_MARK, SPELLS, TOVER, spellOfFlight, type AttackSpell, type Spell, type WizardMarks } from './rule';

// Tovenaarsduel's evil wizards and their spells (owner 2026-11-17: cartoon villains, menacing but never scary-real).
// Code-drawn SVG, flat fills under the thick ink outline. Every wizard is drawn facing right with its feet at (0, 0);
// the right one is mirrored, so "forward" is +x for both. Everything moves by CSS: an animated <g> never carries a
// transform attribute (a pivot wrapper around it does). Restarts: a parity class (-0 / -1) or a remount by key.

const cssVars = (v: Record<string, string | number>) => v as CSSProperties;
const NO_MARKS: WizardMarks = { singe: 0, frost: 0, soot: 0 };
const RUNE_GLYPHS = ['M-4 -4 L4 4 M-4 4 L4 -4', 'M-5 3 L0 -4 L5 3', 'M-4 -4 V4 H4', 'M-5 0 H5 M0 -4 V4'] as const;

// ── Spell icons (centred, about 24 units across) ────────────────────────────────────────────────────

export function SpellIcon({ spell }: { spell: Spell }) {
    if (spell === 'ijs') return (
        <g className="tv-icon is-ijs">
            <path d="M0 -12 V12 M-10.4 -6 L10.4 6 M-10.4 6 L10.4 -6" />
            <path d="M-4 -10 L0 -6 L4 -10 M-4 10 L0 6 L4 10 M-10.6 -1.2 L-6 -3.4 L-7.3 -8 M10.6 1.2 L6 3.4 L7.3 8 M-6.6 8.8 L-6 3.4 L-10.6 1.2 M6.6 -8.8 L6 -3.4 L10.6 -1.2" />
        </g>
    );
    if (spell === 'vuur') return <path className="tv-icon is-vuur" d="M0 -13 Q9 -4 8 4 Q7 12 0 12 Q-7 12 -8 4 Q-8 -3 -2 -7 Q-1 -1 2 0 Q4 -6 0 -13 Z" />;
    if (spell === 'bliksem') return <path className="tv-icon is-bliksem" d="M3 -13 L-7 1 L-0.5 1 L-4 13 L8 -2 L1.5 -2 Z" />;
    return <path className="tv-icon is-schild" d="M0 -12 L10 -8 Q10 5 0 12 Q-10 5 -10 -8 Z M0 -6 V6" />;
}

// ── A wizard ─────────────────────────────────────────────────────────────────────────────────────────

export interface WizardView {
    side: Side;
    model: Model;
    lives: number;
    max: number;
    // The spell the next right answer casts (the orb), and how far up the ladder this side is (runes lit, 0..3).
    next: Spell | null;
    step: number;
    // Right answers this round: the orb refills per answer (key).
    streakKey: number;
    // Casts started, and the latest spell: the pose, the runes and the charge restart per cast.
    cast: { n: number; spell: Spell };
    // Hits taken (not blocked), the latest spell and its damage: the stagger restarts per hit.
    hit: { n: number; spell: AttackSpell; amount: number };
    // IJspijl hits: the shiver and the frost crust restart per hit (a picture only: no keypad freezes).
    chill: number;
    // Wrong answers and time-outs: the spell fizzles.
    oops: number;
    shield: boolean;
    // Shields raised this round (the dome slams up per raise).
    shieldN: number;
    marks: WizardMarks;
    won: boolean;
    ko: boolean;
}

const parity = (name: string, n: number) => (n ? ` ${name}-${n % 2}` : '');

// The cape behind the wizard, from the shoulders; it billows (pivot: the collar).
function Cape({ m }: { m: Model }) {
    return (
        <g transform="translate(-2 -124)">
            <g className="tv-cape">
                <path className="tv-cape-out" d={m === 'paars'
                    ? 'M-22 0 Q-62 50 -92 126 L-74 118 L-66 130 L-50 120 L-40 132 L-26 122 L-14 130 L8 0 Z'
                    : 'M-24 0 Q-70 46 -96 128 L-80 120 L-70 132 L-56 120 L-44 134 L-30 122 L-16 132 L10 0 Z'} />
                <path className="tv-cape-in" d="M-20 4 Q-54 54 -76 118 L-62 116 Q-40 60 -10 6 Z" />
            </g>
        </g>
    );
}

// The long dark robe from the shoulders (0, −124) down to a jagged hem; a bright trim down the front.
const ROBE: Record<Model, string> = {
    paars: 'M-22 0 Q-36 60 -48 118 L-38 126 L-30 118 L-20 128 L-10 118 L0 128 L10 118 L20 128 L30 118 L40 126 L50 118 Q38 60 24 0 Z',
    rood: 'M-26 0 Q-44 56 -52 118 L-42 126 L-32 118 L-22 128 L-12 118 L-2 128 L8 118 L18 128 L28 118 L38 126 L52 118 Q46 56 28 0 Z',
};

function Robe({ m, singe }: { m: Model; singe: number }) {
    return (
        <g transform="translate(0 -124)">
            <g className="tv-robe">
                <path className="tv-robe-body" d={ROBE[m]} />
                <path className="tv-robe-shade" d={m === 'paars' ? 'M-22 0 Q-36 60 -48 118 L-38 126 L-30 118 Q-22 60 -8 6 Z' : 'M-26 0 Q-44 56 -52 118 L-42 126 L-32 118 Q-26 60 -10 6 Z'} />
                <path className="tv-trim" d="M4 6 L2 120" />
                <path className="tv-trim is-hem" d={m === 'paars' ? 'M-46 112 L-36 120 L-28 112 L-18 122 L-8 112 L2 122 L12 112 L22 122 L32 112 L42 120' : 'M-50 112 L-40 120 L-30 112 L-20 122 L-10 112 L0 122 L10 112 L20 122 L30 112 L40 120'} />
                {/* Runes stitched on the robe. */}
                {[[-16, 64, 1], [16, 84, 2], [-10, 96, 0]].map(([x, y, g]) => <path key={x} className="tv-robe-rune" transform={`translate(${x} ${y})`} d={RUNE_GLYPHS[g]} />)}
                {/* Fire hits: the hem gets singed. */}
                {singe >= MAX_MARK && <path className="tv-scorch" d="M-30 118 Q-24 100 -14 110 Q-6 96 2 112 Q10 102 16 116 Z" />}
                <path className="tv-belt" d={m === 'paars' ? 'M-30 52 Q0 60 32 52' : 'M-36 50 Q0 60 38 50'} />
                <path className="tv-belt-gem" d="M2 50 L9 56 L2 63 L-5 56 Z" />
            </g>
        </g>
    );
}

// A spiky shoulder piece, centred on the shoulder.
function Pauldron({ back = false }: { back?: boolean }) {
    return (
        <g>
            <path className={back ? 'tv-armor is-back' : 'tv-armor'} d="M-20 8 Q-22 -12 0 -16 Q22 -12 22 8 Q10 2 0 4 Q-10 2 -20 8 Z" />
            <path className={back ? 'tv-armor is-back' : 'tv-armor'} d="M-14 -10 L-20 -30 L-6 -15 M2 -16 L4 -36 L10 -15 M14 -10 L26 -26 L18 -6" />
        </g>
    );
}

// The high spiky collar behind the head.
function Collar() {
    return <path className="tv-collar" d="M-34 -118 L-46 -168 L-28 -150 L-24 -188 L-10 -156 L2 -196 L12 -156 L24 -184 L28 -150 L40 -164 L32 -118 Z" />;
}

export type Eyes = 'open' | 'happy' | 'dizzy' | 'oops';

function Face({ m, eyes, marks }: { m: Model; eyes: Eyes; marks: WizardMarks }) {
    const hood = m === 'rood';
    return (
        <g>
            {/* The red one's hood: the cowl behind the face. */}
            {hood && <path className="tv-hood" d="M-38 12 Q-46 -44 -4 -62 Q40 -64 40 -16 L42 12 Q30 -8 10 -6 Q-18 -6 -38 12 Z" />}
            <path className="tv-skin" d="M-16 -14 L-32 -30 L-18 -4 Z" />
            <circle className="tv-skin" cx="4" cy="-14" r="22" />
            {hood && <path className="tv-hood-rim" d="M-24 -26 Q0 -50 30 -32 Q16 -44 0 -44 Q-16 -42 -24 -26 Z" />}
            {/* Lightning hits: soot on the cheeks and nose. */}
            {marks.soot >= 1 && <ellipse className="tv-soot" cx="14" cy="-2" rx="9" ry="5" />}
            {marks.soot >= 2 && <ellipse className="tv-soot" cx="-6" cy="-22" rx="7" ry="4" />}
            {eyes === 'happy' ? <path className="tv-eye-line" d="M4 -19 q5 -6 10 0 M17 -19 q5 -6 10 0" />
                : eyes === 'dizzy' ? <path className="tv-eye-line" d="M9 -19 m-4 0 a4 4 0 1 1 4 4 a2 2 0 1 1 -2 -2 M22 -19 m-4 0 a4 4 0 1 1 4 4 a2 2 0 1 1 -2 -2" />
                    : (
                        <g className={`tv-eyes${eyes === 'oops' ? ' is-oops' : ''}`}>
                            <circle className="tv-eye-glow" cx="9" cy="-19" r="9" fill="url(#tv-glow-eye)" /><circle className="tv-eye-glow" cx="22" cy="-19" r="9" fill="url(#tv-glow-eye)" />
                            <g transform="translate(9 -19)"><g className="tv-blink"><path className="tv-eye" d="M-6 -2 L6 1 L-4 3 Z" /></g></g>
                            <g transform="translate(22 -19)"><g className="tv-blink"><path className="tv-eye" d="M-5 1 L6 -2 L4 3 Z" /></g></g>
                        </g>
                    )}
            <path className="tv-brow" d={eyes === 'oops' ? 'M1 -28 L14 -26 M18 -26 L30 -28' : 'M0 -30 L14 -22 M18 -22 L31 -30'} />
            <path className="tv-skin" d="M22 -18 Q36 -10 26 -4 Q22 -6 22 -10 Z" />
            {/* A sly grin with one fang, a thin curled moustache and a pointed goatee. */}
            <path className="tv-grin" d={eyes === 'oops' ? 'M8 4 Q18 0 28 4' : 'M6 0 Q18 10 30 -2'} />
            {eyes !== 'oops' && <path className="tv-fang" d="M22 3 L24 9 L26 2 Z" />}
            <path className={`tv-goatee${marks.frost ? ' is-frost' : ''}`} d="M10 6 Q16 30 20 40 Q24 26 28 5 Q20 10 10 6 Z" />
            <path className="tv-moustache" d="M4 -3 Q14 -8 20 -4 Q28 -10 38 -8 Q34 -2 26 -2" />
            {/* IJspijl hits: frost on the goatee and icicles hanging from it. */}
            {marks.frost >= 1 && <path className="tv-frost" d="M12 12 Q18 18 26 12" />}
            {marks.frost >= 2 && <path className="tv-icicle" d="M16 36 l3 12 l3 -12 M22 26 l2.5 10 l2.5 -10" />}
            {marks.soot >= 1 && <circle className="tv-soot" cx="28" cy="-10" r="3.4" />}
        </g>
    );
}

// The purple one's tall crooked hat with a jagged brim, around the brim's centre (0, 0).
function Hat({ marks }: { marks: WizardMarks }) {
    return (
        <g>
            {marks.soot >= 2 && <path className="tv-frizz" d="M-38 4 l-8 -2 l6 6 l-9 2 l9 3 M-30 8 l-4 8 l6 -4" />}
            <path className="tv-hat" d="M-26 -4 Q-20 -48 -8 -84 Q0 -110 -16 -128 Q-28 -140 -44 -132 Q-26 -116 -26 -96 Q-24 -60 -10 -30 Q4 -50 26 -4 Z" />
            <path className="tv-hat-shade" d="M-26 -4 Q-20 -48 -8 -84 Q-4 -60 -6 -6 Z" />
            <path className="tv-hat-band" d="M-27 -7 Q0 1 27 -7 L24 -19 Q0 -11 -24 -19 Z" />
            <path className="tv-belt-gem" d="M0 -20 L7 -13 L0 -6 L-7 -13 Z" />
            <path className="tv-hat" d="M-50 2 L-42 -6 L-34 2 L-24 -7 L-12 1 L0 -8 L12 1 L24 -7 L34 2 L42 -6 L50 0 Q30 12 0 12 Q-30 12 -50 2 Z" />
            {/* Fire hits: the tip goes black and smokes; then the brim is singed too. */}
            {marks.singe >= 1 && <path className="tv-scorch" d="M-44 -132 Q-28 -140 -16 -128 Q-12 -118 -18 -112 Q-26 -124 -40 -128 Z" />}
            {marks.singe >= 2 && <path className="tv-scorch" d="M24 -4 Q34 -8 44 -4 Q38 4 28 4 Z M-46 0 Q-40 -4 -32 0 Z" />}
            {marks.singe >= 1 && <g transform="translate(-42 -132)">{[0, 1, 2].map(k => <circle key={k} className="tv-wisp" r={4 + k * 1.5} style={cssVars({ '--k': k })} />)}</g>}
            {marks.frost >= 1 && <path className="tv-icicle" d="M-38 6 l3 10 l3 -10 M32 5 l2.5 9 l2.5 -9" />}
            {marks.frost >= 3 && <path className="tv-icicle" d="M-22 9 l3 12 l3 -12 M18 9 l3 11 l3 -11" />}
            {marks.frost >= 2 && <path className="tv-frost" d="M-44 -1 Q-32 -6 -20 -3 M16 -3 Q30 -6 44 -1" />}
        </g>
    );
}

// The red one's spiky iron crown on the hood, around its centre (0, 0).
function Crown({ marks }: { marks: WizardMarks }) {
    return (
        <g>
            <path className="tv-crown" d="M-26 6 L-30 -18 L-18 -6 L-10 -30 L0 -8 L10 -30 L18 -6 L30 -18 L26 6 Q0 12 -26 6 Z" />
            <path className="tv-belt-gem" d="M0 -6 L6 0 L0 6 L-6 0 Z" />
            {marks.singe >= 1 && <path className="tv-scorch" d="M-30 -18 L-18 -6 L-24 0 Z M10 -30 L18 -6 L12 -4 Z" />}
            {marks.singe >= 1 && <g transform="translate(10 -30)">{[0, 1, 2].map(k => <circle key={k} className="tv-wisp" r={4 + k * 1.5} style={cssVars({ '--k': k })} />)}</g>}
            {marks.frost >= 1 && <path className="tv-icicle" d="M-22 8 l3 10 l3 -10 M18 8 l2.5 9 l2.5 -9" />}
        </g>
    );
}

const HEADWEAR_AT: Record<Model, Pt> = { paars: { x: 4, y: -170 }, rood: { x: 2, y: -192 } };
// The head group a size up around the neck (0, −118), lifted a little so the staff arm clears the goatee.
const HEAD_SCALE = 1.25;
const HEAD_LIFT = 10;
const HEAD_UP = `translate(0 ${-118 - HEAD_LIFT}) scale(${HEAD_SCALE}) translate(0 118)`;
/** A head-group point in wizard units (where a hat that flies off starts). */
const upHead = (p: Pt): Pt => ({ x: p.x * HEAD_SCALE, y: -118 - HEAD_LIFT + (p.y + 118) * HEAD_SCALE });
// The hat a little lower than drawn, so the bigger head keeps its tip inside the band.
const Headwear = ({ m, marks }: { m: Model; marks: WizardMarks }) => (m === 'paars' ? <g transform="scale(1 .85)"><Hat marks={marks} /></g> : <Crown marks={marks} />);

// The orb in the staff's prongs: the next spell's colour and icon, with sparkles. Refills (pops in) after every answer.
function Orb({ next, streakKey, cast }: { next: Spell | null; streakKey: number; cast: boolean }) {
    if (!next) return <path className="tv-crystal" d="M0 -22 L12 -4 L0 22 L-12 -4 Z" />;
    return (
        <g key={`${next}-${streakKey}`} className={`tv-orb is-${next}${cast ? ' is-refill' : ''}`}>
            <circle className="tv-orb-glow" r="60" fill={`url(#tv-glow-${next})`} />
            <circle className="tv-orb-ball" r="27" />
            <path className="tv-orb-shine" d="M-16 -11 Q-9 -20 2 -21" />
            <g transform="scale(1.5)"><g className="tv-orb-icon"><SpellIcon spell={next} /></g></g>
            <g className="tv-orb-sparks">
                {[0, 1, 2].map(k => <path key={k} className="tv-orb-spark" style={cssVars({ '--k': k })} d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z" />)}
            </g>
        </g>
    );
}

// The charge at the orb before a spell leaves: the crystal flares, motes rush in, rays turn.
function Charge({ spell }: { spell: Spell }) {
    return (
        <g className={`tv-charge is-${spell}`}>
            <circle className="tv-charge-glow" r="92" fill={`url(#tv-glow-${spell})`} />
            <g className="tv-charge-rays">
                {Array.from({ length: 8 }, (_, i) => <path key={i} className="tv-charge-ray" transform={`rotate(${i * 45})`} d="M34 0 L70 0" />)}
            </g>
            {Array.from({ length: 10 }, (_, i) => {
                const a = (i / 10) * Math.PI * 2;
                return (
                    <g key={i} className="tv-mote" style={cssVars({ '--mx': `${Math.cos(a) * 96}px`, '--my': `${Math.sin(a) * 96}px`, '--k': i % 3 })}>
                        <circle r="5" />
                    </g>
                );
            })}
        </g>
    );
}

// The front arm around the shoulder (0, 0): a dark sleeve, a ringed hand, the gnarled staff with the orb in its prongs.
function StaffArm({ v }: { v: WizardView }) {
    const castSpell = v.cast.n > 0 ? v.cast.spell : null;
    const orb = { x: ORB.x - SHOULDER.x, y: ORB.y - SHOULDER.y };
    return (
        <g transform={`translate(${SHOULDER.x} ${SHOULDER.y})`}>
            <g key={`a${v.cast.n}`} className={`tv-arm${castSpell ? ` is-${castSpell}` : ''}`}>
                <path className="tv-staff is-ink" d="M46 104 Q53 76 46 48 Q39 20 48 -6 Q57 -34 47 -58 Q41 -76 50 -88" />
                <path className="tv-staff" d="M46 104 Q53 76 46 48 Q39 20 48 -6 Q57 -34 47 -58 Q41 -76 50 -88" />
                <path className="tv-staff-knot" d="M46 48 l-7 -4 M48 -6 l8 -4 M47 -58 l-8 -2" />
                <path className="tv-staff-prong is-ink" d={`M${orb.x - 10} ${orb.y + 26} Q${orb.x - 30} ${orb.y} ${orb.x - 14} ${orb.y - 30} M${orb.x + 10} ${orb.y + 26} Q${orb.x + 30} ${orb.y} ${orb.x + 14} ${orb.y - 30} M${orb.x} ${orb.y + 26} V${orb.y + 36}`} />
                <path className="tv-staff-prong" d={`M${orb.x - 10} ${orb.y + 26} Q${orb.x - 30} ${orb.y} ${orb.x - 14} ${orb.y - 30} M${orb.x + 10} ${orb.y + 26} Q${orb.x + 30} ${orb.y} ${orb.x + 14} ${orb.y - 30} M${orb.x} ${orb.y + 26} V${orb.y + 36}`} />
                <g transform={`translate(${orb.x} ${orb.y})`}>
                    {castSpell && castSpell !== 'schild' && <Charge spell={castSpell} />}
                    <Orb next={v.ko ? null : v.next} streakKey={v.streakKey} cast={v.cast.n > 0} />
                    {v.oops > 0 && (
                        <g key={`o${v.oops}`} className="tv-fizzle">
                            {[0, 1, 2, 3, 4].map(k => <circle key={k} className="tv-fizzle-puff" r={10 + k * 3} style={cssVars({ '--k': k })} />)}
                        </g>
                    )}
                </g>
                <path className="tv-sleeve" d="M-12 -10 Q24 -14 54 8 L44 30 Q18 14 -10 14 Z" />
                <path className="tv-trim" d="M54 8 L44 30" />
                <circle className="tv-skin" cx="49" cy="16" r="9" />
                <circle className="tv-ring" cx="53" cy="10" r="2.6" /><circle className="tv-ring" cx="55" cy="16" r="2.6" />
            </g>
        </g>
    );
}

// The floor rune circle: one rune per ladder step, lit in its spell's colour as the streak climbs; an outer ring of
// glyphs turns slowly and spins up while a spell charges.
function RuneRing({ step, live }: { step: number; live: boolean }) {
    const at = [[-58, 2], [-22, 12], [22, 12], [58, 2]] as const;
    return (
        <g className={`tv-runes${live && step > 0 ? ' is-lit' : ''}`}>
            <ellipse className="tv-rune-ring" cx="2" cy="0" rx="86" ry="16" />
            <g transform="translate(2 0) scale(1 .19)">
                <g className="tv-rune-spin">
                    {Array.from({ length: 10 }, (_, i) => {
                        const a = (i / 10) * Math.PI * 2;
                        return <path key={i} className="tv-rune-glyph" transform={`translate(${(Math.cos(a) * 72).toFixed(1)} ${(Math.sin(a) * 72).toFixed(1)}) scale(1 3)`} d={RUNE_GLYPHS[i % 4]} />;
                    })}
                </g>
            </g>
            {at.map(([x, y], i) => (
                <g key={i} transform={`translate(${x} ${y})`}>
                    <g key={live && i < step ? `on${step}` : 'off'} className={`tv-rune is-${SPELLS[i]}${live && i < step ? ' is-on' : ''}`}>
                        <path d={RUNE_GLYPHS[i]} />
                    </g>
                </g>
            ))}
        </g>
    );
}

// The dark smoky aura that swirls at the feet.
function Aura() {
    return (
        <g className="tv-aura">
            <g transform="scale(1 .26)">
                <g className="tv-aura-spin">
                    {Array.from({ length: 7 }, (_, i) => {
                        const a = (i / 7) * Math.PI * 2;
                        return <circle key={i} className="tv-aura-puff" cx={(Math.cos(a) * 58).toFixed(1)} cy={(Math.sin(a) * 58).toFixed(1)} r={24 + (i % 3) * 6} />;
                    })}
                </g>
            </g>
            {[[-40, 0], [30, 1], [-6, 2], [50, 3]].map(([x, k]) => <circle key={k} className="tv-aura-wisp" cx={x} cy="-6" r="10" style={cssVars({ '--k': k })} />)}
        </g>
    );
}

export function Wizard({ v }: { v: WizardView }) {
    const between = v.won || v.ko;
    const low = !v.ko && v.lives / Math.max(1, v.max) <= 0.3;
    const eyes: Eyes = v.ko ? 'dizzy' : v.won ? 'happy' : v.oops && !between ? 'oops' : 'open';
    const castCls = v.cast.n ? ` tv-cast-${v.cast.n % 2} is-c-${v.cast.spell}` : '';
    const hitCls = v.hit.n ? ` tv-hit-${v.hit.n % 2} is-dmg-${Math.min(3, v.hit.amount)} is-h-${v.hit.spell}` : '';
    const cls = `tv-wiz is-${v.side} is-${v.model}${castCls}${v.won ? ' is-win' : ''}${v.ko ? ' is-ko' : ''}${low ? ' is-low' : ''}`;
    const hw = HEADWEAR_AT[v.model];
    return (
        <g className={cls}>
            <Aura />
            <RuneRing step={v.step} live={!between} />
            <ellipse className="tv-shadow" cx="2" cy="2" rx="64" ry="9" />
            <g className={`tv-react${hitCls}`}>
                <g className={`tv-shiver${parity('tv-chill', v.chill)}`}>
                    <g className={`tv-lean${castCls}`}>
                        <g className={`tv-idle${parity('tv-oops', v.oops)}`}>
                            <Cape m={v.model} />
                            {/* The free arm behind the robe: a claw raised a little. */}
                            <path className="tv-sleeve is-back" d="M-12 -118 Q-38 -104 -46 -76 L-30 -68 Q-24 -94 -4 -106 Z" />
                            <circle className="tv-skin" cx="-38" cy="-70" r="8" />
                            <circle className="tv-ring" cx="-42" cy="-74" r="2.6" />
                            <Robe m={v.model} singe={v.marks.singe} />
                            <g transform="translate(-16 -118)"><Pauldron back /></g>
                            {/* Cartoon proportions: the head, collar and hat a size up around the neck. */}
                            <g transform={HEAD_UP}>
                                <Collar />
                                <g transform="translate(2 -132)">
                                    <g className="tv-head"><Face m={v.model} eyes={eyes} marks={v.marks} /></g>
                                </g>
                                <g transform={`translate(${hw.x} ${hw.y})`}>
                                    <g className="tv-hat-sway"><Headwear m={v.model} marks={v.marks} /></g>
                                </g>
                            </g>
                            <g transform="translate(16 -118)"><Pauldron /></g>
                            <StaffArm v={v} />
                            {low && <g transform="translate(-24 -150)"><path className="tv-sweat" d="M0 -8 Q5 0 0 4 Q-5 0 0 -8 Z" /></g>}
                            {v.chill > 0 && !v.ko && <FrostCrust key={`c${v.chill}`} m={v.model} />}
                        </g>
                    </g>
                    {v.marks.soot >= MAX_MARK && !between && <Crackle />}
                </g>
            </g>
            {v.shield && !between && <Dome key={`d${v.shieldN}`} />}
            {v.ko && <Defeat m={v.model} marks={v.marks} />}
            {v.won && <WinSparkles />}
        </g>
    );
}

// The frost after an IJspijl hit: an icy crust on the robe and icicles, melting after a while (only a picture).
function FrostCrust({ m }: { m: Model }) {
    return (
        <g className="tv-crust">
            <g transform="translate(0 -124)"><path className="tv-crust-ice" d={ROBE[m]} /></g>
            <path className="tv-icicle" d="M-44 -2 l4 16 l4 -16 M-20 -2 l4 20 l4 -20 M8 -2 l4 14 l4 -14 M36 -2 l4 18 l4 -18 M-36 -116 l3 12 l3 -12 M28 -116 l3 10 l3 -10" />
            {[[-30, -80], [20, -60], [-10, -150], [30, -190], [-36, -130]].map(([x, y], i) => (
                <path key={i} className="tv-crust-flake" transform={`translate(${x} ${y})`} style={cssVars({ '--k': i })} d="M0 -6 V6 M-5 -3 L5 3 M-5 3 L5 -3" />
            ))}
        </g>
    );
}

// Lightning-struck: static crackles round the wizard.
function Crackle() {
    return (
        <g className="tv-crackle">
            {[[-36, -210, 0], [40, -160, 1], [-44, -110, 2], [30, -60, 1]].map(([x, y, k], i) => (
                <path key={i} className="tv-spark-loop" transform={`translate(${x} ${y})`} style={cssVars({ '--k': k })} d="M0 0 l6 -8 l2 6 l7 -9" />
            ))}
        </g>
    );
}

// The shield on yourself: a dome of light with runes that turn; it slams up with a ring on the floor.
function Dome() {
    return (
        <g>
            <g transform="scale(1 .2)"><g className="tv-dome-slam"><circle className="tv-dome-ring" r="120" /></g></g>
            <g transform={`translate(${DOME.x} ${DOME.y})`}>
                <g className="tv-dome">
                    <ellipse className="tv-dome-fill" rx={DOME.rx} ry={DOME.ry} />
                    <ellipse className="tv-dome-edge" rx={DOME.rx - 10} ry={DOME.ry - 10} />
                    <path className="tv-dome-shine" d={`M${-DOME.rx * 0.6} ${-DOME.ry * 0.62} Q${-DOME.rx * 0.2} ${-DOME.ry * 0.96} ${DOME.rx * 0.3} ${-DOME.ry * 0.88}`} />
                    <g transform={`scale(1 ${DOME.ry / DOME.rx})`}>
                        <g className="tv-dome-runes">
                            {Array.from({ length: 10 }, (_, i) => {
                                const a = (i / 10) * Math.PI * 2;
                                return <path key={i} className="tv-dome-rune" transform={`translate(${Math.cos(a) * (DOME.rx - 18)} ${Math.sin(a) * (DOME.rx - 18)}) rotate(${(a * 180) / Math.PI + 90}) scale(1.3)`} d={RUNE_GLYPHS[i % 4]} />;
                            })}
                        </g>
                    </g>
                </g>
                <g className="tv-dome-pulse"><ellipse className="tv-dome-edge" rx={DOME.rx} ry={DOME.ry} /></g>
            </g>
        </g>
    );
}

// Defeated (0 lives): a poof of smoke, the hat or crown flies off and lands on the floor, dizzy stars turn.
function Defeat({ m, marks }: { m: Model; marks: WizardMarks }) {
    const hw = upHead(HEADWEAR_AT[m]);
    return (
        <g className="tv-defeat">
            <g transform={`translate(${hw.x.toFixed(1)} ${hw.y.toFixed(1)}) scale(${HEAD_SCALE})`}>
                <g className={`tv-hat-fly is-${m}`}><g className="tv-hat-spin"><Headwear m={m} marks={marks} /></g></g>
            </g>
            <g transform="translate(6 -138) scale(1 .38)">
                <g className="tv-dizzy">
                    {[0, 1, 2, 3].map(k => {
                        const a = (k / 4) * Math.PI * 2;
                        return <path key={k} className="tv-dizzy-star" transform={`translate(${Math.cos(a) * 38} ${Math.sin(a) * 38}) scale(1 2.4)`} d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" />;
                    })}
                </g>
            </g>
            {[[-30, -120, 48], [24, -150, 44], [0, -80, 56], [-46, -60, 40], [40, -70, 42], [-4, -206, 38], [30, -30, 34], [-34, -20, 34]].map(([x, y, r], i) => (
                <circle key={i} className="tv-poof" cx={x} cy={y} r={r} style={cssVars({ '--k': i })} />
            ))}
        </g>
    );
}

// The winner: dark sparkles burst from the raised staff, again and again.
function WinSparkles() {
    return (
        <g transform={`translate(${ORB.x + 10} ${ORB.y - 50})`}>
            {[0, 1, 2].map(k => (
                <g key={k} className="tv-win-burst" style={cssVars({ '--k': k })}>
                    {Array.from({ length: 8 }, (_, i) => <path key={i} className="tv-ray" transform={`rotate(${i * 45})`} d="M12 0 L32 0" />)}
                </g>
            ))}
        </g>
    );
}

// ── Spells in the air (scene units) ───────────────────────────────────────────────────────────────

// A fireball's arc over the straight line; the storm cloud over a Bliksem target; how much bigger a spell is drawn.
const FIRE_ARC = 34;
const STORM_Y = VIEW_TOP + 34;
const BIG = 2.2;

export function Shot({ f, shielded, stage }: { f: DuelFlight; shielded: boolean; stage: Stage }) {
    const spell = spellOfFlight(f);
    const charge = TOVER.chargeMs[spell];
    const fly = TOVER.castMs[spell] - charge;
    const from = releaseAt(stage, f.from);
    const to = landPoint(stage, f.to, shielded);
    const dir = f.from === 'left' ? 1 : -1;
    const timing = cssVars({ '--charge': `${charge}ms`, '--fly': `${fly}ms`, '--dx': `${to.x - from.x}px`, '--dy': `${to.y - from.y}px`, '--arc': `${-FIRE_ARC}px` });
    // The launch: a burst at the staff the moment the spell leaves.
    const muzzle = (
        <g transform={`translate(${from.x.toFixed(1)} ${from.y.toFixed(1)})`}>
            <g className={`tv-muzzle is-${spell}`} style={timing}>
                <circle className="tv-muzzle-flash" r="70" fill={`url(#tv-glow-${spell})`} />
                <circle className="tv-muzzle-ring" r="34" />
                {Array.from({ length: 10 }, (_, i) => {
                    const a = (i / 10) * Math.PI * 2;
                    return <g key={i} className="tv-muzzle-spark" style={cssVars({ '--dx': `${(Math.cos(a) * 80 + dir * 30).toFixed(0)}px`, '--dy': `${(Math.sin(a) * 60).toFixed(0)}px`, '--charge': `${charge}ms` })}><circle r="4" /></g>;
                })}
            </g>
        </g>
    );

    if (spell === 'bliksem') {
        // The bolt itself strikes on impact (Impact); in the air: a storm gathers over the target, a zap goes up.
        return (
            <g className="tv-storm" style={timing}>
                {muzzle}
                <g transform={`translate(${to.x.toFixed(1)} ${STORM_Y})`}>
                    <g className="tv-cloud">
                        <path className="tv-cloud-body" d="M-110 16 Q-126 -20 -82 -28 Q-72 -64 -26 -56 Q0 -86 40 -62 Q88 -72 94 -28 Q134 -18 112 16 Z" />
                        <path className="tv-cloud-zap" d="M-48 10 l-9 22 l12 -3 l-6 18 M38 12 l-6 18 l12 -4 l-5 16" />
                    </g>
                </g>
                <path className="tv-skyzap" d={`M${from.x.toFixed(1)} ${from.y.toFixed(1)} l${12 * dir} -60 l${-9 * dir} -9 l${15 * dir} -90`} />
            </g>
        );
    }
    const arc = spell === 'vuur' ? FIRE_ARC : 0;
    const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
    // The trail along the whole runway: each piece lights as the spell passes and lingers a moment.
    const n = Math.max(14, Math.round(Math.abs(to.x - from.x) / 36));
    const trail = Array.from({ length: n }, (_, i) => {
        const t = (i + 1) / (n + 1);
        const p = pathAt(from, to, t, arc);
        return { ...p, delay: charge + fly * t, k: i };
    });
    return (
        <g className={`tv-shot is-${spell}`}>
            {muzzle}
            {trail.map(p => (
                <g key={p.k} transform={`translate(${p.x.toFixed(1)} ${(p.y + ((p.k % 3) - 1) * 8).toFixed(1)})`}>
                    {spell === 'ijs'
                        ? <path className="tv-trail-flake" style={cssVars({ '--d': `${p.delay}ms`, '--k': p.k % 3 })} d="M0 -8 V8 M-7 -4 L7 4 M-7 4 L7 -4" />
                        : <circle className={p.k % 2 ? 'tv-trail-smoke' : 'tv-trail-ember'} r={p.k % 2 ? 16 : 6} style={cssVars({ '--d': `${p.delay}ms`, '--k': p.k % 3 })} />}
                </g>
            ))}
            <g transform={`translate(${from.x.toFixed(1)} ${from.y.toFixed(1)})`}>
                <g className="tv-fly-x" style={timing}>
                    <g className="tv-fly-y" style={timing}>
                        <g transform={`scale(${BIG})`}>
                            {spell === 'ijs' ? (
                                <g transform={`rotate(${angle.toFixed(1)})`}>
                                    <g className="tv-spear">
                                        <circle className="tv-spear-glow" cx="10" r="30" fill="url(#tv-glow-ijs)" />
                                        <path className="tv-spear-tail" d="M-70 0 L-20 -8 L-20 8 Z" />
                                        <path className="tv-spear-body" d="M-34 -9 L22 -7 L46 0 L22 7 L-34 9 L-26 0 Z" />
                                        <path className="tv-spear-core" d="M-24 0 L38 0" />
                                        <path className="tv-spear-shard" d="M-10 -9 L-2 -18 L2 -8 M6 8 L14 16 L16 7" />
                                    </g>
                                </g>
                            ) : (
                                <g className="tv-fireball">
                                    <circle className="tv-fire-glow" r="48" fill="url(#tv-glow-vuur)" />
                                    <g transform={`rotate(${angle.toFixed(1)})`}>
                                        <path className="tv-fire-out" d="M24 0 Q24 -24 2 -25 Q-16 -25 -30 -18 Q-26 -13 -50 -10 Q-32 -4 -66 0 Q-32 4 -50 11 Q-26 14 -32 20 Q-14 25 2 25 Q24 24 24 0 Z" />
                                        <path className="tv-fire-mid" d="M17 0 Q17 -16 2 -17 Q-14 -16 -22 -9 Q-16 -4 -36 0 Q-16 4 -22 9 Q-14 16 2 17 Q17 16 17 0 Z" />
                                        <circle className="tv-fire-core" cx="5" r="9" />
                                    </g>
                                </g>
                            )}
                        </g>
                    </g>
                </g>
            </g>
        </g>
    );
}

export interface ImpactView { id: number; spell: AttackSpell; side: Side; blocked: boolean; amount: number }

const ray = (n: number, d: number, k = 0) => Array.from({ length: n }, (_, j) => {
    const a = (j / n) * Math.PI * 2 + k;
    return { a, dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.85, j };
});

// ── Impacts (scene units): a hit-stop hold, then the burst, a shockwave, debris; a shield shatters on a block ──
export function Impact({ i, stage }: { i: ImpactView; stage: Stage }) {
    const at = landPoint(stage, i.side, i.blocked);
    const dir = i.side === 'right' ? 1 : -1;
    const floorY = FLOOR - at.y;
    let burst: ReactNode;
    if (i.spell === 'ijs') burst = (
        <g>
            <circle className="tv-imp-flash" r="110" fill="url(#tv-glow-ijs)" />
            <path className="tv-frost-star" d="M0 -60 L12 -15 L56 -20 L18 6 L40 48 L0 21 L-40 48 L-18 6 L-56 -20 L-12 -15 Z" />
            {ray(16, 170, 0.2).map(r => (
                <g key={r.j} className="tv-shard" style={cssVars({ '--dx': `${r.dx}px`, '--dy': `${r.dy}px`, '--r': `${(r.a * 180) / Math.PI + 300}deg`, '--k': r.j % 3 })}>
                    <path d={r.j % 2 ? 'M0 -14 L6 0 L0 14 L-6 0 Z' : 'M0 -9 L4 0 L0 9 L-4 0 Z'} />
                </g>
            ))}
            {ray(8, 80, 0.6).map(r => <circle key={`m${r.j}`} className="tv-mist" cx={r.dx * 0.4} cy={r.dy * 0.4} r="26" style={cssVars({ '--k': r.j })} />)}
        </g>
    );
    else if (i.spell === 'vuur') burst = (
        <g>
            <circle className="tv-imp-flash" r="150" fill="url(#tv-glow-vuur)" />
            <g transform="scale(1.5)"><path className="tv-boom-out" d="M0 -58 L14 -30 L46 -40 L32 -10 L60 6 L28 18 L38 50 L8 32 L-10 60 L-18 28 L-52 40 L-34 10 L-60 -8 L-28 -18 L-36 -50 L-8 -30 Z" /></g>
            <g transform="scale(1.5)"><path className="tv-boom-in" d="M0 -32 L10 -14 L30 -18 L18 0 L30 16 L8 14 L0 34 L-8 14 L-30 16 L-18 0 L-30 -18 L-10 -14 Z" /></g>
            {ray(20, 190, 0.1).map(r => (
                <g key={r.j} className="tv-ember" style={cssVars({ '--dx': `${r.dx}px`, '--dy': `${r.dy - 40}px`, '--k': r.j % 4 })}><circle r={r.j % 3 ? 5 : 7} /></g>
            ))}
            {[[-40, -26, 36], [34, -40, 42], [0, -66, 46], [-14, 14, 30], [44, 8, 30], [-56, 0, 28]].map(([x, y, r], j) => (
                <circle key={`s${j}`} className="tv-boom-smoke" cx={x} cy={y} r={r} style={cssVars({ '--k': j })} />
            ))}
        </g>
    );
    else burst = (
        <g>
            <circle className="tv-imp-flash" r="180" fill="url(#tv-glow-bliksem)" />
            {/* The storm cloud that sent it drifts apart. */}
            <g transform={`translate(0 ${(STORM_Y - at.y).toFixed(0)})`}>
                <path className="tv-cloud-body is-fading" d="M-110 16 Q-126 -20 -82 -28 Q-72 -64 -26 -56 Q0 -86 40 -62 Q88 -72 94 -28 Q134 -18 112 16 Z" />
            </g>
            {/* The huge bolt from the top of the scene, with branches. */}
            <g className="tv-bolt">
                <path className="tv-bolt-glow" d={boltPath(at, dir)} />
                <path className="tv-bolt-core" d={boltPath(at, dir)} />
                <path className="tv-bolt-fork" d={boltBranches(at, dir)} />
            </g>
            <g transform="scale(1.6)"><path className="tv-boom-in is-bolt" d="M0 -30 L8 -10 L30 -16 L14 2 L28 22 L4 12 L-4 32 L-8 10 L-30 18 L-14 -2 L-26 -22 L-6 -12 Z" /></g>
            {ray(18, 190, 0.3).map(r => (
                <g key={r.j} className="tv-zapspark" style={cssVars({ '--dx': `${r.dx}px`, '--dy': `${r.dy}px`, '--k': r.j % 3 })}><path d="M-12 0 L12 0" transform={`rotate(${(r.a * 180) / Math.PI})`} /></g>
            ))}
        </g>
    );
    return (
        <g transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`}>
            <g className={`tv-impact is-${i.spell}${i.blocked ? ' is-blocked' : ''} is-dmg-${i.amount}`}>
                {/* The shockwave: a ring round the hit and one along the floor. */}
                <circle className="tv-shock" r="60" />
                <g transform={`translate(0 ${floorY.toFixed(0)}) scale(1 .2)`}><circle className="tv-shock is-floor" r="120" /></g>
                {i.blocked && <DomeBreak side={i.side} at={at} stage={stage} />}
                <g className="tv-burst">{burst}</g>
            </g>
        </g>
    );
}

// The bolt's zigzag from the top of the scene down to the hit point (0, 0).
function boltPath(at: Pt, dir: number) {
    const top = VIEW_TOP - at.y;
    const n = 8;
    const pts = Array.from({ length: n + 1 }, (_, k) => {
        const t = k / n;
        const wob = k === 0 || k === n ? 0 : (k % 2 ? 1 : -1) * (18 + (k % 3) * 8) * dir;
        return `${wob.toFixed(0)} ${(top * (1 - t)).toFixed(0)}`;
    });
    return `M${pts.join(' L')}`;
}

// Two side branches off the bolt.
function boltBranches(at: Pt, dir: number) {
    const top = VIEW_TOP - at.y;
    const y1 = top * 0.62, y2 = top * 0.34;
    return `M${18 * dir} ${y1.toFixed(0)} l${-34 * dir} 30 l${12 * dir} 6 l${-26 * dir} 40 M${-20 * dir} ${y2.toFixed(0)} l${30 * dir} 26 l${-10 * dir} 6 l${22 * dir} 34`;
}

// A shield breaks on a block: the dome flashes, cracks run over it, it falls apart in glassy shards and sparks.
function DomeBreak({ side, at, stage }: { side: Side; at: Pt; stage: Stage }) {
    const centre = toScene(stage, side, { x: DOME.x, y: DOME.y });
    const c = { x: centre.x - at.x, y: centre.y - at.y };
    const out = side === 'left' ? -1 : 1;
    return (
        <g>
            <g transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}>
                <g className="tv-dome-break">
                    <ellipse className="tv-dome-flash" rx={DOME.rx} ry={DOME.ry} />
                    <path className="tv-crack" d={`M${-out * DOME.rx * 0.97} ${CHEST.y - DOME.y} l${out * 34} -20 l${out * 18} 26 l${out * 34} -46 m${-out * 34} 46 l${out * 30} 34 l${out * 26} -10 M${-out * DOME.rx * 0.97} ${CHEST.y - DOME.y} l${out * 30} -80 l${out * 24} -12`} />
                </g>
                {Array.from({ length: 18 }, (_, j) => {
                    const a = (j / 18) * Math.PI * 2;
                    const x = Math.cos(a) * DOME.rx, y = Math.sin(a) * DOME.ry;
                    return (
                        <g key={j} transform={`translate(${x.toFixed(0)} ${y.toFixed(0)})`}>
                            <g className="tv-glass" style={cssVars({ '--dx': `${(Math.cos(a) * 80).toFixed(0)}px`, '--dy': `${(Math.sin(a) * 50 + 90).toFixed(0)}px`, '--r': `${(j % 2 ? 1 : -1) * (120 + j * 20)}deg`, '--k': j % 3 })}>
                                <path d={j % 2 ? 'M-10 -8 L10 -3 L-3 12 Z' : 'M-8 -10 L9 -8 L5 9 L-9 4 Z'} />
                            </g>
                        </g>
                    );
                })}
            </g>
            {ray(14, 120, 0.2).map(r => (
                <g key={`b${r.j}`} className="tv-zapspark is-shield" style={cssVars({ '--dx': `${(r.dx * 0.7 + out * -40).toFixed(0)}px`, '--dy': `${r.dy.toFixed(0)}px`, '--k': r.j % 3 })}><path d="M-10 0 L10 0" transform={`rotate(${(r.a * 180) / Math.PI})`} /></g>
            ))}
        </g>
    );
}

// What a hit leaves on the floor at the target's feet for a while: a scorch, a frost patch, crackling static.
export interface DecalView { id: number; spell: AttackSpell; side: Side }
export function Decal({ d, stage }: { d: DecalView; stage: Stage }) {
    const at = toScene(stage, d.side, { x: d.id % 2 ? 40 : -34, y: 6 });
    return (
        <g transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`}>
            <g className={`tv-decal is-${d.spell}`}>
                {d.spell === 'vuur' && <>
                    <ellipse className="tv-decal-scorch" rx="46" ry="9" />
                    {[-22, 0, 20].map((x, k) => <circle key={k} className="tv-decal-ember" cx={x} cy={-2} r="3" style={cssVars({ '--k': k })} />)}
                    {[-10, 14].map((x, k) => <circle key={`w${k}`} className="tv-wisp" cx={x} cy={-6} r="6" style={cssVars({ '--k': k })} />)}
                </>}
                {d.spell === 'ijs' && <>
                    <ellipse className="tv-decal-frost" rx="50" ry="10" />
                    <path className="tv-icicle" d="M-30 -2 l4 -12 l4 12 M-6 -2 l5 -16 l5 16 M18 -2 l4 -10 l4 10" />
                </>}
                {d.spell === 'bliksem' && <>
                    <ellipse className="tv-decal-scorch is-bolt" rx="40" ry="8" />
                    {[[-24, 0], [6, 1], [26, 2]].map(([x, k]) => <path key={k} className="tv-spark-loop" transform={`translate(${x} -4)`} style={cssVars({ '--k': k })} d="M0 0 l5 -7 l2 5 l6 -8" />)}
                </>}
            </g>
        </g>
    );
}

// The glows every spell uses (radial gradients: no CSS filters, iPad Safari ignores them on SVG).
export function GlowDefs() {
    return (
        <defs>
            {(['ijs', 'vuur', 'bliksem', 'schild', 'magic', 'warm', 'eye'] as const).map(g => (
                <radialGradient key={g} id={`tv-glow-${g}`}>
                    <stop offset="0" className="tv-stop-hot" />
                    <stop offset="0.42" className={`tv-stop is-${g}`} />
                    <stop offset="1" className={`tv-stop is-${g} is-none`} />
                </radialGradient>
            ))}
        </defs>
    );
}

// ── Cards and portraits ───────────────────────────────────────────────────────────────────────────────

const calm = (side: Side, won: boolean): WizardView => ({
    side, model: MODEL[side], lives: 1, max: 1, next: null, step: 0, streakKey: 0, cast: { n: 0, spell: 'ijs' },
    hit: { n: 0, spell: 'ijs', amount: 0 }, chill: 0, oops: 0, shield: false, shieldN: 0, marks: NO_MARKS, won, ko: false,
});

/** The winner on the round / match card: the staff raised. */
export function CardWizard({ side }: { side: Side }) {
    return (
        <svg className="tv-card-art" viewBox="-120 -340 240 355" aria-hidden>
            <GlowDefs />
            <g transform={side === 'right' ? 'scale(-1 1)' : undefined}><Wizard v={calm(side, true)} /></g>
        </svg>
    );
}

/** The face in a health bar's end cap. */
export function Portrait({ side }: { side: Side }) {
    const m = MODEL[side];
    const hw = HEADWEAR_AT[m];
    return (
        <svg className="tv-portrait" viewBox="-56 -262 116 150" aria-hidden>
            <GlowDefs />
            <g transform={side === 'right' ? 'scale(-1 1)' : undefined}>
                <g className={`tv-wiz is-${side} is-${m}`}>
                    <Collar />
                    <g transform="translate(2 -132)"><Face m={m} eyes="open" marks={NO_MARKS} /></g>
                    <g transform={`translate(${hw.x} ${hw.y})`}><Headwear m={m} marks={NO_MARKS} /></g>
                </g>
            </g>
        </svg>
    );
}
