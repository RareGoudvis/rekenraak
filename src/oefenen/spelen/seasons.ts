import type { Season } from './skins/types';

// The seasonal shelf: which seasons a day falls in, on the Belgian calendar (Europe/Brussels local date).
// Pure apart from pickerToday(). Overlapping seasons are all listed; a game is never locked outside its season.

// The order is the priority: a skin's variantOf takes the first match, so the short holidays come before the broad
// seasons they overlap (Valentijn and Carnaval fall in Winter, Pasen in Lente).
export const SEASONS: readonly Season[] = ['halloween', 'sinterklaas', 'kerst', 'valentijn', 'carnaval', 'pasen', 'lente', 'winter', 'zomer'];

// The small tag on a shelf tile.
export const SEASON_LABEL: Record<Season, string> = {
    halloween: 'Halloween', sinterklaas: 'Sinterklaas', kerst: 'Kerst', valentijn: 'Valentijn', carnaval: 'Carnaval', pasen: 'Pasen', lente: 'Lente', winter: 'Winter', zomer: 'Zomer',
};

// Halloween: two weeks of build-up to 31 Oct, through the first day of the herfstvakantie (owner may tune).
const HALLOWEEN = { from: 1015, to: 1101 };
// Winter: after the Kerst shelf until the end of February (29 Feb in a leap year).
const WINTER = { from: 107, to: 229 };
// Zomer: June, the last school month before the summer holiday.
const ZOMER = { from: 601, to: 630 };
// Carnaval: the ten days before Aswoensdag, and that day (Aswoensdag = Easter Sunday − 46 days).
const CARNAVAL_DAYS = 10;
const ASWOENSDAG_BEFORE_EASTER = 46;

export interface DayOf { y: number; m: number; d: number }

const fmt = (() => {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { return null; }
})();

/** The local date in Brussels (a pupil playing at 23:30 UTC on 14 Nov is already on 15 Nov there). */
export function brusselsDay(at: Date): DayOf {
    const parts = fmt?.formatToParts(at);
    const get = (t: string) => Number(parts?.find(p => p.type === t)?.value);
    if (parts && get('year')) return { y: get('year'), m: get('month'), d: get('day') };
    return { y: at.getFullYear(), m: at.getMonth() + 1, d: at.getDate() };
}

/** Easter Sunday (anonymous Gregorian algorithm, Meeus/Jones/Butcher). */
export function easterSunday(y: number): DayOf {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    return { y, m: month, d: ((h + l - 7 * m + 114) % 31) + 1 };
}

// A day as a whole number, so ranges compare simply.
const ord = ({ y, m, d }: DayOf) => Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
const md = (day: DayOf) => day.m * 100 + day.d;

/** The seasons this day falls in (SEASONS order). */
export function seasonsOn(at: Date): Season[] {
    const day = brusselsDay(at);
    const n = md(day);
    const easter = ord(easterSunday(day.y));
    const easterMonday = easter + 1;
    const aswoensdag = easter - ASWOENSDAG_BEFORE_EASTER;
    const within = (r: { from: number; to: number }) => n >= r.from && n <= r.to;
    const inSeason: Record<Season, boolean> = {
        halloween: within(HALLOWEEN),
        sinterklaas: n >= 1115 && n <= 1206,
        kerst: n >= 1207 || n <= 106,
        valentijn: n >= 201 && n <= 214,
        // The three weeks before Easter Monday, and that day.
        pasen: ord(day) >= easterMonday - 21 && ord(day) <= easterMonday,
        lente: n >= 321 && n <= 531,
        carnaval: ord(day) >= aswoensdag - CARNAVAL_DAYS && ord(day) <= aswoensdag,
        winter: within(WINTER),
        zomer: within(ZOMER),
    };
    return SEASONS.filter(s => inSeason[s]);
}

/** A skin's seasonal look: the first of today's seasons (SEASONS order) that has one, else the year-round look. */
export function seasonalVariant<T>(seasons: readonly Season[], looks: Partial<Record<Season, T>>, yearRound: T): T {
    for (const s of seasons) if (looks[s] !== undefined) return looks[s] as T;
    return yearRound;
}

/** Today for the picker; the dev build accepts ?spelDatum=YYYY-MM-DD to try a season (screenshots, tests by hand). */
export function pickerToday(): Date {
    if (import.meta.env.DEV && typeof location !== 'undefined') {
        const fake = new URLSearchParams(location.search).get('spelDatum')?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        // Noon UTC: the same date in Brussels whatever the offset.
        if (fake) return new Date(Date.UTC(Number(fake[1]), Number(fake[2]) - 1, Number(fake[3]), 12));
    }
    return new Date();
}
