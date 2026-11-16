import { ropeRule } from '../../duel/rules';
import type { DuelRule } from '../../duel/types';

// Touwtrekken on the duel engine: the rope (ropeRule: the other side −1, this side +1), 2 minutes per round.

export const TOUW = { seconds: 120, cardMs: 1400 } as const;
export const TOUW_RULE: DuelRule = { ...ropeRule, cardMs: TOUW.cardMs };
