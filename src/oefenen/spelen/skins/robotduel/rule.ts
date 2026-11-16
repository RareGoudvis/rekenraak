import type { DuelFlight, DuelRule } from '../../duel/types';

// Robotduel on the duel engine: a right answer is a punch (the other robot −1 life); every 3rd right in a row is
// the special (a rocket fist / a laser) for 2. A wrong answer or a time-out drops your guard: the next hit on you
// counts double and puts the guard back up. The punch flies a short moment (the wind-up), so the hit lands on
// the impact frame and the guard is read when it lands. 0 lives = the robot falls apart, round lost.

export const ROBOT = {
    // Every this many right in a row: the special.
    specialEvery: 3,
    damage: { punch: 1, special: 2 },
    // A hit on a robot with its guard down is worth this many times more.
    guardTimes: 2,
    // Wind-up to impact (the arm's keyframes in robotduel.css land on this).
    punchMs: 330,
    // The special: the charge glow, then the rocket fist flies / the beam fires.
    specialMs: 900,
    // A robot at 0 falls apart this long before the scoreboard card.
    koMs: 2600,
    // Armour plates that fall off as the robot gets hurt (shoulder, chest, helmet fin, knee).
    plates: 4,
} as const;

export type HitKind = 'punch' | 'special';

export const isSpecial = (streak: number) => streak > 0 && streak % ROBOT.specialEvery === 0;

/** The lives one hit takes: a punch or a special, doubled on a dropped guard. */
export const hitOf = (kind: HitKind, guardDown: boolean) => ROBOT.damage[kind] * (guardDown ? ROBOT.guardTimes : 1);

/** The tag on a hit's damage event: its kind, '-x2' when it struck a dropped guard. */
export const hitTag = (kind: HitKind, guardDown: boolean) => `${kind}${guardDown ? '-x2' : ''}`;
export const parseHitTag = (tag: string | undefined): { kind: HitKind; double: boolean } => ({
    kind: tag?.startsWith('special') ? 'special' : 'punch',
    double: !!tag?.endsWith('-x2'),
});

/** The special meter: right answers in a row toward the next special (0..specialEvery−1 lit). */
export const chargeOf = (streak: number) => streak % ROBOT.specialEvery;

/** How many armour plates are off at these lives (all of them at 0). */
export function platesOff(lives: number, max: number): number {
    if (lives <= 0) return ROBOT.plates;
    const lost = Math.max(0, 1 - lives / Math.max(1, max));
    return Math.min(ROBOT.plates, Math.max(0, Math.ceil(lost * ROBOT.plates - 1e-9)));
}

export const kindOf = (f: Pick<DuelFlight, 'data'>): HitKind => (f.data.special ? 'special' : 'punch');

export const ROBOT_RULE: DuelRule = {
    right: ({ other, streak }) => {
        const special = isSpecial(streak);
        return { launch: { ms: special ? ROBOT.specialMs : ROBOT.punchMs, to: other, tag: special ? 'special' : 'punch', data: { special } } };
    },
    // The guard is read on impact: a robot that dropped it while the fist was on its way still takes the double.
    land: ({ other, them }, f) => {
        const down = !!them.flags.guard;
        const kind = kindOf(f);
        return { damage: { [other]: hitOf(kind, down) }, flags: { [other]: { guard: 0 } }, tag: hitTag(kind, down) };
    },
    wrong: ({ side }) => ({ flags: { [side]: { guard: 1 } } }),
    cardMs: ROBOT.koMs,
};
