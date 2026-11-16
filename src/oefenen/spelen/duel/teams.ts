import type { CSSProperties } from 'react';
import type { DuelConfig, Side } from './types';

// The two teams' names and colours on the duel screen.

export interface Team { name: string; color: string }
export type Teams = Record<Side, Team>;

/** Blauw / Oranje for 2 spelers, Jij / Computer for 1, with the game's overrides. */
export function teamsOf(config: Pick<DuelConfig, 'players'>, over: Partial<Record<Side, Partial<Team>>> = {}): Teams {
    const solo = config.players === 1;
    return {
        left: { name: solo ? 'Jij' : 'Blauw', color: 'var(--duel-left)', ...over.left },
        right: { name: solo ? 'Computer' : 'Oranje', color: 'var(--duel-right)', ...over.right },
    };
}

export const teamStyle = (t: Team) => ({ '--duel-team': t.color } as CSSProperties);
