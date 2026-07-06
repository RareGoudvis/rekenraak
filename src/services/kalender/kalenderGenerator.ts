import type { MathBlock, KalenderExercise } from '../math/types';

// Kalender / datum — month-grid reading, date arithmetic, and notation conversion.
// Pure Date math; nl-BE lowercase day/month names (leerplan convention).

export const DAY_NAMES = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
export const DAY_ABBR = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
export const MONTH_NAMES = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[randInt(0, arr.length - 1)];
}

export function daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

export function formatDate(year: number, month: number, day: number): string {
    return `${day} ${MONTH_NAMES[month]} ${year}`;
}

function nthWeekday(year: number, month: number, weekday: number, n: number): number | null {
    let count = 0;
    for (let d = 1; d <= daysInMonth(year, month); d++) {
        if (new Date(year, month, d).getDay() === weekday) {
            count++;
            if (count === n) return d;
        }
    }
    return null;
}

const ORDINALS = ['eerste', 'tweede', 'derde', 'vierde'];

function buildQuestions(year: number, month: number, questionTypes: string[], amount: number) {
    const qs: { text: string; answer: string }[] = [];
    const used = new Set<string>();
    let attempts = 0;
    while (qs.length < amount && attempts < 200) {
        attempts++;
        const kind = pick(questionTypes.length ? questionTypes : ['dag-van-datum']);
        if (kind === 'dag-van-datum') {
            const d = randInt(1, daysInMonth(year, month));
            const key = `dvd${d}`;
            if (used.has(key)) continue;
            used.add(key);
            qs.push({ text: `Op welke dag valt ${d} ${MONTH_NAMES[month]}?`, answer: DAY_NAMES[new Date(year, month, d).getDay()] });
        } else if (kind === 'datum-van-dag') {
            const weekday = randInt(1, 5);   // schooldagen lezen makkelijkst
            const n = randInt(1, 3);
            const d = nthWeekday(year, month, weekday, n);
            if (d === null) continue;
            const key = `dvw${weekday}-${n}`;
            if (used.has(key)) continue;
            used.add(key);
            qs.push({ text: `Wat is de datum van de ${ORDINALS[n - 1]} ${DAY_NAMES[weekday]}?`, answer: `${d} ${MONTH_NAMES[month]}` });
        } else {
            const key = 'tellen';
            if (used.has(key)) continue;
            used.add(key);
            qs.push({ text: `Hoeveel dagen telt deze maand?`, answer: String(daysInMonth(year, month)) });
        }
    }
    return qs;
}

export function generateKalenderExercises(block: MathBlock): KalenderExercise[] {
    const c = block.constraints;
    const subType: 'maandrooster' | 'datum-rekenen' | 'notatie' = c.subType ?? 'maandrooster';
    const questionTypes: string[] = c.questionTypes ?? ['dag-van-datum', 'datum-van-dag', 'tellen'];
    const questionCount: number = c.questionCount ?? 5;
    // Fixed school-year-agnostic year keeps regeneration deterministic enough to print.
    const year: number = c.year ?? 2026;
    const count = block.numberOfExercises || (subType === 'maandrooster' ? 1 : 6);

    const id = () => Math.random().toString(36).substring(2, 9);
    const out: KalenderExercise[] = [];
    const seen = new Set<string>();
    let attempts = 0;
    while (out.length < count && attempts < 20000) {
        attempts++;
        const month = c.month === 'random' || c.month === undefined ? randInt(0, 11) : Number(c.month);
        if (subType === 'maandrooster') {
            out.push({ id: id(), subType, year, month, questions: buildQuestions(year, month, questionTypes, questionCount), isManuallyEdited: false });
        } else if (subType === 'datum-rekenen') {
            const baseDate = randInt(1, daysInMonth(year, month));
            const offsetDays = pick([randInt(2, 14), -randInt(2, 14)]);
            const key = `${month}-${baseDate}-${offsetDays}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: id(), subType, year, month, baseDate, offsetDays, isManuallyEdited: false });
        } else {
            const day = randInt(1, daysInMonth(year, month));
            const key = `${month}-${day}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ id: id(), subType, year, month, day, direction: pick(['naar-cijfers', 'naar-woorden']), isManuallyEdited: false });
        }
    }
    return out;
}
