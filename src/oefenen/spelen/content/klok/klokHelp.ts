import type { KlokTime } from './klokDistractors';
import type { KlokDirection } from './klokPack';

// The short tip above the kiosk's klok steps: where the grote wijzer stands and what that means.
// In words (analoog → woorden) the four-word grammar: over / voor from the 12, half, kwart (owner 2026-10-13);
// a digital time always counts the minutes from the 12, met de klok mee (owner 2026-11-13).

const minuten = (n: number) => `${n} ${n === 1 ? 'minuut' : 'minuten'}`;

/** Where the grote wijzer points: "op de 3", "tussen de 4 en de 5". */
export function minutePos(m: number): string {
    const k = Math.floor(m / 5);
    return m % 5 === 0 ? `op de ${k || 12}` : `tussen de ${k || 12} en de ${k + 1}`;
}

export function klokTip({ m }: KlokTime, dir: KlokDirection): string {
    const at = `De grote wijzer staat ${minutePos(m)}`;
    if (m === 0) return `${at}: dat is een heel uur.`;
    if (dir !== 'analoog-woorden') return `${at}: dat is ${minuten(m)} na het uur.`;
    if (m === 30) return `${at}: dat is half.`;
    if (m === 15) return `${at}: dat is kwart over.`;
    if (m === 45) return `${at}: dat is kwart voor.`;
    return m < 30 ? `${at}: dat is ${minuten(m)} over.` : `${at}: dat is ${minuten(60 - m)} voor.`;
}
