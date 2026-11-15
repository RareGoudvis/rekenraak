// Schatkist: the code hunt, pure. Each right answer gives the last digit of that answer; four digits make the
// lock's code, always in the order they came (it is about care, not memory). Three chests make a round; a timed
// round (the Met tijd option) opens chests until the clock runs out.

export const CODE_LEN = 4;
export const CHESTS = 3;

// sums = answering for digits; code = typing the code into the lock; open = coins!; done = the third chest is open.
export type HuntStage = 'sums' | 'code' | 'open' | 'done';

export interface Hunt {
    // The chest on screen, 0-based.
    chest: number;
    digits: string[];
    stage: HuntStage;
    // The last right answer and its digit, for the parchment.
    last: { answer: string; digit: string } | null;
    // Wrong codes on this chest: the lock shakes and the digits show again.
    misses: number;
}

export const newHunt = (): Hunt => ({ chest: 0, digits: [], stage: 'sums', last: null, misses: 0 });

/** The digit a right answer gives: its last digit ("47" → "7"). */
export const digitOf = (answer: string): string => answer.replace(/\D/g, '').slice(-1);

/** A right answer reveals the next digit; the fourth one turns to the lock. */
export function reveal(h: Hunt, answer: string): Hunt {
    const digit = digitOf(answer);
    if (h.stage !== 'sums' || !digit) return h;
    const digits = [...h.digits, digit];
    return { ...h, digits, last: { answer, digit }, stage: digits.length >= CODE_LEN ? 'code' : 'sums' };
}

export const codeOf = (h: Hunt): string => h.digits.join('');

/** A typed code: the revealed digits in order open the chest, anything else is a miss (the digits stay). */
export function tryCode(h: Hunt, code: string): Hunt {
    if (h.stage !== 'code') return h;
    return code === codeOf(h) ? { ...h, stage: 'open' } : { ...h, misses: h.misses + 1 };
}

/** After the coins: the next chest, or done after the last one (chests = Infinity: a timed round never runs out). */
export function nextChest(h: Hunt, chests = CHESTS): Hunt {
    if (h.stage !== 'open') return h;
    return h.chest + 1 >= chests ? { ...h, stage: 'done' } : { ...newHunt(), chest: h.chest + 1 };
}
