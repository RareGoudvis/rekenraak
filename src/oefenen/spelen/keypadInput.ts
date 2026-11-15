import type { SpelKey } from './accepts';

// The game keypads' typing rules (SpelKeypad, DuelKeypad): digits, and the comma / minus only where the content shows them.

// Leerjaar 6 sums reach 1 000 000 000 (10 digits); 12 characters as the kiosk keypad (oefenen.answerLength), comma and minus included.
export const MAX_ANSWER_CHARS = 12;

/** The field after one key: one comma ("0," when it comes first), a minus only in front, nothing past `max`. */
export function typeKey(value: string, key: string, keys: readonly SpelKey[], max = MAX_ANSWER_CHARS): string {
    if (key === 'back') return value.slice(0, -1);
    const next = /^\d$/.test(key) ? value + key
        : key === ',' && keys.includes(',') && !value.includes(',') ? `${/\d$/.test(value) ? value : `${value}0`},`
        : key === '-' && keys.includes('-') && value === '' ? '-'
        : value;
    return next.length > max ? value : next;
}

/** A physical key as a keypad key: '.' types the comma (a numpad), the rest as it is; null = not a keypad key. */
export function keyOfKeyboard(key: string, keys: readonly SpelKey[]): string | null {
    if (/^\d$/.test(key)) return key;
    if ((key === ',' || key === '.') && keys.includes(',')) return ',';
    if ((key === '-' || key === '−') && keys.includes('-')) return '-';
    return null;
}

// A lone minus or comma is no answer yet.
export const canSubmit = (value: string) => /\d/.test(value);

// The field shows the true minus; the answer goes out with it too (the kiosk check reads both).
export const shownAnswer = (value: string) => value.replace('-', '−');
