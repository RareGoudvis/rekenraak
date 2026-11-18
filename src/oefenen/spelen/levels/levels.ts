import type { SkinChoices, SkinMeta, SkinOption, SkinOptionIcon } from '../skins/types';

// The four levels every game with a difficulty shares (owner 2026-11-17), the "Hoe moeilijk?" option that picks
// one, and reading it back. Pure. The pick is remembered per game and device like every option (skins/options.ts).

export type Level = 'makkelijk' | 'normaal' | 'moeilijk' | 'onmogelijk';
export const LEVELS: readonly Level[] = ['makkelijk', 'normaal', 'moeilijk', 'onmogelijk'];
export const LEVEL_LABEL: Record<Level, string> = { makkelijk: 'Makkelijk', normaal: 'Normaal', moeilijk: 'Moeilijk', onmogelijk: 'Onmogelijk' };
export const DEFAULT_LEVEL: Level = 'normaal';
// The option id: the same one the old two- and three-level rows used, so a remembered pick carries over.
export const LEVEL_ID = 'niveau';

// The icons per level: about time = a clock (Makkelijk crossed out) plus flames; not about time = flames only.
const CLOCK_ICONS: Record<Level, SkinOptionIcon> = {
    makkelijk: { clock: 'off' }, normaal: { clock: 'on' }, moeilijk: { clock: 'on', flames: 1 }, onmogelijk: { clock: 'on', flames: 2 },
};
const FLAME_ICONS: Record<Level, SkinOptionIcon> = { makkelijk: {}, normaal: { flames: 1 }, moeilijk: { flames: 2 }, onmogelijk: { flames: 3 } };

/** Any remembered value as a level: the old 'normaal' / 'moeilijk' / Zombies' 'makkelijk' keep their name, anything else = Normaal. */
export function migrateLevel(value: unknown): Level {
    const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return (LEVELS as readonly string[]).includes(v) ? v as Level : DEFAULT_LEVEL;
}

/** The picked level of a round's options (absent or unknown = Normaal). */
export const levelOf = (options: SkinChoices = {}): Level => migrateLevel(options[LEVEL_ID]);

export interface LevelOptionSpec {
    // true = the levels are about time (the clock rule): a clock icon; false = flames only (pairs, wasps, Bom).
    clock: boolean;
    // A round patch per level (Hartjes: the number of pairs).
    rounds?: Partial<Record<Level, Partial<SkinMeta['round']>>>;
}

/** The "Hoe moeilijk?" row: the four levels with their icons, Normaal preselected, a whole line wide. */
export function levelOption({ clock, rounds = {} }: LevelOptionSpec): SkinOption {
    const icons = clock ? CLOCK_ICONS : FLAME_ICONS;
    return {
        id: LEVEL_ID, label: 'Hoe moeilijk?', default: DEFAULT_LEVEL, wide: true,
        choices: LEVELS.map(l => ({ value: l, label: LEVEL_LABEL[l], icon: icons[l], ...(rounds[l] && { round: rounds[l] }) })),
    };
}
