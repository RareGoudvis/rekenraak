import type { CSSProperties, ReactNode } from 'react';
import type { DuelFlight, Side } from '../../duel/types';
import { CHEST, DOME, FLOOR, MODEL, ORB, SHOULDER, WIZ_X, landPoint, pathAt, releaseAt, type Model, type Pt } from './geometry';
import { MAX_MARK, SPELLS, TOVER, spellOfFlight, type AttackSpell, type Spell, type WizardMarks } from './rule';

// Tovenaarsduel's wizards and spells. Code-drawn SVG, flat fills under the thick ink outline. Every wizard is drawn
// facing right with its feet at (0, 0); the right one is mirrored, so "forward" is +x for both. Everything moves by
// CSS: an animated <g> never carries a transform attribute (a pivot wrapper around it does), so CSS and SVG
// transforms never fight. Restarts: a parity class (-0 / -1, twin keyframes) or a remount by key.


const cssVars = (v: Record<string, string | number>) => v as CSSProperties;

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
    // Casts started, and the latest spell: the pose and the charge glow restart per cast.
    cast: { n: number; spell: Spell };
    // Hits taken (not blocked), the latest spell and its damage: the stagger restarts per hit.
    hit: { n: number; spell: AttackSpell; amount: number };
    // IJspijl hits: the shiver and the frost crust restart per hit (a picture only: no keypad freezes).
    chill: number;
    // Wrong answers and time-outs: the spell fizzles.
    oops: number;
    shield: boolean;
    // Shields raised this round (the dome grows per raise).
    shieldN: number;
    marks: WizardMarks;
    won: boolean;
    ko: boolean;
}

const parity = (name: string, n: number) => (n ? ` ${name}-${n % 2}` : '');

function Boots({ m }: { m: Model }) {
    return (
        <g>
            <path className="tv-boot" d="M-32 0 Q-36 -12 -22 -13 L-6 -13 L-6 0 Z" />
            <path className="tv-boot" d={m === 'sage' ? 'M2 0 L2 -13 L22 -13 Q36 -13 40 -6 Q44 -14 50 -9 Q48 0 32 0 Z' : 'M2 0 L2 -13 L24 -13 Q40 -12 42 0 Z'} />
        </g>
    );
}

const ROBE: Record<Model, string> = {
    sage: 'M-20 0 Q-34 54 -52 116 Q-40 122 -28 116 Q-16 123 -2 116 Q12 123 26 116 Q38 122 50 116 Q34 54 22 0 Z',
    stout: 'M-24 0 Q-50 50 -54 116 Q-42 122 -30 116 Q-16 123 -2 116 Q12 123 26 116 Q40 122 54 116 Q50 50 26 0 Z',
};

// The robe from the shoulders (0, −124) down; its hem flutters (the pivot is the collar).
function Robe({ m, singe }: { m: Model; singe: number }) {
    const body = ROBE[m];
    return (
        <g transform="translate(0 -124)">
            <g className="tv-robe">
                <path className="tv-team" d={body} />
                <path className="tv-team-dk" d={m === 'sage' ? 'M-20 0 Q-34 54 -52 116 Q-40 122 -28 116 Q-20 60 -8 6 Z' : 'M-24 0 Q-50 50 -54 116 Q-42 122 -30 116 Q-24 60 -10 6 Z'} />
                <path className="tv-trim" d={m === 'sage' ? 'M-50 110 Q-38 116 -28 110 Q-16 117 -2 110 Q12 117 26 110 Q38 116 48 110' : 'M-52 110 Q-40 116 -30 110 Q-16 117 -2 110 Q12 117 26 110 Q40 116 52 110'} />
                {(m === 'sage' ? [[10, 36], [-14, 70], [24, 88]] : [[14, 40], [-18, 78], [30, 92]]).map(([x, y], i) => (
                    <path key={i} className="tv-robe-star" transform={`translate(${x} ${y})`} d={m === 'sage' ? 'M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z' : 'M3 -6 A6 6 0 1 0 3 6 A4.5 4.5 0 1 1 3 -6 Z'} />
                ))}
                {/* Fire hits: the hem gets singed. */}
                {singe >= MAX_MARK && <path className="tv-scorch" d="M-30 116 Q-24 100 -14 108 Q-6 96 2 110 Q10 102 16 114 Z" />}
                <path className="tv-belt" d={m === 'sage' ? 'M-30 50 Q0 58 32 50' : 'M-36 48 Q0 58 38 48'} />
                <path className="tv-belt-knot" d="M8 54 l-4 18 M12 54 l4 16" />
            </g>
        </g>
    );
}

export type Eyes = 'open' | 'happy' | 'dizzy' | 'oops';

function Face({ m, eyes, marks }: { m: Model; eyes: Eyes; marks: WizardMarks }) {
    const sage = m === 'sage';
    return (
        <g>
            <circle className="tv-ear" cx="-15" cy="-12" r="6" />
            <circle className="tv-skin" cx="4" cy="-14" r="23" />
            {/* Lightning hits: soot on the cheeks and nose. */}
            {marks.soot >= 1 && <ellipse className="tv-soot" cx="14" cy="-2" rx="9" ry="5" />}
            {marks.soot >= 2 && <ellipse className="tv-soot" cx="-6" cy="-24" rx="7" ry="4" />}
            {eyes === 'happy' ? <path className="tv-eye-line" d="M5 -20 q4 -6 8 0 M17 -20 q4 -6 8 0" />
                : eyes === 'dizzy' ? <path className="tv-eye-line" d="M9 -20 m-4 0 a4 4 0 1 1 4 4 a2 2 0 1 1 -2 -2 M21 -20 m-4 0 a4 4 0 1 1 4 4 a2 2 0 1 1 -2 -2" />
                    : (
                        <g className={`tv-eyes${eyes === 'oops' ? ' is-oops' : ''}`}>
                            <g transform="translate(9 -20)"><g className="tv-blink"><circle className="tv-eye" r="3.8" /><circle className="tv-glint" cx="1.2" cy="-1.3" r="1.2" /></g></g>
                            <g transform="translate(21 -20)"><g className="tv-blink"><circle className="tv-eye" r="3.8" /><circle className="tv-glint" cx="1.2" cy="-1.3" r="1.2" /></g></g>
                        </g>
                    )}
            <path className={sage ? 'tv-brow' : 'tv-brow is-dark'} d={eyes === 'oops' ? 'M2 -30 q6 -2 11 2 M16 -28 q5 -4 11 -2' : 'M2 -28 q6 -6 11 -2 M16 -30 q5 -4 11 0'} />
            {sage ? (
                <g>
                    <path className={`tv-beard${marks.frost ? ' is-frost' : ''}`} d="M-12 -6 Q-16 30 6 64 Q12 44 28 20 Q34 4 30 -4 Q16 6 2 2 Q-6 0 -12 -6 Z" />
                    <path className="tv-beard-line" d="M2 14 Q4 34 8 50 M16 10 Q18 24 14 40" />
                </g>
            ) : (
                <g>
                    <path className={`tv-beard is-dark${marks.frost ? ' is-frost' : ''}`} d="M-8 -4 Q-8 20 12 36 Q22 22 30 4 Q16 10 2 5 Z" />
                </g>
            )}
            {/* IJspijl hits: frost on the beard and icicles hanging from it. */}
            {marks.frost >= 1 && <path className="tv-frost" d={sage ? 'M-8 10 Q0 18 10 12 Q20 20 26 12' : 'M-4 10 Q6 18 14 12 Q22 16 26 8'} />}
            {marks.frost >= 2 && <path className="tv-icicle" d={sage ? 'M2 44 l3 12 l3 -12 M12 34 l2.5 10 l2.5 -10 M-4 26 l2.5 9 l2.5 -9' : 'M6 26 l3 12 l3 -12 M16 22 l2.5 10 l2.5 -10'} />}
            <path className={sage ? 'tv-moustache' : 'tv-moustache is-dark'} d={sage ? 'M8 -4 Q18 -12 32 -4 Q24 2 16 0 Q10 2 8 -4 Z' : 'M6 -4 Q16 -10 22 -6 Q30 -12 38 -2 Q32 4 22 0 Q14 4 6 -4 Z'} />
            <ellipse className="tv-nose" cx="24" cy="-10" rx="8.5" ry="7.5" />
            {marks.soot >= 1 && <circle className="tv-soot" cx="26" cy="-8" r="3.4" />}
        </g>
    );
}

// The hat around the brim's centre (0, 0).
function HatArt({ m, marks }: { m: Model; marks: WizardMarks }) {
    const sage = m === 'sage';
    return (
        <g>
            {/* Lightning hits: frizzy hair poking out under the brim. */}
            {marks.soot >= 2 && <path className="tv-frizz" d="M-34 4 l-8 -2 l6 6 l-9 2 l9 3 M-26 8 l-4 8 l6 -4" />}
            <ellipse className="tv-team-dk" cx="0" cy="0" rx="44" ry="9" />
            <path className="tv-team" d={sage
                ? 'M-28 -2 Q-20 -40 -14 -70 Q-10 -90 -18 -106 Q4 -88 10 -64 Q18 -30 28 -2 Z'
                : 'M-30 -2 Q-22 -40 -6 -64 Q4 -80 26 -86 Q38 -84 36 -74 Q18 -70 12 -54 Q20 -26 30 -2 Z'} />
            <path className="tv-band" d={sage ? 'M-27 -6 Q0 2 27 -6 L25 -17 Q0 -9 -25 -17 Z' : 'M-29 -6 Q0 2 29 -6 L27 -17 Q0 -9 -27 -17 Z'} />
            <rect className="tv-buckle" x="-6" y="-16" width="12" height="11" rx="2" />
            {sage
                ? <path className="tv-emblem" transform="translate(0 -42)" d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6 Z" />
                : <path className="tv-emblem" transform="translate(4 -40)" d="M3 -9 A9 9 0 1 0 3 9 A6.5 6.5 0 1 1 3 -9 Z" />}
            {sage ? <path className="tv-emblem" transform="translate(-8 -70) scale(.6)" d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6 Z" />
                : <circle className="tv-pompom" cx="38" cy="-78" r="7" />}
            {/* Fire hits: the tip goes black and smokes; then the brim is singed too. */}
            {marks.singe >= 1 && <path className="tv-scorch" d={sage ? 'M-18 -106 Q-4 -98 2 -84 Q-6 -80 -12 -86 Q-14 -96 -18 -106 Z' : 'M26 -86 Q38 -84 36 -74 Q30 -74 24 -78 Q22 -84 26 -86 Z'} />}
            {marks.singe >= 2 && <path className="tv-scorch" d="M20 -4 Q30 -8 40 -4 Q34 2 26 2 Z M-40 -2 Q-34 -6 -28 -2 Z" />}
            {marks.singe >= 1 && (
                <g transform={sage ? 'translate(-16 -106)' : 'translate(36 -82)'}>
                    {[0, 1, 2].map(k => <circle key={k} className="tv-wisp" r={4 + k * 1.5} style={cssVars({ '--k': k })} />)}
                </g>
            )}
            {/* IJspijl hits: icicles under the brim. */}
            {marks.frost >= 1 && <path className="tv-icicle" d="M-34 6 l3 10 l3 -10 M30 5 l2.5 9 l2.5 -9" />}
            {marks.frost >= 3 && <path className="tv-icicle" d="M-22 8 l3 12 l3 -12 M18 8 l3 11 l3 -11" />}
            {marks.frost >= 2 && <path className="tv-frost" d="M-40 -1 Q-30 -6 -18 -3 M16 -3 Q28 -6 40 -1" />}
        </g>
    );
}

// The orb on the staff: the next spell's colour and icon, with sparkles. Refills (pops in) after every answer.
function Orb({ next, streakKey, cast }: { next: Spell | null; streakKey: number; cast: boolean }) {
    if (!next) return <circle className="tv-crystal" r="12" />;
    return (
        <g key={`${next}-${streakKey}`} className={`tv-orb is-${next}${cast ? ' is-refill' : ''}`}>
            <circle className="tv-orb-glow" r="50" fill={`url(#tv-glow-${next})`} />
            <circle className="tv-orb-ball" r="24" />
            <path className="tv-orb-shine" d="M-14 -10 Q-8 -18 2 -19" />
            <g transform="scale(1.35)"><g className="tv-orb-icon"><SpellIcon spell={next} /></g></g>
            <g className="tv-orb-sparks">
                {[0, 1, 2].map(k => <path key={k} className="tv-orb-spark" style={cssVars({ '--k': k })} d="M0 -4 L1.2 -1.2 L4 0 L1.2 1.2 L0 4 L-1.2 1.2 L-4 0 L-1.2 -1.2 Z" />)}
            </g>
        </g>
    );
}

// The charge at the orb before a spell leaves: a glow that swells and motes rushing in.
function Charge({ spell }: { spell: Spell }) {
    return (
        <g className={`tv-charge is-${spell}`}>
            <circle className="tv-charge-glow" r="58" fill={`url(#tv-glow-${spell})`} />
            {Array.from({ length: 7 }, (_, i) => {
                const a = (i / 7) * Math.PI * 2;
                return (
                    <g key={i} className="tv-mote" style={cssVars({ '--mx': `${Math.cos(a) * 62}px`, '--my': `${Math.sin(a) * 62}px`, '--k': i % 3 })}>
                        <circle r="3.6" />
                    </g>
                );
            })}
        </g>
    );
}

// The front arm around the shoulder (0, 0): a wide sleeve, the hand and the staff with the orb on top.
function StaffArm({ v }: { v: WizardView }) {
    const castSpell = v.cast.n > 0 ? v.cast.spell : null;
    return (
        <g transform={`translate(${SHOULDER.x} ${SHOULDER.y})`}>
            <g key={`a${v.cast.n}`} className={`tv-arm${castSpell ? ` is-${castSpell}` : ''}`}>
                <rect className="tv-staff" x="28" y="-96" width="8" height="200" rx="4" />
                <path className="tv-staff-claw" d="M26 -92 Q20 -112 30 -122 M38 -92 Q44 -112 34 -122 M32 -94 V-80" />
                <g transform={`translate(${ORB.x - SHOULDER.x} ${ORB.y - SHOULDER.y})`}>
                    {v.cast.n > 0 && castSpell !== 'schild' && <Charge spell={castSpell!} />}
                    <Orb next={v.ko ? null : v.next} streakKey={v.streakKey} cast={v.cast.n > 0} />
                    {v.oops > 0 && (
                        <g key={`o${v.oops}`} className="tv-fizzle">
                            {[0, 1, 2, 3, 4].map(k => <circle key={k} className="tv-fizzle-puff" r={10 + k * 3} style={cssVars({ '--k': k })} />)}
                        </g>
                    )}
                </g>
                <path className="tv-team" d="M-10 -8 Q16 -10 34 8 L24 26 Q10 12 -8 12 Z" />
                <path className="tv-trim" d="M34 8 L24 26" />
                <circle className="tv-skin" cx="32" cy="12" r="8.5" />
            </g>
        </g>
    );
}

// The floor rune circle: one rune per ladder step, lit in its spell's colour as the streak climbs.
function RuneRing({ step, live }: { step: number; live: boolean }) {
    const at = [[-58, 2], [-22, 12], [22, 12], [58, 2]] as const;
    return (
        <g className={`tv-runes${live && step > 0 ? ' is-lit' : ''}`}>
            <ellipse className="tv-rune-ring" cx="2" cy="0" rx="78" ry="15" />
            <ellipse className="tv-rune-ring is-inner" cx="2" cy="0" rx="62" ry="10" />
            {at.map(([x, y], i) => (
                <g key={i} transform={`translate(${x} ${y})`}>
                    <g key={live && i < step ? `on${step}` : 'off'} className={`tv-rune is-${SPELLS[i]}${live && i < step ? ' is-on' : ''}`}>
                        <path d={['M-4 -4 L4 4 M-4 4 L4 -4', 'M-5 3 L0 -4 L5 3', 'M-4 -4 V4 H4', 'M-5 0 H5 M0 -4 V4'][i]} />
                    </g>
                </g>
            ))}
        </g>
    );
}

export function Wizard({ v }: { v: WizardView }) {
    const between = v.won || v.ko;
    const low = !v.ko && v.lives / Math.max(1, v.max) <= 0.3;
    const eyes: Eyes = v.ko ? 'dizzy' : v.won ? 'happy' : v.oops && !between ? 'oops' : 'open';
    const castCls = v.cast.n ? ` tv-cast-${v.cast.n % 2} is-c-${v.cast.spell}` : '';
    const hitCls = v.hit.n ? ` tv-hit-${v.hit.n % 2} is-dmg-${Math.min(3, v.hit.amount)} is-h-${v.hit.spell}` : '';
    const cls = `tv-wiz is-${v.side} is-${v.model}${v.won ? ' is-win' : ''}${v.ko ? ' is-ko' : ''}${low ? ' is-low' : ''}`;
    return (
        <g className={cls}>
            <RuneRing step={v.step} live={!between} />
            <ellipse className="tv-shadow" cx="2" cy="2" rx="62" ry="9" />
            <g className={`tv-react${hitCls}`}>
                <g className={`tv-shiver${parity('tv-chill', v.chill)}`}>
                    <g className={`tv-lean${castCls}`}>
                        <g className={`tv-idle${parity('tv-oops', v.oops)}`}>
                            {/* The free arm behind the robe. */}
                            <path className="tv-team-dk" d="M-12 -116 Q-36 -100 -42 -70 L-26 -64 Q-22 -92 -4 -104 Z" />
                            <circle className="tv-skin" cx="-34" cy="-64" r="7.5" />
                            <Boots m={v.model} />
                            <Robe m={v.model} singe={v.marks.singe} />
                            <g transform="translate(2 -132)">
                                <g className="tv-head"><Face m={v.model} eyes={eyes} marks={v.marks} /></g>
                            </g>
                            <g transform="translate(4 -168)">
                                <g className="tv-hat"><HatArt m={v.model} marks={v.marks} /></g>
                            </g>
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

// The frost after an IJspijl hit: an icy crust on the robe and icicles, fading after a while (only a picture).
function FrostCrust({ m }: { m: Model }) {
    return (
        <g className="tv-crust">
            <g transform="translate(0 -124)"><path className="tv-crust-ice" d={ROBE[m]} /></g>
            <path className="tv-crust-ice is-hat" d="M-24 -170 Q-16 -200 -12 -230 L8 -230 Q16 -200 24 -170 Z" />
            <path className="tv-icicle" d="M-46 -6 l4 16 l4 -16 M-20 -6 l4 20 l4 -20 M8 -6 l4 14 l4 -14 M36 -6 l4 18 l4 -18 M-38 -160 l3 12 l3 -12 M30 -160 l3 10 l3 -10" />
            {[[-30, -80], [20, -60], [-10, -150], [30, -190], [-36, -130]].map(([x, y], i) => (
                <path key={i} className="tv-crust-flake" transform={`translate(${x} ${y})`} style={cssVars({ '--k': i })} d="M0 -6 V6 M-5 -3 L5 3 M-5 3 L5 -3" />
            ))}
        </g>
    );
}

// Lightning-struck: sparks crackle around the wizard now and then.
function Crackle() {
    return (
        <g className="tv-crackle">
            {[[-30, -200, 0], [36, -150, 1], [-40, -110, 2]].map(([x, y, k]) => (
                <path key={k} className="tv-spark-loop" transform={`translate(${x} ${y})`} style={cssVars({ '--k': k })} d="M0 0 l6 -8 l2 6 l7 -9" />
            ))}
        </g>
    );
}

// The shield on yourself: a dome of light with runes that turn, round the whole wizard.
function Dome() {
    return (
        <g transform={`translate(${DOME.x} ${DOME.y})`}>
            <g className="tv-dome">
                <ellipse className="tv-dome-fill" rx={DOME.rx} ry={DOME.ry} />
                <path className="tv-dome-shine" d={`M${-DOME.rx * 0.6} ${-DOME.ry * 0.62} Q${-DOME.rx * 0.2} ${-DOME.ry * 0.96} ${DOME.rx * 0.3} ${-DOME.ry * 0.88}`} />
                <g transform={`scale(1 ${DOME.ry / DOME.rx})`}>
                    <g className="tv-dome-runes">
                        {Array.from({ length: 8 }, (_, i) => {
                            const a = (i / 8) * Math.PI * 2;
                            return <path key={i} className="tv-dome-rune" transform={`translate(${Math.cos(a) * (DOME.rx - 12)} ${Math.sin(a) * (DOME.rx - 12)}) rotate(${(a * 180) / Math.PI + 90})`} d={['M-4 -4 L4 4 M-4 4 L4 -4', 'M-5 3 L0 -4 L5 3', 'M-4 -4 V4 H4', 'M-5 0 H5 M0 -4 V4'][i % 4]} />;
                        })}
                    </g>
                </g>
            </g>
        </g>
    );
}

// Defeated (0 lives): a poof of smoke, the hat flies off and lands on the floor, dizzy stars turn over the head.
function Defeat({ m, marks }: { m: Model; marks: WizardMarks }) {
    return (
        <g className="tv-defeat">
            <g transform="translate(4 -168)">
                <g className="tv-hat-fly"><g className="tv-hat-spin"><HatArt m={m} marks={marks} /></g></g>
            </g>
            <g transform="translate(6 -132) scale(1 .38)">
                <g className="tv-dizzy">
                    {[0, 1, 2, 3].map(k => {
                        const a = (k / 4) * Math.PI * 2;
                        return <path key={k} className="tv-dizzy-star" transform={`translate(${Math.cos(a) * 36} ${Math.sin(a) * 36}) scale(1 2.4)`} d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" />;
                    })}
                </g>
            </g>
            {[[-30, -120, 44], [24, -150, 40], [0, -80, 52], [-46, -60, 36], [40, -70, 38], [-4, -200, 34], [30, -30, 30], [-34, -20, 30]].map(([x, y, r], i) => (
                <circle key={i} className="tv-poof" cx={x} cy={y} r={r} style={cssVars({ '--k': i })} />
            ))}
        </g>
    );
}

// The winner: sparkles burst from the raised staff, again and again.
function WinSparkles() {
    return (
        <g transform={`translate(${ORB.x + 10} ${ORB.y - 60})`}>
            {[0, 1, 2].map(k => (
                <g key={k} className="tv-win-burst" style={cssVars({ '--k': k })}>
                    {Array.from({ length: 8 }, (_, i) => <path key={i} className="tv-ray" transform={`rotate(${i * 45})`} d="M10 0 L26 0" />)}
                </g>
            ))}
        </g>
    );
}

// ── Spells in the air (scene units) ───────────────────────────────────────────────────────────────

// A fireball's arc: how high over the straight line its middle flies; the storm cloud's height over a Bliksem target.
const FIRE_ARC = 70;
const STORM_Y = 22;

export function Shot({ f, shielded }: { f: DuelFlight; shielded: boolean }) {
    const spell = spellOfFlight(f);
    const charge = TOVER.chargeMs[spell];
    const fly = TOVER.castMs[spell] - charge;
    const from = releaseAt(f.from);
    const to = landPoint(f.to, shielded);
    const dir = f.from === 'left' ? 1 : -1;
    const timing = cssVars({ '--charge': `${charge}ms`, '--fly': `${fly}ms`, '--dx': `${to.x - from.x}px`, '--dy': `${to.y - from.y}px`, '--arc': `${-FIRE_ARC}px` });

    if (spell === 'bliksem') {
        // The bolt itself strikes on impact (Impact); in the air: a storm cloud gathers over the target.
        return (
            <g className="tv-storm" style={timing}>
                <g transform={`translate(${to.x} ${STORM_Y})`}>
                    <g className="tv-cloud">
                        <path className="tv-cloud-body" d="M-70 10 Q-80 -14 -52 -18 Q-46 -42 -16 -36 Q0 -56 26 -40 Q56 -46 60 -18 Q86 -12 72 10 Z" />
                        <path className="tv-cloud-zap" d="M-30 6 l-6 14 l8 -2 l-4 12 M24 8 l-4 12 l8 -3 l-3 11" />
                    </g>
                </g>
                {/* A thin zap up from the staff: the call to the sky. */}
                <path className="tv-skyzap" d={`M${from.x} ${from.y} l${8 * dir} -40 l${-6 * dir} -6 l${10 * dir} -60`} />
            </g>
        );
    }
    const arc = spell === 'vuur' ? FIRE_ARC : 0;
    const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
    // The trail: sparks left behind along the path, each lit as the spell passes.
    const trail = Array.from({ length: spell === 'vuur' ? 12 : 10 }, (_, i) => {
        const t = (i + 1) / (spell === 'vuur' ? 13 : 11);
        const p = pathAt(from, to, t, arc);
        return { ...p, delay: charge + fly * t, k: i };
    });
    return (
        <g className={`tv-shot is-${spell}`}>
            {trail.map(p => (
                <g key={p.k} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}>
                    {spell === 'ijs'
                        ? <path className="tv-trail-flake" style={cssVars({ '--d': `${p.delay}ms`, '--k': p.k % 3 })} d="M0 -5 V5 M-4.3 -2.5 L4.3 2.5 M-4.3 2.5 L4.3 -2.5" />
                        : <circle className={p.k % 2 ? 'tv-trail-smoke' : 'tv-trail-ember'} r={p.k % 2 ? 9 : 4} style={cssVars({ '--d': `${p.delay}ms`, '--k': p.k % 3 })} />}
                </g>
            ))}
            <g transform={`translate(${from.x.toFixed(1)} ${from.y.toFixed(1)})`}>
                <g className="tv-fly-x" style={timing}>
                    <g className="tv-fly-y" style={timing}>
                        {spell === 'ijs' ? (
                            <g transform={`rotate(${angle.toFixed(1)})`}>
                                <g className="tv-spear">
                                    <path className="tv-spear-tail" d="M-70 0 L-20 -7 L-20 7 Z" />
                                    <path className="tv-spear-body" d="M-34 -8 L22 -6 L44 0 L22 6 L-34 8 L-26 0 Z" />
                                    <path className="tv-spear-core" d="M-24 0 L36 0" />
                                    <path className="tv-spear-shard" d="M-10 -8 L-2 -16 L2 -7 M6 7 L14 14 L16 6" />
                                </g>
                            </g>
                        ) : (
                            <g className="tv-fireball">
                                <circle className="tv-fire-glow" r="46" fill="url(#tv-glow-vuur)" />
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
    );
}

export interface ImpactView { id: number; spell: AttackSpell; side: Side; blocked: boolean; amount: number }

// ── Impacts (scene units): a flash, the spell's burst, debris; a shield shatters on a block ──
export function Impact({ i }: { i: ImpactView }) {
    const at = landPoint(i.side, i.blocked);
    const dir = i.side === 'right' ? 1 : -1;
    const ray = (n: number, d: number, k = 0) => Array.from({ length: n }, (_, j) => {
        const a = (j / n) * Math.PI * 2 + k;
        return { a, dx: Math.cos(a) * d, dy: Math.sin(a) * d * 0.85, j };
    });
    let burst: ReactNode;
    if (i.spell === 'ijs') burst = (
        <g>
            <circle className="tv-imp-flash is-ijs" r="70" fill="url(#tv-glow-ijs)" />
            <path className="tv-frost-star" d="M0 -40 L8 -10 L38 -14 L12 4 L26 32 L0 14 L-26 32 L-12 4 L-38 -14 L-8 -10 Z" />
            {ray(10, 110, 0.2).map(r => (
                <g key={r.j} className="tv-shard" style={cssVars({ '--dx': `${r.dx}px`, '--dy': `${r.dy}px`, '--r': `${(r.a * 180) / Math.PI + 300}deg`, '--k': r.j % 3 })}>
                    <path d="M0 -9 L4 0 L0 9 L-4 0 Z" />
                </g>
            ))}
            {ray(6, 60, 0.6).map(r => <circle key={`m${r.j}`} className="tv-mist" cx={r.dx * 0.4} cy={r.dy * 0.4} r="18" style={cssVars({ '--k': r.j })} />)}
        </g>
    );
    else if (i.spell === 'vuur') burst = (
        <g>
            <circle className="tv-imp-flash is-vuur" r="96" fill="url(#tv-glow-vuur)" />
            <path className="tv-boom-out" d="M0 -58 L14 -30 L46 -40 L32 -10 L60 6 L28 18 L38 50 L8 32 L-10 60 L-18 28 L-52 40 L-34 10 L-60 -8 L-28 -18 L-36 -50 L-8 -30 Z" />
            <path className="tv-boom-in" d="M0 -32 L10 -14 L30 -18 L18 0 L30 16 L8 14 L0 34 L-8 14 L-30 16 L-18 0 L-30 -18 L-10 -14 Z" />
            {ray(14, 130, 0.1).map(r => (
                <g key={r.j} className="tv-ember" style={cssVars({ '--dx': `${r.dx}px`, '--dy': `${r.dy - 30}px`, '--k': r.j % 4 })}><circle r={r.j % 3 ? 3.5 : 5} /></g>
            ))}
            {[[-30, -20, 26], [26, -30, 30], [0, -50, 34], [-10, 10, 22], [34, 6, 22]].map(([x, y, r], j) => (
                <circle key={`s${j}`} className="tv-boom-smoke" cx={x} cy={y} r={r} style={cssVars({ '--k': j })} />
            ))}
        </g>
    );
    else burst = (
        <g>
            <circle className="tv-imp-flash is-bliksem" r="120" fill="url(#tv-glow-bliksem)" />
            {/* The storm cloud that sent it drifts apart. */}
            <g transform={`translate(0 ${(STORM_Y - at.y).toFixed(0)})`}>
                <path className="tv-cloud-body is-fading" d="M-70 10 Q-80 -14 -52 -18 Q-46 -42 -16 -36 Q0 -56 26 -40 Q56 -46 60 -18 Q86 -12 72 10 Z" />
            </g>
            {/* The bolt from the storm cloud down onto the target. */}
            <g className="tv-bolt">
                <path className="tv-bolt-glow" d={boltPath(at, i.blocked)} />
                <path className="tv-bolt-core" d={boltPath(at, i.blocked)} />
                <path className="tv-bolt-fork" d={`M${-14 * dir} ${-160} l${-22 * dir} 30 l${10 * dir} 4 l${-16 * dir} 34`} />
            </g>
            <path className="tv-boom-in is-bolt" d="M0 -30 L8 -10 L30 -16 L14 2 L28 22 L4 12 L-4 32 L-8 10 L-30 18 L-14 -2 L-26 -22 L-6 -12 Z" />
            {ray(12, 120, 0.3).map(r => (
                <g key={r.j} className="tv-zapspark" style={cssVars({ '--dx': `${r.dx}px`, '--dy': `${r.dy}px`, '--k': r.j % 3 })}><path d="M-8 0 L8 0" transform={`rotate(${(r.a * 180) / Math.PI})`} /></g>
            ))}
            <ellipse className="tv-scorch-floor" cx="0" cy={FLOOR - at.y + 2} rx="60" ry="10" />
        </g>
    );
    return (
        <g transform={`translate(${at.x.toFixed(1)} ${at.y.toFixed(1)})`}>
            <g className={`tv-impact is-${i.spell}${i.blocked ? ' is-blocked' : ''} is-dmg-${i.amount}`}>
                {i.blocked && <DomeBreak side={i.side} at={at} />}
                <g className="tv-burst">{burst}</g>
            </g>
        </g>
    );
}

// The bolt's zigzag from the cloud down to the hit point (0, 0).
function boltPath(at: Pt, blocked: boolean) {
    const top = STORM_Y + 8 - at.y;
    const n = 6;
    const pts = Array.from({ length: n + 1 }, (_, k) => {
        const t = k / n;
        const wob = k === 0 || k === n ? 0 : (k % 2 ? 1 : -1) * (14 + (k % 3) * 6);
        return `${wob.toFixed(0)} ${(top * (1 - t)).toFixed(0)}`;
    });
    return `M${pts.join(' L')}${blocked ? '' : ' l-6 10 M0 0 l8 12'}`;
}

// A shield breaks on a block: the dome flashes, cracks run over it and it falls apart in glassy shards.
function DomeBreak({ side, at }: { side: Side; at: Pt }) {
    // The dome's centre relative to the hit point.
    const c = { x: (side === 'left' ? WIZ_X.left + DOME.x : WIZ_X.right - DOME.x) - at.x, y: FLOOR + DOME.y - at.y };
    const out = side === 'left' ? -1 : 1;
    return (
        <g transform={`translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})`}>
            <g className="tv-dome-break">
                <ellipse className="tv-dome-flash" rx={DOME.rx} ry={DOME.ry} />
                <path className="tv-crack" d={`M${-out * DOME.rx * 0.95} ${CHEST.y - DOME.y} l${out * 30} -18 l${out * 16} 22 l${out * 30} -40 m${-out * 30} 40 l${out * 26} 30 l${out * 22} -8 M${-out * DOME.rx * 0.95} ${CHEST.y - DOME.y} l${out * 26} -70 l${out * 20} -10`} />
            </g>
            {Array.from({ length: 14 }, (_, j) => {
                const a = (j / 14) * Math.PI * 2;
                const x = Math.cos(a) * DOME.rx, y = Math.sin(a) * DOME.ry;
                return (
                    <g key={j} transform={`translate(${x.toFixed(0)} ${y.toFixed(0)})`}>
                        <g className="tv-glass" style={cssVars({ '--dx': `${(Math.cos(a) * 60).toFixed(0)}px`, '--dy': `${(Math.sin(a) * 40 + 70).toFixed(0)}px`, '--r': `${(j % 2 ? 1 : -1) * (120 + j * 20)}deg`, '--k': j % 3 })}>
                            <path d={j % 2 ? 'M-8 -6 L8 -2 L-2 9 Z' : 'M-6 -8 L7 -6 L4 7 L-7 3 Z'} />
                        </g>
                    </g>
                );
            })}
        </g>
    );
}

// The glows every spell uses (radial gradients: no CSS filters, iPad Safari ignores them on SVG).
export function GlowDefs() {
    return (
        <defs>
            {(['ijs', 'vuur', 'bliksem', 'schild', 'magic', 'warm'] as const).map(g => (
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
    hit: { n: 0, spell: 'ijs', amount: 0 }, chill: 0, oops: 0, shield: false, shieldN: 0, marks: { singe: 0, frost: 0, soot: 0 }, won, ko: false,
});

/** The winner on the round / match card: the staff raised. */
export function CardWizard({ side }: { side: Side }) {
    return (
        <svg className="tv-card-art" viewBox="-110 -330 220 345" aria-hidden>
            <GlowDefs />
            <g transform={side === 'right' ? 'scale(-1 1)' : undefined}><Wizard v={calm(side, true)} /></g>
        </svg>
    );
}

/** The face in a health bar's end cap. */
export function Portrait({ side }: { side: Side }) {
    return (
        <svg className="tv-portrait" viewBox="-52 -252 110 132" aria-hidden>
            <g transform={side === 'right' ? 'scale(-1 1)' : undefined}>
                <g className={`tv-wiz is-${side} is-${MODEL[side]}`}>
                    <g transform="translate(2 -132)"><Face m={MODEL[side]} eyes="open" marks={{ singe: 0, frost: 0, soot: 0 }} /></g>
                    <g transform="translate(4 -168)"><HatArt m={MODEL[side]} marks={{ singe: 0, frost: 0, soot: 0 }} /></g>
                </g>
            </g>
        </svg>
    );
}
