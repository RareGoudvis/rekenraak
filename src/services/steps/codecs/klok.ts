import type { ClockExercise } from '../../math/types';
import { formatDigitalTime, formatTimeText } from '../../clock/clockTypes';
import { klokSteps } from '../klokSteps';
import { defineCodec } from '../tutorCodec';

// A klok exercise as [uur, minuten, kind, flags]: kind = which clock and what the pupil does, flags = bit 0
// for a 24-hour clock plus the answer wording (×2: 0 sheet words, 1 woorden, 2 uu:mm), all the steps read.
// Append only: printed QRs carry these indices.
const KINDS = [['analoog', 'lezen'], ['analoog', 'omzetten'], ['analoog', 'tekenen'], ['digitaal', 'lezen'], ['digitaal', 'tekenen']] as const;
const ANSWERS = [undefined, 'woorden', 'digitaal'] as const;

export type KlokData = ClockExercise & { klokAnswer?: 'woorden' | 'digitaal' };

const int = (v: unknown, lo: number, hi: number): v is number => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;

export const codec = defineCodec<KlokData>({
    id: 'kl',
    typeIds: ['klok-kloklezen'],
    what: 'klok',
    out(ex, c) {
        const e = ex as ClockExercise | undefined;
        if (!e || klokSteps(e, c) === null) return null;
        const type = e.clockType ?? (c.clockType as string | undefined) ?? 'analoog';
        const mode = e.exerciseMode ?? (c.exerciseMode as string | undefined) ?? 'lezen';
        // SYNC: klokSteps prints an omzetten row on a digitale klok as lezen (the viewer does too).
        const k = KINDS.findIndex(([t, md]) => t === type && md === (type === 'digitaal' && mode === 'omzetten' ? 'lezen' : mode));
        if (k < 0) return null;
        const is24 = e.is24hour ?? (c.is24hour as boolean | undefined) ?? false;
        const answer = ANSWERS.indexOf(c.klokAnswer as typeof ANSWERS[number]);
        return [e.hours, e.minutes, k, (is24 ? 1 : 0) + 2 * Math.max(0, answer)];
    },
    in(wire) {
        if (!Array.isArray(wire) || wire.length !== 4) return null;
        const [h, m, k, f] = wire as unknown[];
        if (!int(k, 0, KINDS.length - 1) || !int(f, 0, 2 * ANSWERS.length - 1) || !int(m, 0, 59)) return null;
        const is24 = (f & 1) === 1;
        if (!int(h, is24 ? 0 : 1, is24 ? 23 : 12)) return null;
        const [clockType, exerciseMode] = KINDS[k];
        const klokAnswer = ANSWERS[f >> 1];
        return {
            id: '', hours: h, minutes: m, timeText: formatTimeText(h, m, is24), digitalText: formatDigitalTime(h, m),
            clockType, exerciseMode, is24hour: is24, isManuallyEdited: false, ...(klokAnswer && { klokAnswer }),
        };
    },
    steps: d => klokSteps(d, d.klokAnswer ? { klokAnswer: d.klokAnswer } : {}),
    // As printed: a clock face shows no time in text (it would give the answer away), the other kinds print theirs.
    sum: d => [{ t: 'word', w: d.exerciseMode === 'tekenen' ? d.timeText : d.clockType === 'digitaal' ? d.digitalText : 'Lees de klok' }],
});
