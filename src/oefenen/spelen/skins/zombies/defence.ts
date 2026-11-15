import type { SkinChoices } from '../types';

// Who stands behind the barricade: Normaal = 5 survivors behind 3 small barricades (each stops one zombie,
// then breaks); Moeilijk = 3 survivors, no barricades. A zombie that gets through catches one survivor
// (shown as a silly zombie, never hurt). Pure, so the order is testable.

export type ZombieLevel = 'makkelijk' | 'normaal' | 'moeilijk';

export const DEFENCE: Record<ZombieLevel, { survivors: number; barricades: number }> = {
    makkelijk: { survivors: 5, barricades: 3 },
    normaal: { survivors: 5, barricades: 3 },
    moeilijk: { survivors: 3, barricades: 0 },
};

export const zombieLevelOf = (options: SkinChoices): ZombieLevel => (options.niveau === 'moeilijk' || options.niveau === 'makkelijk' ? options.niveau : 'normaal');

/** After this many zombies got through: what still stands. */
export function defenceAfter(level: ZombieLevel, hits: number): { barricades: number; survivors: number; caught: number } {
    const { survivors, barricades } = DEFENCE[level];
    const caught = Math.min(survivors, Math.max(0, hits - barricades));
    return { barricades: Math.max(0, barricades - hits), survivors: survivors - caught, caught };
}

/** What the hit-th zombie through (1-based) meets: a barricade, or a survivor; 'last' = the last survivor (the early end). */
export function hitOf(level: ZombieLevel, hit: number): 'barricade' | 'caught' | 'last' {
    if (hit <= DEFENCE[level].barricades) return 'barricade';
    return defenceAfter(level, hit).survivors === 0 ? 'last' : 'caught';
}

// How the group feels: calm while all are safe, worried once one is caught, scared (trembling, huddled) with two or fewer left.
export type Fear = 'calm' | 'worried' | 'scared';
export function fearOf(level: ZombieLevel, hits: number): Fear {
    const { survivors } = defenceAfter(level, hits);
    if (survivors === DEFENCE[level].survivors) return 'calm';
    return survivors <= 2 ? 'scared' : 'worried';
}

/** Who puffs the blowdart for the shot-th right answer (0-based): the survivors still safe take turns. */
export const shooterOf = (safe: number, shot: number) => (safe > 0 ? shot % safe : -1);
