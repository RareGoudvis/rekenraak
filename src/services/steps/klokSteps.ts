import type { StepLine, StepToken } from '../math/workedSteps';
import type { ClockExercise } from '../math/types';
import { formatDigitalTime, formatTimeText } from '../clock/clockTypes';
import { timeWords, timeWordsText } from '../clock/timeWords';

// Klok lezen, tekenen and omzetten as breukvragen: the kleine wijzer, the grote wijzer, the minutes
// counted in groups of 5 per cijfer (the visual draws them as petals), then the time. Words follow the
// exercise's own wording: the sheet's Flemish zones (formatTimeText: "5 voor half 4" counts back from the 6)
// or, in Oefenmodus with klokAnswer 'woorden', the four-word grammar (timeWords.ts: over / voor only from
// the 12). A digital answer always counts clockwise from the 12 (owner, 2026-11-13).

// 'zin' = the sheet's timeText, 'woorden' = the kiosk four-word grammar, 'digitaal' = uu:mm.
type Wording = 'zin' | 'woorden' | 'digitaal';

// Where the minutes are counted from (0 = the 12, 30 = the 6), which way (1 = met de klok mee) and how many.
interface Count { start: 0 | 30; dir: 1 | -1; n: number; zone: Zone }
type Zone = 'uur' | 'half' | 'over' | 'voor' | 'overhalf' | 'voorhalf';

const word = (w: string): StepToken => ({ t: 'word', w });
const num = (v: number): StepToken => ({ t: 'num', v });
const ask = (kind: string, question: string, hint: string, tokens: StepToken[], mark?: string): StepLine =>
    ({ kind: kind as StepLine['kind'], basis: true, aside: true, question, hint, tokens, ...(mark && { mark }) });
const closing = (text: string): StepLine => ({ kind: 'klok.tijd', basis: true, aside: true, tokens: [word(text)] });

// The numeral on the face (1–12) a whole hour points at.
const face = (h: number) => (((h % 12) + 12) % 12) || 12;

// The tel line's marker for the visual: "t:<start>:<dir>:<n>".
export const countMark = (c: Pick<Count, 'start' | 'dir' | 'n'>) => `t:${c.start}:${c.dir}:${c.n}`;
export function parseCountMark(mark: unknown): { start: number; dir: 1 | -1; n: number } | null {
    const m = typeof mark === 'string' ? /^t:(0|30):(1|-1):(\d{1,2})$/.exec(mark) : null;
    return m ? { start: Number(m[1]), dir: Number(m[2]) as 1 | -1, n: Number(m[3]) } : null;
}

function countOf(m: number, wording: Wording): Count {
    if (wording === 'digitaal') return { start: 0, dir: 1, n: m, zone: m === 0 ? 'uur' : 'over' };
    if (m === 0) return { start: 0, dir: 1, n: 0, zone: 'uur' };
    if (m === 30) return { start: 30, dir: 1, n: 0, zone: 'half' };
    if (wording === 'woorden') return m < 30 ? { start: 0, dir: 1, n: m, zone: 'over' } : { start: 0, dir: -1, n: 60 - m, zone: 'voor' };
    // SYNC: the zone cut-offs of formatTimeText (clockTypes.ts) and minuteDirection.ts.
    if (m <= 20) return { start: 0, dir: 1, n: m, zone: 'over' };
    if (m < 30) return { start: 30, dir: -1, n: 30 - m, zone: 'voorhalf' };
    if (m < 40) return { start: 30, dir: 1, n: m - 30, zone: 'overhalf' };
    return { start: 0, dir: -1, n: 60 - m, zone: 'voor' };
}

// "5, 10, 15, 16, 17": per 5 up to the last whole cijfer, then per minute.
function countTokens(n: number): StepToken[] {
    const vals: number[] = [];
    for (let v = 5; v <= n; v += 5) vals.push(v);
    for (let v = Math.floor(n / 5) * 5 + 1; v <= n; v++) vals.push(v);
    return vals.flatMap((v, i) => (i ? [{ t: 'sep' } as StepToken, num(v)] : [num(v)]));
}
const minuten = (n: number) => (n === 1 ? 'minuut' : 'minuten');
const countAnswer = (n: number): StepToken[] => [...countTokens(n), word(n === 15 ? ' minuten: een kwart' : ` ${minuten(n)}`)];

// Where the grote wijzer stands: on a cijfer or between two.
function minutePos(m: number): string {
    const k = Math.floor(m / 5);
    if (m % 5 === 0) return `op de ${k || 12}`;
    return `tussen de ${k || 12} en de ${k + 1}`;
}

// Counting the grote wijzer's minutes on a face that shows it (lezen, omzetten).
const COUNT_QUESTION: Record<'over' | 'voor' | 'overhalf' | 'voorhalf', [string, string]> = {
    over: ['Hoeveel minuten over het uur?', 'Tel vanaf de 12 met de klok mee, tot de grote wijzer. Elk cijfer is 5 minuten.'],
    voor: ['Hoeveel minuten nog tot het volgende uur?', 'Tel vanaf de 12 terug, tegen de klok in, tot de grote wijzer. Elk cijfer is 5 minuten.'],
    overhalf: ['Hoeveel minuten over half?', 'Tel vanaf de 6 met de klok mee, tot de grote wijzer. Elk cijfer is 5 minuten.'],
    voorhalf: ['Hoeveel minuten nog tot half?', 'Tel vanaf de 6 terug, tegen de klok in, tot de grote wijzer. Elk cijfer is 5 minuten.'],
};

// The hours a wording names: the hour that is bezig and the next one ("half 4" names 4 at 3:30).
function hoursOf(h: number, is24: boolean, wording: Wording): { cur: number; next: number } {
    if (wording === 'woorden') return { cur: face(h), next: face(h + 1) };
    if (!is24) return { cur: h, next: h === 12 ? 1 : h + 1 };
    // SYNC: formatTimeText reads 24h midnight as 24 ("half 24"), never 0.
    return { cur: wording === 'zin' && h === 0 ? 24 : h, next: (h + 1) % 24 === 0 ? 24 : (h + 1) % 24 };
}

const namesNextHour = (z: Zone) => z === 'half' || z === 'voor' || z === 'voorhalf' || z === 'overhalf';

// The worked steps of one klok exercise, or null when its time is broken or does not match its printed texts.
export function klokSteps(ex: ClockExercise | undefined, c: Record<string, unknown> = {}): StepLine[] | null {
    if (!ex) return null;
    const { hours: h, minutes: m } = ex;
    const mode = ex.exerciseMode ?? (c.exerciseMode as string | undefined) ?? 'lezen';
    const type = ex.clockType ?? (c.clockType as string | undefined) ?? 'analoog';
    const is24 = ex.is24hour ?? (c.is24hour as boolean | undefined) ?? false;
    if (!Number.isInteger(h) || !Number.isInteger(m) || m < 0 || m > 59 || (is24 ? h < 0 || h > 23 : h < 1 || h > 12)) return null;
    // A hand-edited text that no longer says this time: the steps would contradict what is printed.
    if (ex.timeText !== undefined && ex.timeText !== formatTimeText(h, m, is24)) return null;
    if (ex.digitalText !== undefined && ex.digitalText !== formatDigitalTime(h, m)) return null;
    const digital = formatDigitalTime(h, m);

    if (type === 'analoog' && (mode === 'lezen' || mode === 'omzetten')) {
        // Oefenmodus only: an analoge klok read in words or as uu:mm; the sheet (no key) writes the time in words.
        const wording: Wording = mode === 'omzetten' || c.klokAnswer === 'digitaal' ? 'digitaal' : c.klokAnswer === 'woorden' ? 'woorden' : 'zin';
        const { cur, next } = hoursOf(h, is24, wording);
        const cnt = countOf(m, wording);
        const lines = [
            ask('klok.kleine', 'Waar staat de kleine wijzer?', 'De kleine wijzer toont het uur.',
                [word(m === 0 ? `op de ${face(h)}: het is ${cur} uur` : `tussen ${face(h)} en ${face(h + 1)}: het is na ${cur} uur`)], 'h'),
            ask('klok.grote', 'Waar staat de grote wijzer?', 'De grote wijzer toont de minuten.', [word(minutePos(m))], 'm'),
        ];
        if (cnt.n > 0) {
            const [q, hint] = cnt.zone === 'uur' || cnt.zone === 'half' ? COUNT_QUESTION.over : COUNT_QUESTION[cnt.zone];
            lines.push(ask('klok.tel', wording === 'digitaal' ? 'Hoeveel minuten na het uur?' : q, hint, countAnswer(cnt.n), countMark(cnt)));
        }
        if (wording === 'digitaal') return [...lines, closing(`Het is ${digital}.`)];
        const words = wording === 'woorden' ? timeWordsText(timeWords(h, m)) : formatTimeText(h, m, is24);
        return [...lines, closing(namesNextHour(cnt.zone) ? `Na ${cur} uur komt ${next} uur: het is ${words}.` : `Het is ${words}.`)];
    }

    if (type === 'analoog' && mode === 'tekenen') {
        // The prompt is the sheet's timeText (also on the Oefenmodus drag card), so its zones say how to count.
        const { cur, next } = hoursOf(h, is24, 'zin');
        const cnt = countOf(m, 'zin');
        const near = m === 0 ? `op de ${face(h)}` : m === 30 ? `midden tussen ${face(h)} en ${face(h + 1)}`
            : `tussen ${face(h)} en ${face(h + 1)}, dicht bij de ${m < 30 ? face(h) : face(h + 1)}`;
        const kleineHint = m === 0 ? 'Bij uur staat de kleine wijzer precies op het uur.'
            : namesNextHour(cnt.zone) ? `Het is na ${cur} uur, maar nog geen ${next} uur.` : `Het is na ${cur} uur.`;
        const groteHint: Record<Zone, string> = {
            uur: 'Bij uur staat de grote wijzer op de 12.',
            half: 'Bij half staat de grote wijzer op de 6.',
            over: `${cnt.n === 15 ? 'Een kwart is 15 minuten. ' : ''}Tel ${cnt.n} ${minuten(cnt.n)} vanaf de 12, met de klok mee.`,
            voor: `${cnt.n === 15 ? 'Een kwart is 15 minuten. ' : ''}Tel ${cnt.n} ${minuten(cnt.n)} vanaf de 12 terug, tegen de klok in.`,
            overhalf: `Tel ${cnt.n} ${minuten(cnt.n)} vanaf de 6, met de klok mee.`,
            voorhalf: `Tel ${cnt.n} ${minuten(cnt.n)} vanaf de 6 terug, tegen de klok in.`,
        };
        const groteAnswer = cnt.n > 0 ? [...countAnswer(cnt.n), word(`, dus ${minutePos(m)}`)] : [word(minutePos(m))];
        return [
            ask('klok.kleine', 'Waar zet je de kleine wijzer?', kleineHint, [word(near)], 'h'),
            ask('klok.grote', 'Waar zet je de grote wijzer?', groteHint[cnt.zone], groteAnswer, cnt.n > 0 ? countMark(cnt) : 'm'),
            closing(`Kleine wijzer ${m === 0 ? `op de ${face(h)}` : `tussen ${face(h)} en ${face(h + 1)}`}, grote wijzer ${minutePos(m)}.`),
        ];
    }

    if (type === 'digitaal' && mode === 'tekenen') {
        // Words → uu:mm: the minutes are always counted clockwise from the 12 (owner, 2026-11-13).
        const { cur, next } = hoursOf(h, is24, 'zin');
        const zone = countOf(m, 'zin').zone;
        const hh = digital.slice(0, 2);
        const uurHint = m === 0 || !namesNextHour(zone) ? 'Kijk naar het uur in de tijd.' : `Het is nog geen ${next} uur.`;
        const minHint: Record<Zone, string> = {
            uur: '', half: '',
            over: m === 15 ? 'Een kwart is 15 minuten.' : 'Over: zoveel minuten na het uur.',
            voorhalf: 'Half is 30 minuten. Voor half is iets minder.',
            overhalf: 'Half is 30 minuten. Over half is iets meer.',
            voor: m === 45 ? 'Een uur is 60 minuten. Een kwart is 15 minuten.' : 'Een uur is 60 minuten. Voor het uur is iets minder.',
        };
        const lines = [ask('klok.uur', 'Welk uur schrijf je?', uurHint, [word(hh === String(cur) ? `${cur} uur` : `${cur} uur: je schrijft ${hh}`)], 'h')];
        if (m > 0) lines.push(ask('klok.tel', 'Hoeveel minuten na het uur?', minHint[zone] || 'Half is 30 minuten.', countAnswer(m), countMark({ start: 0, dir: 1, n: m })));
        return [...lines, closing(`Het is ${digital}.`)];
    }

    if (type === 'digitaal') {
        // Lezen (and an omzetten row on a digitale klok, which the viewer prints the same way): uu:mm → words.
        const { cur } = hoursOf(h, is24, 'zin');
        const zone = countOf(m, 'zin').zone;
        const words = formatTimeText(h, m, is24);
        const wordHint: Record<Zone, string> = {
            uur: '',
            over: m === 15 ? '15 minuten is een kwart.' : 'Tot 20 minuten tel je vanaf het uur: over.',
            voorhalf: 'Bijna half: hoeveel minuten nog tot half?',
            half: '30 minuten is half. Half hoort bij het volgende uur.',
            overhalf: 'Net na half: hoeveel minuten over half?',
            voor: m === 45 ? 'Nog 15 minuten tot het volgende uur: een kwart.' : 'Bijna het volgende uur: hoeveel minuten nog?',
        };
        const lines = [ask('klok.uur', 'Welk uur staat er?', 'Kijk voor het dubbelpunt.', [word(h === 0 && is24 ? '0 uur: je zegt 24 uur' : `${cur} uur`)], 'h')];
        if (m > 0) {
            lines.push(ask('klok.tel', 'Hoeveel minuten na het uur?', 'Kijk na het dubbelpunt. Tel op de klok, 5 minuten per cijfer.', countAnswer(m), countMark({ start: 0, dir: 1, n: m })));
            lines.push(ask('klok.woorden', 'Hoe zeg je dat?', wordHint[zone], [word(words)]));
        }
        return [...lines, closing(`${digital} = ${words}`)];
    }
    return null;
}
