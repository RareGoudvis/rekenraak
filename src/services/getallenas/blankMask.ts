// One given number fixes no step: a line or row of 3+ ticks shows at least two, so the pupil
// can find the sprong. Draws only when a tick must be revealed, so masks that already
// have two givens keep their random sequence.
export function ensureTwoGivens(mask: boolean[]): boolean[] {
    const givens = mask.filter(blank => !blank).length;
    if (givens >= 2 || mask.length <= 2) return mask;
    const blanks = mask.flatMap((blank, k) => (blank && k >= 1 ? [k] : []));
    if (blanks.length === 0) return mask;
    const reveal = blanks[Math.floor(Math.random() * blanks.length)];
    return mask.map((blank, k) => (k === reveal ? false : blank));
}
