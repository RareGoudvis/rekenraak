import type { BoardCell, BoardRound } from '../board';
import type { SkinOption } from '../../skins/types';

// The pairs games' rules for the picker and the cards, pure: the two sizes, what a card looks like after a mistake,
// how many cards go in a row, and where a found pair's moment plays. Hartjes koppelen (hearts) and Voetbalkaartjes
// (footballs, board/voetbalkaartjes/) share them.

// A sum turned first with a wrong answer twice is one logged mistake (board/session.ts).
export const PAIRS_STRIKES = 2;
// Normaal = 12 cards, Moeilijk = 16 cards.
export const PAIRS_SIZE = { normaal: 6, moeilijk: 8 } as const;

const pairsRound = (size: number): BoardRound => ({ kind: 'pairs', boards: 2, size, strikes: PAIRS_STRIKES });
export const HARTJES_ROUND = pairsRound(PAIRS_SIZE.normaal);

// Which cards a pairs game deals: hearts (Hartjes koppelen) or footballs (Voetbalkaartjes). Fixed per game, no option.
export type HartjesLook = 'hartjes' | 'voetballen';

// Both pairs games: Normaal or Moeilijk. (The old "Welke kaarten?" pick is gone: a remembered look is dropped by choicesOf.)
export const HARTJES_OPTIONS: SkinOption[] = [
    {
        id: 'niveau', label: 'Hoe moeilijk?', default: 'normaal',
        choices: [{ value: 'normaal', label: 'Normaal', round: { board: pairsRound(PAIRS_SIZE.normaal) } }, { value: 'moeilijk', label: 'Moeilijk', round: { board: pairsRound(PAIRS_SIZE.moeilijk) } }],
    },
];

// A found pair's moment: short and never blocking (the pupil may tap on). Under a second, the flip included.
export const PAIR_MOMENT_MS = 950;
// The second card's flip shows its face before the two cards lift off (the flip itself takes 380 ms, hartjes.css).
export const PAIR_LIFT_MS = 250;
// The heart bursts / the ball lands in the net here: the skin's 'launch' cue and the scoreboard's tick (Voetbalkaartjes).
export const PAIR_HIT_MS = 680;
// The moment stays mounted this long so the last confetti and sparkles fly out (scene BURST_MS); nothing waits on it.
export const PAIR_TAIL_MS = PAIR_HIT_MS + 950;
// The net sits this many card widths beside the meeting point, a little up (the ball's arc ends there).
export const NET_AWAY = { x: 1.25, y: -.35 };

export interface MomentBox { x: number; y: number; w: number; h: number }
export interface PairMomentAt { a: [number, number]; b: [number, number]; mid: [number, number]; net: [number, number]; netLeft: boolean }

const centre = (r: MomentBox): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];
// A box too small for the net keeps it centred.
const clamp = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));

/** Where a found pair's moment plays, in the board's own px: both card centres, where they meet, and the net on the roomier side. */
export function pairMomentAt(a: MomentBox, b: MomentBox, area: { w: number; h: number }): PairMomentAt {
    const ca = centre(a), cb = centre(b);
    const mid: [number, number] = [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2];
    const w = Math.max(a.w, b.w);
    const netLeft = mid[0] > area.w / 2;
    const half = w * .45;
    const net: [number, number] = [
        clamp(mid[0] + (netLeft ? -1 : 1) * NET_AWAY.x * w, half, area.w - half),
        clamp(mid[1] + NET_AWAY.y * w, half * .8, area.h - half * .8),
    ];
    return { a: ca, b: cb, mid, net, netLeft };
}

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
