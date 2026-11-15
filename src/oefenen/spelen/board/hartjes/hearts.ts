import type { BoardCell, BoardRound } from '../board';
import type { SkinOption } from '../../skins/types';

// Hartjes koppelen's rules for the picker and the cards, pure: the two looks, the two sizes, what a card
// looks like after a mistake, and how many cards go in a row.

// A sum turned first with a wrong answer twice is one logged mistake (board/session.ts).
export const PAIRS_STRIKES = 2;
// Normaal = 12 cards, Moeilijk = 16 cards.
export const PAIRS_SIZE = { normaal: 6, moeilijk: 8 } as const;

const pairsRound = (size: number): BoardRound => ({ kind: 'pairs', boards: 2, size, strikes: PAIRS_STRIKES });
export const HARTJES_ROUND = pairsRound(PAIRS_SIZE.normaal);

export type HartjesLook = 'hartjes' | 'voetballen';

export const HARTJES_OPTIONS: SkinOption[] = [
    { id: 'look', label: 'Welke kaarten?', default: 'hartjes', choices: [{ value: 'hartjes', label: 'Hartjes' }, { value: 'voetballen', label: 'Voetballen' }] },
    {
        id: 'niveau', label: 'Hoe moeilijk?', default: 'normaal',
        choices: [{ value: 'normaal', label: 'Normaal', round: { board: pairsRound(PAIRS_SIZE.normaal) } }, { value: 'moeilijk', label: 'Moeilijk', round: { board: pairsRound(PAIRS_SIZE.moeilijk) } }],
    },
];

export const lookOf = (options: Record<string, string> | undefined): HartjesLook => (options?.look === 'voetballen' ? 'voetballen' : 'hartjes');

// whole = never logged as a mistake; broken = logged and still open (a cracked heart, a flat ball); patched = paired after that.
export type CardLook = 'whole' | 'broken' | 'patched';

/** How a sum's card looks: its strikes reached the logged mistake, and whether it was paired since. */
export function cardLook(cell: Pick<BoardCell, 'tries' | 'state'>, strikes = PAIRS_STRIKES): CardLook {
    if (cell.tries < strikes) return 'whole';
    return cell.state === 'solved' ? 'patched' : 'broken';
}

export interface GridShape { cols: number; rows: number }

/** Cards per row: three rows on a wide screen (12 = 4 × 3, 16 = 6 + 6 + 4), 3 or 4 across a tablet held upright, always 3 across a tall phone (bigger cards), two rows on a short screen. */
export function gridOf(cards: number): { landscape: GridShape; portrait: GridShape; tall: GridShape; short: GridShape } {
    const shape = (cols: number): GridShape => ({ cols, rows: Math.ceil(cards / cols) });
    const wideRows = cards > 8 ? 3 : 2;
    return {
        landscape: shape(Math.ceil(cards / wideRows)),
        portrait: shape(cards > 12 ? 4 : 3),
        tall: shape(3),
        short: shape(Math.ceil(cards / 2)),
    };
}
