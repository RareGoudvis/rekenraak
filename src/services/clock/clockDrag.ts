import type { ClockExercise } from '../math/types';

// Oefenmodus: "zet de wijzers" on an analoge klok. The pupil's face is two values, `h` (the
// hour the kleine wijzer stands on, 0-11) and `m` (the minutes of the grote wijzer, 0-59).
// Shared by ClockDragFace (drawing + pointer maths) and KLOK_KIOSK (the answer).

export type KlokHand = 'h' | 'm';
type DragValues = Record<string, number>;

// handChoice = the hand the PUPIL draws on paper (beide / only the minute hand / only the hour
// hand); the other one is printed, so on the card it stands fixed on the exercise's time.
const handChoiceOf = (ex: ClockExercise, c: Record<string, unknown>) => ex.handChoice ?? (c.handChoice as string | undefined) ?? 'beide';

/** The hands the pupil moves for this exercise. */
export function klokDragHands(ex: ClockExercise, c: Record<string, unknown>): KlokHand[] {
    const hc = handChoiceOf(ex, c);
    return hc === 'minuut' ? ['m'] : hc === 'uur' ? ['h'] : ['h', 'm'];
}

/** Minutes per step of the grote wijzer: 1 when the leaf asks to the minute, else 5. */
export function klokMinuteStep(ex: ClockExercise, c: Record<string, unknown>): 1 | 5 {
    const types = Array.isArray(c.timeTypes) ? (c.timeTypes as string[]) : [];
    // The exercise's own minutes guard a block whose settings drifted from what generated it.
    return types.includes('nauwkeurig_1') || ex.minutes % 5 !== 0 ? 1 : 5;
}

/** The face's time: the dragged values, the printed hand from the exercise, 0 for a hand not placed yet. */
export function klokFace(ex: ClockExercise, c: Record<string, unknown>, drag: DragValues): { h: number; m: number } {
    const hands = klokDragHands(ex, c);
    return {
        h: hands.includes('h') ? (drag.h ?? 0) : ex.hours % 12,
        m: hands.includes('m') ? (drag.m ?? 0) : ex.minutes,
    };
}

/** 'h:mm' on a 12-hour face (twaalf uur = 12:00). */
export const klokText = (h: number, m: number): string => `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')}`;

/** The pupil's time, or '' while a hand they set is not placed yet (it is not drawn until then). */
export function klokGiven(ex: ClockExercise, c: Record<string, unknown>, drag: DragValues): string {
    if (klokDragHands(ex, c).some(k => drag[k] === undefined)) return '';
    const { h, m } = klokFace(ex, c, drag);
    return klokText(h, m);
}

// Both hands set: the kleine wijzer travels with the grote one like a real clock, so a minute
// hand dragged past 12 moves the hour on (or back). With one hand printed it stays put.
function withMinutes(ex: ClockExercise, c: Record<string, unknown>, drag: DragValues, m: number): DragValues {
    const { h, m: was } = klokFace(ex, c, drag);
    // A kleine wijzer not placed yet has nothing to carry.
    if (drag.h === undefined) return { ...drag, m };
    // The shortest way round: 55 → 0 went forward over the 12, 0 → 55 back.
    const d = m - was;
    const hour = d < -30 ? (h + 1) % 12 : d > 30 ? (h + 11) % 12 : h;
    return { ...drag, h: hour, m };
}

/** The values after the grote wijzer is pointed at `angle` (degrees clockwise from 12). */
export function klokMinuteTo(ex: ClockExercise, c: Record<string, unknown>, drag: DragValues, angle: number): DragValues {
    const step = klokMinuteStep(ex, c);
    return withMinutes(ex, c, drag, (Math.round(angle / 6 / step) * step) % 60);
}

/** The values after the kleine wijzer is pointed at `angle`: the whole hour whose position (with these minutes) lies nearest. */
export function klokHourTo(ex: ClockExercise, c: Record<string, unknown>, drag: DragValues, angle: number): DragValues {
    const { m } = klokFace(ex, c, drag);
    return { ...drag, h: ((Math.round((angle - m / 2) / 30) % 12) + 12) % 12 };
}

/** One arrow-key step: the hour by 1, the minutes by the leaf's step (carrying the hour). */
export function klokStep(ex: ClockExercise, c: Record<string, unknown>, drag: DragValues, hand: KlokHand, dir: 1 | -1): DragValues {
    const { h, m } = klokFace(ex, c, drag);
    if (hand === 'h') return { ...drag, h: (h + dir + 12) % 12 };
    return withMinutes(ex, c, drag, (m + dir * klokMinuteStep(ex, c) + 60) % 60);
}
