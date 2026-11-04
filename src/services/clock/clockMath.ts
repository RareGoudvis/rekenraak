// Pure analogue-clock maths shared by every draggable clock face (the board's KlokWidget and the
// oefenmodus clock). Angles are degrees clockwise from 12; hours live on a 12- or 24-hour cycle.

export type HourCycle = 12 | 24;

/** `n` folded into 0..mod-1, also for negative input. */
export const wrap = (n: number, mod: number): number => ((n % mod) + mod) % mod;

/** Hours folded onto the cycle: 0-11 on a 12-hour face, 0-23 on a 24-hour one. */
export const normalizeHours = (hours: number, cycle: HourCycle = 12): number => wrap(Math.round(hours), cycle);

/** The minutes the grote wijzer points at, snapped to `step` (1 = to the minute, 5 = the numerals). */
export function minuteFromAngle(angleDeg: number, step = 1): number {
    return wrap(Math.round(wrap(angleDeg, 360) / 6 / step) * step, 60);
}

/** The whole hour (0-11) whose kleine-wijzer position, with these minutes, lies nearest the angle. */
export function hourFromAngle(angleDeg: number, minutes: number): number {
    // The kleine wijzer stands m/2 degrees past its hour (half a degree per minute).
    return wrap(Math.round((wrap(angleDeg, 360) - minutes / 2) / 30), 12);
}

/** The hour after the kleine wijzer is turned to a 0-11 dial hour; on a 24-hour clock passing 12 flips voormiddag/namiddag. */
export function turnHourTo(hour12: number, prevHours: number, cycle: HourCycle = 12): number {
    const h = wrap(hour12, 12);
    if (cycle === 12) return h;
    const prev = wrap(prevHours, 24);
    // The shortest way round, like carryHour for the minutes: 11 → 0 went forward over the 12, 0 → 11 back.
    const d = h - (prev % 12);
    const flip = d < -6 || d > 6;
    return wrap(h + (prev >= 12 ? 12 : 0) + (flip ? 12 : 0), 24);
}

/** The hour after the grote wijzer moved from prevMinutes to nextMinutes: past 12 it carries the hour on (or back). */
export function carryHour(prevMinutes: number, nextMinutes: number, hours: number, cycle: HourCycle = 12): number {
    // The shortest way round: 55 → 0 went forward over the 12, 0 → 55 went back.
    const d = nextMinutes - prevMinutes;
    const carry = d < -30 ? 1 : d > 30 ? -1 : 0;
    return wrap(hours + carry, cycle);
}

/** One step of the grote wijzer (by `step` minutes), carrying the hour across 12. */
export function stepMinutes(hours: number, minutes: number, dir: 1 | -1, step = 1, cycle: HourCycle = 12): { hours: number; minutes: number } {
    const next = wrap(minutes + dir * step, 60);
    return { hours: carryHour(minutes, next, hours, cycle), minutes: next };
}

/** One step of the kleine wijzer: a whole hour on or back, the minutes untouched. */
export const stepHours = (hours: number, dir: 1 | -1, cycle: HourCycle = 12): number => wrap(hours + dir, cycle);
