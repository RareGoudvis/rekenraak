import type { ClockExercise } from '../../../../services/math/types';
import type { KioskAnswer } from '../../../../services/oefenen/types';
import { kioskFor, kioskInputOf } from '../../../../services/oefenen/kiosk';
import { formatDigitalTime } from '../../../../services/clock/clockTypes';
import { timeWords, timeWordsFields, timeWordsText } from '../../../../services/clock/timeWords';
import { klokText } from '../../../../services/clock/clockDrag';
import { mulberry32, seedOf } from '../../distractors';
import type { SpelChoiceView, SpelPack, SpelPackQuestion, SpelVisual } from '../pack';
import { grainOf, klokChoicesOf, type KlokTime } from './klokDistractors';
import { klokTip } from './klokHelp';

// The klok as game content (owner 2026-11-14): read a face, set a face, at the card's own leerjaar preset.
//   analoog → woorden   Analoge klok lezen (the kiosk's woorden): the face asks, four phrases answer.
//   analoog → digitaal  Analoge klok omzetten: the face asks, four uu:mm times answer.
//   digitaal → analoog  Teken de wijzers: a digital time asks, four faces answer.
//   woorden → digitaal  Duid de tijd aan op een digitale klok: the card's words ask, four uu:mm times answer.
// Kalender, tijdsduur and digitale klok lezen (no kiosk form) stay out.

export type KlokDirection = 'analoog-woorden' | 'analoog-digitaal' | 'digitaal-analoog' | 'woorden-digitaal';

export const KLOK_LEAVES = ['klok-analoog-lezen', 'klok-analoog-omzetten', 'klok-analoog-tekenen', 'klok-digitaal-tekenen'] as const;

/** The game direction of a made klok exercise, from what the kiosk asks of it; null = no game form. */
export function klokDirectionOf(ex: ClockExercise, c: Record<string, unknown>, typeId = 'klok-kloklezen'): KlokDirection | null {
    const d = kioskFor(typeId);
    if (!d || !Number.isInteger(ex?.hours) || !Number.isInteger(ex?.minutes)) return null;
    const input = kioskInputOf(d, ex, c);
    const clockType = ex.clockType ?? (c.clockType as string | undefined) ?? 'analoog';
    const mode = ex.exerciseMode ?? (c.exerciseMode as string | undefined) ?? 'lezen';
    if (input === 'time-words') return 'analoog-woorden';
    if (input === 'interactive') return 'digitaal-analoog';
    if (input !== 'time') return null;
    if (clockType === 'analoog') return 'analoog-digitaal';
    return mode === 'tekenen' ? 'woorden-digitaal' : null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const faceHour = (h: number) => (h % 12) || 12;
const words = (t: KlokTime) => timeWordsText(timeWords(t.h, t.m));

// How a time is shown as a choice, and what the kiosk check gets for it.
function choiceOf(t: KlokTime, dir: KlokDirection, is24: boolean): { view: SpelChoiceView; kiosk: KioskAnswer } {
    if (dir === 'analoog-woorden') {
        const text = words(t);
        return { view: { text, label: text }, kiosk: timeWordsFields(timeWords(t.h, t.m)) };
    }
    if (dir === 'digitaal-analoog') {
        return { view: { visual: { kind: 'klok', h: t.h, m: t.m }, label: `klok: ${words(t)}` }, kiosk: klokText(t.h, t.m) };
    }
    // A 12-hour card writes 08:15 (twaalf uur = 12:00); only a 24-hour card writes 20:15.
    const text = formatDigitalTime(is24 ? t.h : faceHour(t.h), t.m);
    return { view: { text, label: text }, kiosk: [String(t.h), String(t.m)] };
}

export function klokQuestion(ex: ClockExercise, c: Record<string, unknown>, key: string, choiceCount: number, typeId = 'klok-kloklezen'): SpelPackQuestion | null {
    const dir = klokDirectionOf(ex, c, typeId);
    if (!dir) return null;
    const is24 = !!(ex.is24hour ?? c.is24hour);
    const answer: KlokTime = { h: ex.hours, m: ex.minutes };
    const times = klokChoicesOf(answer, { grain: grainOf(c.timeTypes, ex.minutes), wordsAnswer: dir === 'analoog-woorden' }, mulberry32(seedOf(key)), choiceCount);
    const value = (t: KlokTime) => `${pad(t.h)}:${pad(t.m)}`;
    const shown = times.map(t => choiceOf(t, dir, is24));
    const face: SpelVisual = { kind: 'klok', h: ex.hours, m: ex.minutes };
    const sign: Pick<SpelPackQuestion, 'text' | 'visual'> = dir === 'digitaal-analoog' ? { text: 'Welke klok?', visual: { kind: 'digitaal', text: ex.digitalText ?? value(answer) } }
        : dir === 'woorden-digitaal' ? { text: `${ex.timeText} = ?` }
        : { text: 'Hoe laat is het?', visual: face };
    return {
        ...sign,
        answer: value(answer),
        choices: times.map(value),
        views: shown.map(s => s.view),
        kioskAnswers: shown.map(s => s.kiosk),
        help: { tip: klokTip(answer, dir), visual: { ...face, mark: true } },
    };
}

export const KLOK_PACK: SpelPack = {
    leaves: KLOK_LEAVES,
    question: (type, made, choiceCount) => klokQuestion(made.exercise as ClockExercise, made.constraints, made.key, choiceCount, type.typeId),
};
