import { describe, expect, it } from 'vitest';
import { WRONG_PENALTY_MS, penalise, penaltyHit } from '../oefenen/spelen/skins/bom/penalty';
import { skinById } from '../oefenen/spelen/skins/registry';

describe('Bom penalty', () => {
    it('moves the deadline 3 s closer, never past now', () => {
        expect(penalise({ endsAt: 100_000, pausedLeft: null }, WRONG_PENALTY_MS, 0).endsAt).toBe(97_000);
        expect(penalise({ endsAt: 2_000, pausedLeft: null }, WRONG_PENALTY_MS, 1_000).endsAt).toBe(1_000);
    });
    it('takes it off a frozen clock and leaves an untimed one alone', () => {
        expect(penalise({ endsAt: 5, pausedLeft: 10_000 }, WRONG_PENALTY_MS, 0).pausedLeft).toBe(7_000);
        expect(penalise({ endsAt: 5, pausedLeft: 1_000 }, WRONG_PENALTY_MS, 0).pausedLeft).toBe(0);
        expect(penalise({ endsAt: null, pausedLeft: null }, WRONG_PENALTY_MS, 0)).toEqual({ endsAt: null, pausedLeft: null });
    });
    it('flashes once per counted mistake', () => {
        expect(penaltyHit(2, 3)).toBe(true);
        expect(penaltyHit(3, 3)).toBe(false);
    });
    it('is declared on the Bom round (3 and 5 minutes share it)', () => {
        const m = skinById('bom')!.meta;
        expect(m.round.wrongPenaltyMs).toBe(3000);
        expect(m.options?.find(o => o.id === 'tijd')?.choices.every(c => c.round?.wrongPenaltyMs === undefined)).toBe(true);
    });
});
