import { defaultRoundOver } from '../../duel/rules';
import type { DuelRoundView, DuelRule, Side } from '../../duel/types';
import type { SkinChoices, SkinOption } from '../types';
import { BUG_POINTS, type BugKind } from './pond';

// Kikkers en vliegjes on the duel engine: a right answer = a tongue snap at a bug (its points for that frog),
// a mistake (wrong or a time-out) costs that frog a life. A round ends at 0 lives, and either at the
// 2-minute clock (most points wins) or when a frog reaches 25 points (Hoe winnen?).

export const KIKKER = {
    seconds: 120,
    goal: 25,
    // The winner's jump and croak before the scoreboard card.
    cardMs: 2200,
} as const;

export type KikkerMode = 'tijd' | 'doel';

// Op tijd = 2 minutes (the round clock in the top bar shows it); Tot 25 = the first frog at 25 points.
export const WINNEN_OPTION: SkinOption = {
    id: 'winnen', label: 'Hoe winnen?', default: 'tijd',
    choices: [{ value: 'tijd', label: 'Op tijd' }, { value: 'doel', label: `Tot ${KIKKER.goal} punten` }],
};

export const modeOf = (chosen: SkinChoices | undefined): KikkerMode => (chosen?.winnen === 'doel' ? 'doel' : 'tijd');

/** The round's end: 0 lives loses; Tot 25: the first at the goal wins; at the clock: most points, then most lives, else a draw. */
export function kikkerRoundOver(view: DuelRoundView, timeUp: boolean, goal: number | null): Side | 'draw' | null {
    const { left, right } = view.sides;
    if (left.lives <= 0 || right.lives <= 0) return defaultRoundOver(view, false);
    if (goal !== null) {
        if (left.points >= goal) return 'left';
        if (right.points >= goal) return 'right';
    }
    if (!timeUp) return null;
    if (left.points !== right.points) return left.points > right.points ? 'left' : 'right';
    return defaultRoundOver(view, true);
}

/** The rule for a mode; `catchFor(side)` takes that frog's bug off the pond (the screen's) and says which it was. */
export function kikkerRule(mode: KikkerMode, catchFor: (side: Side) => BugKind): DuelRule {
    const goal = mode === 'doel' ? KIKKER.goal : null;
    return {
        right: ({ side }) => {
            const kind = catchFor(side);
            return { points: { [side]: BUG_POINTS[kind] }, tag: kind };
        },
        wrong: ({ side }) => ({ damage: { [side]: 1 }, tag: 'oops' }),
        roundOver: (view, timeUp) => kikkerRoundOver(view, timeUp, goal),
        cardMs: KIKKER.cardMs,
    };
}
