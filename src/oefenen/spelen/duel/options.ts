import type { SkinChoices, SkinOption } from '../skins/types';
import type { DuelBestOf, DuelConfig, DuelLevel, DuelStream } from './types';

// The pre-start choices every duel game shares (SpelOptions shows them, remembered per device), and the
// DuelConfig they make. A game adds its own options after these (Touwtrekken's manier, Kikkers' modus).

export const LIVES_CHOICES = [3, 5, 7] as const;
export const DUEL_DEFAULTS = { lives: 5, bestOf: 3 } as const;

export interface DuelOptionsSpec {
    // The lives row in this game's words (Touwtrekken: "Hoe ver trekken?", "5 stappen").
    lives?: { label?: string; unit?: (n: number) => string; choices?: readonly number[]; default?: number };
    // The game's own options, shown after the shared ones.
    extras?: SkinOption[];
    // The preselected number of players; absent = 2.
    players?: 1 | 2;
}

// One shared sum for both (Om beurten) or each their own (Samen tegelijk): an extra for games that offer both.
export const MANIER_OPTION: SkinOption = {
    id: 'manier', label: 'Hoe spelen jullie?', default: 'samen', when: { id: 'spelers', value: '2' },
    choices: [{ value: 'samen', label: 'Elk een eigen som' }, { value: 'beurt', label: 'Samen één som' }],
};

/** A duel game's option list: spelers, niveau, levens, rondes, then the game's extras. */
export function duelOptions(spec: DuelOptionsSpec = {}): SkinOption[] {
    const lives = spec.lives ?? {};
    const unit = lives.unit ?? ((n: number) => `${n} levens`);
    return [
        { id: 'spelers', label: 'Hoeveel spelers?', default: String(spec.players ?? 2), choices: [{ value: '1', label: '1 speler' }, { value: '2', label: '2 spelers' }] },
        { id: 'niveau', label: 'Hoe moeilijk?', default: 'normaal', choices: [{ value: 'normaal', label: 'Normaal' }, { value: 'moeilijk', label: 'Moeilijk' }] },
        {
            id: 'levens', label: lives.label ?? 'Hoeveel levens?', default: String(lives.default ?? DUEL_DEFAULTS.lives),
            choices: (lives.choices ?? LIVES_CHOICES).map(n => ({ value: String(n), label: unit(n) })),
        },
        { id: 'rondes', label: 'Hoeveel rondes?', default: String(DUEL_DEFAULTS.bestOf), choices: [{ value: '1', label: '1 ronde' }, { value: '3', label: 'Beste van 3' }, { value: '5', label: 'Beste van 5' }] },
        ...(spec.extras ?? []),
    ];
}

/** The engine's config from the picks (unknown or missing picks = the defaults). */
export function duelConfigOf(chosen: SkinChoices = {}, extra: Partial<DuelConfig> = {}): DuelConfig {
    const lives = Number(chosen.levens);
    const bestOf = Number(chosen.rondes);
    const level: DuelLevel = chosen.niveau === 'moeilijk' ? 'moeilijk' : 'normaal';
    const stream: DuelStream = chosen.manier === 'beurt' && chosen.spelers !== '1' ? 'shared' : 'own';
    return {
        players: chosen.spelers === '1' ? 1 : 2,
        level,
        lives: Number.isInteger(lives) && lives > 0 ? lives : DUEL_DEFAULTS.lives,
        bestOf: (bestOf === 1 || bestOf === 3 || bestOf === 5 ? bestOf : DUEL_DEFAULTS.bestOf) as DuelBestOf,
        stream,
        ...extra,
    };
}
