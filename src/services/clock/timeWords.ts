// The four-word time grammar the Oefenmodus takes for a clock read in words: uur · half · voor · over,
// plus "kwart" for 15 minutes. One wording per time, so a check by value is an exact check:
//   0 → "3 uur" · 30 → "half 4" · 1–29 → "m over 3" · 31–59 → "(60 − m) voor 4" · 15 / 45 → kwart.
// Deliberately NOT the sheet's formatTimeText ("5 voor half 4"): the kiosk has no "voor half" / "over half" chips.

export type TimeWord = 'uur' | 'half' | 'voor' | 'over';

// The chip order on the answer panel (owner 2026-10-13).
export const TIME_WORDS: readonly TimeWord[] = ['uur', 'half', 'voor', 'over'];
export const KWART = 'kwart';

// A wording as the pupil builds it: the chip, the hour typed, the minutes typed ('' for uur / half, or 'kwart').
export interface TimeWordsParts {
    word: string;
    hour: string;
    minute: string;
}

const MINUTES_ON_FACE = 12 * 60;

// A clock face has no ochtend / avond: 3 and 15 name one hand position, 12 stands for 0.
const faceHour = (h: number) => (((h % 12) + 12) % 12) || 12;

/** The one wording of h:mm in the four-word grammar. */
export function timeWords(hours: number, minutes: number): TimeWordsParts {
    const m = ((minutes % 60) + 60) % 60;
    const minute = (n: number) => (n === 15 ? KWART : String(n));
    if (m === 0) return { word: 'uur', hour: String(faceHour(hours)), minute: '' };
    if (m === 30) return { word: 'half', hour: String(faceHour(hours + 1)), minute: '' };
    if (m < 30) return { word: 'over', hour: String(faceHour(hours)), minute: minute(m) };
    return { word: 'voor', hour: String(faceHour(hours + 1)), minute: minute(60 - m) };
}

// A typed whole number of at most two digits ('03' is 3), else null.
const whole = (raw: string) => (/^\d{1,2}$/.test(raw.trim()) ? Number(raw.trim()) : null);

/** Minutes past 12:00 on the face (0–719) a wording names, or null when it breaks the grammar ("15 over 3", "35 over 3", "30 over 3"). */
export function parseTimeWords(p: TimeWordsParts): number | null {
    const hour = whole(p.hour);
    // 0–24: a 24-hour reading of the face is fine (15 uur; the sheet's 24h midnight says "24 uur"), past it names no hour.
    if (hour === null || hour > 24) return null;
    const at = (hour % 12) * 60;
    const minute = p.minute.trim().toLowerCase();
    const onFace = (n: number) => ((n % MINUTES_ON_FACE) + MINUTES_ON_FACE) % MINUTES_ON_FACE;
    if (p.word === 'uur') return minute === '' ? onFace(at) : null;
    if (p.word === 'half') return minute === '' ? onFace(at - 30) : null;
    if (p.word !== 'over' && p.word !== 'voor') return null;
    // A quarter is only ever "kwart": "15 over 3" is not how the grammar says it.
    const n = minute === KWART ? 15 : whole(minute);
    if (n === null || n < 1 || n > 29 || (n === 15 && minute !== KWART)) return null;
    return onFace(p.word === 'over' ? at + n : at - n);
}

// The Oefenmodus answer fields hold a wording as [uur, minuten, woord]: the keypad's two fields first,
// so a new exercise starts in the hour field (field 0), then the chip.
export const timeWordsFields = (p: TimeWordsParts): string[] => [p.hour, p.minute, p.word];
export const timeWordsOfFields = (f: readonly string[]): TimeWordsParts => ({ hour: f[0] ?? '', minute: f[1] ?? '', word: f[2] ?? '' });

/** The wording as one line: "kwart over 3", "3 uur", "half 4", "25 voor 4"; missing parts stay out. */
export function timeWordsText(p: TimeWordsParts): string {
    const hour = p.hour.trim(), minute = p.minute.trim();
    if (p.word === 'uur') return [hour, 'uur'].filter(Boolean).join(' ');
    if (p.word === 'half') return ['half', hour].filter(Boolean).join(' ');
    return [minute, p.word.trim(), hour].filter(Boolean).join(' ');
}
