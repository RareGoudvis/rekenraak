import type { DuelFlight, DuelRule, DuelSideView, Side } from '../../duel/types';

// Meteorietenregen on the duel engine: two bases on Mars, own sums each. A right answer launches a meteor at
// the other base (it lands 3 s later); every 2 right in a row raise an energy shield (at most 2 stacked), and a
// shield eats one meteor when it lands. An unshielded hit costs a life; 0 = the base explodes, round lost.
// A wrong answer or a Moeilijk time-out only breaks the streak (the engine resets it): shields that are up stay.

export const METEOR = {
    flightMs: 3000,
    // Every this many right in a row: one more shield.
    shieldEvery: 2,
    maxShields: 2,
    // The base explodes into a crater this long before the scoreboard card.
    endMs: 3200,
} as const;

/** Shields a side has up (its flag; absent = 0). */
export const shieldsOf = (v: Pick<DuelSideView, 'flags'>) => v.flags.shield ?? 0;

/** This right answer (streak counted) raises a shield. */
export const raisesShield = (streak: number) => streak > 0 && streak % METEOR.shieldEvery === 0;

export const METEOR_RULE: DuelRule = {
    right: ({ side, other, streak, me }) => {
        const up = raisesShield(streak) && shieldsOf(me) < METEOR.maxShields;
        return {
            launch: { ms: METEOR.flightMs, tag: 'meteor', effect: { damage: { [other]: 1 }, tag: 'hit' } },
            ...(up && { flags: { [side]: { shield: shieldsOf(me) + 1 } }, tag: 'shield' }),
        };
    },
    land: (ctx, f) => {
        const target = f.to === ctx.side ? ctx.me : ctx.them;
        const n = shieldsOf(target);
        return n > 0 ? { flags: { [f.to]: { shield: n - 1 } }, tag: 'blocked' } : f.effect;
    },
    cardMs: METEOR.endMs,
};

type FlightAt = Pick<DuelFlight, 'id' | 'to' | 'landsAt'>;

/** The shield a meteor will strike on landing (1 green, 2 blue, 0 the roof): the shields minus the meteors landing first. */
export function shieldLayerFor(shields: number, flights: readonly FlightAt[], f: FlightAt): number {
    const ahead = flights.filter(o => o.id !== f.id && o.to === f.to && (o.landsAt < f.landsAt || (o.landsAt === f.landsAt && o.id < f.id))).length;
    return Math.max(0, shields - ahead);
}

/** Meteors in the air towards a side. */
export const incomingTo = (flights: readonly Pick<DuelFlight, 'to'>[], side: Side) => flights.filter(f => f.to === side).length;

// The base's parts in the order hits knock them off; the habitat, the beacon and the launcher stay till the crater.
export const PARTS = ['flag', 'antenna', 'solarGround', 'dish', 'greenhouse', 'tank', 'solarRoof', 'tower'] as const;
export type Part = typeof PARTS[number];

/** How many parts still stand at hp of lives: every hit takes at least one (3, 5 or 7 lives), none at 0. */
export const partsStanding = (hp: number, lives: number) => Math.ceil(PARTS.length * Math.max(0, Math.min(hp, lives)) / lives);

/** The parts a base has lost at hp of lives. */
export const partsLost = (hp: number, lives: number): Part[] => PARTS.slice(0, PARTS.length - partsStanding(hp, lives));

/** The parts one hit knocks off, from hp before to hp after. */
export const partsKnocked = (before: number, after: number, lives: number): Part[] => partsLost(after, lives).slice(partsLost(before, lives).length);

export interface BaseStage {
    lost: ReadonlySet<Part>;
    // Dents in the habitat: one per hit taken, at most 3.
    dents: number;
    // Smoke from half the lives down, little flames at the last third.
    smoke: boolean;
    fire: boolean;
    crater: boolean;
}

/** The base at hp of lives. */
export function baseStage(hp: number, lives: number): BaseStage {
    const f = Math.max(0, hp) / lives;
    return {
        lost: new Set(partsLost(hp, lives)),
        dents: Math.min(3, Math.max(0, lives - hp)),
        smoke: hp > 0 && f <= 0.5,
        fire: hp > 0 && f <= 0.34,
        crater: hp <= 0,
    };
}
